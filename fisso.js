// ════════════════════════════════════════════════════════
//  La Tana degli Orsi — fisso.js
//  Tab "Fisso" della cassa comune: spese fisse mensili,
//  spese previste (con scadenze e pagamento Luca/Ale/bancomat)
//  e riepilogo mensile. UI ottimistica con rollback.
//  Dipende da: utils.js + api.js + ui.js (render/statoVuoto/
//  escapeHtml/vibra).
//  Estratto da ui.js nella sessione di refactoring.
// ════════════════════════════════════════════════════════

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
  var editId=editFissaId;   // catturo PRIMA: closeNuovaFissa() azzera editFissaId
  closeNuovaFissa();

  if(editId){
    var f=S.fisse.find(function(x){return x.id===editId;});
    if(!f)return;
    var backup={nome:f.nome,importo:f.importo,icona:f.icona};
    f.nome=nome;f.importo=imp;f.icona=icona;
    renderFisse();renderRiepilogo();dot("","Salvataggio...");
    try{
      await post({action:"editFissa",id:editId,nome:nome,importo:imp,icona:icona});
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
  var editId=editPrevistaId;   // catturo PRIMA: closeNuovaPrevista() azzera editPrevistaId
  vibra(20);
  closeNuovaPrevista();

  if(editId){
    var p=S.previste.find(function(x){return x.id===editId;});
    if(!p)return;
    var backup={nome:p.nome,importo:p.importo,scadenza:p.scadenza};
    p.nome=nome;p.importo=imp;p.scadenza=scad;
    renderPreviste();dot("","Salvataggio...");
    try{
      await post({action:"editPrevista",id:editId,nome:nome,importo:imp,scadenza:scad});
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
    var backupPreviste=S.previste.slice();
    S.txs.push(t);
    // Rimuovo la prevista
    S.previste=S.previste.filter(function(x){return x.id!==id;});
    render();renderPreviste();dot("","Salvataggio...");
    aggiornaPulsePreviste();
    var txSalvata=false;
    try{
      await post({action:"addTransaction",id:t.id,chi:t.chi,importo:t.importo,nota:t.nota,data:t.data});
      txSalvata=true;
      await post({action:"deletePrevista",id:id});
      dot("ok","Sincronizzata 🐾");
    }catch(e){
      // rollback allo stato pre-pagamento: tolgo la transazione e ripristino la prevista
      S.txs=S.txs.filter(function(x){return x.id!==t.id;});
      S.previste=backupPreviste;
      // caso parziale: se la 1ª post era andata (transazione salvata) ma la 2ª no,
      // elimino la transazione dal server per non lasciare un movimento orfano
      if(txSalvata){ try{ await post({action:"deleteTransaction",id:t.id}); }catch(e2){} }
      render();renderPreviste();aggiornaPulsePreviste();
      dot("err","Errore — riprova");
    }
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
