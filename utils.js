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
var TANA_EMAIL = "orsi@tana.casa";

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
  var res=await sb.auth.signInWithPassword({email:TANA_EMAIL,password:pw});
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
function saldo(){return S.txs.reduce(function(a,t){return t.chi==="Luca"?a+t.importo:a-t.importo;},S.saldoIniziale);}
function fmt(iso){if(!iso)return"";var d=new Date(iso);return isNaN(d)?iso:String(d.getDate()).padStart(2,"0")+"/"+String(d.getMonth()+1).padStart(2,"0");}
function fmtLong(iso){if(!iso)return"";var d=new Date(iso);return isNaN(d)?iso:d.toLocaleDateString("it-IT",{day:"numeric",month:"long",year:"numeric"});}
var eur=function(n){return Math.abs(Math.round(n*100)/100).toFixed(2).replace(".",",")+"\u00a0\u20ac";};
var eurInt=function(n){return Math.abs(Math.round(n))+" \u20ac";};
function saldoCls(n){return n>0?"ale":n<0?"luca":"pari";}
function saldoDesc(n){return n>0?"Ale Orsa deve "+eurInt(n)+" di miele":n<0?"Luca Orso deve "+eurInt(Math.abs(n))+" di miele":"Gli orsi sono in pari \uD83C\uDF6F";}
