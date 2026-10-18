HANDOFF — La Tana degli Orsi — v106 (testing): guscio equivalente al modello + segnale di testing
Da: l'architetto di mantenimento · Per: Code · Decisore: iL KaJiNo
261018, ore 11:45
Risposta a: Resources/Archivio/261016_2320 HANDOFF trasloco parte A.md
Si parte da: testing @ 5a2cfbc (tana-v105). main @ abe7114. SOLO testing: niente PR, niente main.
Modello consigliato: Opus, ragionamento alto — si tocca sw.js (pwa.md §10: un guscio rotto non si ripara da solo).
Leggi prima: Resources/STATO.md, poi skill metodo pwa.md §§3–12 e modelli/sw.js, modelli/segnale-testing.js,
modelli/manifest-testing.json.

== 0. PERIMETRO ==
- Si toccano: sw.js, index.html (solo <head> e il tag di supabase-js), manifest-testing.json (nuovo),
  bear-testing-192.png e bear-testing-512.png (nuovi), ui.js (solo la riga versione, vedi §4),
  Resources/STATO.md, nome del report in Archivio.
- NON si toccano: logica dell'app, CSS, manifest.json, icone esistenti, touch-action di .main,
  le tre guardie del ricaricamento nel <head> (equivalenti al modello: restano come sono).
- Il nome della cache sale: 'tana-v105' → 'tana-v106'.
- Decidi da solo: forma del codice, ordine dei passi, dettagli grafici dell'icona di prova.
  Ti fermi e chiedi per tutto ciò che cambia il comportamento dell'app vera.
- Imprevisti → STOP e segnala all'architetto.

== 1. sw.js EQUIVALENTE AL MODELLO ==
Riscrivi sw.js partendo da modelli/sw.js (Clan v168), con queste differenze VOLUTE, ognuna commentata nel file:
a) Rivalidazione: la richiesta di rete del fetch handler resta con cache:'reload' (oggi `fresca`;
   per le navigazioni si ricostruisce dall'URL, come ora). Vincolo della Tana (STATO §2.3): GitHub
   Pages manda max-age e senza 'reload' la cache HTTP rimette copie vecchie.
b) Il verdetto resta in './__stato' con la forma che ui.js legge oggi ({versione, mancanti, ts}:
   VERIFICA i campi leggendo ui.js ~r.1712–1760 e mantienili compatibili). Niente ESITO_INSTALL del modello.
c) Le liste:
   ESSENZIALI = './index.html', i tre .css, i dieci .js (come oggi).
   UTILI = './', './manifest.json', './manifest-testing.json', bear.svg, bearface.svg, pawprints.svg,
   bear-empty.png, bear-192.png, bear-512.png, bear-testing-192.png, bear-testing-512.png,
   'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/dist/umd/supabase.min.js',
   il CSS di Google Fonts com'è oggi.
Dal modello si prendono INVECE, identici: installazione con scarica()+ricopia() (prima tutti gli
essenziali, poi si scrive), pulita() su ciò che entra in cache e su ciò che esce dalla cache
(il 307 di Cloudflare su /index.html), gestione di opaqueredirect, ripiego per le navigazioni senza
rete o con risposta non ok (c.match('./index.html') passata da pulita()), activate che cancella le
cache vecchie, NIENTE clients.claim(), skipWaiting dopo l'installazione.
L'esclusione di '.supabase.co' resta (e anche 'script.google.com', innocua).

== 2. supabase-js A VERSIONE ESATTA ==
index.html r.~971: '@supabase/supabase-js@2/' → '@supabase/supabase-js@2.118.0/'. Stessa stringa in UTILI.
Prima verifica che 2.118.0 esista e sia l'ultima 2.x (npm view @supabase/supabase-js version, o
il package.json su jsdelivr). Se l'ultima 2.x è un'altra: STOP e segnala, non scegliere da solo.

== 3. IL SEGNALE DI TESTING (pwa.md §12) ==
- Nel <head>, subito DOPO il blocco del ricaricamento (e prima della registrazione del sw), incolla
  modelli/segnale-testing.js identico.
- manifest-testing.json dal modello: name "La Tana degli Orsi TESTING", short_name "La Tana T",
  description "La copia di prova della Tana: non è l'app vera.", colori #C0392B, icone
  ./bear-testing-192.png e ./bear-testing-512.png (struttura piatta, deroga STATO §4).
- Le due icone di prova: AUTORIZZAZIONE ESPLICITA di iL KaJiNo (17/10/2026) a ricavarle dalle sue
  bear-192.png e bear-512.png. Stesso orso, con una fascia rossa #C0392B in basso (circa 22% dell'altezza)
  e la scritta «TESTING» bianca, leggibile anche a 48px. Le icone originali NON si modificano.
  Strumento a tua scelta (ImageMagick o Python PIL). Allega nel report dimensioni e peso dei due file.
- In produzione (github.io e latanadegliorsi.skummbar.workers.dev) il blocco non deve scattare:
  verifica la condizione sull'hostname a mano nel report.

== 4. LA RIGA VERSIONE (pwa.md §9) ==
In ui.js, nella funzione della riga versione: se location.hostname comincia con "testing-",
aggiungi « · testing» alla riga. Una riga, nient'altro.

== 5. STATO.md ==
- Testata: «Aggiornato il: 261018 … con il commit della v106».
- §1: Prova → `https://testing-latanadegliorsi.skummbar.workers.dev/` (anteprima del worker
  `latanadegliorsi`, ramo `testing`). Aggiungi: «Worker `latanadegliorsi` già attivo anche per `main`
  su `https://latanadegliorsi.skummbar.workers.dev/` (non ancora usato dai telefoni: la produzione
  vera resta GitHub Pages fino al passaggio)». Cache attuale: `tana-v106`.
- §4: sostituisci la deroga TEMPORANEA sul guscio con:
  «**Guscio proprio, equivalente al modello** (v106). Differenze volute: rivalidazione con
  `cache:"reload"` (GitHub Pages manda max-age); verdetto in `./__stato` nella forma letta dalla riga
  versione. Il resto (scarica/ricopia, `pulita()`, ripiego, niente `claim()`) è quello del modello.»
- §4: togli la deroga TEMPORANEA sul worker ponte e quella sul segnale di testing.
  Aggiungi: «**Icona di prova ricavata dall'orso** (`bear-testing-*.png`): eccezione alla regola
  "le icone le fornisce solo iL KaJiNo", autorizzata da lui il 171017.» (scrivi la data come 261017)
- §6: aggiorna «In corso»: v106 su testing da provare; poi unione in main; poi il passaggio
  (reinstallazione, rinvio dalla vecchia origine, repository privato); poi parte B.
  `testing` = `main` + documenti della parte A + wrangler.jsonc del modello + v106.
- §7: togli il debito sul 307 e quello sulle versioni del worker ponte (eliminato).
- §8: Worker Cloudflare: `latanadegliorsi` (il ponte è eliminato).

== 6. ARCHIVIO ==
- Rinomina «Resources/Archivio/261016_0019 REPORT trasloco parte A.md» in
  «Resources/Archivio/261017_0219 REPORT trasloco parte A.md» (ora di Roma).
- Salva questo handoff in Resources/Archivio/261018_1145 HANDOFF v106 guscio e segnale.md e il report
  accanto, nello stesso commit.

== 7. CONTROLLI E COLLAUDO ==
- node --check su ogni .js toccato.
- bash <skill>/script/prima-di-pubblicare.sh origin/main → esito integrale (atteso: deroga «righe», 0 errori).
- Dopo il push, quando https://testing-latanadegliorsi.skummbar.workers.dev serve tana-v106,
  prove 1 e 2 di pwa.md §11 con un browser headless (Chromium/Playwright c'è nell'ambiente):
  1) installazione pulita: leggi './__stato' dalla cache → versione tana-v106, mancanti [];
  2) blocca un UTILE (es. bear-testing-512.png) con l'intercettazione di rete: l'installazione riesce e
     il verdetto lo elenca fra i mancanti.
  Verifica anche: fascia «TESTING · non è l'app vera» presente, titolo «TESTING · …», manifest
  = manifest-testing.json; e che /index.html (307) aperto offline dalla PWA installata non dia errore
  se riesci a simularlo. Le prove 3, 4, 5 le fa iL KaJiNo sul telefono.
  Se l'ambiente non permette il browser: dillo, non simulare.

== 8. COMMIT ==
Un commit: "v106 (testing): guscio equivalente al modello, supabase-js 2.118.0, segnale di testing"
git push origin testing. Niente PR, niente main.

== REPORT ==
UN SOLO blocco di codice copincolla: hash, git diff --stat origin/main..testing, diff completo di
sw.js e del <head> di index.html, esito dello script, esito delle prove 1–2 e delle verifiche del
segnale, dimensioni/peso delle icone di prova, anomalie.
