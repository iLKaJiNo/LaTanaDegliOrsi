// Il guscio: modello dalla skill metodo (pwa.md). Preso dal sw.js del Clan del Parmigiano,
// v168. Si copia, si sostituisce <app>, si riempiono le due liste. Il resto non si tocca senza
// un perché scritto: ogni riga qui sotto è costata almeno una sessione.
// DIFFERENZE VOLUTE DELLA TANA (STATO.md §4), ognuna segnata con «Tana:» dove sta:
//   a) anche la rivalidazione del fetch chiede con cache:'reload' (GitHub Pages manda max-age);
//   b) il verdetto sta in './__stato' nella forma { versione, mancanti, ts } letta dalla riga
//      versione (ui.js, aggiornaRigaVersione), al posto di ESITO_INSTALL del modello;
//   c) le liste sono quelle della Tana, in struttura piatta (deroga STATO.md §4).

// ⚠️ Sale a OGNI pubblicazione che tocca un file servito, anche per una virgola: è così che il
// browser installa il worker nuovo e riscarica tutto insieme. La Tana, 02/10/2026: due contenuti
// con la stessa v100. Il controllo lo fa script/prima-di-pubblicare.sh.
// Il prefisso `tana-` è quello che la riga della versione cerca in caches.keys().
const CACHE_NAME = 'tana-v106';

// ── DUE LISTE ───────────────────────────────────────────────────────────────
// La domanda che le divide: senza questo file, l'app esiste ancora?
// ESSENZIALI: tutto-o-niente. Una cache col guscio a metà è peggio di nessuna cache.
const ESSENZIALI = [
  './index.html',
  './variables.css', './layout.css', './components.css',
  './utils.js', './frasi.js', './api.js', './ui.js', './grafici.js',
  './debiti.js', './fisso.js', './solo.js', './app.js'
];
// UTILI: uno per uno, chi cade cade da solo e finisce nell'elenco dei mancanti.
// ⚠️ `'./'` sta qui e non fra gli essenziali: su Cloudflare './index.html' si scarica già
// passando da './' (è la destinazione del rinvio), e da essenziale aggiungerebbe solo un modo
// di fallire (Clan, 05/09/2026: un 403 su './' e il worker non si è installato mai).
// ⚠️ Ogni indirizzo esterno sta qui, mai fra gli essenziali, e con la VERSIONE ESATTA:
// con `@2` una 2.x difettosa rompe l'app senza una pubblicazione nostra (Clan, 12/10/2026).
// ⚠️ La stessa stringa di supabase-js sta nell'index.html.
const UTILI = [
  './',
  './manifest.json', './manifest-testing.json',
  './bear.svg', './bearface.svg', './pawprints.svg', './bear-empty.png',
  './bear-192.png', './bear-512.png',
  './bear-testing-192.png', './bear-testing-512.png',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/dist/umd/supabase.min.js',
  'https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;700;800&family=Nunito:wght@600;700&display=swap'
];

// L'esito dell'installazione, scritto DENTRO la cache: versione, ora, file mancati. Invecchia e
// sparisce con lei. Non va MAI chiesto alla rete: lo legge solo la pagina aprendo la cache.
// Tana (b): indirizzo './__stato' e forma { versione, mancanti, ts }, quelli che la riga
// versione legge da settembre 2026. ⚠️ Se cambia qui, cambia in ui.js (aggiornaRigaVersione).
const STATO = './__stato';

// ⚠️ Le richieste del worker passano per la cache HTTP del browser: senza `reload` la cache
// nuova può nascere col contenuto vecchio. Misurato il 05/09/2026: la cache v57 conteneva
// l'index.html della v56.
function fresca(u){ return new Request(u, { cache: 'reload' }); }

// ⚠️ Su Cloudflare './index.html' risponde con un rinvio (307) verso './', e la risposta porta
// `redirected: true`: Chrome si rifiuta di mostrarla a una navigazione (ERR_FAILED). Si ricopia
// senza il segno. Misurato il 15/09/2026. `blob()` e non `body`: non tutti i browser reggono un
// corpo in streaming dentro `new Response`.
function ricopia(s){
  return s.blob().then(b => new Response(b, { status: s.status, statusText: s.statusText, headers: s.headers }));
}
function pulita(s){ return s.redirected ? ricopia(s) : Promise.resolve(s); }

function scriviEsito(c, mancanti){
  return c.put(STATO, new Response(JSON.stringify({
    versione: CACHE_NAME, mancanti: mancanti, ts: Date.now()
  }), { headers: { 'Content-Type': 'application/json' } })).catch(function(){});
}

self.addEventListener('install', e => {
  // Un file, pronto per la cache. Rifiuta su ogni risposta non `ok`.
  // ⚠️ Il contenuto si legge SUBITO (`ricopia`): risposte tenute in mano non lette occupano una
  // connessione ciascuna, e su HTTP/1.1 il settimo file non partiva mai. Misurato il 15/09/2026.
  var scarica = u => fetch(fresca(u)).then(s => {
    if (!s.ok) throw new Error(u);
    return ricopia(s);
  });
  e.waitUntil(caches.open(CACHE_NAME).then(c =>
    // Il guscio: prima si scaricano TUTTI, poi si scrive. Se uno cade non entra niente.
    Promise.all(ESSENZIALI.map(scarica))
      .then(rs => Promise.all(rs.map((s, i) => c.put(ESSENZIALI[i], s))))
      // Il resto: ogni riga dà il nome del file se fallisce, `null` se va bene.
      .then(() => Promise.all(UTILI.map(u => scarica(u).then(s => c.put(u, s)).then(() => null, () => u))))
      .then(mancanti => scriviEsito(c, mancanti.filter(Boolean)))
  ).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  // ⚠️ NIENTE clients.claim(). Misurato il 05/09/2026, 3 su 3: controllerchange scatta già senza,
  // fra +1,6 e +2,1 s. claim() serve solo al primo ingresso, dove il ricaricamento NON deve
  // scattare: farebbe lampeggiare l'app a chi la apre per la prima volta.
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))));
});

self.addEventListener('fetch', e => {
  var u = e.request.url;
  // i dati non passano mai dalla cache (script.google.com: il vecchio export, innocuo)
  if (u.includes('script.google.com') || u.includes('.supabase.co')) return;
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.open(CACHE_NAME).then(c => c.match(e.request).then(r => {
      // Senza rete, una navigazione riceve './index.html', che è essenziale e quindi c'è.
      // Due guasti diversi: la rete che CADE (catch) e la rete che RISPONDE MALE (!s.ok).
      var ripiego = () => e.request.mode === 'navigate' ? c.match('./index.html').then(x => x && pulita(x)) : undefined;
      // Tana (a): anche la rivalidazione chiede con cache:'reload'. GitHub Pages manda max-age, e
      // senza 'reload' la cache HTTP del browser rimette qui una copia vecchia, sopra il file
      // fresco appena installato (STATO.md §2.3). Una navigazione non si ricostruisce con opzioni
      // (TypeError): si riparte dall'indirizzo, con redirect:'manual' come la navigazione
      // originale, così il 307 di Cloudflare torna `opaqueredirect` come nel modello.
      var richiesta = e.request.mode === 'navigate'
        ? new Request(u, { cache: 'reload', redirect: 'manual' })
        : new Request(e.request, { cache: 'reload' });
      var n = fetch(richiesta).then(s => {
        // Il rinvio di Cloudflare chiesto da una navigazione torna come `opaqueredirect`:
        // va restituito com'è, lo segue il browser. Non è un guasto da coprire col ripiego.
        if (s.type === 'opaqueredirect') return s;
        if (s.status === 200) pulita(s.clone()).then(p => c.put(e.request, p));
        if (!s.ok) return Promise.resolve(ripiego()).then(f => f || s);
        return s;
      }).catch(() => r || ripiego());
      // Prima la cache, e intanto la rete aggiorna. Anche ciò che esce dalla cache passa da
      // pulita(): la cintura per la strada che verrà aggiunta domani senza saperlo.
      return r ? pulita(r) : n;
    }))
  );
});
