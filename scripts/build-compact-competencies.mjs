import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {competencyVisuals} from '../src/lib/competency-visuals.mjs';
await mkdir('public/competencies/compact',{recursive:true});
for(const [id,palette] of Object.entries(competencyVisuals)){
  const original=await readFile(`public/competencies/${id.toLowerCase()}.svg`,'utf8');
  const icon=original.slice(original.indexOf('<svg ',1),original.lastIndexOf('</svg>'));
  if(!icon.includes('viewBox="0 0 24 24"'))throw Error('Unexpected competency icon '+id);
  const generated=icon.replace(/width="32" height="32"/,'width="24" height="24"')
    .replace(/stroke="#[0-9a-f]+"/i,`stroke="${palette.foreground}"`)
    .replace(/ x="16" y="16"/,'').replace(/ class="[^"]*"/,'').replace(' aria-hidden="true"','').replaceAll('currentColor',palette.foreground);
  await writeFile(`public/competencies/compact/${id.toLowerCase()}.svg`,generated+'\n');
}
console.log('14 compact competency images generated from the existing vector icon set.');
