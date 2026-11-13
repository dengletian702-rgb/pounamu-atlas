// Keep HTML references in sync with the actual JS and CSS bytes.
// Usage: node scripts/version-assets.mjs [--check]
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=dirname(dirname(fileURLToPath(import.meta.url)));
const sites=['docs','outputs/site'];
// The v4 scripts and every page are versioned too, so a returning visitor never mixes old and new code (walk-through H-16).
const assets=['app.js','v3.js','route-maps.js','p10-planner.js','planner-adapter.js','styles.css','v3.css','p10-planner.css','v4-guide.js','v4-maps.js','v4-match.js','v4-guide.css','ui-v2.css','ui-v2.js'];
const pages=['index.html','routes.html','route.html','prepare.html','plan.html','tracks.html','cities.html','city.html','destination.html','guide.html'];
const pattern=new RegExp('\\b(src|href)="('+assets.map(a=>a.replace(/[.]/g,'\\.')).join('|')+')(?:\\?[^"#]*)?"','g');
const check=process.argv.includes('--check');let errors=[];const hashed={};
for(const site of sites){
 const hashes={};for(const name of assets){const bytes=await readFile(join(root,site,name));hashes[name]=createHash('sha256').update(bytes).digest('hex').slice(0,12);}
 hashed[site]=hashes;
 for(const page of pages){
  const file=join(root,site,page),original=await readFile(file,'utf8');
  const updated=original.replace(pattern,(_,attr,name)=>`${attr}="${name}?v=${hashes[name]}"`);
  if(check&&original!==updated)errors.push(`${site}/${page}: outdated asset version`);
  if(!check&&original!==updated)await writeFile(file,updated);
 }
}
for(const name of assets)if(hashed.docs[name]!==hashed['outputs/site'][name])errors.push(`${name}: site copies differ`);
for(const page of pages){const a=await readFile(join(root,'docs',page));const b=await readFile(join(root,'outputs/site',page));if(!a.equals(b))errors.push(`${page}: site copies differ`);}
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}else console.log(`${check?'Verified':'Updated'} asset versions and matching site copies.`);
