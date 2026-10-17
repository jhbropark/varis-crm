module.exports = async function handler(req,res){
  if(req.method!=='GET'&&req.method!=='HEAD'){res.statusCode=405;res.setHeader('Allow','GET, HEAD');res.end('Method Not Allowed');return;}
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
