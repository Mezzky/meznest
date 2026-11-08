import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {OfficeEngine} from '../lib/engine.mjs';
import {prepareCopies,integrateCopies} from '../lib/collaboration.mjs';
test('parallel engineers integrate before review and feedback returns to its owner',async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'meznest-team-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));const workspace=path.join(root,'project');fs.mkdirSync(workspace);fs.writeFileSync(path.join(workspace,'base.txt'),'original');
 const e=new OfficeEngine({directory:path.join(root,'state'),workspace});e.connection={status:'connected'};let id=0;e.request=async method=>method==='thread/start'?{thread:{id:String(++id)}}:{turn:{id:String(id)}};
 const task=e.add({brief:'Build',roles:['frontend','backend','review']});const tick=()=>new Promise(r=>setImmediate(r));await tick();await tick();
 const children=e.state.tasks.filter(x=>x.parentId===task.id);assert.equal(children.length,2);assert.ok(children.every(x=>x.status==='running'));assert.notEqual(children[0].workspace,children[1].workspace);
 for(const c of children){fs.writeFileSync(path.join(c.workspace,c.roles[0]+'.txt'),'done');e.message({method:'turn/completed',params:{threadId:c.threadId,turn:{status:'completed'}}});}
 await tick();assert.equal(task.roles[task.stage],'review');assert.equal(task.status,'running');assert.equal(fs.readFileSync(path.join(workspace,'frontend.txt'),'utf8'),'done');
 task.output='MEZNEST_REVIEW {"verdict":"changes_requested","findings":[{"owner":"backend","description":"Fix API"}]}';e.message({method:'turn/completed',params:{threadId:task.threadId,turn:{status:'completed'}}});await tick();assert.equal(task.roles[task.stage],'backend');
 e.message({method:'turn/completed',params:{threadId:task.threadId,turn:{status:'completed'}}});await tick();task.output='MEZNEST_REVIEW {"verdict":"pass","findings":[]}';e.message({method:'turn/completed',params:{threadId:task.threadId,turn:{status:'completed'}}});await tick();assert.equal(task.status,'done');
});
test('conflicting engineer edits preserve original files',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'meznest-merge-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));const work=path.join(root,'work');fs.mkdirSync(work);fs.writeFileSync(path.join(work,'shared'),'base');const copies=path.join(root,'copies'),base=prepareCopies(work,copies,['frontend','backend']);fs.writeFileSync(path.join(copies,'frontend','shared'),'front');fs.writeFileSync(path.join(copies,'backend','shared'),'back');assert.throws(()=>integrateCopies(work,copies,['frontend','backend'],base),/Both engineers/);assert.equal(fs.readFileSync(path.join(work,'shared'),'utf8'),'base');
});
test('review cannot silently complete without a verdict and retry limit pauses',async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'meznest-review-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));const e=new OfficeEngine({directory:root});e.connection={status:'connected'};let id=0;e.request=async m=>m==='thread/start'?{thread:{id:String(++id)}}:{turn:{id:String(id)}};const tick=()=>new Promise(r=>setImmediate(r));const task=e.add({brief:'Fix',roles:['frontend','review']});await tick();e.message({method:'turn/completed',params:{threadId:task.threadId,turn:{status:'completed'}}});await tick();task.output='Looks fine';e.message({method:'turn/completed',params:{threadId:task.threadId,turn:{status:'completed'}}});assert.equal(task.status,'paused');assert.match(task.error,/structured verdict/);task.reviewRounds=2;e.retry(task.id);await tick();task.output='MEZNEST_REVIEW {"verdict":"changes_requested","findings":[{"owner":"frontend","description":"Still broken"}]}';e.message({method:'turn/completed',params:{threadId:task.threadId,turn:{status:'completed'}}});assert.equal(task.status,'paused');assert.match(task.error,/Three review rounds/);
});
