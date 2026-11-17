import fs from 'node:fs';
const brief=fs.readFileSync(process.argv[2]||0,'utf8').trim();
if(!brief)throw Error('Supply the brief as a text file or on stdin.');
const response=await fetch('http://127.0.0.1:4317/api/office',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'team-dispatch',brief,workspace:process.cwd(),sourceThreadId:process.env.CODEX_THREAD_ID})});
const result=await response.json();if(!response.ok)throw Error(result.error);console.log(JSON.stringify(result));
