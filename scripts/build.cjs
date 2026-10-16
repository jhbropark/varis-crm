const fs=require('node:fs');const path=require('node:path');const {Script}=require('node:vm');const root=path.resolve(__dirname,'..');const files=['index.html','app.js','crm-core.js','styles.css'];
for(const f of ['app.js','crm-core.js'])new Script(fs.readFileSync(path.join(root,f),'utf8'));
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');if(/<script\s*>|\son\w+\s*=/i.test(html))throw Error('Inline scripts are forbidden');
const out=path.join(root,'public');fs.mkdirSync(out,{recursive:true});for(const f of files)fs.copyFileSync(path.join(root,f),path.join(out,f));fs.writeFileSync(path.join(out,'robots.txt'),'User-agent: *\nDisallow: /\n');console.log('Built public assets: '+files.length+' files + robots.txt');
