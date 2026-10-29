"""Render isolated QA fixtures with the packaged DOCX renderer, then inspect PDF bounds."""
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
import json
import hashlib
import os
import subprocess
import sys

import pdfplumber
from PIL import Image, ImageOps, ImageDraw

root = Path.cwd()
source = root / os.environ.get('AYNI_GENERATOR_TEMPLATE_QA_OUTPUT', 'output/generador-documentos/revision-plantillas')
renderer = Path(os.environ.get('AYNI_DOCX_RENDERER', 'C:/Users/ASUS/.codex/plugins/cache/openai-primary-runtime/documents/26.1020.11348/skills/documents/render_docx.py'))
converter = root / '.local/tools/libreoffice/extracted/program'
os.environ['PATH'] = str(converter) + os.pathsep + os.environ['PATH']
short_render_root = os.environ.get('AYNI_QA_SHORT_RENDER_ROOT')
render_root = root / short_render_root if short_render_root else source / 'renders'
render_root.mkdir(parents=True, exist_ok=True)

def render(document):
    target = render_root / (hashlib.sha256(document.name.encode('utf-8')).hexdigest()[:12] if short_render_root else document.stem)
    result = subprocess.run([sys.executable, str(renderer), str(document), '--output_dir', str(target), '--emit_pdf', '--dpi', '110'],
        capture_output=True, text=True, timeout=150, creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0)
    target.mkdir(exist_ok=True)
    (target / 'renderer.log').write_text(result.stdout + '\n' + result.stderr, encoding='utf-8')
    if result.returncode:
        return {'name': document.name, 'error': result.stderr[-1500:]}
    pages = []
    with pdfplumber.open(target / (document.stem + '.pdf')) as pdf:
        for i, page in enumerate(pdf.pages):
            words = page.extract_words()
            outside = [word['text'] for word in words if word['x0'] < -1 or word['top'] < -1 or word['x1'] > page.width + 1 or word['bottom'] > page.height + 1]
            pages.append({'page': i + 1, 'words': len(words), 'outside': outside, 'text': page.extract_text()})
    if any(not (target / f"page-{page['page']}.png").exists() for page in pages):
        return {'name': document.name, 'error': 'El renderizador no produjo todas las imágenes de página; comprobar longitud de rutas.'}
    return {'name': document.name, 'pages': pages, **({'renderDirectory': str(target.resolve())} if short_render_root else {})}

requested=set(sys.argv[1:])
documents=[document for document in sorted(source.glob('*.docx')) if not requested or document.name in requested]
results = []
with ThreadPoolExecutor(max_workers=2) as pool:
    for future in as_completed([pool.submit(render, document) for document in documents]):
        result = future.result()
        results.append(result)
        print(json.dumps({'name': result['name'], 'pages': len(result.get('pages', [])), 'error': result.get('error')}), flush=True)

if requested and (source / 'render-audit.json').exists():
    previous=json.loads((source / 'render-audit.json').read_text(encoding='utf-8'))
    results += [item for item in previous if item['name'] not in requested]
results.sort(key=lambda item: item['name'])
(source / 'render-audit.json').write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8')
tiles = []
for result in results:
    for page in result.get('pages', []):
        name = result['name']
        page_root = Path(result['renderDirectory']) if result.get('renderDirectory') else source / 'renders' / Path(name).stem
        image = Image.open(page_root / f"page-{page['page']}.png").convert('RGB')
        tile = Image.new('RGB', (360, 540), '#dce3eb')
        fitted = ImageOps.contain(image, (350, 505))
        tile.paste(fitted, ((360 - fitted.width) // 2, 26))
        ImageDraw.Draw(tile).text((5, 5), f"{name} / {page['page']}", fill='black')
        tiles.append(tile)
for start in range(0, len(tiles), 9):
    sheet = Image.new('RGB', (1080, 1620), 'white')
    for index, tile in enumerate(tiles[start:start+9]):
        sheet.paste(tile, ((index % 3) * 360, (index // 3) * 540))
    sheet.save(source / f'contact-{start//9+1:02}.png')
if any('error' in item or any(page['outside'] for page in item.get('pages', [])) for item in results):
    sys.exit(1)
