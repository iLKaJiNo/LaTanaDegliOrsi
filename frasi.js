// ════════════════════════════════════════════════════════════
//  La Tana degli Orsi — frasi.js
//  FRASI DEGLI STATI VUOTI — modificabili liberamente! 🐻
//
//  Ogni stato (tana, lista, cestino, fisse, debiti, rimborsi,
//  mese) ha una lista di frasi. Quando una sezione è vuota,
//  l'app ne mostra UNA a caso.
//
//  COME MODIFICARLE:
//   • Cambia il testo tra le "virgolette"
//   • Aggiungi una nuova frase: vai a capo, scrivi "la tua frase",
//     e metti una virgola alla fine della riga precedente
//   • Togli una frase: cancella la sua riga
//   • Le emoji 🍯🐾📅 si possono usare liberamente
//   • Scrivi {orso} per inserire l'icona bear.svg (al posto dell'emoji 🐻)
//   • Attenzione: NON usare virgolette doppie " dentro la frase
//     (se ti servono, usa quelle singole ' oppure chiedi a Claude)
// ════════════════════════════════════════════════════════════

var FRASI_VUOTO = {

  // Tab Tana — nessuna spesa nel mese corrente
  tana: [
    "La tana è tranquilla {orso}",
    "Nessuna spesa... gli orsi riposano 🍯",
    "Tutto in ordine nella tana!",
    "Silenzio in cassa... per ora 🐾",
    "Aggiungi la prima spesa del mese!",
    "Sono Carina! ...tutti lo dicono"
  ],

  // Tab Lista — nessun articolo nella lista della spesa
  lista: [
    "Lista vuota, dispensa piena? 🧺",
    "Niente da comprare... che bello!",
    "Cosa manca nella tana? 🍯",
    "Aggiungi il primo articolo!",
    "Hai controllato se c'è abbastanza miele?",
    "...biscotti, sempre comprare biscotti!",
    "Sono Carina! ...tutti lo dicono"
  ],

  // Cestino — nessuna voce eliminata
  cestino: [
    "Il cestino è vuoto! 🌿",
    "Niente da recuperare qui 🐾",
    "Le voci eliminate appariranno qui.",
    "Sono Carina! ...tutti lo dicono"
  ],

  // Tab Fisse — nessuna spesa fissa
  fisse: [
    "Nessuna spesa fissa — aggiungine una! 📌",
    "Niente fisse per ora {orso}",
    "Mutuo, bollette... aggiungi le fisse!",
    "Sono Carina! ...tutti lo dicono"
  ],

  // Debiti diretti — nessun prestito tra Luca e Ale
  debiti: [
    "Gli Orsi sono pari tra loro! 🤝",
    "Nessun prestito in giro {orso}",
    "Conti in pari, Orsi salvi 🍯",
    "Sono Carina! ...tutti lo dicono"
  ],

  // Rimborsi di un debito — nessun rimborso registrato
  rimborsi: [
    "Nessun rimborso ancora effettuato.",
    "Qui appariranno i rimbOrsi 🐾",
    "Sono Carina! ...tutti lo dicono"
  ],

  // Storico di un mese chiuso — nessuna voce
  mese: [
    "Nessuna voce in questo mese {orso}",
    "Mese tranquillo, niente spese!",
    "Sono Carina! ...tutti lo dicono"
  ],

  // Tab Fisse → Ricorrenti — nessuna spesa in arrivo
  ricorrenti: [
    "Nessuna spesa in arrivo {orso}",
    "Niente scadenze all'orizzonte 📅",
    "Aggiungi una spesa futura da non scordare!",
    "Sono Carina! ...tutti lo dicono"
  ]

};

// Restituisce una frase a caso per il contesto richiesto.
// Il segnaposto {orso} viene sostituito con l'icona bear.svg.
// Se il contesto non esiste, torna una stringa vuota (innocuo).
function fraseVuoto(contesto){
  var arr = FRASI_VUOTO[contesto];
  if(!arr || !arr.length) return "";
  var frase = arr[Math.floor(Math.random() * arr.length)];
  return frase.replace(/\{orso\}/g, '<img src="./bear.svg" style="width:1.1em;height:1.1em;vertical-align:-0.2em;">');
}
