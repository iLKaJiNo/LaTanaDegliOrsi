// ════════════════════════════════════════════════════════
//  TANA DEGLI ORSI — api.js
//  Comunicazione col backend GAS: sync, fetch, post, parse.
//  Dipende da: utils.js (stato S, sessione, dot helpers).
// ════════════════════════════════════════════════════════

// ── SYNC E CACHE LOCALE (OPTIMISTIC UI) ──
function dot(cls,txt){document.getElementById("dot").className="sync-dot"+(cls?" "+cls:"");document.getElementById("sync-txt").textContent=txt;}
function skeletons(){document.getElementById("storico").innerHTML='<span class="storico-head">Storico Tana</span><div class="sk"></div><div class="sk"></div><div class="sk"></div>';}

function appStart(){
  initTheme();
  initTabSwipe();
  var cachedData = localStorage.getItem("tana_data_cache");
  if(cachedData) {
    try {
      parse(JSON.parse(cachedData));
      render(); 
    } catch(e) {}
  } else {
    skeletons();
  }
  load();
  // Polling solo quando l'app è in primo piano (risparmia batteria/quota GAS)
  setInterval(function(){ if(document.visibilityState==="visible") load(); }, 60000);
  // Quando l'app torna in primo piano, sincronizza subito
  document.addEventListener("visibilitychange", function(){
    if(document.visibilityState==="visible") load();
  });
  // Se c'erano operazioni in attesa da prima, prova a inviarle
  if(getCoda().length) flushCoda();
}

async function load(){
  dot("","Annusando...");
  var token=getSession();
  try{
    var res=await fetch(GS+"?t="+Date.now()+"&token="+encodeURIComponent(token||""));
    if(!res.ok){
      dot("err","Errore server ("+res.status+")");
      return;
    }
    var data=await res.json();
    if(data&&data.error==="unauthorized"){clearSession();location.reload();return;}
    if(data&&data.error==="timeout_lock_backend"){
      dot("err","GAS occupato — riprovo...");
      setTimeout(load, 3000);
      return;
    }
    localStorage.setItem("tana_data_cache", JSON.stringify(data));
    parse(data);
    dot("ok","Sincronizzata \uD83D\uDC3E");
    aggiornaBadgeCoda();
    render();
  }catch(e){
    if(e instanceof TypeError){
      // TypeError = rete assente (offline)
      dot("err","Offline \uD83D\uDCF5");
    } else {
      dot("err","Errore sconosciuto");
    }
    if(S.txs.length===0){
      document.getElementById("storico").innerHTML='<div class="empty"><span class="e-icon">\uD83D\uDCE1</span>Nessun segnale.<br>Controlla la rete.</div>';
    }
  }
}

function parse(data){
  if(Array.isArray(data)){
    if(!data.length){S={saldoIniziale:0,txs:[],chiusure:[],debiti:[],fisse:[],lista:[],previste:[],nota:{testo:"",autore:"",data:""}};return;}
    S.saldoIniziale=parseFloat(data[0][1])||0;
    S.txs=data.slice(1).filter(function(r){return r[0];}).map(parseRow);
    S.chiusure=[];S.debiti=[];S.fisse=[];S.lista=[];S.previste=[];S.nota={testo:"",autore:"",data:""};
  }else{
    var main=data.main||[];
    S.saldoIniziale=main.length?parseFloat(main[0][1])||0:0;
    S.txs=main.slice(1).filter(function(r){return r[0];}).map(parseRow);
S.chiusure=(data.chiusure||[]).map(function(r){
  var txs=[];try{txs=r[5]?JSON.parse(r[5]):[];}catch(e){}
  var totale=txs.reduce(function(a,t){return a+(parseFloat(t.importo)||0);},0);
  var fisseSnapshot=[];try{fisseSnapshot=r[6]?JSON.parse(r[6]):[];}catch(e){}
  var meseRaw=r[1]||"";
  var meseStr=String(meseRaw);
  if(meseRaw instanceof Date||(/^\d{4}-\d{2}-\d{2}/.test(meseStr))){
    var d=meseRaw instanceof Date?meseRaw:new Date(meseStr);
    meseStr=isNaN(d)?"?":d.toLocaleDateString("it-IT",{month:"long",year:"numeric"});
  }
  return{id:String(r[0]),mese:meseStr,saldo:parseFloat(r[2])||0,data:r[3]||"",saldoIniziale:parseFloat(r[4])||0,txs:txs,totale:totale,fisseSnapshot:fisseSnapshot};
});
    S.debiti=(data.debiti||[]).map(function(r){
      var rimborsiRaw = r[7] || "";
      var rimborsiList = [];
      if(rimborsiRaw){
        if(rimborsiRaw.trim().startsWith("[")){
          try { rimborsiList = JSON.parse(rimborsiRaw); } catch(e) { rimborsiList = []; }
        } else {
          var impCalcolato = (parseFloat(r[3])||0) - (parseFloat(r[4])||0);
          if (impCalcolato > 0) { rimborsiList = [{ data: rimborsiRaw, importo: impCalcolato }]; }
        }
      }
      return{
        id:String(r[0]), prestatore:r[1]||"", debitore:r[2]||"", importoOriginale:parseFloat(r[3])||0,
        importoResiduo:parseFloat(r[4])||0, nota:r[5]||"", data:r[6]||"", rimborsi:rimborsiList
      };
    });
    // Fisse dal server
    S.fisse=(data.fisse||[]).filter(function(r){return r[0];}).map(function(r){
      return{id:String(r[0]),nome:r[1]||"",importo:parseFloat(r[2])||0,icona:r[3]||"📌",data:r[4]||""};
    });
    // Lista spesa e nota condivisa
    S.lista=(data.lista||[]).filter(function(r){return r[0];}).map(function(r){
      return{id:String(r[0]),testo:r[1]||"",quantita:r[2]||"",completata:String(r[3])==="true",data:r[4]||""};
    });
    // Spese previste — colonne: id, nome, importo, scadenza, stato, data
    S.previste=(data.previste||[]).filter(function(r){return r[0];}).map(function(r){
      return{id:String(r[0]),nome:r[1]||"",importo:parseFloat(r[2])||0,scadenza:r[3]||"",stato:r[4]||"attiva",data:r[5]||""};
    });
    S.nota=data.nota||{testo:"",autore:"",data:""};
  }
}
function parseRow(r){return{id:String(r[0]),chi:r[1],importo:parseFloat(r[2])||0,nota:r[3]||"",data:r[4]||"",cat:r[5]||""};}


// ── CODA OFFLINE ──────────────────────────────────────────
// Le operazioni che falliscono per assenza di rete vengono salvate
// qui e reinviate quando la connessione torna.
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
// Mostra/nasconde il badge "in attesa di rete" sul pallino sync
function aggiornaBadgeCoda(){
  var n=getCoda().length;
  var txt=document.getElementById("sync-txt");
  if(n>0 && txt){
    // Non sovrascrive lo stato sync, aggiunge l'indicatore in coda
    var base=txt.textContent.replace(/ \u00b7 \d+ in attesa.*$/,"");
    txt.textContent=base+" \u00b7 "+n+" in attesa \uD83D\uDCE5";
  }
}
// Reinvia tutte le operazioni in coda, in ordine. Si ferma al primo errore.
async function flushCoda(){
  var coda=getCoda();
  if(!coda.length) return;
  dot("","Invio operazioni in attesa...");
  while(coda.length){
    var op=coda[0];
    try{
      var token=getSession();
      op.token=token||"";
      var res=await fetch(GS,{method:"POST",body:JSON.stringify(op)});
      var txt=await res.text();
      // Token scaduto: NON scarto l'operazione, esco al login.
      // La coda resta in localStorage e verrà reinviata dopo il login.
      if(txt==="unauthorized"){clearSession();location.reload();return;}
      coda.shift();          // riuscita: rimuovo dalla coda
      setCoda(coda);
    }catch(e){
      // ancora offline: mi fermo, riproverò più tardi
      aggiornaBadgeCoda();
      return;
    }
  }
  setCoda([]);
  // Ricarico i dati freschi dal server dopo aver svuotato la coda
  load();
}

async function post(payload){
  var token=getSession();
  payload.token=token||"";
  // L'hash viene inviato solo al login (action setToken) — le altre action usano il token
  if(payload.action!=="setToken") delete payload.hash;
  try{
    var res=await fetch(GS,{method:"POST",body:JSON.stringify(payload)});
    var text=await res.text();
    if(text==="unauthorized"&&payload.action!=="changePassword"){clearSession();location.reload();}
    return text;
  }catch(e){
    // Rete assente: accodo (tranne login/cambio password, che non vanno in coda)
    if(payload.action!=="setToken" && payload.action!=="changePassword"){
      accodaOperazione(payload);
      dot("err","Offline — salvato in attesa \uD83D\uDCE5");
    }
    throw e;
  }
}

// Quando la connessione torna, svuoto la coda
window.addEventListener("online", function(){ flushCoda(); });
