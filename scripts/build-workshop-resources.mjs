import {mkdir,readFile,writeFile} from 'node:fs/promises';
import sharp from 'sharp';
// Original Ayni printable geometry and text, not reproductions of third-party sheets.
const folder='public/workshops';await mkdir(folder,{recursive:true});
const svgFolder='assets/workshop-resources';await mkdir(svgFolder,{recursive:true});
const friendlyImage = async (name,x,y,size=140) => `<image x="${x}" y="${y}" width="${size}" height="${size}" href="data:image/png;base64,${(await sharp(await readFile(`public/project-illustrations/${name}.webp`)).resize(240,240).png().toBuffer()).toString('base64')}"/>`;
const workshopImage=async(name,x,y,width,height)=>`<image x="${x}" y="${y}" width="${width}" height="${height}" href="data:image/png;base64,${(await readFile(`public/workshop-illustrations/${name}.png`)).toString('base64')}"/>`;
const start=async(title,illustration)=>`<svg xmlns="http://www.w3.org/2000/svg" width="1240" height="1754" viewBox="0 0 1240 1754"><rect width="1240" height="1754" fill="white"/><style>text{font-family:Arial,sans-serif;fill:#172b52}.title{font-size:48px;font-weight:700}.body{font-size:30px}.small{font-size:23px}</style><text x="80" y="105" class="title">${title}</text><text x="80" y="155" class="small">Ayni Aula · Recurso para explorar y conversar</text>${await friendlyImage(illustration,1020,20,150)}`;
const end=`<text x="80" y="1690" class="small">Recurso original Ayni · La ficha acompaña el juego; no reemplaza la experiencia.</text></svg>`;
const text=(lines,x,y,size=30)=>lines.map((line,i)=>`<text x="${x}" y="${y+i*(size+14)}" font-size="${size}">${line}</text>`).join('');
const documents=[];
let quantities=await start('Tarjetas de cantidades','numbers');
for(let n=1;n<=10;n++){
  const x=80+((n-1)%2)*550,y=210+Math.floor((n-1)/2)*280;
  quantities+=`<rect x="${x}" y="${y}" width="520" height="250" rx="18" fill="#fff8e7" stroke="#93aab9" stroke-dasharray="7 7"/>`;
  for(let j=0;j<n;j++)quantities+=`<circle cx="${x+70+j%5*94}" cy="${y+75+Math.floor(j/5)*100}" r="24" fill="#087d96"/>`;
}
documents.push(['tarjetas-cantidades',quantities+end]);
let shapes=await start('Formas para construir','shapes');
const fills=['#dff4ef','#e8f4ff','#fff2d7','#f1eaff','#fbeaf1','#dff4ef'];
for(let i=0;i<6;i++){
  const x=80+i%2*550,y=230+Math.floor(i/2)*460;
  shapes+=`<rect x="${x}" y="${y}" width="520" height="420" rx="18" fill="${fills[i]}" stroke="#93aab9" stroke-dasharray="7 7"/>`;
  const cx=x+260,cy=y+205;
  shapes+=i%3===0?`<circle cx="${cx}" cy="${cy}" r="120" fill="#087d96"/>`:i%3===1?`<rect x="${cx-120}" y="${cy-120}" width="240" height="240" ${i===4?'transform="rotate(20 '+cx+' '+cy+')"':''} fill="#087d96"/>`:`<path d="M${cx} ${cy-140}L${cx+150} ${cy+120}H${cx-150}Z" fill="#087d96"/>`;
}
documents.push(['tarjetas-formas',shapes+end]);
let motor=await start('Elegimos cómo movernos','movement');
motor+=text(['Elijan algunas tarjetas para inventar un camino seguro.'],80,220,28);
const motorLabels=['Camina por la línea','Rodea los conos','Salta la línea','Lleva una bolsita','Gira despacio','Pasa por el aro'];
for(const [i,label]of motorLabels.entries()){
 const x=80+i%2*550,y=280+Math.floor(i/2)*425;
 motor+=`<rect x="${x}" y="${y}" width="520" height="395" rx="18" fill="${fills[i]}" stroke="#93aab9" stroke-dasharray="7 7"/>`;
 motor+=await workshopImage('motor-'+(i+1),x+120,y+25,280,260);
 motor+=text([label],x+45,y+345,29);
}
motor+=text(['Para la docente: recorta las tarjetas y deja que los niños elijan el orden.', 'Todo se hace a nivel del suelo, sin carreras ni obligación de saltar.'],80,1610,24);
documents.push(['tarjetas-recorrido-motor',motor+end]);
let record=await start('Lo que probamos','inquiry');
record+=text(['Puedes dibujar o contarle tu idea a la profesora.'],80,235,28);
for(const [i,title]of ['Lo que creo que pasará','Lo que hice para probar','Lo que vi después'].entries()){
 record+=`<rect x="80" y="${300+i*430}" width="1080" height="395" rx="18" fill="${['#edf7fa','#eef8f2','#f5effc'][i]}" stroke="#b2c9d7"/><text x="115" y="${360+i*430}" font-size="34" font-weight="700">${title}</text>`;
 record+=await friendlyImage(['ideas','hands','inquiry'][i],1000,310+i*430,105);
}
documents.push(['registro-exploracion',record+end]);
let story=await start('La semilla de Lila','seed');
story+=text(['Un cuento original de Ayni para leer en compañía.'],80,215,27);
const pages=[
  ['Lila encontró una semilla en el patio.','Era pequeña y estaba seca.','—¿Qué habrá dentro? —preguntó.','La puso en una maceta con tierra.'],
  ['Cada mañana, Lila miraba la tierra.','Le daba un poco de agua y esperaba.','Un día tuvo ganas de desenterrarla.','—Esperaré un poquito más —decidió.'],
  ['Al volver, vio un brote asomarse.','—¡La semilla estaba creciendo! —dijo.','Lila acercó la maceta a la luz.','¿Qué crees que mirará mañana?'],
];
story+=await workshopImage('story-lila',80,250,1080,360);
for(let i=0;i<3;i++){
  const y=650+i*290;
  story+=`<rect x="80" y="${y}" width="1080" height="265" rx="20" fill="${['#fff8e7','#eaf7f5','#edf3ff'][i]}"/><text x="115" y="${y+48}" font-size="28" font-weight="700">${i+1}</text>`;
  story+=text(pages[i],175,y+55,31);
}
story+=text(['Para la docente: lee sin adelantar el final. Vuelvan a las pistas del cuento.', 'Los niños pueden señalar, conversar o dibujar; no es una prueba de lectura.'],80,1600,24);
documents.push(['cuento-la-semilla',story+end]);
let messages=await start('Mensajes para alguien especial','writing');
messages+=text(['Escribe como tú sabes, con trazos o letras. Puedes añadir dibujos.', 'Cuenta para quién es tu mensaje y qué quieres decirle.'],80,220,28);
for(let i=0;i<3;i++){
  const y=330+i*420;
  messages+=`<rect x="80" y="${y}" width="1080" height="370" rx="18" fill="${['#edf7fa','#eef8f2','#f5effc'][i]}" stroke="#93aab9" stroke-dasharray="8 8"/>`;
  messages+=text(['Para: ___________________________'],115,y+65,28);
}
messages+=text(['Para la docente: acepta la escritura propia; no pidas copiar un modelo.', 'Anota su explicación aparte, con permiso, sin escribir encima de su texto.'],80,1600,24);
documents.push(['tiras-de-mensajes',messages+end]);
let books=await start('Cuidamos los libros','book');
books+=text(['Una guía para consultar en nuestra biblioteca.'],80,220,28);
const bookTips=[['Manos limpias y secas.','Antes de elegir un libro,','miramos nuestras manos.'],['Abrimos el libro con cuidado.','Lo apoyamos sobre una mesa','o en nuestras piernas.'],['Pasamos una página a la vez.','Tomamos la esquina con cuidado,','sin tirar.'],['Lo devolvemos a su lugar.','Así otra persona podrá encontrarlo.']];
for(const [i,lines]of bookTips.entries()){
 const y=285+i*320;
 books+=`<rect x="80" y="${y}" width="1080" height="285" rx="18" fill="${['#edf7fa','#eef8f2','#fff8e7','#f5effc'][i]}"/><circle cx="150" cy="${y+65}" r="30" fill="#087d96"/><text x="140" y="${y+76}" style="fill:white;font-size:30px;font-weight:bold">${i+1}</text>`;
 books+=text(lines,210,y+75,29);
 books+=await workshopImage(['book-clean-hands','book-on-table','book-turn-page','book-on-shelf'][i],910,y+95,225,180);
}
books+=text(['Para la docente: lean juntos y busquen pistas en palabras, dibujos y números.'],80,1625,24);
documents.push(['cuidamos-los-libros',books+end]);
let tower=await start('La torre de Nina','blocks');
tower+=text(['Un cuento original Ayni para mirar y leer en compañía.'],80,215,27);
const towerPages=[
 ['Nina quería una torre para su muñeco.','Puso bloques uno sobre otro.','—¿Podrá sostener uno más? —preguntó.'],
 ['Al poner otra pieza, la torre cayó.','Nina miró la base estrecha.','—Probaré de otra manera —decidió.'],
 ['Puso piezas anchas abajo y otras encima.','La nueva torre se mantuvo en su lugar.','Nina volvió a mirar y sonrió.','¿Qué cambió en su construcción?'],
];
tower+=await workshopImage('story-nina',80,250,1080,370);
for(const [i,lines]of towerPages.entries()){
 const y=650+i*290;
 tower+=`<rect x="80" y="${y}" width="1080" height="265" rx="18" fill="${['#edf7fa','#fff8e7','#eef8f2'][i]}"/><text x="115" y="${y+48}" font-size="28" font-weight="700">${i+1}</text>`;
 tower+=text(lines,175,y+55,31);
}
tower+=text(['Para la docente: no adelantes el final; vuelvan al texto y a las imágenes.', 'Pueden contar qué creen que pasará, señalar y cambiar de idea al leer.'],80,1595,24);
documents.push(['la-torre-de-nina',tower+end]);
let poem=await start('Charquito de cielo','water_drop');
poem+=text(['Un poema original Ayni para leer en compañía.'],80,220,28);
poem+=`<rect x="80" y="290" width="1080" height="1050" rx="20" fill="#edf7fa"/>`;
poem+=text(['En un charquito del patio','cabe un pedazo de cielo.','Pasa una nube despacio,','se mira y sigue su vuelo.','','Llega una gota pequeña,','se dibujan redondeles.','El cielo se mueve un poco','y vuelve a quedarse quieto.'],135,400,43);
poem+=await workshopImage('poem-puddle',310,985,620,340);
poem+=text(['¿Qué parte quieres volver a escuchar?', 'Mira el texto y la imagen. Puedes señalar, comentar o dibujar tu idea.'],80,1440,30);
poem+=text(['Para la docente: no pedir memorización ni respuestas únicas.', 'Una interpretación se conversa volviendo a una pista del poema.'],80,1585,24);
documents.push(['charquito-de-cielo',poem+end]);
let riddles=await start('Adivinanzas con pistas','ideas');
riddles+=text(['Escucha, mira y cuenta qué pista te ayuda a pensar.'],80,220,28);
const riddleLines=[['Ruedo por el suelo.','Con tus manos me puedes enviar.','¿Quién soy?'],['Al abrirme hay páginas.','Cuentos y pistas puedo guardar.','¿Quién soy?'],['Salgo de día en el cielo.','Doy luz; no me debes mirar.','¿Quién soy?'],['De noche puedo asomarme.','A veces parezco una sonrisa.','¿Quién soy?']];
for(const [i,lines]of riddleLines.entries()){
 const y=285+i*300;
 riddles+=`<rect x="80" y="${y}" width="1080" height="275" rx="18" fill="${['#fff8e7','#f5effc','#eef8f2','#edf7fa'][i]}"/>`+text(lines,115,y+65,31);
 if(i===0)riddles+=await friendlyImage('ball',910,y+45,195);
 if(i===1)riddles+=await friendlyImage('book',910,y+45,195);
 if(i>=2)riddles+=await workshopImage(['riddle-sun','riddle-moon'][i-2],910,y+45,195,195);
}
riddles+=text(['Para la docente: las respuestas se pueden cubrir con papel si el grupo lo desea.', 'Relean y comparen pistas sin competir por adivinar más rápido.'],80,1585,24);
documents.push(['adivinanzas-con-pistas',riddles+end]);
let water=await start('Pintamos con agua','painting');
water+=text(['Un instructivo original Ayni para consultar antes y durante el juego.'],80,220,27);
const waterSteps=[['Reunimos lo necesario.','Poca agua limpia, una brocha, cartón oscuro y una toalla.'],['Mojamos un poco la brocha.','La sacamos sin derramar. No bebemos el agua.'],['Dibujamos sobre el cartón.','Elegimos qué líneas queremos dibujar.'],['Miramos y volvemos a probar.','¿Qué pasó con el dibujo después de un rato?']];
for(const [i,lines]of waterSteps.entries()){
 const y=285+i*305;
 water+=`<rect x="80" y="${y}" width="1080" height="280" rx="18" fill="${['#edf7fa','#eef8f2','#fff8e7','#f5effc'][i]}"/><circle cx="140" cy="${y+60}" r="30" fill="#087d96"/><text x="130" y="${y+70}" style="fill:white;font-size:28px">${i+1}</text>`+text(lines,195,y+65,28);
 water+=`<image x="760" y="${y+115}" width="350" height="155" href="data:image/png;base64,${(await readFile(`public/workshop-illustrations/${['water-painting','wet-brush','paint-with-water','water-dries'][i]}.png`)).toString('base64')}"/>`;
}
water+=text(['Para la docente: consulta el texto con los niños; no es una prueba de lectura.', 'Protege el suelo y acompaña el uso de agua.'],80,1585,24);
documents.push(['pintamos-con-agua',water+end]);
for(const [name,svg]of documents){await writeFile(`${svgFolder}/${name}.svg`,svg);await sharp(Buffer.from(svg)).png().toFile(`${folder}/${name}.png`);}
await writeFile(`${svgFolder}/PROVENANCE.json`,JSON.stringify({author:'Ayni',version:'1.5.0',generator:'scripts/build-workshop-resources.mjs',method:'Original text and precise mathematical geometry; contextual Ayni art and optimized built-in imagegen story/action illustrations; SVG previews rendered with sharp; PDF text remains native',sources:[],files:documents.map(([name])=>name)},null,2)+'\n');
console.log(`Created ${documents.length} original printable resources.`);
