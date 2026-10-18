'use strict';
// No credentials, document bodies or signing tokens are stored in this CRM.
window.CrmSigning=(()=>{
 const ORIGIN='https://sign.varis.kr',endpoint=ORIGIN+'/api/crm/status';
 const frame=document.getElementById('signFrame'),status=document.getElementById('signStatus'),counts=document.getElementById('signCounts');
 const labels=[['total','전체'],['draft','임시 저장'],['sent','서명 대기'],['in_progress','서명 진행 중'],['completed','체결 완료'],['declined','거절'],['expired','기한 만료'],['voided','무효']];
 let active=false,interval=null,pending=null,selected='total',loggedIn=false,loaded=false;
 function renderCounts(values){
  counts.replaceChildren();
  for(const [key,label] of labels){const b=document.createElement('button');b.type='button';b.className='signFilter';b.dataset.status=key;b.setAttribute('aria-pressed',String(key===selected));b.disabled=!values;const text=document.createElement('span'),n=document.createElement('strong');text.textContent=label;n.textContent=values?String(values[key]):'확인 불가';b.append(text,n);b.addEventListener('click',()=>{selected=key;for(const x of counts.children)x.setAttribute('aria-pressed',String(x.dataset.status===key));navigate('/dashboard'+(key==='total'?'':'?status='+encodeURIComponent(key)));});counts.append(b);}
 }
 function navigate(route){frame.src=ORIGIN+route;frame.hidden=false;loaded=true;}
 function validPayload(d){return d&&d.staff&&typeof d.staff.name==='string'&&d.staff.name.length<=200&&typeof d.fetchedAt==='string'&&Number.isFinite(Date.parse(d.fetchedAt))&&d.counts&&labels.every(([k])=>Number.isSafeInteger(d.counts[k])&&d.counts[k]>=0)&&d.counts.total===labels.filter(([k])=>k!=='total').reduce((n,[k])=>n+d.counts[k],0);}
 async function refresh(){
  if(!active||pending)return;
  const controller=new AbortController();pending=controller;const timeout=setTimeout(()=>controller.abort(),15000);
  status.className='banner';status.textContent='전자서명 상태를 확인하는 중입니다.';
  try{
   const response=await fetch(endpoint,{credentials:'include',cache:'no-store',signal:controller.signal});
   if(!active)return;
   if(response.status===401){renderCounts(null);status.textContent='전자서명 로그인이 필요합니다. 작성 중인 화면은 유지합니다. 별도 창에서 로그인한 뒤 상태를 새로고침해 주세요.';loggedIn=false;return;}
   if(!response.ok)throw Error('HTTP '+response.status);
   const d=await response.json();if(!active)return;if(!validPayload(d))throw Error('잘못된 상태 응답');
   loggedIn=true;renderCounts(d.counts);status.textContent=d.staff.name+' 로그인 · 마지막 조회 '+new Date(d.fetchedAt).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})+' · 60초마다 상태 갱신';
   if(!loaded||new URL(frame.src).pathname==='/login')navigate('/dashboard');
  }catch(e){if(!active)return;renderCounts(null);status.className='banner err';status.textContent='전자서명 상태를 확인할 수 없습니다. 0건으로 표시하지 않습니다. 잠시 후 새로고침하거나 서명 화면에서 확인하세요.';}
  finally{clearTimeout(timeout);if(pending===controller)pending=null;}
 }
 frame.addEventListener('load',()=>{if(active)refresh();});
 document.getElementById('signList').onclick=()=>{selected='total';navigate('/dashboard');refresh();};
 document.getElementById('signNew').onclick=()=>{navigate('/documents/new');refresh();};
 document.getElementById('signRefresh').onclick=()=>refresh();
 document.addEventListener('visibilitychange',()=>{if(active&&!document.hidden)refresh();});
 renderCounts(null);
 return {activate(){active=true;if(!loaded)navigate('/dashboard');refresh();if(!interval)interval=setInterval(()=>{if(!document.hidden)refresh();},60000);},deactivate(){active=false;if(interval)clearInterval(interval);interval=null;if(pending)pending.abort();pending=null;}};
})();
