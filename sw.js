const CACHE_NAME = 'tana-v94';

// ESSENZIALI: se ne manca uno l'installazione DEVE fallire (addAll è tutto-o-niente).
const ESSENZIALI = [
  './index.html',
  './variables.css',
  './layout.css',
  './components.css',
  './utils.js',
  './frasi.js',
  './api.js',
  './ui.js',
  './grafici.js',
  './debiti.js',
  './fisso.js',
  './solo.js',
  './app.js'
];

// UTILI: uno per uno; i mancanti si annotano nel verdetto, l'app funziona lo stesso.
const UTILI = [
  './',
  './manifest.json',
  './bear.svg',
  './bearface.svg',
  './pawprints.svg',
  './bear-empty.png',
  './bear-192.png',
  './bear-512.png',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js',
  'https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;700;800&family=Nunito:wght@600;700&display=swap'
];

// Verdetto dell'installazione, scritto in cache a questo indirizzo interno.
// Non va MAI chiesto alla rete: lo legge solo la pagina aprendo la cache
// (riga versione in Impostazioni).
const STATO = './__stato';

// cache:"reload" scavalca la cache HTTP del browser: senza, GitHub Pages
// serve i file vecchi e la cache nuova nasce col nome nuovo e il contenuto vecchio.
function fresco(u){ return new Request(u, { cache: 'reload' }); }

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(ESSENZIALI.map(fresco))
        .then(() => Promise.all(UTILI.map(u =>
          cache.add(fresco(u)).then(() => null, () => u)
        )))
        .then(esiti => cache.put(STATO, new Response(JSON.stringify({
          versione: CACHE_NAME,
          mancanti: esiti.filter(Boolean),
          ts: Date.now()
        }), { headers: { 'Content-Type': 'application/json' } })))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(
      ks.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  // NIENTE clients.claim(), di proposito (è un'idea che torna):
  // non ripara niente, perché con skipWaiting il controllerchange scatta
  // lo stesso sulle pagine già controllate; e farebbe scattare il
  // ricaricamento automatico anche alla primissima apertura.
});

self.addEventListener('fetch', e => {
  var u = e.request.url;
  if (u.includes('script.google.com') || u.includes('.supabase.co')) return;
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.open(CACHE_NAME).then(c => {
      return c.match(e.request).then(r => {
        var n = fetch(e.request).then(s => {
          if(s.status === 200) c.put(e.request, s.clone());
          return s;
        }).catch(() => r);
        return r || n;
      });
    })
  );
});
