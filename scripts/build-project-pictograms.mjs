import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

// Small original SVG pictograms based on the teacher-approved «Trazo suave» reference.
// Re-run to reproduce all assets and metadata. No external media or provider calls.
const target = path.join(process.cwd(), "public/project-pictograms");
const check = process.argv.includes("--check");
async function save(file, contents) {
  if (check) {
    if (await readFile(file, "utf8") !== contents) throw new Error(`Generated pictogram is stale: ${path.basename(file)}`);
  } else await writeFile(file, contents);
}
const c = { ink: "#769781", green: "#BCDAA2", mint: "#ADD5BF", blue: "#BBDCE7", purple: "#CEBEE4",
  pink: "#F2BEC7", peach: "#F4C4A5", yellow: "#F7E3A2", brown: "#B5A28C", red: "#DF7776", white: "#FFFCF7" };
const p = (d, fill = "none") => `<path d="${d}" fill="${c[fill] ?? fill}"/>`;
const e = (x, y, rx, ry, fill) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${c[fill] ?? fill}"/>`;
const r = (x, y, w, h, fill, radius = 6) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${c[fill] ?? fill}"/>`;
const line = (x1, y1, x2, y2) => p(`M${x1} ${y1}L${x2} ${y2}`);
const group = (body, transform) => `<g transform="${transform}">${body}</g>`;
const leaf = (d) => p(d, "green");
const person = (x, y, scale = 1, fill = "blue", longHair = false) => group(
  (longHair ? p("M-15 15Q-22-16 0-18Q22-16 15 15Z", "brown") : p("M-13-6Q-11-20 3-18Q16-16 14-4Z", "brown")) +
  e(0, -3, 12, 14, "peach") + p("M-11 14Q0 8 11 14L17 48H-17Z", fill) +
  p("M-11 48L-12 65M11 48L12 65M-12 20L-24 36M12 20L24 36"), `translate(${x} ${y}) scale(${scale})`);
const heart = (fill = "pink") => p("M64 105C15 75 12 44 34 34Q53 26 64 46Q75 26 94 34C116 44 113 75 64 105Z", fill);
const wheel = (x, y) => e(x, y, 10, 10, "purple") + e(x, y, 3, 3, "white");
const entries = [];
function add(id, title, category, keywords, body, alternatives = []) {
  const terms = keywords.split("|");
  entries.push({ id, file: `${id}.svg`, title, description: `${title}. Dibujo simple en pastel, contorno suave, sin rostro y fondo transparente.`,
    category, subcategory: id, concepts: terms, actions: alternatives, objects: terms, contexts: ["educación inicial", "proyecto de aula"],
    age_range: [3, 4, 5], priority: category === "animales" ? 6 : 5, body });
}

add("peru_flag", "Bandera del Perú", "cultura", "bandera|Perú|patria|patrias|peruana|peruano|identidad nacional|independencia", 
  line(25, 113, 25, 16) + p("M25 19Q45 10 65 19T107 19V75Q86 84 65 75T25 75Z", "white") +
  p("M25 19Q35 14 49 16V72Q36 70 25 75Z", "red") + p("M82 21Q95 23 107 19V75Q95 80 82 78Z", "red"), ["celebrar"]);
add("water_drop", "Gota de agua", "ambiente", "agua|gota|lluvia|río|rios|mar|océano|flotar|hundirse", 
  p("M64 14C53 35 27 56 27 78A37 37 0 0 0 101 78C101 56 75 35 64 14Z", "blue") + p("M43 76Q37 90 54 97"), ["cuidar", "ahorrar"]);
add("tree", "Árbol", "naturaleza", "árbol|árboles|bosque|bosques|hojas|sombra", 
  p("M55 62L53 114H78L74 62Z", "brown") + p("M32 77C10 70 13 43 34 39C27 13 65 4 78 26C107 13 119 47 100 59C117 86 83 98 65 82C52 92 36 90 32 77Z", "mint") + p("M64 66V99M64 85L48 72M64 80L79 67"));
add("plant", "Planta en maceta", "naturaleza", "planta|plantas|jardín|jardinería|maceta|vegetal|sembrar|plantar", 
  p("M39 82L44 115Q64 124 84 115L89 82Z", "purple") + e(64, 82, 26, 8, "purple") + e(64, 81, 20, 4, "brown") +
  leaf("M63 69C32 68 16 48 19 38C43 23 68 43 63 69Z") + leaf("M67 42C49 27 62 10 83 8C95 30 75 49 67 42Z") +
  leaf("M68 67C76 38 103 40 115 57C104 76 82 79 68 67Z") + p("M63 82Q61 52 73 29M63 63Q47 49 33 46M65 74Q83 57 101 58"), ["regar", "germinación"]);
add("seed", "Semilla y brote", "naturaleza", "semilla|semillas|brote|germinación|germinar|siembra|crecer", 
  e(64, 100, 31, 17, "brown") + p("M64 94V55") + leaf("M64 63Q24 66 26 31Q64 27 64 63Z") + leaf("M64 55Q67 15 103 19Q112 54 64 55Z") + p("M51 100Q66 107 80 98"));
add("flower", "Flor", "naturaleza", "flor|flores|primavera|pétalo|pétalos", 
  p("M64 110V60") + leaf("M64 96Q22 93 27 72Q55 68 64 96Z") + leaf("M64 84Q78 59 105 67Q107 92 64 84Z") +
  e(64, 28, 15, 19, "pink") + e(83, 44, 19, 15, "pink") + e(72, 62, 15, 17, "pink") + e(50, 62, 15, 17, "pink") + e(44, 42, 19, 15, "pink") + e(64, 45, 13, 13, "yellow"));
add("dog", "Perro", "animales", "perro|perros|perrito|can|mascota|mascotas", 
  p("M89 73Q113 75 112 55") + p("M28 63Q19 38 38 30L61 38L76 57Q107 57 103 85L100 111H82L78 90H55L51 111H33L31 86Z", "peach") +
  p("M24 42Q17 47 14 62L33 67L42 47Z", "brown") + p("M45 32Q47 19 61 26L68 41L61 52Z", "brown") + p("M54 90V106M87 89V106"));
add("cat", "Gato", "animales", "gato|gatos|gatito|felino", 
  p("M85 102Q118 104 108 81Q98 60 110 49") + p("M41 58L29 20L53 35Q64 30 75 35L99 20L87 59Q83 78 93 111H35Q46 81 41 58Z", "purple") + p("M52 96V111M75 96V111"));
add("bird", "Ave", "animales", "ave|aves|pájaro|pájaros|pajarito|nido|plumas", 
  p("M39 78L16 84L30 60", "mint") + e(64, 70, 36, 27, "blue") + e(85, 47, 20, 21, "blue") +
  p("M105 43L121 51L105 57Z", "yellow") + p("M50 65Q75 49 77 80Q55 91 50 65Z", "mint") + p("M56 96V110H48M76 96V110H84"));
add("fish", "Pez", "animales", "pez|peces|pescado|pecera|acuario|marino|marinos", 
  p("M34 54L11 33V94L34 77Z", "purple") + p("M41 43Q49 17 74 29L80 43", "purple") + e(69, 66, 42, 27, "blue") +
  p("M66 63L48 80Q72 82 80 63Z", "mint") + p("M90 47Q83 66 90 84") + e(108, 20, 6, 6, "blue") + e(117, 34, 4, 4, "blue"));
add("rabbit", "Conejo", "animales", "conejo|conejos|conejito", 
  e(37, 86, 13, 13, "white") + e(64, 85, 29, 27, "white") + e(51, 36, 10, 28, "pink") + e(74, 31, 10, 27, "pink") +
  e(63, 64, 25, 23, "white") + e(48, 109, 15, 7, "purple") + e(80, 109, 15, 7, "purple"));
add("turtle", "Tortuga", "animales", "tortuga|tortugas|caparazón", 
  e(33, 94, 10, 12, "mint") + e(80, 94, 10, 12, "mint") + p("M25 75L12 88L31 85Z", "mint") + e(108, 78, 13, 15, "mint") +
  p("M24 83C17 30 91 25 97 83Z", "green") + p("M31 82Q34 53 58 45Q79 54 87 82M41 62L56 78L76 59M56 78V84"));
add("butterfly", "Mariposa", "animales", "mariposa|mariposas|alas|metamorfosis", 
  p("M57 62C4-3 1 72 41 77C8 117 54 124 59 85Z", "purple") + p("M71 62C124-3 127 72 87 77C120 117 74 124 69 85Z", "pink") +
  r(59, 43, 10, 53, "yellow", 5) + p("M60 47Q54 28 45 28M68 47Q75 28 83 28"));
add("bee", "Abeja", "animales", "abeja|abejas|miel|colmena|polinización|insecto|insectos", 
  e(52, 37, 17, 23, "blue") + e(78, 37, 17, 23, "blue") + e(63, 73, 39, 28, "yellow") +
  p("M46 49Q37 71 46 96M65 45Q58 72 65 100M84 50Q78 75 84 94") + p("M102 70L115 77L101 82Z", "brown") + p("M30 63L18 54M32 54L25 42"));
add("hen", "Gallina", "animales", "gallina|gallinas|pollo|pollito|huevo|corral|granja", 
  p("M33 81Q4 59 24 46L43 70Z", "peach") + e(64, 80, 35, 26, "white") + e(85, 46, 21, 26, "white") +
  p("M73 23Q72 9 81 11Q88 8 91 19Q103 15 100 32", "pink") + p("M106 39L121 47L106 52Z", "yellow") + p("M61 106V119M79 104V119") + e(60, 76, 18, 15, "peach"));
add("cow", "Vaca", "animales", "vaca|vacas|leche|ganado|animales de granja", 
  p("M89 67Q117 65 114 88") + r(28, 53, 73, 40, "white", 15) + p("M35 88V113H48V89M79 89V113H92V88", "white") +
  p("M20 47L17 26L31 35M47 34L57 23L53 46", "yellow") + p("M25 43L9 39L15 54L31 53M47 43L64 38L59 54L44 54", "pink") +
  r(21, 39, 34, 44, "white", 15) + e(38, 75, 17, 9, "pink") + p("M66 57Q58 76 72 79Q89 75 86 57Z", "brown"));
add("boy", "Niño", "personas", "niño|niños|niñez|infancia|yo|identidad|autonomía", person(64, 34, 1.05, "blue"));
add("girl", "Niña", "personas", "niña|niñas|niñez|infancia|identidad|autonomía", person(64, 34, 1.05, "pink", true));
add("parents", "Personas cuidadoras", "personas", "padres|madre|padre|mamá|papá|cuidador|cuidadora|mamas|papas", person(40, 33, 1.02, "purple", true) + person(87, 33, 1.02, "mint"));
add("family", "Familia", "personas", "familia|familias|hogar|abuelos|abuela|abuelo|hermanos|hermanas", person(32, 34, 1, "mint") + person(95, 34, 1, "purple", true) + person(64, 66, .68, "peach"));
add("home", "Casa", "comunidad", "casa|casas|vivienda|viviendas|hogar|barrio", r(25, 48, 78, 65, "peach") + p("M12 52L64 12L116 52Z", "pink") + r(51, 76, 25, 37, "purple", 4) + r(34, 63, 13, 14, "blue", 3) + r(84, 63, 13, 14, "blue", 3));
add("school", "Jardín y escuela", "comunidad", "escuela|colegio|aula|jardín escolar|jardín infantil|acogida|adaptación", r(16, 50, 96, 62, "yellow") + p("M11 50L64 15L117 50Z", "mint") + r(52, 74, 24, 38, "purple", 3) + r(27, 66, 17, 19, "blue", 3) + r(84, 66, 17, 19, "blue", 3) + e(64, 40, 9, 9, "white"));
add("community", "Comunidad y barrio", "comunidad", "comunidad|vecinos|vecinas|barrio|ciudad|pueblo|oficios|trabajadores", r(9, 62, 34, 47, "peach") + p("M6 62L26 43L46 62Z", "pink") + r(49, 31, 29, 78, "blue") + r(86, 55, 33, 54, "yellow") + p("M83 55L102 38L122 55Z", "mint") + r(18, 85, 13, 24, "purple", 2) + r(59, 45, 9, 13, "white", 2) + r(59, 67, 9, 13, "white", 2) + r(96, 78, 12, 15, "white", 2));
add("friendship", "Juego y colaboración", "personas", "colaborar|colaboración|compartir|cooperar|cooperación|juntos|juntas|acuerdos|convivir", person(32, 40, .88, "blue") + person(97, 40, .88, "pink", true) + p("M54 72Q64 81 75 72") + e(64, 28, 8, 8, "yellow"));
add("pencil", "Lápiz", "expresión", "lápiz|lápices|escribir|escritura|trazo|trazos|dibujar|dibujo", group(r(52, 18, 24, 73, "yellow", 3) + r(52, 13, 24, 16, "pink", 3) + p("M52 91L64 116L76 91Z", "peach") + p("M60 108L64 116L68 108Z", "brown") + line(64, 33, 64, 89), "rotate(30 64 64)"));
add("painting", "Pincel y acuarelas", "expresión", "pincel|pinceles|acuarela|acuarelas|pintar|pintura|colores|arte|artes", r(12, 55, 75, 50, "purple", 8) + e(29, 70, 9, 9, "pink") + e(51, 70, 9, 9, "yellow") + e(72, 70, 9, 9, "blue") + e(29, 92, 9, 9, "green") + e(52, 92, 9, 9, "peach") + e(73, 92, 9, 9, "mint") + group(r(95, 14, 9, 65, "peach", 4) + r(94, 65, 11, 14, "purple", 2) + p("M94 79Q82 99 99 114Q113 98 105 79Z", "mint"), "rotate(17 99 64)"));
add("book", "Libro de cuentos", "expresión", "libro|libros|cuento|cuentos|historia|historias|lectura|leer|biblioteca|relato", p("M64 36Q36 16 12 29V103Q38 90 64 109Q90 90 116 103V29Q92 16 64 36Z", "purple") + p("M64 36V109M25 45Q41 42 51 51M25 61Q41 58 51 67M25 77Q41 74 51 83M78 51Q89 42 103 45M78 67Q89 58 103 61M78 83Q89 74 103 77"));
add("music", "Instrumentos y música", "expresión", "música|musica|instrumento|instrumentos|canción|canciones|cantar|sonido|sonidos|ritmo", e(47, 89, 22, 23, "yellow") + p("M66 76L100 30Q113 17 114 33L80 86Z", "peach") + p("M86 69Q60 59 58 32Q56 17 42 21Q26 25 30 40Q36 62 61 74") + e(32, 31, 12, 15, "purple") + e(101, 97, 10, 8, "pink") + p("M111 96V66L122 62"));
add("ideas", "Idea para explorar", "general", "idea|ideas|proyecto|proyectos|exploración|investigar|descubrir|preguntas|indagar", p("M41 76C10 47 35 14 64 14C93 14 118 47 87 76L83 90H45Z", "yellow") + r(46, 90, 36, 13, "purple", 3) + p("M53 107Q64 120 75 107M55 87V66L45 57M73 87V66L83 57M12 39L22 44M108 44L118 39M64 3V8"));
add("puppets", "Títeres", "expresión", "títere|títeres|teatro|dramatizar|dramatización|representar", p("M24 99L29 60Q25 39 39 29Q46 20 50 36Q56 22 63 36Q79 30 82 49L77 100Z", "purple") + p("M23 100Q51 113 80 100M51 108V123") + r(93, 37, 11, 83, "peach", 4) + p("M82 38L91 11L99 28L107 11L118 38L110 62H90Z", "mint"));
add("blocks", "Bloques de construcción", "juego", "bloque|bloques|construcción|construir|torre|torres|armar|crear|juego", r(13, 77, 35, 35, "pink", 4) + r(48, 77, 35, 35, "blue", 4) + r(83, 77, 32, 35, "yellow", 4) + r(34, 42, 35, 35, "purple", 4) + r(69, 42, 35, 35, "mint", 4) + p("M48 9L27 42H71Z", "peach"));
add("shapes", "Formas geométricas", "matemática", "forma|formas|figura|figuras|círculo|cuadrado|triángulo|geometría", e(37, 39, 24, 24, "pink") + r(72, 17, 40, 40, "blue", 5) + p("M41 65L13 110H69Z", "yellow") + p("M92 67L118 90L92 115L69 90Z", "purple"));
add("numbers", "Cantidades y conteo", "matemática", "cantidad|cantidades|contar|conteo|número|números|repartir|comparar", r(12, 47, 30, 66, "peach", 5) + r(48, 31, 30, 82, "purple", 5) + r(84, 15, 30, 98, "mint", 5) + e(27, 78, 5, 5, "white") + e(63, 63, 5, 5, "white") + e(63, 82, 5, 5, "white") + e(99, 45, 5, 5, "white") + e(99, 65, 5, 5, "white") + e(99, 85, 5, 5, "white"));
add("measure", "Regla para medir", "matemática", "medir|medida|medidas|longitud|tamaño|tamaños|regla|largo|corto", group(r(10, 45, 108, 37, "yellow", 5) + p("M22 45V68M35 45V59M48 45V68M61 45V59M74 45V68M87 45V59M100 45V68"), "rotate(-25 64 64)"));
add("market", "Mercado", "comunidad", "mercado|tienda|comprar|vender|comercio|dinero|feria", r(25, 55, 78, 59, "peach", 3) + p("M20 24H108L119 56H9Z", "mint") + p("M9 56Q9 74 27 56Q27 74 45 56Q45 74 64 56Q64 74 83 56Q83 74 101 56Q101 74 119 56", "yellow") + r(37, 78, 24, 36, "purple", 3) + r(72, 77, 20, 20, "blue", 2));
add("fruit", "Frutas", "alimentación", "fruta|frutas|manzana|plátano|banana|pera|mandarina|naranja", p("M51 46Q20 28 17 64Q15 93 45 107Q67 100 78 76Q88 43 62 44Z", "pink") + p("M51 47Q50 30 59 23") + leaf("M57 31Q67 8 86 19Q82 38 57 31Z") + p("M72 100Q110 87 111 37Q128 79 105 106Q88 120 72 100Z", "yellow"));
add("vegetables", "Verduras", "alimentación", "verdura|verduras|vegetales|zanahoria|lechuga|huerto|hortaliza", p("M21 42Q33 26 50 40Q68 57 47 104L37 117Q24 102 17 62Z", "peach") + leaf("M25 38Q2 28 15 13Q29 19 30 35Z") + leaf("M31 36Q30 5 43 11Q52 24 39 37Z") + p("M24 62L36 65M28 79L40 82") + p("M72 98Q47 81 67 66Q50 42 78 39Q97 20 108 42Q126 48 112 64Q129 88 107 99Z", "mint") + p("M82 103Q86 60 97 49M85 77L72 65M88 68L106 61"));
add("cooking", "Cocina", "alimentación", "cocina|cocinar|preparar alimentos|receta|recetas|comida|alimentos|pan|panadería", r(23, 48, 83, 58, "blue", 10) + r(16, 39, 95, 11, "purple", 4) + p("M24 65H9V87H24M105 65H120V87H105M54 38Q52 25 62 25H73Q79 25 77 38M43 16Q37 9 43 3M81 16Q87 9 81 3"));
add("health", "Salud y cuidados", "bienestar", "salud|saludable|médico|doctor|enfermera|hospital|cuidado del cuerpo|botiquín", r(15, 40, 98, 73, "purple", 11) + p("M45 40V20H83V40") + p("M55 60H74V74H88V93H74V107H55V93H41V74H55Z", "white"));
add("hands", "Lavado de manos", "bienestar", "manos|lavar|lavado|higiene|jabón|limpieza", p("M17 80Q9 73 15 66L38 48Q45 42 50 49L29 72L60 51Q69 48 72 54Q75 60 67 65L45 81L73 70Q81 68 84 75Q87 82 77 87L45 103Q30 110 20 98Z", "peach") + p("M64 103Q66 88 78 83L99 65Q107 60 112 66Q118 73 108 79L103 83Q119 88 112 101L104 115H77Z", "pink") + e(80, 29, 12, 12, "blue") + e(105, 43, 7, 7, "blue") + e(52, 22, 6, 6, "blue"));
add("teeth", "Dientes y cepillo", "bienestar", "diente|dientes|dental|cepillo|cepillar|boca|dentista", p("M28 29Q11 17 13 47Q17 68 28 104Q32 123 42 112L49 79Q55 65 61 79L68 112Q78 122 82 104Q93 68 96 47Q98 17 78 29Q54 39 28 29Z", "white") + group(r(105, 32, 10, 83, "purple", 5) + r(99, 14, 22, 24, "mint", 4) + p("M102 20H115M102 26H115M102 32H115"), "rotate(12 110 64)"));
add("heart", "Emociones y buen trato", "bienestar", "emociones|emoción|sentimientos|sentir|afecto|amor|amistad|convivencia|respeto|buen trato|paz", heart() + p("M34 52Q28 62 41 74"));
add("ball", "Pelota y movimiento", "juego", "pelota|balón|deporte|mover|movimiento|correr|saltar|bailar|danza|motricidad|equilibrio", e(64, 64, 47, 47, "blue") + p("M64 17Q88 38 64 64Q41 89 64 111M17 64Q39 88 64 64Q91 41 111 64") + p("M31 31Q47 57 64 64Q83 78 97 97"));
add("playground", "Juegos del parque", "juego", "parque|juegos al aire libre|columpio|tobogán|patio|recreo", p("M15 112L38 20H76L98 112M29 56H83") + line(45, 21, 45, 72) + line(68, 21, 68, 72) + r(37, 72, 40, 10, "purple", 3) + p("M82 67L101 96Q106 106 123 108", "pink") + p("M82 67V45H110V94", "peach"));
add("car", "Auto", "transporte", "auto|autos|carro|carros|carrito|vehículo|vehículos|transporte|ruedas", p("M23 66L37 35Q42 27 53 27H79Q89 27 95 38L109 66", "mint") + r(10, 62, 109, 36, "blue", 12) + p("M35 61L46 39H65V61ZM72 39H81L95 61H72Z", "white") + wheel(34, 99) + wheel(97, 99));
add("bus", "Bus", "transporte", "bus|buses|ómnibus|autobús|viajar|viaje|pasajeros", r(9, 30, 110, 69, "yellow", 12) + r(20, 43, 18, 25, "blue", 3) + r(43, 43, 18, 25, "blue", 3) + r(66, 43, 18, 25, "blue", 3) + r(92, 42, 17, 49, "purple", 3) + wheel(31, 100) + wheel(97, 100));
add("recycling", "Reciclaje", "ambiente", "reciclaje|reciclar|residuos|basura|reutilizar|reducir|clasificar residuos", r(27, 35, 74, 77, "mint", 9) + r(20, 25, 88, 12, "purple", 4) + p("M49 25V14H79V25") + p("M54 76L64 58L76 78M64 58L66 69M64 58L54 59M78 82L66 97L46 94M66 97L74 96M66 97L67 87M44 91L39 77L48 61M39 77L48 77M39 77L40 86"));
add("earth", "Planeta Tierra", "ambiente", "planeta tierra|tierra|planeta|mundo|ambiente|naturaleza|contaminación|cuidar el planeta", e(64, 64, 48, 48, "blue") + p("M35 26L58 21L67 38L57 47L73 63L60 72L42 66L35 51L20 48Z", "mint") + p("M76 74L98 64L110 77L94 99L84 107L74 90Z", "green"));
add("weather", "Sol y nubes", "naturaleza", "sol|clima|tiempo atmosférico|nube|nubes|lluvia|viento|calor|frío|estaciones", e(47, 47, 25, 25, "yellow") + p("M47 10V17M47 77V84M10 47H17M77 47H84M20 20L25 25M69 69L74 74M20 74L25 69M69 25L74 20") + p("M44 110Q17 110 24 86Q27 73 42 73Q49 48 70 57Q89 54 96 77Q119 74 119 95Q119 111 99 110Z", "blue"));
add("space", "Estrellas y espacio", "naturaleza", "estrella|estrellas|espacio|universo|luna|cielo|astronomía|planetas", p("M72 14Q31 25 49 62Q62 86 88 79Q71 112 42 96Q10 77 22 42Q34 9 72 14Z", "purple") + p("M97 28L103 41L118 43L107 54L110 69L97 62L84 69L87 54L76 43L91 41Z", "yellow") + p("M98 87L101 94L110 96L104 102L105 111L98 107L90 111L92 102L86 96L94 94Z", "pink"));

if (entries.length !== 50 || new Set(entries.map(item => item.id)).size !== 50) throw new Error("Expected fifty unique pictograms.");
if (!check) await mkdir(target, { recursive: true });
const images = [];
for (const { body, ...metadata } of entries) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" fill="none"><g stroke="${c.ink}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>\n`;
  await save(path.join(target, metadata.file), svg);
  const entry = { ...metadata, bytes: Buffer.byteLength(svg), path: `/project-pictograms/${metadata.file}` };
  await save(path.join(target, `${metadata.id}.json`), JSON.stringify(entry, null, 2) + "\n");
  images.push(entry);
}
const index = { version: 1, style: "trazo_suave_pastel", format: "svg", view_box: "0 0 128 128", images };
await save(path.join(target, "index.json"), JSON.stringify(index, null, 2) + "\n");
const escape = value => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
await save(path.join(target, "catalog.html"), `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pictogramas Ayni · Trazo suave</title><style>body{margin:0;background:#fffdf9;color:#244a50;font:16px/1.5 system-ui,sans-serif}main{max-width:1120px;margin:auto;padding:32px 20px}h1{font-size:28px;margin:0 0 8px}p{margin:0 0 28px}section{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:24px 16px}figure{margin:0;text-align:center;padding:12px 0}img{width:110px;height:110px;object-fit:contain}figcaption{font-size:14px;font-weight:600;margin-top:8px}a{color:#087d96}small{display:block;font-weight:400}footer{margin-top:32px}</style><main><h1>Pictogramas para Mi año</h1><p>50 dibujos SVG · Trazo suave · Colores pastel · Sin rostros</p><section>${images.map(item => `<figure><img src="${item.file}" alt="${escape(item.title)}"><figcaption>${escape(item.title)}<small><a href="${item.id}.json">JSON</a> · ${item.bytes} B</small></figcaption></figure>`).join("")}</section><footer><a href="index.json">Catálogo JSON completo</a></footer></main></html>`);
console.log(JSON.stringify({ images: images.length, svgBytes: images.reduce((sum, item) => sum + item.bytes, 0), largestSvgBytes: Math.max(...images.map(item => item.bytes)) }));
