// ════════════════════════════════════════════════════════
//  La Tana degli Orsi — ui.js
//  Tutta la logica di interfaccia: render, modali, grafici,
//  PDF, lista spesa, note, tab e swipe.
//  Dipende da: utils.js + api.js.
// ════════════════════════════════════════════════════════

// ── DATA MANUALE ──
function toggleDataManuale(){
  showDataManuale=!showDataManuale;
  var row=document.getElementById("data-extra-row");
  var btn=document.getElementById("btn-data-icon");
  if(row) row.style.display=showDataManuale?"flex":"none";
  if(btn) btn.classList.toggle("active",showDataManuale);
  if(showDataManuale){
    var inp=document.getElementById("inp-data-manual");
    if(inp&&!inp.value) inp.value=new Date().toISOString().slice(0,10);
  }
}

// ── FORM CASSA E MOVIMENTI (UI OTTIMISTICA) ──
// ── DEBOUNCE RENDER ──
var _renderTimer=null;
function renderDebounced(){
  clearTimeout(_renderTimer);
  _renderTimer=setTimeout(render, 50);
}
// ── FEEDBACK APTICO ──
function vibra(ms){
  if(navigator.vibrate) navigator.vibrate(ms||30);
}
// ── STATO VUOTO: orso buffo + frase casuale ──
// L'orso usa bear-empty.png; se non c'è ancora, ripiega su bear.svg.
function bearVuoto(size){
  var s = size || "5rem";
  return '<img src="./bear-empty.png" class="bear-vuoto" '+
         'style="width:'+s+';height:auto;" alt="" '+
         'onerror="this.onerror=null;this.src=\'./bear.svg\';">';
}
// Genera il markup completo di uno stato vuoto (orso + frase random)
function statoVuoto(contesto, size){
  return '<div class="empty-state">'+bearVuoto(size)+
         '<div class="empty-msg">'+fraseVuoto(contesto)+'</div></div>';
}
// ── SCROLL INPUT INTO VIEW (evita tastiera che copre il campo) ──
function focusAndScroll(el){
  if(!el)return;
  el.focus();
  setTimeout(function(){el.scrollIntoView({behavior:"smooth",block:"center"});},300);
}

function setChi(c){
  chi=c;
  document.getElementById("btn-luca").className="toggle-btn"+(c==="Luca"?" luca":"");
  document.getElementById("btn-ale").className="toggle-btn"+(c==="Ale"?" ale":"");
  updatePreview();
}
function updatePreview(){
  var imp=parseFloat(document.getElementById("imp").value);
  var el=document.getElementById("preview");
  if(!imp||imp<=0){el.innerHTML="";el.className="preview-box";return;}
  var after=chi==="Luca"?saldo()+imp:saldo()-imp;
  var cls=after>0?"pv-ale":after<0?"pv-luca":"pv-pari";
  var lbl=after>0?"debito ale <img src='./bear.svg' style='width:0.75rem;height:0.75rem;vertical-align:middle'>":after<0?"debito luca <img src='./bear.svg' style='width:0.75rem;height:0.75rem;vertical-align:middle'>":"in pari! \uD83C\uDF6F";
  el.className="preview-box visible";
  el.innerHTML="Saldo dopo: <span class='"+cls+"'>"+eurInt(after)+" &mdash; "+lbl+"</span>";
}

async function addTx(){
  var impEl=document.getElementById("imp");
  var imp=parseFloat(impEl.value);
  // Validazione con feedback visivo
  if(!imp||imp<=0){
    impEl.classList.add("invalid");
    setTimeout(function(){impEl.classList.remove("invalid");},1200);
    focusAndScroll(impEl);
    return;
  }
  impEl.classList.remove("invalid");
  var nota=document.getElementById("nota").value.trim();
  // Data: manuale se attiva, altrimenti ora corrente
  var dataInp=document.getElementById("inp-data-manual");
  var dataISO=new Date().toISOString();
  if(showDataManuale&&dataInp&&dataInp.value){
    dataISO=new Date(dataInp.value+"T12:00:00").toISOString();
  }
  var t={id:Date.now().toString(),chi:chi,importo:imp,nota:nota,data:dataISO};
  S.txs.push(t);
  impEl.value="";
  document.getElementById("nota").value="";
  document.getElementById("preview").innerHTML="";
  document.getElementById("preview").className="preview-box";
  if(showDataManuale){toggleDataManuale();}
  var btn=document.getElementById("btn-add");
  vibra(30);
  btn.innerHTML="\u2713 Nella tana!";btn.classList.add("flash");btn.disabled=true;
  setTimeout(function(){btn.innerHTML="<img src='./bear.svg' style='width:1.125rem;height:1.125rem;vertical-align:middle;margin-right:6px;'> Aggiungi alla Tana";btn.classList.remove("flash");btn.disabled=false;},1400);
  render();
  dot("","Salvataggio...");
  try{
    await post({action:"addTransaction",id:t.id,chi:t.chi,importo:t.importo,nota:t.nota,data:t.data});
    dot("ok","Sincronizzata \uD83D\uDC3E");
  } catch(e){
    dot("err","Errore salvataggio");
    S.txs=S.txs.filter(function(x){return x.id!==t.id;});
    render();
  }
}

// ── CESTINO ──
function getCestino(){try{return JSON.parse(localStorage.getItem(CESTINO_KEY)||"[]");}catch(e){return[];}}
function setCestino(arr){localStorage.setItem(CESTINO_KEY,JSON.stringify(arr.slice(0,60)));}
function addAlCestino(t){var c=getCestino();c.unshift(Object.assign({},t,{_eliminata:new Date().toISOString()}));setCestino(c);}

function openCestino(){
  var c=getCestino();
  var el=document.getElementById("cestino-list");
  var svuota=document.getElementById("btn-svuota-cestino");
  if(!c.length){
    el.innerHTML='<div class="cestino-vuoto">'+statoVuoto("cestino","4rem")+'</div>';
    if(svuota)svuota.style.display="none";
  }else{
    if(svuota)svuota.style.display="";
    var h="";
    c.forEach(function(t){
      var isL=t.chi==="Luca";
      h+='<div class="cestino-row">';
      h+='<div class="tx-ava '+(isL?"l":"a")+'" style="width:2.125rem;height:2.125rem;border-radius:8px;flex-shrink:0;display:flex;align-items:center;justify-content:center;"><img src="./bear.svg" style="width:1.125rem;height:1.125rem;"></div>';
      h+='<div class="cestino-row-body">';
      h+='<div class="cestino-row-nota">'+escapeHtml(t.nota||(isL?"Spesa Luca":"Spesa Ale"))+'</div>';
      h+='<div class="cestino-row-meta">'+t.chi+' · '+fmt(t.data)+'</div>';
      h+='</div>';
      h+='<div class="cestino-row-imp '+(isL?"l":"a")+'">'+eurInt(t.importo)+'</div>';
      h+='<button class="btn-ripristina-voce" onclick="ripristinaDaCestino(\''+t.id+'\')">↩ Ripristina</button>';
      h+='</div>';
    });
    el.innerHTML=h;
  }
  document.getElementById("modal-cestino").classList.add("open");
}
function closeCestino(){document.getElementById("modal-cestino").classList.remove("open");}
function svuotaCestino(){
  if(!confirm("Svuotare il cestino? Le voci verranno eliminate definitivamente."))return;
  vibra([25,40,25]);
  setCestino([]);openCestino();render();
}

async function ripristinaDaCestino(id){
  var c=getCestino();
  var t=c.find(function(x){return x.id===id;});
  if(!t)return;
  // Rimuovi dal cestino e re-inserisci con nuovo id
  var newId=Date.now().toString();
  var tx={id:newId,chi:t.chi,importo:t.importo,nota:t.nota,data:t.data};
  setCestino(c.filter(function(x){return x.id!==id;}));
  vibra(30);
  S.txs.push(tx);
  closeCestino();render();dot("","Salvataggio...");
  try{
    await post({action:"addTransaction",id:tx.id,chi:tx.chi,importo:tx.importo,nota:tx.nota,data:tx.data});
    dot("ok","Ripristinata \uD83D\uDC3E");
  }catch(e){
    dot("err","Errore ripristino");
    S.txs=S.txs.filter(function(x){return x.id!==newId;});
    render();
  }
}

async function deleteTx(id){
  // Salva nel cestino prima di eliminare
  var t=S.txs.find(function(x){return x.id===id;});
  if(t) addAlCestino(t);
  var backup=S.txs.slice();
  vibra([20,30,20]);
  S.txs=S.txs.filter(function(t){return t.id!==id;});
  delId=null;
  render();
  dot("","Salvataggio...");
  try{
    await post({action:"deleteTransaction",id:id});
    dot("ok","Sincronizzata \uD83D\uDC3E");
  }catch(e){
    dot("err","Errore salvataggio");
    S.txs=backup;
    render();
  }
}

// ── MODIFICA VOCE ──
function openEditTx(id){
  var t=S.txs.find(function(x){return x.id===id;});
  if(!t)return;
  editTxId=id;
  document.getElementById("edit-chi").value=t.chi;
  document.getElementById("edit-imp").value=t.importo;
  document.getElementById("edit-nota").value=t.nota||"";
  var d=t.data?new Date(t.data):new Date();
  document.getElementById("edit-data").value=isNaN(d)?"":d.toISOString().slice(0,10);
  document.getElementById("modal-edit-tx").classList.add("open");
  setTimeout(function(){document.getElementById("edit-imp").focus();},80);
}
function closeEditTx(){document.getElementById("modal-edit-tx").classList.remove("open");editTxId=null;}
async function saveEditTx(){
  if(!editTxId)return;
  var txId=editTxId;
  var t=S.txs.find(function(x){return x.id===txId;});
  if(!t)return;
  var imp=parseFloat(document.getElementById("edit-imp").value);
  if(!imp||imp<=0)return;
  var chi2=document.getElementById("edit-chi").value;
  var nota=document.getElementById("edit-nota").value.trim();
  var ds=document.getElementById("edit-data").value;
  var dataISO=ds?new Date(ds+"T12:00:00").toISOString():t.data;
  var backup={chi:t.chi,importo:t.importo,nota:t.nota,data:t.data};
  t.chi=chi2;t.importo=imp;t.nota=nota;t.data=dataISO;
  closeEditTx();render();dot("","Salvataggio...");
  try{
    await post({action:"editTransaction",id:txId,chi:chi2,importo:imp,nota:nota,data:dataISO});
    dot("ok","Sincronizzata \uD83D\uDC3E");
  }catch(e){
    dot("err","Errore salvataggio");
    t.chi=backup.chi;t.importo=backup.importo;t.nota=backup.nota;t.data=backup.data;
    render();
  }
}

// ── CAMBIO PASSWORD ──
function openCambioPassword(){
  document.getElementById("cp-attuale").value="";
  document.getElementById("cp-nuova").value="";
  document.getElementById("cp-conferma").value="";
  document.getElementById("cp-errore").textContent="";
  document.getElementById("modal-cambio-pw").classList.add("open");
  setTimeout(function(){document.getElementById("cp-attuale").focus();},80);
}
function closeCambioPassword(){document.getElementById("modal-cambio-pw").classList.remove("open");}

async function confermaCambioPassword(){
  var attuale=document.getElementById("cp-attuale").value;
  var nuova=document.getElementById("cp-nuova").value;
  var conferma=document.getElementById("cp-conferma").value;
  var errEl=document.getElementById("cp-errore");
  errEl.textContent="";
  if(!attuale||!nuova||!conferma){errEl.textContent="Compila tutti i campi.";return;}
  if(nuova.length<6){errEl.textContent="La nuova password deve avere almeno 6 caratteri.";return;}
  if(nuova!==conferma){errEl.textContent="Le due password non corrispondono.";return;}
  var btn=document.getElementById("btn-conferma-pw");
  btn.disabled=true;btn.textContent="Salvataggio...";
  try{
    // Verifico la password attuale rifacendo il login con l'email di CHI è loggato
    var ses=await sb.auth.getSession();
    var mioEmail=(ses.data&&ses.data.session&&ses.data.session.user.email)||TANA_EMAILS[0];
    var check=await sb.auth.signInWithPassword({email:mioEmail,password:attuale});
    if(check.error){
      errEl.textContent="Password attuale errata.";
      btn.disabled=false;btn.textContent="🔑 Cambia password";
      return;
    }
    // Aggiorno la password sull'utente condiviso
    var upd=await sb.auth.updateUser({password:nuova});
    if(upd.error){
      errEl.textContent="Errore: "+upd.error.message;
      btn.disabled=false;btn.textContent="🔑 Cambia password";
      return;
    }
    closeCambioPassword();
    alert("✅ Password cambiata con successo!");
  }catch(e){
    errEl.textContent="Errore di rete. Riprova.";
  }finally{
    btn.disabled=false;btn.textContent="🔑 Cambia password";
  }
}

var editSaldoChi="Luca";
function setEditSaldoChi(c){
  editSaldoChi=c;
  document.getElementById("esc-luca").classList.toggle("on",c==="Luca");
  document.getElementById("esc-ale").classList.toggle("on",c==="Ale");
}
function startEditSaldo(){editSaldo=true;editSaldoChi=S.saldoIniziale<0?"Luca":"Ale";render();setTimeout(function(){var el=document.getElementById("inp-si");if(el)el.focus();},40);}
function cancelEditSaldo(){editSaldo=false;render();}
async function confirmEditSaldo(){
  var v=parseFloat((document.getElementById("inp-si")||{}).value);
  if(isNaN(v)){cancelEditSaldo();return;}
  v=Math.abs(v);
  if(editSaldoChi==="Luca") v=-v;
  vibra(20);
  var backup = S.saldoIniziale;
  S.saldoIniziale=v;editSaldo=false;
  render();
  dot("","Salvataggio...");
  try{
    await post({action:"setSaldoIniziale",value:v});
    dot("ok","Sincronizzata \uD83D\uDC3E");
  } catch(e){
    dot("err","Errore salvataggio");
    S.saldoIniziale = backup;
    render();
  }
}


// ── CHIUSURA MESE E ARCHIVIO ──
function openChiudi(){
  var s=saldo();
  document.getElementById("modal-val").textContent=eurInt(s);
  document.getElementById("modal-val").className="mval "+saldoCls(s);
  document.getElementById("modal-sub").textContent=saldoDesc(s);
  document.getElementById("modal-mese").value=new Date().toLocaleDateString("it-IT",{month:"long",year:"numeric"});
  // Mostra riepilogo spese fisse che verranno archiviate
  var totComuni=S.txs.reduce(function(a,t){return a+t.importo;},0);
  var totFisse=S.fisse.reduce(function(a,f){return a+f.importo;},0);
  var el=document.getElementById("modal-chiudi-fisse");
  if(el){
    if(S.fisse.length){
      var h='<div class="chiudi-fisse-box">';
      h+='<div class="chiudi-fisse-title">📌 Spese fisse archiviate</div>';
      S.fisse.forEach(function(f){
        h+='<div class="chiudi-fisse-row"><span>'+f.icona+' '+escapeHtml(f.nome)+'</span><span>'+eur(f.importo)+'</span></div>';
      });
      h+='<div class="chiudi-fisse-tot"><span>Totale reale mese</span><span>'+eur(totComuni+totFisse)+'</span></div>';
      h+='</div>';
      el.innerHTML=h;
    } else {
      el.innerHTML="";
    }
  }
  document.getElementById("modal-chiudi").classList.add("open");
  setTimeout(function(){document.getElementById("modal-mese").select();},100);
}
function closeChiudi(){document.getElementById("modal-chiudi").classList.remove("open");}

async function chiudiMese(){
  var mese=document.getElementById("modal-mese").value.trim()||new Date().toLocaleDateString("it-IT",{month:"long",year:"numeric"});
  var nuovoSaldo=saldo();
  var totMeseChiusura=Math.round(S.txs.reduce(function(a,t){return a+t.importo;},0)*100)/100;
  // Snapshot delle spese fisse al momento della chiusura
  var fisseSnapshot=S.fisse.map(function(f){return{id:f.id,nome:f.nome,importo:f.importo,icona:f.icona};});
  // Aggiungo le spese previste pagate col bancomat comune in questo mese:
  // confluiscono nello snapshot come voci una-tantum.
  var previsteBancomat=(S.previste||[]).filter(function(p){return p.stato==="pagata_bancomat";});
  previsteBancomat.forEach(function(p){
    fisseSnapshot.push({id:p.id,nome:p.nome+" (prevista)",importo:p.importo,icona:"📅",scadenza:p.scadenza||""});
  });
var now=new Date();
var dataLocale=new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString();
var chiusura={id:Date.now().toString(),mese:mese,saldo:nuovoSaldo,data:dataLocale,saldoIniziale:S.saldoIniziale,txs:S.txs.slice(),totale:totMeseChiusura,fisseSnapshot:fisseSnapshot};
  closeChiudi();
  
  var backupTxs = S.txs.slice();
  var backupSaldo = S.saldoIniziale;
  
  vibra([30,50,30]);
S.chiusure.unshift(chiusura);sortChiusure();S.saldoIniziale=nuovoSaldo;S.txs=[];
  render();
  dot("","Chiusura in corso...");
  
  try{
    await post({action:"chiudiMese",chiusura:chiusura,nuovoSaldo:nuovoSaldo});
    // Le previste pagate col bancomat sono confluite nello snapshot:
    // le rimuovo dalla lista previste (foglio + locale).
    if(previsteBancomat.length){
      for(var i=0;i<previsteBancomat.length;i++){
        try{ await post({action:"deletePrevista",id:previsteBancomat[i].id}); }catch(e){}
      }
      var idsRimosse=previsteBancomat.map(function(p){return p.id;});
      S.previste=S.previste.filter(function(p){return idsRimosse.indexOf(p.id)===-1;});
    }
    // ── PONTE → ORSO SOLO ──
    // Per ciascun orso, deposito nel suo registro personale una voce
    // pari al TOTALE che ha speso in cassa comune questo mese (intero,
    // non metà). origine collegata alla chiusura per il ripristino.
    try{ await depositaQuoteSolo(chiusura); }catch(e){ console.error("Ponte Solo:",e); }
    dot("ok","Mese chiuso \uD83C\uDF19");
  } catch(e){
    dot("err","Errore chiusura");
    S.chiusure=S.chiusure.filter(function(x){return x.id!==chiusura.id;}); S.txs = backupTxs; S.saldoIniziale = backupSaldo;
    render();
  }
}

// Ponte: deposita nel Solo di ogni orso il totale speso in cassa comune
// nel mese appena chiuso. Una voce per orso (se ha speso > 0).
async function depositaQuoteSolo(chiusura){
  var tot={Luca:0, Ale:0};
  (chiusura.txs||[]).forEach(function(t){
    if(tot[t.chi]!==undefined) tot[t.chi]+=t.importo;
  });
  var orsi=["Luca","Ale"];
  for(var i=0;i<orsi.length;i++){
    var chi=orsi[i];
    var importo=Math.round(tot[chi]*100)/100;
    if(importo<=0) continue;
    var voce={
      id:"cc"+Date.now()+"_"+chi,
      proprietario:chi,
      tipo:"uscita",
      importo:importo,
      categoria:"Cassa Comune",
      nota:"Cassa Comune – "+chiusura.mese,
      data:chiusura.data,
      origine:"chiusura:"+chiusura.id
    };
    await post({action:"addSoloVoce",voce:voce});
    // Se è l'orso attualmente sbloccato, aggiorno anche la vista locale
    if(soloSbloccato && soloChi===chi){
      soloData.voci.unshift(voce);
    }
  }
}

// Ponte inverso: alla ripristino di un mese, rimuove dal Solo le voci
// "Cassa Comune" generate da quella chiusura — ma solo se ancora intatte
// (importo invariato). Quelle modificate restano e vengono segnalate.
async function rimuoviQuoteSolo(chiusura){
  // Ricalcolo i totali attesi per orso (come al deposito)
  var attesi={Luca:0, Ale:0};
  (chiusura.txs||[]).forEach(function(t){ if(attesi[t.chi]!==undefined) attesi[t.chi]+=t.importo; });
  for(var k in attesi){ attesi[k]=Math.round(attesi[k]*100)/100; }

  var origine="chiusura:"+chiusura.id;
  var res;
  try{
    res=await sb.from("solo_voci").select("*").eq("origine",origine);
  }catch(e){ return; }
  if(!res || res.error || !res.data) return;

  var modificate=[];
  for(var i=0;i<res.data.length;i++){
    var v=res.data[i];
    var atteso=attesi[v.proprietario];
    if(Math.abs((parseFloat(v.importo)||0) - atteso) < 0.005){
      // intatta → elimino
      await post({action:"deleteSoloVoce",id:v.id});
      if(soloSbloccato && soloChi===v.proprietario){
        soloData.voci=soloData.voci.filter(function(x){return x.id!==v.id;});
      }
    } else {
      modificate.push(v.proprietario);
    }
  }
  if(soloSbloccato) renderSolo();
  if(modificate.length){
    // Avviso non bloccante: alcune quote erano state modificate
    setTimeout(function(){
      alert("⚠️ Nel registro Solo c'erano voci 'Cassa Comune' di questo mese già modificate ("+modificate.join(", ")+"). Non le ho toccate: controllale a mano.");
    }, 400);
  }
}

// ── STORICO MESE ARCHIVIATO ──
function openStoricoMese(id){
  var c=S.chiusure.find(function(x){return x.id===id;});if(!c)return;
  document.getElementById("modal-storico-titolo").textContent="\uD83D\uDCE6 "+c.mese;
  document.getElementById("modal-storico-sub").textContent=c.txs.length+" voci \u00b7 chiuso il "+fmtLong(c.data);
  var h="";
  if(!c.txs.length && !(c.fisseSnapshot && c.fisseSnapshot.length)){h='<div style="text-align:center;color:var(--text3);padding:20px;font-size:14px;">'+fraseVuoto("mese")+'</div>';}
  else{
    // Sezione transazioni: solo se il mese ha movimenti
    if(c.txs.length){
    var run=c.saldoIniziale;
    h+='<div class="row-start"><span>\uD83C\uDF32 Debito di partenza</span><strong>'+eurInt(c.saldoIniziale)+'</strong></div>';
    c.txs.forEach(function(t){
      run=t.chi==="Luca"?run+t.importo:run-t.importo;
      var isL=t.chi==="Luca";
      var ac=run>0?"ac":run<0?"lc":"pc";
      var al=run>0?"ale <img src='./bear.svg' style='width:0.625rem;height:0.625rem;'>":run<0?"luca <img src='./bear.svg' style='width:0.625rem;height:0.625rem;'>":"pari \uD83C\uDF6F";
      h+='<div class="tx '+(isL?"luca":"ale")+'"><div class="tx-ava '+(isL?"l":"a")+'"><img src="./bear.svg" style="width:1.25rem;height:1.25rem;"></div><div class="tx-body"><div class="tx-nota">'+escapeHtml(t.nota||(isL?"Spesa Luca":"Spesa Ale"))+'</div><div class="tx-sub"><span class="tx-date">'+fmt(t.data)+'</span><span class="tx-who '+(isL?"l":"a")+'">'+t.chi+'</span></div></div><div class="tx-nums"><div class="tx-imp '+(isL?"l":"a")+'">'+eurInt(t.importo)+'</div><div class="tx-after '+ac+'">&rarr; '+eurInt(run)+' '+al+'</div></div></div>';
    });
    var fcol=c.saldo>0?"var(--berry)":c.saldo<0?"var(--moss)":"var(--moss)";
    h+='<div class="row-start" style="margin-top:8px;"><span>\uD83C\uDFC1 Debito finale</span><strong style="color:'+fcol+'">'+eurInt(c.saldo)+'</strong></div>';
    }
    // Snapshot spese fisse
    var totF=0;
    if(c.fisseSnapshot && c.fisseSnapshot.length){
      totF=c.fisseSnapshot.reduce(function(a,f){return a+f.importo;},0);
      h+='<div class="fisse-snapshot">';
      h+='<div class="fisse-snapshot-title">📌 Spese fisse del mese</div>';
      c.fisseSnapshot.forEach(function(f){
        h+='<div class="fisse-snapshot-row"><span>'+f.icona+' '+escapeHtml(f.nome)+'</span><span>'+eur(f.importo)+'</span></div>';
      });
      h+='<div class="fisse-snapshot-tot"><span>Totale fisse</span><span>'+eur(totF)+'</span></div>';
      h+='</div>';
    }
    // Riepilogo totali scorporato (Tana / Fisse / Reale)
    h+='<div class="riepilogo-mese">';
    h+='<div class="riepilogo-mese-row"><span>🛒 Spese Tana</span><span>'+eur(c.totale)+'</span></div>';
    h+='<div class="riepilogo-mese-row"><span>📌 Spese fisse</span><span>'+eur(totF)+'</span></div>';
    h+='<div class="riepilogo-mese-row tot"><span>💰 Totale reale del mese</span><span>'+eur(c.totale+totF)+'</span></div>';
    h+='</div>';
    // Split Luca vs Ale del mese (torta mensile)
    var spL=0, spA=0;
    c.txs.forEach(function(t){ if(t.chi==="Luca") spL+=t.importo; else spA+=t.importo; });
    var spTot=spL+spA;
    if(spTot>0){
      var pL=Math.round(spL/spTot*100), pA=100-pL;
      h+='<div class="storico-split">';
      h+='<div class="storico-split-title">🥧 Chi ha speso (questo mese)</div>';
      h+='<div class="storico-split-bar"><div class="storico-split-l" style="width:'+pL+'%"></div><div class="storico-split-a" style="width:'+pA+'%"></div></div>';
      h+='<div class="storico-split-legenda">'
        +'<span><span class="ss-dot l"></span>Luca '+eur(spL)+' ('+pL+'%)</span>'
        +'<span><span class="ss-dot a"></span>Ale '+eur(spA)+' ('+pA+'%)</span></div>';
      h+='</div>';
    }
  }
  document.getElementById("modal-storico-body").innerHTML=h;
  document.getElementById("btn-ripristina-da-storico").onclick=function(){closeStoricoMese();openRipristino(id);};
  document.getElementById("btn-pdf-mese").onclick=function(){esportaPDF(id);};
  document.getElementById("modal-storico-mese").classList.add("open");
}
function closeStoricoMese(){document.getElementById("modal-storico-mese").classList.remove("open");}

function openRipristino(id){
  var c=S.chiusure.find(function(x){return x.id===id;});if(!c)return;
  ripristinoTarget=c;
  document.getElementById("modal-rip-txt").textContent='Vuoi ripristinare "'+c.mese+'"? Tornerai allo stato esatto di quel mese.';
  document.getElementById("modal-rip-val").textContent=eurInt(c.saldo);
  document.getElementById("modal-rip-val").className="mval "+saldoCls(c.saldo);
  document.getElementById("modal-rip-sub").textContent=saldoDesc(c.saldo);
  document.getElementById("modal-ripristino").classList.add("open");
}
function closeRipristino(){document.getElementById("modal-ripristino").classList.remove("open");ripristinoTarget=null;}

async function confermaRipristino(){
  if(!ripristinoTarget)return;
  vibra([25,40,25]);
  var c=ripristinoTarget;closeRipristino();
  
  var backupSaldo = S.saldoIniziale;
  var backupTxs = S.txs.slice();
  var backupChiusure = S.chiusure.slice();
  var backupPreviste = S.previste.slice();

  // Ricostruisco le previste pagate-bancomat assorbite in questa chiusura
  // (righe dello snapshot con icona 📅 e nome "… (prevista)"). La scadenza
  // c'è solo per i mesi chiusi dopo l'aggiunta del campo (altrimenti vuota).
  var previsteRip=(c.fisseSnapshot||[]).filter(function(f){
    return f.icona==="📅" && / \(prevista\)$/.test(f.nome||"");
  }).map(function(f){
    return {id:f.id, nome:String(f.nome).replace(/ \(prevista\)$/,""), importo:f.importo,
            scadenza:f.scadenza||"", stato:"pagata_bancomat", data:new Date().toISOString()};
  });
  
  S.saldoIniziale=c.saldoIniziale;S.txs=c.txs.slice();
  S.chiusure=S.chiusure.filter(function(x){return x.id!==c.id;});
  sortChiusure();
  if(previsteRip.length){
    var giaIds={}; S.previste.forEach(function(p){giaIds[p.id]=1;});
    previsteRip.forEach(function(p){ if(!giaIds[p.id]) S.previste.push(p); });
  }
  render();
  dot("","Ripristino...");
  
  try{
    await post({action:"ripristina",chiusuraId:c.id,saldoIniziale:c.saldoIniziale,txs:c.txs});
    // Re-inserisco sul server le previste-bancomat ripristinate
    for(var i=0;i<previsteRip.length;i++){
      var pr=previsteRip[i];
      try{ await post({action:"addPrevista",id:pr.id,nome:pr.nome,importo:pr.importo,scadenza:pr.scadenza,stato:pr.stato,data:pr.data}); }catch(e){}
    }
    // ── PONTE INVERSO → ORSO SOLO ──
    // Rimuovo le voci "Cassa Comune" che questa chiusura aveva depositato,
    // ma solo se intatte. Quelle modificate/spostate vengono segnalate.
    try{ await rimuoviQuoteSolo(c); }catch(e){ console.error("Ponte inverso:",e); }
    dot("ok","Ripristinato \uD83D\uDD04");
  } catch(e){
    dot("err","Errore ripristino");
    S.saldoIniziale = backupSaldo; S.txs = backupTxs; S.chiusure = backupChiusure; S.previste = backupPreviste;
    render();
  }
}

function toggleEliminaConfirm(id){eliminaConfirmId=eliminaConfirmId===id?null:id;render();}
// ── CESTINO ARCHIVI (localStorage, per-dispositivo) ──
// Recupero dei mesi archiviati cancellati. Conserva lo snapshot INTERO
// della chiusura e lo ripristina fedele. Cap 24 (snapshot pesanti).
var ARCHIVI_CESTINO_KEY="tana_archivi_cestino_v1";
function getArchiviCestino(){try{return JSON.parse(localStorage.getItem(ARCHIVI_CESTINO_KEY)||"[]");}catch(e){return[];}}
function setArchiviCestino(arr){localStorage.setItem(ARCHIVI_CESTINO_KEY,JSON.stringify(arr.slice(0,24)));}
function addAlArchiviCestino(c){var a=getArchiviCestino();a.unshift(Object.assign({},c,{_eliminata:new Date().toISOString()}));setArchiviCestino(a);}

function openArchiviCestino(){
  var a=getArchiviCestino();
  var el=document.getElementById("archivi-cestino-list");
  var svuota=document.getElementById("btn-svuota-archivi-cestino");
  if(!a.length){
    el.innerHTML='<div class="cestino-vuoto">'+statoVuoto("cestino","4rem")+'</div>';
    if(svuota)svuota.style.display="none";
  }else{
    if(svuota)svuota.style.display="";
    var h="";
    a.forEach(function(c){
      var nv=(c.txs||[]).length;
      h+='<div class="cestino-row">';
      h+='<div class="cestino-row-body">';
      h+='<div class="cestino-row-nota">🌙 '+escapeHtml(c.mese)+'</div>';
      h+='<div class="cestino-row-meta">'+nv+' voci · chiuso il '+fmt(c.data)+'</div>';
      h+='</div>';
      h+='<div class="cestino-row-imp '+saldoCls(c.saldo)+'">'+eurInt(c.saldo)+'</div>';
      h+='<button class="btn-ripristina-voce" onclick="ripristinaDaArchivioCestino(\''+c.id+'\')">↩ Ripristina</button>';
      h+='</div>';
    });
    el.innerHTML=h;
  }
  document.getElementById("modal-archivi-cestino").classList.add("open");
}
function closeArchiviCestino(){document.getElementById("modal-archivi-cestino").classList.remove("open");}
function svuotaArchiviCestino(){
  if(!confirm("Svuotare il cestino archivi? I mesi verranno eliminati definitivamente."))return;
  vibra([25,40,25]);
  setArchiviCestino([]);openArchiviCestino();render();
}

async function ripristinaDaArchivioCestino(id){
  var a=getArchiviCestino();
  var c=a.find(function(x){return x.id===id;});
  if(!c) return;
  var backupCestino=a.slice();
  var chiusura=Object.assign({},c); delete chiusura._eliminata;  // snapshot pulito
  setArchiviCestino(a.filter(function(x){return x.id!==id;}));
  vibra(30);
  // guard anti-duplicato: rimpiazzo eventuale chiusura con stesso id, poi inserisco
  S.chiusure=S.chiusure.filter(function(x){return x.id!==chiusura.id;});
  S.chiusure.unshift(chiusura);
  sortChiusure();
  closeArchiviCestino();render();dot("","Ripristino...");
  try{
    await post({action:"restoreChiusura",chiusura:chiusura});
    dot("ok","Ripristinato 🔄");
  }catch(e){
    dot("err","Errore ripristino");
    S.chiusure=S.chiusure.filter(function(x){return x.id!==chiusura.id;});
    setArchiviCestino(backupCestino);  // rimetto nel cestino, niente perdita
    render();
  }
}

async function eliminaArchiviazione(id){
  var c=S.chiusure.find(function(x){return x.id===id;});
  if(c) addAlArchiviCestino(c);
  var backup = S.chiusure.slice();
  S.chiusure=S.chiusure.filter(function(x){return x.id!==id;});
  eliminaConfirmId=null;
  render();
  dot("","Eliminazione...");
  
  try{
    await post({action:"eliminaChiusura",id:id});
    dot("ok","Sincronizzata \uD83D\uDC3E");
  } catch(e){
    dot("err","Errore eliminazione");
    S.chiusure = backup;
    render();
  }
}

// ── RENDER PRINCIPALE DELLA PAGINA ──

// ── GRAFICO ──

function countUpSaldo(el, from, to){
  var dur=450, start=null;
  function step(ts){
    if(!start) start=ts;
    var p=Math.min((ts-start)/dur,1);
    // ease-out
    var e=1-Math.pow(1-p,3);
    var val=Math.round(from+(to-from)*e);
    el.textContent=val===0?"0 \u20ac":eurInt(val);
    if(p<1) requestAnimationFrame(step);
    else el.textContent=to===0?"0 \u20ac":eurInt(to);
  }
  requestAnimationFrame(step);
}

function render(){
  var s=saldo();
  var numEl=document.getElementById("saldo-num");
  if(prevSaldo!==null && prevSaldo!==s){
    numEl.classList.remove("bump");
    void numEl.offsetWidth;
    numEl.classList.add("bump");
    setTimeout(function(){numEl.classList.remove("bump");},500);
    countUpSaldo(numEl, prevSaldo, s);
  } else {
    numEl.textContent=s===0?"0 \u20ac":eurInt(s);
  }
  prevSaldo=s;
  numEl.className="saldo-num "+saldoCls(s);
  var bm={
    ale:'<div class="saldo-badge ale"><img src="./bear.svg" style="width:0.875rem;height:0.875rem;vertical-align:middle;margin-right:4px;"> Ale Orsa deve portare '+eurInt(s)+' di miele</div>',
    luca:'<div class="saldo-badge luca"><img src="./bear.svg" style="width:0.875rem;height:0.875rem;vertical-align:middle;margin-right:4px;"> Luca Orso deve portare '+eurInt(Math.abs(s))+' di Miele</div>',
    pari:'<div class="saldo-badge pari">\uD83C\uDF6F Gli Orsi sono in pari!</div>'
  };
  document.getElementById("saldo-badge").innerHTML=bm[saldoCls(s)];

  var totMese=S.txs.reduce(function(a,t){return a+t.importo;},0);
  document.getElementById("honey-jar-val").textContent=eur(totMese);

  var bw=document.getElementById("saldo-base-wrap");
  var siAbs=Math.abs(S.saldoIniziale);
  var siChi=S.saldoIniziale>0?"Ale":"Luca";
  bw.innerHTML=editSaldo
    ?'<div class="edit-saldo-form"><label>\uD83C\uDF6F Debito di partenza \u2014 chi deve?</label><div class="edit-saldo-chi"><button class="esc-btn'+(siChi==="Luca"?" on":"")+'" id="esc-luca" onclick="setEditSaldoChi(\'Luca\')">Luca</button><button class="esc-btn'+(siChi==="Ale"?" on":"")+'" id="esc-ale" onclick="setEditSaldoChi(\'Ale\')">Ale</button></div><div class="erow"><input class="inp-saldo" id="inp-si" type="number" inputmode="decimal" min="0" step="1" value="'+siAbs+'" onkeydown="if(event.key===\'Enter\')confirmEditSaldo()"><span style="color:rgba(255,255,255,.4);font-weight:700;font-size:16px">&euro;</span><button class="btn-ok" onclick="confirmEditSaldo()">Salva</button><button class="btn-cancel-sm" onclick="cancelEditSaldo()">&times;</button></div></div>'
    :'<div class="saldo-base"><div class="saldo-base-lbl">Debito di partenza</div><div class="saldo-base-val">'+eurInt(siAbs)+'</div><button class="btn-edit-saldo" onclick="startEditSaldo()">\u270F\uFE0F Modifica</button></div>';

  renderDebiti();
  aggiornaPulsePreviste();

  var el=document.getElementById("storico");
  var h="";
  var cestinoN=getCestino().length;
  var cestinoBadge=cestinoN>0?'<span class="cestino-badge">'+cestinoN+'</span>':'';

  if(!S.txs.length){
    h+='<div class="storico-toolbar">';
    h+='<span class="storico-head-lbl">Storico tana</span>';
    h+='<button class="btn-cestino-hd'+(cestinoN>0?" pieno":"")+ '" onclick="openCestino()">🗑️'+cestinoBadge+'</button>';
    h+='</div>';
    h+='<div class="empty">'+statoVuoto("tana","5.5rem")+'</div>';
  }else{
    // Ordina per data
    var sorted=S.txs.slice().sort(function(a,b){
      var da=new Date(a.data||0), db=new Date(b.data||0);
      return sortDateAsc?(da-db):(db-da);
    });
    // Applica filtro chi
    var filtered=sorted.filter(function(t){
      if(filterChi!=="tutti" && t.chi!==filterChi) return false;
      return true;
    });
    // Ricalcola "after" in ordine cronologico
    var cronologico=S.txs.slice().sort(function(a,b){return new Date(a.data||0)-new Date(b.data||0);});
    var afterMap={};var run=S.saldoIniziale;
    cronologico.forEach(function(t){run=t.chi==="Luca"?run+t.importo:run-t.importo;afterMap[t.id]=run;});

    // Toolbar
    h+='<div class="storico-toolbar">';
    h+='<span class="storico-head-lbl">Storico'+(filtered.length!==S.txs.length?" &mdash; "+filtered.length+"/"+S.txs.length:" &mdash; "+S.txs.length)+' voci</span>';
    h+='<button class="btn-sort'+(sortDateAsc?" active":"")+ '" onclick="sortDateAsc=!sortDateAsc;render()">';
    h+=(sortDateAsc?"📅 ↑":"📅 ↓");
    h+='</button>';
    h+='<button class="btn-cestino-hd'+(cestinoN>0?" pieno":"")+ '" onclick="openCestino()">🗑️'+cestinoBadge+'</button>';
    h+='</div>';

    // Filtro chi + totale quando filtrato
    var totFiltrato=filtered.reduce(function(a,t){return a+t.importo;},0);
    h+='<div class="filter-chi-wrap" style="margin-bottom:8px;">';
    h+='<button class="btn-filter-chi'+(filterChi==="tutti"?" active-tutti":"")+ '" onclick="filterChi=\'tutti\';render()">Tutti</button>';
    h+='<button class="btn-filter-chi'+(filterChi==="Luca"?" active-luca":"")+ '" onclick="filterChi=\'Luca\';render()"><img src="./bear.svg" style="width:0.75rem;height:0.75rem;vertical-align:middle;"> Luca</button>';
    h+='<button class="btn-filter-chi'+(filterChi==="Ale"?" active-ale":"")+ '" onclick="filterChi=\'Ale\';render()"><img src="./bear.svg" style="width:0.75rem;height:0.75rem;vertical-align:middle;"> Ale</button>';
    h+='<button class="btn-filter-chi" onclick="openGrafico(\'torta\')" title="Chi ha speso questo mese">🥧</button>';
    if(filterChi!=="tutti"){
      h+='<span style="margin-left:auto;font-size:12px;font-family:\'Nunito\',sans-serif;font-weight:700;color:var(--text2);">Totale: <strong>'+eur(totFiltrato)+'</strong></span>';
    }
    h+='</div>';

    h+='<div class="row-start"><span>\uD83C\uDF32 Debito di partenza</span><strong>'+eurInt(S.saldoIniziale)+'</strong></div>';

    filtered.forEach(function(t){
      var id=t.id,isL=t.chi==="Luca";
      var after=afterMap[id]||0;
      if(delId===id){h+='<div class="del-confirm"><span>\uD83D\uDDD1\uFE0F Eliminare questa voce?</span><button class="btn-yes" onclick="deleteTx(\''+id+'\')">S\u00ec</button><button class="btn-no" onclick="delId=null;render()">No</button></div>';return;}
      var ac=after>0?"ac":after<0?"lc":"pc";
      var al=after>0?"ale <img src='./bear.svg' style='width:0.625rem;height:0.625rem;'>":after<0?"luca <img src='./bear.svg' style='width:0.625rem;height:0.625rem;'>":"pari \uD83C\uDF6F";
      h+='<div class="tx '+(isL?"luca":"ale")+'">';
      h+='<div class="tx-ava '+(isL?"l":"a")+'"><img src="./bear.svg" style="width:1.375rem;height:1.375rem;"></div>';
      h+='<div class="tx-body"><div class="tx-nota">'+escapeHtml(t.nota||(isL?"Spesa Luca":"Spesa Ale"))+'</div>';
      h+='<div class="tx-sub"><span class="tx-date">'+fmt(t.data)+'</span><span class="tx-who '+(isL?"l":"a")+'">'+t.chi+'</span></div></div>';
      h+='<div class="tx-nums"><div class="tx-imp '+(isL?"l":"a")+'">'+eurInt(t.importo)+'</div>';
      h+='<div class="tx-after '+ac+'">&rarr; '+eurInt(after)+' '+al+'</div></div>';
      h+='<button class="btn-del" onclick="openEditTx(\''+id+'\')" title="Modifica" style="color:var(--honey-d);border-color:var(--honey-brd);background:var(--honey-bg);">✏️</button>';
      h+='<button class="btn-del" onclick="delId=\''+id+'\';render()" aria-label="Elimina">&times;</button>';
      h+='</div>';
    });

    if(filtered.length===0 && S.txs.length>0){
      h+='<div class="empty" style="padding:24px 0;"><span style="font-size:32px;">🔍</span><br>Nessuna voce con questi filtri.</div>';
    }
  }
  if(S.chiusure.length){
    // Le chiusure sono nella tab Archivio — aggiorna solo se la tab è visibile
  }
  el.innerHTML=h;
  // Ottimizzazione: renderizza solo il tab attivo
  switch(currentTab){
    case "archivio": renderArchivioTab(); break;
    case "fisso": renderFisse(); renderRiepilogo(); if(fisseSegmento==="previste") renderPreviste(); break;
    case "lista": renderLista(); break;
  }
  checkListaPulse();
}

// ── GRAFICO ──
// ── ARCHIVIO TAB ──
function renderArchivioTab(){
  var el=document.getElementById("archivio-tab-content");
  if(!el)return;
  var h="";

  // Accesso al cestino archivi (raggiungibile anche con 0 archivi)
  var nArchCest=getArchiviCestino().length;
  if(nArchCest>0){
    h+='<div style="display:flex;justify-content:flex-end;margin-bottom:10px;"><button class="btn-cestino-hd pieno" onclick="openArchiviCestino()">🗑️ Cestino <span class="cestino-badge">'+nArchCest+'</span></button></div>';
  }

  if(!S.chiusure.length){
    h+='<div class="empty" style="margin-top:20px;"><span style="font-size:48px;display:block;margin-bottom:12px;">📦</span>Nessun mese archiviato ancora.<br>Chiudi il primo mese per iniziare!</div>';
    el.innerHTML=h;return;
  }

  // Riepilogo archivio + Grafico (in cima)
  var totAnnuale=S.chiusure.reduce(function(a,c){return a+(c.totale||c.txs.reduce(function(b,t){return b+(parseFloat(t.importo)||0);},0));},0);
  var mediaAnnuale=S.chiusure.length>0?Math.round(totAnnuale/S.chiusure.length):0;
  h+='<div class="chiusure-section">';
  h+='<div class="chiusure-head-row"><span class="chiusure-head">📦 '+S.chiusure.length+' mesi archiviati</span><button class="btn-grafico" onclick="openGrafico('barre')">📊 Grafico</button></div>';
  h+='<div class="chiusura-totale" style="margin-bottom:4px;">📅 Totale archivio: <strong>'+eurInt(totAnnuale)+'</strong></div>';
  h+='<div class="chiusura-totale" style="margin-bottom:12px;">📊 Media mensile: <strong>'+eurInt(mediaAnnuale)+'</strong></div>';

  // Accordion: anni che raggruppano i mesi (card ricche). Anno corrente aperto di default.
  var anniMap={};
  S.chiusure.forEach(function(c){
    var annoKey="?";
    if(c.data){ var d=new Date(c.data); if(!isNaN(d)) annoKey=String(d.getFullYear()); }
    (anniMap[annoKey]=anniMap[annoKey]||[]).push(c);
  });
  var anniKeys=Object.keys(anniMap).sort(function(a,b){return b-a;});
  anniKeys.forEach(function(anno){
    var mesi=anniMap[anno];
    var totAnno=mesi.reduce(function(a,c){return a+(c.totale||c.txs.reduce(function(b,t){return b+(parseFloat(t.importo)||0);},0));},0);
    var totFisseAnno=mesi.reduce(function(a,c){var f=c.fisseSnapshot||[];return a+f.reduce(function(b,x){return b+(parseFloat(x.importo)||0);},0);},0);
    var totRealeAnno=totAnno+totFisseAnno;
    var mediaAnno=mesi.length>0?Math.round(totAnno/mesi.length):0;
    var isOpen=(annoAperto===anno);
    h+='<div class="anno-card">';
    h+='<div class="anno-header" onclick="toggleAnno(\''+anno+'\')">';
    h+='<span class="anno-label">📅 '+anno+'</span>';
    h+='<span class="anno-tot">'+eurInt(totAnno)+'</span>';
    h+='<span class="anno-toggle'+(isOpen?" open":"")+'">▼</span>';
    h+='</div>';
    h+='<div class="anno-stat-row">';
    h+='<span>'+mesi.length+' mesi · media: <strong>'+eurInt(mediaAnno)+'</strong></span>';
    if(totFisseAnno>0){
      h+='<span style="color:var(--honey-d);">📌 Fisse: <strong>'+eurInt(totFisseAnno)+'</strong> · Totale reale: <strong>'+eurInt(totRealeAnno)+'</strong></span>';
    }
    h+='</div>';
    h+='<div class="anno-mesi'+(isOpen?" open":"")+'">';
    mesi.forEach(function(c){
      var cls=saldoCls(c.saldo);
      var desc=c.saldo>0?"Ale Orsa in debito di "+eurInt(c.saldo):c.saldo<0?"Luca Orso in debito di "+eurInt(Math.abs(c.saldo)):"In pari";
      var tot=c.totale||c.txs.reduce(function(a,t){return a+(parseFloat(t.importo)||0);},0);
      h+='<div class="chiusura-row"><div class="chiusura-top"><div class="chiusura-info"><div class="chiusura-mese">🌙 '+escapeHtml(c.mese)+'</div><div class="chiusura-meta">'+c.txs.length+' voci · chiuso il '+fmt(c.data)+'</div></div><div class="chiusura-saldo '+saldoCls(c.saldo)+'">'+eurInt(c.saldo)+'</div></div><div class="chiusura-desc">'+desc+'</div><div class="chiusura-totale">🛒 Totale spese mese: <strong>'+eurInt(tot)+'</strong></div><div class="chiusura-btns"><button class="btn-storico-mese" onclick="openStoricoMese(\''+c.id+'\')">📋 Vedi storico</button><button class="btn-ripristina" onclick="openRipristino(\''+c.id+'\')">🔄 Ripristina</button><button class="btn-elimina-arch" onclick="toggleEliminaConfirm(\''+c.id+'\')" title="Elimina">🗑️</button></div>';
      if(eliminaConfirmId===c.id){h+='<div class="elimina-arch-confirm"><span>Eliminare definitivamente questo mese?</span><button class="btn-yes" onclick="eliminaArchiviazione(\''+c.id+'\')">Sì</button><button class="btn-no" onclick="toggleEliminaConfirm(\''+c.id+'\')">No</button></div>';}
      h+='</div>';
    });
    h+='</div>';
    h+='</div>';
  });
  h+='</div>';

  el.innerHTML=h;
}

function toggleAnno(anno){
  annoAperto=(annoAperto===anno)?null:anno;
  renderArchivioTab();
}



// ═══════════════════════════════════════════════════════════
// ── HELPERS AGGIUNTIVI ──
// ═══════════════════════════════════════════════════════════
function escapeHtml(s){
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
function fmtRelativo(iso){
  if(!iso)return"";var d=new Date(iso);if(isNaN(d))return"";
  var s=(Date.now()-d)/1000;
  if(s<60)return"poco fa";
  if(s<3600)return Math.floor(s/60)+" min fa";
  if(s<86400)return Math.floor(s/3600)+" ore fa";
  if(s<172800)return"ieri";
  return d.toLocaleDateString("it-IT",{day:"numeric",month:"short"});
}

// ── Identità Lista ──────────────────────────────────────
function getIdentity(){return localStorage.getItem(IDENTITY_KEY)||"Luca";}
function setIdentity(id){
  localStorage.setItem(IDENTITY_KEY,id);
  var btnL=document.getElementById("id-btn-luca");
  var btnA=document.getElementById("id-btn-ale");
  if(btnL)btnL.className="id-btn"+(id==="Luca"?" active-luca":"");
  if(btnA)btnA.className="id-btn"+(id==="Ale"?" active-ale":"");
}

// ── Lista Spesa — Render ────────────────────────────────
function renderListaItem(item){
  var h='<div class="lista-item'+(item.completata?" completata":"")+ '" data-id="'+item.id+'">';
  h+='<div class="lista-item-inner">';
  h+='<button class="lista-check-btn" onclick="toggleListaItem(\''+item.id+'\')">'+(item.completata?'✅':'⬜')+'</button>';
  h+='<div class="lista-item-body">';
  if(item.quantita)h+='<span class="lista-qty-tag">'+escapeHtml(item.quantita)+'</span>';
  h+='<span class="lista-testo'+(item.completata?" completata":"")+'">'+escapeHtml(item.testo)+'</span>';
  h+='</div>';
  h+='<button class="lista-del-btn" onclick="deleteListaItem(\''+item.id+'\')" aria-label="Elimina">&#215;</button>';
  h+='</div></div>';
  return h;
}

function renderLista(){
  var el=document.getElementById("lista-content");
  if(!el)return;

  // Preserva valori durante re-render
  var qtyVal=(document.getElementById("lista-qty")||{}).value||"";
  var testoVal=(document.getElementById("lista-testo")||{}).value||"";
  var notaEl=document.getElementById("note-textarea");
  var notaFocused=notaEl&&document.activeElement===notaEl;
  var notaVal=notaFocused?notaEl.value:null;

  var identity=getIdentity();
  var identityClass=identity==="Luca"?"identity-luca":identity==="Ale"?"identity-ale":"";
  var h="";

  // ── 1. NOTE CONDIVISE (in cima) ──────────────────────────
  h+='<div class="note-card '+identityClass+'">';
  h+='<div class="note-header">';
  h+='<span class="note-title">📝 Note degli Orsi</span>';
  h+='<span class="note-status" id="note-status"></span>';
  h+='</div>';
  // Identity selector integrato nella note card
  h+='<div class="note-identity-row">';
  h+='<span class="nota-id-lbl">✍️ Scrivi come:</span>';
  h+='<button class="id-btn'+(identity==="Luca"?" active-luca":"")+ '" id="id-btn-luca" onclick="setIdentity(\'Luca\')"><img src="./bear.svg" style="width:0.9375rem;height:0.9375rem;vertical-align:middle;margin-right:4px;" alt="">Luca</button>';
  h+='<button class="id-btn'+(identity==="Ale"?" active-ale":"")+ '" id="id-btn-ale" onclick="setIdentity(\'Ale\')"><img src="./bear.svg" style="width:0.9375rem;height:0.9375rem;vertical-align:middle;margin-right:4px;" alt="">Ale</button>';
  h+='</div>';
  // Meta: chi ha scritto e quando, in colore identità
  if(S.nota.autore||S.nota.data){
    var autoreColor=S.nota.autore==="Luca"?"var(--berry)":S.nota.autore==="Ale"?"var(--moss)":"var(--text3)";
    h+='<div class="note-meta" style="color:'+autoreColor+'" title="'+fmtLong(S.nota.data)+'">';
    h+='Ultima modifica: <strong style="color:'+autoreColor+'">'+escapeHtml(S.nota.autore||"")+'</strong> · '+fmtRelativo(S.nota.data);
    h+='</div>';
  }
  h+='<textarea class="note-textarea" id="note-textarea" placeholder="Scrivi note per gli Orsi…" oninput="onNotaInput()">'+escapeHtml(S.nota.testo||"")+'</textarea>';
  h+='</div>'; // fine note-card

  // ── 2. LISTA DELLA SPESA (in fondo) ──────────────────────
  h+='<div class="lista-card">';
  h+='<span class="section-lbl">🧺 Lista della spesa</span>';
  // Input row: TESTO a sinistra (grande), QTÀ a destra (piccolo)
  h+='<div class="lista-input-row">';
  h+='<input class="inp lista-inp-testo" type="text" id="lista-testo" placeholder="Latte, Pasta, Miele…" autocomplete="off" onkeydown="if(event.key===\'Enter\'){event.preventDefault();addListaItem();}">';
  h+='<input class="inp lista-inp-qty" type="text" id="lista-qty" placeholder="Qtà" autocomplete="off" onkeydown="if(event.key===\'Enter\'){event.preventDefault();addListaItem();}">';
  h+='<button class="btn-add-lista" onclick="addListaItem()" aria-label="Aggiungi">+</button>';
  h+='</div>';

  var attivi=S.lista.filter(function(i){return!i.completata;});
  var completati=S.lista.filter(function(i){return i.completata;});

  if(!S.lista.length){
    h+='<div class="lista-empty">🧺 Lista vuota — aggiungi qualcosa!</div>';
  }else{
    h+='<div class="lista-check-all-row">';
    if(attivi.length)h+='<button class="btn-check-all" onclick="checkAllLista(true)">✅ Spunta tutti ('+attivi.length+')</button>';
    if(completati.length)h+='<button class="btn-check-all" onclick="checkAllLista(false)">⬜ Deseleziona ('+completati.length+')</button>';
    h+='</div>';
    attivi.forEach(function(item){h+=renderListaItem(item);});
    if(completati.length){
      h+='<div class="lista-completati-sep">✅ Nel carrello ('+completati.length+')</div>';
      completati.forEach(function(item){h+=renderListaItem(item);});
    }
    h+='<div class="lista-actions">';
    if(completati.length)h+='<button class="btn-clear-done" onclick="clearListaCompletati()">🗑️ Elimina spuntati ('+completati.length+')</button>';
    h+='<button class="btn-svuota-lista" onclick="svuotaListaConfirm()">🗑️ Svuota tutto</button>';
    h+='</div>';
    if(_svuotaListaConfirm){
      h+='<div class="svuota-confirm"><span>Eliminare tutta la lista?</span>';
      h+='<button class="btn-yes" onclick="svuotaLista()">Sì</button>';
      h+='<button class="btn-no" onclick="_svuotaListaConfirm=false;renderLista()">No</button>';
      h+='</div>';
    }
  }
  h+='</div>'; // fine lista-card

  el.innerHTML=h;

  // Ripristina valori
  var qtyEl2=document.getElementById("lista-qty");
  var testoEl2=document.getElementById("lista-testo");
  if(qtyEl2&&qtyVal)qtyEl2.value=qtyVal;
  if(testoEl2&&testoVal)testoEl2.value=testoVal;
  if(notaFocused&&notaVal!==null){
    var nn=document.getElementById("note-textarea");
    if(nn){nn.value=notaVal;nn.focus();}
  }
}

// ── Lista Spesa — CRUD ───────────────────────────────────
async function addListaItem(){
  var qtyEl=document.getElementById("lista-qty");
  var testoEl=document.getElementById("lista-testo");
  var testo=testoEl?testoEl.value.trim():"";
  if(!testo){
    if(testoEl){testoEl.classList.add("invalid");setTimeout(function(){testoEl.classList.remove("invalid");},1200);}
    return;
  }
  var qty=qtyEl?qtyEl.value.trim():"";
  var item={id:Date.now().toString(),testo:testo,quantita:qty,completata:false,data:new Date().toISOString()};
  S.lista.push(item);
  if(qtyEl)qtyEl.value="";
  if(testoEl)testoEl.value="";
  vibra(30);
  renderLista();
  setTimeout(function(){var e=document.getElementById("lista-testo");if(e)e.focus();},60);
  dot("","Salvataggio…");
  try{
    await post({action:"addListaItem",id:item.id,testo:item.testo,quantita:item.quantita,data:item.data});
    dot("ok","Sincronizzata 🐾");
  }catch(e){
    dot("err","Errore salvataggio");
    S.lista=S.lista.filter(function(x){return x.id!==item.id;});
    renderLista();
  }
}

async function toggleListaItem(id){
  var item=S.lista.find(function(x){return x.id===id;});
  if(!item)return;
  item.completata=!item.completata;
  vibra(20);renderLista();dot("","Salvataggio…");
  try{
    await post({action:"toggleListaItem",id:id,completata:item.completata});
    dot("ok","Sincronizzata 🐾");
  }catch(e){
    dot("err","Errore");item.completata=!item.completata;renderLista();
  }
}

async function checkAllLista(completa){
  var backup=S.lista.map(function(x){return{id:x.id,completata:x.completata};});
  S.lista.forEach(function(item){item.completata=completa;});
  vibra(20);renderLista();dot("","Salvataggio…");
  try{
    await post({action:"checkAllListaItems",completata:completa});
    dot("ok","Sincronizzata 🐾");
  }catch(e){
    dot("err","Errore");
    backup.forEach(function(b){
      var item=S.lista.find(function(x){return x.id===b.id;});
      if(item)item.completata=b.completata;
    });
    renderLista();
  }
}

async function deleteListaItem(id){
  var backup=S.lista.slice();
  S.lista=S.lista.filter(function(x){return x.id!==id;});
  vibra(30);renderLista();dot("","Salvataggio…");
  try{
    await post({action:"deleteListaItem",id:id});
    dot("ok","Sincronizzata 🐾");
  }catch(e){
    dot("err","Errore eliminazione");S.lista=backup;renderLista();
  }
}

async function clearListaCompletati(){
  var backup=S.lista.slice();
  S.lista=S.lista.filter(function(x){return!x.completata;});
  vibra(30);renderLista();dot("","Salvataggio…");
  try{
    await post({action:"clearListaItems",soloCompletate:true});
    dot("ok","Sincronizzata 🐾");
  }catch(e){
    dot("err","Errore");S.lista=backup;renderLista();
  }
}

function svuotaListaConfirm(){_svuotaListaConfirm=true;renderLista();}

async function svuotaLista(){
  var backup=S.lista.slice();
  S.lista=[];_svuotaListaConfirm=false;
  vibra([30,50,30]);renderLista();dot("","Salvataggio…");
  try{
    await post({action:"clearListaItems",soloCompletate:false});
    dot("ok","Sincronizzata 🐾");
  }catch(e){
    dot("err","Errore");S.lista=backup;renderLista();
  }
}

// ── Note Condivise ───────────────────────────────────────
function onNotaInput(){
  var statusEl=document.getElementById("note-status");
  if(statusEl)statusEl.textContent="✏️ modificando…";
  clearTimeout(_notaTimer);
  _notaTimer=setTimeout(function(){
    var textarea=document.getElementById("note-textarea");
    if(!textarea)return;
    var testo=textarea.value;
    var autore=getIdentity();
    var dataNow=new Date().toISOString();
    S.nota={testo:testo,autore:autore,data:dataNow};
    if(statusEl)statusEl.textContent="💾 salvataggio…";
    post({action:"saveNota",testo:testo,autore:autore,data:dataNow})
      .then(function(){
        if(statusEl)statusEl.textContent="✓ salvato";
        var metaEl=document.querySelector('.note-meta');
        var autoreColor=autore==="Luca"?"var(--berry)":autore==="Ale"?"var(--moss)":"var(--text3)";
        var newMeta='Ultima modifica: <strong style="color:'+autoreColor+'">'+escapeHtml(autore)+'</strong> · '+fmtRelativo(dataNow);
        if(metaEl){
          metaEl.style.color=autoreColor;
          metaEl.innerHTML=newMeta;metaEl.title=fmtLong(dataNow);
        }else{
          var noteCard=document.querySelector('.note-card');
          if(noteCard){
            var d=document.createElement('div');d.className='note-meta';
            d.innerHTML=newMeta;d.title=fmtLong(dataNow);
            var hdr=noteCard.querySelector('.note-header');
            if(hdr)hdr.insertAdjacentElement('afterend',d);
          }
        }
        setTimeout(function(){if(statusEl)statusEl.textContent="";},2500);
      })
      .catch(function(){if(statusEl)statusEl.textContent="⚠️ errore";});
  },1500);
}

// ═══════════════════════════════════════════════════════════
// ── LISTA PULSE — notifica quando ci sono novità ──
// ═══════════════════════════════════════════════════════════
function getListaHash(){
  // Hash che cattura: n° voci totali, n° voci attive, timestamp ultima nota
  return S.lista.length+'|'+S.lista.filter(function(i){return!i.completata;}).length+'|'+(S.nota.data||'');
}
function checkListaPulse(){
  // Se l'utente è già sul tab lista, aggiorna l'hash e non pulsare
  if(currentTab==='lista'){_listaHash=getListaHash();return;}
  var h=getListaHash();
  if(_listaHash===null){_listaHash=h;return;}  // prima inizializzazione
  if(h!==_listaHash){
    var btn=document.querySelector('.tab-btn[data-tab="lista"]');
    if(btn)btn.classList.add('pulse');
  }
}
function clearListaPulse(){
  var btn=document.querySelector('.tab-btn[data-tab="lista"]');
  if(btn)btn.classList.remove('pulse');
  _listaHash=getListaHash();
}

// ═══════════════════════════════════════════════════════════
// ── SWIPE TRA TAB su mobile ──
// ═══════════════════════════════════════════════════════════
function initTabSwipe(){
  var el=document.querySelector('.main');
  if(!el)return;
  var sx=0,sy=0,st=0;
  el.addEventListener('touchstart',function(e){
    // Non intercettare su input, textarea, o select
    var tag=e.target.tagName;
    if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT')return;
    sx=e.touches[0].clientX;
    sy=e.touches[0].clientY;
    st=Date.now();
  },{passive:true});
  el.addEventListener('touchend',function(e){
    if(!sx)return;
    var dx=e.changedTouches[0].clientX-sx;
    var dy=Math.abs(e.changedTouches[0].clientY-sy);
    var dt=Date.now()-st;
    // Swipe valido: rapido (<350ms), abbastanza orizzontale (>70px), più orizzontale che verticale
    if(dt<350&&Math.abs(dx)>70&&dy<Math.abs(dx)*0.65){
      var idx=TABS_ORDER.indexOf(currentTab);
      if(dx<0&&idx<TABS_ORDER.length-1){vibra(15);switchTab(TABS_ORDER[idx+1]);}
      else if(dx>0&&idx>0){vibra(15);switchTab(TABS_ORDER[idx-1]);}
    }
    sx=0;
  },{passive:true});
}

// ── TAB BAR ──
var currentTab = "tana";

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll(".tab-page").forEach(function(p) {
    p.classList.toggle("active", p.dataset.tab === tab);
  });
  document.querySelectorAll(".tab-btn").forEach(function(b) {
    b.classList.toggle("active", b.dataset.tab === tab);
  });
  if(tab === "archivio") renderArchivioTab();
  if(tab === "fisso") { renderFisse(); renderRiepilogo(); if(fisseSegmento==="previste") renderPreviste(); }
  if(tab === "lista") { clearListaPulse(); renderLista(); }
  if(tab === "solo") { renderSolo(); }
  // Animazione di entrata: rigioca il fade+slide sulla tab appena aperta
  var main = document.querySelector(".main");
  if(main){
    main.classList.remove("tab-switching");
    void main.offsetWidth; // forza il reflow per re-triggerare l'animazione
    main.classList.add("tab-switching");
  }
}

// ── GUIDA DELLA TANA ──
// openGuida() apre la guida; openGuida("cassa") apre direttamente quella sezione.
function openGuida(sezione){
  var m=document.getElementById("modal-guida");
  m.classList.add("open");
  // Chiudo tutte le sezioni, poi apro quella richiesta
  m.querySelectorAll("details.guida-sez").forEach(function(d){d.open=false;});
  if(sezione){
    var sez=document.getElementById("guida-"+sezione);
    if(sez){
      sez.open=true;
      setTimeout(function(){sez.scrollIntoView({behavior:"smooth",block:"nearest"});},120);
    }
  }
}
function closeGuida(){document.getElementById("modal-guida").classList.remove("open");}

// ── BENVENUTO (slide al primo accesso) ──
var BENVENUTO_KEY="tana_benvenuto_visto";
var _bvSlides=[
  {icona:"bear",titolo:"Benvenuto nella Tana!",testo:"Questa è la tana digitale dove gli Orsi tengono i conti di casa: spese comuni, prestiti, lista della spesa. Tutto condiviso, tutto in tempo reale. Due minuti di tour?"},
  {icona:"🍯",titolo:"La cassa comune",testo:"Ogni spesa per la casa va registrata da chi l'ha pagata. L'app fa la bilancia: chi ha speso meno risulta in debito di miele verso la cassa comune. Il saldo si aggiorna da solo, sempre."},
  {icona:"🐾",titolo:"I debiti diretti",testo:"I prestiti personali (\"ti anticipo io i biglietti\") restano separati dalla cassa: si registrano a parte e si possono rimborsare anche un po' alla volta."},
  {icona:"🌙",titolo:"La chiusura del mese",testo:"A fine mese si chiude: lo storico finisce in archivio (con grafici e PDF), le spese si azzerano e il debito riparte da lì. Per tutto il resto c'è la guida ❓ in alto. Buona Tana!"}
];
var _bvIdx=0;

function avviaBenvenuto(){
  _bvIdx=0;
  bvMostra();
  document.getElementById("modal-benvenuto").classList.add("open");
}
function bvMostra(){
  var s=_bvSlides[_bvIdx];
  document.getElementById("bv-icona").innerHTML = s.icona==="bear"
  ? '<img src="./bear.svg" alt="Orso" style="width:2.5rem;height:2.5rem;">'
  : s.icona;
  document.getElementById("bv-titolo").textContent=s.titolo;
  document.getElementById("bv-testo").textContent=s.testo;
  // Pallini di avanzamento
  var dots="";
  for(var i=0;i<_bvSlides.length;i++) dots+=(i===_bvIdx?"●":"○");
  document.getElementById("bv-dots").textContent=dots;
  // Sull'ultima slide il bottone cambia
  var ultima=_bvIdx===_bvSlides.length-1;
  document.getElementById("bv-avanti").innerHTML=ultima
  ? 'Entra nella Tana <img src="./bear.svg" alt="" style="width:1rem;height:1rem;vertical-align:middle;">'
  : "Avanti 🐾";
  document.getElementById("bv-salta").style.visibility=ultima?"hidden":"visible";
}
function benvenutoAvanti(){
  if(_bvIdx<_bvSlides.length-1){_bvIdx++;bvMostra();}
  else chiudiBenvenuto();
}
function chiudiBenvenuto(){
  document.getElementById("modal-benvenuto").classList.remove("open");
  try{localStorage.setItem(BENVENUTO_KEY,"1");}catch(e){}
}
// Chiamata all'avvio: mostra il benvenuto solo se mai visto su questo dispositivo
function maybeBenvenuto(){
  if(!localStorage.getItem(BENVENUTO_KEY)) avviaBenvenuto();
}

// ── CALCOLATRICE (somma scontrini) ──
// Catena sequenziale di + e −, senza priorità: ogni operatore
// chiude il numero precedente. "✓" scrive il risultato nel campo
// importo da cui è stata aperta. Pensata per sommare al volo le
// spese di più banchi del mercato prima di registrarle.
var _calcTarget=null;   // id del campo importo da riempire
var _calcAcc=0;         // accumulatore dei numeri già confermati con un operatore
var _calcOp=null;       // operatore in attesa ("+" o "-"); null sul primo numero
var _calcCur="0";       // numero che si sta digitando (stringa)
var _calcFresh=true;    // true = il prossimo tasto cifra azzera _calcCur

function openCalc(targetId){
  _calcTarget=targetId;
  // Precarico l'eventuale valore già presente nel campo
  var v=document.getElementById(targetId).value;
  _calcAcc=0; _calcOp=null;
  _calcCur=(v && !isNaN(parseFloat(v))) ? String(parseFloat(v)) : "0";
  _calcFresh=true;
  calcRender();
  document.getElementById("modal-calc").classList.add("open");
}
function closeCalc(){document.getElementById("modal-calc").classList.remove("open");}

function calcDigit(d){
  if(_calcFresh){ _calcCur=(d==="."?"0.":d); _calcFresh=false; }
  else{
    if(d==="."){ if(_calcCur.indexOf(".")>-1) return; }   // una sola virgola
    if(_calcCur==="0" && d!==".") _calcCur=d;             // niente zeri iniziali
    else _calcCur+=d;
  }
  calcRender();
}
function calcBack(){
  if(_calcFresh) return;
  _calcCur=_calcCur.length>1 ? _calcCur.slice(0,-1) : "0";
  if(_calcCur==="" || _calcCur==="-") _calcCur="0";
  calcRender();
}
// Applica l'operatore in attesa al valore corrente, aggiornando l'accumulatore
function _calcApplica(){
  var n=parseFloat(_calcCur)||0;
  if(_calcOp===null) _calcAcc=n;
  else if(_calcOp==="+") _calcAcc=_calcAcc+n;
  else if(_calcOp==="-") _calcAcc=_calcAcc-n;
}
function calcOp(op){
  _calcApplica();
  _calcOp=op;
  _calcFresh=true;     // il prossimo numero parte pulito
  calcRender(true);
}
function calcClear(){
  _calcAcc=0; _calcOp=null; _calcCur="0"; _calcFresh=true;
  calcRender();
}
function calcConferma(){
  _calcApplica();
  var ris=Math.round(_calcAcc*100)/100;
  if(ris<0) ris=0;     // un importo negativo non ha senso nel campo spesa
  var campo=document.getElementById(_calcTarget);
  if(campo){
    campo.value=ris;
    // Risveglio l'anteprima/handler del campo, se ne ha uno
    campo.dispatchEvent(new Event("input"));
  }
  closeCalc();
}
function calcRender(mostraAcc){
  var expr=document.getElementById("calc-expr");
  var res=document.getElementById("calc-result");
  // Riga piccola in alto: accumulatore + operatore in attesa
  if(_calcOp!==null){
    expr.textContent=String(_calcAcc).replace(".",",")+" "+(_calcOp==="+"?"+":"−");
  } else {
    expr.innerHTML="&nbsp;";
  }
  // Riga grande: numero corrente (o accumulatore appena premuto un operatore)
  var grande = mostraAcc ? _calcAcc : _calcCur;
  res.textContent=String(grande).replace(".",",");
}
