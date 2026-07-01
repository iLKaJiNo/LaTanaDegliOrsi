// ════════════════════════════════════════════════════════
//  La Tana degli Orsi — solo.js
//  Orso Solo: contabilità personale privata e isolata.
//  Gate PIN, registro entrate/uscite, ricorrenti, categorie,
//  chiusure mensili, grafici e archivi per anno.
//  Tab fuori-swipe. Dipende da: utils.js + api.js + ui.js
//  (usa eur/fmt/escapeHtml/vibra/openCalc/post/dot/load/sb/sha256).
//  Estratto da ui.js nella sessione di refactoring.
// ════════════════════════════════════════════════════════

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
      +'<button class="solo-chi-btn" onclick="soloScegliChi(\'Luca\')"><img src="./bear.svg" alt=""><span>Luca</span></button>'
      +'<button class="solo-chi-btn" onclick="soloScegliChi(\'Ale\')"><img src="./bear.svg" alt=""><span>Ale</span></button>'
      +'</div></div>';
    return;
  }
  // Orso scelto: PIN da impostare (primo accesso) o da inserire
  var primoAccesso = !soloProfili[soloChi];
  el.innerHTML=
    '<div class="solo-gate">'
    +'<div class="solo-gate-icon" id="solo-gate-icon">'+(primoAccesso?'<img src="./bearface.svg" alt="">':"🔒")+'</div>'
    +'<h2 class="solo-gate-title">'+escapeHtml(soloChi)+'</h2>'
    +'<p class="solo-gate-sub" id="solo-gate-sub">'+(primoAccesso
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
  _soloPinNuovo=null;
  soloRenderDots();
}

function soloScegliChi(c){ soloChi=c; renderSolo(); }
function soloAnnullaChi(){ soloChi=null; _soloPinBuffer=""; _soloPinNuovo=null; renderSolo(); }

function soloRenderDots(){
  var d=document.getElementById("solo-pin-dots");
  if(!d) return;
  var s="";
  for(var i=0;i<4;i++) s+='<div class="solo-pin-dot'+(i<_soloPinBuffer.length?" filled":"")+'"></div>';
  d.innerHTML=s;
}
function soloPinBack(){
  _soloPinBuffer=_soloPinBuffer.slice(0,-1);
  soloRenderDots();
}
async function soloPinDigit(n){
  if(_soloPinBuffer.length>=4) return;
  // Ricominciando a digitare dopo un errore, l'orso arrabbiato torna 🔒
  // (solo per chi ha già un PIN; al primo accesso resta l'orso guardiano).
  if(_soloPinBuffer.length===0 && soloProfili[soloChi]){
    var ic=document.getElementById("solo-gate-icon");
    if(ic) ic.innerHTML="🔒";
  }
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
    // Doppia immissione: prima memorizzo, poi chiedo conferma.
    if(_soloPinNuovo===null){
      // 1ª immissione: NON salvo, chiedo di ripetere.
      _soloPinNuovo=hash;
      var sub=document.getElementById("solo-gate-sub");
      if(sub) sub.innerHTML="Ripeti il PIN<br>per confermare.";
      _soloPinBuffer="";
      soloRenderDots();
      return;
    }
    // 2ª immissione: confronto con la prima.
    if(hash!==_soloPinNuovo){
      _soloPinNuovo=null;
      var subR=document.getElementById("solo-gate-sub");
      if(subR) subR.innerHTML="Scegli un PIN di 4 cifre<br>per proteggere la tua area.";
      soloPinErrore("I PIN non coincidono, riprova.");
      vibra([60,40,60]);
      return;
    }
    // Coincidono → imposto il PIN sul profilo.
    try{
      await post({action:"setSoloPin", proprietario:soloChi, pinHash:hash});
      soloProfili[soloChi]=hash;
      _soloPinNuovo=null;
      soloSbloccato=true;
      await caricaSolo();
      await soloAutoRegistraScadute();
      soloCheckPromemoria(); renderSolo();
    }catch(e){
      _soloPinNuovo=null;
      var subE=document.getElementById("solo-gate-sub");
      if(subE) subE.innerHTML="Scegli un PIN di 4 cifre<br>per proteggere la tua area.";
      soloPinErrore("Errore nel salvataggio. Riprova.");
    }
  } else {
    // Verifico
    if(hash===soloProfili[soloChi]){
      soloSbloccato=true;
      await caricaSolo();
      await soloAutoRegistraScadute();
      soloCheckPromemoria(); renderSolo();
    } else {
      soloPinErrore("PIN errato.");
      vibra([60,40,60]);
    }
  }
}
function soloPinErrore(msg){
  var e=document.getElementById("solo-pin-err");
  if(e) e.textContent=msg;
  // L'icona del gate diventa l'orso arrabbiato che scuote (sblocco 🔒 → orso).
  var ic=document.getElementById("solo-gate-icon");
  if(ic) ic.innerHTML='<img src="./bearface.svg" class="shake" alt="">';
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
    soloData.ricorrenti = (ris[1].data||[]).map(function(r){return{id:r.id,nome:r.nome,tipo:r.tipo,importo:parseFloat(r.importo)||0,categoria:r.categoria||"Altro",ogniQuanto:r.ogni_quanto||1,unita:r.unita||"mesi",prossimaScadenza:r.prossima_scadenza||"",fineData:r.fine_data||null,volteRimaste:r.volte_rimaste!=null?r.volte_rimaste:null,attiva:r.attiva!==false,automatica:r.automatica===true};});
    soloData.chiusure   = (ris[2].data||[]).map(function(r){return{id:r.id,mese:r.mese,totEntrate:parseFloat(r.tot_entrate)||0,totUscite:parseFloat(r.tot_uscite)||0,saldo:parseFloat(r.saldo)||0,data:r.data||"",voci:r.voci||[],torta:r.torta||[]};});
    soloData.categorie  = (ris[3].data||[]).map(function(r){return{id:r.id,icona:r.icona||"📌",nome:r.nome,ordine:r.ordine||0,protetta:!!r.protetta};});
  }catch(e){ /* offline */ }
}

// Saldo personale: entrate − uscite
function soloSaldo(){
  return Math.round(soloData.voci.reduce(function(a,v){ return v.tipo==="entrata" ? a+v.importo : a-v.importo; }, 0)*100)/100;
}

// Promemoria chiusura Solo: il registro vivo abbraccia >1 mese? → c'è un mese
// vecchio da archiviare. Mirror del promemoria comune (qui valutato a sblocco,
// perché il bridge può aver iniettato voci mentre l'orso non era in sessione).
function soloCheckPromemoria(){
  _soloPromemoriaMese=null;
  if(_soloPromemoriaOff) return;            // rispetta il "Più tardi" di sessione
  var voci=soloData.voci||[];
  if(voci.length<2) return;
  var minYM="9999-99", maxYM="";
  voci.forEach(function(v){
    var ym=(v.data||"").slice(0,7); if(!ym) return;
    if(ym<minYM) minYM=ym;
    if(ym>maxYM) maxYM=ym;
  });
  if(minYM!=="9999-99" && minYM<maxYM) _soloPromemoriaMese=minYM;
}

// "2026-06" → "Giugno 2026" (etichetta amichevole, language-aware)
function soloMeseLabel(ym){
  var p=(ym||"").split("-"); if(p.length<2) return ym||"";
  var d=new Date(parseInt(p[0],10), parseInt(p[1],10)-1, 1);
  var s=d.toLocaleDateString("it-IT",{month:"long",year:"numeric"});
  return s.charAt(0).toUpperCase()+s.slice(1);
}

function soloPromemoriaPiuTardi(){ _soloPromemoriaOff=true; _soloPromemoriaMese=null; renderSolo(); }
function soloPromemoriaArchivia(){ _soloPromemoriaMese=null; openSoloChiudi(); }

// ── APP sbloccata (I-1: placeholder; in I-2 diventa il registro) ──
function renderSoloApp(el){
  var s=soloSaldo();
  var cats=soloData.categorie||[];
  var catOpts=cats.map(function(c){return '<option value="'+escapeHtml(c.nome)+'">'+c.icona+' '+escapeHtml(c.nome)+'</option>';}).join('');
  var ricScadute=soloRicorrentiScadute();
  el.innerHTML=
    '<div class="solo-head">'
    +'<div class="solo-head-chi">🐻‍❄️ '+escapeHtml(soloChi)+'</div>'
    +'<div class="solo-head-btns">'+soloCestinoBtnHtml()+'<button class="solo-lock-btn" onclick="soloCambiaPin()">🔑</button>'
    +'<button class="solo-lock-btn" onclick="soloLock()">🔒 Blocca</button></div>'
    +'</div>'
    +(_soloPromemoriaMese
      ? '<div class="promemoria-banner" style="display:flex;">🌙 Hai voci di '+soloMeseLabel(_soloPromemoriaMese)+' ancora da archiviare. Vuoi chiudere il mese?'
        +'<button onclick="soloPromemoriaArchivia()" style="background:var(--honey-d);border:none;border-radius:var(--r-sm);color:#fff;font-family:\'Baloo 2\',cursive;font-weight:700;font-size:.8rem;padding:7px 12px;cursor:pointer;-webkit-appearance:none;">Archivia</button>'
        +'<button onclick="soloPromemoriaPiuTardi()" style="background:var(--card2);border:1px solid var(--border);border-radius:var(--r-sm);color:var(--text2);font-family:\'Baloo 2\',cursive;font-weight:700;font-size:.8rem;padding:7px 12px;cursor:pointer;-webkit-appearance:none;">Più tardi</button></div>'
      : '')
    +'<div class="solo-saldo-card">'
    +'<div class="solo-saldo-lbl">Saldo personale</div>'
    +'<div class="solo-saldo-val '+(s>=0?"pos":"neg")+'">'+eur(s)+' <span class="solo-saldo-icona">'+(s>0?"🥧":s<0?"🕸️":"🍯")+'</span></div>'
    +'</div>'
    // Segmento a 3: Registro / Ricorrenti / Archivi
    +'<div class="solo-seg solo-seg-3">'
    +'<button class="solo-seg-btn'+(soloSegmento==="registro"?" on":"")+'" onclick="soloSetSegmento(\'registro\')">📒 Registro</button>'
    +'<button class="solo-seg-btn'+(soloSegmento==="ricorrenti"?" on":"")+'" onclick="soloSetSegmento(\'ricorrenti\')">🔁 Ricorrenti'+(ricScadute.length?' <span class="solo-badge-pulse">'+ricScadute.length+'</span>':'')+'</button>'
    +'<button class="solo-seg-btn'+(soloSegmento==="archivi"?" on":"")+'" onclick="soloSetSegmento(\'archivi\')">📦 Archivi</button>'
    +'</div>'
    +(soloSegmento==="ricorrenti" ? soloRicorrentiHtml(cats)
      : soloSegmento==="archivi" ? soloArchiviHtml()
      : soloRegistroHtml(catOpts));
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
    +'<div class="solo-storico-head"><span>Movimenti</span></div>'
    +soloStoricoHtml()
    +'</div>'
    +(soloData.voci.some(function(v){return v.tipo==="uscita";}) ? '<button class="solo-anno-graf-btn" onclick="openSoloCategorieMese()">🥧 Spese per categoria (mese corrente)</button>' : '')
    +(soloData.voci.length ? '<button class="solo-chiudi-mese-btn" onclick="openSoloChiudi()">🌙 Chiudi e archivia il mese</button>' : '');
}

function soloStoricoHtml(){
  if(!soloData.voci.length){
    return '<div class="empty"><span class="e-icon">🐻‍❄️</span>Ancora nessun movimento.<br>Registra entrate e uscite qui sopra!</div>';
  }
  var _rows=soloData.voci.map(function(v){
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
        : ((v.origine && v.origine.indexOf("chiusura:")===0
            ? '<span class="solo-cat-lock" title="Voce dalla cassa comune — non modificabile">🔒</span>'
            : '<button class="solo-voce-del" onclick="openSoloEditVoce(\''+v.id+'\')" title="Modifica">✏️</button>')
          + '<button class="solo-voce-del" onclick="soloDelChiedi(\''+v.id+'\')">🗑️</button>'))
      +'</div>';
  });
  if(_rows.length<=3) return _rows.join('');
  var _n=_rows.length-3, _key="solo_registro_aperto_"+soloChi, _ap=accordionAperto(_key,true);
  return _rows.slice(0,3).join('')
    +'<button id="solo-reg-acc-btn" onclick="accordionToggle(\'solo-reg-acc-box\',\'solo-reg-acc-btn\',\''+_key+'\')" style="'+ACCORDION_BTN_STYLE+'">'+(_ap?"\u25BE Nascondi le voci precedenti":("\u25B8 Mostra le altre "+_n+" voci"))+'</button>'
    +'<div id="solo-reg-acc-box" data-open="'+(_ap?"1":"0")+'" data-count="'+_n+'" style="overflow:hidden;transition:max-height .35s ease;max-height:'+(_ap?"none":"0px")+';">'+_rows.slice(3).join('')+'</div>';
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
  soloCheckPromemoria();
  renderSolo();
  dot("","Salvataggio...");
  try{
    await post({action:"addSoloVoce",voce:v});
    dot("ok","Sincronizzata 🐾");
  }catch(e){
    soloData.voci=soloData.voci.filter(function(x){return x.id!==v.id;});
    renderSolo();
    dot("err","Errore salvataggio");
  }
}

function soloDelChiedi(id){ soloDelConfirmId=id; renderSolo(); }
function soloDelAnnulla(){ soloDelConfirmId=null; renderSolo(); }
async function soloDelVoce(id){
  var voce=soloData.voci.find(function(x){return x.id===id;});
  if(voce) addAlSoloCestino(voce,"voce");
  var backup=soloData.voci.slice();
  soloData.voci=soloData.voci.filter(function(x){return x.id!==id;});
  soloDelConfirmId=null;
  vibra(20);
  renderSolo();
  dot("","Salvataggio...");
  try{
    await post({action:"deleteSoloVoce",id:id});
    dot("ok","Sincronizzata 🐾");
  }catch(e){
    soloData.voci=backup;
    renderSolo();
    dot("err","Errore eliminazione");
  }
}

// ── EDIT VOCE REGISTRO ──
var soloEditVoceId=null;

// Apre il modale di modifica di una voce del registro
function openSoloEditVoce(id){
  var v=soloData.voci.find(function(x){return x.id===id;});
  if(!v) return;
  // le voci generate da una chiusura non sono modificabili (vedi ripristino mese)
  if(v.origine && v.origine.indexOf("chiusura:")===0) return;
  soloEditVoceId=id;
  document.getElementById("solo-ev-tipo").value=v.tipo;
  document.getElementById("solo-ev-imp").value=v.importo;
  document.getElementById("solo-ev-nota").value=v.nota||"";
  var cats=soloData.categorie||[];
  document.getElementById("solo-ev-cat").innerHTML=cats.map(function(c){
    return '<option value="'+escapeHtml(c.nome)+'"'+(c.nome===v.categoria?' selected':'')+'>'+c.icona+' '+escapeHtml(c.nome)+'</option>';
  }).join('');
  document.getElementById("modal-solo-edit-voce").classList.add("open");
  setTimeout(function(){document.getElementById("solo-ev-imp").focus();},80);
}
function closeSoloEditVoce(){ document.getElementById("modal-solo-edit-voce").classList.remove("open"); soloEditVoceId=null; }

async function soloSalvaEditVoce(){
  if(!soloEditVoceId) return;
  var id=soloEditVoceId;
  var v=soloData.voci.find(function(x){return x.id===id;});
  if(!v){ closeSoloEditVoce(); return; }
  var imp=parseFloat(document.getElementById("solo-ev-imp").value);
  if(!imp||imp<=0){ document.getElementById("solo-ev-imp").focus(); return; }
  // backup COMPLETO della voce, per un rollback fedele su tutti i campi
  var backup=Object.assign({},v);
  v.tipo=document.getElementById("solo-ev-tipo").value;
  v.importo=imp;
  v.nota=document.getElementById("solo-ev-nota").value.trim();
  v.categoria=document.getElementById("solo-ev-cat").value||"Altro";
  closeSoloEditVoce();
  vibra(20);
  renderSolo();
  dot("","Salvataggio...");
  try{
    await post({action:"updateSoloVoce",voce:v});
    dot("ok","Sincronizzata 🐾");
  }catch(e){
    Object.assign(v,backup); // ripristino esatto stato precedente
    renderSolo();
    dot("err","Errore salvataggio");
  }
}

// ── RICORRENTI (fisse personali con frequenza) ──
// UNITA_LABEL ora è condiviso in utils.js (usato anche da fisso.js)

// Ricorrenti la cui prossima scadenza è oggi o passata
function soloRicorrentiScadute(){
  var oggi=new Date(); oggi.setHours(23,59,59,999);
  return (soloData.ricorrenti||[]).filter(function(r){
    if(r.attiva===false) return false;
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
  // fine ricorrenza
  h+='<div class="solo-freq-row"><span>Finché</span>'
    +'<select class="inp solo-freq-u" id="solo-ric-fine" onchange="soloRicFineChange()">'
    +'<option value="mai" selected>per sempre</option>'
    +'<option value="data">fino a una data</option>'
    +'<option value="volte">per N volte</option></select></div>';
  h+='<div class="solo-freq-row" id="solo-ric-fine-extra" style="display:none;">'
    +'<input class="inp" type="date" id="solo-ric-fine-data" style="flex:1;display:none;">'
    +'<input class="inp solo-freq-n" type="number" id="solo-ric-fine-volte" min="1" step="1" value="12" inputmode="numeric" style="display:none;"><span id="solo-ric-fine-volte-lbl" style="display:none;">volte</span></div>';
  h+='<div class="solo-freq-row"><span>Esecuzione</span>'
    +'<div class="solo-tipo-toggle" style="flex:1;">'
    +'<button type="button" class="solo-tipo-btn" style="'+(!soloRicAuto?"background:var(--honey);color:#3a2e00;":"")+'" onclick="soloRicSetAuto(false)" title="La registri tu quando scade">✋ Manuale</button>'
    +'<button type="button" class="solo-tipo-btn" style="'+(soloRicAuto?"background:var(--honey);color:#3a2e00;":"")+'" onclick="soloRicSetAuto(true)" title="Si registra da sola alla scadenza">⚡ Automatica</button>'
    +'</div></div>';
  h+='<button class="solo-add-btn" onclick="soloAddRicorrente()">🔁 Aggiungi ricorrente</button>';
  h+='</div>';
  // lista ricorrenti
  h+='<div class="solo-storico"><div class="solo-storico-head"><span>Le tue ricorrenti</span></div>';
  if(!(soloData.ricorrenti||[]).length){
    h+='<div class="empty"><span class="e-icon">🔁</span>Nessuna ricorrente.<br>Mutuo, stipendio, bollo... aggiungile qui!</div>';
  } else {
    h+=soloData.ricorrenti.map(function(r){
      var entrata=r.tipo==="entrata";
      var scaduta=soloRicScaduta(r);
      var ic=soloIconaCat(r.categoria);
      var conclusa=(r.attiva===false);
      var fineInfo="";
      if(conclusa) fineInfo=" · conclusa";
      else if(r.volteRimaste!=null) fineInfo=" · ancora "+r.volteRimaste+" volte";
      else if(r.fineData) fineInfo=" · fino al "+fmt(r.fineData);
      return '<div class="solo-voce '+(entrata?"entrata":"uscita")+(scaduta?" scaduta":"")+(conclusa?" conclusa":"")+'">'
        +'<div class="solo-voce-cat">'+ic+'</div>'
        +'<div class="solo-voce-body">'
        +'<div class="solo-voce-nota">'+escapeHtml(r.nome)+'</div>'
        +'<div class="solo-voce-data">ogni '+r.ogniQuanto+' '+UNITA_LABEL[r.unita]+(conclusa?"":" · prossima: "+fmt(r.prossimaScadenza))+fineInfo+'</div>'
        +'</div>'
        +'<div class="solo-voce-imp '+(entrata?"pos":"neg")+'">'+(entrata?"+":"−")+eur(r.importo)+'</div>'
        +(r.automatica
          ? '<span class="solo-ric-auto" style="font-size:1.1rem;opacity:.85;align-self:center;padding:0 6px;" title="Automatica: si registra da sola">⚡</span>'
          : scaduta
          ? '<button class="solo-ric-paga" onclick="soloPagaRicorrente(\''+r.id+'\')" title="Registra e avanza">✓</button>'
          : '')
        +(soloRicDelId===r.id
          ? '<div class="solo-voce-confirm"><button class="svc-si" onclick="soloDelRicorrente(\''+r.id+'\')">Sì</button><button class="svc-no" onclick="soloRicDelAnnulla()">No</button></div>'
          : '<button class="solo-voce-del" onclick="openSoloEditRic(\''+r.id+'\')" title="Modifica">✏️</button>'
            + '<button class="solo-voce-del" onclick="soloRicDelChiedi(\''+r.id+'\')">🗑️</button>')
        +'</div>';
    }).join('');
  }
  h+='</div>';
  return h;
}

function soloRicSetTipo(t){ soloRicTipo=t; renderSolo(); }
var soloRicAuto=false;
function soloRicSetAuto(v){ soloRicAuto=!!v; renderSolo(); }
function soloOggiISO(){ var d=new Date(); return d.toISOString().slice(0,10); }
function soloRicScaduta(r){
  if(r.attiva===false) return false;  // conclusa: niente più avvisi
  if(!r.prossimaScadenza) return false;
  var oggi=new Date(); oggi.setHours(23,59,59,999);
  return new Date(r.prossimaScadenza)<=oggi;
}

// soloAvanzaData ora è avanzaData in utils.js (condiviso Solo + comune)

async function soloAddRicorrente(){
  var nome=document.getElementById("solo-ric-nome").value.trim();
  var imp=parseFloat(document.getElementById("solo-ric-imp").value);
  var cat=document.getElementById("solo-ric-cat").value||"Altro";
  var ogni=parseInt(document.getElementById("solo-ric-ogni").value)||1;
  var unita=document.getElementById("solo-ric-unita").value||"mesi";
  var scad=document.getElementById("solo-ric-scad").value||soloOggiISO();
  if(!nome){ document.getElementById("solo-ric-nome").focus(); return; }
  if(!imp||imp<=0){ document.getElementById("solo-ric-imp").focus(); return; }
  // fine ricorrenza
  var fineTipo=document.getElementById("solo-ric-fine").value;
  var fineData=null, volteRimaste=null;
  if(fineTipo==="data") fineData=document.getElementById("solo-ric-fine-data").value||null;
  if(fineTipo==="volte") volteRimaste=parseInt(document.getElementById("solo-ric-fine-volte").value)||1;
  var r={id:Date.now().toString(),proprietario:soloChi,nome:nome,tipo:soloRicTipo,importo:imp,categoria:cat,ogniQuanto:ogni,unita:unita,prossimaScadenza:scad,fineData:fineData,volteRimaste:volteRimaste,attiva:true,automatica:soloRicAuto};
  soloData.ricorrenti.push(r);
  soloData.ricorrenti.sort(function(a,b){return (a.prossimaScadenza||"").localeCompare(b.prossimaScadenza||"");});
  vibra(30);
  renderSolo();
  dot("","Salvataggio...");
  try{
    await post({action:"addSoloRicorrente",ric:r});
    dot("ok","Sincronizzata 🐾");
  }catch(e){
    soloData.ricorrenti=soloData.ricorrenti.filter(function(x){return x.id!==r.id;});
    renderSolo(); dot("err","Errore salvataggio");
  }
}

// Mostra/nasconde i campi extra in base al tipo di fine scelto
function soloRicFineChange(){
  var tipo=document.getElementById("solo-ric-fine").value;
  var extra=document.getElementById("solo-ric-fine-extra");
  var dataI=document.getElementById("solo-ric-fine-data");
  var volteI=document.getElementById("solo-ric-fine-volte");
  var volteL=document.getElementById("solo-ric-fine-volte-lbl");
  extra.style.display = (tipo==="mai") ? "none" : "flex";
  dataI.style.display = (tipo==="data") ? "" : "none";
  volteI.style.display = (tipo==="volte") ? "" : "none";
  volteL.style.display = (tipo==="volte") ? "" : "none";
}

// Paga una ricorrente scaduta: crea una voce nel registro e avanza la scadenza
async function soloPagaRicorrente(id){
  var r=soloData.ricorrenti.find(function(x){return x.id===id;});
  if(!r) return;
  // backup dello stato precedente della ricorrente (per rollback)
  var backupRic={prossimaScadenza:r.prossimaScadenza, volteRimaste:r.volteRimaste, attiva:r.attiva};
  var nuovaScad=avanzaData(r.prossimaScadenza, r.ogniQuanto, r.unita);
  var v={id:Date.now().toString(),proprietario:soloChi,tipo:r.tipo,importo:r.importo,categoria:r.categoria,nota:r.nome,data:new Date().toISOString(),origine:"ric:"+r.id};
  soloData.voci.unshift(v);
  // gestione fine ricorrenza
  var concludi=false;
  if(r.volteRimaste!=null){
    r.volteRimaste-=1;
    if(r.volteRimaste<=0) concludi=true;
  }
  if(r.fineData && new Date(nuovaScad)>new Date(r.fineData)) concludi=true;
  if(concludi){
    r.attiva=false; // resta visibile ma non genera più avvisi
  } else {
    r.prossimaScadenza=nuovaScad;
  }
  soloData.ricorrenti.sort(function(a,b){return (a.prossimaScadenza||"").localeCompare(b.prossimaScadenza||"");});
  vibra([20,40,20]);
  renderSolo();
  dot("","Salvataggio...");
  var voceSalvata=false;
  try{
    await post({action:"addSoloVoce",voce:v});
    voceSalvata=true;
    await post({action:"updateSoloRicorrente",ric:r});
    dot("ok","Sincronizzata 🐾");
  }catch(e){
    // rollback ottimistico locale (coerente col resto del Solo): tolgo la voce
    // aggiunta e riporto la ricorrente allo stato precedente
    soloData.voci=soloData.voci.filter(function(x){return x.id!==v.id;});
    r.prossimaScadenza=backupRic.prossimaScadenza;
    r.volteRimaste=backupRic.volteRimaste;
    r.attiva=backupRic.attiva;
    soloData.ricorrenti.sort(function(a,b){return (a.prossimaScadenza||"").localeCompare(b.prossimaScadenza||"");});
    // caso parziale: se la 1ª post era andata (voce salvata) ma la 2ª no,
    // elimino la voce dal server per non lasciare un movimento orfano
    if(voceSalvata){ try{ await post({action:"deleteSoloVoce",id:v.id}); }catch(e2){} }
    renderSolo();
    dot("err","Errore — riprova");
  }
}

// Opzione A — le ricorrenti "automatiche" si registrano da sole all'avvio.
// Per ognuna scaduta crea una voce DATATA AL GIORNO DI SCADENZA e avanza,
// recuperando anche più cicli arretrati (guard anti-loop). Persiste come la
// paga manuale; se una post fallisce fa rollback dello step e si ferma.
async function soloAutoRegistraScadute(){
  if(!soloChi || !(soloData.ricorrenti||[]).length) return false;
  var oggi=new Date(); oggi.setHours(23,59,59,999);
  var qualcosa=false;
  for(var i=0;i<soloData.ricorrenti.length;i++){
    var r=soloData.ricorrenti[i];
    if(!r.automatica || r.attiva===false || !r.prossimaScadenza) continue;
    var guard=0;
    while(r.attiva!==false && r.prossimaScadenza && new Date(r.prossimaScadenza)<=oggi && guard<240){
      guard++;
      var scad=String(r.prossimaScadenza).slice(0,10);
      var nuovaScad=avanzaData(r.prossimaScadenza, r.ogniQuanto, r.unita);
      var v={id:Date.now().toString()+"x"+i+"-"+guard,proprietario:soloChi,tipo:r.tipo,importo:r.importo,categoria:r.categoria,nota:r.nome,data:new Date(scad+"T12:00:00").toISOString(),origine:"ric:"+r.id};
      var bk={prossimaScadenza:r.prossimaScadenza,volteRimaste:r.volteRimaste,attiva:r.attiva};
      var concludi=false;
      if(r.volteRimaste!=null){ r.volteRimaste-=1; if(r.volteRimaste<=0) concludi=true; }
      if(r.fineData && new Date(nuovaScad)>new Date(r.fineData)) concludi=true;
      soloData.voci.unshift(v);
      if(concludi){ r.attiva=false; } else { r.prossimaScadenza=nuovaScad; }
      var voceSalvata=false;
      try{
        await post({action:"addSoloVoce",voce:v});
        voceSalvata=true;
        await post({action:"updateSoloRicorrente",ric:r});
        qualcosa=true;
      }catch(e){
        soloData.voci=soloData.voci.filter(function(x){return x.id!==v.id;});
        r.prossimaScadenza=bk.prossimaScadenza; r.volteRimaste=bk.volteRimaste; r.attiva=bk.attiva;
        if(voceSalvata){ try{ await post({action:"deleteSoloVoce",id:v.id}); }catch(e2){} }
        return qualcosa;
      }
    }
  }
  if(qualcosa){
    soloData.voci.sort(function(a,b){return (b.data||"").localeCompare(a.data||"");});
    soloData.ricorrenti.sort(function(a,b){return (a.prossimaScadenza||"").localeCompare(b.prossimaScadenza||"");});
  }
  return qualcosa;
}

function soloRicDelChiedi(id){ soloRicDelId=id; renderSolo(); }
function soloRicDelAnnulla(){ soloRicDelId=null; renderSolo(); }
async function soloDelRicorrente(id){
  var ric=soloData.ricorrenti.find(function(x){return x.id===id;});
  if(ric) addAlSoloCestino(ric,"ricorrente");
  var backup=soloData.ricorrenti.slice();
  soloData.ricorrenti=soloData.ricorrenti.filter(function(x){return x.id!==id;});
  soloRicDelId=null; vibra(20); renderSolo();
  dot("","Salvataggio...");
  try{ await post({action:"deleteSoloRicorrente",id:id}); dot("ok","Sincronizzata 🐾"); }
  catch(e){ soloData.ricorrenti=backup; renderSolo(); dot("err","Errore"); }
}

// ── EDIT RICORRENTE ──
var soloEditRicId=null;

function openSoloEditRic(id){
  var r=soloData.ricorrenti.find(function(x){return x.id===id;});
  if(!r) return;
  soloEditRicId=id;
  document.getElementById("solo-er-nome").value=r.nome||"";
  document.getElementById("solo-er-tipo").value=r.tipo;
  document.getElementById("solo-er-imp").value=r.importo;
  var cats=soloData.categorie||[];
  document.getElementById("solo-er-cat").innerHTML=cats.map(function(c){
    return '<option value="'+escapeHtml(c.nome)+'"'+(c.nome===r.categoria?' selected':'')+'>'+c.icona+' '+escapeHtml(c.nome)+'</option>';
  }).join('');
  document.getElementById("solo-er-ogni").value=r.ogniQuanto||1;
  document.getElementById("solo-er-unita").value=r.unita||"mesi";
  // deduco il tipo di "fine" dallo stato attuale
  var fineTipo = r.volteRimaste!=null ? "volte" : (r.fineData ? "data" : "mai");
  document.getElementById("solo-er-fine").value=fineTipo;
  document.getElementById("solo-er-fine-data").value = r.fineData ? String(r.fineData).slice(0,10) : "";
  document.getElementById("solo-er-fine-volte").value = r.volteRimaste!=null ? r.volteRimaste : 12;
  document.getElementById("solo-er-scad").value = r.prossimaScadenza ? String(r.prossimaScadenza).slice(0,10) : "";
  // riga "Riattiva": visibile solo per ricorrenti concluse
  var riattRow=document.getElementById("solo-er-riattiva-row");
  document.getElementById("solo-er-riattiva").checked=false;
  riattRow.style.display = (r.attiva===false) ? "" : "none";
  document.getElementById("solo-er-auto").checked = (r.automatica===true);
  soloEditRicFineChange();
  document.getElementById("modal-solo-edit-ric").classList.add("open");
  setTimeout(function(){document.getElementById("solo-er-nome").focus();},80);
}
function closeSoloEditRic(){ document.getElementById("modal-solo-edit-ric").classList.remove("open"); soloEditRicId=null; }

// Mostra/nasconde i campi extra nel modale di modifica ricorrente
function soloEditRicFineChange(){
  var tipo=document.getElementById("solo-er-fine").value;
  document.getElementById("solo-er-fine-extra").style.display = (tipo==="mai") ? "none" : "flex";
  document.getElementById("solo-er-fine-data").style.display  = (tipo==="data") ? "" : "none";
  document.getElementById("solo-er-fine-volte").style.display = (tipo==="volte") ? "" : "none";
  document.getElementById("solo-er-fine-volte-lbl").style.display = (tipo==="volte") ? "" : "none";
}

async function soloSalvaEditRic(){
  if(!soloEditRicId) return;
  var id=soloEditRicId;
  var r=soloData.ricorrenti.find(function(x){return x.id===id;});
  if(!r){ closeSoloEditRic(); return; }
  var nome=document.getElementById("solo-er-nome").value.trim();
  var imp=parseFloat(document.getElementById("solo-er-imp").value);
  if(!nome){ document.getElementById("solo-er-nome").focus(); return; }
  if(!imp||imp<=0){ document.getElementById("solo-er-imp").focus(); return; }
  // backup COMPLETO della ricorrente, per un rollback fedele su tutti i campi
  var backup=Object.assign({},r);
  r.nome=nome;
  r.tipo=document.getElementById("solo-er-tipo").value;
  r.importo=imp;
  r.categoria=document.getElementById("solo-er-cat").value||"Altro";
  r.ogniQuanto=parseInt(document.getElementById("solo-er-ogni").value)||1;
  r.unita=document.getElementById("solo-er-unita").value||"mesi";
  var fineTipo=document.getElementById("solo-er-fine").value;
  if(fineTipo==="data"){ r.fineData=document.getElementById("solo-er-fine-data").value||null; r.volteRimaste=null; }
  else if(fineTipo==="volte"){ r.volteRimaste=parseInt(document.getElementById("solo-er-fine-volte").value)||1; r.fineData=null; }
  else { r.fineData=null; r.volteRimaste=null; }
  r.prossimaScadenza = document.getElementById("solo-er-scad").value || r.prossimaScadenza;
  r.automatica = document.getElementById("solo-er-auto").checked;
  // riattivazione: solo se era conclusa e l'utente ha spuntato "Riattiva"
  if(backup.attiva===false){
    var riatt=document.getElementById("solo-er-riattiva");
    r.attiva = !!(riatt && riatt.checked);
  }
  closeSoloEditRic();
  vibra(20);
  renderSolo();
  dot("","Salvataggio...");
  try{
    await post({action:"updateSoloRicorrente",ric:r});
    dot("ok","Sincronizzata 🐾");
  }catch(e){
    Object.assign(r,backup); // ripristino esatto stato precedente
    renderSolo();
    dot("err","Errore salvataggio");
  }
}

// ════════════════════════════════════════════════════════
//  CESTINO SOLO (localStorage, per-dispositivo e per-orso)
//  Replica fedele del cestino della cassa comune: recupero di
//  voci/ricorrenti eliminate per sbaglio. Transitorio, cap 60.
//  Chiave separata per orso → preserva l'isolamento del Solo.
// ════════════════════════════════════════════════════════
function soloCestinoKey(){ return "tana_solo_cestino_v1_"+(soloChi||"none"); }
function getSoloCestino(){ try{ return JSON.parse(localStorage.getItem(soloCestinoKey())||"[]"); }catch(e){ return []; } }
function setSoloCestino(arr){ localStorage.setItem(soloCestinoKey(), JSON.stringify(arr.slice(0,60))); }
// tipo: "voce" | "ricorrente"
function addAlSoloCestino(item, tipo){ var c=getSoloCestino(); c.unshift(Object.assign({},item,{_eliminata:new Date().toISOString(),_tipo:tipo})); setSoloCestino(c); }

// Pulsante 🗑️ con badge per le intestazioni Registro/Ricorrenti
function soloCestinoBtnHtml(){
  var n=getSoloCestino().length;
  var badge = n>0 ? '<span class="cestino-badge">'+n+'</span>' : '';
  return '<button class="btn-cestino-hd'+(n>0?" pieno":"")+'" onclick="openSoloCestino()" title="Cestino Solo">🗑️'+badge+'</button>';
}

function openSoloCestino(){
  var c=getSoloCestino();
  var el=document.getElementById("solo-cestino-list");
  var svuota=document.getElementById("btn-svuota-solo-cestino");
  if(!c.length){
    el.innerHTML='<div class="cestino-vuoto">'+statoVuoto("cestino","4rem")+'</div>';
    if(svuota) svuota.style.display="none";
  }else{
    if(svuota) svuota.style.display="";
    var h="";
    c.forEach(function(it){
      if(it._tipo==="chiusura"){
        var nv=(it.voci||[]).length;
        h+='<div class="cestino-row">';
        h+='<div class="solo-voce-cat" style="flex-shrink:0;">🌙</div>';
        h+='<div class="cestino-row-body">';
        h+='<div class="cestino-row-nota">'+escapeHtml(it.mese||"Mese")+'</div>';
        h+='<div class="cestino-row-meta">'+nv+' voci · chiuso il '+fmt(it.data)+'</div>';
        h+='</div>';
        h+='<div class="cestino-row-imp" style="color:'+(it.saldo>=0?"var(--moss)":"var(--berry)")+';">'+eurInt(it.saldo)+'</div>';
        h+='<button class="btn-ripristina-voce" onclick="ripristinaDaSoloCestino(\''+it.id+'\')">↩ Ripristina</button>';
        h+='</div>';
        return;
      }
      var ric=(it._tipo==="ricorrente");
      var entrata=it.tipo==="entrata";
      var ic= ric ? "🔁" : soloIconaCat(it.categoria);
      var titolo = ric ? escapeHtml(it.nome||"Ricorrente") : escapeHtml(it.nota||(entrata?"Entrata":"Uscita"));
      var meta = ric ? ("ricorrente · ogni "+it.ogniQuanto+" "+(UNITA_LABEL[it.unita]||it.unita)) : ("movimento · "+fmt(it.data));
      h+='<div class="cestino-row">';
      h+='<div class="solo-voce-cat" style="flex-shrink:0;">'+ic+'</div>';
      h+='<div class="cestino-row-body">';
      h+='<div class="cestino-row-nota">'+titolo+'</div>';
      h+='<div class="cestino-row-meta">'+meta+'</div>';
      h+='</div>';
      h+='<div class="cestino-row-imp" style="color:'+(entrata?"var(--moss)":"var(--berry)")+';">'+(entrata?"+":"−")+eur(it.importo)+'</div>';
      h+='<button class="btn-ripristina-voce" onclick="ripristinaDaSoloCestino(\''+it.id+'\')">↩ Ripristina</button>';
      h+='</div>';
    });
    el.innerHTML=h;
  }
  document.getElementById("modal-solo-cestino").classList.add("open");
}
function closeSoloCestino(){ document.getElementById("modal-solo-cestino").classList.remove("open"); }

function svuotaSoloCestino(){
  if(!confirm("Svuotare il cestino? Le voci verranno eliminate definitivamente."))return;
  vibra([25,40,25]);
  setSoloCestino([]); openSoloCestino(); renderSolo();
}

async function ripristinaDaSoloCestino(id){
  var c=getSoloCestino();
  var it=c.find(function(x){return x.id===id;});
  if(!it) return;
  var backupCestino=c.slice();
  setSoloCestino(c.filter(function(x){return x.id!==id;}));
  vibra(30);
  var newId=Date.now().toString();
  closeSoloCestino();
  if(it._tipo==="ricorrente"){
    var r={id:newId,proprietario:soloChi,nome:it.nome,tipo:it.tipo,importo:it.importo,categoria:it.categoria,
           ogniQuanto:it.ogniQuanto,unita:it.unita,prossimaScadenza:it.prossimaScadenza,
           fineData:it.fineData||null,volteRimaste:(it.volteRimaste!=null?it.volteRimaste:null),attiva:it.attiva!==false};
    soloData.ricorrenti.push(r);
    soloData.ricorrenti.sort(function(a,b){return (a.prossimaScadenza||"").localeCompare(b.prossimaScadenza||"");});
    renderSolo();
    dot("","Salvataggio...");
    try{ await post({action:"addSoloRicorrente",ric:r}); dot("ok","Ripristinata 🐾"); }
    catch(e){ soloData.ricorrenti=soloData.ricorrenti.filter(function(x){return x.id!==newId;}); setSoloCestino(backupCestino); renderSolo(); dot("err","Errore ripristino"); }
  }else if(it._tipo==="chiusura"){
    var ch={id:it.id,proprietario:soloChi,mese:it.mese,totEntrate:it.totEntrate,totUscite:it.totUscite,
            saldo:it.saldo,data:it.data,voci:it.voci||[],torta:it.torta||[]};
    soloData.chiusure.push(ch);
    soloData.chiusure.sort(function(a,b){return (b.data||"").localeCompare(a.data||"");}); // discendente per data, come il load
    soloSegmento="archivi";
    renderSolo();
    dot("","Salvataggio...");
    try{ await post({action:"addSoloChiusura",ch:ch}); dot("ok","Ripristinata 🐾"); }
    catch(e){ soloData.chiusure=soloData.chiusure.filter(function(x){return x.id!==ch.id;}); setSoloCestino(backupCestino); renderSolo(); dot("err","Errore ripristino"); }
  }else{
    var v={id:newId,proprietario:soloChi,tipo:it.tipo,importo:it.importo,categoria:it.categoria,nota:it.nota||"",data:it.data,origine:it.origine||null};
    soloData.voci.unshift(v);
    renderSolo();
    dot("","Salvataggio...");
    try{ await post({action:"addSoloVoce",voce:v}); dot("ok","Ripristinata 🐾"); }
    catch(e){ soloData.voci=soloData.voci.filter(function(x){return x.id!==newId;}); setSoloCestino(backupCestino); renderSolo(); dot("err","Errore ripristino"); }
  }
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
var SOLO_ICONE=["📌","🏠","💼","📋","🏍️","🐾","🍯","🛒","🍔","⛽","💊","🎁","✈️","🎬","📱","💡","👕","🐶","☕","🏋️","🍕","🛍️","🧣","🧸","🧩","🌿","🥧","🧮","🪵","🪨"];
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
  _soloPromemoriaOff=false; _soloPromemoriaMese=null;
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
var SOLO_PALETTE=["#F4A827","#A83225","#4A7C40","#6B3FA0","#C87D0A","#6B3F1F","#89C082","#B89CD8","#E08078","#4A2A0F"];
var soloCatTipo="uscita";   // faccia mostrata: "uscita" | "entrata"
var _soloCatRerender=null;  // closure che ridisegna la vista categorie aperta

// ── DETTAGLIO CHIUSURA (con torta dello snapshot) ──
function openSoloChiusura(id){
  var c=(soloData.chiusure||[]).find(function(x){return x.id===id;});
  if(!c) return;
  var body=document.getElementById("solo-chiusura-body");
  var h=renameChiusuraFieldHtml("solo",c.id,c.mese)
    +'<div class="riepilogo-mese">'
    +'<div class="riepilogo-mese-row"><span>➕ Entrate</span><span>'+eur(c.totEntrate)+'</span></div>'
    +'<div class="riepilogo-mese-row"><span>➖ Uscite</span><span>'+eur(c.totUscite)+'</span></div>'
    +'<div class="riepilogo-mese-row tot"><span>💰 Saldo</span><span>'+eur(c.saldo)+'</span></div></div>';
  // grafico categorie con toggle — da c.voci; fallback legacy c.torta (solo uscite)
  var vociC=(c.voci && c.voci.length)
    ? c.voci.slice()
    : (c.torta||[]).map(function(t){return {tipo:"uscita",categoria:t.nome,importo:t.val||0};});
  if(vociC.length){
    h+='<div class="solo-graf-canvas-wrap" id="solo-chiusura-canvas-wrap"><canvas id="solo-chiusura-canvas"></canvas></div>';
    h+='<div class="solo-graf-legenda" id="solo-chiusura-legenda"></div>';
  }
  // elenco movimenti archiviati
  if((c.voci||[]).length){
    h+='<div class="solo-storico-head" style="margin-top:14px;">Movimenti del periodo</div>';
    var _arows=c.voci.map(function(v){
      var entrata=v.tipo==="entrata";
      return '<div class="solo-voce '+(entrata?"entrata":"uscita")+'" style="cursor:default;">'
        +'<div class="solo-voce-cat">'+(soloIconaCat(v.categoria))+'</div>'
        +'<div class="solo-voce-body"><div class="solo-voce-nota">'+escapeHtml(v.nota||(entrata?"Entrata":"Uscita"))+'</div>'
        +'<div class="solo-voce-data">'+fmt(v.data)+'</div></div>'
        +'<div class="solo-voce-imp '+(entrata?"pos":"neg")+'">'+(entrata?"+":"−")+eur(v.importo)+'</div></div>';
    });
    if(_arows.length<=3){ h+=_arows.join(''); }
    else{
      var _an=_arows.length-3, _akey="solo_archivio_aperto_"+soloChi, _aap=accordionAperto(_akey,true);
      h+=_arows.slice(0,3).join('')
        +'<button id="solo-arch-acc-btn" onclick="accordionToggle(\'solo-arch-acc-box\',\'solo-arch-acc-btn\',\''+_akey+'\')" style="'+ACCORDION_BTN_STYLE+'">'+(_aap?"\u25BE Nascondi le voci precedenti":("\u25B8 Mostra le altre "+_an+" voci"))+'</button>'
        +'<div id="solo-arch-acc-box" data-open="'+(_aap?"1":"0")+'" data-count="'+_an+'" style="overflow:hidden;transition:max-height .35s ease;max-height:'+(_aap?"none":"0px")+';">'+_arows.slice(3).join('')+'</div>';
    }
  }
  document.getElementById("solo-chiusura-titolo").textContent=c.mese;
  body.innerHTML=h;
  document.getElementById("modal-solo-chiusura").classList.add("open");
  if(vociC.length){
    soloCatTipo="uscita";
    _soloCatRerender=function(){ soloRenderCategorieDonutInto(vociC,"solo-chiusura-canvas-wrap","solo-chiusura-legenda","solo-chiusura-canvas"); };
    _soloCatRerender();
  }
}
function closeSoloChiusura(){ document.getElementById("modal-solo-chiusura").classList.remove("open"); }

// Disegna torta/ciambella su un canvas dato
function soloDisegnaTorta(voci, tot, canvasId){
  var canvas=document.getElementById(canvasId||"solo-chiusura-canvas");
  if(!canvas || tot<=0) return;
  var slices=voci.map(function(v,i){ return {val:v.val, color:SOLO_PALETTE[i%SOLO_PALETTE.length]}; });
  drawDonut(canvas, slices, {centerText:eurInt(tot)});
}

// ── GRAFICI DI UN ANNO (barre dei mesi) ──
function openSoloGraficiAnno(anno){
  var chiusure=(soloData.chiusure||[]).filter(function(c){return String(new Date(c.data).getFullYear())===String(anno);});
  chiusure.sort(function(a,b){return new Date(a.data)-new Date(b.data);}); // cronologico
  document.getElementById("solo-grafanno-titolo").textContent="Andamento "+anno;
  var dati=chiusure.map(function(c){
    return {label:c.mese.split(" ")[0].slice(0,3), entrate:c.totEntrate, uscite:c.totUscite};
  });
  document.getElementById("solo-grafanno-body").innerHTML=soloBarreHtml(dati);
  document.getElementById("modal-solo-grafanno").classList.add("open");
  setTimeout(function(){ soloDisegnaBarre("solo-grafanno-canvas", dati); }, 50);
}
function closeSoloGrafanno(){ document.getElementById("modal-solo-grafanno").classList.remove("open"); }

// ── CATEGORIE DI UN ANNO (donut uscite per categoria, base archivi) ──
function openSoloCategorieAnno(anno){
  var chiusure=(soloData.chiusure||[]).filter(function(c){return String(new Date(c.data).getFullYear())===String(anno);});
  var voci=[];
  chiusure.forEach(function(c){
    if(c.voci && c.voci.length){ c.voci.forEach(function(v){ voci.push(v); }); }
    else if(c.torta && c.torta.length){ c.torta.forEach(function(t){ voci.push({tipo:"uscita",categoria:t.nome,importo:t.val||0}); }); }
  });
  soloCatTipo="uscita";
  _soloCatRerender=function(){ soloRenderCategorieDonutInto(voci,"solo-categorie-canvas-wrap","solo-categorie-legenda","solo-categorie-canvas"); };
  document.getElementById("solo-categorie-titolo").textContent="Categorie "+anno;
  document.getElementById("modal-solo-categorie").classList.add("open");
  _soloCatRerender();
}

function soloCatSetTipo(t){
  soloCatTipo=(t==="entrata")?"entrata":"uscita";
  if(_soloCatRerender) _soloCatRerender();
}

// Render condiviso torta categorie. voci = dataset (live o snapshot),
// filtrato per soloCatTipo. Usato da mese corrente, anno e dettaglio mese.
function soloRenderCategorieDonutInto(voci, wrapId, legId, canvasId){
  var leg=document.getElementById(legId);
  var wrap=document.getElementById(wrapId);
  if(!leg) return;
  var perCat={};
  (voci||[]).forEach(function(v){
    if(v.tipo===soloCatTipo) perCat[v.categoria]=(perCat[v.categoria]||0)+v.importo;
  });
  var torta=Object.keys(perCat).map(function(k){return{nome:k,val:Math.round(perCat[k]*100)/100,icona:soloIconaCat(k)};});
  torta.sort(function(a,b){return b.val-a.val;});
  var tot=torta.reduce(function(a,x){return a+x.val;},0);
  var toggle='<div class="solo-tipo-toggle" style="margin-bottom:12px;">'
    +'<button class="solo-tipo-btn'+(soloCatTipo==="uscita"?" on-uscita":"")+'" onclick="soloCatSetTipo(\'uscita\')">➖ Uscite</button>'
    +'<button class="solo-tipo-btn'+(soloCatTipo==="entrata"?" on-entrata":"")+'" onclick="soloCatSetTipo(\'entrata\')">➕ Entrate</button>'
    +'</div>';
  if(tot<=0){
    if(wrap) wrap.style.display="none";
    leg.innerHTML=toggle+'<div class="grafico-empty">'+(soloCatTipo==="entrata"?"Nessuna entrata per categoria":"Nessuna uscita per categoria")+'</div>';
    return;
  }
  if(wrap) wrap.style.display="";
  var h=toggle;
  torta.forEach(function(t,i){
    var perc=Math.round(t.val/tot*100);
    h+='<div class="torta-legenda-item"><div class="torta-legenda-dot" style="background:'+SOLO_PALETTE[i%SOLO_PALETTE.length]+'"></div>'
      +'<span>'+(t.icona||"📌")+' '+escapeHtml(t.nome)+'</span>'
      +'<span class="torta-legenda-val">'+eur(t.val)+' ('+perc+'%)</span></div>';
  });
  h+='<div class="torta-legenda-item" style="border-top:1px solid var(--border);padding-top:6px;margin-top:2px;"><span style="color:var(--text3);">Totale</span><span class="torta-legenda-val">'+eur(tot)+'</span></div>';
  leg.innerHTML=h;
  setTimeout(function(){ soloDisegnaTorta(torta, tot, canvasId); }, 40);
}
function closeSoloCategorieAnno(){ document.getElementById("modal-solo-categorie").classList.remove("open"); }

// ── CATEGORIE DEL MESE CORRENTE (donut categorie, voci live, toggle uscite/entrate) ──
function openSoloCategorieMese(){
  var voci=(soloData.voci||[]).slice();
  soloCatTipo="uscita";
  _soloCatRerender=function(){ soloRenderCategorieDonutInto(voci,"solo-categorie-canvas-wrap","solo-categorie-legenda","solo-categorie-canvas"); };
  document.getElementById("solo-categorie-titolo").textContent="Categorie — mese corrente";
  document.getElementById("modal-solo-categorie").classList.add("open");
  _soloCatRerender();
}
function closeSoloCategorieAnni(){ document.getElementById("modal-solo-categorie-anni").classList.remove("open"); }

// ── CATEGORIE CROSS-ANNO (barre impilate, una pila per anno) ──
function openSoloCategorieAnni(){
  var chiusure=soloData.chiusure||[];
  // perAnnoPerCat: { anno: {Cat:val,...} } — SOLO uscite, logica robusta voci→torta
  var perAnnoPerCat={}, totByCat={};
  chiusure.forEach(function(c){
    var anno=String(new Date(c.data).getFullYear()||"—");
    var dst=(perAnnoPerCat[anno]=perAnnoPerCat[anno]||{});
    if(c.voci && c.voci.length){
      c.voci.forEach(function(v){ if(v.tipo==="uscita"){ dst[v.categoria]=(dst[v.categoria]||0)+v.importo; totByCat[v.categoria]=(totByCat[v.categoria]||0)+v.importo; } });
    } else if(c.torta && c.torta.length){
      c.torta.forEach(function(t){ dst[t.nome]=(dst[t.nome]||0)+(t.val||0); totByCat[t.nome]=(totByCat[t.nome]||0)+(t.val||0); });
    }
  });
  // categorie ordinate per TOTALE cross-anno desc → ordine stabile per colori+legenda
  var categorie=Object.keys(totByCat).sort(function(a,b){return totByCat[b]-totByCat[a];});
  var anni=Object.keys(perAnnoPerCat).sort(); // asc
  var totGen=categorie.reduce(function(a,k){return a+totByCat[k];},0);

  document.getElementById("solo-cat-anni-titolo").textContent="Categorie — confronto anni";
  var wrap=document.getElementById("solo-cat-anni-canvas-wrap");
  var leg=document.getElementById("solo-cat-anni-legenda");
  if(!anni.length || totGen<=0){
    wrap.style.display="none";
    leg.innerHTML='<div class="grafico-empty">Nessuna spesa per categoria ancora.</div>';
    document.getElementById("modal-solo-categorie-anni").classList.add("open");
    return;
  }
  wrap.style.display="";
  // colore stabile per categoria (stesso indice in pile E legenda)
  var coloreByCat={};
  categorie.forEach(function(cat,i){ coloreByCat[cat]=SOLO_PALETTE[i%SOLO_PALETTE.length]; });
  // legenda: pallino colore + categoria + totale cross-anno
  var h="";
  categorie.forEach(function(cat){
    var perc=Math.round(totByCat[cat]/totGen*100);
    h+='<div class="torta-legenda-item"><div class="torta-legenda-dot" style="background:'+coloreByCat[cat]+'"></div>'
      +'<span>'+soloIconaCat(cat)+' '+escapeHtml(cat)+'</span>'
      +'<span class="torta-legenda-val">'+eur(totByCat[cat])+' ('+perc+'%)</span></div>';
  });
  h+='<div class="torta-legenda-item" style="border-top:1px solid var(--border);padding-top:6px;margin-top:2px;"><span style="color:var(--text3);">Totale</span><span class="torta-legenda-val">'+eur(totGen)+'</span></div>';
  leg.innerHTML=h;
  document.getElementById("modal-solo-categorie-anni").classList.add("open");
  setTimeout(function(){ soloDisegnaBarreImpilate("solo-cat-anni-canvas", anni, categorie, perAnnoPerCat, coloreByCat); }, 50);
}

// ── CONFRONTO ANNI (barre per anno) ──
function openSoloGraficiTuttiAnni(){
  var perAnno={};
  (soloData.chiusure||[]).forEach(function(c){
    var a=new Date(c.data).getFullYear();
    if(!perAnno[a]) perAnno[a]={entrate:0,uscite:0};
    perAnno[a].entrate+=c.totEntrate; perAnno[a].uscite+=c.totUscite;
  });
  var anni=Object.keys(perAnno).sort();
  document.getElementById("solo-grafanno-titolo").textContent="Confronto anni";
  var dati=anni.map(function(a){ return {label:a, entrate:perAnno[a].entrate, uscite:perAnno[a].uscite}; });
  document.getElementById("solo-grafanno-body").innerHTML=soloBarreHtml(dati);
  document.getElementById("modal-solo-grafanno").classList.add("open");
  setTimeout(function(){ soloDisegnaBarre("solo-grafanno-canvas", dati); }, 50);
}

// Costruisce il grafico a barre entrate/uscite da una lista {label,entrate,uscite}
function soloBarreHtml(dati){
  if(!dati.length) return '<div class="grafico-empty">Nessun dato disponibile ancora.</div>';
  return '<div class="solo-graf-canvas-wrap" style="padding:6px 0;"><canvas id="solo-grafanno-canvas" style="width:100%;height:200px;display:block;"></canvas></div>'
    +'<div class="solo-graf-legenda" style="justify-content:center;display:flex;gap:16px;">'
    +'<span><span class="solo-graf-dot" style="background:var(--moss)"></span> Entrate</span>'
    +'<span><span class="solo-graf-dot" style="background:var(--berry)"></span> Uscite</span></div>';
}

// Barre Entrate/Uscite su canvas, stile allineato a drawChart della cassa comune.
// dati = [{label, entrate, uscite}] — semantica Solo invariata (2 barre per periodo)
function soloDisegnaBarre(canvasId, dati){
  var canvas=document.getElementById(canvasId);
  if(!canvas) return;
  var ctx=canvas.getContext("2d");
  if(!dati || !dati.length){ ctx.clearRect(0,0,canvas.width,canvas.height); return; }

  var dpr=window.devicePixelRatio||1;
  var rect=canvas.getBoundingClientRect();
  canvas.width=rect.width*dpr; canvas.height=rect.height*dpr;
  ctx.scale(dpr,dpr);
  var W=rect.width, H=rect.height;
  var padL=44, padR=16, padT=20, padB=48;
  var chartW=W-padL-padR, chartH=H-padT-padB;

  var maxVal=Math.max.apply(null, dati.map(function(d){return Math.max(d.entrate,d.uscite);}))||1;
  maxVal=Math.ceil(maxVal/100)*100; if(maxVal<=0) maxVal=100;

  var entrataColor="#4A7C40"; // moss (come la fetta Ale del comune)
  var uscitaColor="#A83225";  // berry (come la fetta Luca del comune)
  var gridColor="rgba(184,149,106,0.2)";
  var textColor="#B8956A";

  ctx.clearRect(0,0,W,H);

  // Griglia orizzontale + label € sull'asse Y (identico a drawChart)
  var steps=4;
  ctx.strokeStyle=gridColor; ctx.lineWidth=1;
  ctx.font="10px 'Nunito',sans-serif"; ctx.fillStyle=textColor; ctx.textAlign="right";
  for(var i=0;i<=steps;i++){
    var y=padT+chartH-(chartH/steps)*i;
    ctx.beginPath(); ctx.moveTo(padL,y); ctx.lineTo(padL+chartW,y); ctx.stroke();
    ctx.fillText(Math.round(maxVal/steps*i)+" €", padL-6, y+4);
  }

  // Barra con cima arrotondata (stessa resa di drawChart)
  function barra(x,y,w,bh,color){
    var r=Math.min(4, w/2);
    ctx.fillStyle=color;
    ctx.beginPath();
    ctx.moveTo(x-w/2+r,y);
    ctx.lineTo(x+w/2-r,y);
    ctx.quadraticCurveTo(x+w/2,y,x+w/2,y+r);
    ctx.lineTo(x+w/2,y+bh);
    ctx.lineTo(x-w/2,y+bh);
    ctx.lineTo(x-w/2,y+r);
    ctx.quadraticCurveTo(x-w/2,y,x-w/2+r,y);
    ctx.closePath(); ctx.fill();
  }

  var step=chartW/dati.length;
  var groupW=Math.min(46, step*0.6);
  var barW=Math.max(4, groupW/2 - 2);
  ctx.textAlign="center";

  dati.forEach(function(d,idx){
    var cxg=padL+step*idx+step/2;
    var bhE=(d.entrate/maxVal)*chartH, yE=padT+chartH-bhE;
    var bhU=(d.uscite/maxVal)*chartH, yU=padT+chartH-bhU;
    barra(cxg-(barW/2+1), yE, barW, bhE, entrataColor);
    barra(cxg+(barW/2+1), yU, barW, bhU, uscitaColor);
    ctx.fillStyle=textColor; ctx.font="9px 'Nunito',sans-serif";
    var lbl=String(d.label); if(lbl.length>8) lbl=lbl.substring(0,8)+"…";
    ctx.fillText(lbl, cxg, padT+chartH+14);
  });
}

// Barre IMPILATE per categoria — una pila per anno (mirror assi/griglia di soloDisegnaBarre).
// anni=[...], categorie=[...] (ordine stabile), perAnnoPerCat={anno:{cat:val}}, coloreByCat={cat:hex}
function soloDisegnaBarreImpilate(canvasId, anni, categorie, perAnnoPerCat, coloreByCat){
  var canvas=document.getElementById(canvasId);
  if(!canvas) return;
  var ctx=canvas.getContext("2d");
  if(!anni || !anni.length){ ctx.clearRect(0,0,canvas.width,canvas.height); return; }

  var dpr=window.devicePixelRatio||1;
  var rect=canvas.getBoundingClientRect();
  canvas.width=rect.width*dpr; canvas.height=rect.height*dpr;
  ctx.scale(dpr,dpr);
  var W=rect.width, H=rect.height;
  var padL=44, padR=16, padT=20, padB=48;
  var chartW=W-padL-padR, chartH=H-padT-padB;

  // maxVal = max sulla SOMMA categorie di ogni anno (arrotondato a centinaia, come soloDisegnaBarre)
  var totAnno=anni.map(function(a){ var s=0; categorie.forEach(function(cat){ s+=(perAnnoPerCat[a][cat]||0); }); return s; });
  var maxVal=Math.max.apply(null, totAnno)||1;
  maxVal=Math.ceil(maxVal/100)*100; if(maxVal<=0) maxVal=100;

  var gridColor="rgba(184,149,106,0.2)";
  var textColor="#B8956A";

  ctx.clearRect(0,0,W,H);

  // Griglia orizzontale + label € sull'asse Y (identico a soloDisegnaBarre)
  var steps=4;
  ctx.strokeStyle=gridColor; ctx.lineWidth=1;
  ctx.font="10px 'Nunito',sans-serif"; ctx.fillStyle=textColor; ctx.textAlign="right";
  for(var i=0;i<=steps;i++){
    var y=padT+chartH-(chartH/steps)*i;
    ctx.beginPath(); ctx.moveTo(padL,y); ctx.lineTo(padL+chartW,y); ctx.stroke();
    ctx.fillText(Math.round(maxVal/steps*i)+" €", padL-6, y+4);
  }

  // Segmento di pila — cima arrotondata solo sul segmento più in alto
  function seg(x,yTop,w,segH,color,topRound){
    var r=topRound?Math.min(4,w/2):0;
    ctx.fillStyle=color;
    ctx.beginPath();
    ctx.moveTo(x-w/2+r,yTop);
    ctx.lineTo(x+w/2-r,yTop);
    ctx.quadraticCurveTo(x+w/2,yTop,x+w/2,yTop+r);
    ctx.lineTo(x+w/2,yTop+segH);
    ctx.lineTo(x-w/2,yTop+segH);
    ctx.lineTo(x-w/2,yTop+r);
    ctx.quadraticCurveTo(x-w/2,yTop,x-w/2+r,yTop);
    ctx.closePath(); ctx.fill();
  }

  var step=chartW/anni.length;
  var barW=Math.min(46, step*0.5);
  ctx.textAlign="center";

  anni.forEach(function(a,idx){
    var cx=padL+step*idx+step/2;
    var yBase=padT+chartH; // impilo dal basso verso l'alto
    // ultima categoria con valore > 0 in quest'anno → cima arrotondata
    var topIdx=-1;
    categorie.forEach(function(cat,ci){ if((perAnnoPerCat[a][cat]||0)>0) topIdx=ci; });
    categorie.forEach(function(cat,ci){
      var val=perAnnoPerCat[a][cat]||0;
      if(val<=0) return; // segmento 0 → saltato (colore comunque stabile)
      var segH=(val/maxVal)*chartH;
      var yTop=yBase-segH;
      seg(cx,yTop,barW,segH,coloreByCat[cat],ci===topIdx);
      yBase=yTop;
    });
    // label anno
    ctx.fillStyle=textColor; ctx.font="9px 'Nunito',sans-serif";
    var lbl=String(a); if(lbl.length>8) lbl=lbl.substring(0,8)+"…";
    ctx.fillText(lbl, cx, padT+chartH+14);
  });
}

// ── CHIUSURA SOLO (archivia) ──
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
  if(!soloData.voci.length){ closeSoloChiudi(); return; }
  var ent=0, usc=0;
  soloData.voci.forEach(function(v){ if(v.tipo==="entrata") ent+=v.importo; else usc+=v.importo; });
  ent=Math.round(ent*100)/100; usc=Math.round(usc*100)/100;
  // Torta categorie (uscite) — salvata nello snapshot
  var perCat={};
  soloData.voci.forEach(function(v){ if(v.tipo==="uscita") perCat[v.categoria]=(perCat[v.categoria]||0)+v.importo; });
  var torta=Object.keys(perCat).map(function(k){return{nome:k,val:Math.round(perCat[k]*100)/100,icona:soloIconaCat(k)};});
  torta.sort(function(a,b){return b.val-a.val;});
  var vociArchiviate=soloData.voci.slice();
  var ch={id:Date.now().toString(),proprietario:soloChi,mese:mese,totEntrate:ent,totUscite:usc,
          saldo:Math.round((ent-usc)*100)/100,data:new Date().toISOString(),
          voci:vociArchiviate,torta:torta};
  // optimistic: archivio e svuoto il registro
  soloData.chiusure.unshift(ch);
  var backupVoci=soloData.voci.slice();
  soloData.voci=[];
  closeSoloChiudi();
  vibra([20,40,20]);
  soloSegmento="archivi";
  renderSolo();
  try{
    await post({action:"addSoloChiusura",ch:ch});
    // cancello le voci archiviate dal registro attivo
    for(var i=0;i<vociArchiviate.length;i++){
      try{ await post({action:"deleteSoloVoce",id:vociArchiviate[i].id}); }catch(e){}
    }
    dot("ok","Mese chiuso 🌙");
  }catch(e){
    soloData.chiusure=soloData.chiusure.filter(function(x){return x.id!==ch.id;});
    soloData.voci=backupVoci;
    renderSolo();
    dot("err","Errore archiviazione");
  }
}

// ════════════════════════════════════════════════════════
//  ORSO SOLO — Archivi (L-3a)
//  Le chiusure raggruppate per anno (automatico, per data).
// ════════════════════════════════════════════════════════
var soloAnnoAperto=null;

function soloArchiviHtml(){
  var chiusure=soloData.chiusure||[];
  if(!chiusure.length){
    return '<div class="empty" style="margin-top:18px;"><span class="e-icon">📦</span>Nessun mese archiviato.<br>Chiudi un mese dal Registro per iniziare!</div>';
  }
  // raggruppo per anno (dalla data della chiusura)
  var perAnno={};
  chiusure.forEach(function(c){
    var anno=new Date(c.data).getFullYear()||"—";
    (perAnno[anno]=perAnno[anno]||[]).push(c);
  });
  var anni=Object.keys(perAnno).sort(function(a,b){return b-a;}); // recenti prima
  var h='<div class="solo-archivi">';
  anni.forEach(function(anno){
    var lista=perAnno[anno];
    var totU=lista.reduce(function(a,c){return a+c.totUscite;},0);
    var aperto=(soloAnnoAperto==String(anno));
    h+='<div class="solo-anno-group">';
    h+='<button class="solo-anno-head'+(aperto?" aperto":"")+'" onclick="soloToggleAnno(\''+anno+'\')">'
      +'<span class="solo-anno-titolo">📅 '+anno+'</span>'
      +'<span class="solo-anno-meta">'+lista.length+' mesi · '+eur(totU)+' spesi</span>'
      +'<span class="solo-anno-chev">'+(aperto?"▴":"▾")+'</span></button>';
    if(aperto){
      h+='<div class="solo-anno-body">';
      h+='<button class="solo-anno-graf-btn" onclick="openSoloGraficiAnno(\''+anno+'\')">📊 Grafici '+anno+'</button>';
      h+='<button class="solo-anno-graf-btn" onclick="openSoloCategorieAnno(\''+anno+'\')">🥧 Categorie '+anno+'</button>';
      lista.forEach(function(c){
        h+='<div class="solo-mese-wrap">';
        h+=  '<button class="solo-mese-row" onclick="openSoloChiusura(\''+c.id+'\')">'
            +'<span class="solo-mese-nome">'+escapeHtml(c.mese)+'</span>'
            +'<span class="solo-mese-saldo '+(c.saldo>=0?"pos":"neg")+'">'+eur(c.saldo)+'</span></button>';
        h+=  (soloDelArchivioId===c.id
              ? '<span class="solo-voce-confirm"><button class="svc-si" onclick="soloDelArchivio(\''+c.id+'\')">Sì</button><button class="svc-no" onclick="soloDelArchivioAnnulla()">No</button></span>'
              : '<button class="solo-voce-del" onclick="soloDelArchivioChiedi(\''+c.id+'\')" title="Elimina archivio">🗑️</button>');
        h+='</div>';
      });
      h+='</div>';
    }
    h+='</div>';
  });
  h+='</div>';
  // modale dei grafici degli anni (barre 2026 vs 2027...) se >1 anno
  if(anni.length>1){
    h+='<button class="solo-anno-graf-btn" style="margin-top:14px;" onclick="openSoloGraficiTuttiAnni()">📈 Confronta gli anni</button>';
    h+='<button class="solo-anno-graf-btn" onclick="openSoloCategorieAnni()">🥧 Categorie — confronto anni</button>';
  }
  return h;
}

function soloToggleAnno(anno){
  soloAnnoAperto = (soloAnnoAperto==String(anno)) ? null : String(anno);
  renderSolo();
}

// ── Elimina un archivio (chiusura) → cestino, reversibile (conferma inline) ──
function soloDelArchivioChiedi(id){ soloDelArchivioId=id; renderSolo(); }
function soloDelArchivioAnnulla(){ soloDelArchivioId=null; renderSolo(); }
async function soloDelArchivio(id){
  var ch=(soloData.chiusure||[]).find(function(x){return x.id===id;});
  soloDelArchivioId=null;
  if(!ch){ renderSolo(); return; }
  var backupChiusure=soloData.chiusure.slice();
  var backupCestino=getSoloCestino();
  addAlSoloCestino(ch,"chiusura");
  soloData.chiusure=soloData.chiusure.filter(function(x){return x.id!==id;});
  vibra(20); renderSolo(); dot("","Salvataggio...");
  try{ await post({action:"deleteSoloChiusura",id:id}); dot("ok","Sincronizzata 🐾"); }
  catch(e){ soloData.chiusure=backupChiusure; setSoloCestino(backupCestino); renderSolo(); dot("err","Errore eliminazione"); }
}

// ── Dettaglio chiusura, grafici anno, confronto anni (L-3b) ──
