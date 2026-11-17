import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {DatabaseSync} from 'node:sqlite';
function sessionPath(value) { return String(value).replace(/^\\+\?\\+/, '').replace(/\\+/g, path.sep); }
export function readLocalCodex(){
 const home=process.env.CODEX_HOME||path.join(os.homedir(),'.codex');
 const db=new DatabaseSync(path.join(home,'state_5.sqlite'),{readOnly:true});
 try {const rows=db.prepare("SELECT id,cwd,title,name,updated_at,rollout_path,agent_role FROM threads WHERE archived=0 ORDER BY updated_at DESC").all();
 const threads=rows.filter(r=>r.cwd).map(r=>{
 let status='idle',activity='No active turn observed';
 try {const stat=fs.statSync(sessionPath(r.rollout_path)),size=Math.min(stat.size,2*1024*1024),fd=fs.openSync(sessionPath(r.rollout_path),'r'),buffer=Buffer.alloc(size);try{fs.readSync(fd,buffer,0,size,stat.size-size);}finally{fs.closeSync(fd);}
 for(const line of buffer.toString('utf8').split('\n')){try{const e=JSON.parse(line);if(e.type!=='event_msg')continue;const type=e.payload?.type;if(type==='task_started'){status='working';activity='Processing a Codex turn';}if(['task_complete','task_aborted','turn_aborted'].includes(type)){status='idle';activity='Turn finished';}if(type==='agent_message'&&status==='working')activity='Writing an update';}catch{}}
 if(status==='working'&&Date.now()-stat.mtimeMs>300000){status='unknown';activity='No recent activity; turn status unconfirmed';}
 }catch{status='unknown';activity='Activity file unavailable';}
 return {id:String(r.id),workspace:sessionPath(r.cwd),title:(r.name||r.title||'Codex session').split('\n')[0].slice(0,160),updatedAt:r.updated_at,status,activity,role:r.agent_role ? String(r.agent_role) : null};});
 return {capturedAt:new Date().toISOString(),live:true,threads};
 }finally{db.close();}
}

export function readLocalChat(id) {
 const home=process.env.CODEX_HOME||path.join(os.homedir(),'.codex');
 const db=new DatabaseSync(path.join(home,'state_5.sqlite'),{readOnly:true});
 try {
 const row=db.prepare('SELECT rollout_path FROM threads WHERE id=?').get(id);
 if(!row)throw Error('Local Codex chat not found');
 const file=path.resolve(sessionPath(row.rollout_path)),root=path.resolve(home)+path.sep;
 if(!file.toLowerCase().startsWith(root.toLowerCase()))throw Error('Unsupported session location');
 const stat=fs.statSync(file),bytes=Math.min(stat.size,1024*1024),fd=fs.openSync(file,'r'),buffer=Buffer.alloc(bytes);
 try{fs.readSync(fd,buffer,0,bytes,stat.size-bytes);}finally{fs.closeSync(fd);}
 const messages=[];
 for(const line of buffer.toString('utf8').split('\n')){try{const event=JSON.parse(line),p=event.payload;
 if(event.type==='event_msg' && ['user_message','agent_message','task_complete','task_started'].includes(p?.type))messages.push({type:p.type,text:String(p.message||p.last_agent_message|| (p.type==='task_started'?'Work started':'Turn completed')).slice(0,12000),time:event.timestamp});
 }catch{}}
 return {messages:messages.slice(-80),truncated:stat.size>bytes};
 }finally{db.close();}
}
