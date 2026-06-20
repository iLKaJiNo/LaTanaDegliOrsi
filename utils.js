// ════════════════════════════════════════════════════════
//  La Tana degli Orsi — utils.js
//  Costanti, stato globale, helper puri, tema, sessione.
//  Caricato per PRIMO: definisce ciò che gli altri file usano.
// ════════════════════════════════════════════════════════

// ── SUPABASE ──
// ⚠️ COMPILA QUESTI DUE VALORI dal tuo progetto Supabase:
//    Dashboard → Project Settings → API
var SUPABASE_URL = "https://yupqbobnqtcajvxjhgjg.supabase.co";        // es. https://abcdefgh.supabase.co
var SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1cHFib2JucXRjYWp2eGpoZ2pnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNzI0MjEsImV4cCI6MjA5Njg0ODQyMX0.Q4ch-6vbaQYeUaPNiGchLQ_4-uxYhJDT2rIhWthRBTk";      // la chiave "anon / public"
// Email dell'utente condiviso creato in Authentication → Users.
// La schermata di login chiede solo la password, come sempre.
var TANA_EMAILS = ["orsi@tana.casa", "prova@tana.db"];

// Client Supabase (la libreria è caricata in index.html prima di questo file)
var sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── STATO GLOBALE ──────────────────────────────────────
// ── STATO GLOBALE ──
var S={saldoIniziale:0,txs:[],chiusure:[],debiti:[],fisse:[],lista:[],previste:[],nota:{testo:"",autore:"",data:""}};
var chi="Luca",delId=null,editSaldo=false;
var deferredPrompt=null,ripristinoTarget=null,eliminaConfirmId=null;
var rimborsoOpenId=null,delDebitoConfirmId=null;
// Nuove feature
var editTxId=null;
var sortDateAsc=false;
var showDataManuale=false;
var CESTINO_KEY="tana_cestino_v1";
var editFissaId=null;
var editDebitoId=null;
var prevSaldo=null;
var annoAperto=String(new Date().getFullYear()); // anno in corso aperto di default nell'archivio
var THEME_KEY="tana_theme";
var SOLO_VIS_KEY="tana_solo_visibile"; // visibilità del bottone Orso Solo in tab-bar (default ON)
var filterChi="tutti"; // "tutti" | "Luca" | "Ale"
// Lista spesa
var IDENTITY_KEY="tana_identity";
var _notaTimer=null;
var _svuotaListaConfirm=false;
// Lista pulse e swipe tab
var _listaHash=null;
var TABS_ORDER=["tana","archivio","fisso","lista"];
// Spese previste
var fisseSegmento="ricorrenti"; // "ricorrenti" | "previste"
var editPrevistaId=null;
var pagaPrevistaId=null;
var delPrevistaConfirmId=null;
var delFissaConfirmId=null;
// ── PROMEMORIA CHIUSURA (Imp-B) ──
var _chiusuraStash=null;     // voci del mese nuovo messe da parte durante "Archivia"
var _chiusuraInCorso=false;  // true mentre chiudiMese() è in volo (blocca il ripristino in closeChiudi)
// ── ORSO SOLO (contabilità personale) ──
var soloChi=null;          // "Luca"/"Ale": chi è sbloccato in questa sessione (null = bloccato)
var soloSbloccato=false;   // true dopo PIN corretto; si azzera a ogni riapertura app
var soloProfili={Luca:null, Ale:null};  // pin_hash dei due, caricati dal DB
var soloSaldoPartenza=0;   // saldo iniziale del periodo corrente (per-orso, default 0)
var soloEditSaldo=false;   // true mentre si modifica il saldo di partenza
var soloData={voci:[], ricorrenti:[], chiusure:[], categorie:[]};  // dati dell'orso sbloccato
var soloCategorie=["Mutuo Tana","Stipendio","TasseTasseTasse!","Moto","Altro"]; // editabili
var _soloPinBuffer="";     // cifre digitate nel tastierino PIN
var soloTipoNuova="uscita"; // tipo della voce in inserimento
var soloDelConfirmId=null;  // id voce in attesa di conferma eliminazione
var soloSegmento="registro"; // "registro" | "ricorrenti"
var soloRicTipo="uscita";    // tipo nuova ricorrente
var soloRicDelId=null;       // id ricorrente in attesa conferma elim.
var soloCatDelId=null;       // id categoria in attesa conferma elim.

// ── AUTH / SESSIONE ────────────────────────────────────
// La sessione è gestita da Supabase (token salvato e rinnovato
// automaticamente). Niente più hash nel codice sorgente.
function togglePwVisibility(){var i=document.getElementById("login-pw");i.type=i.type==="password"?"text":"password";}

async function doLogin(){
  var pw=document.getElementById("login-pw").value;
  if(!pw)return;
  var btn=document.getElementById("login-btn");
  btn.disabled=true;
  document.getElementById("login-error").textContent="";
  document.getElementById("login-loading").textContent="Verifica in corso...";
  var res=null;
for(var i=0;i<TANA_EMAILS.length;i++){
  res=await sb.auth.signInWithPassword({email:TANA_EMAILS[i],password:pw});
  if(!res.error) break;
}
  document.getElementById("login-loading").textContent="";
  if(res.error){
    document.getElementById("login-error").textContent=
      res.error.message.indexOf("credentials")>-1 ? "Password errata. Riprova." : "Errore di rete. Riprova.";
    document.getElementById("login-pw").value="";
    btn.disabled=false;
    return;
  }
  document.getElementById("login-screen").classList.remove("active");
  appStart();
}
function logout(){sb.auth.signOut().then(function(){location.reload();});}
async function authInit(){
  var res=await sb.auth.getSession();
  if(res.data&&res.data.session){appStart();}
  else{document.getElementById("login-screen").classList.add("active");setTimeout(function(){document.getElementById("login-pw").focus();},300);}
}

// ── TEMA + PWA BANNER ──────────────────────────────────
// ── TEMA ──
function applyTheme(dark){
  document.body.classList.toggle("dark", dark);
  var btn=document.getElementById("btn-theme");
  if(btn) btn.textContent=dark?"☀️":"🌙";
}
function toggleTheme(){
  var dark=!document.body.classList.contains("dark");
  localStorage.setItem(THEME_KEY, dark?"dark":"light");
  applyTheme(dark);
}function initTheme(){
  var saved=localStorage.getItem(THEME_KEY);
  // Se non salvato, default chiaro
  applyTheme(saved==="dark");
}

// ── PWA BANNER ──
window.addEventListener("beforeinstallprompt",function(e){e.preventDefault();deferredPrompt=e;document.getElementById("install-banner").style.display="flex";});
window.addEventListener("appinstalled",function(){document.getElementById("install-banner").style.display="none";});
function installApp(){if(!deferredPrompt)return;deferredPrompt.prompt();deferredPrompt.userChoice.then(function(){deferredPrompt=null;document.getElementById("install-banner").style.display="none";});}

// ── HELPER DI FORMATO/CALCOLO ──────────────────────────
// ── HELPERS ──
function saldo(){return Math.round(S.txs.reduce(function(a,t){return t.chi==="Luca"?a+t.importo:a-t.importo;},S.saldoIniziale)*100)/100;}
// Ordine canonico di S.chiusure: DISCENDENTE per data (più recente in testa).
// Unico punto di verità: chiamato dopo load e dopo ogni modifica di S.chiusure;
// i punti di lettura (drawChart, renderArchivioTab) si fidano di quest'ordine.
function sortChiusure(){ S.chiusure.sort(function(a,b){ return (b.data||"").localeCompare(a.data||""); }); }
// Ultimo mese già archiviato come "YYYY-MM", ricavato dalle txs di TUTTE
// le chiusure (massimo). Language-independent. "" se nessuna chiusura con voci.
function ultimoMeseChiuso(){
  var max="";
  (S.chiusure||[]).forEach(function(c){
    (c.txs||[]).forEach(function(t){
      var ym=(t.data||"").slice(0,7);
      if(ym && ym>max) max=ym;
    });
  });
  return max;
}
function fmt(iso){if(!iso)return"";var d=new Date(iso);return isNaN(d)?iso:String(d.getDate()).padStart(2,"0")+"/"+String(d.getMonth()+1).padStart(2,"0");}
function fmtLong(iso){if(!iso)return"";var d=new Date(iso);return isNaN(d)?iso:d.toLocaleDateString("it-IT",{day:"numeric",month:"long",year:"numeric"});}
var eur=function(n){return Math.abs(Math.round(n*100)/100).toFixed(2).replace(".",",")+"\u00a0\u20ac";};
// Importo "compatto": interi senza decimali (12 €), non-tondi sempre
// a DUE decimali (5,30 €). Non arrotonda mai all'intero.
var eurInt=function(n){
  var v=Math.round(Math.abs(n)*100)/100;       // pulisco il floating, al centesimo
  var s=(v % 1 === 0) ? String(v) : v.toFixed(2).replace(".",",");
  return s+" \u20ac";
};
function saldoCls(n){return n>0?"ale":n<0?"luca":"pari";}
function saldoDesc(n){return n>0?"Ale Orsa deve "+eurInt(n)+" di miele":n<0?"Luca Orso deve "+eurInt(Math.abs(n))+" di miele":"Gli orsi sono in pari \uD83C\uDF6F";}

// Hash SHA-256 (usato per il PIN dell'area Solo). Restituisce hex.
async function sha256(str){
  var buf=await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(function(b){return b.toString(16).padStart(2,"0");}).join("");
}

// ── BACKUP / EXPORT (data-ownership, tutto lato client) ──
// Esporta un backup MANUALE e COMPLETO della cassa comune in un file
// JSON scaricabile. Nessuna scrittura su DB, nessuna chiamata di rete:
// serializza lo stato globale S già caricato. Funziona anche da file://.
// L'area Orso Solo (PIN-gated) NON è inclusa: va gestita a parte.
function esportaBackupJSON(){
  var obj={
    _schema:"tana-backup-v1",
    _exportedAt:new Date().toISOString(),
    app:"La Tana degli Orsi",
    _note:"Backup della sola cassa comune. L'area Orso Solo non è inclusa.",
    dati:S
  };
  var blob=new Blob([JSON.stringify(obj,null,2)],{type:"application/json"});
  var d=new Date();
  var ymd=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
  var url=URL.createObjectURL(blob);
  var a=document.createElement("a");
  a.href=url;
  a.download="tana-backup-"+ymd+".json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  dot("ok","Backup esportato 🐾");
}

// ── EXPORT CSV (storico spese mese corrente, human-readable) ──
// CSV PIATTO del solo S.txs per Excel/Sheets. Colonne: data,chi,importo,nota.
// Separatore virgola, escaping RFC 4180. Il backup completo resta il JSON.
function _csvCampo(v){
  v=String(v==null?"":v);
  if(/[",\n\r]/.test(v)) v='"'+v.replace(/"/g,'""')+'"';
  return v;
}
function esportaTxtCSV(){
  var righe=[["data","chi","importo","nota"].join(",")];
  (S.txs||[]).forEach(function(t){
    var dt=t.data?new Date(t.data):null;
    var dataLeggibile=(dt&&!isNaN(dt))
      ? String(dt.getDate()).padStart(2,"0")+"/"+String(dt.getMonth()+1).padStart(2,"0")+"/"+dt.getFullYear()
      : (t.data||"");
    var importo=(Math.round((t.importo||0)*100)/100).toFixed(2);
    righe.push([
      _csvCampo(dataLeggibile),
      _csvCampo(t.chi),
      _csvCampo(importo),
      _csvCampo(t.nota)
    ].join(","));
  });
  // BOM "﻿" => Excel legge correttamente UTF-8 (accenti/emoji).
  var blob=new Blob(["﻿"+righe.join("\r\n")],{type:"text/csv;charset=utf-8"});
  var d=new Date();
  var ymd=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
  var url=URL.createObjectURL(blob);
  var a=document.createElement("a");
  a.href=url;
  a.download="tana-spese-"+ymd+".csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  dot("ok","Spese esportate 🐾");
}
