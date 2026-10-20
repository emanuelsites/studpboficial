'use strict';
const A='';
const categories={embriao:'Embrião congelado',gestacao:'Gestação',potro:'Potro'};
const products=window.STUD_DATA.products;
const mares=window.STUD_DATA.mares;
const state={category:'all',query:'',mother:'',expanded:false};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normal=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const title=p=>p.name||`${p.father} × ${p.mother}`;
const parentPair=p=>`<div class="parent-pair"><div class="parent-photo"><img src="${A+p.fatherImage}" alt="${esc(p.father)}, pai" loading="lazy" width="300" height="500"><span class="parent-label">PAI <span class="sex" aria-hidden="true">♂</span></span></div><div class="parent-photo"><img src="${A+p.motherImage}" alt="${esc(p.mother)}, mãe" loading="lazy" width="300" height="500"><span class="parent-label">MÃE <span class="sex" aria-hidden="true">♀</span></span></div></div>`;
const photo=p=>p.type==='potro'?`<img class="foal-photo" src="${A+p.image}" alt="${esc(p.name)}" loading="lazy">`:parentPair(p);
const nameMarkup=p=>p.name?esc(p.name):`${esc(p.father)}<span class="sire-line">× ${esc(p.mother)}</span>`;
const action=p=>p.type==='embriao'?'Ver cruzamento':p.type==='gestacao'?'Conhecer a gestação':'Conhecer o potro';
function meta(p){
 if(p.type==='potro')return `<p>Pai: ${esc(p.father)}</p><p>Mãe: ${esc(p.mother)}</p>`;
 if(p.type==='gestacao')return `<p>Previsão de nascimento: ${esc(p.year)}</p>`;
 return `<p>${esc(p.line)}</p>`;
}
function card(p){return `<article class="product-card"><button class="image-button" data-detail="${p.id}" aria-label="${esc(action(p)+': '+title(p))}">${photo(p)}</button><p class="product-kind">${p.type==='potro'?'Nascimento '+p.year:categories[p.type]}</p><h3 class="product-name">${nameMarkup(p)}</h3><div class="product-meta">${meta(p)}</div><button class="text-link" data-detail="${p.id}">${action(p)} <span aria-hidden="true">→</span></button></article>`;}
function filteredProducts(){
 const q=normal(state.query);
 return products.filter(p=>(state.category==='all'||p.type===state.category)&&(!state.mother||p.mother===state.mother)&&(!q||normal([p.name,p.mother,p.father,p.line,p.year,categories[p.type]].filter(Boolean).join(' ')).includes(q)));
}
function renderCatalog(){
 const all=filteredProducts();const limited=state.category==='all'&&!state.query&&!state.mother&&!state.expanded;
 const visible=limited?all.slice(0,3):all;
 document.querySelector('#catalog-grid').innerHTML=visible.map(card).join('');
 document.querySelector('#empty').hidden=all.length!==0;
 document.querySelector('#show-all').hidden=!limited||all.length<=3;
 document.querySelector('#catalog-status').textContent=`${all.length} opções encontradas. ${visible.length} exibidas.`;
 document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===state.category)));
 document.querySelector('#active-line').hidden=!state.query&&!state.mother;
 document.querySelector('#active-description').textContent=state.mother?`Linhagem materna: ${state.mother}`:`Busca: ${state.query}`;
}
function setCategory(value){state.category=value;state.query='';state.mother='';state.expanded=false;document.querySelector('#catalog-search').value='';renderCatalog();}
function scrollCatalog(){document.querySelector('#catalogo').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
function filterMother(name){state.category='all';state.mother=name;state.query='';state.expanded=true;document.querySelector('#catalog-search').value='';renderCatalog();scrollCatalog();}
const detail=document.querySelector('#detail-dialog');
const contact=document.querySelector('#contact-dialog');
function openDetail(id){
 const p=products.find(x=>x.id===id);if(!p)return;
 document.querySelector('#detail-body').innerHTML=`<div class="detail-content">${photo(p)}<p class="eyebrow">${categories[p.type]}</p><h2 id="detail-title">${nameMarkup(p)}</h2><dl class="details-table"><div><dt>Pai ♂</dt><dd>${esc(p.father)}</dd></div><div><dt>Mãe ♀</dt><dd>${p.mother==='Balance Z'?'<a class="text-link" href="/animais/balance-z/">Balance Z ↗</a>':esc(p.mother)}</dd></div>${p.year?`<div><dt>${p.type==='gestacao'?'Previsão de nascimento':'Nascimento'}</dt><dd>${esc(p.year)}</dd></div>`:''}${p.line?`<div><dt>Origem materna</dt><dd>${esc(p.line.replace('Linha materna: ',''))}</dd></div>`:''}</dl><div class="detail-actions"><button class="button" data-inquire="${p.id}">Consultar ${p.type==='embriao'?'este embrião':p.type==='gestacao'?'esta gestação':'este potro'} <span aria-hidden="true">↗</span></button><button class="text-link" data-mother="${esc(p.mother)}">Explorar esta linhagem <span aria-hidden="true">→</span></button></div><p class="availability">Consulte a equipe sobre disponibilidade, condições e ${p.type==='gestacao'?'situação atual da gestação':'informações atualizadas'}.</p></div>`;
 document.querySelector('#detail-body').insertAdjacentHTML('beforeend',`<a class="text-link full-record" href="${esc(p.url)}">Abrir ficha completa →</a>`);
 detail.showModal();
}
function openContact(id){
 const p=products.find(x=>x.id===id);if(detail.open)detail.close();
 document.querySelector('#inquiry-interest').value=p?({embriao:'Embriões',gestacao:'Gestações',potro:'Potros'}[p.type]):'Embriões';
 document.querySelector('#inquiry-message').value=p?`Olá, equipe Stud PB! Gostaria de saber mais sobre ${title(p)} (${categories[p.type].toLowerCase()}).\n\nPai: ${p.father}\nMãe: ${p.mother}\n\nPodem me informar a disponibilidade e as condições?`:'Olá, equipe Stud PB! Gostaria de conversar sobre as opções de embriões, gestações e potros.';
 document.querySelector('.form-status').textContent='';contact.showModal();
}
function inquiryMessage(){const name=document.querySelector('#inquiry-name').value.trim();return (name?`Meu nome é ${name}.\n\n`:'')+document.querySelector('#inquiry-message').value.trim();}
function renderEditorial(id,selector,description){const p=products.find(x=>x.id===id);if(!p){document.querySelector(selector).hidden=true;return;}document.querySelector(selector).innerHTML=`<button class="image-button" data-detail="${id}" aria-label="${esc(title(p))}">${parentPair(p)}</button><p class="product-kind">${categories[p.type]}</p><h3 class="product-name">${nameMarkup(p)}</h3><p class="product-meta">${description}</p><a class="text-link" href="#catalogo" data-category="${p.type}">Explorar ${p.type==='embriao'?'embriões':'gestações'} <span aria-hidden="true">→</span></a>`;}
renderCatalog();
renderEditorial(products.find(p=>p.type==='embriao')?.id,'#frozen-highlight','Conheça os cruzamentos e consulte as condições de cada embrião.');
renderEditorial(products.find(p=>p.type==='gestacao')?.id,'#pregnancy-highlight','Acompanhe a próxima geração e conheça a origem de cada gestação.');
document.querySelector('#foal-grid').innerHTML=products.filter(p=>p.type==='potro').slice(0,3).map(card).join('');
document.querySelector('#mare-grid').innerHTML=mares.map(m=>{
 const isBalance=!!m.url;
 const image=`<img class="mare-photo" src="${A+m.image}" alt="${esc(m.name)}" loading="lazy" width="300" height="500">`;
 const visual=isBalance?`<a class="image-button" href="${esc(m.url)}" aria-label="Conhecer a matriz ${esc(m.name)}">${image}</a>`:`<button class="image-button" data-mother="${esc(m.name)}" aria-label="Conhecer a linhagem de ${esc(m.name)}">${image}</button>`;
 return `<article class="mare-card">${visual}<h3>${esc(m.name)}</h3><p>${esc(m.line)}</p>${isBalance?`<a class="text-link matrix-profile-link" href="${esc(m.url)}">Conheça a matriz <span aria-hidden="true">→</span></a>`:''}<button class="text-link" data-mother="${esc(m.name)}">Ver cruzamentos e descendentes <span aria-hidden="true">→</span></button></article>`;
}).join('');
const menu=document.querySelector('.menu-toggle'),nav=document.querySelector('#navegacao');
function closeMenu(){menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Abrir menu');nav.classList.remove('open');}
menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Fechar menu':'Abrir menu');nav.classList.toggle('open',open);});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();});
document.addEventListener('click',e=>{
 const el=e.target.closest('button,a');if(!el)return;
 if(el.dataset.category){e.preventDefault();setCategory(el.dataset.category);closeMenu();scrollCatalog();}
 if(el.dataset.filter){setCategory(el.dataset.filter);}
 if(el.dataset.detail)openDetail(el.dataset.detail);
 if(el.dataset.mother){if(detail.open)detail.close();filterMother(el.dataset.mother);}
 if(el.dataset.inquire)openContact(el.dataset.inquire);
 if(el.hasAttribute('data-contact'))openContact();
 if(el.hasAttribute('data-close'))el.closest('dialog').close();
 if(el.closest('#navegacao'))closeMenu();
});
[detail,contact].forEach(d=>d.addEventListener('click',e=>{if(e.target===d)d.close();}));
document.querySelector('#catalog-search').addEventListener('input',e=>{state.query=e.target.value;state.mother='';state.expanded=true;renderCatalog();});
document.querySelector('#clear-search').addEventListener('click',()=>{setCategory('all');document.querySelector('#catalog-search').focus();});
document.querySelector('#show-all').addEventListener('click',()=>{state.expanded=true;renderCatalog();});
document.querySelector('#inquiry-form').addEventListener('submit',async e=>{e.preventDefault();const form=e.target,button=form.querySelector('[type=submit]'),status=form.querySelector('.form-status');button.disabled=true;status.textContent='Enviando sua consulta…';try{const r=await fetch('/api/inquiries',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:document.querySelector('#inquiry-name').value,email:document.querySelector('#inquiry-email').value,phone:'',interest:document.querySelector('#inquiry-interest').value,message:document.querySelector('#inquiry-message').value,consent:document.querySelector('#inquiry-consent').checked,website:''})});const data=await r.json();if(!r.ok)throw Error(data.error);status.textContent=data.message}catch(err){status.textContent=err.message}finally{button.disabled=false}});
document.querySelector('.copy-message').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(inquiryMessage());document.querySelector('.form-status').textContent='Mensagem copiada. Você pode encaminhá-la para a equipe do Stud PB.';}catch{document.querySelector('#inquiry-message').focus();document.querySelector('#inquiry-message').select();document.querySelector('.form-status').textContent='Mensagem selecionada. Use Copiar no seu dispositivo.';}});
const topButton=document.querySelector('.back-top');window.addEventListener('scroll',()=>{topButton.hidden=window.scrollY<700;},{passive:true});topButton.addEventListener('click',()=>window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}));

const initialCategory=new URLSearchParams(window.location.search).get('categoria');
if(['embriao','gestacao','potro'].includes(initialCategory))setCategory(initialCategory);
