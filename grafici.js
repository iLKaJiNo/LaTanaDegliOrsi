// ════════════════════════════════════════════════════════
//  La Tana degli Orsi — grafici.js
//  Grafici della cassa comune (torta Luca/Ale, barre storico)
//  ed esportazione PDF del mese (jsPDF caricato on-demand).
//  Dipende da: utils.js (S, eur, eurInt). jsPDF da CDN runtime.
//  Estratto da ui.js nella sessione di refactoring.
// ════════════════════════════════════════════════════════

var graficoVista="barre"; // "barre" | "torta"

// vista: "barre" (spese per mese, archivio) | "torta" (Luca vs Ale del mese corrente)
function openGrafico(vista){
  graficoVista = (vista==="torta") ? "torta" : "barre";
  var ic=document.getElementById("grafico-icon");
  var tit=document.getElementById("grafico-titolo");
  var st=document.getElementById("grafico-stats");
  if(graficoVista==="torta"){
    if(ic) ic.textContent="🥧";
    if(tit) tit.textContent="Chi ha speso questo mese";
    if(st) st.innerHTML="";
  }else{
    if(ic) ic.textContent="📊";
    if(tit) tit.textContent="Spese mensili";
    var totAnnuale=S.chiusure.reduce(function(a,c){
      return a+(c.totale||c.txs.reduce(function(b,t){return b+(parseFloat(t.importo)||0);},0));
    },0);
    var mediaAnnuale=S.chiusure.length>0?Math.round(totAnnuale/S.chiusure.length):0;
    if(st) st.innerHTML=S.chiusure.length>0
      ?'<span>📅 Totale: <strong>'+eurInt(totAnnuale)+'</strong></span><span style="margin-left:16px;">📊 Media: <strong>'+eurInt(mediaAnnuale)+'</strong></span>'
      :'';
  }
  document.getElementById("modal-grafico").classList.add("open");
  setTimeout(function(){renderGraficoVista();},50);
}
function closeGrafico(){document.getElementById("modal-grafico").classList.remove("open");}

function renderGraficoVista(){
  var barraWrap=document.getElementById("grafico-barre-wrap");
  var tortaWrap=document.getElementById("grafico-torta-wrap");
  if(!barraWrap||!tortaWrap) return;
  if(graficoVista==="barre"){
    barraWrap.style.display="";
    tortaWrap.style.display="none";
    drawChart();
  } else {
    barraWrap.style.display="none";
    tortaWrap.style.display="";
    drawTorta();
  }
}

// Donut chart condiviso (cassa comune + Solo). slices=[{val,color}].
// Legge le var CSS da document.documentElement (riferimento, risolve incoerenza nota).
function drawDonut(canvas, slices, opts){
  if(!canvas) return;
  opts=opts||{};
  var tot=slices.reduce(function(a,s){return a+(s.val||0);},0);
  if(tot<=0) return;
  var ctx=canvas.getContext("2d");
  var dpr=window.devicePixelRatio||1;
  var maxSize=opts.maxSize||180;
  var size=Math.min(maxSize, (canvas.parentElement.offsetWidth||220)-32);
  canvas.width=size*dpr; canvas.height=size*dpr;   // resetta e pulisce il canvas
  canvas.style.width=size+"px"; canvas.style.height=size+"px";
  ctx.scale(dpr,dpr);
  var cx=size/2, cy=size/2, r=size/2-8, ang=-Math.PI/2;
  slices.forEach(function(s){
    if(!s.val) return;
    var fetta=(s.val/tot)*Math.PI*2;
    ctx.beginPath(); ctx.moveTo(cx,cy);
    ctx.arc(cx,cy,r,ang,ang+fetta); ctx.closePath();
    ctx.fillStyle=s.color; ctx.fill();
    ang+=fetta;
  });
  var css=getComputedStyle(document.documentElement);
  ctx.beginPath(); ctx.arc(cx,cy,r*(opts.hole||0.52),0,Math.PI*2);
  ctx.fillStyle=(css.getPropertyValue("--card")||"").trim()||"#FFFDF8";
  ctx.fill();
  if(opts.centerText){
    ctx.fillStyle=(css.getPropertyValue("--text")||"").trim()||"#2E1A08";
    ctx.font="bold "+(size*0.1)+"px 'Baloo 2',cursive";
    ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillText(opts.centerText, cx, cy);
  }
}

function drawTorta(){
  var canvas=document.getElementById("grafico-torta-canvas");
  if(!canvas) return;

  // Mensile: solo il mese corrente (le transazioni attive), non tutto lo storico
  var totLuca=0, totAle=0;
  S.txs.forEach(function(t){
    if(t.chi==="Luca") totLuca+=parseFloat(t.importo)||0;
    else totAle+=parseFloat(t.importo)||0;
  });

  var totale=totLuca+totAle;
  if(totale===0){
    document.getElementById("grafico-torta-wrap").innerHTML=
      '<div class="grafico-empty">Nessun dato disponibile ancora.</div>';
    return;
  }

  var LUCA_COLOR="#A83225";  // berry
  var ALE_COLOR="#4A7C40";   // moss
  var percLuca=Math.round(totLuca/totale*100);
  var percAle=100-percLuca;
  drawDonut(canvas, [{val:totLuca,color:LUCA_COLOR},{val:totAle,color:ALE_COLOR}], {centerText:percLuca+"% / "+percAle+"%"});

  // Legenda
  var legenda=document.getElementById("grafico-torta-legenda");
  if(legenda){
    legenda.innerHTML=
      '<div class="torta-legenda-item"><div class="torta-legenda-dot" style="background:'+LUCA_COLOR+'"></div>'+
      '<span><img src="./bear.svg" style="width:0.875rem;height:0.875rem;vertical-align:middle;margin-right:4px;" alt="">Luca</span><span class="torta-legenda-val">'+eur(totLuca)+' ('+percLuca+'%)</span></div>'+
      '<div class="torta-legenda-item"><div class="torta-legenda-dot" style="background:'+ALE_COLOR+'"></div>'+
      '<span><img src="./bear.svg" style="width:0.875rem;height:0.875rem;vertical-align:middle;margin-right:4px;" alt="">Ale</span><span class="torta-legenda-val">'+eur(totAle)+' ('+percAle+'%)</span></div>'+
      '<div class="torta-legenda-item" style="border-top:1px solid var(--border);padding-top:6px;margin-top:2px;">'+
      '<span style="color:var(--text3);">Totale</span><span class="torta-legenda-val">'+eur(totale)+'</span></div>';
  }
}

function drawChart(){
  var canvas=document.getElementById("grafico-canvas");
  var ctx=canvas.getContext("2d");
  var chiusure=[].concat(S.chiusure).reverse();
  var totCorrente=S.txs.reduce(function(a,t){return a+t.importo;},0);
  var dati=chiusure.map(function(c){
    var tot=c.totale||c.txs.reduce(function(a,t){return a+(parseFloat(t.importo)||0);},0);
    return{label:c.mese,val:Math.round(tot)};
  });
  if(S.txs.length>0){dati.push({label:"Mese corrente",val:Math.round(totCorrente)});}

  if(!dati.length){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    canvas.parentElement.innerHTML='<div class="grafico-empty">&#x1F4CA; Nessun dato disponibile ancora.<br>Chiudi almeno un mese per vedere il grafico.</div>';
    return;
  }

  var dpr=window.devicePixelRatio||1;
  var rect=canvas.getBoundingClientRect();
  canvas.width=rect.width*dpr;
  canvas.height=rect.height*dpr;
  ctx.scale(dpr,dpr);
  var W=rect.width, H=rect.height;
  var padL=44, padR=16, padT=20, padB=48;
  var chartW=W-padL-padR, chartH=H-padT-padB;

  var maxVal=Math.max.apply(null,dati.map(function(d){return d.val;}))||1;
  maxVal=Math.ceil(maxVal/100)*100;

  var barColor="rgba(107,63,32,0.75)";
  var barColorLast="rgba(244,168,39,0.85)";
  var lineColor="#F4A827";
  var gridColor="rgba(184,149,106,0.2)";
  var textColor="#B8956A";

  ctx.clearRect(0,0,W,H);

  var steps=4;
  ctx.strokeStyle=gridColor;ctx.lineWidth=1;
  ctx.font="10px 'Nunito',sans-serif";ctx.fillStyle=textColor;ctx.textAlign="right";
  for(var i=0;i<=steps;i++){
    var y=padT+chartH-(chartH/steps)*i;
    ctx.beginPath();ctx.moveTo(padL,y);ctx.lineTo(padL+chartW,y);ctx.stroke();
    ctx.fillText(Math.round(maxVal/steps*i)+" €",padL-6,y+4);
  }

  var barW=Math.max(8,Math.min(36,(chartW/dati.length)*0.55));
  var step=chartW/dati.length;
  ctx.font="bold 10px 'Nunito',sans-serif";ctx.textAlign="center";

  var points=[];
  dati.forEach(function(d,i){
    var x=padL+step*i+step/2;
    var bh=(d.val/maxVal)*chartH;
    var y=padT+chartH-bh;
    var isLast=(i===dati.length-1&&S.txs.length>0);
    ctx.fillStyle=isLast?barColorLast:barColor;
    var r=Math.min(4,barW/2);
    ctx.beginPath();
    ctx.moveTo(x-barW/2+r,y);
    ctx.lineTo(x+barW/2-r,y);
    ctx.quadraticCurveTo(x+barW/2,y,x+barW/2,y+r);
    ctx.lineTo(x+barW/2,y+bh);
    ctx.lineTo(x-barW/2,y+bh);
    ctx.lineTo(x-barW/2,y+r);
    ctx.quadraticCurveTo(x-barW/2,y,x-barW/2+r,y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle=isLast?lineColor:textColor;
    ctx.font="bold 10px 'Nunito',sans-serif";
    ctx.fillText(d.val+" €",x,y-5);
    ctx.fillStyle=textColor;
    ctx.font="9px 'Nunito',sans-serif";
    var lbl=d.label.length>8?d.label.substring(0,8)+"…":d.label;
    ctx.fillText(lbl,x,padT+chartH+14);
    if(dati.length>4){
      var parts=d.label.split(" ");
      if(parts.length>1){ctx.fillText(parts[parts.length-1],x,padT+chartH+25);}
    }
    points.push({x:x,y:y});
  });

  if(points.length>1){
    ctx.strokeStyle=lineColor;
    ctx.lineWidth=2.5;
    ctx.lineJoin="round";
    ctx.lineCap="round";
    ctx.beginPath();
    ctx.moveTo(points[0].x,points[0].y);
    for(var i=1;i<points.length;i++){
      var mx=(points[i-1].x+points[i].x)/2;
      ctx.bezierCurveTo(mx,points[i-1].y,mx,points[i].y,points[i].x,points[i].y);
    }
    ctx.stroke();
    ctx.fillStyle=lineColor;
    points.forEach(function(p){
      ctx.beginPath();ctx.arc(p.x,p.y,4,0,Math.PI*2);ctx.fill();
    });
    ctx.fillStyle="#fff";
    points.forEach(function(p){
      ctx.beginPath();ctx.arc(p.x,p.y,2,0,Math.PI*2);ctx.fill();
    });
  }
}

// ── ESPORTA PDF ──
function esportaPDF(id){
  var c=S.chiusure.find(function(x){return x.id===id;});
  if(!c){alert("Mese non trovato");return;}
  if(typeof window.jspdf==="undefined"){
    var s=document.createElement("script");
    s.src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    s.onload=function(){_generaPDF(c);};
    s.onerror=function(){alert("Impossibile caricare jsPDF. Controlla la connessione.");};
    document.head.appendChild(s);
  }else{_generaPDF(c);}
}

function _generaPDF(c){
  var jsPDF=window.jspdf.jsPDF;
  var doc=new jsPDF({orientation:"portrait",unit:"mm",format:"a4"});

  // ── Fix emoji: jsPDF usa font standard Latin-1, le emoji diventano caratteri spazzatura
  function pdfStrip(s){
    return String(s||"")
      .replace(/[\u{1F000}-\u{1FFFF}]/gu,"")   // emoji supplementari (🐻🗑️ecc)
      .replace(/[\u2600-\u26FF]/gu,"")           // simboli vari (☀️⭐ecc)
      .replace(/[\u2700-\u27BF]/gu,"")           // dingbats
      .replace(/\uFE0F/g,"")                     // variation selector
      .replace(/\s+/g," ").trim();
  }
  var _origText=doc.text.bind(doc);
  doc.text=function(str,x,y,opts){
    return _origText(typeof str==="string"?pdfStrip(str):str,x,y,opts);
  };
  var W=210,margin=18,y=margin;
  var BROWN=[74,42,15],HONEY=[244,168,39],BERRY=[168,50,37],MOSS=[74,124,64];
  var LIGHT=[254,245,220],DARK=[46,26,8],GRAY=[120,85,56];
  // Header
  doc.setFillColor(BROWN[0],BROWN[1],BROWN[2]);
  doc.rect(0,0,W,28,"F");
  doc.setTextColor(HONEY[0],HONEY[1],HONEY[2]);
  doc.setFontSize(18);doc.setFont("helvetica","bold");
  doc.text("La Tana degli Orsi",margin,12);
  doc.setFontSize(9);doc.setFont("helvetica","normal");
  doc.setTextColor(255,255,255);
  doc.text("Luca & Ale — cassa comune",margin,19);
  doc.text("Generato il "+new Date().toLocaleDateString("it-IT"),W-margin,19,{align:"right"});
  y=36;
  // Titolo mese
  doc.setTextColor(DARK[0],DARK[1],DARK[2]);
  doc.setFontSize(16);doc.setFont("helvetica","bold");
  doc.text(c.mese,margin,y);y+=6;
  doc.setFontSize(9);doc.setFont("helvetica","normal");
  doc.setTextColor(GRAY[0],GRAY[1],GRAY[2]);
  doc.text(c.txs.length+" voci  ·  chiuso il "+fmtLong(c.data),margin,y);y+=8;
  // Riquadro saldo
  var saldoCl=c.saldo>0?BERRY:c.saldo<0?MOSS:MOSS;
  doc.setFillColor(LIGHT[0],LIGHT[1],LIGHT[2]);
  doc.roundedRect(margin,y,W-margin*2,16,3,3,"F");
  doc.setFontSize(9);doc.setFont("helvetica","normal");
  doc.setTextColor(GRAY[0],GRAY[1],GRAY[2]);
  doc.text("Debito iniziale: "+eurInt(c.saldoIniziale),margin+4,y+6);
  doc.setFontSize(11);doc.setFont("helvetica","bold");
  doc.setTextColor(saldoCl[0],saldoCl[1],saldoCl[2]);
  doc.text("Debito finale: "+eurInt(c.saldo),W-margin-4,y+6,{align:"right"});
  var totale=c.totale||c.txs.reduce(function(a,t){return a+(parseFloat(t.importo)||0);},0);
  doc.setFontSize(9);doc.setFont("helvetica","normal");
  doc.setTextColor(GRAY[0],GRAY[1],GRAY[2]);
  doc.text("Totale spese mese: "+eurInt(totale),margin+4,y+12);y+=22;
  // Intestazione tabella
  doc.setFillColor(BROWN[0],BROWN[1],BROWN[2]);
  doc.rect(margin,y,W-margin*2,7,"F");
  doc.setTextColor(HONEY[0],HONEY[1],HONEY[2]);
  doc.setFontSize(8);doc.setFont("helvetica","bold");
  doc.text("Data",margin+2,y+5);
  doc.text("Chi",margin+20,y+5);
  doc.text("Nota",margin+36,y+5);
  doc.text("Importo",W-margin-2,y+5,{align:"right"});
  y+=7;
  // Righe
  var run=c.saldoIniziale;
  c.txs.forEach(function(t,i){
    if(y>272){doc.addPage();y=margin;}
    var isL=t.chi==="Luca";
    run=isL?run+t.importo:run-t.importo;
    doc.setFillColor(i%2===0?255:248,i%2===0?253:245,i%2===0?248:238);
    doc.rect(margin,y,W-margin*2,6.5,"F");
    doc.setTextColor(DARK[0],DARK[1],DARK[2]);
    doc.setFontSize(8);doc.setFont("helvetica","normal");
    doc.text(fmt(t.data)||"-",margin+2,y+4.5);
    doc.setTextColor(isL?BERRY[0]:MOSS[0],isL?BERRY[1]:MOSS[1],isL?BERRY[2]:MOSS[2]);
    doc.setFont("helvetica","bold");
    doc.text(t.chi,margin+20,y+4.5);
    doc.setTextColor(DARK[0],DARK[1],DARK[2]);
    doc.setFont("helvetica","normal");
    var nota=t.nota||(isL?"Spesa Luca":"Spesa Ale");
    if(nota.length>38)nota=nota.substring(0,36)+"…";
    doc.text(nota,margin+36,y+4.5);
    doc.setTextColor(isL?BERRY[0]:MOSS[0],isL?BERRY[1]:MOSS[1],isL?BERRY[2]:MOSS[2]);
    doc.setFont("helvetica","bold");
    doc.text(eur(t.importo),W-margin-2,y+4.5,{align:"right"});
    y+=6.5;
  });
  // Snapshot spese fisse
  if(c.fisseSnapshot && c.fisseSnapshot.length){
    y+=4;
    if(y>252){doc.addPage();y=margin;}
    var totF=c.fisseSnapshot.reduce(function(a,f){return a+(parseFloat(f.importo)||0);},0);
    // Intestazione sezione fisse
    doc.setFillColor(BROWN[0],BROWN[1],BROWN[2]);
    doc.rect(margin,y,W-margin*2,7,"F");
    doc.setTextColor(HONEY[0],HONEY[1],HONEY[2]);
    doc.setFontSize(8);doc.setFont("helvetica","bold");
    doc.text("📌 Spese fisse del mese",margin+2,y+5);
    doc.text("Importo",W-margin-2,y+5,{align:"right"});
    y+=7;
    c.fisseSnapshot.forEach(function(f,i){
      if(y>272){doc.addPage();y=margin;}
      doc.setFillColor(i%2===0?255:248,i%2===0?253:245,i%2===0?248:238);
      doc.rect(margin,y,W-margin*2,6.5,"F");
      doc.setTextColor(DARK[0],DARK[1],DARK[2]);
      doc.setFontSize(8);doc.setFont("helvetica","normal");
      doc.text(f.nome,margin+2,y+4.5);
      doc.setFont("helvetica","bold");
      doc.text(eur(f.importo),W-margin-2,y+4.5,{align:"right"});
      y+=6.5;
    });
    // Totale fisse e totale reale
    doc.setFillColor(LIGHT[0],LIGHT[1],LIGHT[2]);
    doc.rect(margin,y,W-margin*2,6.5,"F");
    doc.setFontSize(8);doc.setFont("helvetica","bold");
    doc.setTextColor(GRAY[0],GRAY[1],GRAY[2]);
    doc.text("Spese Tana",margin+2,y+4.5);
    doc.setTextColor(DARK[0],DARK[1],DARK[2]);
    doc.text(eur(totale),W-margin-2,y+4.5,{align:"right"});
    y+=6.5;
    doc.setFillColor(LIGHT[0],LIGHT[1],LIGHT[2]);
    doc.rect(margin,y,W-margin*2,6.5,"F");
    doc.setFontSize(8);doc.setFont("helvetica","bold");
    doc.setTextColor(GRAY[0],GRAY[1],GRAY[2]);
    doc.text("Totale spese fisse",margin+2,y+4.5);
    doc.setTextColor(HONEY[0],HONEY[1],HONEY[2]);
    doc.text(eur(totF),W-margin-2,y+4.5,{align:"right"});
    y+=6.5;
    doc.setFillColor(HONEY[0],HONEY[1],HONEY[2]);
    doc.rect(margin,y,W-margin*2,7,"F");
    doc.setTextColor(255,255,255);
    doc.setFontSize(9);
    doc.text("Totale reale del mese",margin+2,y+5);
    doc.text(eur(totale+totF),W-margin-2,y+5,{align:"right"});
    y+=9;
  }
  // Split Luca vs Ale del mese
  var spL=0, spA=0;
  c.txs.forEach(function(t){ if(t.chi==="Luca") spL+=t.importo; else spA+=t.importo; });
  var spTot=spL+spA;
  if(spTot>0){
    y+=3;
    var pL=Math.round(spL/spTot*100), pA=100-pL;
    doc.setFontSize(8);doc.setFont("helvetica","bold");
    doc.setTextColor(GRAY[0],GRAY[1],GRAY[2]);
    doc.text("Chi ha speso questo mese",margin,y+4);y+=6;
    // barra proporzionale
    var barW=W-margin*2, lw=barW*pL/100;
    doc.setFillColor(168,50,37); doc.rect(margin,y,lw,5,"F");           // Luca berry
    doc.setFillColor(74,124,64); doc.rect(margin+lw,y,barW-lw,5,"F");   // Ale moss
    y+=9;
    doc.setFont("helvetica","normal");doc.setTextColor(DARK[0],DARK[1],DARK[2]);
    doc.text("Luca "+eur(spL)+" ("+pL+"%)",margin,y);
    doc.text("Ale "+eur(spA)+" ("+pA+"%)",W-margin,y,{align:"right"});
    y+=4;
  }
  // Footer
  y+=4;
  doc.setDrawColor(HONEY[0],HONEY[1],HONEY[2]);
  doc.setLineWidth(0.4);
  doc.line(margin,y,W-margin,y);y+=5;
  doc.setFontSize(8);doc.setFont("helvetica","normal");
  doc.setTextColor(GRAY[0],GRAY[1],GRAY[2]);
  doc.text("La Tana degli Orsi — "+c.mese,margin,y);
  doc.text("Pagina 1",W-margin,y,{align:"right"});
  doc.save("tana-"+c.mese.replace(/\s+/g,"-").toLowerCase()+".pdf");
}
