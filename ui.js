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
  var totMeseChiusura=Math.round(S.txs.reduce(function(a,t){return a+t.importo;},0)*100)/100;
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
    // ── PONTE → ORSO SOLO ──
    // Per ciascun orso, deposito nel suo registro personale una voce
    // pari al TOTALE che ha speso in cassa comune questo mese (intero,
    // non metà). origine collegata alla chiusura per il ripristino.
    try{ await depositaQuoteSolo(chiusura); }catch(e){ console.error("Ponte Solo:",e); }
    dot("ok","Mese chiuso \uD83C\uDF19");
  } catch(e){
    dot("err","Errore chiusura");
    S.chiusure.shift(); S.txs = backupTxs; S.saldoIniziale = backupSaldo;
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
  if(!c.txs.length){h='<div style="text-align:center;color:var(--text3);padding:20px;font-size:14px;">'+fraseVuoto("mese")+'</div>';}
  else{
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
    // ── PONTE INVERSO → ORSO SOLO ──
    // Rimuovo le voci "Cassa Comune" che questa chiusura aveva depositato,
    // ma solo se intatte. Quelle modificate/spostate vengono segnalate.
    try{ await rimuoviQuoteSolo(c); }catch(e){ console.error("Ponte inverso:",e); }
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
  doc.text("La Tana degli Orsi",margin,12);
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
  doc.text("Debito iniziale: "+eurInt(c.saldoIniziale),margin+4,y+6);
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
    doc.text("Spese Tana",margin+2,y+4.5);
    doc.setTextColor(DARK[0],DARK[1],DARK[2]);
    doc.text(eur(totale),W-margin-2,y+4.5,{align:"right"});
    y+=6.5;
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
  doc.text("La Tana degli Orsi — "+c.mese,margin,y);
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

// ════════════════════════════════════════════════════════
//  ORSO SOLO — contabilità personale (I-1: gate PIN)
//  Tab fuori-swipe. Ogni orso ha un PIN; sbloccato una volta
//  per sessione. Isolamento "di cortesia": i dati dell'altro
//  non vengono mostrati, ma la protezione è lato app.
// ════════════════════════════════════════════════════════

// Entry point chiamato da switchTab("solo")
function renderSolo(){
  var el=document.getElementById("solo-content");
  if(!el) return;
  if(soloSbloccato && soloChi){ renderSoloApp(el); return; }
  // Non sbloccato: mostro la scelta orso o il tastierino PIN
  renderSoloGate(el);
}

// ── GATE: scelta orso + PIN ──
function renderSoloGate(el){
  // Se non ho ancora scelto quale orso, mostro i due bottoni
  if(!soloChi){
    el.innerHTML=
      '<div class="solo-gate">'
      +'<div class="solo-gate-icon">🐻‍❄️</div>'
      +'<h2 class="solo-gate-title">Orso Solo</h2>'
      +'<p class="solo-gate-sub">La tua contabilità personale, privata.<br>Chi sei?</p>'
      +'<div class="solo-gate-chi">'
      +'<button class="solo-chi-btn" onclick="soloScegliChi(\'Luca\')">Luca</button>'
      +'<button class="solo-chi-btn" onclick="soloScegliChi(\'Ale\')">Ale</button>'
      +'</div></div>';
    return;
  }
  // Orso scelto: PIN da impostare (primo accesso) o da inserire
  var primoAccesso = !soloProfili[soloChi];
  el.innerHTML=
    '<div class="solo-gate">'
    +'<div class="solo-gate-icon">'+(primoAccesso?"🆕":"🔒")+'</div>'
    +'<h2 class="solo-gate-title">'+escapeHtml(soloChi)+'</h2>'
    +'<p class="solo-gate-sub">'+(primoAccesso
        ? "Scegli un PIN di 4 cifre<br>per proteggere la tua area."
        : "Inserisci il tuo PIN<br>per entrare.")+'</p>'
    +'<div class="solo-pin-dots" id="solo-pin-dots"></div>'
    +'<div class="solo-pin-err" id="solo-pin-err"></div>'
    +'<div class="solo-pin-pad">'
    +  [1,2,3,4,5,6,7,8,9].map(function(n){return '<button class="solo-pin-key" onclick="soloPinDigit(\''+n+'\')">'+n+'</button>';}).join('')
    +  '<button class="solo-pin-key solo-pin-back" onclick="soloPinBack()">←</button>'
    +  '<button class="solo-pin-key" onclick="soloPinDigit(\'0\')">0</button>'
    +  '<button class="solo-pin-key solo-pin-annulla" onclick="soloAnnullaChi()">✕</button>'
    +'</div></div>';
  _soloPinBuffer="";
  soloRenderDots();
}

function soloScegliChi(c){ soloChi=c; renderSolo(); }
function soloAnnullaChi(){ soloChi=null; _soloPinBuffer=""; renderSolo(); }

function soloRenderDots(){
  var d=document.getElementById("solo-pin-dots");
  if(!d) return;
  var s="";
  for(var i=0;i<4;i++) s+= (i<_soloPinBuffer.length ? "●" : "○");
  d.textContent=s;
}
function soloPinBack(){
  _soloPinBuffer=_soloPinBuffer.slice(0,-1);
  soloRenderDots();
}
async function soloPinDigit(n){
  if(_soloPinBuffer.length>=4) return;
  _soloPinBuffer+=n;
  soloRenderDots();
  if(_soloPinBuffer.length===4){
    vibra(15);
    var pin=_soloPinBuffer;
    setTimeout(function(){ soloVerificaPin(pin); }, 150); // breve pausa per far vedere il 4° pallino
  }
}

async function soloVerificaPin(pin){
  var hash=await sha256(pin);
  var primoAccesso = !soloProfili[soloChi];
  if(primoAccesso){
    // Imposto il PIN sul profilo
    try{
      await post({action:"setSoloPin", proprietario:soloChi, pinHash:hash});
      soloProfili[soloChi]=hash;
      soloSbloccato=true;
      await caricaSolo();
      renderSolo();
    }catch(e){
      soloPinErrore("Errore nel salvataggio. Riprova.");
    }
  } else {
    // Verifico
    if(hash===soloProfili[soloChi]){
      soloSbloccato=true;
      await caricaSolo();
      renderSolo();
    } else {
      soloPinErrore("PIN errato.");
      vibra([60,40,60]);
    }
  }
}
function soloPinErrore(msg){
  var e=document.getElementById("solo-pin-err");
  if(e) e.textContent=msg;
  _soloPinBuffer="";
  soloRenderDots();
}

// ── Carica i profili PIN (chiamato all'avvio app) ──
async function caricaSoloProfili(){
  try{
    var r=await sb.from("solo_profili").select("*");
    if(r.error) return;
    soloProfili={Luca:null, Ale:null};
    (r.data||[]).forEach(function(p){ soloProfili[p.proprietario]=p.pin_hash||null; });
  }catch(e){ /* offline: si riproverà */ }
}

// ── Carica i dati dell'orso sbloccato ──
async function caricaSolo(){
  if(!soloChi) return;
  try{
    var ris=await Promise.all([
      sb.from("solo_voci").select("*").eq("proprietario",soloChi).order("data",{ascending:false}),
      sb.from("solo_ricorrenti").select("*").eq("proprietario",soloChi).order("prossima_scadenza",{ascending:true}),
      sb.from("solo_chiusure").select("*").eq("proprietario",soloChi).order("data",{ascending:false}),
      sb.from("solo_categorie").select("*").eq("proprietario",soloChi).order("ordine",{ascending:true})
    ]);
    soloData.voci       = (ris[0].data||[]).map(function(r){return{id:r.id,tipo:r.tipo,importo:parseFloat(r.importo)||0,categoria:r.categoria||"Altro",nota:r.nota||"",data:r.data||"",origine:r.origine||null};});
    soloData.ricorrenti = (ris[1].data||[]).map(function(r){return{id:r.id,nome:r.nome,tipo:r.tipo,importo:parseFloat(r.importo)||0,categoria:r.categoria||"Altro",ogniQuanto:r.ogni_quanto||1,unita:r.unita||"mesi",prossimaScadenza:r.prossima_scadenza||""};});
    soloData.chiusure   = (ris[2].data||[]).map(function(r){return{id:r.id,mese:r.mese,totEntrate:parseFloat(r.tot_entrate)||0,totUscite:parseFloat(r.tot_uscite)||0,saldo:parseFloat(r.saldo)||0,data:r.data||""};});
    soloData.categorie  = (ris[3].data||[]).map(function(r){return{id:r.id,icona:r.icona||"📌",nome:r.nome,ordine:r.ordine||0,protetta:!!r.protetta};});
  }catch(e){ /* offline */ }
}

// Saldo personale: entrate − uscite
function soloSaldo(){
  return Math.round(soloData.voci.reduce(function(a,v){ return v.tipo==="entrata" ? a+v.importo : a-v.importo; }, 0)*100)/100;
}

// ── APP sbloccata (I-1: placeholder; in I-2 diventa il registro) ──
function renderSoloApp(el){
  var s=soloSaldo();
  var cats=soloData.categorie||[];
  var catOpts=cats.map(function(c){return '<option value="'+escapeHtml(c.nome)+'">'+c.icona+' '+escapeHtml(c.nome)+'</option>';}).join('');
  var ricScadute=soloRicorrentiScadute();
  el.innerHTML=
    '<div class="solo-head">'
    +'<div class="solo-head-chi">🐻‍❄️ '+escapeHtml(soloChi)+'</div>'
    +'<div class="solo-head-btns"><button class="solo-lock-btn" onclick="soloCambiaPin()">🔑</button>'
    +'<button class="solo-lock-btn" onclick="soloLock()">🔒 Blocca</button></div>'
    +'</div>'
    +'<div class="solo-saldo-card">'
    +'<div class="solo-saldo-lbl">Saldo personale</div>'
    +'<div class="solo-saldo-val '+(s>=0?"pos":"neg")+'">'+eur(s)+'</div>'
    +'<div class="solo-saldo-actions"><button class="solo-saldo-act" onclick="openSoloGrafici()">📊 Grafici</button><button class="solo-saldo-act" onclick="openSoloChiudi()">📸 Chiudi mese</button></div>'
    +'</div>'
    // Segmento: Registro / Ricorrenti
    +'<div class="solo-seg">'
    +'<button class="solo-seg-btn'+(soloSegmento==="registro"?" on":"")+'" onclick="soloSetSegmento(\'registro\')">📒 Registro</button>'
    +'<button class="solo-seg-btn'+(soloSegmento==="ricorrenti"?" on":"")+'" onclick="soloSetSegmento(\'ricorrenti\')">🔁 Ricorrenti'+(ricScadute.length?' <span class="solo-badge-pulse">'+ricScadute.length+'</span>':'')+'</button>'
    +'</div>'
    +(soloSegmento==="ricorrenti" ? soloRicorrentiHtml(cats) : soloRegistroHtml(catOpts));
}

// ── REGISTRO (voci entrata/uscita) ──
function soloRegistroHtml(catOpts){
  return '<div class="solo-form-card">'
    +'<div class="solo-tipo-toggle">'
    +'<button class="solo-tipo-btn'+(soloTipoNuova==="uscita"?" on-uscita":"")+'" id="solo-btn-uscita" onclick="soloSetTipo(\'uscita\')">➖ Uscita</button>'
    +'<button class="solo-tipo-btn'+(soloTipoNuova==="entrata"?" on-entrata":"")+'" id="solo-btn-entrata" onclick="soloSetTipo(\'entrata\')">➕ Entrata</button>'
    +'</div>'
    +'<div class="input-row">'
    +'<div class="inp-euro-wrap"><input class="inp inp-euro" type="number" id="solo-imp" placeholder="0.00" min="0" step="0.01" inputmode="decimal" onkeydown="if(event.key===\'Enter\')soloAddVoce()"><button type="button" class="btn-calc-icon" onclick="openCalc(\'solo-imp\')" title="Calcolatrice">🧮</button></div>'
    +'<input class="inp inp-nota" type="text" id="solo-nota" placeholder="Nota (es. Spesa Conad)" onkeydown="if(event.key===\'Enter\')soloAddVoce()">'
    +'</div>'
    +'<div class="solo-cat-row"><select class="inp solo-cat-sel" id="solo-cat">'+catOpts+'</select>'
    +'<button class="solo-cat-manage" onclick="openSoloCategorie()" title="Gestisci categorie">⚙️</button></div>'
    +'<button class="solo-add-btn" onclick="soloAddVoce()">🐻‍❄️ Aggiungi voce</button>'
    +'</div>'
    +'<div class="solo-storico">'
    +'<div class="solo-storico-head">Movimenti</div>'
    +soloStoricoHtml()
    +'</div>';
}

function soloStoricoHtml(){
  if(!soloData.voci.length){
    return '<div class="empty"><span class="e-icon">🐻‍❄️</span>Ancora nessun movimento.<br>Registra entrate e uscite qui sopra!</div>';
  }
  return soloData.voci.map(function(v){
    var entrata=v.tipo==="entrata";
    var ic=soloIconaCat(v.categoria);
    return '<div class="solo-voce '+(entrata?"entrata":"uscita")+'">'
      +'<div class="solo-voce-cat">'+ic+' '+escapeHtml(v.categoria||"Altro")+'</div>'
      +'<div class="solo-voce-body">'
      +'<div class="solo-voce-nota">'+escapeHtml(v.nota||(entrata?"Entrata":"Uscita"))+'</div>'
      +'<div class="solo-voce-data">'+fmt(v.data)+'</div>'
      +'</div>'
      +'<div class="solo-voce-imp '+(entrata?"pos":"neg")+'">'+(entrata?"+":"−")+eur(v.importo)+'</div>'
      +(soloDelConfirmId===v.id
        ? '<div class="solo-voce-confirm"><button class="svc-si" onclick="soloDelVoce(\''+v.id+'\')">Sì</button><button class="svc-no" onclick="soloDelAnnulla()">No</button></div>'
        : '<button class="solo-voce-del" onclick="soloDelChiedi(\''+v.id+'\')">🗑️</button>')
      +'</div>';
  }).join('');
}

// Restituisce l'icona della categoria dato il nome (per lo storico)
function soloIconaCat(nome){
  var c=(soloData.categorie||[]).find(function(x){return x.nome===nome;});
  return c?c.icona:"📌";
}

function soloSetSegmento(s){ soloSegmento=s; renderSolo(); }
function soloSetTipo(t){
  soloTipoNuova=t;
  document.getElementById("solo-btn-uscita").className="solo-tipo-btn"+(t==="uscita"?" on-uscita":"");
  document.getElementById("solo-btn-entrata").className="solo-tipo-btn"+(t==="entrata"?" on-entrata":"");
}

async function soloAddVoce(){
  var impEl=document.getElementById("solo-imp");
  var imp=parseFloat(impEl.value);
  if(!imp||imp<=0){
    impEl.classList.add("invalid");
    setTimeout(function(){impEl.classList.remove("invalid");},1200);
    impEl.focus();
    return;
  }
  var nota=document.getElementById("solo-nota").value.trim();
  var cat=document.getElementById("solo-cat").value||"Altro";
  var v={id:Date.now().toString(),proprietario:soloChi,tipo:soloTipoNuova,importo:imp,categoria:cat,nota:nota,data:new Date().toISOString(),origine:null};
  soloData.voci.unshift(v);
  vibra(30);
  renderSolo();
  try{
    await post({action:"addSoloVoce",voce:v});
  }catch(e){
    soloData.voci=soloData.voci.filter(function(x){return x.id!==v.id;});
    renderSolo();
    dot("err","Errore salvataggio");
  }
}

function soloDelChiedi(id){ soloDelConfirmId=id; renderSolo(); }
function soloDelAnnulla(){ soloDelConfirmId=null; renderSolo(); }
async function soloDelVoce(id){
  var backup=soloData.voci.slice();
  soloData.voci=soloData.voci.filter(function(x){return x.id!==id;});
  soloDelConfirmId=null;
  vibra(20);
  renderSolo();
  try{
    await post({action:"deleteSoloVoce",id:id});
  }catch(e){
    soloData.voci=backup;
    renderSolo();
    dot("err","Errore eliminazione");
  }
}

// ── RICORRENTI (fisse personali con frequenza) ──
var UNITA_LABEL={giorni:"giorni",settimane:"settimane",mesi:"mesi",anni:"anni"};

// Ricorrenti la cui prossima scadenza è oggi o passata
function soloRicorrentiScadute(){
  var oggi=new Date(); oggi.setHours(23,59,59,999);
  return (soloData.ricorrenti||[]).filter(function(r){
    if(!r.prossimaScadenza) return false;
    return new Date(r.prossimaScadenza)<=oggi;
  });
}

function soloRicorrentiHtml(cats){
  var catOpts=cats.map(function(c){return '<option value="'+escapeHtml(c.nome)+'">'+c.icona+' '+escapeHtml(c.nome)+'</option>';}).join('');
  var h='<div class="solo-form-card">';
  // form nuova ricorrente
  h+='<div class="solo-tipo-toggle">'
    +'<button class="solo-tipo-btn'+(soloRicTipo==="uscita"?" on-uscita":"")+'" onclick="soloRicSetTipo(\'uscita\')">➖ Uscita</button>'
    +'<button class="solo-tipo-btn'+(soloRicTipo==="entrata"?" on-entrata":"")+'" onclick="soloRicSetTipo(\'entrata\')">➕ Entrata</button>'
    +'</div>';
  h+='<input class="inp" type="text" id="solo-ric-nome" placeholder="Nome (es. Affitto, Stipendio)" style="width:100%;margin-bottom:10px;">';
  h+='<div class="input-row"><div class="inp-euro-wrap"><input class="inp inp-euro" type="number" id="solo-ric-imp" placeholder="0.00" min="0" step="0.01" inputmode="decimal"><button type="button" class="btn-calc-icon" onclick="openCalc(\'solo-ric-imp\')">🧮</button></div>'
    +'<select class="inp" id="solo-ric-cat" style="flex:1;">'+catOpts+'</select></div>';
  // frequenza
  h+='<div class="solo-freq-row"><span>Ogni</span>'
    +'<input class="inp solo-freq-n" type="number" id="solo-ric-ogni" value="1" min="1" step="1" inputmode="numeric">'
    +'<select class="inp solo-freq-u" id="solo-ric-unita">'
    +'<option value="giorni">giorni</option><option value="settimane">settimane</option>'
    +'<option value="mesi" selected>mesi</option><option value="anni">anni</option></select></div>';
  h+='<div class="solo-freq-row"><span>Prima scadenza</span>'
    +'<input class="inp" type="date" id="solo-ric-scad" value="'+soloOggiISO()+'" style="flex:1;"></div>';
  h+='<button class="solo-add-btn" onclick="soloAddRicorrente()">🔁 Aggiungi ricorrente</button>';
  h+='</div>';
  // lista ricorrenti
  h+='<div class="solo-storico"><div class="solo-storico-head">Le tue ricorrenti</div>';
  if(!(soloData.ricorrenti||[]).length){
    h+='<div class="empty"><span class="e-icon">🔁</span>Nessuna ricorrente.<br>Mutuo, stipendio, bollo... aggiungile qui!</div>';
  } else {
    h+=soloData.ricorrenti.map(function(r){
      var entrata=r.tipo==="entrata";
      var scaduta=soloRicScaduta(r);
      var ic=soloIconaCat(r.categoria);
      return '<div class="solo-voce '+(entrata?"entrata":"uscita")+(scaduta?" scaduta":"")+'">'
        +'<div class="solo-voce-cat">'+ic+'</div>'
        +'<div class="solo-voce-body">'
        +'<div class="solo-voce-nota">'+escapeHtml(r.nome)+'</div>'
        +'<div class="solo-voce-data">ogni '+r.ogniQuanto+' '+UNITA_LABEL[r.unita]+' · prossima: '+fmt(r.prossimaScadenza)+'</div>'
        +'</div>'
        +'<div class="solo-voce-imp '+(entrata?"pos":"neg")+'">'+(entrata?"+":"−")+eur(r.importo)+'</div>'
        +(scaduta
          ? '<button class="solo-ric-paga" onclick="soloPagaRicorrente(\''+r.id+'\')" title="Registra e avanza">✓</button>'
          : '')
        +(soloRicDelId===r.id
          ? '<div class="solo-voce-confirm"><button class="svc-si" onclick="soloDelRicorrente(\''+r.id+'\')">Sì</button><button class="svc-no" onclick="soloRicDelAnnulla()">No</button></div>'
          : '<button class="solo-voce-del" onclick="soloRicDelChiedi(\''+r.id+'\')">🗑️</button>')
        +'</div>';
    }).join('');
  }
  h+='</div>';
  return h;
}

function soloRicSetTipo(t){ soloRicTipo=t; renderSolo(); }
function soloOggiISO(){ var d=new Date(); return d.toISOString().slice(0,10); }
function soloRicScaduta(r){
  if(!r.prossimaScadenza) return false;
  var oggi=new Date(); oggi.setHours(23,59,59,999);
  return new Date(r.prossimaScadenza)<=oggi;
}

// Calcola la prossima scadenza avanzando di (ogniQuanto × unita) da una data
function soloAvanzaData(iso, ogni, unita){
  var d=new Date(iso);
  if(unita==="giorni") d.setDate(d.getDate()+ogni);
  else if(unita==="settimane") d.setDate(d.getDate()+ogni*7);
  else if(unita==="mesi") d.setMonth(d.getMonth()+ogni);
  else if(unita==="anni") d.setFullYear(d.getFullYear()+ogni);
  return d.toISOString().slice(0,10);
}

async function soloAddRicorrente(){
  var nome=document.getElementById("solo-ric-nome").value.trim();
  var imp=parseFloat(document.getElementById("solo-ric-imp").value);
  var cat=document.getElementById("solo-ric-cat").value||"Altro";
  var ogni=parseInt(document.getElementById("solo-ric-ogni").value)||1;
  var unita=document.getElementById("solo-ric-unita").value||"mesi";
  var scad=document.getElementById("solo-ric-scad").value||soloOggiISO();
  if(!nome){ document.getElementById("solo-ric-nome").focus(); return; }
  if(!imp||imp<=0){ document.getElementById("solo-ric-imp").focus(); return; }
  var r={id:Date.now().toString(),proprietario:soloChi,nome:nome,tipo:soloRicTipo,importo:imp,categoria:cat,ogniQuanto:ogni,unita:unita,prossimaScadenza:scad};
  soloData.ricorrenti.push(r);
  soloData.ricorrenti.sort(function(a,b){return (a.prossimaScadenza||"").localeCompare(b.prossimaScadenza||"");});
  vibra(30);
  renderSolo();
  try{
    await post({action:"addSoloRicorrente",ric:r});
  }catch(e){
    soloData.ricorrenti=soloData.ricorrenti.filter(function(x){return x.id!==r.id;});
    renderSolo(); dot("err","Errore salvataggio");
  }
}

// Paga una ricorrente scaduta: crea una voce nel registro e avanza la scadenza
async function soloPagaRicorrente(id){
  var r=soloData.ricorrenti.find(function(x){return x.id===id;});
  if(!r) return;
  var nuovaScad=soloAvanzaData(r.prossimaScadenza, r.ogniQuanto, r.unita);
  var v={id:Date.now().toString(),proprietario:soloChi,tipo:r.tipo,importo:r.importo,categoria:r.categoria,nota:r.nome,data:new Date().toISOString(),origine:"ric:"+r.id};
  // optimistic: aggiungo la voce e avanzo la scadenza
  soloData.voci.unshift(v);
  r.prossimaScadenza=nuovaScad;
  soloData.ricorrenti.sort(function(a,b){return (a.prossimaScadenza||"").localeCompare(b.prossimaScadenza||"");});
  vibra([20,40,20]);
  renderSolo();
  try{
    await post({action:"addSoloVoce",voce:v});
    await post({action:"updateSoloRicorrenteScadenza",id:r.id,prossimaScadenza:nuovaScad});
  }catch(e){ dot("err","Errore"); load&&load(); }
}

function soloRicDelChiedi(id){ soloRicDelId=id; renderSolo(); }
function soloRicDelAnnulla(){ soloRicDelId=null; renderSolo(); }
async function soloDelRicorrente(id){
  var backup=soloData.ricorrenti.slice();
  soloData.ricorrenti=soloData.ricorrenti.filter(function(x){return x.id!==id;});
  soloRicDelId=null; vibra(20); renderSolo();
  try{ await post({action:"deleteSoloRicorrente",id:id}); }
  catch(e){ soloData.ricorrenti=backup; renderSolo(); dot("err","Errore"); }
}

// ── GESTIONE CATEGORIE ──
function openSoloCategorie(){
  soloRenderCategorieModal();
  document.getElementById("modal-solo-cat").classList.add("open");
}
function closeSoloCategorie(){ document.getElementById("modal-solo-cat").classList.remove("open"); }
function soloRenderCategorieModal(){
  var body=document.getElementById("modal-solo-cat-body");
  var cats=soloData.categorie||[];
  var h='<div class="solo-cat-list">';
  h+=cats.map(function(c,idx){
    return '<div class="solo-cat-item">'
      +'<div class="solo-cat-ord"><button class="solo-cat-arr" onclick="soloCatSposta(\''+c.id+'\',-1)"'+(idx===0?' disabled':'')+'>▲</button>'
      +'<button class="solo-cat-arr" onclick="soloCatSposta(\''+c.id+'\',1)"'+(idx===cats.length-1?' disabled':'')+'>▼</button></div>'
      +'<button class="solo-cat-ic" onclick="soloCatCambiaIcona(\''+c.id+'\')" title="Cambia icona">'+c.icona+'</button>'
      +'<input class="inp solo-cat-nome" value="'+escapeHtml(c.nome)+'" onchange="soloCatRinomina(\''+c.id+'\',this.value)"'+(c.protetta?' readonly':'')+'>'
      +(c.protetta
        ? '<span class="solo-cat-lock" title="Categoria di sistema">🔒</span>'
        : (soloCatDelId===c.id
          ? '<span class="solo-voce-confirm"><button class="svc-si" onclick="soloCatElimina(\''+c.id+'\')">Sì</button><button class="svc-no" onclick="soloCatDelAnnulla()">No</button></span>'
          : '<button class="solo-voce-del" onclick="soloCatDelChiedi(\''+c.id+'\')">🗑️</button>'))
      +'</div>';
  }).join('');
  h+='</div>';
  h+='<div class="solo-cat-add"><button class="solo-add-btn" onclick="soloCatNuova()">➕ Nuova categoria</button></div>';
  body.innerHTML=h;
}

async function soloCatNuova(){
  var maxOrd=soloData.categorie.reduce(function(m,c){return Math.max(m,c.ordine||0);},0);
  var c={id:"c"+Date.now(),proprietario:soloChi,icona:"📌",nome:"Nuova",ordine:maxOrd+1};
  soloData.categorie.push(c);
  soloRenderCategorieModal();
  try{ await post({action:"addSoloCategoria",cat:c}); }
  catch(e){ soloData.categorie=soloData.categorie.filter(function(x){return x.id!==c.id;}); soloRenderCategorieModal(); }
}
async function soloCatRinomina(id,nome){
  var c=soloData.categorie.find(function(x){return x.id===id;}); if(!c) return;
  c.nome=nome.trim()||c.nome;
  try{ await post({action:"updateSoloCategoria",id:id,icona:c.icona,nome:c.nome}); }catch(e){}
}
var SOLO_ICONE=["📌","🏠","💼","📋","🏍️","🐾","🍯","🛒","🍔","⛽","💊","🎁","✈️","🎬","📱","💡","👕","🐶","☕","🏋️"];
async function soloCatCambiaIcona(id){
  var c=soloData.categorie.find(function(x){return x.id===id;}); if(!c) return;
  var i=SOLO_ICONE.indexOf(c.icona);
  c.icona=SOLO_ICONE[(i+1)%SOLO_ICONE.length];  // cicla tra le icone disponibili
  soloRenderCategorieModal();
  try{ await post({action:"updateSoloCategoria",id:id,icona:c.icona,nome:c.nome}); }catch(e){}
}
// Sposta una categoria su (-1) o giù (+1) scambiando l'ordine con la vicina
async function soloCatSposta(id, dir){
  var cats=soloData.categorie;
  var i=cats.findIndex(function(x){return x.id===id;});
  var j=i+dir;
  if(i<0 || j<0 || j>=cats.length) return;
  var a=cats[i], b=cats[j];
  var tmp=a.ordine; a.ordine=b.ordine; b.ordine=tmp;  // scambio ordine
  cats.sort(function(x,y){return (x.ordine||0)-(y.ordine||0);});
  soloRenderCategorieModal();
  try{
    await post({action:"updateSoloCategoriaOrdine",id:a.id,ordine:a.ordine});
    await post({action:"updateSoloCategoriaOrdine",id:b.id,ordine:b.ordine});
  }catch(e){}
}

function soloCatDelChiedi(id){ soloCatDelId=id; soloRenderCategorieModal(); }
function soloCatDelAnnulla(){ soloCatDelId=null; soloRenderCategorieModal(); }
async function soloCatElimina(id){
  var backup=soloData.categorie.slice();
  soloData.categorie=soloData.categorie.filter(function(x){return x.id!==id;});
  soloCatDelId=null; soloRenderCategorieModal();
  try{ await post({action:"deleteSoloCategoria",id:id}); }
  catch(e){ soloData.categorie=backup; soloRenderCategorieModal(); }
}

function soloLock(){
  soloSbloccato=false;
  soloChi=null;
  _soloPinBuffer="";
  soloData={voci:[], ricorrenti:[], chiusure:[], categorie:[]};
  renderSolo();
}

// Cambia PIN: azzera il PIN dell'orso corrente e torna alla schermata
// "imposta nuovo PIN" (senza uscire dall'identità).
function soloCambiaPin(){
  if(!soloChi) return;
  var chiCorrente=soloChi;
  // Forzo lo stato "primo accesso" per questo orso: niente pin_hash → set
  soloProfili[chiCorrente]=null;
  soloSbloccato=false;
  _soloPinBuffer="";
  // resto sull'orso scelto, così il gate mostra subito "imposta PIN"
  soloChi=chiCorrente;
  renderSolo();
}

// ════════════════════════════════════════════════════════
//  ORSO SOLO — Grafici e Chiusure (L-2)
// ════════════════════════════════════════════════════════
var soloGrafVista="cat";

function openSoloGrafici(){
  document.getElementById("modal-solo-grafici").classList.add("open");
  setSoloGrafVista("cat");
}
function closeSoloGrafici(){ document.getElementById("modal-solo-grafici").classList.remove("open"); }
function setSoloGrafVista(v){
  soloGrafVista=v;
  document.querySelectorAll(".solo-graf-btn").forEach(function(b){ b.classList.toggle("active", b.dataset.gv===v); });
  if(v==="cat") soloRenderGraficoCat();
  else soloRenderGraficoMesi();
}

// Palette per le fette (ciclica)
var SOLO_PALETTE=["#F4A827","#A83225","#4A7C40","#6B3FA0","#C87D0A","#6B3F1F","#89C082","#B89CD8","#E08078","#4A2A0F"];

// Grafico a torta delle USCITE per categoria
function soloRenderGraficoCat(){
  var body=document.getElementById("solo-graf-body");
  // sommo le uscite per categoria
  var perCat={};
  soloData.voci.forEach(function(v){
    if(v.tipo!=="uscita") return;
    perCat[v.categoria]=(perCat[v.categoria]||0)+v.importo;
  });
  var voci=Object.keys(perCat).map(function(k){return{nome:k,val:Math.round(perCat[k]*100)/100};});
  voci.sort(function(a,b){return b.val-a.val;});
  var tot=voci.reduce(function(a,x){return a+x.val;},0);
  if(tot<=0){
    body.innerHTML='<div class="grafico-empty">Nessuna uscita ancora registrata.</div>';
    return;
  }
  // canvas torta
  var h='<div class="solo-graf-canvas-wrap"><canvas id="solo-graf-canvas"></canvas></div>';
  // legenda
  h+='<div class="solo-graf-legenda">';
  voci.forEach(function(v,i){
    var perc=Math.round(v.val/tot*100);
    var col=SOLO_PALETTE[i%SOLO_PALETTE.length];
    var ic=soloIconaCat(v.nome);
    h+='<div class="solo-graf-leg-row"><span class="solo-graf-dot" style="background:'+col+'"></span>'
      +'<span class="solo-graf-leg-nome">'+ic+' '+escapeHtml(v.nome)+'</span>'
      +'<span class="solo-graf-leg-val">'+eur(v.val)+' · '+perc+'%</span></div>';
  });
  h+='</div>';
  body.innerHTML=h;
  setTimeout(function(){ soloDisegnaTorta(voci, tot); }, 30);
}

function soloDisegnaTorta(voci, tot){
  var canvas=document.getElementById("solo-graf-canvas");
  if(!canvas) return;
  var ctx=canvas.getContext("2d");
  var dpr=window.devicePixelRatio||1;
  var size=Math.min(200, canvas.parentElement.offsetWidth-20);
  canvas.width=size*dpr; canvas.height=size*dpr;
  canvas.style.width=size+"px"; canvas.style.height=size+"px";
  ctx.scale(dpr,dpr);
  var cx=size/2, cy=size/2, r=size/2-6;
  var ang=-Math.PI/2;
  voci.forEach(function(v,i){
    var fetta=(v.val/tot)*Math.PI*2;
    ctx.beginPath(); ctx.moveTo(cx,cy);
    ctx.arc(cx,cy,r,ang,ang+fetta); ctx.closePath();
    ctx.fillStyle=SOLO_PALETTE[i%SOLO_PALETTE.length]; ctx.fill();
    ang+=fetta;
  });
  // foro centrale (ciambella)
  ctx.beginPath(); ctx.arc(cx,cy,r*0.55,0,Math.PI*2);
  ctx.fillStyle=getComputedStyle(document.body).getPropertyValue("--card")||"#fff";
  ctx.fill();
}

// Grafico a barre: saldo (entrate-uscite) per mese chiuso
function soloRenderGraficoMesi(){
  var body=document.getElementById("solo-graf-body");
  var chiusure=(soloData.chiusure||[]).slice().reverse(); // cronologico
  if(!chiusure.length){
    body.innerHTML='<div class="grafico-empty">Nessun mese ancora chiuso.<br>Usa 📸 Chiudi mese per salvare una fotografia.</div>';
    return;
  }
  var maxV=Math.max.apply(null, chiusure.map(function(c){return Math.max(c.totEntrate,c.totUscite);}));
  if(maxV<=0) maxV=1;
  var h='<div class="solo-graf-barre">';
  chiusure.forEach(function(c){
    var hE=Math.round(c.totEntrate/maxV*100);
    var hU=Math.round(c.totUscite/maxV*100);
    h+='<div class="solo-graf-bar-col">'
      +'<div class="solo-graf-bars">'
      +'<div class="solo-graf-bar entrata" style="height:'+hE+'%" title="Entrate '+eur(c.totEntrate)+'"></div>'
      +'<div class="solo-graf-bar uscita" style="height:'+hU+'%" title="Uscite '+eur(c.totUscite)+'"></div>'
      +'</div>'
      +'<div class="solo-graf-bar-lbl">'+escapeHtml(c.mese.split(" ")[0].slice(0,3))+'</div>'
      +'</div>';
  });
  h+='</div>';
  h+='<div class="solo-graf-legenda" style="justify-content:center;display:flex;gap:16px;">'
    +'<span><span class="solo-graf-dot" style="background:var(--moss)"></span> Entrate</span>'
    +'<span><span class="solo-graf-dot" style="background:var(--berry)"></span> Uscite</span></div>';
  body.innerHTML=h;
}

// ── CHIUSURA SOLO (fotografia informativa) ──
function openSoloChiudi(){
  var ent=0, usc=0;
  soloData.voci.forEach(function(v){ if(v.tipo==="entrata") ent+=v.importo; else usc+=v.importo; });
  ent=Math.round(ent*100)/100; usc=Math.round(usc*100)/100;
  var sal=Math.round((ent-usc)*100)/100;
  document.getElementById("solo-chiudi-anteprima").innerHTML=
    '<div class="riepilogo-mese"><div class="riepilogo-mese-row"><span>➕ Entrate</span><span>'+eur(ent)+'</span></div>'
    +'<div class="riepilogo-mese-row"><span>➖ Uscite</span><span>'+eur(usc)+'</span></div>'
    +'<div class="riepilogo-mese-row tot"><span>💰 Saldo</span><span>'+eur(sal)+'</span></div></div>';
  document.getElementById("solo-chiudi-mese").value=new Date().toLocaleDateString("it-IT",{month:"long",year:"numeric"});
  document.getElementById("modal-solo-chiudi").classList.add("open");
}
function closeSoloChiudi(){ document.getElementById("modal-solo-chiudi").classList.remove("open"); }

async function soloConfermaChiudi(){
  var mese=document.getElementById("solo-chiudi-mese").value.trim()||new Date().toLocaleDateString("it-IT",{month:"long",year:"numeric"});
  var ent=0, usc=0;
  soloData.voci.forEach(function(v){ if(v.tipo==="entrata") ent+=v.importo; else usc+=v.importo; });
  ent=Math.round(ent*100)/100; usc=Math.round(usc*100)/100;
  var ch={id:Date.now().toString(),proprietario:soloChi,mese:mese,totEntrate:ent,totUscite:usc,saldo:Math.round((ent-usc)*100)/100,data:new Date().toISOString()};
  soloData.chiusure.unshift(ch);
  closeSoloChiudi();
  vibra([20,40,20]);
  try{ await post({action:"addSoloChiusura",ch:ch}); dot("ok","Fotografia salvata 📸"); }
  catch(e){ soloData.chiusure=soloData.chiusure.filter(function(x){return x.id!==ch.id;}); dot("err","Errore"); }
}
