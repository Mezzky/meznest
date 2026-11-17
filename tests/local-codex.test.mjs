import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {readLocalCodex} from '../lib/local-codex.mjs';
test('local prompt starts worker activity and completion stops it',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'meznest-live-')),previous=process.env.CODEX_HOME;process.env.CODEX_HOME=root;
 try{const file=path.join(root,'turn.jsonl'),db=new DatabaseSync(path.join(root,'state_5.sqlite'));db.exec('CREATE TABLE threads(id TEXT,cwd TEXT,title TEXT,name TEXT,updated_at INTEGER,rollout_path TEXT,agent_role TEXT,archived INTEGER)');db.prepare('INSERT INTO threads VALUES(?,?,?,?,?,?,?,0)').run('test','D:/project','Test',null,1,file,'frontend');db.close();
 const event=type=>JSON.stringify({type:'event_msg',payload:{type}})+'\n';
 fs.writeFileSync(file,event('task_started'));assert.equal(readLocalCodex().threads[0].status,'working');
 fs.appendFileSync(file,event('task_complete'));assert.equal(readLocalCodex().threads[0].status,'idle');
 fs.appendFileSync(file,event('task_started'));assert.equal(readLocalCodex().threads[0].status,'working');
 fs.appendFileSync(file,event('turn_aborted'));assert.equal(readLocalCodex().threads[0].status,'idle');
 }finally{if(previous===undefined)delete process.env.CODEX_HOME;else process.env.CODEX_HOME=previous;fs.rmSync(root,{recursive:true,force:true});}
});
