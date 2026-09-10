const statuses={canonical:'Canonical',historical:'Historical',wip:'WIP',rejected:'Rejected'};
const storageKey='eirakar-gallery-curation-v1';
const $=(selector,parent=document)=>parent.querySelector(selector);
const $$=(selector,parent=document)=>[...parent.querySelectorAll(selector)];
const escapeHtml=value=>String(value).replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
let original=[],draft=[],active='all';

function validDraft(value){return Array.isArray(value)&&value.every(item=>item&&typeof item.src==='string'&&typeof item.label==='string'&&statuses[item.status])}
function counts(){return Object.fromEntries(Object.keys(statuses).map(status=>[status,draft.filter(item=>item.status===status).length]))}
function save(){localStorage.setItem(storageKey,JSON.stringify(draft));render()}
function render(){
  const query=$('#curator-search').value.toLowerCase().trim();
  const visible=draft.map((item,index)=>({...item,index})).filter(item=>(active==='all'||item.status===active)&&(!query||`${item.label} ${item.src} ${item.notes||''}`.toLowerCase().includes(query)));
  const tally=counts(),changed=draft.filter((item,index)=>JSON.stringify(item)!==JSON.stringify(original[index])).length;
  $('#curator-summary').textContent=`${visible.length} visibles · ${changed} cambios sin publicar · ${tally.canonical} canonical · ${tally.historical} historical · ${tally.wip} WIP · ${tally.rejected} rejected`;
  $('#curator-grid').innerHTML=visible.map(item=>`<article class="curator-card status-${item.status}" data-index="${item.index}"><div class="curator-preview"><img loading="lazy" src="${escapeHtml(item.src)}" alt="${escapeHtml(item.label)}"><span class="media-badge">&lt;${statuses[item.status]}&gt;</span></div><div class="curator-fields"><label>Título<input data-field="label" value="${escapeHtml(item.label)}"></label><label>Estado<select data-field="status">${Object.entries(statuses).map(([value,label])=>`<option value="${value}" ${item.status===value?'selected':''}>${label}</option>`).join('')}</select></label><label>Nota editorial<textarea data-field="notes" rows="3" placeholder="Por qué se acepta, rechaza o conserva…">${escapeHtml(item.notes||'')}</textarea></label><small>${escapeHtml(item.src)}</small></div></article>`).join('')||'<p class="curator-empty">No hay referencias que coincidan.</p>';
  $$('[data-field]').forEach(control=>control.addEventListener('change',event=>{const card=event.target.closest('[data-index]'),index=Number(card.dataset.index),field=event.target.dataset.field;draft[index]={...draft[index],[field]:event.target.value.trim()};save()}));
}

async function init(){
  original=await fetch('assets/gallery-index.json').then(response=>response.json());
  const stored=JSON.parse(localStorage.getItem(storageKey)||'null');draft=validDraft(stored)&&stored.length===original.length?stored:structuredClone(original);
  $('#curator-filters').innerHTML=['all',...Object.keys(statuses)].map(status=>`<button data-status="${status}" class="${status==='all'?'active':''}">${status==='all'?'Todas':statuses[status]}</button>`).join('');
  $$('[data-status]').forEach(button=>button.addEventListener('click',()=>{active=button.dataset.status;$$('[data-status]').forEach(item=>item.classList.toggle('active',item===button));render()}));
  $('#curator-search').addEventListener('input',render);
  $('#curator-reset').addEventListener('click',()=>{if(confirm('¿Descartar todos los cambios locales?')){localStorage.removeItem(storageKey);draft=structuredClone(original);render()}});
  $('#curator-export').addEventListener('click',()=>{const blob=new Blob([`${JSON.stringify(draft,null,2)}\n`],{type:'application/json'}),link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download='gallery-index.json';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000)});
  render();
}
init().catch(error=>{$('#curator-grid').innerHTML=`<p class="curator-empty">No se pudo abrir el manifiesto: ${escapeHtml(error.message)}</p>`});
