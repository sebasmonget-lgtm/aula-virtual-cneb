"""Create review-only workshop extracts from four downloaded preschool PDFs.

The source PDFs live outside the app's published resource library. This script
never edits them or the existing 389 ficha JSON files. Page numbers are physical
PDF pages, starting at one, not the printed page numbers inside the books.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from pypdf import PdfReader, PdfWriter


SOURCES = {
    "oscarcito": {
        "filename": "arcor_en_la_casa_de_oscarcito.pdf",
        "sha256": "0ada3ac16b445420c94181e1207d0a04e8652c8afb78cb68fd74350d1728c3ea",
        "organization": "Fundación Arcor / programa En la casa de Oscarcito",
        "country": "Argentina",
        "document": "En la casa de Oscarcito (tres cuadernos)",
        "year": 2007,
        "source_url": "https://fundacionarcor.org/en-la-casa-de-oscarcito/",
        "pdf_url": "https://fundacionarcor.org/wp-content/uploads/2020/11/1393256622_en-la-casa-de-oscarcito_ok.pdf",
        "rights": "Descarga pública; no se verificó permiso para redistribuir extractos en Ayni.",
    },
    "patio": {
        "filename": "arcor_salimos_al_patio.pdf",
        "sha256": "c403d0d902995154409a5cc1b4a9785234f8937765be53658c24ada1233bfaa7",
        "organization": "Fundación Arcor",
        "country": "Argentina",
        "document": "Salimos al patio: ideas para mirar, jugar y aprender",
        "year": 2026,
        "source_url": "https://fundacionarcor.org/juego-cartas-aire-libre/",
        "pdf_url": "https://fundacionarcor.org/wp-content/uploads/2026/09/DESCARGABLE-PRIMAVERA-DIGITAL.pdf",
        "rights": "Descarga pública; no se verificó permiso para redistribuir extractos en Ayni.",
    },
    "huerta": {
        "filename": "buenos_aires_cuaderno_de_huerta_inicial.pdf",
        "sha256": "5f1af0c43195511165f2145a72dbf79be57047279b30a9257af47dae2d38e9c5",
        "organization": "Ministerio de Ambiente de la Provincia de Buenos Aires",
        "country": "Argentina",
        "document": "Cuaderno de huerta. Nivel Inicial",
        "year": 2022,
        "source_url": "https://continuemosestudiando.abc.gob.ar/contenido/cuaderno-de-huerta/",
        "pdf_url": "https://continuemosestudiando.abc.gob.ar/wp-content/uploads/2023/05/cuaderno-de-huerta-inicial-continuemos-estudiando-2.pdf",
        "rights": "Descarga pública; no se identificó licencia de redistribución en el cuaderno.",
    },
    "entre_rios": {
        "filename": "entre_rios_tiempo_de_aprender.pdf",
        "sha256": "333c994cbbc9a496d8ca07f8fd5ae842630319d79bb47b5832f5a9bb6749ba13",
        "organization": "Consejo General de Educación de Entre Ríos",
        "country": "Argentina",
        "document": "Tiempo de aprender, en el jardín y en casa",
        "year": 2022,
        "source_url": "https://aprender.entrerios.edu.ar/tiempo-de-aprender-en-el-jardin-y-en-casa/",
        "pdf_url": "https://aprender.entrerios.edu.ar/wp-content/uploads/2022/03/Cuadernillo-Educacion-Inicial-Tiempo-de-aprender-en-el-Jardin-y-en-casa..pdf",
        "rights": "CC Atribución-NoComercial-CompartirIgual 2.5 Argentina (página 2); uso en Ayni pendiente de comprobar compatibilidad con NoComercial y CompartirIgual.",
    },
}

COMPETENCIES = {
    "PS_IDENTIDAD": ("Personal Social", "Construye su identidad", ["Se valora a sí mismo"]),
    "COM_ORAL": ("Comunicación", "Se comunica oralmente en su lengua materna", []),
    "COM_LECTURA": ("Comunicación", "Lee diversos tipos de textos escritos en su lengua materna", []),
    "COM_ARTE": ("Comunicación", "Crea proyectos desde los lenguajes artísticos", []),
    "MAT_CANTIDAD": ("Matemática", "Resuelve problemas de cantidad", []),
    "MAT_FORMA": ("Matemática", "Resuelve problemas de forma, movimiento y localización", []),
    "CYT_INDAGA": ("Ciencia y Tecnología", "Indaga mediante métodos científicos para construir sus conocimientos", []),
}


def item(id, source, pages, title, age, kind, competency, purpose, description, actions, materials, evidence, keywords, mediation="", note=""):
    return dict(id=id, source=source, pages=pages, title=title, age=age, kind=kind,
                competency=competency, purpose=purpose, description=description,
                actions=actions, materials=materials, evidence=evidence,
                keywords=keywords, mediation=mediation, note=note)


ITEMS = [
    item("arcor_01_presentacion_familia", "oscarcito", [2, 3, 4], "Oscarcito: me presento y dibujo a mi familia", [3, 4, 5], "identidad y expresión gráfica", "PS_IDENTIDAD", "Reconocer rasgos propios y representar a las personas significativas con apoyo de una conversación.", "El cuaderno invita a escribir el nombre con ayuda, seguir un camino hacia la casa y dibujar a la familia.", ["dice su nombre y reconoce a Oscarcito", "sigue el recorrido con el dedo o lápiz", "dibuja a quienes considera su familia y habla de ellos"], ["lápices o crayones"], "Dibujo y relato oral sobre personas significativas; no se interpreta el dibujo como evaluación por sí solo.", ["familia", "nombre", "recorrido", "dibujo"], "Leer las consignas y aceptar cualquier configuración familiar; no exigir escritura convencional."),
    item("arcor_02_que_susto_titeres", "oscarcito", list(range(5, 20)), "Escuchamos ¡Qué susto! y lo contamos con títeres", [3, 4, 5], "cuento y dramatización", "COM_ORAL", "Escuchar un relato completo, reconstruir sus acontecimientos y volver a contarlo jugando.", "Contiene el marco de lectura familiar, el cuento ilustrado ¡Qué susto!, títeres recortables y preguntas para narrar.", ["escucha el cuento leído por una persona adulta", "identifica y comenta qué pasó con los animales", "recorta con ayuda y usa títeres para volver a contar"], ["tijeras de punta roma con supervisión", "palitos", "cinta adhesiva"], "Relato oral o dramatización con títeres; la docente registra lo que el niño dice o hace realmente.", ["cuento", "animales", "títeres", "narración"], "Leer el cuento íntegro antes de usar el recortable; dar tiempo para juego libre con los personajes.", "Extracto largo deliberado: no separar el juego del cuento del que depende."),
    item("arcor_03_malevo_domino", "oscarcito", list(range(28, 42)), "Malevo busca un hueso: leemos y jugamos al dominó", [3, 4, 5], "cuento y juego de mesa", "COM_LECTURA", "Anticipar y comentar una historia ilustrada y jugar con sus personajes.", "El segundo cuaderno presenta la historia completa de Malevo, una hoja de dominó para recortar y preguntas de conversación.", ["observa ilustraciones mientras escucha el relato", "anticipa dónde podría estar el hueso y comenta el desenlace", "recorta con ayuda las piezas y juega al dominó"], ["tijeras de punta roma con supervisión", "cartulina opcional"], "Anticipaciones y comentarios en la lectura; reglas o decisiones observadas durante el juego.", ["perro", "hueso", "cuento", "dominó"], "Leer las páginas narrativas de forma continua; el dominó es recurso asociado, no evidencia automática de lectura.", "Extracto largo deliberado por dependencia del cuento completo."),
    item("arcor_04_pollitos_escondidos", "oscarcito", [49, 50], "Pollitos y huevos escondidos", [3, 4, 5], "búsqueda y cantidad", "MAT_CANTIDAD", "Contar pequeñas colecciones visibles y explicar cómo se encontraron elementos escondidos.", "Dos páginas del tercer cuaderno muestran gallinas y pollitos para contar, además de huevos y un gallo ocultos en la ilustración.", ["cuenta los pollitos de cada gallina", "busca huevos y gallo en la escena", "comunica cuántos encontró y dónde"], ["lápiz opcional"], "Conteo con señalamiento y explicación oral de la búsqueda.", ["gallina", "pollitos", "huevos", "conteo", "búsqueda visual"], "Usar objetos concretos si el conteo en la ilustración resulta difícil; no asumir que buscar dibujos demuestra cantidad."),
    item("arcor_05_zorro_gallina", "oscarcito", list(range(51, 66)), "El zorro y la gallina: relato y juego de personajes", [3, 4, 5], "cuento y dramatización", "COM_ORAL", "Reconstruir una secuencia narrativa con personajes, lugares y acciones.", "El tercer cuaderno contiene la situación inicial, el cuento completo, tarjetas recortables y preguntas para recontarlo.", ["escucha y observa el relato", "comenta lo que intenta hacer el zorro y lo que sucede", "usa tarjetas o gestos para recontar la secuencia"], ["tijeras de punta roma con supervisión", "cartulina opcional"], "Narración oral o dramatizada que conserva el orden causal del cuento.", ["cuento", "zorro", "gallina", "secuencia", "títeres"], "Leer el cuento antes del juego; las tarjetas son un apoyo opcional.", "Extracto largo deliberado por dependencia del cuento completo."),
    item("arcor_06_exploramos_patio", "patio", [2, 3, 4, 5], "Postas para explorar el patio", [3, 4, 5], "exploración del entorno", "CYT_INDAGA", "Observar y describir elementos y cambios del patio mediante acciones elegidas por los niños.", "Una página explica el uso del mazo y tres páginas contienen tarjetas para escuchar, tocar, mirar, buscar sombra, hojas e insectos.", ["elige una tarjeta", "busca u observa el elemento indicado", "cuenta, señala o compara lo que encontró"], ["mazo impreso y recortado", "patio o espacio exterior seguro"], "Descripción o señalamiento de hallazgos reales; no se infiere que todas las postas se hayan realizado.", ["patio", "sombra", "hojas", "insectos", "observación", "juego"], "Leer cada tarjeta, elegir solo postas seguras y conversar después de cada exploración.", "Es un mazo para actividad, no una ficha de respuesta individual."),
    item("huerta_01_guardian", "huerta", [9, 10], "Construimos un guardián para la huerta", [3, 4, 5], "gráfico-plástico", "COM_ARTE", "Diseñar y representar un personaje que cuide la huerta del grupo.", "La consigna propone crear un guardián con materiales elegidos y dibujar cómo quedó.", ["imagina al guardián y elige materiales", "lo construye con apoyo", "dibuja o comenta su creación"], ["materiales reutilizables disponibles", "lápices o crayones"], "Guardián construido y representación o relato del niño.", ["huerta", "guardián", "creación", "dibujo"], "Relacionar la creación con la huerta real, sin imponer un modelo único."),
    item("huerta_02_conocemos_huerta", "huerta", [11, 12], "Conocemos y registramos nuestra huerta", [3, 4, 5], "exploración y registro", "CYT_INDAGA", "Observar el espacio de cultivo antes de iniciar registros posteriores.", "El cuaderno presenta su uso como registro de lo que sucede en la huerta y deja una página para dibujar observaciones iniciales.", ["visita u observa la huerta", "señala elementos necesarios para sembrar", "dibuja algo que vio y lo explica"], ["huerta o macetas reales", "lápices o crayones"], "Dibujo fechado y explicación de una observación real.", ["huerta", "registro", "observación", "siembra"], "No presentar el dibujo como evidencia de un cultivo que aún no existe."),
    item("huerta_03_semillas_frutos", "huerta", [13, 14, 15], "Exploramos semillas dentro de frutos", [3, 4, 5], "indagación de semillas", "CYT_INDAGA", "Comparar semillas halladas al abrir frutos y representar una elección propia.", "Las páginas presentan semillas, invitan a explorar frutos y ofrecen espacio para pegar o dibujar semillas observadas.", ["observa y manipula semillas con supervisión", "compara forma, tamaño o color", "pega o dibuja semillas elegidas"], ["frutos locales", "semillas grandes seguras", "lupa opcional", "pegamento", "lápices"], "Comparación oral y registro de las semillas realmente observadas.", ["semillas", "frutos", "comparar", "lupa", "registro"], "Elegir semillas no ingeribles y vigilar piezas pequeñas; evitar frutos específicos si no están disponibles."),
    item("huerta_04_cambios_entorno", "huerta", [16, 17, 18, 19, 20], "Observamos cambios del entorno en distintos momentos", [3, 4, 5], "observación longitudinal", "CYT_INDAGA", "Registrar cambios reales en plantas, árboles o luz durante varios momentos.", "Una página plantea observar cambios a lo largo del año y cuatro páginas son espacios sucesivos de observación.", ["elige con la docente qué observar", "observa el mismo referente en fechas distintas", "dibuja o dicta lo que cambió"], ["árbol o planta accesible", "lápices o crayones"], "Registros fechados de varios momentos; la comparación se hace con lo observado, no con dibujos inventados.", ["cambio", "árbol", "observación", "tiempo", "registro"], "Fechar cada registro y volver al mismo objeto; no usar cuatro páginas como ejercicios consecutivos el mismo día.", "Secuencia longitudinal; no equivale a un único taller de 45 minutos."),
    item("huerta_05_germinacion", "huerta", list(range(21, 31)), "Seguimos la germinación durante ocho semanas", [4, 5], "indagación longitudinal", "CYT_INDAGA", "Observar, comparar y registrar el crecimiento de una semilla elegida.", "Presenta la consigna, ficha de semilla y espacios de seguimiento desde semana 1 hasta semana 8.", ["elige una semilla sembrada", "observa cambios cada semana", "dibuja o dicta observaciones y compara registros"], ["semillas", "tierra o sustrato", "agua", "recipiente", "lápices"], "Secuencia de registros semanales de un cultivo real, con comparación de cambios observados.", ["germinación", "semilla", "planta", "semanas", "registro"], "Mantener condiciones de cultivo seguras; permitir registrar también ausencia de cambio o fallos de germinación.", "Diez páginas forman una sola secuencia; no se deben fragmentar por semanas como talleres independientes."),
    item("huerta_06_hojas", "huerta", [31, 32, 33, 34, 35], "Comparamos hojas y creamos con sus formas", [3, 4, 5], "exploración y arte con hojas", "COM_ARTE", "Explorar formas y texturas de hojas para producir composiciones propias.", "Invita a comparar hojas, pegarlas o dibujarlas, armar un rompecabezas y producir otras figuras con sus partes.", ["recoge y compara hojas caídas", "elige hojas para dibujar o pegar", "arma figuras o un rompecabezas propio"], ["hojas caídas limpias", "papel", "pegamento", "tijeras con supervisión"], "Composición propia y conversación sobre elecciones de formas y materiales.", ["hojas", "textura", "rompecabezas", "figuras", "arte"], "La comparación de hojas es experiencia previa; la composición no debe reducirse a copiar el ejemplo."),
    item("huerta_07_flores_luz", "huerta", [38, 39], "Observamos flores a contraluz", [4, 5], "indagación de luz y plantas", "CYT_INDAGA", "Comparar lo que se ve de una flor con luz directa y a contraluz.", "La propuesta pide mirar pétalos, elegir flores y observarlas a contraluz; incluye un espacio de registro.", ["observa color y forma de pétalos", "mira una flor frente a una fuente de luz segura", "comenta y registra lo que cambió en su percepción"], ["flores caídas o autorizadas", "luz natural", "lápices"], "Comparación oral y dibujo de lo observado a contraluz.", ["flores", "luz", "contraluz", "observación"], "No mirar directamente al sol; cuidar la recolección de flores y posibles alergias."),
    item("huerta_08_aromas", "huerta", [40, 41, 42, 43], "Exploramos aromas de la huerta y la cocina", [3, 4, 5], "exploración sensorial", "CYT_INDAGA", "Comparar plantas aromáticas y relacionar sus olores con usos cotidianos.", "Cuatro páginas presentan plantas aromáticas, bolsitas con hojas y su uso para dar sabor a comidas.", ["huele hojas elegidas sin ingerirlas", "compara y describe olores", "arma una bolsita y conversa sobre comidas conocidas"], ["plantas aromáticas identificadas por adulto", "bolsitas de tela o papel"], "Descripción de olores y elección de materiales basada en la experiencia.", ["aromáticas", "olores", "cocina", "sentidos", "huerta"], "Comprobar alergias y evitar degustación sin autorización; el uso culinario se conversa, no se presupone."),
    item("huerta_09_sombras", "huerta", [44], "Cazadores de sombras de hojas", [4, 5], "indagación de luz y sombra", "CYT_INDAGA", "Observar las siluetas que producen hojas colocadas frente a una fuente de luz.", "La página propone seleccionar hojas, observar sus sombras y dibujar los contornos proyectados.", ["elige hojas reales", "observa dónde aparece su sombra", "dibuja el contorno y comenta diferencias entre las hojas"], ["hojas", "luz natural", "papel", "lápices"], "Observación oral y dibujo de la sombra real de una hoja.", ["sombras", "hojas", "luz", "silueta"], "No mirar directamente al sol; comprobar que las sombras sean visibles antes de invitar a registrarlas."),
    item("huerta_10_huellas", "huerta", [45], "Dejamos huellas de hojas con pintura", [3, 4, 5], "gráfico-plástico", "COM_ARTE", "Explorar la impresión de distintas hojas y crear marcas propias.", "La página explica cómo pintar una hoja por un lado y apoyarla sobre papel para dejar una impresión.", ["elige hojas y colores", "pinta una cara de la hoja", "presiona, levanta y observa la huella que produjo"], ["hojas", "pintura lavable", "papel"], "Estampas realizadas por el niño y comentario sobre sus elecciones y hallazgos.", ["huellas", "hojas", "pintura", "estampado"], "Permitir pruebas libres antes de buscar una impresión nítida; esta es una propuesta artística distinta de la investigación de sombras."),
    item("entrerios_01_ventana_paisaje", "entre_rios", [12, 13, 14], "Miramos por la ventana y construimos un largavistas", [5], "exploración espacial", "MAT_FORMA", "Describir un paisaje cercano desde un punto de vista y volver a observarlo con un objeto construido.", "Incluye registro de lo visto desde una ventana y la construcción de un largavistas con material reutilizado.", ["observa y dibuja lo que ve desde una ventana", "construye un largavistas con ayuda", "vuelve a mirar y comunica qué cambió o descubrió"], ["tubos de cartón limpios", "pegamento", "lápices"], "Dibujo del paisaje y descripción oral de posiciones o elementos observados.", ["ventana", "paisaje", "largavistas", "ubicación", "construcción"], "No exigir salir de casa; ofrecer ventana o punto de observación seguro."),
    item("entrerios_02_tesoros", "entre_rios", [17, 18], "Contamos y clasificamos tesoros naturales", [5], "cantidad y clasificación", "MAT_CANTIDAD", "Contar una colección real y decidir criterios para agrupar objetos recolectados.", "Dos páginas piden buscar piedritas, representar una cantidad y agrupar hojas, piedras y ramas para comparar.", ["reúne objetos naturales seguros", "cuenta y representa una colección", "agrupa según material o criterio acordado y explica"], ["piedras grandes seguras", "hojas", "ramitas", "bolsa"], "Conteo con correspondencia y explicación del criterio de agrupación.", ["conteo", "clasificación", "piedras", "hojas", "colecciones"], "La consigna de diez objetos se ajusta solo si la docente lo considera apropiado; no asignar un desempeño por completar la hoja."),
    item("entrerios_03_frottage_collage", "entre_rios", [19, 20], "Hacemos frottage y collage con elementos naturales", [5], "gráfico-plástico", "COM_ARTE", "Experimentar texturas y componer una obra propia con materiales recolectados.", "La primera página explica frottage con hojas; la segunda propone un collage con elementos de la naturaleza.", ["elige hojas y prueba frotar sobre papel", "observa la marca producida", "organiza un collage propio y comenta sus elecciones"], ["hojas limpias", "papel", "crayones", "cartón", "pegamento"], "Producciones de frottage y collage y explicación de elecciones del niño.", ["frottage", "collage", "textura", "hojas", "arte"], "Priorizar exploración y elección de materiales sobre un resultado idéntico al ejemplo."),
    item("entrerios_04_paisaje_arte", "entre_rios", [21, 22, 23, 24], "Leemos un relato, miramos paisajes y pintamos el nuestro", [5], "lectura y gráfico-plástico", "COM_ARTE", "Apreciar representaciones de paisajes y crear una propia con un título.", "Cuatro páginas conectan un breve relato, obras de Quirós, conversación sobre paisajes y un espacio para dibujar y titular.", ["escucha el relato y comenta las obras", "elige un paisaje significativo", "lo dibuja y dicta o escribe como puede un título"], ["lápices", "pinturas opcionales"], "Paisaje creado y título comunicado por el niño; el texto no exige escritura convencional.", ["paisaje", "pintura", "arte", "título", "relato"], "Las obras y el relato conservan el contexto de la propuesta; no tratarlos como hojas independientes."),
    item("entrerios_05_dados_refugio", "entre_rios", [27, 39], "Juego de dados en el refugio", [5], "juego matemático", "MAT_CANTIDAD", "Usar un dado y objetos para avanzar o registrar cantidades durante un juego con reglas.", "La página 27 describe el juego y la 39 contiene el dado recortable al que remite; se extrajeron juntas aunque no son consecutivas.", ["acuerda reglas y turnos", "arma el dado con ayuda", "lo lanza y cuenta puntos u objetos durante el juego"], ["dado recortable", "tablero de 20 casillas", "piedritas u otras fichas seguras"], "Acciones de conteo y decisiones observadas durante el juego; no solo el tablero terminado.", ["dados", "refugio", "juego", "conteo", "turnos"], "Comprobar que las reglas y el número de casillas correspondan al grupo; usar un dado físico si el recortable no resiste."),
]


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("root", type=Path, help="Folder containing _originales with the four PDFs")
    args = parser.parse_args()
    root = args.root.resolve()
    originals = root / "_originales"
    readers = {}
    for key, source in SOURCES.items():
        path = originals / source["filename"]
        if not path.is_file() or sha256(path) != source["sha256"]:
            raise SystemExit(f"Missing or changed source PDF: {path}")
        readers[key] = PdfReader(str(path))

    ids = [x["id"] for x in ITEMS]
    if len(ids) != len(set(ids)):
        raise SystemExit("Duplicate workshop ID")
    index = []
    for x in ITEMS:
        source = SOURCES[x["source"]]
        reader = readers[x["source"]]
        pages = x["pages"]
        if not pages or len(pages) != len(set(pages)) or min(pages) < 1 or max(pages) > len(reader.pages):
            raise SystemExit(f"Invalid source pages for {x['id']}")
        area, competency, capacities = COMPETENCIES[x["competency"]]
        folder = root / x["id"]
        folder.mkdir(exist_ok=True)
        pdf_path = folder / "ficha.pdf"
        json_path = folder / "ficha.json"
        if pdf_path.exists() or json_path.exists():
            if not (pdf_path.is_file() and json_path.is_file()):
                raise SystemExit(f"Incomplete existing extract: {folder}")
            existing = json.loads(json_path.read_text(encoding="utf-8"))
            if existing.get("id") != x["id"] or existing.get("fuente", {}).get("paginas_pdf") != pages or existing.get("fuente", {}).get("sha256_pdf_extraido") != sha256(pdf_path):
                raise SystemExit(f"Refusing to overwrite changed extract: {folder}")
            index.append({"id": x["id"], "titulo": x["title"], "edades_posibles": x["age"],
                          "tipo_taller": x["kind"], "competencia_id": x["competency"],
                          "tags": x["keywords"], "pdf": f"{x['id']}/ficha.pdf", "json": f"{x['id']}/ficha.json"})
            continue
        writer = PdfWriter()
        for number in pages:
            writer.add_page(reader.pages[number - 1])
        with pdf_path.open("wb") as stream:
            writer.write(stream)
        metadata = {
            "id": x["id"],
            "titulo": x["title"],
            "edad_recomendada": x["age"][0] if len(x["age"]) == 1 else None,
            "edades_posibles": x["age"],
            "fuente": {
                "pais": source["country"],
                "organizacion": source["organization"],
                "documento": source["document"],
                "edicion": source["year"],
                "url_pagina": source["source_url"],
                "url_pdf_original": source["pdf_url"],
                "paginas_pdf": pages,
                "archivo_pdf_original": str(Path("..") / "_originales" / source["filename"]),
                "sha256_pdf_original": source["sha256"],
                "archivo_pdf": "ficha.pdf",
                "sha256_pdf_extraido": sha256(pdf_path),
            },
            "cneb_peru": {
                "area": area,
                "competencia_principal_id": x["competency"],
                "competencia_principal": competency,
                "capacidades_relacionadas": capacities,
                "proposito_adaptado": x["purpose"],
                "estado": "propuesta_de_curaduria_pendiente_de_validacion_docente",
                "adaptacion_recomendada": x["mediation"],
                "referencia": "KB operativa v4.1; no es una homologación curricular oficial de la fuente extranjera",
            },
            "tipo_material": "taller_extraido",
            "tipo_taller": x["kind"],
            "tags": x["keywords"],
            "contenido_ficha": {
                "descripcion": x["description"],
                "acciones_del_nino": x["actions"],
                "elementos_presentes": ["páginas originales extraídas sin alterar", f"páginas fuente: {', '.join(map(str, pages))}"],
                "materiales_adicionales": x["materials"],
            },
            "taller": {
                "proposito": x["purpose"],
                "mediacion_docente": x["mediation"],
                "evidencia_posible_no_observada": x["evidence"],
                "nota_de_uso": x["note"],
            },
            "analisis_fuente": {
                "fuente_utilizada": "pdf_texto_y_revision_visual",
                "confianza": "media",
                "motivo": "Segmentación editorial y alineación CNEB requieren revisión docente; no se ha probado con un grupo real.",
            },
            "derechos": {
                "declaracion_fuente": source["rights"],
                "estado_publicacion": "solo_revision_local_no_publicar",
            },
        }
        json_path.write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        index.append({"id": x["id"], "titulo": x["title"], "edades_posibles": x["age"],
                      "tipo_taller": x["kind"], "competencia_id": x["competency"],
                      "tags": x["keywords"], "pdf": f"{x['id']}/ficha.pdf", "json": f"{x['id']}/ficha.json"})

    selected_pages = {key: set() for key in SOURCES}
    for x in ITEMS:
        selected_pages[x["source"]].update(x["pages"])
    report = {
        "estado": "curaduria_local_pendiente_de_derechos_y_revision_docente",
        "pdf_originales": len(SOURCES),
        "talleres_extraidos": len(index),
        "paginas_por_fuente": {key: len(reader.pages) for key, reader in readers.items()},
        "paginas_extraidas_unicas_por_fuente": {key: sorted(selected_pages[key]) for key in SOURCES},
        "paginas_no_extraidas_por_fuente": {
            key: [number for number in range(1, len(readers[key].pages) + 1) if number not in selected_pages[key]]
            for key in SOURCES
        },
        "nota": "No se procesaron todas las páginas: portadas, créditos, hojas decorativas y actividades no seleccionadas permanecen en los originales. Los extractos no están publicados en la app ni se han agregado a las 389 fichas existentes.",
        "fichas": index,
    }
    (root / "_indice_busqueda.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Cataloged {len(index)} workshop PDF+JSON pairs at {root}")


if __name__ == "__main__":
    main()
