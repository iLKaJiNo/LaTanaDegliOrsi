// ════════════════════════════════════════════════════════
//  TANA DEGLI ORSI — utils.js
//  Costanti, stato globale, helper puri, tema, sessione.
//  Caricato per PRIMO: definisce ciò che gli altri file usano.
// ════════════════════════════════════════════════════════

// ── LINK E COSTANTI ──
var GS = "https://script.google.com/macros/s/AKfycbzyMmaDl__D2JxBZFSbPCMZaWcUDo5nBS83dmchKf5lFhs26uxawKqKfsrQsS9nz6uX/exec"; 
var EXPECTED_HASH = "219bdf69254cc2376c843fb2cc5fe99549159e4cf49732e44fc667d90a02aa7f";
var SESSION_KEY = "tana_session";
var HASH_KEY = "tana_pw_hash"; // cache locale dell'hash corrente

// Restituisce l'hash da usare: quello salvato localmente (post cambio pw) o il default
function getCurrentHash(){
  return localStorage.getItem(HASH_KEY) || EXPECTED_HASH;
}

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
var archivioSegmento="mesi"; // "mesi" | "anni"
var annoAperto=null;
var THEME_KEY="tana_theme";
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

// ── AUTH / SESSIONE / CRYPTO ───────────────────────────

// ── AUTH E LOGIN ──
async function sha256(str){
  var buf=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(function(b){return b.toString(16).padStart(2,"0");}).join("");
}
function getSession(){return localStorage.getItem(SESSION_KEY);}
function setSession(t){localStorage.setItem(SESSION_KEY,t);}
function clearSession(){localStorage.removeItem(SESSION_KEY);}
function genToken(){var a=new Uint8Array(24);crypto.getRandomValues(a);return Array.from(a).map(function(b){return b.toString(16).padStart(2,"0");}).join("");}
function togglePwVisibility(){var i=document.getElementById("login-pw");i.type=i.type==="password"?"text":"password";}

async function doLogin(){
  var pw=document.getElementById("login-pw").value;
  if(!pw)return;
  var btn=document.getElementById("login-btn");
  btn.disabled=true;
  document.getElementById("login-error").textContent="";
  document.getElementById("login-loading").textContent="Verifica in corso...";
  var hash=await sha256(pw);
  if(hash!==getCurrentHash()){
    document.getElementById("login-loading").textContent="";
    document.getElementById("login-error").textContent="Password errata. Riprova.";
    document.getElementById("login-pw").value="";
    btn.disabled=false;
    return;
  }
  var token=genToken();setSession(token);
  try{await post({action:"setToken",token:token,hash:hash});}catch(e){}
  document.getElementById("login-loading").textContent="";
  document.getElementById("login-screen").classList.remove("active");
  appStart();
}
function logout(){clearSession();location.reload();}
function authInit(){
  if(getSession()){appStart();}
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
function saldo(){return S.txs.reduce(function(a,t){return t.chi==="Luca"?a+t.importo:a-t.importo;},S.saldoIniziale);}
function fmt(iso){if(!iso)return"";var d=new Date(iso);return isNaN(d)?iso:String(d.getDate()).padStart(2,"0")+"/"+String(d.getMonth()+1).padStart(2,"0");}
function fmtLong(iso){if(!iso)return"";var d=new Date(iso);return isNaN(d)?iso:d.toLocaleDateString("it-IT",{day:"numeric",month:"long",year:"numeric"});}
var eur=function(n){return Math.abs(Math.round(n*100)/100).toFixed(2).replace(".",",")+"\u00a0\u20ac";};
var eurInt=function(n){return Math.abs(Math.round(n))+" \u20ac";};
function saldoCls(n){return n>0?"ale":n<0?"luca":"pari";}
function saldoDesc(n){return n>0?"Ale Orsa deve "+eurInt(n)+" di miele":n<0?"Luca Orso deve "+eurInt(Math.abs(n))+" di miele":"Gli orsi sono in pari \uD83C\uDF6F";}
