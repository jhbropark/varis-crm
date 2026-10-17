const ALLOWED_ORIGIN='https://insight.varis.kr';
function setCors(req,res){
  if(String(req.headers.origin||'')===ALLOWED_ORIGIN) res.setHeader('Access-Control-Allow-Origin',ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods','GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Accept');
  res.setHeader('Vary','Origin');
}

module.exports = async function handler(req,res){
  setCors(req,res);
  if(req.method==='OPTIONS'){res.statusCode=204;res.end();return;}
  if(req.method!=='GET'&&req.method!=='HEAD'){res.statusCode=405;res.setHeader('Allow','GET, HEAD, OPTIONS');res.end('Method Not Allowed');return;}
  try{
    const upstream=await fetch('https://sender.varis.kr/data.json?ts='+Date.now(),{cache:'no-store'});
    const body=await upstream.text();
    res.statusCode=upstream.status;
    res.setHeader('Content-Type','application/json; charset=utf-8');
    res.setHeader('Cache-Control','no-store, max-age=0');
    res.end(body);
  }catch(e){
    res.statusCode=502;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify({error:'sender status unavailable'}));
  }
};
