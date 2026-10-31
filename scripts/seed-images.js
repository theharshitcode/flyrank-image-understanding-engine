const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const pool = require('../src/db/pool');
const env = require('../src/config/env');
const { enqueue } = require('../src/services/jobService');

const categories = [
  { title:'Category:Red foxes', subject:'red fox', category:'animal' },
  { title:'Category:Gray wolves', subject:'gray wolf', category:'animal' },
  { title:'Category:Domestic dogs', subject:'domestic dog', category:'animal' },
  { title:'Category:Brown bears', subject:'brown bear', category:'animal' },
  { title:'Category:Deer', subject:'deer', category:'animal' },
  { title:'Category:Strawberries', subject:'strawberry', category:'food' },
  { title:'Category:Sports cars', subject:'sports car', category:'vehicle' },
  { title:'Category:Mountains', subject:'mountain', category:'nature' }
];

async function getFiles(category) {
  const url = new URL('https://commons.wikimedia.org/w/api.php');
  Object.entries({ action:'query', generator:'categorymembers', gcmtitle:category.title, gcmtype:'file', gcmlimit:'10', prop:'imageinfo', iiprop:'url|extmetadata', iiurlwidth:'1200', format:'json', origin:'*' }).forEach(([k,v])=>url.searchParams.set(k,v));
  const response = await fetch(url, { headers:{ 'User-Agent':'FlyRankCapstone/1.0 (educational project)' } });
  if (!response.ok) throw new Error(`Wikimedia API ${response.status} for ${category.title}`);
  const json = await response.json();
  return Object.values(json.query?.pages || {}).map(page=>({ title:page.title, ...(page.imageinfo?.[0] || {}) })).filter(x=>x.url && /^image\/(jpeg|png|webp)/i.test(x.mime||''));
}

(async()=>{
  const attribution=[];
  await fs.mkdir(env.imageStorageDir,{recursive:true});
  for (const category of categories) {
    let files=[];
    try { files=await getFiles(category); } catch(error) { console.warn(`Skipping ${category.title}: ${error.message}`); continue; }
    let added=0;
    for (const file of files) {
      if (added>=5) break;
      try {
        const existing=await pool.query('SELECT id FROM images WHERE original_url=$1',[file.url]);
        if (existing.rows.length) continue;
        const response=await fetch(file.url,{headers:{'User-Agent':'FlyRankCapstone/1.0 (educational project)'}});
        if(!response.ok) continue;
        const bytes=Buffer.from(await response.arrayBuffer());
        if(!bytes.length || bytes.length>env.maxImageBytes) continue;
        const mime=file.mime==='image/png'?'image/png':file.mime==='image/webp'?'image/webp':'image/jpeg';
        const ext=mime==='image/png'?'.png':mime==='image/webp'?'.webp':'.jpg';
        const filename=`${crypto.randomUUID()}${ext}`;
        const storagePath=path.join(env.imageStorageDir,filename);
        await fs.writeFile(storagePath,bytes,{flag:'wx'});
        const {rows}=await pool.query(`INSERT INTO images(filename,original_url,storage_path,mime_type,byte_size) VALUES($1,$2,$3,$4,$5) RETURNING id`,[file.title,file.url,storagePath,mime,bytes.length]);
        await enqueue('process_image',{imageId:rows[0].id});
        const meta=file.extmetadata||{};
        attribution.push({image_id:rows[0].id,commons_file:file.title,source_url:file.descriptionurl||file.url,original_url:file.url,license:meta.LicenseShortName?.value||'Check source page',artist:meta.Artist?.value||'See source page',subject:category.subject,category:category.category});
        added++;
      } catch(error) { console.warn(`Could not import ${file.title}: ${error.message}`); }
    }
    console.log(`${category.title}: queued ${added} images`);
  }
  await fs.writeFile(path.join(__dirname,'../data/source-attribution.json'),JSON.stringify(attribution,null,2));
  console.log(`Queued ${attribution.length} images. Review data/source-attribution.json and verify each image's actual subject and license before submission.`);
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>pool.end());
