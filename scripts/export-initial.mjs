import fs from 'node:fs';
const seed=JSON.parse(fs.readFileSync('lib/content/seed.json','utf8'));
const schema=fs.readFileSync('drizzle/0000_sleepy_wolfsbane.sql','utf8').replaceAll('--> statement-breakpoint','');
const quote=v=>v===null?'NULL':typeof v==='number'?String(v):"'"+String(v).replaceAll("'","''")+"'";
const insert=(table,row)=>`INSERT INTO "${table}" (${Object.keys(row).map(k=>'"'+k+'"').join(',')}) VALUES (${Object.values(row).map(quote).join(',')});`;
let sql='-- STUD PB • banco inicial do sistema redesenhado\n-- SQLite / Cloudflare D1. Não é um dump do servidor WordPress.\n-- Dados públicos importados em 19/10/2026. Importar em banco vazio.\n'+schema+'\n';
for(const e of seed.entries){const row={...e};for(const k of ['gallery','info','pedigree','categories'])row[k]=JSON.stringify(row[k]);sql+=insert('entries',row)+'\n'}
for(const [key,value] of Object.entries({...seed.settings,initialized_v1:'1',initialized_gallery_assets_v1:'1',initialized_paternal_convention_v1:'1',initialized_genealogy_audit_20261019_v1:'1'}))sql+=insert('settings',{key,value})+'\n';
for(const row of seed.source_records)sql+=insert('source_records',row)+'\n';
fs.mkdirSync('database',{recursive:true});fs.writeFileSync('database/studpb.sql',sql);fs.writeFileSync('database/schema.sql',schema);
console.log(`Exported ${seed.entries.length} content entries and ${seed.source_records.length} public source records.`);
