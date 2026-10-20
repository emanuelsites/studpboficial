import {createRequire} from 'node:module';
const {build}=createRequire(import.meta.resolve('wrangler'))('esbuild');
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const sql=fs.readFileSync('drizzle/0000_sleepy_wolfsbane.sql','utf8');
const sqlite=new DatabaseSync(':memory:');sqlite.exec(sql);
class Statement{constructor(sql,values=[]){this.sql=sql;this.values=values}bind(...v){return new Statement(this.sql,v)}async first(){return sqlite.prepare(this.sql).get(...this.values)||null}async all(){return {results:sqlite.prepare(this.sql).all(...this.values)}}async run(){const r=sqlite.prepare(this.sql).run(...this.values);return {meta:{changes:Number(r.changes)}}}}
const DB={prepare:s=>new Statement(s),batch:async ss=>{sqlite.exec('BEGIN');try{let out=[];for(const s of ss)out.push(await s.run());sqlite.exec('COMMIT');return out}catch(e){sqlite.exec('ROLLBACK');throw e}}};
globalThis.TEST_ENV={DB,ADMIN_EMAILS:'owner@example.test'};globalThis.TEST_USER=null;
await build({entryPoints:['lib/server.ts'],bundle:true,platform:'node',format:'esm',outfile:'tests/.server-test.mjs',plugins:[{name:'test-runtime',setup(b){b.onResolve({filter:/^cloudflare:workers$/},()=>({path:'env',namespace:'test'}));b.onResolve({filter:/app\/chatgpt-auth$/},()=>({path:'auth',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},args=>({contents:args.path==='env'?'export const env=globalThis.TEST_ENV;':'export async function getChatGPTUser(){return globalThis.TEST_USER} export const chatGPTSignInPath=p=>"/signin-with-chatgpt?return_to="+encodeURIComponent(p);'}))}}]});
const {handle}=await import('./.server-test.mjs?'+Date.now());
const get=async path=>handle(new Request('https://stud.test'+path));
const post=async(path,data,origin='https://stud.test')=>handle(new Request('https://stud.test'+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(data)}));
const seed=JSON.parse(fs.readFileSync('lib/content/seed.json','utf8'));
assert.equal((await get('/api/admin')).status,401);assert.equal((await get('/admin/pedigree/wp-2750/')).status,401);assert.equal((await get('/admin/')).status,401);
assert.equal(sqlite.prepare('SELECT count(*) n FROM entries').get().n,seed.entries.length);assert.equal(sqlite.prepare('SELECT count(*) n FROM source_records').get().n,408);
for(const path of ['/','/eguas/','/eguas/pb-esporte/','/eguas/pb-matriz/','/eguas/pb-futuras/','/potros/','/embrioes/congelados/','/gestacoes/','/noticias/','/nossa-historia/','/contato/']){const r=await get(path);assert.equal(r.status,200,path);const body=await r.text();assert(body.includes('Bem-vindo ao Stud PB'));assert(body.includes('/style.css'))}
assert.equal((await get('/matrizes/balance-z/')).status,301);assert.equal((await get('/eguas/inexistente/')).status,404);
for(const e of seed.entries){const path=e.kind==='animal'?'/animais/':e.kind==='crossing'?'/cruzamentos/':e.kind==='article'?'/noticias/':'/';assert.equal((await get(path+e.slug+'/')).status,200,e.slug)}
const home=await(await get('/')).text();const match=home.match(/window.STUD_DATA=([\s\S]+?)<\/script>/);assert(match);const data=JSON.parse(match[1]);assert(data.products.length>30);assert(data.products.some(p=>p.mother==='Balance Z'&&p.father==='Chacco Blue'));assert(home.includes('id="inquiry-email"'));assert(home.includes('id="inquiry-consent"'));
// Execute real home script with DOM stubs to cover data-driven boot and all product modals.
const elements=new Map();const el=id=>{if(!elements.has(id))elements.set(id,{innerHTML:'',hidden:false,value:'',textContent:'',dataset:{},setAttribute(){},getAttribute(){return 'false'},addEventListener(){},insertAdjacentHTML(_pos,s){this.innerHTML+=s},showModal(){this.open=true},close(){this.open=false},classList:{add(){},remove(){},toggle(){}},scrollIntoView(){},focus(){}});return elements.get(id)};
const doc={querySelector:el,querySelectorAll:()=>[],addEventListener(){}};const context={document:doc,window:{STUD_DATA:data,location:{search:''},addEventListener(){}},matchMedia:()=>({matches:true}),URLSearchParams,navigator:{},console};vm.createContext(context);vm.runInContext(fs.readFileSync('public/app.js','utf8'),context);for(const p of data.products)vm.runInContext('openDetail('+JSON.stringify(p.id)+')',context);assert(el('#detail-body').innerHTML.includes('Abrir ficha completa'));
globalThis.TEST_USER={userId:'outsider',email:'other@example.test',displayName:'Other'};assert.equal((await get('/api/admin')).status,401);
globalThis.TEST_USER={userId:'owner-site-id',email:'owner@example.test',displayName:'Owner'};
let r=await get('/api/admin');assert.equal(r.status,200);const panel=await r.json();assert.equal(panel.user.role,'admin');let e=panel.entries.find(x=>x.title==='Balou Blue PB');
assert.equal((await post('/api/entries',e,'https://foreign.test')).status,403);
let invalid=structuredClone(e);invalid.image='javascript:alert(1)';assert.equal((await post('/api/entries',invalid)).status,400);
e.title='Balou Blue PB';e.pedigree.mother.name='Mãe editada';r=await post('/api/entries',e);assert.equal(r.status,200);const saved=await r.json();assert.equal(saved.version,2);assert.equal((await post('/api/entries',e)).status,409);
const updated=await(await get('/animais/balou-blue-pb/')).text();assert(updated.includes('Mãe editada'));
const likaPage=await(await get('/animais/lika-jt/')).text();const likaTree=JSON.parse(likaPage.match(/<script id="pedigree-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);assert.equal(likaTree.order,'paternal-first');assert.equal(likaTree.record.father.name,'MSC Willen (Willem)');assert.equal(likaTree.record.mother.name,'Estrela Dalva JT');assert.equal(likaTree.record.father.father.name,'Indoctro NO WFFS');assert.equal(likaTree.record.mother.mother.name,'Fuca Branca xx');assert.equal(likaTree.record.mother.mother.mother.name,'Grassiness xx');assert(likaPage.includes('1692376-lika-jt-pb'));
const pairHTML=vm.runInContext('parentPair(products.find(p=>p.type==="embriao"))',context);assert(pairHTML.indexOf('PAI ')<pairHTML.indexOf('MÃE '));
const modalHTML=el('#detail-body').innerHTML;assert(modalHTML.indexOf('Pai ♂')<modalHTML.indexOf('Mãe ♀'));
assert.equal((await post('/api/settings',{pedigree_order:'maternal-first'})).status,400);
await post('/api/settings',{pedigree_order:'paternal-first'});assert((await(await get('/animais/balance-z/')).text()).includes('"order":"paternal-first"'));
const editor=await(await get('/admin/pedigree/'+e.id+'/')).text();assert(editor.includes('Salvar no site'));assert(editor.includes('/api/entries'));assert(editor.includes('Baixar PDF'));assert(!editor.includes('try{const saved=JSON.parse(localStorage.getItem(key))'));
for(const script of editor.matchAll(/<script>([\s\S]*?)<\/script>/g))new vm.Script(script[1]);
const editorContext={document:{getElementById:el,querySelectorAll:()=>[]},structuredClone,atob,Uint8Array,Date,console};vm.createContext(editorContext);
const editorScript=[...editor.matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];vm.runInContext(editorScript,editorContext);
assert(el('branches').innerHTML.indexOf('Linha paterna')<el('branches').innerHTML.indexOf('Linha materna'));
for(const format of ['screen','mobile']){const scene=vm.runInContext('scene('+JSON.stringify(format)+')',editorContext);const labels=scene.p.filter(x=>x.t==='text').map(x=>x.s);assert(labels.indexOf('Chacco Blue')<labels.indexOf('Mãe editada'));assert(labels.includes('3 gerações  |  Linhagem paterna primeiro'));const pdf=vm.runInContext('pdf(scene('+JSON.stringify(format)+'))',editorContext);assert(Buffer.from(pdf).toString('latin1').startsWith('%PDF-1.4'));}

await post('/api/members',{email:'editor@example.test',role:'editor',active:1});
globalThis.TEST_USER={userId:'editor-site-id',email:'editor@example.test',displayName:'Editor'};assert.equal((await get('/api/admin')).status,200);assert.equal((await post('/api/settings',{welcome:'Unauthorized'})).status,403);assert.equal((await get('/api/export.sql')).status,403);
globalThis.TEST_USER=null;assert.equal((await post('/api/inquiries',{name:'Test',email:'test@example.test',phone:'',interest:'Embriões',message:'Consulta de teste',consent:false})).status,400);
for(let n=0;n<5;n++)assert.equal((await post('/api/inquiries',{name:'Test',email:'test@example.test',phone:'',interest:'Embriões',message:'Consulta de teste',consent:true})).status,200);
assert.equal((await post('/api/inquiries',{name:'Test',email:'test@example.test',phone:'',interest:'Embriões',message:'Consulta de teste',consent:true})).status,429);
globalThis.TEST_USER={userId:'owner-site-id',email:'owner@example.test',displayName:'Owner'};const exported=await(await get('/api/export.sql')).text();const restored=new DatabaseSync(':memory:');restored.exec(exported);assert.equal(restored.prepare('SELECT count(*) n FROM entries').get().n,seed.entries.length);assert.equal(restored.prepare('SELECT count(*) n FROM inquiries').get().n,5);
// Exercise the one-time repair against an already initialized database, not only a new seed.
const oldLika=sqlite.prepare("SELECT * FROM entries WHERE id='wp-1575'").get();
const oldInfo=JSON.parse(oldLika.info);oldInfo.father='Willem';
sqlite.prepare("UPDATE entries SET info=?,pedigree=? WHERE id='wp-1575'").run(JSON.stringify(oldInfo),JSON.stringify({name:'Lika JT',sex:'female',father:{name:'Balou du Rouet',sex:'male'},mother:{name:'Daphne',sex:'female'}}));
sqlite.exec("DELETE FROM settings WHERE key='initialized_paternal_convention_v1'; UPDATE settings SET value='maternal-first' WHERE key='pedigree_order';");
assert.equal((await get('/animais/lika-jt/')).status,200);
const fixedLika=sqlite.prepare("SELECT * FROM entries WHERE id='wp-1575'").get();assert.equal(JSON.parse(fixedLika.pedigree).father.name,'MSC Willen (Willem)');
assert.equal(sqlite.prepare("SELECT value FROM settings WHERE key='pedigree_order'").get().value,'paternal-first');
for(const row of sqlite.prepare("SELECT title,info FROM entries WHERE kind='crossing'").all()){const info=JSON.parse(row.info);assert.equal(row.title,info.father+' × '+info.mother);assert.equal(info.genetics,row.title)}
await get('/animais/lika-jt/');assert.equal(sqlite.prepare("SELECT version FROM entries WHERE id='wp-1575'").get().version,fixedLika.version);
// Audit coverage, exact corrected ancestry, maternal embryo trees and safe live-data repair.
const audit=JSON.parse(fs.readFileSync('migration/genealogy-audit-2026-10-19.json','utf8'));
assert.equal(audit.animals.length,31);assert.equal(new Set(audit.animals.map(x=>x.id)).size,31);
for(const report of audit.animals){const entry=seed.entries.find(e=>e.id===report.id);assert(entry.info.pedigreeReviewedAt);const html=await(await get('/animais/'+entry.slug+'/')).text();assert(html.includes('pedigree-source'));assert(html.includes('paternal-first'));}
const caramel=seed.entries.find(e=>e.id==='wp-1504');assert.equal(caramel.info.maternalGrandfather,'Contact van de Heffinck');assert.equal(caramel.pedigree.father.father.name,'Cassini I');assert.equal(caramel.pedigree.mother.mother.name,'Only Picobello Z');
const unica=seed.entries.find(e=>e.id==='wp-391');assert.equal(unica.pedigree.mother.father.name,'El Barone 111 Z');assert.equal(unica.pedigree.mother.mother.name,'Eyla R');
for(const frozen of seed.entries.filter(e=>e.categories.includes('congelados'))){const html=await(await get('/cruzamentos/'+frozen.slug+'/')).text();const tree=JSON.parse(html.match(/<script id="pedigree-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);assert.equal(tree.record.name,frozen.info.mother);assert.notEqual(tree.record.father.name,frozen.info.father);assert(html.includes('A genética da mãe.'));}
assert((await(await get('/animais/hph-wind-tok/')).text()).includes('Hippomundo 2017; HorseTelex 2016'));
assert((await(await get('/animais/balou-blue-pb/')).text()).includes('nova conferência pendente'));
// Mimic deployment over the previous database while preserving media, commerce and inquiries.
const legacySeed=JSON.parse(fs.readFileSync('tests/fixtures/pre-audit-caramel.json','utf8'));
sqlite.prepare('UPDATE entries SET info=?,pedigree=?,image=?,body=? WHERE id=?').run(JSON.stringify({...legacySeed.info,availability:'sold'}),JSON.stringify(legacySeed.pedigree),'/assets/preserved-editor-photo.png','Texto editorial preservado','wp-1504');
sqlite.exec("DELETE FROM settings WHERE key='initialized_genealogy_audit_20261019_v1'");
await get('/animais/'+caramel.slug+'/');const repaired=sqlite.prepare("SELECT * FROM entries WHERE id='wp-1504'").get();
assert.equal(JSON.parse(repaired.info).maternalGrandfather,'Contact van de Heffinck');assert.equal(JSON.parse(repaired.pedigree).mother.mother.name,'Only Picobello Z');assert.equal(repaired.image,'/assets/preserved-editor-photo.png');assert.equal(repaired.body,'Texto editorial preservado');assert.equal(JSON.parse(repaired.info).availability,'sold');assert.equal(sqlite.prepare('SELECT count(*) n FROM inquiries').get().n,5);
await get('/animais/'+caramel.slug+'/');assert.equal(sqlite.prepare("SELECT version FROM entries WHERE id='wp-1504'").get().version,repaired.version);
console.log('PASS: all content pages, categories, home product interactions, isolated admin/pedigree, role checks, CSRF, validation, concurrency, public pedigree persistence/order, contact consent/rate limit, SQL export and restore.');
