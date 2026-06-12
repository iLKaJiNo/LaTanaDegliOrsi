// ════════════════════════════════════════════════════════
//  La Tana degli Orsi — api.js (versione Supabase)
//  Sync, azioni, coda offline, realtime.
//  Dipende da: utils.js (client sb, stato S, helper).
//  Il "contratto" con ui.js è invariato: post({action:...})
// ════════════════════════════════════════════════════════

var CACHE_DATI = "tana_data_cache_v2";

// ── INDICATORE DI SYNC ──
function dot(cls,txt){document.getElementById("dot").className="sync-dot"+(cls?" "+cls:"");document.getElementById("sync-txt").textContent=txt;}
function skeletons(){document.getElementById("storico").innerHTML='<span class="storico-head">Storico Tana</span><div class="sk"></div><div class="sk"></div><div class="sk"></div>';}

// ── AVVIO APP (chiamato da authInit dopo il login) ──
function appStart(){
  initTheme();
  initTabSwipe();
  // Ripristino l'ultimo stato salvato per mostrare subito qualcosa
  var cached = localStorage.getItem(CACHE_DATI);
  if(cached){
    try { S = JSON.parse(cached); render(); } catch(e){ skeletons(); }
  } else {
    skeletons();
  }
  load();
  initRealtime();
  // Polling di sicurezza ogni 5 min (il realtime fa il grosso del lavoro)
  setInterval(function(){ if(document.visibilityState==="visible") load(); }, 300000);
  // Quando l'app torna in primo piano, sincronizza subito
  document.addEventListener("visibilitychange", function(){
    if(document.visibilityState==="visible") load();
  });
  // Se c'erano operazioni in attesa da prima, prova a inviarle
  if(getCoda().length) flushCoda();
}

// ── CARICAMENTO DATI ──
// Legge tutte le tabelle in parallelo e popola lo stato S
// nella stessa forma che ui.js ha sempre usato.
async function load(){
  dot("","Annusando...");
  try{
    var ris = await Promise.all([
      sb.from("config").select("*"),
      sb.from("transazioni").select("*").order("data",{ascending:true}),
      sb.from("chiusure").select("*").order("data",{ascending:true}),
      sb.from("debiti").select("*").order("data",{ascending:true}),
      sb.from("fisse").select("*").order("data",{ascending:true}),
      sb.from("lista").select("*").order("data",{ascending:true}),
      sb.from("previste").select("*").order("data",{ascending:true})
    ]);
    // Se una qualsiasi risposta ha errore, lo gestisco
    for(var i=0;i<ris.length;i++){
      if(ris[i].error) return gestisciErrore(ris[i].error);
    }
    var cfg=ris[0].data, txs=ris[1].data, chiusure=ris[2].data,
        debiti=ris[3].data, fisse=ris[4].data, lista=ris[5].data, previste=ris[6].data;

    // Config → saldo iniziale + nota condivisa
    S.saldoIniziale=0;
    S.nota={testo:"",autore:"",data:""};
    cfg.forEach(function(r){
      if(r.chiave==="saldo_iniziale") S.saldoIniziale=parseFloat(r.valore&&r.valore.value)||0;
      if(r.chiave==="nota_condivisa"&&r.valore) S.nota={testo:r.valore.testo||"",autore:r.valore.autore||"",data:r.valore.data||""};
    });

    S.txs=txs.map(function(r){return{id:r.id,chi:r.chi,importo:parseFloat(r.importo)||0,nota:r.nota||"",data:r.data||""};});

    S.chiusure=chiusure.map(function(r){
      var t=r.txs||[];
      var tot=parseFloat(r.totale)||t.reduce(function(a,x){return a+(parseFloat(x.importo)||0);},0);
      return{id:r.id,mese:r.mese,saldo:parseFloat(r.saldo)||0,data:r.data||"",
             saldoIniziale:parseFloat(r.saldo_iniziale)||0,txs:t,totale:tot,
             fisseSnapshot:r.fisse_snapshot||[]};
    });

    S.debiti=debiti.map(function(r){
      return{id:r.id,prestatore:r.prestatore,debitore:r.debitore,
             importoOriginale:parseFloat(r.importo_originale)||0,
             importoResiduo:parseFloat(r.importo_residuo)||0,
             nota:r.nota||"",data:r.data||"",rimborsi:r.rimborsi||[]};
    });

    S.fisse=fisse.map(function(r){return{id:r.id,nome:r.nome,importo:parseFloat(r.importo)||0,icona:r.icona||"📌",data:r.data||""};});

    S.lista=lista.map(function(r){return{id:r.id,testo:r.testo,quantita:r.quantita||"",completata:!!r.completata,data:r.data||""};});

    S.previste=previste.map(function(r){return{id:r.id,nome:r.nome,importo:parseFloat(r.importo)||0,scadenza:r.scadenza||"",stato:r.stato||"attiva",data:r.data||""};});

    try{ localStorage.setItem(CACHE_DATI, JSON.stringify(S)); }catch(e){}
    dot("ok","Sincronizzata \uD83D\uDC3E");
    aggiornaBadgeCoda();
    render();
  }catch(e){
    // Eccezione di rete: offline
    dot("err","Offline \uD83D\uDCF5");
    if(S.txs.length===0){
      document.getElementById("storico").innerHTML='<div class="empty"><span class="e-icon">\uD83D\uDCE1</span>Nessun segnale.<br>Controlla la rete.</div>';
    }
  }
}

// Errori restituiti da Supabase (non eccezioni di rete)
function gestisciErrore(err){
  var msg=(err&&err.message)||"";
  if(errDiRete(err)){ dot("err","Offline \uD83D\uDCF5"); return; }
  if(msg.indexOf("JWT")>-1 || err.code==="PGRST301"){
    // Sessione scaduta e non rinnovabile: torno al login
    sb.auth.signOut().then(function(){location.reload();});
    return;
  }
  dot("err","Errore server");
  console.error("Supabase:",err);
}
function errDiRete(err){
  var msg=((err&&err.message)||"").toLowerCase();
  return !navigator.onLine || msg.indexOf("fetch")>-1 || msg.indexOf("network")>-1;
}

// ── REALTIME ──
// Qualsiasi modifica al database (anche dall'altro Orso!)
// ricarica i dati dopo una piccola pausa anti-raffica.
var _rtTimer=null;
function debounceLoad(){
  clearTimeout(_rtTimer);
  _rtTimer=setTimeout(load, 800);
}
function initRealtime(){
  sb.channel("tana-db")
    .on("postgres_changes",{event:"*",schema:"public"},debounceLoad)
    .subscribe();
}

// ── MAPPA AZIONI → QUERY ──
// Traduce i payload storici di ui.js in operazioni Supabase.
async function runAction(p){
  var r;
  switch(p.action){

    // — Transazioni —
    case "addTransaction":
      r=await sb.from("transazioni").insert({id:p.id,chi:p.chi,importo:p.importo,nota:p.nota||"",data:p.data}); break;
    case "editTransaction":
      r=await sb.from("transazioni").update({chi:p.chi,importo:p.importo,nota:p.nota||"",data:p.data}).eq("id",p.id); break;
    case "deleteTransaction":
      r=await sb.from("transazioni").delete().eq("id",p.id); break;

    // — Config —
    case "setSaldoIniziale":
      r=await sb.from("config").update({valore:{value:p.value},aggiornata_il:new Date().toISOString()}).eq("chiave","saldo_iniziale"); break;
    case "saveNota":
      r=await sb.from("config").update({valore:{testo:p.testo,autore:p.autore,data:p.data},aggiornata_il:new Date().toISOString()}).eq("chiave","nota_condivisa"); break;

    // — Chiusura mese (atomica, via funzione SQL) —
    case "chiudiMese":
      r=await sb.rpc("chiudi_mese",{
        p_id:p.chiusura.id, p_mese:p.chiusura.mese, p_saldo:p.chiusura.saldo,
        p_data:p.chiusura.data, p_saldo_iniziale:p.chiusura.saldoIniziale,
        p_txs:p.chiusura.txs, p_fisse_snapshot:p.chiusura.fisseSnapshot||[],
        p_totale:p.chiusura.totale||0, p_nuovo_saldo:p.nuovoSaldo,
        p_previste_ids:[]
      }); break;
    case "ripristina":
      r=await sb.rpc("ripristina_mese",{
        p_chiusura_id:p.chiusuraId, p_saldo_iniziale:p.saldoIniziale, p_txs:p.txs
      }); break;
    case "eliminaChiusura":
      r=await sb.from("chiusure").delete().eq("id",p.id); break;

    // — Debiti diretti —
    case "addDebito":
      r=await sb.from("debiti").insert({id:p.id,prestatore:p.prestatore,debitore:p.debitore,
        importo_originale:p.importoOriginale,importo_residuo:p.importoResiduo,
        nota:p.nota||"",data:p.data,rimborsi:jsonArr(p.rimborsi)}); break;
    case "editDebito":
      r=await sb.from("debiti").update({prestatore:p.prestatore,debitore:p.debitore,
        importo_originale:p.importoOriginale,importo_residuo:p.importoResiduo,
        nota:p.nota||"",data:p.data}).eq("id",p.id); break;
    case "updateDebito":
      r=await sb.from("debiti").update({importo_residuo:p.importoResiduo,rimborsi:jsonArr(p.rimborsi)}).eq("id",p.id); break;
    case "deleteDebito":
      r=await sb.from("debiti").delete().eq("id",p.id); break;

    // — Spese fisse —
    case "addFissa":
      r=await sb.from("fisse").insert({id:p.id,nome:p.nome,importo:p.importo,icona:p.icona,data:p.data}); break;
    case "editFissa":
      r=await sb.from("fisse").update({nome:p.nome,importo:p.importo,icona:p.icona}).eq("id",p.id); break;
    case "deleteFissa":
      r=await sb.from("fisse").delete().eq("id",p.id); break;

    // — Spese previste —
    case "addPrevista":
      r=await sb.from("previste").insert({id:p.id,nome:p.nome,importo:p.importo,scadenza:p.scadenza||null,stato:p.stato||"attiva",data:p.data}); break;
    case "editPrevista":
      r=await sb.from("previste").update({nome:p.nome,importo:p.importo,scadenza:p.scadenza||null}).eq("id",p.id); break;
    case "setStatoPrevista":
      r=await sb.from("previste").update({stato:p.stato}).eq("id",p.id); break;
    case "deletePrevista":
      r=await sb.from("previste").delete().eq("id",p.id); break;

    // — Lista della spesa —
    case "addListaItem":
      r=await sb.from("lista").insert({id:p.id,testo:p.testo,quantita:p.quantita||"",completata:false,data:p.data}); break;
    case "toggleListaItem":
      r=await sb.from("lista").update({completata:p.completata}).eq("id",p.id); break;
    case "deleteListaItem":
      r=await sb.from("lista").delete().eq("id",p.id); break;
    case "checkAllListaItems":
      r=await sb.from("lista").update({completata:p.completata}).neq("id",""); break;
    case "clearListaItems":
      r=p.soloCompletate
        ? await sb.from("lista").delete().eq("completata",true)
        : await sb.from("lista").delete().neq("id","");
      break;

    default:
      // Azioni legacy del vecchio backend GAS: non servono più
      return "ok";
  }
  if(r&&r.error) throw r.error;
  return "ok";
}

// Le rimborsi arrivano da ui.js come stringa JSON (eredità GAS)
function jsonArr(v){
  if(Array.isArray(v)) return v;
  try{ return JSON.parse(v||"[]"); }catch(e){ return []; }
}

// ── POST (stessa firma di sempre per ui.js) ──
async function post(payload){
  try{
    return await runAction(payload);
  }catch(e){
    if(errDiRete(e)){
      // Rete assente: salvo in coda e reinvierò
      accodaOperazione(payload);
      dot("err","Offline — salvato in attesa \uD83D\uDCE5");
      throw e;
    }
    if(((e&&e.message)||"").indexOf("JWT")>-1){
      sb.auth.signOut().then(function(){location.reload();});
    }
    console.error("Azione fallita:",payload.action,e);
    throw e;
  }
}

// ── CODA OFFLINE ──
var CODA_KEY = "tana_coda_offline";

function getCoda(){
  try{ return JSON.parse(localStorage.getItem(CODA_KEY)||"[]"); }
  catch(e){ return []; }
}
function setCoda(arr){
  try{ localStorage.setItem(CODA_KEY, JSON.stringify(arr)); }catch(e){}
}
function accodaOperazione(payload){
  var coda=getCoda();
  coda.push(payload);
  setCoda(coda);
  aggiornaBadgeCoda();
}
function aggiornaBadgeCoda(){
  var n=getCoda().length;
  var txt=document.getElementById("sync-txt");
  if(n>0 && txt){
    var base=txt.textContent.replace(/ \u00b7 \d+ in attesa.*$/,"");
    txt.textContent=base+" \u00b7 "+n+" in attesa \uD83D\uDCE5";
  }
}
// Reinvia le operazioni in coda, in ordine. Si ferma al primo errore di rete.
async function flushCoda(){
  var coda=getCoda();
  if(!coda.length) return;
  dot("","Invio operazioni in attesa...");
  while(coda.length){
    var op=coda[0];
    try{
      await runAction(op);
      coda.shift();
      setCoda(coda);
    }catch(e){
      if(errDiRete(e)){ aggiornaBadgeCoda(); return; } // ancora offline: riproverò
      // Errore "vero" (es. duplicato già inviato): scarto e proseguo
      console.error("Operazione in coda scartata:",op.action,e);
      coda.shift();
      setCoda(coda);
    }
  }
  setCoda([]);
  load();
}

// Quando la connessione torna, svuoto la coda
window.addEventListener("online", function(){ flushCoda(); });
