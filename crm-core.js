/* VARIS CRM 2.1: pure, testable data rules. No browser storage or network. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CrmCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const STAGES=['new','consult','interview','enrolled','hold'];
const LABELS=['신규 접수','상담 예정','면접','등록 완료','보류/미등록'];
const HEAD=['연락처ID','분류','프로젝트/소속','기수','이름','연락처','이메일','직책/역할','관리상태','응답/참석 상태','유입경로','과정','운영 메모','원본 시트','연락처 유형','공개출처 URL','수신동의상태','동의일시','수신거부','최종검증일','발송상태'];
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const phone=s=>String(s||'').replace(/\D/g,'');
const email=s=>String(s||'').trim().toLowerCase();
const uid=()=>globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2);
function text(v,field,max=5000){if(v==null)return '';if(typeof v!=='string')throw Error(field+'는 문자열이어야 합니다.');if(v.length>max)throw Error(field+' 길이 초과');return v.trim();}
function timestamp(v,fallback){if(v==null||v==='')return fallback;const n=typeof v==='number'?v:Date.parse(v);if(!Number.isFinite(n)||n<1||n>Date.now()+86400000)throw Error('날짜 형식 오류');return n;}
function record(r){
 if(!r||typeof r!=='object'||Array.isArray(r))throw Error('레코드 형식 오류');
 const out={id:r.id?text(r.id,'ID',100):uid(),name:text(r.name,'이름',200),phone:text(r.phone,'연락처',200),email:text(r.email,'이메일',500),interest:text(r.interest,'관심분야',300),source:text(r.source,'유입경로',300),motive:text(r.motive,'지원동기',20000),stage:r.stage||'new',createdAt:timestamp(r.createdAt,Date.now()),notes:[]};
 if(!/^[a-zA-Z0-9_-]+$/.test(out.id))throw Error('ID 형식 오류');
 if(!out.name&&!out.phone&&!out.email)throw Error('이름·연락처·이메일이 모두 비어 있습니다.');
 if(!STAGES.includes(out.stage))throw Error('알 수 없는 단계: '+String(out.stage));
 if(r.notes!=null&&!Array.isArray(r.notes))throw Error('메모 형식 오류');
 if((r.notes||[]).length>2000)throw Error('메모 개수 초과');
 out.notes=(r.notes||[]).map(n=>{if(!n||typeof n!=='object')throw Error('메모 형식 오류');return {text:text(n.text,'메모',10000),ts:timestamp(n.ts,out.createdAt)};});
 if(r.demo===true)out.demo=true;
 return out;
}
function records(a){if(!Array.isArray(a)||a.length>10000)throw Error('지원자 배열 형식 또는 10,000건 제한 오류');return a.map(record);}
function parseCsv(raw){
 const s=String(raw).replace(/^\uFEFF/,'');const rows=[];let row=[],cell='',quoted=false,closed=false;
 const pushCell=()=>{row.push(cell);cell='';closed=false;};
 const pushRow=()=>{pushCell();if(row.some(c=>c!==''))rows.push(row);row=[];};
 for(let i=0;i<s.length;i++){
  const c=s[i];if(quoted){if(c==='"'){if(s[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=c;continue;}
  if(c===','){pushCell();continue;}if(c==='\r'||c==='\n'){if(c==='\r'&&s[i+1]==='\n')i++;pushRow();continue;}
  if(c==='"'&&cell===''&&!closed){quoted=true;continue;}if(closed)throw Error('CSV 인용부호 뒤 구분자 오류');if(c==='"')throw Error('CSV 인용부호 오류');cell+=c;
 }
 if(quoted)throw Error('CSV 인용부호가 닫히지 않았습니다.');if(cell!==''||row.length||closed)pushRow();return rows;
}
function safeCell(v){let s=String(v??'');if(/^[\s\uFEFF]*[=+\-@]/.test(s)||/^[\t\r]/.test(s))s="'"+s;return s;}
function csv(rows){return '\uFEFF'+rows.map(r=>r.map(v=>'"'+safeCell(v).replace(/"/g,'""')+'"').join(',')).join('\r\n');}
function unifiedRows(a){return [HEAD,...a.map(r=>['CRM-'+r.id,'지원자','VARIS','',r.name,r.phone,r.email,'',LABELS[STAGES.indexOf(r.stage)],'',r.source,r.interest,[r.motive,...r.notes.map(n=>'[상담 메모] '+n.text)].filter(Boolean).join('\n'),'crm.varis.kr','개인','','미확인','','','',''])];}
function basicRows(a){return [['이름','연락처','이메일','관심분야','유입경로','단계','지원동기','접수일','CRM ID','상담메모 JSON'],...a.map(r=>[r.name,r.phone,r.email,r.interest,r.source,LABELS[STAGES.indexOf(r.stage)],r.motive,new Date(r.createdAt).toISOString(),r.id,JSON.stringify(r.notes)])];}
function importText(raw,filename){
 if(raw.length>5*1024*1024)throw Error('복원 파일은 5MB 이하여야 합니다.');
 if(/\.json$/i.test(filename)){
  const j=JSON.parse(raw);if(!Array.isArray(j)&&(j.app!=='varis-crm'||![2,3].includes(j.version)))throw Error('지원하지 않는 백업 형식입니다.');
  const arr=records(Array.isArray(j)?j:j.data);const ids=new Set();for(const r of arr){if(ids.has(r.id))throw Error('JSON 파일에 중복 ID가 있습니다.');ids.add(r.id);}return {records:arr,lossy:false,ignoredTokens:!Array.isArray(j)&&own(j,'tokens')};
 }
 if(!/\.csv$/i.test(filename))throw Error('JSON 또는 CSV 파일만 지원합니다.');
 const rows=parseCsv(raw);if(rows.length<2)throw Error('CSV 데이터가 없습니다.');const h=rows[0].map(x=>x.trim());
 if(new Set(h).size!==h.length)throw Error('CSV 헤더가 중복됩니다.');
 for(const k of ['이름','연락처','이메일'])if(!h.includes(k))throw Error('CSV 필수 헤더 누락: '+k);
 const unified=h.includes('연락처ID');const out=rows.slice(1).map((row,i)=>{
  if(row.length!==h.length)throw Error('CSV '+(i+2)+'행 열 개수 오류');const g=k=>{let v=row[h.indexOf(k)]||'';return /^'[\s\uFEFF]*[=+\-@]/.test(v)?v.slice(1):v;};
  const label=g(unified?'관리상태':'단계');const stage=label?STAGES[LABELS.indexOf(label)]:'new';if(!stage)throw Error('CSV 단계 오류: '+label);
  const id=g(unified?'연락처ID':'CRM ID');const n=g('상담메모 JSON');
  return record({id:id?(unified?id.replace(/^CRM-/,''):id):undefined,name:g('이름'),phone:g('연락처'),email:g('이메일'),interest:g(unified?'과정':'관심분야'),source:g('유입경로'),motive:g(unified?'운영 메모':'지원동기'),stage,createdAt:g('접수일')||undefined,notes:n?JSON.parse(n):[]});
 });return {records:out,lossy:unified||!h.includes('상담메모 JSON'),ignoredTokens:false};
}
function planMerge(current,incoming){
 const next=records(current);const rows=records(incoming);const summary={added:0,merged:0,conflicts:0,unchanged:0};
 const byId=new Map(),byPhone=new Map(),byEmail=new Map();
 const add=(map,k,i)=>{if(!k)return;const set=map.get(k)||new Set();set.add(i);map.set(k,set);};
 const index=(r,i)=>{byId.set(r.id,i);add(byPhone,phone(r.phone),i);add(byEmail,email(r.email),i);};
 next.forEach(index);
 for(const r of rows){
  const exact=byId.get(r.id)??-1;
  const indices=new Set([...(byPhone.get(phone(r.phone))||[]),...(byEmail.get(email(r.email))||[])]);
  const hits=[...indices].map(i=>({i}));
  if((exact<0&&hits.length>1)||(exact>=0&&hits.some(h=>h.i!==exact))){summary.conflicts++;continue;}
  const at=exact>=0?exact:(hits[0]?.i??-1);
  if(at<0){next.push(r);index(r,next.length-1);summary.added++;continue;}
  const c=next[at];
  const contradiction=(c.name&&r.name&&c.name!==r.name)||(c.phone&&r.phone&&phone(c.phone)!==phone(r.phone))||(c.email&&r.email&&email(c.email)!==email(r.email));
  if(contradiction){summary.conflicts++;continue;}
  const before=JSON.stringify(c);let differences=false;
  for(const f of ['name','phone','email','interest','source','motive']){if(!c[f]&&r[f])c[f]=r[f];else if(c[f]&&r[f]&&c[f]!==r[f])differences=true;}
  if(c.stage!==r.stage)differences=true;
  for(const n of r.notes)if(!c.notes.some(x=>x.text===n.text&&x.ts===n.ts))c.notes.push(n);
  index(c,at);if(differences)summary.conflicts++;
  if(JSON.stringify(c)===before)summary.unchanged++;else summary.merged++;
 }
 return {next,summary};
}
function fingerprint(a){const s=JSON.stringify(a);let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return s.length+':'+(h>>>0).toString(16);}
function createStore(storage,key){
 let raw,data,blocked='';
 function read(){try{const value=storage.getItem(key);const parsed=value?records(JSON.parse(value)):[];const ids=new Set();for(const r of parsed){if(ids.has(r.id))throw Error('중복 ID');ids.add(r.id);}raw=value;data=parsed;blocked='';}catch(e){blocked='저장 데이터를 읽지 못했습니다. 원본을 덮어쓰지 않습니다: '+e.message;data=[];}return {data:structuredClone(data),blocked};}
 function write(candidate){if(blocked)throw Error(blocked);const validated=records(candidate);const ids=new Set();for(const r of validated){if(ids.has(r.id))throw Error('중복 ID');ids.add(r.id);}if(storage.getItem(key)!==raw)throw Error('다른 탭에서 변경했습니다. 동기화 후 다시 시도하세요.');const value=JSON.stringify(validated);storage.setItem(key,value);raw=value;data=validated;return structuredClone(data);}
 return {read,write};
}
return {STAGES,LABELS,HEAD,uid,phone,email,record,records,parseCsv,csv,safeCell,unifiedRows,basicRows,importText,planMerge,fingerprint,createStore};
});
