// ════════════════════════════════════════════════════════
//  La Tana degli Orsi — debiti.js
//  Debiti diretti della cassa comune: creazione/modifica,
//  rimborsi (parziali e storico), eliminazione e rendering
//  della lista. UI ottimistica con rollback.
//  Dipende da: utils.js + api.js + ui.js (render/statoVuoto/
//  escapeHtml) + frasi.js (fraseVuoto).
//  Estratto da ui.js nella sessione di refactoring.
// ════════════════════════════════════════════════════════

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

// ── RENDER DELLA LISTA DEBITI ──
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
