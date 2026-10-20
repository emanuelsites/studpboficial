import seed from './content/seed.json';
import genealogyUpdates from './content/genealogy-audit-updates.json';
export type Entry={id:string;slug:string;kind:string;title:string;body:string;image:string;gallery:string[];info:Record<string,any>;pedigree:any;categories:string[];status:string;source_url:string;published_at:string;updated_at:string;version:number};
export const initial=seed;
export const isEditorialImage=(url:string)=>!/(?:c66cf9b382e738721d|gototopbtn)/i.test(url);
export const entryColumns=['id','slug','kind','title','body','image','gallery','info','pedigree','categories','status','source_url','published_at','updated_at','version'];
export function entryValues(e:Entry){return entryColumns.map(k=>['gallery','info','pedigree','categories'].includes(k)?JSON.stringify(e[k as keyof Entry]):e[k as keyof Entry]);}
export function decodeEntry(r:any):Entry{const e={...r};for(const k of ['gallery','info','pedigree','categories']){try{e[k]=JSON.parse(e[k]);}catch{e[k]=k==='gallery'||k==='categories'?[]:{}}}if(Array.isArray(e.gallery))e.gallery=e.gallery.filter(isEditorialImage);return e;}
export async function initialize(db:D1Database){
 if(!await db.prepare("SELECT value FROM settings WHERE key='initialized_paternal_convention_v1'").first()){
  const updates:D1PreparedStatement[]=[];
  const rows=await db.prepare("SELECT id,title,info,pedigree FROM entries WHERE kind='crossing' OR id='wp-1575'").all<{id:string;title:string;info:string;pedigree:string}>();
  for(const row of rows.results){
   const info=JSON.parse(row.info),pedigree=JSON.parse(row.pedigree);
   if(row.id==='wp-1575'){
    const verified=seed.entries.find(e=>e.id==='wp-1575')!;
    updates.push(db.prepare('UPDATE entries SET info=?,pedigree=?,body=?,updated_at=?,version=version+1 WHERE id=?').bind(JSON.stringify({...info,...verified.info}),JSON.stringify(verified.pedigree),verified.body,verified.updated_at,row.id));
   }else if(info.father&&info.mother){
    const title=info.father+' × '+info.mother;
    if(info.genetics&&!info.legacyGenetics)info.legacyGenetics=info.genetics;info.genetics=title;
    updates.push(db.prepare('UPDATE entries SET title=?,pedigree=?,info=?,version=version+1 WHERE id=?').bind(title,JSON.stringify({...pedigree,name:title}),JSON.stringify(info),row.id));
   }
  }
  updates.push(db.prepare("INSERT INTO settings (key,value) VALUES ('pedigree_order','paternal-first') ON CONFLICT(key) DO UPDATE SET value=excluded.value"));
  updates.push(db.prepare("INSERT OR IGNORE INTO settings (key,value) VALUES ('initialized_paternal_convention_v1','1')"));
  await db.batch(updates);
 }

 // Data repair outside schema migrations; preserve editorial changes and original-source archive.
 if(!await db.prepare("SELECT value FROM settings WHERE key='initialized_gallery_assets_v1'").first()){
  const rows=await db.prepare("SELECT id,gallery FROM entries WHERE gallery LIKE '%c66cf9b382e738721d%' OR lower(gallery) LIKE '%gototopbtn%'").all<{id:string;gallery:string}>();
  const updates=rows.results.map(row=>db.prepare('UPDATE entries SET gallery=? WHERE id=? AND gallery=?').bind(JSON.stringify(JSON.parse(row.gallery).filter(isEditorialImage)),row.id,row.gallery));
  updates.push(db.prepare("INSERT OR IGNORE INTO settings (key,value) VALUES ('initialized_gallery_assets_v1','1')"));
  await db.batch(updates);
 }

 // One-time public-source audit. Patch genealogy only; keep photos, availability,
 // contact records, access settings and later editorial changes on future boots.
 if(!await db.prepare("SELECT value FROM settings WHERE key='initialized_genealogy_audit_20261019_v1'").first()){
  const updates:D1PreparedStatement[]=[];
  for(const patch of genealogyUpdates as any[]){
   const current=await db.prepare('SELECT info,body,title,pedigree FROM entries WHERE id=?').bind(patch.id).first<any>();
   if(!current)continue;
   const info={...JSON.parse(current.info),...(patch.info||{})};
   updates.push(db.prepare('UPDATE entries SET info=?,body=?,title=?,pedigree=?,updated_at=?,version=version+1 WHERE id=?').bind(JSON.stringify(info),patch.body??current.body,patch.title??current.title,patch.pedigree?JSON.stringify(patch.pedigree):current.pedigree,'2026-10-19T17:30:00Z',patch.id));
  }
  updates.push(db.prepare("INSERT OR IGNORE INTO settings (key,value) VALUES ('initialized_genealogy_audit_20261019_v1','1')"));
  await db.batch(updates);
 }
 if(await db.prepare("SELECT value FROM settings WHERE key='initialized_v1'").first())return;
 const statements:D1PreparedStatement[]=[];
 for(const e of seed.entries)statements.push(db.prepare(`INSERT OR IGNORE INTO entries (${entryColumns.join(',')}) VALUES (${entryColumns.map(()=>'?').join(',')})`).bind(...entryValues(e as Entry)));
 for(const [k,v] of Object.entries(seed.settings))statements.push(db.prepare('INSERT OR IGNORE INTO settings (key,value) VALUES (?,?)').bind(k,v));
 // Chunk immutable public-source archive before setting the final content marker.
 for(let i=0;i<seed.source_records.length;i+=50){await db.batch(seed.source_records.slice(i,i+50).map(x=>db.prepare('INSERT OR IGNORE INTO source_records (id,type,url,payload) VALUES (?,?,?,?)').bind(x.id,x.type,x.url,x.payload)));}
 statements.push(db.prepare("INSERT OR IGNORE INTO settings (key,value) VALUES ('initialized_v1','1')"));
 await db.batch(statements);
}
export async function listEntries(db:D1Database,all=false){const r=await db.prepare('SELECT * FROM entries'+(all?'':" WHERE status='published'")+' ORDER BY published_at DESC,title').all();return r.results.map(decodeEntry);}
export async function readSettings(db:D1Database){const r=await db.prepare('SELECT key,value FROM settings').all<{key:string;value:string}>();return Object.fromEntries(r.results.filter(x=>!x.key.startsWith('initialized')).map(x=>[x.key,x.value]));}
export function validateEntry(input:any):Entry{
 if(!input||typeof input!=='object')throw Error('Cadastro inválido.');
 const e={...input};
 for(const k of ['title','slug','kind','body','image','status'])if(typeof e[k]!=='string')throw Error('Preencha os dados do cadastro.');
 if(e.title.length<1||e.title.length>180||!/^[-a-z0-9]{1,180}$/.test(e.slug)||e.body.length>80000)throw Error('Nome, endereço ou texto inválido.');
 if(!['animal','crossing','article','page'].includes(e.kind)||!['published','draft','archived'].includes(e.status))throw Error('Tipo ou situação inválida.');
 const safeImage=(s:any)=>typeof s==='string'&&s.length<2000&&(s===''||s.startsWith('/assets/')||s.startsWith('/media/')||/^https:\/\/[^\s<>"']+$/.test(s));
 if(!safeImage(e.image)||!Array.isArray(e.gallery)||e.gallery.length>20||!e.gallery.every(safeImage))throw Error('Imagem inválida.');
 e.gallery=e.gallery.filter(isEditorialImage);
 if(!Array.isArray(e.categories)||!e.categories.every((v:any)=>['esporte','matriz','futuras','potros','congelados','gestacoes'].includes(v)))throw Error('Categoria inválida.');
 if(!e.info||typeof e.info!=='object'||Array.isArray(e.info)||JSON.stringify(e.info).length>15000)throw Error('Ficha técnica inválida.');
 const walk=(n:any,d=0):boolean=>n===null||n===undefined||(d<=3&&typeof n==='object'&&typeof n.name==='string'&&n.name.length<=180&&['male','female','unknown'].includes(n.sex)&&walk(n.mother,d+1)&&walk(n.father,d+1));
 if(!walk(e.pedigree))throw Error('Pedigree inválido: até três gerações.');
 if(e.kind==='crossing'&&e.info.father&&e.info.mother){e.title=e.info.father+' × '+e.info.mother;e.info.genetics=e.title;e.pedigree={...e.pedigree,name:e.title};}
 if(e.kind==='animal'){
 e.pedigree={...e.pedigree,name:e.title};
 e.info.mother=e.pedigree?.mother?.name||'';e.info.father=e.pedigree?.father?.name||'';
 }
 if(!Number.isInteger(e.version)||e.version<0)throw Error('Versão inválida. Reabra a ficha.');
 return e;
}
export function sqlQuote(v:any){if(v===null||v===undefined)return 'NULL';if(typeof v==='number')return String(v);return "'"+String(v).replaceAll("'","''")+"'";}
export function insertSQL(table:string,row:Record<string,any>){return `INSERT INTO "${table}" (${Object.keys(row).map(k=>'"'+k+'"').join(',')}) VALUES (${Object.values(row).map(sqlQuote).join(',')});`;}
