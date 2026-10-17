'use strict';
const C=CrmCore,$=id=>document.getElementById(id),KEY='varis_crm_v1',META_KEY='varis_crm_backup_meta';
const SHEET='https://docs.google.com/spreadsheets/d/15Wr_Vu38Ccqj1g_qxX3dhArvVBkc2iuY5G-Km-M-Q3o/edit';
const SENDER_DASHBOARD='https://sender.varis.kr/';
const SENDER_DATA='/api/sender-status';
const colors=['#22d3ee','#fbbf24','#ff2d78','#34d399','#a78bfa'];
const limits=Object.fromEntries(C.STAGES.map(s=>[s,50]));
let storage;try{storage=window.localStorage;}catch(e){storage={getItem(){throw Error('브라우저 저장소 접근 불가');}};}
const store=C.createStore(storage,KEY);let state=store.read(),data=state.data,maskOn=true,editingId=null,focusBefore=null,pendingImport=null,tabChanged=false;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=ts=>new Date(ts).toLocaleString('ko-KR');
function notice(message,error=false){$('notice').textContent=message;$('notice').className=error?'banner err':'banner';$('notice').hidden=false;const dialog=document.querySelector('.overlay.on .modal');if(dialog){let msg=dialog.querySelector('.modalMessage');if(!msg){msg=document.createElement('p');msg.className='banner modalMessage';msg.setAttribute('role','status');dialog.append(msg);}msg.textContent=message;}}
function readMeta(){try{return JSON.parse(storage.getItem(META_KEY))||{};}catch(e){return {};}}
function metaWrite(m){try{storage.setItem(META_KEY,JSON.stringify(m));}catch(e){notice('기록 저장 실패: '+e.message,true);}}
function saveCandidate(next){try{data=store.write(next);state.blocked='';tabChanged=false;render();return true;}catch(e){notice('저장하지 못했습니다: '+e.message,true);return false;}}
function change(id,fn){const next=structuredClone(data),r=next.find(x=>x.id===id);if(!r){notice('레코드가 변경되었거나 없습니다.',true);return false;}fn(r);return saveCandidate(next);}
function phone(p){if(!maskOn)return p||'-';const n=C.phone(p);return n.length>=7?n.slice(0,3)+'-****-'+n.slice(-4):(p?'비공개':'-');}
function email(e){if(!maskOn)return e||'-';return e?e.split(/[;,]/).map(v=>{const i=v.indexOf('@');return i>0?v.trim().slice(0,1)+'***'+v.slice(i):'비공개';}).join('; '):'-';}
function showModal(id){focusBefore=document.activeElement;$(id).classList.add('on');document.querySelector('main').inert=true;document.querySelector('header').inert=true;const focus=$(id).querySelector('input,textarea,select,button');focus?.focus();}
function hideModal(id){$(id).classList.remove('on');const active=document.querySelector('.overlay.on');if(!active){document.querySelector('main').inert=false;document.querySelector('header').inert=false;focusBefore?.isConnected&&focusBefore.focus();}}
function render(){
 const counts=C.STAGES.map(s=>data.filter(d=>d.stage===s).length);
 $('stats').innerHTML='<div class="stat total"><div class="n">'+data.length+'</div><div class="l">전체 지원자</div></div>'+C.LABELS.map((s,i)=>'<div class="stat"><div class="n">'+counts[i]+'</div><div class="l">'+s+'</div></div>').join('');
 const current=$('interestFilter').value;const interests=[...new Set(data.map(d=>d.interest).filter(Boolean))];$('interestFilter').innerHTML='<option value="">전체 관심분야</option>'+interests.map(v=>'<option>'+esc(v)+'</option>').join('');$('interestFilter').value=interests.includes(current)?current:'';
 $('maskBtn').textContent=maskOn?'마스킹 ON':'마스킹 OFF';renderBoard();renderBackup();
 for(const id of ['addBtn','restoreBtn','seedBtn'])$(id).disabled=!!state.blocked||tabChanged;
 if(state.blocked)notice(state.blocked+' 브라우저 저장소를 지우지 말고 원본 파일을 보존하세요.',true);
}
function renderBoard(){
 const q=$('search').value.trim().toLowerCase(),interest=$('interestFilter').value;const rows=data.filter(d=>(!interest||d.interest===interest)&&(!q||[d.name,d.phone,d.email].some(v=>v.toLowerCase().includes(q))));
 $('resultCount').textContent='표시 '+rows.length+' / 전체 '+data.length+'건';
 $('board').innerHTML=C.STAGES.map((s,i)=>{const list=rows.filter(d=>d.stage===s).sort((a,b)=>b.createdAt-a.createdAt);return '<section class="col"><h3>'+C.LABELS[i]+'<span class="cnt">'+list.length+'</span></h3>'+(list.slice(0,limits[s]).map(d=>'<button class="card" data-id="'+esc(d.id)+'"><span class="nm">'+esc(d.name||'(이름 없음)')+(d.demo?' · 데모':'')+'</span><span class="meta">'+esc(phone(d.phone))+'<br>'+esc(email(d.email))+'</span><span class="tag">'+esc(d.interest)+'</span></button>').join('')||'<div class="empty">비어 있음</div>')+(list.length>limits[s]?'<button class="btn" data-more="'+s+'">더 보기 ('+Math.min(limits[s],list.length)+'/'+list.length+')</button>':'')+'</section>';}).join('');
 $('board').querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>detail(b.dataset.id));$('board').querySelectorAll('[data-more]').forEach(b=>b.onclick=()=>{limits[b.dataset.more]+=50;renderBoard();});
}
function renderBackup(){
 const m=readMeta();let status='내보내기 기록 없음',cls='danger';
 if(m.exportRequestedAt){const days=(Date.now()-m.exportRequestedAt)/86400000;status='파일 생성 요청: '+date(m.exportRequestedAt)+' · '+esc(m.kind||'')+' · '+Number(m.count||0)+'건';cls=days>7?'danger':days>3?'':'ok';if(m.fingerprint!==C.fingerprint(data)){status+=' · 이후 변경됨: 다시 내보내세요';cls='danger';}}
 $('backupBar').className='backupbar '+cls;
 $('backupBar').innerHTML='<b>v2.1 · 이 브라우저 전용 저장</b> · 서버 DB·로그인·PC 간 동기화 없음<br>'+status+'<br>다운로드 요청은 파일 저장·시트 업로드 확인이 아닙니다. '+(m.sheetAcknowledgedAt?'시트 보관 사용자 기록: '+date(m.sheetAcknowledgedAt)+' (자동 검증 안 됨)':'시트 보관 미확인')+'<div class="row"><button class="btn" id="jsonBackup">전체 JSON 내보내기</button><button class="btn" id="sheetAck">시트 보관 기록(수동)</button><button class="btn" id="syncTabs">다른 탭 변경 불러오기</button></div><div>JSON은 ID·접수일·메모를 보존합니다. 토큰은 제외됩니다. 통합DB CSV는 21열 연락처 사본이며 메모·접수일 완전 복구용이 아닙니다.<br>개인정보는 이 PC 저장소·백업 파일에 평문으로 남습니다. 마스킹은 화면 가림 기능이지 인증·암호화가 아닙니다.</div>';
 $('jsonBackup').onclick=()=>exportData('json');
 $('sheetAck').onclick=()=>{if(!confirm('Google Sheets에 실제 보관했는지 직접 확인하셨나요? 이 기록은 서버 백업을 검증하지 않습니다.'))return;const m=readMeta();m.sheetAcknowledgedAt=Date.now();metaWrite(m);renderBackup();};
 $('syncTabs').onclick=()=>{state=store.read();data=state.data;tabChanged=false;document.querySelectorAll('.overlay.on').forEach(x=>hideModal(x.id));render();notice('현재 브라우저 저장소를 다시 읽었습니다. PC 간 동기화는 아닙니다.');};
}

function renderRecruitment(d){
 const tr=d.tracking||{},campaigns=Array.isArray(d.campaigns)?d.campaigns:[],stamp=d.updated_at?new Date(d.updated_at).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}):'확인 불가';
 $('recruitStatus').className='banner';$('recruitStatus').textContent='마지막 집계: '+stamp+' · 60초마다 자동 갱신 · 읽기 전용';
 $('recruitKpis').innerHTML=[['SMTP 접수 성공',Number(d.smtp_success)||0],['고유 수신 주소',Number(d.unique_recipients)||0],['실패 이력',Number(d.failed_attempts)||0],['억제 주소',Number(d.suppressed_count)||0],['오픈 / 클릭',(Number(tr.opened)||0)+' / '+(Number(tr.clicked)||0)]].map(x=>'<div class="stat"><div class="n">'+esc(x[1])+'</div><div class="l">'+esc(x[0])+'</div></div>').join('');
 const max=Math.max(1,...campaigns.map(x=>Number(x.success)||0));
 $('recruitCampaigns').innerHTML=campaigns.map(x=>{const success=Number(x.success)||0,failed=Number(x.failed)||0;return '<article class="mcard"><h4>'+esc(x.name||'이름 없는 캠페인')+'</h4><div class="source">sender.py 집계</div><div class="bar"><i style="width:'+Math.round(success/max*100)+'%"></i></div><div class="nums"><span><b>'+success+'</b> 성공</span><span><b>'+failed+'</b> 실패</span></div></article>';}).join('')||'<div class="banner">캠페인 집계가 없습니다.</div>';
}
async function loadRecruitment(){
 const status=$('recruitStatus');if(!status)return;status.className='banner';status.textContent='모집 상태를 불러오는 중...';
 try{const res=await fetch(SENDER_DATA+'?t='+Date.now(),{cache:'no-store'});if(!res.ok)throw Error('HTTP '+res.status);renderRecruitment(await res.json());}
 catch(e){$('recruitKpis').innerHTML='';$('recruitCampaigns').innerHTML='';status.className='banner err';status.textContent='실시간 모집 상태를 불러오지 못했습니다. sender 대시보드에서 확인하세요.';}
}
function openForm(id){
 document.querySelectorAll('.modalMessage').forEach(e=>e.remove());
 editingId=id||null;const r=data.find(x=>x.id===id);$('formTitle').textContent=r?'지원자 수정':'지원자 추가';
 for(const field of ['name','phone','email','interest','source','motive']){const el=$('f_'+field);el.value=r?r[field]:el.tagName==='SELECT'?el.options[0].value:'';if(r&&el.tagName==='SELECT'&&el.value!==r[field]){el.add(new Option(r[field],r[field]));el.value=r[field];}}
 $('formPrivacy').textContent='입력·수정 화면에는 실제 연락처가 표시됩니다. 화면 공유 중에는 열지 마세요.';showModal('formOverlay');
}
function saveForm(){
 const p={};for(const f of ['name','phone','email','interest','source','motive'])p[f]=$('f_'+f).value.trim();
 if(!p.name){$('f_name').focus();notice('이름을 입력해 주세요.',true);return;}
 const ph=C.phone(p.phone);if(ph.length<7||ph.length>15){$('f_phone').focus();notice('연락처는 국가번호 포함 7~15자리 숫자를 입력해 주세요.',true);return;}
 if(p.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)){notice('이메일 형식을 확인해 주세요.',true);$('f_email').focus();return;}
 const dupe=data.find(r=>r.id!==editingId&&((C.phone(r.phone)&&C.phone(r.phone)===ph)||(p.email&&C.email(r.email)===C.email(p.email))));
 if(dupe){notice('동일 연락처 또는 이메일의 지원자가 있습니다. 기존 레코드를 확인해 주세요.',true);return;}
 const next=structuredClone(data);if(editingId){const r=next.find(x=>x.id===editingId);if(!r){notice('다른 탭에서 레코드가 변경됐습니다.',true);return;}Object.assign(r,p);}else next.push({id:C.uid(),...p,stage:'new',createdAt:Date.now(),notes:[]});
 if(saveCandidate(next))hideModal('formOverlay');
}
function detail(id){
 const d=data.find(x=>x.id===id);if(!d)return;
 $('detailModal').innerHTML='<h2 id="detailTitle">'+esc(d.name)+'</h2><div class="stagepick">'+C.STAGES.map((s,i)=>'<button data-stage="'+s+'" aria-pressed="'+(s===d.stage)+'" class="'+(s===d.stage?'active':'')+'">'+C.LABELS[i]+'</button>').join('')+'</div>'+[['연락처',phone(d.phone)],['이메일',email(d.email)],['관심분야',d.interest],['유입경로',d.source],['지원동기',d.motive],['접수일',date(d.createdAt)]].map(([k,v])=>'<div class="drow"><div class="k">'+k+'</div><div class="v">'+esc(v||'-')+'</div></div>').join('')+'<h3>상담 메모</h3><div class="field"><label for="noteInput">메모 추가</label><input id="noteInput" maxlength="10000" placeholder="메모 추가 후 Enter"><button class="btn" id="noteAdd">추가</button></div>'+d.notes.slice().reverse().map(n=>'<div class="note">'+esc(n.text)+'<div class="t">'+date(n.ts)+'</div></div>').join('')+'<div class="modalft"><button class="btn ghost" id="deleteLead">삭제</button><div class="spacer"></div><button class="btn" id="editLead">수정</button><button class="btn primary" id="closeLead">닫기</button></div>';
 $('detailModal').querySelectorAll('[data-stage]').forEach(b=>b.onclick=()=>{if(change(id,r=>{r.stage=b.dataset.stage;}))detail(id);});
 $('noteAdd').onclick=()=>{const t=$('noteInput').value.trim();if(t&&change(id,r=>r.notes.push({text:t,ts:Date.now()})))detail(id);};
 $('noteInput').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();$('noteAdd').click();}};
 $('deleteLead').onclick=()=>{if(confirm('이 지원자를 삭제할까요? 삭제 전 JSON 내보내기를 권장합니다.')&&saveCandidate(data.filter(x=>x.id!==id)))hideModal('detailOverlay');};
 $('editLead').onclick=()=>{hideModal('detailOverlay');openForm(id);};$('closeLead').onclick=()=>hideModal('detailOverlay');
 if(!$('detailOverlay').classList.contains('on'))showModal('detailOverlay');
}
function exportData(kind){
 if(state.blocked){notice('저장소 오류 상태에서는 원본을 직접 보존해야 합니다.',true);return;}
 if(!confirm('개인정보 '+data.length+'건이 평문 파일에 포함됩니다. 안전한 위치에 보관하고 공유하지 마세요. 계속할까요?'))return;
 const json=kind==='json';const content=json?JSON.stringify({app:'varis-crm',version:3,exportedAt:new Date().toISOString(),count:data.length,data},null,2):C.csv(kind==='unified'?C.unifiedRows(data):C.basicRows(data));
 const blob=new Blob([content],{type:json?'application/json':'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='varis_crm_'+kind+'_'+new Date().toISOString().replace(/[:.]/g,'-')+'.'+(json?'json':'csv');document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
 const m=readMeta();m.exportRequestedAt=Date.now();m.kind=kind;m.count=data.length;m.fingerprint=C.fingerprint(data);delete m.lastBackup;metaWrite(m);renderBackup();notice('파일 생성을 요청했습니다. 브라우저 다운로드 목록에서 파일 저장을 확인해 주세요.');
}
async function restoreFile(file){
 try{if(state.blocked||tabChanged)throw Error('저장소 오류 또는 다른 탭 변경을 먼저 확인해 주세요.');if(file.size>5*1024*1024)throw Error('복원 파일은 5MB 이하여야 합니다.');const parsed=C.importText(await file.text(),file.name);const plan=C.planMerge(data,parsed.records);pendingImport={plan,before:C.fingerprint(data)};
 const s=plan.summary;$('restoreSummary').textContent='읽은 레코드 '+parsed.records.length+'건 · 추가 '+s.added+' · 빈 필드/메모 보완 '+s.merged+' · 변경 없음 '+s.unchanged+' · 충돌 '+s.conflicts+'건. 충돌 값은 덮어쓰지 않습니다.';
 $('restoreWarning').textContent=(parsed.lossy?'이 CSV는 ID·메모·접수일을 완전히 복원하지 못할 수 있습니다. ':'')+(parsed.ignoredTokens?'구버전 파일에 포함된 메일 토큰은 가져오지 않습니다. ':'')+'적용 전 기존 데이터 JSON 백업을 권장합니다. 복원은 백업 완료로 기록되지 않습니다.';showModal('restoreOverlay');
 }catch(e){notice('가져오기 중단: '+e.message,true);}
}
function applyImport(){if(!pendingImport)return;if(C.fingerprint(data)!==pendingImport.before){notice('미리보기 후 데이터가 바뀌었습니다. 파일을 다시 선택해 주세요.',true);hideModal('restoreOverlay');return;}if(saveCandidate(pendingImport.plan.next)){notice('가져오기를 적용했습니다. 충돌 값은 보존했습니다.');pendingImport=null;hideModal('restoreOverlay');}}
function seed(){if(!confirm('명확히 표시된 데모 1건을 추가할까요? 실제 연락처가 아닌 example.invalid 주소만 사용합니다.'))return;saveCandidate([...data,{id:C.uid(),name:'데모 지원자',phone:'',email:'demo@example.invalid',interest:'생성형 AI 콘텐츠',source:'데모',motive:'연습용 데이터입니다. 실제 리드가 아닙니다.',stage:'new',createdAt:Date.now(),notes:[],demo:true}]);}
function switchView(v){document.querySelectorAll('.nav button').forEach(b=>{b.classList.toggle('on',b.dataset.view===v);b.setAttribute('aria-pressed',String(b.dataset.view===v));});$('view-crm').classList.toggle('on',v==='crm');$('view-mail').classList.toggle('on',v==='mail');$('view-recruitment').classList.toggle('on',v==='recruitment');document.querySelectorAll('header .btn').forEach(b=>b.hidden=v!=='crm');if(v==='recruitment')loadRecruitment();}
$('exportBtn').onclick=()=>exportData('basic');$('backupBtn').onclick=()=>exportData('unified');$('sheetBtn').onclick=()=>window.open(SHEET,'_blank','noopener,noreferrer');
$('restoreBtn').onclick=()=>$('restoreFile').click();$('restoreFile').onchange=e=>{if(e.target.files[0])restoreFile(e.target.files[0]);e.target.value='';};
$('maskBtn').onclick=()=>{if(maskOn&&!confirm('연락처와 이메일을 화면에 표시할까요? 화면 공유 여부를 확인해 주세요.'))return;maskOn=!maskOn;render();};
$('addBtn').onclick=()=>openForm();$('seedBtn').onclick=seed;$('formSave').onclick=saveForm;$('formCancel').onclick=()=>hideModal('formOverlay');$('applyImport').onclick=applyImport;$('cancelImport').onclick=()=>{pendingImport=null;hideModal('restoreOverlay');};
let timer;$('search').oninput=()=>{clearTimeout(timer);timer=setTimeout(()=>{C.STAGES.forEach(s=>limits[s]=50);renderBoard();},120);};$('interestFilter').onchange=()=>{C.STAGES.forEach(s=>limits[s]=50);renderBoard();};
for(const b of document.querySelectorAll('.nav button'))b.onclick=()=>switchView(b.dataset.view);
$('recruitRefresh').onclick=loadRecruitment;
window.setInterval(()=>{if(document.querySelector('#view-recruitment.on'))loadRecruitment();},60000);
for(const overlay of document.querySelectorAll('.overlay'))overlay.onclick=e=>{if(e.target===overlay)hideModal(overlay.id);};
document.addEventListener('keydown',e=>{const modal=document.querySelector('.overlay.on');if(!modal)return;if(e.key==='Escape'){hideModal(modal.id);return;}if(e.key==='Tab'){const f=[...modal.querySelectorAll('button,input,select,textarea,a[href]')].filter(x=>!x.disabled);if(!f.length)return;const first=f[0],last=f[f.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
window.addEventListener('storage',e=>{if(e.key===KEY||e.key===null){tabChanged=true;for(const id of ['addBtn','restoreBtn','seedBtn'])$(id).disabled=true;notice('다른 탭에서 저장소가 변경됐습니다. 입력 내용을 복사한 뒤 [다른 탭 변경 불러오기]로 새로 읽어주세요. 자동 덮어쓰기는 차단됩니다.',true);}});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&!maskOn){maskOn=true;render();if($('detailOverlay').classList.contains('on'))hideModal('detailOverlay');if($('formOverlay').classList.contains('on'))hideModal('formOverlay');}});
render();
