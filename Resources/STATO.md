# La Tana degli Orsi — stato

**Aggiornato il:** 261016, dall'architetto di mantenimento, con il commit del trasloco parte A.
Si riscrive, non cresce: **massimo 300 righe**. La storia sta in git e in `Resources/Archivio/`.

---

## 1. Come si pubblica

- **Produzione:** ramo `main` → GitHub Pages, `https://ilkajino.github.io/LaTanaDegliOrsi/`.
  Repository ancora pubblico: diventa privato **insieme** al passaggio a Workers (trasloco §3.1).
- **Prova:** ramo `testing` → `https://latanadegliorsi-testing.skummbar.workers.dev/`
  (worker ponte, vedi §4).
- iL KaJiNo prova `testing` dal telefono e unisce in `main` dall'app GitHub. Code lavora nel cloud,
  su `testing`; unisce solo con autorizzazione esplicita. La sessione di Code va aperta sul ramo
  su cui deve fare il push: è l'unico che può scrivere.
- Etichette e cancellazioni di rami: le fa iL KaJiNo da GitHub («Publish release», poi verifica in Tags).
- Nome della cache attuale: `tana-v105`. Forma `tana-vNN` obbligata (la riga versione in Impostazioni
  riconosce solo quella); si sale a ogni pubblicazione, mai all'indietro.
- Etichetta di ritorno: `Backup_Pre_Metodo` (= `main` @ 102b325, v105).

## 2. Vincoli

- **Modello di minaccia:** app domestica per due persone, nessun dato sensibile; il rischio che conta è
  vandalismo o perdita dei dati, non la riservatezza. Un solo account condiviso; l'email di accesso è
  visibile nella pagina di proposito, l'unico segreto è la password.
- **Supabase:** progetto `yupqbobnqtcajvxjhgjg`, schema `public`. RLS attiva su tutte le 13 tabelle,
  nessuna policy per `anon`, nessuna funzione eseguibile da `anon`. Le policy della Tana sono
  `to authenticated using (true)`: **ogni account del progetto è una chiave della Tana.**
  Funzioni: `chiudi_mese`, `ripristina_mese`, `crea_backup_cassa`, `rls_auto_enable` (SECURITY DEFINER);
  `ripristina_solo_mese` (SECURITY INVOKER: stesso utente, giusto così).
  L'event trigger `ensure_rls` accende la RLS in automatico solo su `public`.
  **Iscrizione libera spenta** a livello di progetto (verificato 261016).
- **Convivenza con Quarti d'Ora** (dal 261016): stesso progetto, schema `ore`, migrazioni `qdo_`,
  un solo account suo creato a mano. Nessuna migrazione, pulizia o backup della Tana tocca `ore`;
  `000_base.sql` esporta solo `public`. Quarti d'Ora non usa accesso anonimo né policy `anon`
  senza avvisare. Le due password che aprono il progetto vanno tenute lunghe e non riusate.
- **Chi tiene sveglio il database:** l'uso quotidiano dell'app (da confermare).
- **Backup:** interno, pg_cron `tana-backup-notturno` alle 02:30 UTC → `backup_cassa` (11 tabelle;
  `solo_profili` esclusa di proposito: contiene gli hash dei PIN); pulizia `tana-backup-pulizia` la
  domenica alle 03:00 UTC, 90 giorni; sola lettura. Manca il backup esterno: arriva con il repository
  di backup unico del Metodo.
- **Vincoli del codice — ognuno è costato una sessione:**
  1. Ogni nuovo modale: `apriSopra(id)`, una voce in `CHIUSURE_MODALI`, `passoChiuso(id)` come ultima
     riga della chiusura. Mai `classList.add("open")` diretto su un `.modal-overlay`. Modali: 27.
  2. Cambi di scheda sempre da `switchTab`; `mostraTab` dipinge e basta.
  3. Service worker: due liste (ESSENZIALI tutto-o-niente, UTILI no), `cache:"reload"` anche nella
     rivalidazione, verdetto in `./__stato`, `skipWaiting` dopo, MAI `clients.claim()`. Le tre guardie
     del ricaricamento stanno nel `<head>`, prima di tutto il resto.
  4. `.main` ha `touch-action: pan-y pinch-zoom`: senza, l'app esce al primo indietro dopo uno swipe.
     Per uno scorrimento orizzontale si mette `touch-action: auto` su QUELL'elemento.
  5. Card con il velo: una card nuova delle schede va nell'elenco in fondo a `components.css`.
  6. Barra delle schede: piena `--brown-d` per 58px; sotto i tasti di Android la fascia `#6B3F1F`
     (gradiente, v104). La trasparenza sopra lo sfondo chiaro è stata provata e scartata (v103).

## 3. Decisioni da non riaprire

- 260913 — Backup notturno interno; dal 260925 comprende l'area Solo.
- 260921 — `chiudi_mese` cancella solo le transazioni archiviate (R-root).
- 260926 — Versione visibile + autoaggiornamento (v95), tasto indietro (v96), velo sulle card (v97).
- 261013 — Trasloco nel nuovo assetto: tutto su git, `testing`/`main`, repository privato, Workers.
- 261015 — Modifica di un prestito: residuo = importo − somma dei rimborsi; importo inferiore ai
  rimborsi rifiutato (v105).
- 261016 — Email di accesso visibile di proposito: non si nasconde.
- Nessun `history.go` dentro il `popstate` (§7).
- `orsi_autorizzati` / `e_orso()`: non si fa (250925) **finché nel progetto esistono solo l'account della
  Tana e quello di Quarti d'Ora**. Si riapre, PRIMA, se arriva un terzo account o l'accesso anonimo.

## 4. Deroghe al Metodo

- **Struttura piatta, senza `css/` `js/` `img/`.** — Spostare i file di un'app in produzione cambia
  percorsi e liste del service worker: un rilascio a rischio che non rende niente (261016).
- **`ui.js` e `solo.js` oltre le ~1.500 righe** (anche in `strumenti/metodo.conf`). — Divisione
  rinviata a quando servirà toccarli in profondità (261016).
- **TEMPORANEA, fino alla v106 — guscio non equivalente al modello.** `sw.js` non ripulisce le risposte
  con rinvio (`pulita()`, necessario su Cloudflare per il 307 di `/index.html`) e chiede
  `supabase-js@2` senza versione esatta. Le guardie del ricaricamento sono equivalenti. Dopo la v106:
  «guscio proprio, equivalente al modello».
- **TEMPORANEA, fino al passaggio di `main` a Workers — worker ponte `latanadegliorsi-testing`** con
  `testing` come produzione, invece delle anteprime del worker unico; indirizzi reali in §1 invece
  di quelli del modello.
- **TEMPORANEA — segnale di `testing` (pwa.md §12) non ancora presente.** Da decidere con iL KaJiNo:
  le icone dell'orso le fornisce solo lui, quindi l'icona di prova o la fornisce lui o non c'è.

## 5. Dati di prova

- La Tana ha un solo account reale e nessuna separazione: su `testing` si entra con il proprio account
  (collaudo.md §3, app con email e password).
- Una voce di prova si marca `PROVA` nella descrizione e **si cancella subito**, non dopo l'unione.
- Niente chiusure del mese né ripristini di prova su `testing`: agiscono sui conti veri.

## 6. In corso

- **Handoff aperto:** trasloco parte A, in `Resources/Archivio/` a fine lavoro.
- **Ordine:** parte A (questo) → v106 (`sw.js` al modello, `supabase-js` a versione esatta, segnale di
  `testing`; prove di pwa.md §11) → inventario dei rami (fatto 261016: restano `main` e `testing`) →
  repository privato + worker `latanadegliorsi` con le anteprime, insieme (PWA da reinstallare sui due
  telefoni, coda offline vuota PRIMA, backup JSON manuale PRIMA, vecchia origine da neutralizzare,
  due 404 su produzione e testing, poi si elimina il worker ponte) → parte B (archivio dal PC con
  ricerca dei segreti, `000_base.sql` solo `public`).
- **`testing`:** = `main` + `wrangler.jsonc`, `.assetsignore`, documenti.

## 7. Debiti noti

- Dopo aver nascosto il Solo con un passo «solo» già in cronologia, una pressione di indietro non
  cambia niente. Il rimedio (`history.go` nel `popstate`) è scartato: un'app che arretra da sola fino a
  chiudersi è peggio. Il contatore `_saltiVuoti` esiste solo per questo.
- Un export manuale fra il PIN giusto e il caricamento di `soloData` uscirebbe col Solo vuoto.
  Irraggiungibile a mano: lasciato.
- La chiave `anon` è stata pubblica per mesi: oggi non apre niente senza la password.
- Il colore della schermata d'avvio e della barra di Android nelle PWA già installate viene dal
  manifest salvato all'installazione: Android lo aggiorna con calma, o si reinstalla.
- Le prime versioni del worker ponte (costruite da `main`) contengono `.git/` nei loro indirizzi di
  anteprima: solo codice già pubblico; si chiudono eliminando il worker ponte.

## 8. Dati di servizio

- Repository: `iLKaJiNo/LaTanaDegliOrsi` (pubblico fino al passaggio a Workers)
- Worker Cloudflare: `latanadegliorsi-testing` (ponte); poi `latanadegliorsi`
- Progetto Supabase: `yupqbobnqtcajvxjhgjg`, schema `public`; chiave `anon` (il valore sta nel codice)
- **Nessun segreto in questo file.**
