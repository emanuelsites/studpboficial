import {env} from 'cloudflare:workers';
import {getChatGPTUser,chatGPTSignInPath} from '../app/chatgpt-auth';
import {initial,initialize,listEntries,readSettings,validateEntry,entryValues,entryColumns,insertSQL,type Entry} from './store';
import * as view from './render';
import homeHTML from './content/home';
import editorHTML from './content/editor';
import schemaSQL from './content/schema';
const now=()=>new Date().toISOString();
const response=(body:string,status=200,type='text/html; charset=utf-8')=>new Response(body,{status,headers:{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','X-Frame-Options':'SAMEORIGIN'}});
const j=(data:any,status=200)=>response(JSON.stringify(data),status,'application/json; charset=utf-8');
async function authorized(db:D1Database){
 const u=await getChatGPTUser();if(!u)return null;
 let member=await db.prepare('SELECT * FROM members WHERE user_id=? AND active=1').bind(u.userId).first<any>();
 if(member)return {...u,role:member.role};
 const ownerEmails=(env.ADMIN_EMAILS||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
 if(ownerEmails.includes(u.email.toLowerCase())){
  await db.prepare("INSERT INTO members (id,email,user_id,role,active) VALUES (?,?,?,'admin',1) ON CONFLICT(email) DO UPDATE SET user_id=excluded.user_id,role='admin',active=1").bind(crypto.randomUUID(),u.email.toLowerCase(),u.userId).run();return {...u,role:'admin'};
 }
 member=await db.prepare('SELECT * FROM members WHERE lower(email)=? AND active=1 AND user_id IS NULL').bind(u.email.toLowerCase()).first<any>();
 if(!member)return null;
 await db.prepare('UPDATE members SET user_id=? WHERE id=? AND user_id IS NULL').bind(u.userId,member.id).run();return {...u,role:member.role};
}
function protectedEditor(e:Entry,order:string){
 const paths=['m','mm','mmm','mmf','mf','mfm','mff','f','fm','fmm','fmf','ff','ffm','fff'];
 const at=(path:string)=>[...path].reduce((node:any,key)=>node?.[key==='m'?'mother':'father'],e.pedigree);
 const birth=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(e.info.birth||'');
 const defaults={name:e.title,sex:e.pedigree.sex==='male'?'M':e.pedigree.sex==='female'?'F':'U',birth:birth?`${birth[3]}-${birth[2]}-${birth[1]}`:'',nodes:paths.map(id=>({id,name:at(id)?.name||'',sex:at(id)?.sex==='male'?'M':at(id)?.sex==='female'?'F':id.endsWith('f')?'M':'F'}))};
 let html=editorHTML.replace(/const defaults=\{[\s\S]*?\};\nlet data=/,'const defaults='+view.json(defaults)+';\nlet data=');
 html=html.replace("try{const saved=JSON.parse(localStorage.getItem(key));if(valid(saved))data=saved}catch{}",'');
 html=html.replace(/function persist\(\)\{[\s\S]*?render\(\)\}/,"function persist(){$('status').textContent='Alterações em edição. Clique em Salvar no site para publicar.';render()}");
 html=html.replace('<div class="tools">','<div class="tools"><button class="primary" id="saveSite">Salvar no site</button><a href="/admin/" style="padding:11px">Voltar ao painel</a>');
 html=html.replace('Seus dados ficam salvos neste navegador. Use “Salvar dados” para guardar uma cópia e abrir em outro dispositivo.','Use “Salvar no site” para gravar no banco. “Salvar dados” baixa uma cópia em JSON.');
 html=html.replace('<select id="sex">','<select id="sex"><option value="U">Não informado</option>').replace("['F','M'].includes(d.sex)","['F','M','U'].includes(d.sex)").replace("(data.sex==='F'?'Fêmea':'Macho')","(data.sex==='F'?'Fêmea':data.sex==='M'?'Macho':'Sexo não informado')");
 // Input groups follow the same sire-first convention as the preview/PDF.
 const formStart=html.indexOf('function buildForm('),formEnd=html.indexOf('function persist(',formStart);
 const form=html.slice(formStart,formEnd).replace("['m','f'].map((side,i)","['f','m'].map((side,i)").replace("i?'Linha paterna':'Linha materna'","i?'Linha materna':'Linha paterna'").replace("i?'Pai, avós e bisavós paternos':'Mãe, avós e bisavós maternos'","i?'Mãe, avós e bisavós maternos':'Pai, avós e bisavós paternos'").replace("[side,side+'m',side+'mm',side+'mf',side+'f',side+'fm',side+'ff']","[side,side+'f',side+'ff',side+'fm',side+'m',side+'mf',side+'mm']").replace("i?'Pai':'Mãe'","i?'Mãe':'Pai'").replace("j===1?'Avó':j===4?'Avô'","j===1?'Avô':j===4?'Avó'");
 html=html.slice(0,formStart)+form+html.slice(formEnd);
 if(order==='paternal-first'){
 const start=html.indexOf('function scene('),end=html.indexOf('function svg(',start);
 const scene=html.slice(start,end).replaceAll("['m','f'].forEach","['f','m'].forEach").replace("'MÃE / PAI'","'PAI / MÃE'").replace("i?'LINHA PATERNA':'LINHA MATERNA'","i?'LINHA MATERNA':'LINHA PATERNA'").replace('Linhagem materna primeiro','Linhagem paterna primeiro');
 html=html.slice(0,start)+scene+html.slice(end);html=html.replace('Linha materna primeiro. Os símbolos','Linha paterna primeiro. Os símbolos');
 }
 html=html.replace('</body>', `<script>const savedEntry=${view.json(e)};document.getElementById('saveSite').onclick=async()=>{const b=document.getElementById('saveSite');b.disabled=true;const lookup=Object.fromEntries(data.nodes.map(n=>[n.id,n]));function tree(id){const n=lookup[id];if(!n||!n.name)return null;return {name:n.name,sex:n.sex==='M'?'male':'female',mother:tree(id+'m'),father:tree(id+'f')}}savedEntry.title=data.name;savedEntry.pedigree={name:data.name,sex:data.sex==='M'?'male':data.sex==='F'?'female':'unknown',mother:tree('m'),father:tree('f')};savedEntry.info.sex=data.sex==='M'?'Macho':data.sex==='F'?'Fêmea':'Não informado';if(data.birth){const [y,m,d]=data.birth.split('-');savedEntry.info.birth=d+'/'+m+'/'+y;savedEntry.info.year=y}else{delete savedEntry.info.birth}try{const r=await fetch('/api/entries',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(savedEntry)});const out=await r.json();if(!r.ok)throw Error(out.error);savedEntry.version=out.version;document.getElementById('status').textContent='Pedigree salvo no banco e publicado na ficha do animal.'}catch(err){document.getElementById('status').textContent=err.message}finally{b.disabled=false}};</script></body>`);
 return html;
}
function home(entries:Entry[],settings:Record<string,string>){
 let html=homeHTML.replace(/<header class="header">[\s\S]*?<\/header>/,view.header(settings).replace(/^<a class="skip"[\s\S]*?<\/a>/,''));
 html=html.replace(/<footer class="footer">[\s\S]*?<\/footer>/,view.footer(settings));
 html=html.replace('<link rel="stylesheet" href="style.css">','<link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/system.css">');
 html=html.replaceAll('https://studpb.com.br/home/nossa-historia/','/nossa-historia/').replaceAll('https://studpb.com.br/home/noticias/','/noticias/').replaceAll(' target="_blank" rel="noopener">Conheça nossa história','>Conheça nossa história').replaceAll(' target="_blank" rel="noopener">Acompanhe as notícias','>Acompanhe as notícias');
 const products=entries.filter(e=>e.kind==='crossing'||e.categories.includes('potros')).map(e=>{
  const mother=entries.find(x=>x.kind==='animal'&&x.title===e.info.mother);const fathers:Record<string,string>={'Chacco Blue':'/assets/chacco.webp','Baloubet du Rouet':'/assets/baloubet.webp','Comme il Faut':'/assets/comme.webp','Uricas van de Kattevennen':'/assets/uricas.webp'};
  return {id:e.id,url:view.entryPath(e),type:e.kind==='animal'?'potro':e.categories.includes('congelados')?'embriao':'gestacao',name:e.kind==='animal'?e.title:undefined,mother:e.info.mother||'Não informada',father:e.info.father||'Não informado',motherImage:mother?.image||'/assets/02_matrizes.png',fatherImage:fathers[e.info.father]||'/assets/02_matrizes.png',image:e.image||'/assets/04_potros_cabresto.png',year:e.info.year||e.info.forecast||'Sob consulta',line:'Origem: '+(mother?.info.mother||e.info.mother||'Consulte a equipe'),availability:e.info.availability};
 });
 const mix:any[]=[];const groups=['embriao','gestacao','potro'].map(type=>products.filter(p=>p.type===type));for(let i=0;i<Math.max(...groups.map(g=>g.length));i++)for(const group of groups)if(group[i])mix.push(group[i]);
 products.splice(0,products.length,...mix);
 const mares=entries.filter(e=>e.categories.includes('matriz')).slice(0,6).map(e=>({name:e.title,image:e.image||'/assets/02_matrizes.png',line:(e.info.father||'Origem paterna')+' × '+(e.info.mother||'Origem materna'),url:view.entryPath(e)}));
 html=html.replace('id="inquiry-name" autocomplete="name"','id="inquiry-name" autocomplete="name" required');
 html=html.replace('Sua consulta será preparada para envio por e-mail.','Sua consulta será registrada para atendimento pela equipe.').replace('<label>Seu interesse<select','<label>E-mail<input type="email" id="inquiry-email" autocomplete="email" maxlength="200" required></label><label>Seu interesse<select').replace('<button class="button" type="submit">Preparar e-mail','<label class="consent"><input type="checkbox" id="inquiry-consent" required> Autorizo o uso dos meus dados para responder à consulta.</label><button class="button" type="submit">Enviar consulta');
 html=html.replace('<script src="app.js" defer></script>',`<script>window.STUD_DATA=${view.json({products,mares})}</script><script src="/app.js" defer></script><script src="/system.js" defer></script>`);
 return html;
}
export async function handle(req:Request):Promise<Response>{
 try{
 const url=new URL(req.url);const path=url.pathname.replace(/\/+$/,'')||'/';const db=env.DB;
 if(!db)return response('Banco de dados indisponível.',503,'text/plain; charset=utf-8');
 if(req.method!=='GET'){
  if(req.headers.get('Origin')!==url.origin)return j({error:'Origem da solicitação inválida.'},403);
  if(Number(req.headers.get('Content-Length')||0)>(path==='/api/upload'?10000000:200000))return j({error:'Arquivo ou conteúdo muito grande.'},413);
 }
 await initialize(db);
 if(path.startsWith('/media/')){
  if(req.method!=='GET')return j({error:'Método inválido.'},405);
  const key=path.slice(7);if(!/^[a-z0-9-]+\.(png|jpg|webp)$/.test(key))return response('Não encontrado',404);
  const obj=await env.BUCKET?.get(key);if(!obj)return response('Não encontrado',404);
  return new Response(obj.body,{headers:{'Content-Type':obj.httpMetadata?.contentType||'application/octet-stream','Cache-Control':'public,max-age=86400','X-Content-Type-Options':'nosniff'}});
 }
 if(path==='/api/inquiries'&&req.method==='POST'){
  const d:any=await req.json();if(d.website)return j({ok:true});
  if(typeof d.name!=='string'||d.name.trim().length<2||d.name.length>120||typeof d.email!=='string'||!/^\S+@\S+\.\S+$/.test(d.email)||d.email.length>200||typeof d.message!=='string'||d.message.trim().length<5||d.message.length>5000||d.consent!==true||typeof d.phone!=='string'||d.phone.length>40||typeof d.interest!=='string'||d.interest.length>100)return j({error:'Confira os campos e autorize o uso dos dados para atendimento.'},400);
  const hour=now().slice(0,13),ip=req.headers.get('CF-Connecting-IP')||'anonymous';const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(ip+hour)))).map(x=>x.toString(16).padStart(2,'0')).join('');
  const limit=await db.prepare('INSERT INTO rate_limits (key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind(hash,hour).first<{count:number}>();
  if((limit?.count||0)>5)return j({error:'Limite de consultas atingido. Tente mais tarde ou use nosso e-mail.'},429);
  await db.prepare("INSERT INTO inquiries (id,name,email,phone,interest,message,consent_at,created_at,status) VALUES (?,?,?,?,?,?,?,?,'new')").bind(crypto.randomUUID(),d.name.trim(),d.email.trim(),d.phone,d.interest,d.message.trim(),now(),now()).run();
  return j({ok:true,message:'Consulta recebida. A equipe Stud PB dará continuidade ao atendimento.'});
 }
 if(path.startsWith('/api/')||path.startsWith('/admin')){
  const user=await authorized(db);
  if(!user){
   if(path.startsWith('/api/'))return j({error:'Acesso restrito à equipe autorizada.'},401);
   const s=await readSettings(db);return response(view.shell('Acesso da equipe',`<section class="wrap admin-login"><p class="eyebrow">Área interna / Stud PB</p><h1>Acesso da equipe.</h1><p>Entre com uma conta autorizada para editar o catálogo e os pedigrees.</p><a class="button" href="${chatGPTSignInPath('/admin/')}" target="_top">Entrar com ChatGPT ↗</a></section>`,s,path),401);
  }
  if(path==='/api/admin'&&req.method==='GET')return j({user:{name:user.displayName,role:user.role},entries:await listEntries(db,true),settings:await readSettings(db),members:user.role==='admin'?(await db.prepare('SELECT id,email,role,active FROM members').all()).results:[],inquiries:(await db.prepare('SELECT * FROM inquiries ORDER BY created_at DESC LIMIT 500').all()).results});
  if(path==='/api/entries'&&req.method==='POST'){
   const e=validateEntry(await req.json());let version=1;
   if(e.id){
    const old=await db.prepare('SELECT version,info,pedigree FROM entries WHERE id=?').bind(e.id).first<{version:number;info:string;pedigree:string}>();if(!old)return j({error:'Cadastro não encontrado.'},404);
    if(old.version!==e.version)return j({error:'Outra pessoa alterou esta ficha. Reabra para continuar.'},409);
    const previousInfo=JSON.parse(old.info);
    if(e.kind==='animal'&&(JSON.stringify(JSON.parse(old.pedigree))!==JSON.stringify(e.pedigree)||['father','mother','year','birth'].some(k=>previousInfo[k]!==e.info[k]))){
     e.info.pedigreeVerification='pending';
     e.info.pedigreeReviewNote='Pedigree alterado pela equipe após a conferência. Verificação das fontes pendente.';
     delete e.info.pedigreeVerifiedAt;
    }
    version=old.version+1;e.updated_at=now();e.version=version;
    const keys=entryColumns.filter(k=>k!=='id');const values=entryValues(e).slice(1);
    const result=await db.prepare(`UPDATE entries SET ${keys.map(k=>k+'=?').join(',')} WHERE id=? AND version=?`).bind(...values,e.id,old.version).run();
    if(!result.meta.changes)return j({error:'Cadastro alterado por outra pessoa. Reabra a ficha.'},409);
   }else{e.id=crypto.randomUUID();e.updated_at=now();e.published_at=now();e.source_url='';e.version=1;await db.prepare(`INSERT INTO entries (${entryColumns.join(',')}) VALUES (${entryColumns.map(()=>'?').join(',')})`).bind(...entryValues(e)).run();}
   await db.prepare('INSERT INTO audit (id,user_id,action,entry_id,created_at) VALUES (?,?,?,?,?)').bind(crypto.randomUUID(),user.userId,'save',e.id,now()).run();return j({id:e.id,version,url:view.entryPath(e)});
  }
  if(path==='/api/upload'&&req.method==='POST'){
   const form=await req.formData(),file=form.get('file');if(!(file instanceof File)||file.size>10000000||file.size===0)return j({error:'Envie uma imagem de até 10 MB.'},400);
   const bytes=new Uint8Array(await file.arrayBuffer());const png=bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71;const jpeg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;const webp=String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP';
   const mime=png?'image/png':jpeg?'image/jpeg':webp?'image/webp':'';if(!mime||mime!==file.type)return j({error:'Formato inválido. Use PNG, JPEG ou WebP.'},400);
   if(!env.BUCKET)return j({error:'Armazenamento indisponível.'},503);const id=crypto.randomUUID();const key=id+'.'+(png?'png':jpeg?'jpg':'webp');await env.BUCKET.put(key,bytes,{httpMetadata:{contentType:mime}});await db.prepare('INSERT INTO media (id,url,mime,bytes,created_at) VALUES (?,?,?,?,?)').bind(id,'/media/'+key,mime,file.size,now()).run();return j({url:'/media/'+key});
  }
  if(path==='/api/settings'&&req.method==='POST'){
   if(user.role!=='admin')return j({error:'Apenas administradores.'},403);
   const data:any=await req.json(),allowed=['pedigree_order','contact_email','contact_whatsapp','address','instagram','youtube','welcome'];
   for(const [k,v] of Object.entries(data))if(!allowed.includes(k)||typeof v!=='string'||v.length>1000)return j({error:'Configuração inválida.'},400);
   if(data.pedigree_order&&data.pedigree_order!=='paternal-first')return j({error:'Ordem inválida.'},400);
   if(data.contact_email&&!/^\S+@\S+\.\S+$/.test(data.contact_email))return j({error:'E-mail inválido.'},400);
   if(data.contact_whatsapp&&!/^\d{10,15}$/.test(data.contact_whatsapp))return j({error:'WhatsApp deve conter DDI, DDD e número, somente dígitos.'},400);
   for(const k of ['instagram','youtube'])if(data[k]&&!/^https:\/\/[^\s<>"']+$/.test(data[k]))return j({error:'Use um endereço HTTPS válido.'},400);
   await db.batch(Object.entries(data).map(([k,v])=>db.prepare('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(k,v)));return j({ok:true});
  }
  if(path==='/api/members'&&req.method==='POST'){
   if(user.role!=='admin')return j({error:'Apenas administradores.'},403);const d:any=await req.json();if(typeof d.email!=='string'||!/^\S+@\S+\.\S+$/.test(d.email)||d.email.length>200||!['admin','editor'].includes(d.role)||![0,1].includes(d.active))return j({error:'Membro inválido.'},400);
   if(d.email.toLowerCase()===user.email.toLowerCase()&&(d.active!==1||d.role!=='admin'))return j({error:'Você não pode remover seu próprio acesso de administrador.'},400);
   await db.prepare('INSERT INTO members (id,email,user_id,role,active) VALUES (?,?,NULL,?,?) ON CONFLICT(email) DO UPDATE SET role=excluded.role,active=excluded.active').bind(crypto.randomUUID(),d.email.toLowerCase(),d.role,d.active).run();return j({ok:true});
  }
  if(path==='/api/inquiry-status'&&req.method==='POST'){const d:any=await req.json();if(!['new','contacted','closed'].includes(d.status)||typeof d.id!=='string')return j({error:'Situação inválida.'},400);await db.prepare('UPDATE inquiries SET status=? WHERE id=?').bind(d.status,d.id).run();return j({ok:true});}
  if(path==='/api/export.sql'&&req.method==='GET'){
   if(user.role!=='admin')return j({error:'Apenas administradores.'},403);
   const tables=['entries','settings','source_records','media','members','inquiries','audit'];let sql='-- Stud PB / SQLite e Cloudflare D1 / '+now()+'\n'+schemaSQL+'\n';
   for(const table of tables){const rows=(await db.prepare('SELECT * FROM '+table).all()).results;sql+=rows.map(row=>insertSQL(table,row)).join('\n')+'\n';}const res=response(sql,200,'application/sql; charset=utf-8');res.headers.set('Content-Disposition','attachment; filename="studpb-backup.sql"');return res;
  }
  if(path.startsWith('/admin/pedigree/')&&req.method==='GET'){const id=decodeURIComponent(path.slice(16));const all=await listEntries(db,true);const e=all.find(e=>e.id===id);if(e)e.pedigree=view.pedigreeFor(e,all);return e?response(protectedEditor(e,"paternal-first")):response('Animal não encontrado',404);}
  if(path==='/admin'&&req.method==='GET')return response(view.shell('Painel da equipe',`<section class="wrap admin-page"><div class="admin-heading"><div><p class="eyebrow">Gestão / Stud PB</p><h1>Seu catálogo. Sua próxima geração.</h1><p>Olá, ${view.esc(user.displayName)}.</p></div><a class="text-link" href="/signout-with-chatgpt?return_to=%2F" target="_top">Sair ↗</a></div><div id="admin-root"><p>Carregando o painel…</p></div><p id="admin-status" role="status" aria-live="polite"></p></section><script src="/admin.js" defer></script>`,await readSettings(db),'/admin/'));
  return j({error:'Recurso não encontrado.'},404);
 }
 if(req.method!=='GET')return j({error:'Método não permitido.'},405);
 const entries=await listEntries(db),settings=await readSettings(db);
 if(path==='/')return response(home(entries,settings));
 const legacy:Record<string,string>={'/home':'/','/home/nossa-historia':'/nossa-historia/','/home/eguas/pb-esporte':'/eguas/pb-esporte/','/home/eguas/pb-matrizes':'/eguas/pb-matriz/','/home/eguas/pb-futuras-matrizes':'/eguas/pb-futuras/','/home/embrioes/congelados':'/embrioes/congelados/','/home/embrioes/gestacoes-disponiveis':'/gestacoes/','/home/potros':'/potros/','/home/noticias':'/noticias/','/home/contato':'/contato/','/matrizes/balance-z':'/animais/balance-z/'};
 if(legacy[path])return Response.redirect(url.origin+legacy[path],301);
 if(path==='/eguas'||path.startsWith('/eguas/')){const cat=({'pb-esporte':'esporte','pb-matriz':'matriz','pb-futuras':'futuras'} as Record<string,string>)[path.split('/')[2]];if(path!=='/eguas'&&!cat)return response(view.shell('Página não encontrada','<section class="wrap profile-section"><h1>Página não encontrada.</h1><a href="/eguas/">Ver todas as éguas</a></section>',settings),404);return response(view.listing(cat?({'esporte':'PB Esporte','matriz':'PB Matriz','futuras':'PB Futuras'} as any)[cat]:'Nossas éguas','Conheça as famílias que dão origem às próximas gerações do Stud PB.',entries.filter(e=>e.kind==='animal'&&!e.categories.includes('potros')&&(!cat||e.categories.includes(cat))),entries,settings,path));}
 if(path==='/potros')return response(view.listing('Potros','A próxima geração já tem nome. Explore os animais e conheça sua origem.',entries.filter(e=>e.categories.includes('potros')),entries,settings,path));
 if(path==='/embrioes'||path==='/embrioes/congelados'||path==='/gestacoes'){const gest=path==='/gestacoes';return response(view.listing(gest?'Gestações futuras':'Embriões congelados',gest?'Conheça os cruzamentos e consulte as informações atualizadas de cada gestação.':'Sua escolha começa na origem. Explore os cruzamentos de nossas matrizes.',entries.filter(e=>e.categories.includes(gest?'gestacoes':'congelados')),entries,settings,path,'crossing'));}
 if(path==='/noticias')return response(view.listing('Notícias','Histórias, conquistas e novidades do Stud PB.',entries.filter(e=>e.kind==='article'),entries,settings,path,'article'));
 if(path==='/nossa-historia'){const e=entries.find(e=>e.slug==='nossa-historia');if(e)return response(view.history(e,settings));}
 if(path==='/contato')return response(view.contact(settings,(url.searchParams.get('animal')||'').slice(0,200)));
 if(path==='/privacidade')return response(view.shell('Privacidade',`<section class="wrap article-body"><h1>Privacidade e atendimento.</h1><div class="article-text"><p>Os dados enviados no formulário são usados pela equipe Stud PB para responder à sua consulta. O cadastro registra nome, e-mail, telefone opcional, interesse, mensagem e data do consentimento.</p><p>Para solicitar acesso, correção ou exclusão de seus dados, escreva para ${view.esc(settings.contact_email)}.</p><p>Ao escolher inglês ou francês, você acessa a tradução automática do Google. Links para redes sociais e WhatsApp levam a serviços externos.</p></div></section>`,settings,path));
 const slug=path.split('/').filter(Boolean).at(-1)||'';const alias=(initial.aliases as Record<string,string>)[slug];let e=entries.find(x=>x.slug===slug||x.slug===alias);
 if(e){if(!['animais','cruzamentos','noticias'].some(x=>path.startsWith('/'+x+'/'))&&e.kind!=='page')return Response.redirect(url.origin+view.entryPath(e),301);return response(e.kind==='article'?view.article(e,settings):e.kind==='page'?view.contentPage(e,settings):view.profile(e,entries,settings));}
 return response(view.shell('Página não encontrada','<section class="wrap profile-section"><p class="eyebrow">Stud PB</p><h1>Não encontramos esta página.</h1><a class="button" href="/">Voltar ao início ↗</a></section>',settings,path),404);
 }catch(error){console.error('StudPB request failed:',error instanceof Error?error.message:'unknown');return j({error:error instanceof Error&&/inválid|Preencha|Pedigree|Versão/.test(error.message)?error.message:'Não foi possível concluir. Tente novamente.'},error instanceof SyntaxError||(error instanceof Error&&/inválid|Preencha|Pedigree|Versão/.test(error.message))?400:500);}
}
