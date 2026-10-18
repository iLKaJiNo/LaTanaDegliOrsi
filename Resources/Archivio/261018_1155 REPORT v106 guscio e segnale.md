# Report — v106 (testing): guscio equivalente al modello, supabase-js 2.118.0, segnale di testing

**Da:** Code · **Per:** l'architetto di mantenimento della Tana · **Decisore:** iL KaJiNo
**261018, ore 11:55**
**Risposta a:** `Resources/Archivio/261018_1145 HANDOFF v106 guscio e segnale.md`
**Modello:** Opus, ragionamento alto
**Esito:** fatto tutto il perimetro; banco locale verde (prove 1–2, segnale, `/index.html` online e
offline). Il collaudo all'indirizzo di `testing` è in fondo («Collaudo su testing»).

---

## Cosa è stato fatto

- `sw.js` riscritto da `modelli/sw.js` (Clan v168). Differenze volute, segnate «Tana:» nel file:
  (a) la rivalidazione chiede con `cache:'reload'`; per le navigazioni si ricostruisce dall'URL **con
  `redirect:'manual'`**, così il 307 di Cloudflare torna `opaqueredirect` come nel modello;
  (b) verdetto in `./__stato`, forma `{ versione, mancanti, ts }` (verificata su `ui.js`,
  `aggiornaRigaVersione` / `testoVersione`: legge `stato`, `stato.mancanti`, conta le voci togliendo
  il verdetto); (c) le liste della Tana. Il resto identico al modello. Cache `tana-v106`.
- `index.html`: `supabase-js@2.118.0` (verificato: `npm view` → `latest` = 2.118.0; jsdelivr risolve
  `@2` → 2.118.0); segnale di testing incollato identico.
- `manifest-testing.json` dal modello, con i valori dell'handoff.
- `bear-testing-192.png` (192×192, 12.240 B) e `bear-testing-512.png` (512×512, 44.817 B), con PIL
  dalle `bear-*.png` (non toccate): fascia `#C0392B` sul 22% in basso, che segue gli angoli
  arrotondati dell'icona; «TESTING» bianco in Inter ExtraBold, ~80% della larghezza. Riguardata a 48 px:
  leggibile.
- `ui.js`: una riga, ` · testing` quando l'hostname comincia con `testing-`.
- `STATO.md` §§ testata, 1, 4, 6, 7, 8; report di parte A rinominato in `261017_0219 …`.

## Cosa è stato misurato

| cosa | come | risultato |
|---|---|---|
| i file si caricano | `node --check` su ogni `.js` | 10 su 10 a posto |
| controlli prima di pubblicare | `prima-di-pubblicare.sh origin/main` | 0 errori, 1 avviso (deroga «righe») |
| condizione sull'hostname | a mano, stessa espressione del blocco | `ilkajino.github.io` no · `latanadegliorsi.skummbar.workers.dev` no · `testing-latanadegliorsi…` sì |
| prova 1, banco locale con 307 su `/index.html` | Playwright, contesto pulito | `__stato` = `tana-v106`, `mancanti: []`, 27 voci (13 + 13 + verdetto) |
| prova 2, banco locale | Playwright, `bear-testing-512.png` interrotto | installata; `mancanti: ["./bear-testing-512.png"]` |
| segnale, banco locale | Playwright | titolo «TESTING · La Tana degli Orsi», manifest `./manifest-testing.json`, theme-color `#C0392B`, fascia «TESTING · non è l'app vera» con `pointer-events:none` |
| `/index.html` con il sw al comando | Playwright, online e offline | 200, schermata di login, nessun errore di pagina |

Screenshot: nessuno (le icone sono state guardate solo come file, qui).

## Decisioni prese da Code

- **Il segnale sta dopo i `<link>` del `<head>`, non «subito dopo» il ricaricamento.** Il blocco cerca
  `link[rel="manifest"]`, che nella Tana sta 4 righe sotto il ricaricamento: incollato subito dopo, non
  l'avrebbe trovato e il manifest di prova non sarebbe scattato mai. Sta subito prima della
  registrazione del sw, come chiede l'handoff; il commento del modello è rimasto identico. Da ratificare.
- **`redirect:'manual'` sulla navigazione ricostruita.** Una `Request` nuova di serie segue i rinvii:
  la risposta a `/index.html` sarebbe arrivata con `redirected: true` e Chrome non la mostra
  (`ERR_FAILED`), cioè proprio il difetto che la v106 deve chiudere. Con `manual` si comporta come la
  richiesta di navigazione originale del modello. Da ratificare.
- **Nove `.js` fra gli essenziali, non dieci.** L'handoff dice «i dieci .js (come oggi)»: oggi sono nove;
  il decimo file `.js` del repository è `sw.js`, che non si mette nella sua cache. Tenuto «come oggi».
- **Un secondo commit, solo `Resources/`,** con l'esito del collaudo su `testing`: il collaudo si fa dopo
  il push, e il report va nel repository (regola d'oro 1). Nessun file servito cambia. Da ratificare.

## Visto e non toccato

- §7 di `STATO.md` non aveva un debito sul 307 (stava nella deroga temporanea del §4, tolta): tolto solo
  quello sul worker ponte.
- `repository-e-stato.md` §5 dice che i documenti d'archivio tengono il loro nome; il report di parte A
  è stato rinominato lo stesso, su richiesta esplicita dell'handoff.

## Per iL KaJiNo

- **Da provare su `testing`:** prove 3, 4, 5 di pwa.md §11 sul telefono; installata da `testing`, la PWA
  deve chiamarsi «La Tana T» con l'orso a fascia rossa (pwa.md §12: si verifica la prima volta lì).
  La riga versione in Impostazioni deve dire «La Tana degli Orsi · v106 · testing».
- **Da unire:** `testing` → `main`, con «Create a merge commit». Code non ha unito.

## STATO.md

Aggiornato nello stesso commit: testata, §1, §4, §6, §7, §8.

## Collaudo su testing

(segue, dopo il push)
