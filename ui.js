// ════════════════════════════════════════════════════════
//  TANA DEGLI ORSI — ui.js
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
// ── SPESE FISSE (condivise via GAS) ──
function openNuovaFissa(id){
  editFissaId=id||null;
  var f=id?S.fisse.find(function(x){return x.id===id;}):null;
  document.getElementById("modal-fissa-titolo").textContent=f?"Modifica spesa fissa":"Nuova spesa fissa";
  document.getElementById("fissa-nome").value=f?f.nome:"";
  document.getElementById("fissa-imp").value=f?f.importo:"";
  document.getElementById("fissa-icona").value=f?f.icona:"🏠";
  document.getElementById("modal-fissa").classList.add("open");
  setTimeout(function(){document.getElementById("fissa-nome").focus();},80);
}
function closeNuovaFissa(){document.getElementById("modal-fissa").classList.remove("open");editFissaId=null;}

async function salvaFissa(){
  var nome=document.getElementById("fissa-nome").value.trim();
  var imp=parseFloat(document.getElementById("fissa-imp").value);
  var icona=document.getElementById("fissa-icona").value;
  if(!nome||!imp||imp<=0)return;
  closeNuovaFissa();

  if(editFissaId){
    var f=S.fisse.find(function(x){return x.id===editFissaId;});
    if(!f)return;
    var backup={nome:f.nome,importo:f.importo,icona:f.icona};
    f.nome=nome;f.importo=imp;f.icona=icona;
    renderFisse();renderRiepilogo();dot("","Salvataggio...");
    try{
      await post({action:"editFissa",id:editFissaId,nome:nome,importo:imp,icona:icona});
      dot("ok","Sincronizzata 🐾");
    }catch(e){
      dot("err","Errore salvataggio");
      f.nome=backup.nome;f.importo=backup.importo;f.icona=backup.icona;
      renderFisse();renderRiepilogo();
    }
  }else{
    var newId=Date.now().toString();
    var nuova={id:newId,nome:nome,importo:imp,icona:icona,data:new Date().toISOString()};
    S.fisse.push(nuova);
    renderFisse();renderRiepilogo();dot("","Salvataggio...");
    try{
      await post({action:"addFissa",id:nuova.id,nome:nuova.nome,importo:nuova.importo,icona:nuova.icona,data:nuova.data});
      dot("ok","Sincronizzata 🐾");
    }catch(e){
      dot("err","Errore salvataggio");
      S.fisse=S.fisse.filter(function(x){return x.id!==newId;});
      renderFisse();renderRiepilogo();
    }
  }
}

function toggleDelFissa(id){
  delFissaConfirmId = delFissaConfirmId===id ? null : id;
  renderFisse();
}
async function eliminaFissa(id){
  vibra([25,40,25]);
  delFissaConfirmId=null;
  var backup=S.fisse.slice();
  S.fisse=S.fisse.filter(function(x){return x.id!==id;});
  renderFisse();renderRiepilogo();dot("","Salvataggio...");
  try{
    await post({action:"deleteFissa",id:id});
    dot("ok","Sincronizzata 🐾");
  }catch(e){
    dot("err","Errore eliminazione");
    S.fisse=backup;
    renderFisse();renderRiepilogo();
  }
}

function renderFisse(){
  var el=document.getElementById("fisse-list");
  if(!S.fisse.length){
    el.innerHTML='<div class="fisse-empty">'+statoVuoto("fisse","4rem")+'</div>';
    return;
  }
  var tot=S.fisse.reduce(function(a,f){return a+f.importo;},0);
  var h="";
  S.fisse.forEach(function(f){
    h+='<div class="fissa-item">';
    h+='<span class="fissa-icon">'+f.icona+'</span>';
    h+='<div class="fissa-body"><div class="fissa-nome">'+escapeHtml(f.nome)+'</div><div class="fissa-freq">mensile</div></div>';
    h+='<div class="fissa-imp">'+eur(f.importo)+'</div>';
    h+='<button class="btn-edit-fissa" onclick="openNuovaFissa(\''+f.id+'\')" title="Modifica">✏️</button>';
    h+='<button class="btn-del-fissa" onclick="toggleDelFissa(\''+f.id+'\')" title="Elimina">×</button>';
    if(delFissaConfirmId===f.id){
      h+='<div class="elimina-arch-confirm"><span>Eliminare "'+escapeHtml(f.nome)+'"?</span><button class="btn-yes" onclick="eliminaFissa(\''+f.id+'\')">Sì</button><button class="btn-no" onclick="toggleDelFissa(\''+f.id+'\')">No</button></div>';
    }
    h+='</div>';
  });
  h+='<div class="fisse-totale"><span>Totale fisso mensile</span><strong>'+eur(tot)+'</strong></div>';
  el.innerHTML=h;
}

// ═══════════════════════════════════════════════════════════
// ── SPESE PREVISTE ──
// ═══════════════════════════════════════════════════════════

// Toggle tra "Ricorrenti" e "Previste" nella tab Fisse
function switchFisseSeg(seg){
  fisseSegmento=seg;
  document.querySelectorAll(".fisse-toggle-btn").forEach(function(b){
    b.classList.toggle("active", b.dataset.seg===seg);
  });
  document.getElementById("seg-ricorrenti").style.display = seg==="ricorrenti"?"":"none";
  document.getElementById("seg-previste").style.display   = seg==="previste"?"":"none";
  if(seg==="previste") renderPreviste();
  else { renderFisse(); renderRiepilogo(); }
}

// Estrae "YYYY-MM-DD" da qualsiasi formato data, per i campi <input type=date>
function isoDateInput(scad){
  if(!scad) return "";
  var m=String(scad).match(/^(\d{4}-\d{2}-\d{2})/);
  return m?m[1]:"";
}
// Normalizza la scadenza in un oggetto Date a mezzanotte locale.
// Gestisce sia "2026-07-30" (date input) sia "2026-07-30T22:00:00.000Z"
// (ISO completo che arriva dal foglio Google).
function parseScadenza(scad){
  if(!scad) return null;
  var s=String(scad);
  // Prendo solo la parte data YYYY-MM-DD, ignorando l'eventuale ora/T/Z
  var m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(!m) return null;
  var d=new Date(parseInt(m[1]),parseInt(m[2])-1,parseInt(m[3]));
  return isNaN(d)?null:d;
}
// Data leggibile: "30 luglio 2026"
function fmtScadenza(scad){
  var d=parseScadenza(scad);
  if(!d) return "Senza scadenza";
  return d.toLocaleDateString("it-IT",{day:"numeric",month:"long",year:"numeric"});
}
// Giorni mancanti alla scadenza (negativo = scaduta). Mezzanotte-based.
function giorniAScadenza(scad){
  var d=parseScadenza(scad);
  if(!d) return null;
  var oggi=new Date(); oggi.setHours(0,0,0,0);
  return Math.round((d-oggi)/86400000);
}
// Classe colore badge in base alla scadenza
function classeScadenza(g){
  if(g===null) return "scad-lontana";
  if(g<0)  return "scad-scaduta";
  if(g===0)return "scad-oggi";
  if(g<=7) return "scad-vicina";
  return "scad-lontana";
}
// Testo leggibile della scadenza
function testoScadenza(g){
  if(g===null) return "";
  if(g<0)  return "Scaduta da "+Math.abs(g)+(Math.abs(g)===1?" giorno":" giorni");
  if(g===0)return "Scade oggi!";
  if(g===1)return "Scade domani";
  return "Tra "+g+" giorni";
}

function renderPreviste(){
  var el=document.getElementById("previste-list");
  if(!el) return;
  aggiornaPulsePreviste();
  // Banner scadenze: mostro in cima se ci sono previste scadute o in scadenza oggi
  var bannerHtml="";
  var scadute=previsteScadute();
  if(scadute.length){
    var nomi=scadute.map(function(p){return escapeHtml(p.nome);}).join(", ");
    bannerHtml='<div class="previste-banner">⏰ <strong>'+(scadute.length===1?"1 spesa scaduta o in scadenza oggi":scadute.length+" spese scadute o in scadenza oggi")+'</strong><br>'+nomi+'</div>';
  }
  // Previste pagate col bancomat (in attesa di chiusura mese)
  var bancomat=(S.previste||[]).filter(function(p){return p.stato==="pagata_bancomat";});
  // Blocco "pagate bancomat" da mostrare in fondo
  var bancomatHtml="";
  if(bancomat.length){
    var totB=bancomat.reduce(function(a,p){return a+p.importo;},0);
    bancomatHtml='<div class="bancomat-section">';
    bancomatHtml+='<div class="bancomat-head">💳 Pagate col Conto Comune BPM · in attesa di chiusura</div>';
    bancomat.forEach(function(p){
      bancomatHtml+='<div class="prevista-item bancomat-item">';
      bancomatHtml+='<div class="prevista-body"><div class="prevista-nome">✓ '+escapeHtml(p.nome)+'</div>';
      bancomatHtml+='<div class="prevista-scad-badge">'+fmtScadenza(p.scadenza)+'</div></div>';
      bancomatHtml+='<div class="prevista-imp">'+eur(p.importo)+'</div>';
      bancomatHtml+='<div class="prevista-actions"><button class="btn-annulla-bancomat" onclick="annullaPagamentoBancomat(\''+p.id+'\')" title="Annulla pagamento">↩️ Annulla</button></div>';
      bancomatHtml+='</div>';
    });
    bancomatHtml+='<div class="bancomat-tot">Totale Conto Comune BPM: <strong>'+eur(totB)+'</strong> — confluirà nelle fisse a fine mese</div>';
    bancomatHtml+='</div>';
  }
  // Mostro le previste ancora "attive"
  var attive=(S.previste||[]).filter(function(p){return p.stato==="attiva";});
  if(!attive.length){
    el.innerHTML=bannerHtml+(bancomat.length?"":'<div class="previste-empty">'+statoVuoto("previste","4rem")+'</div>')+bancomatHtml;
    return;
  }
  // Ordino per scadenza crescente (le senza data in fondo)
  attive.sort(function(a,b){
    if(!a.scadenza) return 1;
    if(!b.scadenza) return -1;
    return a.scadenza<b.scadenza?-1:1;
  });
  var h="";
  attive.forEach(function(p){
    var g=giorniAScadenza(p.scadenza);
    var cls=classeScadenza(g);
    h+='<div class="prevista-item '+cls+'">';
    h+='<div class="prevista-body">';
    h+='<div class="prevista-nome">'+escapeHtml(p.nome)+'</div>';
    h+='<div class="prevista-scad-badge '+cls+'">'+fmtScadenza(p.scadenza)+(g!==null?' · '+testoScadenza(g):"")+'</div>';
    h+='</div>';
    h+='<div class="prevista-imp">'+eur(p.importo)+'</div>';
    h+='<div class="prevista-actions">';
    h+='<button class="btn-paga-prevista" onclick="openPagaPrevista(\''+p.id+'\')" title="Segna pagata">✓ Paga</button>';
    h+='<button class="btn-edit-fissa" onclick="openNuovaPrevista(\''+p.id+'\')" title="Modifica">✏️</button>';
    h+='<button class="btn-del-fissa" onclick="toggleDelPrevista(\''+p.id+'\')" title="Elimina">×</button>';
    h+='</div>';
    if(delPrevistaConfirmId===p.id){
      h+='<div class="elimina-arch-confirm"><span>Eliminare "'+escapeHtml(p.nome)+'"?</span><button class="btn-yes" onclick="eliminaPrevista(\''+p.id+'\')">Sì</button><button class="btn-no" onclick="toggleDelPrevista(\''+p.id+'\')">No</button></div>';
    }
    h+='</div>';
  });
  el.innerHTML=bannerHtml+h+bancomatHtml;
}

// Annulla un pagamento col bancomat: riporta la prevista a "attiva"
async function annullaPagamentoBancomat(id){
  var p=S.previste.find(function(x){return x.id===id;});
  if(!p)return;
  vibra(20);
  p.stato="attiva";
  renderPreviste();dot("","Salvataggio...");
  try{
    await post({action:"setStatoPrevista",id:id,stato:"attiva"});
    dot("ok","Sincronizzata 🐾");
  }catch(e){ dot("err","Errore — riprova"); p.stato="pagata_bancomat"; renderPreviste(); }
}
function openNuovaPrevista(id){
  editPrevistaId=id||null;
  var p=id?S.previste.find(function(x){return x.id===id;}):null;
  document.getElementById("modal-prevista-titolo").textContent=p?"Modifica spesa prevista":"Nuova spesa prevista";
  document.getElementById("prevista-nome").value=p?p.nome:"";
  document.getElementById("prevista-imp").value=p?p.importo:"";
  // Il campo <input type=date> accetta SOLO "YYYY-MM-DD": normalizzo
  // (la scadenza dal server può essere un ISO completo con ora/Z).
  document.getElementById("prevista-scad").value=p?isoDateInput(p.scadenza):"";
  document.getElementById("modal-prevista").classList.add("open");
  setTimeout(function(){document.getElementById("prevista-nome").focus();},80);
}
function closeNuovaPrevista(){document.getElementById("modal-prevista").classList.remove("open");editPrevistaId=null;}

async function salvaPrevista(){
  var nome=document.getElementById("prevista-nome").value.trim();
  var imp=parseFloat(document.getElementById("prevista-imp").value);
  var scad=document.getElementById("prevista-scad").value;
  if(!nome||!imp||imp<=0)return;
  vibra(20);
  closeNuovaPrevista();

  if(editPrevistaId){
    var p=S.previste.find(function(x){return x.id===editPrevistaId;});
    if(!p)return;
    var backup={nome:p.nome,importo:p.importo,scadenza:p.scadenza};
    p.nome=nome;p.importo=imp;p.scadenza=scad;
    renderPreviste();dot("","Salvataggio...");
    try{
      await post({action:"editPrevista",id:editPrevistaId,nome:nome,importo:imp,scadenza:scad});
      dot("ok","Sincronizzata 🐾");
    }catch(e){
      dot("err","Errore salvataggio");
      p.nome=backup.nome;p.importo=backup.importo;p.scadenza=backup.scadenza;
      renderPreviste();
    }
  }else{
    var newId=Date.now().toString();
    var nuova={id:newId,nome:nome,importo:imp,scadenza:scad,stato:"attiva",data:new Date().toISOString()};
    S.previste.push(nuova);
    renderPreviste();dot("","Salvataggio...");
    aggiornaPulsePreviste();
    try{
      await post({action:"addPrevista",id:nuova.id,nome:nuova.nome,importo:nuova.importo,scadenza:nuova.scadenza,stato:"attiva",data:nuova.data});
      dot("ok","Sincronizzata 🐾");
    }catch(e){
      dot("err","Errore salvataggio");
      S.previste=S.previste.filter(function(x){return x.id!==newId;});
      renderPreviste();
    }
  }
}

// Toggle della conferma inline
function toggleDelPrevista(id){
  delPrevistaConfirmId = delPrevistaConfirmId===id ? null : id;
  renderPreviste();
}
// Esegue l'eliminazione (dopo conferma inline)
async function eliminaPrevista(id){
  vibra([25,40,25]);
  delPrevistaConfirmId=null;
  var backup=S.previste.slice();
  S.previste=S.previste.filter(function(x){return x.id!==id;});
  renderPreviste();dot("","Salvataggio...");
  aggiornaPulsePreviste();
  try{
    await post({action:"deletePrevista",id:id});
    dot("ok","Sincronizzata 🐾");
  }catch(e){
    dot("err","Errore eliminazione");
    S.previste=backup;
    renderPreviste();
  }
}

// ── Segna pagata ──
function openPagaPrevista(id){
  pagaPrevistaId=id;
  var p=S.previste.find(function(x){return x.id===id;});
  var desc=document.getElementById("paga-prevista-desc");
  if(p&&desc) desc.textContent='"'+p.nome+'" — '+eur(p.importo)+". Chi l'ha pagata?";
  document.getElementById("modal-paga-prevista").classList.add("open");
}
function closePagaPrevista(){document.getElementById("modal-paga-prevista").classList.remove("open");pagaPrevistaId=null;}

// modo: "Luca" | "Ale" | "bancomat"
async function pagaPrevista(modo){
  var id=pagaPrevistaId;
  var p=S.previste.find(function(x){return x.id===id;});
  if(!p){closePagaPrevista();return;}
  vibra(30);
  closePagaPrevista();

  if(modo==="Luca"||modo==="Ale"){
    // Diventa una transazione normale nella cassa comune
    var t={id:Date.now().toString(),chi:modo,importo:p.importo,nota:p.nome+" (prevista)",data:new Date().toISOString()};
    S.txs.push(t);
    // Rimuovo la prevista
    S.previste=S.previste.filter(function(x){return x.id!==id;});
    render();renderPreviste();dot("","Salvataggio...");
    aggiornaPulsePreviste();
    try{
      await post({action:"addTransaction",id:t.id,chi:t.chi,importo:t.importo,nota:t.nota,data:t.data});
      await post({action:"deletePrevista",id:id});
      dot("ok","Sincronizzata 🐾");
    }catch(e){ dot("err","Errore — riprova"); }
  } else {
    // Bancomat condiviso: la prevista resta ma cambia stato, confluirà
    // nello snapshot fisse alla chiusura del mese.
    p.stato="pagata_bancomat";
    renderPreviste();dot("","Salvataggio...");
    aggiornaPulsePreviste();
    try{
      await post({action:"setStatoPrevista",id:id,stato:"pagata_bancomat"});
      dot("ok","Sincronizzata 🐾");
    }catch(e){ dot("err","Errore — riprova"); p.stato="attiva"; renderPreviste(); }
  }
}

// ── Pulse sull'icona tab Fisse + banner se c'è una scadenza oggi/passata ──
function previsteScadute(){
  return (S.previste||[]).filter(function(p){
    if(p.stato!=="attiva") return false;
    var g=giorniAScadenza(p.scadenza);
    return g!==null && g<=0;
  });
}
function aggiornaPulsePreviste(){
  var scadute=previsteScadute();
  var btn=document.querySelector('.tab-btn[data-tab="fisso"]');
  if(btn) btn.classList.toggle("pulse", scadute.length>0);
}

function renderRiepilogo(){
  var totComuni=S.txs.reduce(function(a,t){return a+t.importo;},0);
  var totFisse=S.fisse.reduce(function(a,f){return a+f.importo;},0);
  var totale=totComuni+totFisse;
  document.getElementById("riepilogo-comuni").textContent=eur(totComuni);
  document.getElementById("riepilogo-fisse").textContent=eur(totFisse);
  document.getElementById("riepilogo-totale").textContent=eur(totale);
  document.getElementById("riepilogo-pro-capite").textContent=totale>0?"~"+eur(totale/2)+" a testa":"";
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
  var hashAttuale=await sha256(attuale);
  if(hashAttuale!==getCurrentHash()){errEl.textContent="Password attuale errata.";return;}
  var hashNuova=await sha256(nuova);
  var btn=document.getElementById("btn-conferma-pw");
  btn.disabled=true;btn.textContent="Salvataggio...";
  try{
    var esito=await post({action:"changePassword",oldHash:hashAttuale,newHash:hashNuova});
    if(esito&&esito.trim()==="unauthorized"){
      errEl.textContent="Password attuale errata.";
      btn.disabled=false;btn.textContent="🔑 Cambia password";
      return;
    }
    localStorage.setItem(HASH_KEY,hashNuova);
    // Il server ha invalidato tutti i token: ne registro subito uno nuovo
    // con la nuova password, così resto loggato senza essere buttato fuori.
    var nuovoToken=genToken();setSession(nuovoToken);
    await post({action:"setToken",token:nuovoToken,hash:hashNuova});
    closeCambioPassword();
    alert("✅ Password cambiata con successo!");
  }catch(e){
    errEl.textContent="Errore di rete. Riprova.";
  }finally{
    btn.disabled=false;btn.textContent="🔑 Cambia password";
  }
}

function startEditSaldo(){editSaldo=true;render();setTimeout(function(){var el=document.getElementById("inp-si");if(el)el.focus();},40);}
function cancelEditSaldo(){editSaldo=false;render();}
async function confirmEditSaldo(){
  var v=parseFloat((document.getElementById("inp-si")||{}).value);
  if(isNaN(v)){cancelEditSaldo();return;}
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

// ── DEBITI DIRETTI (UI OTTIMISTICA) ──
function openNuovoDebito(){
  document.getElementById("debito-prestatore").value="Luca";
  document.getElementById("debito-importo").value="";
  document.getElementById("debito-nota").value="";
  document.getElementById("modal-debito").classList.add("open");
  setTimeout(function(){document.getElementById("debito-importo").focus();},100);
}
function closeNuovoDebito(){document.getElementById("modal-debito").classList.remove("open");}

// ── MODIFICA DEBITO ──
function openEditDebito(id){
  var d=S.debiti.find(function(x){return x.id===id;});
  if(!d)return;
  editDebitoId=id;
  document.getElementById("ed-prestatore").value=d.prestatore;
  document.getElementById("ed-importo").value=d.importoOriginale;
  document.getElementById("ed-nota").value=d.nota||"";
  var dt=d.data?new Date(d.data):new Date();
  document.getElementById("ed-data").value=isNaN(dt)?"":dt.toISOString().slice(0,10);
  document.getElementById("modal-edit-debito").classList.add("open");
  setTimeout(function(){document.getElementById("ed-importo").focus();},80);
}
function closeEditDebito(){document.getElementById("modal-edit-debito").classList.remove("open");editDebitoId=null;}
async function saveEditDebito(){
  if(!editDebitoId)return;
  var did=editDebitoId;
  var d=S.debiti.find(function(x){return x.id===did;});
  if(!d)return;
  var imp=parseFloat(document.getElementById("ed-importo").value);
  if(!imp||imp<=0)return;
  var prestatore=document.getElementById("ed-prestatore").value;
  var debitore=prestatore==="Luca"?"Ale":"Luca";
  var nota=document.getElementById("ed-nota").value.trim();
  var ds=document.getElementById("ed-data").value;
  var dataISO=ds?new Date(ds+"T12:00:00").toISOString():d.data;
  var backup={prestatore:d.prestatore,debitore:d.debitore,importoOriginale:d.importoOriginale,nota:d.nota,data:d.data};
  // Aggiorna importoResiduo proporzionalmente se l'importo originale cambia
  var ratio=d.importoOriginale>0?d.importoResiduo/d.importoOriginale:1;
  d.prestatore=prestatore;d.debitore=debitore;d.importoOriginale=imp;
  d.importoResiduo=Math.min(imp,Math.round(imp*ratio*100)/100);
  d.nota=nota;d.data=dataISO;
  closeEditDebito();render();dot("","Salvataggio...");
  try{
    await post({action:"editDebito",id:did,prestatore:prestatore,debitore:debitore,importoOriginale:imp,importoResiduo:d.importoResiduo,nota:nota,data:dataISO});
    dot("ok","Sincronizzata \uD83D\uDC3E");
  }catch(e){
    dot("err","Errore salvataggio");
    d.prestatore=backup.prestatore;d.debitore=backup.debitore;d.importoOriginale=backup.importoOriginale;d.nota=backup.nota;d.data=backup.data;
    render();
  }
}

async function aggiungiDebito(){
  var prestatore=document.getElementById("debito-prestatore").value;
  var debitore=prestatore==="Luca"?"Ale":"Luca";
  var importo=parseFloat(document.getElementById("debito-importo").value);
  if(!importo||importo<=0){document.getElementById("debito-importo").focus();return;}
  var nota=document.getElementById("debito-nota").value.trim();
  var d={id:Date.now().toString(),prestatore:prestatore,debitore:debitore,importoOriginale:importo,importoResiduo:importo,nota:nota,data:new Date().toISOString(),rimborsi:[]};
  
  S.debiti.unshift(d);
  closeNuovoDebito();rimborsoOpenId=null;delDebitoConfirmId=null;
  render(); 
  dot("","Salvataggio...");
  
  try{
    await post({action:"addDebito",id:d.id,prestatore:d.prestatore,debitore:d.debitore,importoOriginale:d.importoOriginale,importoResiduo:d.importoResiduo,nota:d.nota,data:d.data,rimborsi:JSON.stringify(d.rimborsi)});
    dot("ok","Sincronizzata \uD83D\uDC3E");
  } catch(e){
    dot("err","Errore salvataggio");
    S.debiti = S.debiti.filter(function(x){return x.id !== d.id;});
    render();
  }
}

function toggleRimborso(id){
  rimborsoOpenId=rimborsoOpenId===id?null:id;
  delDebitoConfirmId=null;
  render();
  if(rimborsoOpenId===id){setTimeout(function(){var el=document.getElementById("inp-rimborso-"+id);if(el){el.focus();el.select();}},40);}
}

async function applicaRimborso(id){
  var d=S.debiti.find(function(x){return x.id===id;});if(!d)return;
  var el=document.getElementById("inp-rimborso-"+id);if(!el)return;
  var v=parseFloat(el.value);
  if(!v||v<=0)return;
  
  var backupResiduo = d.importoResiduo;
  var importoEffettivo = Math.min(d.importoResiduo, v);
  d.importoResiduo=Math.max(0,Math.round((d.importoResiduo-importoEffettivo)*100)/100);
  
  var nuovoRimborso = { data: new Date().toISOString(), importo: importoEffettivo };
  if(!d.rimborsi) d.rimborsi = [];
  d.rimborsi.unshift(nuovoRimborso); 

  rimborsoOpenId=null;render();dot("","Salvataggio...");
  
  try{
    await post({action:"updateDebito",id:id,importoResiduo:d.importoResiduo,rimborsi:JSON.stringify(d.rimborsi)});
    dot("ok","Sincronizzata \uD83D\uDC3E");
  } catch(e){
    dot("err","Errore salvataggio");
    d.importoResiduo = backupResiduo;
    d.rimborsi.shift(); 
    render();
  }
}

function toggleDelDebito(id){
  delDebitoConfirmId=delDebitoConfirmId===id?null:id;
  rimborsoOpenId=null;render();
}

async function eliminaDebito(id){
  vibra([25,40,25]);
  var backup = S.debiti.slice();
  S.debiti=S.debiti.filter(function(x){return x.id!==id;});
  delDebitoConfirmId=null;
  render(); 
  dot("","Salvataggio...");
  
  try{
    await post({action:"deleteDebito",id:id});
    dot("ok","Sincronizzata \uD83D\uDC3E");
  } catch(e){
    dot("err","Errore eliminazione");
    S.debiti = backup;
    render();
  }
}

// ── MODALE STORICO RIMBORSI ──
function openStoricoRimborsi(id){
  var d=S.debiti.find(function(x){return x.id===id;});if(!d)return;
  var body=document.getElementById("modal-rimborsi-body");
  renderListaRimborsi(id);
  document.getElementById("modal-storico-rimborsi").classList.add("open");
}

function renderListaRimborsi(id){
  var d=S.debiti.find(function(x){return x.id===id;});if(!d)return;
  var body=document.getElementById("modal-rimborsi-body");
  if(!d.rimborsi||d.rimborsi.length===0){
    body.innerHTML='<div style="text-align:center;color:var(--text3);padding:24px;font-size:14px;font-family:\'Nunito\',sans-serif;font-weight:600;">'+fraseVuoto("rimborsi")+'</div>';
    return;
  }
  var h="";
  d.rimborsi.forEach(function(r,i){
    h+='<div class="r-item">';
    h+='<span>📅 '+fmtLong(r.data)+'</span>';
    h+='<strong>'+eur(r.importo)+'</strong>';
    h+='<button onclick="eliminaRimborso(\''+id+'\','+i+')" style="background:var(--berry-bg);border:1.5px solid var(--berry-brd);border-radius:8px;color:var(--berry);cursor:pointer;font-size:13px;padding:3px 8px;margin-left:8px;-webkit-appearance:none;">🗑️</button>';
    h+='</div>';
  });
  body.innerHTML=h;
}
async function eliminaRimborso(debitoId, index){
  var d=S.debiti.find(function(x){return x.id===debitoId;});if(!d)return;
  if(!confirm('Eliminare questo rimborso di '+eur(d.rimborsi[index].importo)+'?'))return;
  var backupRimborsi=d.rimborsi.slice();
  var backupResiduo=d.importoResiduo;
  // Rimuovi il rimborso e ricalcola il residuo
  d.rimborsi.splice(index,1);
  var totRimborsato=d.rimborsi.reduce(function(a,r){return a+r.importo;},0);
  d.importoResiduo=Math.max(0,Math.round((d.importoOriginale-totRimborsato)*100)/100);
  renderListaRimborsi(debitoId);
  render();
  dot("","Salvataggio...");
  try{
    await post({action:"updateDebito",id:debitoId,importoResiduo:d.importoResiduo,rimborsi:JSON.stringify(d.rimborsi)});
    dot("ok","Sincronizzata 🐾");
  }catch(e){
    dot("err","Errore salvataggio");
    d.rimborsi=backupRimborsi;
    d.importoResiduo=backupResiduo;
    renderListaRimborsi(debitoId);
    render();
  }
    }
  
function closeStoricoRimborsi(){
  document.getElementById("modal-storico-rimborsi").classList.remove("open");
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
  var totMeseChiusura=S.txs.reduce(function(a,t){return a+t.importo;},0);
  // Snapshot delle spese fisse al momento della chiusura
  var fisseSnapshot=S.fisse.map(function(f){return{id:f.id,nome:f.nome,importo:f.importo,icona:f.icona};});
  // Aggiungo le spese previste pagate col bancomat comune in questo mese:
  // confluiscono nello snapshot come voci una-tantum.
  var previsteBancomat=(S.previste||[]).filter(function(p){return p.stato==="pagata_bancomat";});
  previsteBancomat.forEach(function(p){
    fisseSnapshot.push({id:p.id,nome:p.nome+" (prevista)",importo:p.importo,icona:"📅"});
  });
var now=new Date();
var dataLocale=new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString();
var chiusura={id:Date.now().toString(),mese:mese,saldo:nuovoSaldo,data:dataLocale,saldoIniziale:S.saldoIniziale,txs:S.txs.slice(),totale:totMeseChiusura,fisseSnapshot:fisseSnapshot};
  closeChiudi();
  
  var backupTxs = S.txs.slice();
  var backupSaldo = S.saldoIniziale;
  
  vibra([30,50,30]);
S.chiusure.unshift(chiusura);S.saldoIniziale=nuovoSaldo;S.txs=[];
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
    dot("ok","Mese chiuso \uD83C\uDF19");
  } catch(e){
    dot("err","Errore chiusura");
    S.chiusure.shift(); S.txs = backupTxs; S.saldoIniziale = backupSaldo;
    render();
  }
}

// ── STORICO MESE ARCHIVIATO ──
function openStoricoMese(id){
  var c=S.chiusure.find(function(x){return x.id===id;});if(!c)return;
  document.getElementById("modal-storico-titolo").textContent="\uD83D\uDCE6 "+c.mese;
  document.getElementById("modal-storico-sub").textContent=c.txs.length+" voci \u00b7 chiuso il "+fmtLong(c.data);
  var h="";
  if(!c.txs.length){h='<div style="text-align:center;color:var(--text3);padding:20px;font-size:14px;">'+fraseVuoto("mese")+'</div>';}
  else{
    var run=c.saldoIniziale;
    h+='<div class="row-start"><span>\uD83C\uDF32 Debito di partenza</span><strong>'+c.saldoIniziale+' &euro;</strong></div>';
    c.txs.forEach(function(t){
      run=t.chi==="Luca"?run+t.importo:run-t.importo;
      var isL=t.chi==="Luca";
      var ac=run>0?"ac":run<0?"lc":"pc";
      var al=run>0?"ale <img src='./bear.svg' style='width:0.625rem;height:0.625rem;'>":run<0?"luca <img src='./bear.svg' style='width:0.625rem;height:0.625rem;'>":"pari \uD83C\uDF6F";
      h+='<div class="tx '+(isL?"luca":"ale")+'"><div class="tx-ava '+(isL?"l":"a")+'"><img src="./bear.svg" style="width:1.25rem;height:1.25rem;"></div><div class="tx-body"><div class="tx-nota">'+escapeHtml(t.nota||(isL?"Spesa Luca":"Spesa Ale"))+'</div><div class="tx-sub"><span class="tx-date">'+fmt(t.data)+'</span><span class="tx-who '+(isL?"l":"a")+'">'+t.chi+'</span></div></div><div class="tx-nums"><div class="tx-imp '+(isL?"l":"a")+'">'+eurInt(t.importo)+'</div><div class="tx-after '+ac+'">&rarr; '+eurInt(run)+' '+al+'</div></div></div>';
    });
    var fcol=c.saldo>0?"var(--berry)":c.saldo<0?"var(--moss)":"var(--moss)";
    h+='<div class="row-start" style="margin-top:8px;"><span>\uD83C\uDFC1 Debito finale</span><strong style="color:'+fcol+'">'+eurInt(c.saldo)+'</strong></div>';
    // Snapshot spese fisse
    if(c.fisseSnapshot && c.fisseSnapshot.length){
      var totF=c.fisseSnapshot.reduce(function(a,f){return a+f.importo;},0);
      h+='<div class="fisse-snapshot">';
      h+='<div class="fisse-snapshot-title">📌 Spese fisse del mese</div>';
      c.fisseSnapshot.forEach(function(f){
        h+='<div class="fisse-snapshot-row"><span>'+f.icona+' '+escapeHtml(f.nome)+'</span><span>'+eur(f.importo)+'</span></div>';
      });
      h+='<div class="fisse-snapshot-tot"><span>Totale fisse</span><span>'+eur(totF)+'</span></div>';
      h+='<div class="fisse-snapshot-tot" style="color:var(--text2);font-size:12px;"><span>Totale reale mese</span><span>'+eur(c.totale+totF)+'</span></div>';
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
  
  S.saldoIniziale=c.saldoIniziale;S.txs=c.txs.slice();
  S.chiusure=S.chiusure.filter(function(x){return x.id!==c.id;});
  render();
  dot("","Ripristino...");
  
  try{
    await post({action:"ripristina",chiusuraId:c.id,saldoIniziale:c.saldoIniziale,txs:c.txs});
    dot("ok","Ripristinato \uD83D\uDD04");
  } catch(e){
    dot("err","Errore ripristino");
    S.saldoIniziale = backupSaldo; S.txs = backupTxs; S.chiusure = backupChiusure;
    render();
  }
}

function toggleEliminaConfirm(id){eliminaConfirmId=eliminaConfirmId===id?null:id;render();}
async function eliminaArchiviazione(id){
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
function renderDebiti(){
  var el=document.getElementById("debiti-list");
  var attivi=S.debiti.filter(function(d){return d.importoResiduo>0.005;});
  var saldati=S.debiti.filter(function(d){return d.importoResiduo<=0.005;});
  var tutti=attivi.concat(saldati);
  if(!tutti.length){
    el.innerHTML='<div class="debiti-empty">'+statoVuoto("debiti","4rem")+'</div>';
    return;
  }
  var h="";
  tutti.forEach(function(d){
    var saldato=d.importoResiduo<=0.005;
    var perc=saldato?100:Math.round((d.importoOriginale-d.importoResiduo)/d.importoOriginale*100);
    var debitoreE=d.debitore==="Ale"?"ale-deve":"luca-deve";
    var badgeTxt=saldato?"&#x2705; Saldato":d.debitore+" deve a "+d.prestatore;
    
    var infoRimborso="";
    if(d.rimborsi && d.rimborsi.length > 0){
      var ultR = d.rimborsi[0]; 
      infoRimborso='<div style="font-size:11px; color:var(--purple); font-weight:700; margin-top:2px; font-family:\'Nunito\',sans-serif;">💸 Ultimo rimborso: ' + eur(ultR.importo) + ' il ' + fmt(ultR.data) + '</div>';
    }

    h+='<div class="debito-item">';
    h+='<div class="debito-top"><div class="debito-ava"><img src="./bear.svg" style="width:1.625rem; height:1.625rem;"></div>';
    h+='<div class="debito-info"><div class="debito-nota">'+escapeHtml(d.nota||(d.prestatore+" \u2192 "+d.debitore))+'</div>';
    h+='<div class="debito-meta">'+(d.prestatore+" presta a "+d.debitore)+" &middot; "+fmt(d.data)+'</div>';
    h+=infoRimborso; 
    h+='</div>';
    h+='<div class="debito-amounts"><div class="debito-residuo">'+eur(d.importoResiduo)+'</div>';
    if(!saldato){h+='<div class="debito-originale">su '+eur(d.importoOriginale)+'</div>';}
    h+='</div></div>';
    h+='<div class="debito-bar-wrap"><div class="debito-bar" style="width:'+perc+'%"></div></div>';
    h+='<div class="debito-badge '+(saldato?"saldato":debitoreE)+'">'+(saldato?"&#x2705; Saldato":"&#x1F4B8; "+d.debitore+" deve "+eur(d.importoResiduo)+" a "+d.prestatore)+'</div>';
    h+='<div class="debito-actions">';
    if(!saldato){
      h+='<button class="btn-rimborsa" onclick="toggleRimborso(\''+d.id+'\')">&#x1F4B5; Rimborso</button>';
    }
    if(d.rimborsi && d.rimborsi.length > 0){
      h+='<button class="btn-storico-rimborsi" onclick="openStoricoRimborsi(\''+d.id+'\')">&#x1F4DC; Vedi ('+d.rimborsi.length+')</button>';
    }
    h+='<button class="btn-storico-rimborsi btn-icona-azione" onclick="openEditDebito(\''+d.id+'\')" title="Modifica">✏️</button>';
    h+='<button class="btn-del-debito" onclick="toggleDelDebito(\''+d.id+'\')" title="Elimina">&#x1F5D1;&#xFE0F;</button>';
    h+='</div>';
    if(rimborsoOpenId===d.id&&!saldato){
      h+='<div class="rimborso-inline"><label>Quanto ha restituito '+d.debitore+'?</label>';
      h+='<input class="inp-rimborso" id="inp-rimborso-'+d.id+'" type="number" inputmode="decimal" step="0.01" min="0.01" max="'+d.importoResiduo.toFixed(2)+'" placeholder="'+d.importoResiduo.toFixed(2)+'" onkeydown="if(event.key===\'Enter\')applicaRimborso(\''+d.id+'\')">';
      h+='<button class="btn-ok-rimborso" onclick="applicaRimborso(\''+d.id+'\')">Salva</button>';
      h+='<button class="btn-cancel-rimborso" onclick="toggleRimborso(\''+d.id+'\')">&#215;</button></div>';
    }
    if(delDebitoConfirmId===d.id){
      h+='<div class="del-debito-confirm"><span>Eliminare definitivamente questo prestito?</span><button class="btn-yes" onclick="eliminaDebito(\''+d.id+'\')">S\u00ec</button><button class="btn-no" onclick="toggleDelDebito(\''+d.id+'\')">No</button></div>';
    }
    h+='</div>';
  });
  el.innerHTML=h;
}

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
  bw.innerHTML=editSaldo
    ?'<div class="edit-saldo-form"><label>\uD83C\uDF6F Debito di partenza</label><div class="erow"><input class="inp-saldo" id="inp-si" type="number" inputmode="decimal" step="1" value="'+S.saldoIniziale+'" onkeydown="if(event.key===\'Enter\')confirmEditSaldo()"><span style="color:rgba(255,255,255,.4);font-weight:700;font-size:16px">&euro;</span><button class="btn-ok" onclick="confirmEditSaldo()">Salva</button><button class="btn-cancel-sm" onclick="cancelEditSaldo()">&times;</button></div></div>'
    :'<div class="saldo-base"><div class="saldo-base-lbl">Debito di partenza</div><div class="saldo-base-val">'+S.saldoIniziale+'<span>&euro;</span></div><button class="btn-edit-saldo" onclick="startEditSaldo()">\u270F\uFE0F Modifica</button></div>';

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
    if(filterChi!=="tutti"){
      h+='<span style="margin-left:auto;font-size:12px;font-family:\'Nunito\',sans-serif;font-weight:700;color:var(--text2);">Totale: <strong>'+eur(totFiltrato)+'</strong></span>';
    }
    h+='</div>';

    h+='<div class="row-start"><span>\uD83C\uDF32 Debito di partenza</span><strong>'+S.saldoIniziale+' &euro;</strong></div>';

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

  // Segmento toggle
  h+='<div class="archivio-segment">';
  h+='<button class="archivio-seg-btn'+(archivioSegmento==="mesi"?" active":"")+ '" onclick="setArchivioSegmento(\'mesi\')">🗓️ Mesi</button>';
  h+='<button class="archivio-seg-btn'+(archivioSegmento==="anni"?" active":"")+ '" onclick="setArchivioSegmento(\'anni\')">📅 Anni</button>';
  h+='</div>';

  if(!S.chiusure.length){
    h+='<div class="empty" style="margin-top:20px;"><span style="font-size:48px;display:block;margin-bottom:12px;">📦</span>Nessun mese archiviato ancora.<br>Chiudi il primo mese per iniziare!</div>';
    el.innerHTML=h;return;
  }

  if(archivioSegmento==="mesi"){
    var totAnnuale=S.chiusure.reduce(function(a,c){return a+(c.totale||c.txs.reduce(function(b,t){return b+(parseFloat(t.importo)||0);},0));},0);
    var mediaAnnuale=S.chiusure.length>0?Math.round(totAnnuale/S.chiusure.length):0;
    h+='<div class="chiusure-section">';
    h+='<div class="chiusure-head-row"><span class="chiusure-head">\uD83D\uDCE6 '+S.chiusure.length+' mesi archiviati</span><button class="btn-grafico" onclick="openGrafico()">\uD83D\uDCCA Grafico</button></div>';
    h+='<div class="chiusura-totale" style="margin-bottom:4px;">\uD83D\uDCC5 Totale archivio: <strong>'+eurInt(totAnnuale)+'</strong></div>';
    h+='<div class="chiusura-totale" style="margin-bottom:12px;">\uD83D\uDCCA Media mensile: <strong>'+eurInt(mediaAnnuale)+'</strong></div>';
    S.chiusure.forEach(function(c){
      var cls=saldoCls(c.saldo);
      var desc=c.saldo>0?"Ale Orsa in debito di "+eurInt(c.saldo):c.saldo<0?"Luca Orso in debito di "+eurInt(Math.abs(c.saldo)):"In pari";
      var tot=c.totale||c.txs.reduce(function(a,t){return a+(parseFloat(t.importo)||0);},0);
      h+='<div class="chiusura-row"><div class="chiusura-top"><div class="chiusura-info"><div class="chiusura-mese">\uD83C\uDF19 '+escapeHtml(c.mese)+'</div><div class="chiusura-meta">'+c.txs.length+' voci \u00b7 chiuso il '+fmt(c.data)+'</div></div><div class="chiusura-saldo '+cls+'">'+eurInt(c.saldo)+'</div></div><div class="chiusura-desc">'+desc+'</div><div class="chiusura-totale">\uD83D\uDED2 Totale spese mese: <strong>'+eurInt(tot)+'</strong></div><div class="chiusura-btns"><button class="btn-storico-mese" onclick="openStoricoMese(\''+c.id+'\')">\uD83D\uDCCB Vedi storico</button><button class="btn-ripristina" onclick="openRipristino(\''+c.id+'\')">\uD83D\uDD04 Ripristina</button><button class="btn-elimina-arch" onclick="toggleEliminaConfirm(\''+c.id+'\')" title="Elimina">\uD83D\uDDD1\uFE0F</button></div>';
      if(eliminaConfirmId===c.id){h+='<div class="elimina-arch-confirm"><span>Eliminare definitivamente questo mese?</span><button class="btn-yes" onclick="eliminaArchiviazione(\''+c.id+'\')">S\u00ec</button><button class="btn-no" onclick="toggleEliminaConfirm(\''+c.id+'\')">No</button></div>';}
      h+='</div>';
    });
    h+='</div>';

  }else{
    // Vista anni: raggruppa per anno dal campo mese o dalla data
    var anniMap={};
    S.chiusure.forEach(function(c){
      // Estrai anno dalla data di chiusura
      var annoKey="?";
      if(c.data){
        var d=new Date(c.data);
        if(!isNaN(d)) annoKey=String(d.getFullYear());
      }
      if(!anniMap[annoKey]) anniMap[annoKey]=[];
      anniMap[annoKey].push(c);
    });
    var anniKeys=Object.keys(anniMap).sort(function(a,b){return b-a;});
    h+='<div class="chiusure-section">';
    anniKeys.forEach(function(anno){
      var mesi=anniMap[anno];
      var totAnno=mesi.reduce(function(a,c){return a+(c.totale||c.txs.reduce(function(b,t){return b+(parseFloat(t.importo)||0);},0));},0);
      var totFisseAnno=mesi.reduce(function(a,c){
        var f=c.fisseSnapshot||[];
        return a+f.reduce(function(b,x){return b+(parseFloat(x.importo)||0);},0);
      },0);
      var totRealeAnno=totAnno+totFisseAnno;
      var mediaAnno=mesi.length>0?Math.round(totAnno/mesi.length):0;
      var isOpen=(annoAperto===anno);
      h+='<div class="anno-card">';
      h+='<div class="anno-header" onclick="toggleAnno(\''+anno+'\')">';
      h+='<span class="anno-label">\uD83D\uDCC5 '+anno+'</span>';
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
        var tot=c.totale||c.txs.reduce(function(a,t){return a+(parseFloat(t.importo)||0);},0);
        var totF=(c.fisseSnapshot||[]).reduce(function(a,f){return a+(parseFloat(f.importo)||0);},0);
        h+='<div class="anno-mese-mini">';
        h+='<span class="anno-mese-mini-nome">\uD83C\uDF19 '+escapeHtml(c.mese)+'</span>';
        h+='<div style="text-align:right;">';
        h+='<div class="anno-mese-mini-tot">'+eurInt(tot)+'</div>';
        if(totF>0) h+='<div style="font-size:11px;color:var(--honey-d);font-family:\'Nunito\',sans-serif;font-weight:600;">reale: '+eurInt(tot+totF)+'</div>';
        h+='</div>';
        h+='<button class="anno-mese-mini-btn" onclick="openStoricoMese(\''+c.id+'\')">\uD83D\uDCCB Storico</button>';
        h+='</div>';
      });
      h+='</div>';
      h+='</div>';
    });
    h+='</div>';
  }

  el.innerHTML=h;
}

function setArchivioSegmento(seg){
  archivioSegmento=seg;
  renderArchivioTab();
}

function toggleAnno(anno){
  annoAperto=(annoAperto===anno)?null:anno;
  renderArchivioTab();
}

var graficoVista="barre"; // "barre" | "torta"

function openGrafico(){
  var totAnnuale=S.chiusure.reduce(function(a,c){
    return a+(c.totale||c.txs.reduce(function(b,t){return b+(parseFloat(t.importo)||0);},0));
  },0);
  var mediaAnnuale=S.chiusure.length>0?Math.round(totAnnuale/S.chiusure.length):0;
  var el=document.getElementById("grafico-stats");
  if(el){
    el.innerHTML=S.chiusure.length>0
      ?'<span>📅 Totale: <strong>'+eurInt(totAnnuale)+'</strong></span><span style="margin-left:16px;">📊 Media: <strong>'+eurInt(mediaAnnuale)+'</strong></span>'
      :'';
  }
  document.getElementById("modal-grafico").classList.add("open");
  setTimeout(function(){renderGraficoVista();},50);
}
function closeGrafico(){document.getElementById("modal-grafico").classList.remove("open");}

function setGraficoVista(v){
  graficoVista=v;
  // Aggiorna bottoni toggle
  document.querySelectorAll(".grafico-toggle-btn").forEach(function(b){
    b.classList.toggle("active", b.dataset.vista===v);
  });
  renderGraficoVista();
}

function renderGraficoVista(){
  var barraWrap=document.getElementById("grafico-barre-wrap");
  var tortaWrap=document.getElementById("grafico-torta-wrap");
  if(!barraWrap||!tortaWrap) return;
  if(graficoVista==="barre"){
    barraWrap.style.display="";
    tortaWrap.style.display="none";
    drawChart();
  } else {
    barraWrap.style.display="none";
    tortaWrap.style.display="";
    drawTorta();
  }
}

function drawTorta(){
  var canvas=document.getElementById("grafico-torta-canvas");
  if(!canvas) return;
  var ctx=canvas.getContext("2d");

  // Calcola totali Luca e Ale da chiusure + mese corrente
  var totLuca=0, totAle=0;
  S.chiusure.forEach(function(c){
    c.txs.forEach(function(t){
      if(t.chi==="Luca") totLuca+=parseFloat(t.importo)||0;
      else totAle+=parseFloat(t.importo)||0;
    });
  });
  S.txs.forEach(function(t){
    if(t.chi==="Luca") totLuca+=parseFloat(t.importo)||0;
    else totAle+=parseFloat(t.importo)||0;
  });

  var totale=totLuca+totAle;
  if(totale===0){
    document.getElementById("grafico-torta-wrap").innerHTML=
      '<div class="grafico-empty">Nessun dato disponibile ancora.</div>';
    return;
  }

  var dpr=window.devicePixelRatio||1;
  var size=Math.min(180, canvas.parentElement.offsetWidth-32);
  canvas.width=size*dpr; canvas.height=size*dpr;
  canvas.style.width=size+"px"; canvas.style.height=size+"px";
  ctx.scale(dpr,dpr);

  var cx=size/2, cy=size/2, r=size/2-8;
  var LUCA_COLOR="#A83225";  // berry
  var ALE_COLOR="#4A7C40";   // moss
  var angLuca=(totLuca/totale)*Math.PI*2;

  // Fetta Luca
  ctx.beginPath();
  ctx.moveTo(cx,cy);
  ctx.arc(cx,cy,r,-Math.PI/2,-Math.PI/2+angLuca);
  ctx.closePath();
  ctx.fillStyle=LUCA_COLOR;
  ctx.fill();

  // Fetta Ale
  ctx.beginPath();
  ctx.moveTo(cx,cy);
  ctx.arc(cx,cy,r,-Math.PI/2+angLuca,-Math.PI/2+Math.PI*2);
  ctx.closePath();
  ctx.fillStyle=ALE_COLOR;
  ctx.fill();

  // Cerchio centrale (donut)
  ctx.beginPath();
  ctx.arc(cx,cy,r*0.52,0,Math.PI*2);
  ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue("--card").trim()||"#FFFDF8";
  ctx.fill();

  // Percentuali al centro — mostra il nome con % più grande
  var percLuca=Math.round(totLuca/totale*100);
  var percAle=100-percLuca;
  ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue("--text").trim()||"#2E1A08";
  ctx.font="bold "+(size*0.1)+"px 'Baloo 2',cursive";
  ctx.textAlign="center";
  ctx.textBaseline="middle";
  ctx.fillText(percLuca+"% / "+percAle+"%",cx,cy);

  // Legenda
  var legenda=document.getElementById("grafico-torta-legenda");
  if(legenda){
    legenda.innerHTML=
      '<div class="torta-legenda-item"><div class="torta-legenda-dot" style="background:'+LUCA_COLOR+'"></div>'+
      '<span><img src="./bear.svg" style="width:0.875rem;height:0.875rem;vertical-align:middle;margin-right:4px;" alt="">Luca</span><span class="torta-legenda-val">'+eur(totLuca)+' ('+percLuca+'%)</span></div>'+
      '<div class="torta-legenda-item"><div class="torta-legenda-dot" style="background:'+ALE_COLOR+'"></div>'+
      '<span><img src="./bear.svg" style="width:0.875rem;height:0.875rem;vertical-align:middle;margin-right:4px;" alt="">Ale</span><span class="torta-legenda-val">'+eur(totAle)+' ('+percAle+'%)</span></div>'+
      '<div class="torta-legenda-item" style="border-top:1px solid var(--border);padding-top:6px;margin-top:2px;">'+
      '<span style="color:var(--text3);">Totale</span><span class="torta-legenda-val">'+eur(totale)+'</span></div>';
  }
}

function drawChart(){
  var canvas=document.getElementById("grafico-canvas");
  var ctx=canvas.getContext("2d");
  var chiusure=[].concat(S.chiusure).reverse();
  var totCorrente=S.txs.reduce(function(a,t){return a+t.importo;},0);
  var dati=chiusure.map(function(c){
    var tot=c.totale||c.txs.reduce(function(a,t){return a+(parseFloat(t.importo)||0);},0);
    return{label:c.mese,val:Math.round(tot)};
  });
  if(S.txs.length>0){dati.push({label:"Mese corrente",val:Math.round(totCorrente)});}

  if(!dati.length){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    canvas.parentElement.innerHTML='<div class="grafico-empty">&#x1F4CA; Nessun dato disponibile ancora.<br>Chiudi almeno un mese per vedere il grafico.</div>';
    return;
  }

  var dpr=window.devicePixelRatio||1;
  var rect=canvas.getBoundingClientRect();
  canvas.width=rect.width*dpr;
  canvas.height=rect.height*dpr;
  ctx.scale(dpr,dpr);
  var W=rect.width, H=rect.height;
  var padL=44, padR=16, padT=20, padB=48;
  var chartW=W-padL-padR, chartH=H-padT-padB;

  var maxVal=Math.max.apply(null,dati.map(function(d){return d.val;}))||1;
  maxVal=Math.ceil(maxVal/100)*100;

  var barColor="rgba(107,63,32,0.75)";
  var barColorLast="rgba(244,168,39,0.85)";
  var lineColor="#F4A827";
  var gridColor="rgba(184,149,106,0.2)";
  var textColor="#B8956A";

  ctx.clearRect(0,0,W,H);

  var steps=4;
  ctx.strokeStyle=gridColor;ctx.lineWidth=1;
  ctx.font="10px 'Nunito',sans-serif";ctx.fillStyle=textColor;ctx.textAlign="right";
  for(var i=0;i<=steps;i++){
    var y=padT+chartH-(chartH/steps)*i;
    ctx.beginPath();ctx.moveTo(padL,y);ctx.lineTo(padL+chartW,y);ctx.stroke();
    ctx.fillText(Math.round(maxVal/steps*i)+" €",padL-6,y+4);
  }

  var barW=Math.max(8,Math.min(36,(chartW/dati.length)*0.55));
  var step=chartW/dati.length;
  ctx.font="bold 10px 'Nunito',sans-serif";ctx.textAlign="center";

  var points=[];
  dati.forEach(function(d,i){
    var x=padL+step*i+step/2;
    var bh=(d.val/maxVal)*chartH;
    var y=padT+chartH-bh;
    var isLast=(i===dati.length-1&&S.txs.length>0);
    ctx.fillStyle=isLast?barColorLast:barColor;
    var r=Math.min(4,barW/2);
    ctx.beginPath();
    ctx.moveTo(x-barW/2+r,y);
    ctx.lineTo(x+barW/2-r,y);
    ctx.quadraticCurveTo(x+barW/2,y,x+barW/2,y+r);
    ctx.lineTo(x+barW/2,y+bh);
    ctx.lineTo(x-barW/2,y+bh);
    ctx.lineTo(x-barW/2,y+r);
    ctx.quadraticCurveTo(x-barW/2,y,x-barW/2+r,y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle=isLast?lineColor:textColor;
    ctx.font="bold 10px 'Nunito',sans-serif";
    ctx.fillText(d.val+" €",x,y-5);
    ctx.fillStyle=textColor;
    ctx.font="9px 'Nunito',sans-serif";
    var lbl=d.label.length>8?d.label.substring(0,8)+"…":d.label;
    ctx.fillText(lbl,x,padT+chartH+14);
    if(dati.length>4){
      var parts=d.label.split(" ");
      if(parts.length>1){ctx.fillText(parts[parts.length-1],x,padT+chartH+25);}
    }
    points.push({x:x,y:y});
  });

  if(points.length>1){
    ctx.strokeStyle=lineColor;
    ctx.lineWidth=2.5;
    ctx.lineJoin="round";
    ctx.lineCap="round";
    ctx.beginPath();
    ctx.moveTo(points[0].x,points[0].y);
    for(var i=1;i<points.length;i++){
      var mx=(points[i-1].x+points[i].x)/2;
      ctx.bezierCurveTo(mx,points[i-1].y,mx,points[i].y,points[i].x,points[i].y);
    }
    ctx.stroke();
    ctx.fillStyle=lineColor;
    points.forEach(function(p){
      ctx.beginPath();ctx.arc(p.x,p.y,4,0,Math.PI*2);ctx.fill();
    });
    ctx.fillStyle="#fff";
    points.forEach(function(p){
      ctx.beginPath();ctx.arc(p.x,p.y,2,0,Math.PI*2);ctx.fill();
    });
  }
}

// ── ESPORTA PDF ──
function esportaPDF(id){
  var c=S.chiusure.find(function(x){return x.id===id;});
  if(!c){alert("Mese non trovato");return;}
  if(typeof window.jspdf==="undefined"){
    var s=document.createElement("script");
    s.src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    s.onload=function(){_generaPDF(c);};
    s.onerror=function(){alert("Impossibile caricare jsPDF. Controlla la connessione.");};
    document.head.appendChild(s);
  }else{_generaPDF(c);}
}

function _generaPDF(c){
  var jsPDF=window.jspdf.jsPDF;
  var doc=new jsPDF({orientation:"portrait",unit:"mm",format:"a4"});

  // ── Fix emoji: jsPDF usa font standard Latin-1, le emoji diventano caratteri spazzatura
  function pdfStrip(s){
    return String(s||"")
      .replace(/[\u{1F000}-\u{1FFFF}]/gu,"")   // emoji supplementari (🐻🗑️ecc)
      .replace(/[\u2600-\u26FF]/gu,"")           // simboli vari (☀️⭐ecc)
      .replace(/[\u2700-\u27BF]/gu,"")           // dingbats
      .replace(/\uFE0F/g,"")                     // variation selector
      .replace(/\s+/g," ").trim();
  }
  var _origText=doc.text.bind(doc);
  doc.text=function(str,x,y,opts){
    return _origText(typeof str==="string"?pdfStrip(str):str,x,y,opts);
  };
  var W=210,margin=18,y=margin;
  var BROWN=[74,42,15],HONEY=[244,168,39],BERRY=[168,50,37],MOSS=[74,124,64];
  var LIGHT=[254,245,220],DARK=[46,26,8],GRAY=[120,85,56];
  // Header
  doc.setFillColor(BROWN[0],BROWN[1],BROWN[2]);
  doc.rect(0,0,W,28,"F");
  doc.setTextColor(HONEY[0],HONEY[1],HONEY[2]);
  doc.setFontSize(18);doc.setFont("helvetica","bold");
  doc.text("Tana degli Orsi",margin,12);
  doc.setFontSize(9);doc.setFont("helvetica","normal");
  doc.setTextColor(255,255,255);
  doc.text("Luca & Ale — cassa comune",margin,19);
  doc.text("Generato il "+new Date().toLocaleDateString("it-IT"),W-margin,19,{align:"right"});
  y=36;
  // Titolo mese
  doc.setTextColor(DARK[0],DARK[1],DARK[2]);
  doc.setFontSize(16);doc.setFont("helvetica","bold");
  doc.text(c.mese,margin,y);y+=6;
  doc.setFontSize(9);doc.setFont("helvetica","normal");
  doc.setTextColor(GRAY[0],GRAY[1],GRAY[2]);
  doc.text(c.txs.length+" voci  ·  chiuso il "+fmtLong(c.data),margin,y);y+=8;
  // Riquadro saldo
  var saldoCl=c.saldo>0?BERRY:c.saldo<0?MOSS:MOSS;
  doc.setFillColor(LIGHT[0],LIGHT[1],LIGHT[2]);
  doc.roundedRect(margin,y,W-margin*2,16,3,3,"F");
  doc.setFontSize(9);doc.setFont("helvetica","normal");
  doc.setTextColor(GRAY[0],GRAY[1],GRAY[2]);
  doc.text("Debito iniziale: "+c.saldoIniziale+" €",margin+4,y+6);
  doc.setFontSize(11);doc.setFont("helvetica","bold");
  doc.setTextColor(saldoCl[0],saldoCl[1],saldoCl[2]);
  doc.text("Debito finale: "+eurInt(c.saldo),W-margin-4,y+6,{align:"right"});
  var totale=c.totale||c.txs.reduce(function(a,t){return a+(parseFloat(t.importo)||0);},0);
  doc.setFontSize(9);doc.setFont("helvetica","normal");
  doc.setTextColor(GRAY[0],GRAY[1],GRAY[2]);
  doc.text("Totale spese mese: "+eurInt(totale),margin+4,y+12);y+=22;
  // Intestazione tabella
  doc.setFillColor(BROWN[0],BROWN[1],BROWN[2]);
  doc.rect(margin,y,W-margin*2,7,"F");
  doc.setTextColor(HONEY[0],HONEY[1],HONEY[2]);
  doc.setFontSize(8);doc.setFont("helvetica","bold");
  doc.text("Data",margin+2,y+5);
  doc.text("Chi",margin+20,y+5);
  doc.text("Nota",margin+36,y+5);
  doc.text("Importo",W-margin-2,y+5,{align:"right"});
  y+=7;
  // Righe
  var run=c.saldoIniziale;
  c.txs.forEach(function(t,i){
    if(y>272){doc.addPage();y=margin;}
    var isL=t.chi==="Luca";
    run=isL?run+t.importo:run-t.importo;
    doc.setFillColor(i%2===0?255:248,i%2===0?253:245,i%2===0?248:238);
    doc.rect(margin,y,W-margin*2,6.5,"F");
    doc.setTextColor(DARK[0],DARK[1],DARK[2]);
    doc.setFontSize(8);doc.setFont("helvetica","normal");
    doc.text(fmt(t.data)||"-",margin+2,y+4.5);
    doc.setTextColor(isL?BERRY[0]:MOSS[0],isL?BERRY[1]:MOSS[1],isL?BERRY[2]:MOSS[2]);
    doc.setFont("helvetica","bold");
    doc.text(t.chi,margin+20,y+4.5);
    doc.setTextColor(DARK[0],DARK[1],DARK[2]);
    doc.setFont("helvetica","normal");
    var nota=t.nota||(isL?"Spesa Luca":"Spesa Ale");
    if(nota.length>38)nota=nota.substring(0,36)+"…";
    doc.text(nota,margin+36,y+4.5);
    doc.setTextColor(isL?BERRY[0]:MOSS[0],isL?BERRY[1]:MOSS[1],isL?BERRY[2]:MOSS[2]);
    doc.setFont("helvetica","bold");
    doc.text(eur(t.importo),W-margin-2,y+4.5,{align:"right"});
    y+=6.5;
  });
  // Snapshot spese fisse
  if(c.fisseSnapshot && c.fisseSnapshot.length){
    y+=4;
    if(y>252){doc.addPage();y=margin;}
    var totF=c.fisseSnapshot.reduce(function(a,f){return a+(parseFloat(f.importo)||0);},0);
    // Intestazione sezione fisse
    doc.setFillColor(BROWN[0],BROWN[1],BROWN[2]);
    doc.rect(margin,y,W-margin*2,7,"F");
    doc.setTextColor(HONEY[0],HONEY[1],HONEY[2]);
    doc.setFontSize(8);doc.setFont("helvetica","bold");
    doc.text("📌 Spese fisse del mese",margin+2,y+5);
    doc.text("Importo",W-margin-2,y+5,{align:"right"});
    y+=7;
    c.fisseSnapshot.forEach(function(f,i){
      if(y>272){doc.addPage();y=margin;}
      doc.setFillColor(i%2===0?255:248,i%2===0?253:245,i%2===0?248:238);
      doc.rect(margin,y,W-margin*2,6.5,"F");
      doc.setTextColor(DARK[0],DARK[1],DARK[2]);
      doc.setFontSize(8);doc.setFont("helvetica","normal");
      doc.text(f.nome,margin+2,y+4.5);
      doc.setFont("helvetica","bold");
      doc.text(eur(f.importo),W-margin-2,y+4.5,{align:"right"});
      y+=6.5;
    });
    // Totale fisse e totale reale
    doc.setFillColor(LIGHT[0],LIGHT[1],LIGHT[2]);
    doc.rect(margin,y,W-margin*2,6.5,"F");
    doc.setFontSize(8);doc.setFont("helvetica","bold");
    doc.setTextColor(GRAY[0],GRAY[1],GRAY[2]);
    doc.text("Totale spese fisse",margin+2,y+4.5);
    doc.setTextColor(HONEY[0],HONEY[1],HONEY[2]);
    doc.text(eur(totF),W-margin-2,y+4.5,{align:"right"});
    y+=6.5;
    doc.setFillColor(HONEY[0],HONEY[1],HONEY[2]);
    doc.rect(margin,y,W-margin*2,7,"F");
    doc.setTextColor(255,255,255);
    doc.setFontSize(9);
    doc.text("Totale reale del mese",margin+2,y+5);
    doc.text(eur(totale+totF),W-margin-2,y+5,{align:"right"});
    y+=9;
  }
  // Footer
  y+=4;
  doc.setDrawColor(HONEY[0],HONEY[1],HONEY[2]);
  doc.setLineWidth(0.4);
  doc.line(margin,y,W-margin,y);y+=5;
  doc.setFontSize(8);doc.setFont("helvetica","normal");
  doc.setTextColor(GRAY[0],GRAY[1],GRAY[2]);
  doc.text("Tana degli Orsi — "+c.mese,margin,y);
  doc.text("Pagina 1",W-margin,y,{align:"right"});
  doc.save("tana-"+c.mese.replace(/\s+/g,"-").toLowerCase()+".pdf");
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
  // Animazione di entrata: rigioca il fade+slide sulla tab appena aperta
  var main = document.querySelector(".main");
  if(main){
    main.classList.remove("tab-switching");
    void main.offsetWidth; // forza il reflow per re-triggerare l'animazione
    main.classList.add("tab-switching");
  }
}
