<div align="center">
  <img src="./bear.svg" width="96" height="96" alt="Orso">

# La Tana degli Orsi 🍯

**Cassa comune di coppia — semplice, dolce, tutta nostra.**

</div>

---

## Cos'è

**La Tana degli Orsi** è una piccola app web (PWA) per gestire le spese condivise di una coppia.
Tiene il conto di chi ha speso cosa, calcola in ogni momento **chi deve quanto all'altro**, e a
fine mese **archivia** tutto in uno storico con grafici. Niente fogli di calcolo, niente
abbonamenti: si apre dal telefono come un'app vera e si usa in due.

È un progetto personale, costruito su misura per un uso reale quotidiano — estetica orso/miele,
testi in italiano, tono leggero.

---

## Cosa fa

**Cassa comune**
- Registri le spese (chi paga, quanto, nota, data) e vedi subito il **saldo**: chi deve "portare
  miele" all'altro e quanto.
- **Debito di partenza** impostabile, per partire da una situazione già sbilanciata.
- **Storico del mese** con filtro per orso (Tutti / Luca / Ale) e ordinamento per data.

**Debiti diretti**
- Prestiti puntuali tra i due orsi, con **rimborsi parziali**, storico dei rimborsi e barra di
  avanzamento fino al saldo.

**Spese fisse, ricorrenti e previste**
- Spese ricorrenti (mutuo, bollette…) e **spese previste** in arrivo, da non dimenticare.

**Lista della spesa & note**
- Una lista condivisa della spesa e una nota di coppia sempre a portata di mano.

**Archivio mensile**
- A fine mese **chiudi** la cassa: il mese finisce nell'archivio (raggruppato per anno, a
  fisarmonica) con totali e grafici.
- **Grafici**: torta *Luca vs Ale* del mese corrente, e barre dell'andamento **per mese** o
  **per anno**.
- **Promemoria di chiusura** non invadente quando inizi a registrare spese di un mese nuovo
  mentre il precedente è ancora aperto.
- **Spese retrodatate** segnalate con un piccolo indicatore 🕓 (restano nel mese corrente, solo
  evidenziate).

**Orso Solo** 🔒
- Un'area di **contabilità personale privata** per ciascun orso, protetta da **PIN**.
- Registro, categorie personalizzabili, ricorrenti, archivi per anno e grafici (inclusa la
  statistica categorie annuale).
- **Ponte automatico**: alla chiusura del mese comune, nel registro Solo di ogni orso entra una
  voce "🍯 Cassa Comune" pari all'intero speso da quell'orso quel mese.

**Impostazioni** 🍪
- Tema chiaro/scuro, cambio password, guida e tour, visibilità dell'Orso Solo.
- **Backup manuale** dei dati (export JSON completo + CSV delle spese) — i dati restano tuoi.

**PWA**
- Installabile su telefono e desktop, con icona propria e funzionamento anche offline per la
  consultazione (grazie al service worker).

---

## Sezione tecnica

### Stack
- **Frontend:** HTML / CSS / **JavaScript vanilla** — nessun framework, **nessun build step**,
  funzioni **globali** (i file si richiamano a runtime, niente import/export ES6).
- **Backend:** [Supabase](https://supabase.com) — Postgres + Auth + Realtime + RLS + funzioni SQL.
- **Hosting:** GitHub Pages.
- **PWA:** service worker con cache versionata.
- **Font:** Baloo 2 + Nunito. **Icone orso:** asset SVG/PNG dedicati.

### Struttura dei file
I JavaScript sono spacchettati per responsabilità e caricati in **quest'ordine** (conta, perché
le funzioni sono globali):

```
utils → frasi → api → ui → grafici → debiti → fisso → solo → app
```

| File | Responsabilità |
|------|----------------|
| `utils.js` | Costanti, stato globale `S`, helper puri (`saldo`, `eur`/`eurInt`, `sortChiusure`…), tema, sessione, backup/export |
| `frasi.js` | Frasi degli stati vuoti (facilmente modificabili) |
| `api.js` | Livello dati verso Supabase, `post()` con update ottimistico, boot `appStart()` |
| `ui.js` | Core UI: render della Tana, inserimento spese, chiusura mese, impostazioni, archivio |
| `grafici.js` | Grafici cassa comune (torta Luca/Ale, barre mesi/anni), donut condiviso, export PDF |
| `debiti.js` | Debiti diretti e rimborsi |
| `fisso.js` | Spese fisse, ricorrenti e previste |
| `solo.js` | Orso Solo (PIN, registro, categorie, ricorrenti, archivi, grafici, ponte) |
| `app.js` | Entry point: avvio dell'app |

I CSS sono divisi in `variables.css` (palette `:root`, reset), `layout.css` (login, header,
shell, griglia) e `components.css` (card, bottoni, modali…).

### Stato applicativo
Tutto lo stato della cassa comune vive in un unico oggetto globale:

```js
S = { saldoIniziale, txs[], chiusure[], debiti[], fisse[], previste[], lista[], nota{} }
```

### Convenzioni di progetto
- **Update ottimistico + rollback** su ogni azione: la UI si aggiorna subito, e se la scrittura
  su Supabase fallisce lo stato viene ripristinato.
- **Formati importi:** `eur()` sempre a 2 decimali; `eurInt()` interi puliti ma mai arrotondati
  (i non-interi restano a 2 decimali). I saldi arrotondano al centesimo.
- **Conferme:** azioni reversibili → conferma inline *Sì/No*; azioni distruttive → `confirm()` o
  cestino.
- **Archivio:** ordine canonico delle chiusure centralizzato in `sortChiusure()` (discendente
  per data).
- **Ponte Solo ↔ comune:** alla chiusura del mese comune, ogni Orso Solo riceve la quota intera
  spesa da quell'orso; la categoria "Cassa Comune" è protetta.

### Configurazione
In `utils.js` vanno impostati i riferimenti al proprio progetto Supabase:

```js
var SUPABASE_URL = "https://<tuo-progetto>.supabase.co";
var SUPABASE_ANON_KEY = "<chiave anon/public>";
var TANA_EMAILS = ["<utente-condiviso>"]; // login a sola password
```

L'autenticazione usa un **utente condiviso** Supabase: la schermata di login chiede solo la
password. La chiave `anon` è pubblica per definizione; la protezione dei dati è affidata alle
policy **RLS** lato Postgres.

### Sviluppo & deploy
- Sviluppo in locale (nessun build): test aprendo i file via server statico locale o `file://`.
- Controllo sintassi prima di pubblicare: `node --check <file>.js` su ogni file modificato.
- Pubblicazione: upload dei file sul branch `main` (GitHub Pages serve direttamente).
- **A ogni deploy** si incrementa `CACHE_NAME` in `sw.js` per invalidare la cache della PWA.
- Dopo il deploy, *hard refresh* su PC e telefono per vedere subito la versione nuova.

### Backup & data ownership
Dalla schermata Impostazioni è possibile esportare:
- **Backup JSON** completo e versionato (`tana-backup-v1`) dell'intera cassa comune;
- **CSV** delle spese del mese corrente (RFC 4180, UTF-8) per Excel/Fogli.

> L'area **Orso Solo** (protetta da PIN) **non** è inclusa nel backup della cassa comune: è
> gestita separatamente per ragioni di privacy.

---

## Stato del progetto

Progetto personale a sviluppo singolo, pensato per l'uso reale di coppia. In evoluzione continua
verso la release 1.0.

<div align="center">

*Fatto con 🍯 nella Tana.*

</div>
