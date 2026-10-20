/* Public read-only pedigree. Change order here after client approval. */
'use strict';
window.StudPedigree=(()=>{
 const config={order:'paternal-first'};
 const n=(name,sex,mother=null,father=null)=>({name,sex,mother,father});
 const balance=n('Balance Z','female',n('Daphne','female',n('Wildemeid','female'),n('Stakkato','male')),n('Balou du Rouet','male',n('Georgia','female'),n('Baloubet du Rouet','male')));
 const balou=n('Balou Blue PB','male',balance,n('Chacco Blue','male',n('MoM’s Contara','female',n('Godahra II','female'),n('Contender','male')),n('Chambertin','male',n('Desiree VII','female'),n('Cambridge','male'))));
 const records={balance,balou};
 const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function branches(node,order){return order==='paternal-first'?[node?.father,node?.mother]:[node?.mother,node?.father];}
 function markup(record,{order=config.order,generations=3}={}){
  if(!record)return '';
  const maternal=order!=='paternal-first';
  let current=[record];
  const columns=[];
  for(let depth=0;depth<generations;depth++){
   current=current.flatMap(node=>branches(node,order));
   const heading=depth===0?(maternal?'Mãe / Pai':'Pai / Mãe'):depth===1?'Avós':'Bisavós';
   columns.push(`<div class="pedigree-generation" style="--depth:${depth}" role="group" aria-label="${heading}"><p class="pedigree-generation-title">${heading}</p><div class="pedigree-generation-nodes">${current.map((node,i)=>{
    const sex=node?.sex||(maternal?(i%2?'male':'female'):(i%2?'female':'male'));
    return `<div class="pedigree-person ${node?'':'is-unknown'}"><span class="pedigree-sex" aria-label="${sex==='female'?'Fêmea':sex==='male'?'Macho':'Sexo não informado'}">${sex==='female'?'♀':sex==='male'?'♂':'?'}</span><span class="pedigree-person-name">${node?escape(node.name):'Não informado'}</span></div>`;
   }).join('')}</div></div>`);
  }
  return `<div class="public-pedigree" data-order="${maternal?'maternal-first':'paternal-first'}"><div class="pedigree-subject"><h3>${escape(record.name)}</h3><p>${record.sex==='female'?'Fêmea':record.sex==='male'?'Macho':'Sexo não informado'}${record===balou?' <span aria-hidden="true">|</span> 02 de dezembro de 2025':''}</p></div><div class="pedigree-scroll" role="region" aria-label="Árvore genealógica de ${escape(record.name)}. No celular, deslize horizontalmente para consultar as gerações." tabindex="0"><div class="pedigree-tree">${columns.join('')}</div></div><p class="pedigree-footnote">${generations} gerações <span aria-hidden="true">|</span> Linhagem ${maternal?'materna':'paterna'} primeiro</p><p class="pedigree-mobile-hint">Deslize para explorar as gerações <span aria-hidden="true">↔</span></p></div>`;
 }
 function mount(){document.querySelectorAll('[data-pedigree]').forEach(el=>{el.innerHTML=markup(records[el.dataset.pedigree]);});}
 return {config,records,markup,mount};
})();
window.StudPedigree.mount();
