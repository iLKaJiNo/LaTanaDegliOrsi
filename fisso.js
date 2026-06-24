// ════════════════════════════════════════════════════════
//  La Tana degli Orsi — fisso.js
//  Tab "Fisso" della cassa comune: spese fisse mensili,
//  spese ricorrenti (con scadenze e pagamento Luca/Ale/bancomat)
//  e riepilogo mensile. UI ottimistica con rollback.
//  Dipende da: utils.js + api.js + ui.js (render/statoVuoto/
//  escapeHtml/vibra).
//  Estratto da ui.js nella sessione di refactoring.
// ════════════════════════════════════════════════════════

// ── SPESE FISSE (condivise via GAS) ──
// Set icone per le spese fisse (congruente al tipo di spesa). Selettore a ciclo,
// stesso meccanismo delle categorie Solo.
var FISSE_ICONE = ["🏠","💡","🔥","📱","📺","🛡️","🛤️","🧮","📌"]; // mutuo, luce, gas, telefono, abbonamenti, altro
var fissaIconaSel = "🏠";
function fissaCiclaIcona(){
  var i=FISSE_ICONE.indexOf(fissaIconaSel);
  fissaIconaSel=FISSE_ICONE[(i+1)%FISSE_ICONE.length];  // cicla tra le icone
  var btn=document.getElementById("fissa-icona-btn");
  if(btn) btn.textContent=fissaIconaSel;
}

// ── Icone + toggle ricorrenza per le spese ricorrenti comuni ──
// Set icone a ciclo (stesso meccanismo delle fisse). Default '📅'.
var RIC_ICONE = ["📅","🚗","🛡️","🏠","💡","🎁","⌛","🛍️","📌"]; // scadenza, auto, assicurazione, casa, utenze, regalo, altro
var ricIconaSel = "📅";
function ricCiclaIcona(){
  var i=RIC_ICONE.indexOf(ricIconaSel);
  ricIconaSel=RIC_ICONE[(i+1)%RIC_ICONE.length];  // cicla tra le icone
  var btn=document.getElementById("ricorrente-icona-btn");
  if(btn) btn.textContent=ricIconaSel;
}
// Mostra/nasconde i blocchi ricorrenza in base al toggle "Si ripete"
function ricorrenteToggleRic(){
  var on=document.getElementById("ricorrente-ric").checked;
  document.getElementById("ricorrente-freq-row").style.display = on?"":"none";
  document.getElementById("ricorrente-fine-row").style.display = on?"":"none";
  if(!on) document.getElementById("ricorrente-fine-extra").style.display="none";
  else ricorrenteFineChange();
  document.getElementById("ricorrente-scad-lbl").textContent = on?"📅 Prossima scadenza":"📅 Scadenza";
}
// Mostra/nasconde i campi extra in base al tipo di fine scelto (mirror Solo)
function ricorrenteFineChange(){
  var tipo=document.getElementById("ricorrente-fine").value;
  document.getElementById("ricorrente-fine-extra").style.display = (tipo==="mai")?"none":"flex";
  document.getElementById("ricorrente-fine-data").style.display  = (tipo==="data")?"":"none";
  document.getElementById("ricorrente-fine-volte").style.display = (tipo==="volte")?"":"none";
  document.getElementById("ricorrente-fine-volte-lbl").style.display = (tipo==="volte")?"":"none";
}

function openNuovaFissa(id){
  editFissaId=id||null;
  var f=id?S.fisse.find(function(x){return x.id===id;}):null;
  document.getElementById("modal-fissa-titolo").textContent=f?"Modifica spesa fissa":"Nuova spesa fissa";
  document.getElementById("fissa-nome").value=f?f.nome:"";
  document.getElementById("fissa-imp").value=f?f.importo:"";
  fissaIconaSel = f ? f.icona : "🏠";
  document.getElementById("fissa-icona-btn").textContent = fissaIconaSel;
  document.getElementById("modal-fissa").classList.add("open");
  setTimeout(function(){document.getElementById("fissa-nome").focus();},80);
}
function closeNuovaFissa(){document.getElementById("modal-fissa").classList.remove("open");editFissaId=null;}

async function salvaFissa(){
  var nome=document.getElementById("fissa-nome").value.trim();
  var imp=parseFloat(document.getElementById("fissa-imp").value);
  var icona=fissaIconaSel;
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
// ── SPESE RICORRENTI ──
// ═══════════════════════════════════════════════════════════

// Toggle tra "Fisse" e "Ricorrenti" nella tab Fisse
function switchFisseSeg(seg){
  fisseSegmento=seg;
  document.querySelectorAll(".fisse-toggle-btn").forEach(function(b){
    b.classList.toggle("active", b.dataset.seg===seg);
  });
  document.getElementById("seg-fisse").style.display = seg==="fisse"?"":"none";
  document.getElementById("seg-ricorrenti").style.display   = seg==="ricorrenti"?"":"none";
  if(seg==="ricorrenti") renderRicorrenti();
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

function renderRicorrenti(){
  var el=document.getElementById("ricorrenti-list");
  if(!el) return;
  aggiornaPulseRicorrenti();
  // Banner scadenze: mostro in cima se ci sono ricorrenti scadute o in scadenza oggi
  var bannerHtml="";
  var scadute=ricorrentiScadute();
  if(scadute.length){
    var nomi=scadute.map(function(p){return escapeHtml(p.nome);}).join(", ");
    bannerHtml='<div class="ricorrenti-banner">⏰ <strong>'+(scadute.length===1?"1 spesa scaduta o in scadenza oggi":scadute.length+" spese scadute o in scadenza oggi")+'</strong><br>'+nomi+'</div>';
  }
  // Ricorrenti pagate col bancomat (in attesa di chiusura mese)
  var bancomat=(S.ricorrenti||[]).filter(function(p){return p.stato==="pagata_bancomat";});
  // Blocco "pagate bancomat" da mostrare in fondo
  var bancomatHtml="";
  if(bancomat.length){
    var totB=bancomat.reduce(function(a,p){return a+p.importo;},0);
    bancomatHtml='<div class="bancomat-section">';
    bancomatHtml+='<div class="bancomat-head">💳 Pagate col Conto Comune BPM · in attesa di chiusura</div>';
    bancomat.forEach(function(p){
      bancomatHtml+='<div class="ricorrente-item bancomat-item">';
      bancomatHtml+='<span class="fissa-icon">'+(p.icona||"📅")+'</span>';
      bancomatHtml+='<div class="ricorrente-body"><div class="ricorrente-nome">✓ '+escapeHtml(p.nome)+'</div>';
      bancomatHtml+='<div class="ricorrente-scad-badge">'+fmtScadenza(p.scadenza)+'</div></div>';
      bancomatHtml+='<div class="ricorrente-imp">'+eur(p.importo)+'</div>';
      bancomatHtml+='<div class="ricorrente-actions"><button class="btn-annulla-bancomat" onclick="annullaPagamentoBancomat(\''+p.id+'\')" title="Annulla pagamento">↩️ Annulla</button></div>';
      bancomatHtml+='</div>';
    });
    bancomatHtml+='<div class="bancomat-tot">Totale Conto Comune BPM: <strong>'+eur(totB)+'</strong> — confluirà nelle fisse a fine mese</div>';
    bancomatHtml+='</div>';
  }
  // Mostro le ricorrenti ancora "attive"
  var attive=(S.ricorrenti||[]).filter(function(p){return p.stato==="attiva";});
  if(!attive.length){
    el.innerHTML=bannerHtml+(bancomat.length?"":'<div class="ricorrenti-empty">'+statoVuoto("ricorrenti","4rem")+'</div>')+bancomatHtml;
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
    var conclusa=(p.attiva===false);
    var g=conclusa?null:giorniAScadenza(p.scadenza);
    var cls=classeScadenza(g);
    var ic=p.icona||"📅";
    var freq=p.ricorrente?("ogni "+p.ogniQuanto+" "+(UNITA_LABEL[p.unita]||p.unita)+" · "):"";
    var badge=conclusa?"conclusa":(freq+fmtScadenza(p.scadenza)+(g!==null?' · '+testoScadenza(g):""));
    h+='<div class="ricorrente-item '+cls+(conclusa?" conclusa":"")+'">';
    h+='<span class="fissa-icon">'+ic+'</span>';
    h+='<div class="ricorrente-body">';
    h+='<div class="ricorrente-nome">'+escapeHtml(p.nome)+'</div>';
    h+='<div class="ricorrente-scad-badge '+cls+'">'+badge+'</div>';
    h+='</div>';
    h+='<div class="ricorrente-imp">'+eur(p.importo)+'</div>';
    h+='<div class="ricorrente-actions">';
    if(!conclusa) h+='<button class="btn-paga-ricorrente" onclick="openPagaRicorrente(\''+p.id+'\')" title="Segna pagata">✓ Paga</button>';
    h+='<button class="btn-edit-fissa" onclick="openNuovaRicorrente(\''+p.id+'\')" title="Modifica">✏️</button>';
    h+='<button class="btn-del-fissa" onclick="toggleDelRicorrente(\''+p.id+'\')" title="Elimina">×</button>';
    h+='</div>';
    if(delRicorrenteConfirmId===p.id){
      h+='<div class="elimina-arch-confirm"><span>Eliminare "'+escapeHtml(p.nome)+'"?</span><button class="btn-yes" onclick="eliminaRicorrente(\''+p.id+'\')">Sì</button><button class="btn-no" onclick="toggleDelRicorrente(\''+p.id+'\')">No</button></div>';
    }
    h+='</div>';
  });
  el.innerHTML=bannerHtml+h+bancomatHtml;
}

// Annulla un pagamento col bancomat: riporta la ricorrente a "attiva"
async function annullaPagamentoBancomat(id){
  var p=S.ricorrenti.find(function(x){return x.id===id;});
  if(!p)return;
  vibra(20);
  p.stato="attiva";
  renderRicorrenti();dot("","Salvataggio...");
  try{
    await post({action:"setStatoRicorrente",id:id,stato:"attiva"});
    dot("ok","Sincronizzata 🐾");
  }catch(e){ dot("err","Errore — riprova"); p.stato="pagata_bancomat"; renderRicorrenti(); }
}
function openNuovaRicorrente(id){
  editRicorrenteId=id||null;
  var p=id?S.ricorrenti.find(function(x){return x.id===id;}):null;
  document.getElementById("modal-ricorrente-titolo").textContent=p?"Modifica spesa ricorrente":"Nuova spesa ricorrente";
  document.getElementById("ricorrente-nome").value=p?p.nome:"";
  document.getElementById("ricorrente-imp").value=p?p.importo:"";
  // Il campo <input type=date> accetta SOLO "YYYY-MM-DD": normalizzo
  // (la scadenza dal server può essere un ISO completo con ora/Z).
  document.getElementById("ricorrente-scad").value=p?isoDateInput(p.scadenza):"";
  // icona a rotazione (default '📅')
  ricIconaSel = (p && p.icona) ? p.icona : "📅";
  document.getElementById("ricorrente-icona-btn").textContent = ricIconaSel;
  // campi ricorrenza (caricati dal PUNTO 3; guardie per una-tantum/legacy)
  var ric = !!(p && p.ricorrente);
  document.getElementById("ricorrente-ric").checked = ric;
  document.getElementById("ricorrente-ogni").value = (p && p.ogniQuanto) ? p.ogniQuanto : 1;
  document.getElementById("ricorrente-unita").value = (p && p.unita) ? p.unita : "mesi";
  var fineTipo = (p && p.volteRimaste!=null) ? "volte" : ((p && p.fineData) ? "data" : "mai");
  document.getElementById("ricorrente-fine").value = fineTipo;
  document.getElementById("ricorrente-fine-data").value = (p && p.fineData) ? isoDateInput(p.fineData) : "";
  document.getElementById("ricorrente-fine-volte").value = (p && p.volteRimaste!=null) ? p.volteRimaste : 12;
  ricorrenteToggleRic();
  document.getElementById("modal-ricorrente").classList.add("open");
  setTimeout(function(){document.getElementById("ricorrente-nome").focus();},80);
}
function closeNuovaRicorrente(){document.getElementById("modal-ricorrente").classList.remove("open");editRicorrenteId=null;}

async function salvaRicorrente(){
  var nome=document.getElementById("ricorrente-nome").value.trim();
  var imp=parseFloat(document.getElementById("ricorrente-imp").value);
  var scad=document.getElementById("ricorrente-scad").value;
  if(!nome||!imp||imp<=0)return;
  var icona=ricIconaSel;
  // modello ricorrenza dal form
  var ricorrente=document.getElementById("ricorrente-ric").checked;
  // Una ricorrente che SI RIPETE deve avere una scadenza di partenza: se manca,
  // default a oggi (evita avanzaData su data vuota). Le una-tantum restano senza.
  if(ricorrente && !scad) scad=new Date().toISOString().slice(0,10);
  var ogniQuanto=ricorrente?(parseInt(document.getElementById("ricorrente-ogni").value)||1):1;
  var unita=ricorrente?(document.getElementById("ricorrente-unita").value||"mesi"):"mesi";
  var fineData=null, volteRimaste=null;
  if(ricorrente){
    var fineTipo=document.getElementById("ricorrente-fine").value;
    if(fineTipo==="data") fineData=document.getElementById("ricorrente-fine-data").value||null;
    if(fineTipo==="volte") volteRimaste=parseInt(document.getElementById("ricorrente-fine-volte").value)||1;
  }
  var editId=editRicorrenteId;   // catturo PRIMA: closeNuovaRicorrente() azzera editRicorrenteId
  vibra(20);
  closeNuovaRicorrente();

  if(editId){
    var p=S.ricorrenti.find(function(x){return x.id===editId;});
    if(!p)return;
    var backup={nome:p.nome,importo:p.importo,scadenza:p.scadenza,icona:p.icona,ricorrente:p.ricorrente,ogniQuanto:p.ogniQuanto,unita:p.unita,fineData:p.fineData,volteRimaste:p.volteRimaste,attiva:p.attiva};
    p.nome=nome;p.importo=imp;p.scadenza=scad;p.icona=icona;
    p.ricorrente=ricorrente;p.ogniQuanto=ogniQuanto;p.unita=unita;p.fineData=fineData;p.volteRimaste=volteRimaste;p.attiva=true;
    renderRicorrenti();dot("","Salvataggio...");
    try{
      await post({action:"editRicorrente",id:editId,nome:nome,importo:imp,scadenza:scad,icona:icona,ricorrente:ricorrente,ogniQuanto:ogniQuanto,unita:unita,fineData:fineData,volteRimaste:volteRimaste,attiva:true});
      dot("ok","Sincronizzata 🐾");
    }catch(e){
      dot("err","Errore salvataggio");
      p.nome=backup.nome;p.importo=backup.importo;p.scadenza=backup.scadenza;p.icona=backup.icona;
      p.ricorrente=backup.ricorrente;p.ogniQuanto=backup.ogniQuanto;p.unita=backup.unita;p.fineData=backup.fineData;p.volteRimaste=backup.volteRimaste;p.attiva=backup.attiva;
      renderRicorrenti();
    }
  }else{
    var newId=Date.now().toString();
    var nuova={id:newId,nome:nome,importo:imp,scadenza:scad,stato:"attiva",icona:icona,ricorrente:ricorrente,ogniQuanto:ogniQuanto,unita:unita,fineData:fineData,volteRimaste:volteRimaste,attiva:true,data:new Date().toISOString()};
    S.ricorrenti.push(nuova);
    renderRicorrenti();dot("","Salvataggio...");
    aggiornaPulseRicorrenti();
    try{
      await post({action:"addRicorrente",id:nuova.id,nome:nuova.nome,importo:nuova.importo,scadenza:nuova.scadenza,stato:"attiva",icona:icona,ricorrente:ricorrente,ogniQuanto:ogniQuanto,unita:unita,fineData:fineData,volteRimaste:volteRimaste,attiva:true,data:nuova.data});
      dot("ok","Sincronizzata 🐾");
    }catch(e){
      dot("err","Errore salvataggio");
      S.ricorrenti=S.ricorrenti.filter(function(x){return x.id!==newId;});
      renderRicorrenti();
    }
  }
}

// Toggle della conferma inline
function toggleDelRicorrente(id){
  delRicorrenteConfirmId = delRicorrenteConfirmId===id ? null : id;
  renderRicorrenti();
}
// Esegue l'eliminazione (dopo conferma inline)
async function eliminaRicorrente(id){
  vibra([25,40,25]);
  delRicorrenteConfirmId=null;
  var backup=S.ricorrenti.slice();
  S.ricorrenti=S.ricorrenti.filter(function(x){return x.id!==id;});
  renderRicorrenti();dot("","Salvataggio...");
  aggiornaPulseRicorrenti();
  try{
    await post({action:"deleteRicorrente",id:id});
    dot("ok","Sincronizzata 🐾");
  }catch(e){
    dot("err","Errore eliminazione");
    S.ricorrenti=backup;
    renderRicorrenti();
  }
}

// ── Segna pagata ──
function openPagaRicorrente(id){
  pagaRicorrenteId=id;
  var p=S.ricorrenti.find(function(x){return x.id===id;});
  var desc=document.getElementById("paga-ricorrente-desc");
  if(p&&desc) desc.textContent='"'+p.nome+'" — '+eur(p.importo)+". Chi l'ha pagata?";
  document.getElementById("modal-paga-ricorrente").classList.add("open");
}
function closePagaRicorrente(){document.getElementById("modal-paga-ricorrente").classList.remove("open");pagaRicorrenteId=null;}

// Avanza una ricorrente dopo un pagamento (mirror Solo): nuova scadenza,
// decrementa volteRimaste, conclude (attiva=false) a fine corsa o oltre fineData.
function avanzaRicorrente(p){
  var nuovaScad=avanzaData(p.scadenza,p.ogniQuanto,p.unita);
  var volte=p.volteRimaste, concludi=false;
  if(volte!=null){ volte=volte-1; if(volte<=0) concludi=true; }
  if(p.fineData && new Date(nuovaScad)>new Date(p.fineData)) concludi=true;
  return concludi ? {scadenza:p.scadenza,volteRimaste:volte,attiva:false}
                  : {scadenza:nuovaScad,volteRimaste:volte,attiva:true};
}

// modo: "Luca" | "Ale" | "bancomat"
async function pagaRicorrente(modo){
  var id=pagaRicorrenteId;
  var p=S.ricorrenti.find(function(x){return x.id===id;});
  if(!p){closePagaRicorrente();return;}
  vibra(30);
  closePagaRicorrente();

  if(modo==="Luca"||modo==="Ale"){
    // Pagamento da cassa comune: diventa una transazione.
    var t={id:Date.now().toString(),chi:modo,importo:p.importo,nota:p.nome+" (ricorrente)",origine:"ricorrente",data:new Date().toISOString()};
    var backupRicorrenti=S.ricorrenti.slice();
    var av = p.ricorrente ? avanzaRicorrente(p) : null;
    var backupP = p.ricorrente ? {scadenza:p.scadenza,volteRimaste:p.volteRimaste,attiva:p.attiva} : null;
    S.txs.push(t);
    if(p.ricorrente){
      // RICORRENTE: la voce resta e avanza
      p.scadenza=av.scadenza; p.volteRimaste=av.volteRimaste; p.attiva=av.attiva;
    } else {
      // UNA-TANTUM: la voce sparisce
      S.ricorrenti=S.ricorrenti.filter(function(x){return x.id!==id;});
    }
    render();renderRicorrenti();dot("","Salvataggio...");
    aggiornaPulseRicorrenti();
    var txSalvata=false;
    try{
      await post({action:"addTransaction",id:t.id,chi:t.chi,importo:t.importo,nota:t.nota,origine:t.origine,data:t.data});
      txSalvata=true;
      if(p.ricorrente){
        await post({action:"editRicorrente",id:id,nome:p.nome,importo:p.importo,scadenza:p.scadenza,icona:p.icona,ricorrente:true,ogniQuanto:p.ogniQuanto,unita:p.unita,fineData:p.fineData,volteRimaste:p.volteRimaste,attiva:p.attiva});
      } else {
        await post({action:"deleteRicorrente",id:id});
      }
      dot("ok","Sincronizzata 🐾");
    }catch(e){
      // rollback: tolgo la transazione e ripristino la ricorrente
      S.txs=S.txs.filter(function(x){return x.id!==t.id;});
      if(p.ricorrente){ p.scadenza=backupP.scadenza; p.volteRimaste=backupP.volteRimaste; p.attiva=backupP.attiva; }
      else { S.ricorrenti=backupRicorrenti; }
      // parziale: tx salvata ma 2ª post ko → elimino la tx orfana
      if(txSalvata){ try{ await post({action:"deleteTransaction",id:t.id}); }catch(e2){} }
      render();renderRicorrenti();aggiornaPulseRicorrenti();
      dot("err","Errore — riprova");
    }
  } else {
    // Bancomat (Conto Comune BPM).
    if(p.ricorrente){
      // RICORRENTE: l'occorrenza corrente resta pagata-BPM come istanza una-tantum,
      // la voce-template avanza alla prossima scadenza.
      var istId=Date.now().toString();
      var istanza={id:istId,nome:p.nome,importo:p.importo,scadenza:p.scadenza,stato:"pagata_bancomat",icona:p.icona,ricorrente:false,ogniQuanto:1,unita:"mesi",fineData:null,volteRimaste:null,attiva:true,data:new Date().toISOString()};
      var av2=avanzaRicorrente(p);
      var backupP2={scadenza:p.scadenza,volteRimaste:p.volteRimaste,attiva:p.attiva};
      S.ricorrenti.push(istanza);
      p.scadenza=av2.scadenza; p.volteRimaste=av2.volteRimaste; p.attiva=av2.attiva;
      renderRicorrenti();dot("","Salvataggio...");
      aggiornaPulseRicorrenti();
      var istSalvata=false;
      try{
        await post({action:"addRicorrente",id:istanza.id,nome:istanza.nome,importo:istanza.importo,scadenza:istanza.scadenza,stato:"pagata_bancomat",icona:istanza.icona,ricorrente:false,ogniQuanto:1,unita:"mesi",fineData:null,volteRimaste:null,attiva:true,data:istanza.data});
        istSalvata=true;
        await post({action:"editRicorrente",id:id,nome:p.nome,importo:p.importo,scadenza:p.scadenza,icona:p.icona,ricorrente:true,ogniQuanto:p.ogniQuanto,unita:p.unita,fineData:p.fineData,volteRimaste:p.volteRimaste,attiva:p.attiva});
        dot("ok","Sincronizzata 🐾");
      }catch(e){
        // rollback: tolgo l'istanza e ripristino il template
        S.ricorrenti=S.ricorrenti.filter(function(x){return x.id!==istId;});
        p.scadenza=backupP2.scadenza; p.volteRimaste=backupP2.volteRimaste; p.attiva=backupP2.attiva;
        // parziale: istanza salvata ma 2ª post ko → elimino l'istanza orfana
        if(istSalvata){ try{ await post({action:"deleteRicorrente",id:istId}); }catch(e2){} }
        renderRicorrenti();aggiornaPulseRicorrenti();
        dot("err","Errore — riprova");
      }
    } else {
      // UNA-TANTUM: comportamento attuale (cambia solo stato).
      p.stato="pagata_bancomat";
      renderRicorrenti();dot("","Salvataggio...");
      aggiornaPulseRicorrenti();
      try{
        await post({action:"setStatoRicorrente",id:id,stato:"pagata_bancomat"});
        dot("ok","Sincronizzata 🐾");
      }catch(e){ dot("err","Errore — riprova"); p.stato="attiva"; renderRicorrenti(); }
    }
  }
}

// ── Pulse sull'icona tab Fisse + banner se c'è una scadenza oggi/passata ──
function ricorrentiScadute(){
  return (S.ricorrenti||[]).filter(function(p){
    if(p.stato!=="attiva") return false;
    var g=giorniAScadenza(p.scadenza);
    return g!==null && g<=0;
  });
}
function aggiornaPulseRicorrenti(){
  var scadute=ricorrentiScadute();
  var btn=document.querySelector('.tab-btn[data-tab="fisso"]');
  if(btn) btn.classList.toggle("pulse", scadute.length>0);
}

function renderRiepilogo(){
  var totComuni=S.txs.reduce(function(a,t){return a+t.importo;},0);
  var totFisse=S.fisse.reduce(function(a,f){return a+f.importo;},0);
  // ricorrenti pagate col Conto Comune BPM: riga propria (confluiranno nelle fisse a chiusura)
  var totRicorrenti=(S.ricorrenti||[]).filter(function(p){return p.stato==="pagata_bancomat";}).reduce(function(a,p){return a+p.importo;},0);
  var totale=totComuni+totFisse+totRicorrenti;
  document.getElementById("riepilogo-comuni").textContent=eur(totComuni);
  document.getElementById("riepilogo-ricorrenti").textContent=eur(totRicorrenti);
  document.getElementById("riepilogo-fisse").textContent=eur(totFisse);
  document.getElementById("riepilogo-totale").textContent=eur(totale);
  document.getElementById("riepilogo-pro-capite").textContent=totale>0?"~"+eur(totale/2)+" a testa":"";
}
