'use strict';
// The authenticated server owns CRM records. Never copy server PII into localStorage.
window.CrmServer=(()=>{const frame=document.getElementById('serverFrame');let loaded=false;function activate(){if(!loaded){frame.src='https://sign.varis.kr/crm';frame.hidden=false;loaded=true;}}document.getElementById('serverRefresh').addEventListener('click',()=>{frame.src='https://sign.varis.kr/crm';frame.hidden=false;loaded=true;});return{activate};})();
