import {mkdir,writeFile} from 'node:fs/promises';
import sharp from 'sharp';
// Original Ayni printable geometry and text, not reproductions of third-party sheets.
const folder='public/workshops';await mkdir(folder,{recursive:true});
const svgFolder='assets/workshop-resources';await mkdir(svgFolder,{recursive:true});
const start=title=>`<svg xmlns="http://www.w3.org/2000/svg" width="1240" height="1754" viewBox="0 0 1240 1754"><rect width="1240" height="1754" fill="white"/><style>text{font-family:Arial,sans-serif;fill:#172b52}.title{font-size:48px;font-weight:700}.body{font-size:30px}.small{font-size:23px}</style><text x="80" y="105" class="title">${title}</text><text x="80" y="155" class="small">Ayni Aula · Recurso para explorar y conversar</text>`;
const end=`<text x="80" y="1690" class="small">Recurso original Ayni · La ficha acompaña el juego; no reemplaza la experiencia.</text></svg>`;
const text=(lines,x,y,size=30)=>lines.map((line,i)=>`<text x="${x}" y="${y+i*(size+14)}" font-size="${size}">${line}</text>`).join('');
const documents=[];
let quantities=start('Tarjetas de cantidades');
for(let n=1;n<=10;n++){
  const x=80+((n-1)%2)*550,y=210+Math.floor((n-1)/2)*280;
  quantities+=`<rect x="${x}" y="${y}" width="520" height="250" rx="18" fill="#fff8e7" stroke="#93aab9" stroke-dasharray="7 7"/>`;
  for(let j=0;j<n;j++)quantities+=`<circle cx="${x+70+j%5*94}" cy="${y+75+Math.floor(j/5)*100}" r="24" fill="#087d96"/>`;
}
documents.push(['tarjetas-cantidades',quantities+end]);
let shapes=start('Formas para construir');
const fills=['#dff4ef','#e8f4ff','#fff2d7','#f1eaff','#fbeaf1','#dff4ef'];
for(let i=0;i<6;i++){
  const x=80+i%2*550,y=230+Math.floor(i/2)*460;
  shapes+=`<rect x="${x}" y="${y}" width="520" height="420" rx="18" fill="${fills[i]}" stroke="#93aab9" stroke-dasharray="7 7"/>`;
  const cx=x+260,cy=y+205;
  shapes+=i%3===0?`<circle cx="${cx}" cy="${cy}" r="120" fill="#087d96"/>`:i%3===1?`<rect x="${cx-120}" y="${cy-120}" width="240" height="240" ${i===4?'transform="rotate(20 '+cx+' '+cy+')"':''} fill="#087d96"/>`:`<path d="M${cx} ${cy-140}L${cx+150} ${cy+120}H${cx-150}Z" fill="#087d96"/>`;
}
documents.push(['tarjetas-formas',shapes+end]);
let record=start('Lo que probamos');
record+=text(['Nombre: _______________________   Fecha: ______________'],80,235,28);
for(const [i,title]of ['Mi idea antes de probar','Lo que hice para probar','Lo que observé'].entries())record+=`<rect x="80" y="${300+i*430}" width="1080" height="395" rx="18" fill="${['#edf7fa','#eef8f2','#f5effc'][i]}" stroke="#b2c9d7"/><text x="115" y="${360+i*430}" font-size="34" font-weight="700">${title}</text>`;
documents.push(['registro-exploracion',record+end]);
let story=start('La semilla de Lila');
story+=text(['Un cuento original de Ayni para leer en compañía.'],80,215,27);
const pages=[
  ['Lila encontró una semilla en el patio.','Era pequeña y estaba seca.','—¿Qué habrá dentro? —preguntó.','La puso en una maceta con tierra.'],
  ['Cada mañana, Lila miraba la tierra.','Le daba un poco de agua y esperaba.','Un día tuvo ganas de desenterrarla.','—Esperaré un poquito más —decidió.'],
  ['Al volver, vio un brote asomarse.','—¡La semilla estaba creciendo! —dijo.','Lila acercó la maceta a la luz.','¿Qué crees que mirará mañana?'],
];
for(let i=0;i<3;i++){
  const y=275+i*425;
  story+=`<rect x="80" y="${y}" width="1080" height="385" rx="20" fill="${['#fff8e7','#eaf7f5','#edf3ff'][i]}"/><text x="115" y="${y+65}" font-size="28" font-weight="700">${i+1}</text>`;
  story+=text(pages[i],115,y+125,31);
  // Simple growth diagram: same pot and seed, with a visible sprout in the final panel.
  story+=`<path d="M960 ${y+250}h120l-15 90h-90Z" fill="#bd6940"/><ellipse cx="1020" cy="${y+250}" rx="62" ry="17" fill="#71452f"/>`;
  if(i===0)story+=`<ellipse cx="1020" cy="${y+218}" rx="13" ry="20" fill="#885829"/>`;
  if(i===1)story+=`<path d="M1020 ${y+150}v55m-25-20 25 20 25-20" fill="none" stroke="#07809a" stroke-width="9"/>`;
  if(i===2)story+=`<path d="M1020 ${y+250}v-90" stroke="#358145" stroke-width="9"/><ellipse cx="1001" cy="${y+177}" rx="28" ry="13" transform="rotate(35 1001 ${y+177})" fill="#5caa60"/><ellipse cx="1040" cy="${y+167}" rx="28" ry="13" transform="rotate(-35 1040 ${y+167})" fill="#5caa60"/>`;
}
story+=text(['Para la docente: lee sin adelantar el final. Vuelvan a las pistas del cuento.', 'Los niños pueden señalar, conversar o dibujar; no es una prueba de lectura.'],80,1600,24);
documents.push(['cuento-la-semilla',story+end]);
let messages=start('Mensajes para alguien especial');
messages+=text(['Escribe a tu manera. Puedes usar tus propias marcas y letras.', 'Cuenta para quién es tu mensaje y qué quieres comunicar.'],80,220,28);
for(let i=0;i<3;i++){
  const y=330+i*420;
  messages+=`<rect x="80" y="${y}" width="1080" height="370" rx="18" fill="${['#edf7fa','#eef8f2','#f5effc'][i]}" stroke="#93aab9" stroke-dasharray="8 8"/>`;
  messages+=text(['Para: ___________________________'],115,y+65,28);
}
messages+=text(['Para la docente: acepta la escritura propia; no pidas copiar un modelo.', 'Anota su explicación aparte, con permiso, sin escribir encima de su texto.'],80,1600,24);
documents.push(['tiras-de-mensajes',messages+end]);
let books=start('Cuidamos los libros');
books+=text(['Una guía para consultar en nuestra biblioteca.'],80,220,28);
const bookTips=[['Manos limpias y secas.','Antes de elegir un libro, miramos nuestras manos.'],['Abrimos el libro con cuidado.','Lo apoyamos sobre una mesa o en nuestro regazo.'],['Pasamos una página a la vez.','Tomamos la esquina suavemente, sin tirar.'],['Lo devolvemos a su lugar.','Así otra persona podrá encontrarlo.']];
for(const [i,lines]of bookTips.entries()){
 const y=285+i*320;
 books+=`<rect x="80" y="${y}" width="1080" height="285" rx="18" fill="${['#edf7fa','#eef8f2','#fff8e7','#f5effc'][i]}"/><circle cx="150" cy="${y+65}" r="30" fill="#087d96"/><text x="140" y="${y+76}" style="fill:white;font-size:30px;font-weight:bold">${i+1}</text>`;
 books+=text(lines,210,y+75,29);
 // Crisp book diagram: written captions remain visible and are read with adult support.
 books+=`<path d="M500 ${y+155}q65-20 130 0q65-20 130 0v90q-65-20-130 0q-65-20-130 0Z M630 ${y+155}v90" fill="white" stroke="#087d96" stroke-width="5"/>`;
 books+=`<path d="M520 ${y+182}h80m-80 24h80m50-24h80m-80 24h80" fill="none" stroke="#a6bcd1" stroke-width="4"/>`;
}
books+=text(['Para la docente: lean juntos y busquen pistas en palabras, dibujos y números.'],80,1625,24);
documents.push(['cuidamos-los-libros',books+end]);
let tower=start('La torre de Nina');
tower+=text(['Un cuento original Ayni para mirar y leer en compañía.'],80,215,27);
const towerPages=[
 ['Nina quería una torre para su muñeco.','Puso bloques uno sobre otro.','—¿Podrá sostener uno más? —preguntó.'],
 ['Al poner otra pieza, la torre cayó.','Nina miró la base estrecha.','—Probaré de otra manera —decidió.'],
 ['Puso piezas anchas abajo y otras encima.','La nueva torre se mantuvo en su lugar.','Nina volvió a mirar y sonrió.','¿Qué cambió en su construcción?'],
];
for(const [i,lines]of towerPages.entries()){
 const y=280+i*425;
 tower+=`<rect x="80" y="${y}" width="1080" height="385" rx="18" fill="${['#edf7fa','#fff8e7','#eef8f2'][i]}"/><text x="115" y="${y+60}" font-size="28" font-weight="700">${i+1}</text>`;
 tower+=text(lines,115,y+125,30);
 const block=(x,dy,w,h,fill)=>`<rect x="${x}" y="${y+dy}" width="${w}" height="${h}" rx="3" fill="${fill}"/>`;
 if(i===0)tower+=block(1000,260,60,60,'#087d96')+block(1000,200,60,60,'#e3a22e')+block(1000,140,60,60,'#8263b7');
 if(i===1)tower+=block(945,260,65,60,'#087d96')+block(1020,265,65,55,'#e3a22e')+block(1060,190,55,60,'#8263b7');
 if(i===2)tower+=block(950,260,160,60,'#087d96')+block(975,200,110,60,'#e3a22e')+block(1000,140,60,60,'#8263b7');
}
tower+=text(['Para la docente: no adelantes el desenlace; vuelvan al texto y a las imágenes.', 'Se puede anticipar, señalar, comentar y cambiar de interpretación.'],80,1595,24);
documents.push(['la-torre-de-nina',tower+end]);
let poem=start('Charquito de cielo');
poem+=text(['Un poema original Ayni para leer en compañía.'],80,220,28);
poem+=`<rect x="80" y="290" width="1080" height="1050" rx="20" fill="#edf7fa"/>`;
poem+=text(['En un charquito del patio','cabe un pedazo de cielo.','Pasa una nube despacio,','se mira y sigue su vuelo.','','Llega una gota pequeña,','se dibujan redondeles.','El cielo se mueve un poco','y vuelve a quedarse quieto.'],135,400,43);
poem+=`<ellipse cx="620" cy="1220" rx="370" ry="65" fill="#b9e7ef"/><ellipse cx="620" cy="1220" rx="160" ry="28" fill="none" stroke="#087d96" stroke-width="5"/><ellipse cx="620" cy="1220" rx="260" ry="46" fill="none" stroke="#087d96" stroke-width="4"/>`;
poem+=text(['¿Qué parte quieres volver a escuchar?', 'Mira el texto y la imagen. Puedes señalar, comentar o dibujar tu idea.'],80,1440,30);
poem+=text(['Para la docente: no pedir memorización ni respuestas únicas.', 'Una interpretación se conversa volviendo a una pista del poema.'],80,1585,24);
documents.push(['charquito-de-cielo',poem+end]);
let riddles=start('Adivinanzas con pistas');
riddles+=text(['Escucha, mira y cuenta qué pista te ayuda a pensar.'],80,220,28);
const riddleLines=[['Ruedo por el suelo.','Con tus manos me puedes enviar.','¿Quién soy?'],['Al abrirme hay páginas.','Cuentos y pistas puedo guardar.','¿Quién soy?'],['Salgo de día en el cielo.','Doy luz; no me debes mirar.','¿Quién soy?'],['De noche puedo asomarme.','A veces parezco una sonrisa.','¿Quién soy?']];
for(const [i,lines]of riddleLines.entries()){
 const y=285+i*300;
 riddles+=`<rect x="80" y="${y}" width="1080" height="275" rx="18" fill="${['#fff8e7','#f5effc','#eef8f2','#edf7fa'][i]}"/>`+text(lines,115,y+65,31);
 if(i===0)riddles+=`<circle cx="1020" cy="${y+120}" r="68" fill="#e7bd4d" stroke="#172b52" stroke-width="5"/><path d="M952 ${y+120}h136m-68-68v136" stroke="#172b52" stroke-width="4"/>`;
 if(i===1)riddles+=`<path d="M920 ${y+65}q50-20 100 0q50-20 100 0v125q-50-20-100 0q-50-20-100 0Z M1020 ${y+65}v125" fill="white" stroke="#087d96" stroke-width="5"/>`;
 if(i===2){riddles+=`<circle cx="1020" cy="${y+125}" r="48" fill="#e7bd4d"/>`;for(let ray=0;ray<8;ray++){const a=ray*Math.PI/4;riddles+=`<path d="M${1020+Math.cos(a)*62} ${y+125+Math.sin(a)*62}l${Math.cos(a)*20} ${Math.sin(a)*20}" stroke="#b07911" stroke-width="6"/>`;}}
 if(i===3)riddles+=`<circle cx="1020" cy="${y+125}" r="70" fill="#e7bd4d"/><circle cx="1053" cy="${y+96}" r="64" fill="#edf7fa"/>`;
}
riddles+=text(['Para la docente: las respuestas se pueden cubrir con papel si el grupo lo desea.', 'Relean y comparen pistas sin competir por adivinar más rápido.'],80,1585,24);
documents.push(['adivinanzas-con-pistas',riddles+end]);
let water=start('Pintamos con agua');
water+=text(['Un instructivo original Ayni para consultar antes y durante el juego.'],80,220,27);
const waterSteps=[['Reunimos lo necesario.','Poca agua limpia, una brocha, cartón oscuro y una toalla.'],['Mojamos un poco la brocha.','La sacamos sin derramar. No bebemos el agua.'],['Dibujamos sobre el cartón.','Elegimos qué marcas queremos hacer.'],['Miramos y volvemos a probar.','¿Qué pasó con las marcas después de un rato?']];
for(const [i,lines]of waterSteps.entries()){
 const y=285+i*305;
 water+=`<rect x="80" y="${y}" width="1080" height="280" rx="18" fill="${['#edf7fa','#eef8f2','#fff8e7','#f5effc'][i]}"/><circle cx="140" cy="${y+60}" r="30" fill="#087d96"/><text x="130" y="${y+70}" style="fill:white;font-size:28px">${i+1}</text>`+text(lines,195,y+65,28);
 if(i<2)water+=`<path d="M850 ${y+140}h110l-10 90h-90Z" fill="white" stroke="#087d96" stroke-width="4"/><path d="M858 ${y+180}h94l-6 45h-82Z" fill="#b9e7ef"/><path d="M1020 ${y+130}v70" stroke="#a06e42" stroke-width="14"/><rect x="1000" y="${y+195}" width="40" height="45" rx="4" fill="#087d96"/>`;
 else water+=`<rect x="815" y="${y+135}" width="280" height="110" rx="6" fill="#405c70"/><path d="M840 ${y+205}q45-70 90-10t110-10" fill="none" stroke="${i===2?'#b9e7ef':'#6d8da0'}" stroke-width="10"/>`;
}
water+=text(['Para la docente: consulta el texto con los niños; no es una prueba de lectura.', 'Protege el suelo y acompaña el uso de agua.'],80,1585,24);
documents.push(['pintamos-con-agua',water+end]);
for(const [name,svg]of documents){await writeFile(`${svgFolder}/${name}.svg`,svg);await sharp(Buffer.from(svg)).png().toFile(`${folder}/${name}.png`);}
await writeFile(`${svgFolder}/PROVENANCE.json`,JSON.stringify({author:'Ayni',version:'1.2.0',generator:'scripts/build-workshop-resources.mjs',method:'Original text and deterministic SVG geometry rendered with sharp',sources:[],files:documents.map(([name])=>name)},null,2)+'\n');
console.log(`Created ${documents.length} original printable resources.`);
