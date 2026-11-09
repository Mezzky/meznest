import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StitchConnection } from '../lib/stitch.mjs';
test('screen retrieval uses canonical name without deprecated ID arguments', async () => {
 const connection = new StitchConnection();
 connection.client = {callTool:async (tool,args)=>{assert.equal(tool,'get_screen');assert.deepEqual(args,{name:'projects/project1/screens/screen1'});return {htmlCode:{downloadUrl:'https://example.test/screen.html'},screenshot:{downloadUrl:'https://example.test/screen.png'}};}};
 const screen=await connection.readScreen('project1','screen1');assert.equal(screen.id,'screen1');assert.equal(screen.projectId,'project1');
});
import fs from 'node:fs';
import path from 'node:path';
test('retry reuses existing image-only design and reports denied downloads honestly', async t => {
 const root=fs.mkdtempSync(path.join(process.cwd(),'.meznest/stitch-test-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const connection=new StitchConnection();
 connection.api={project:()=>({id:'project1',generate:()=>assert.fail('Must not regenerate')})};
 connection.readScreen=async()=>({id:'screen1',data:{htmlCode:{},screenshot:{downloadUrl:'https://lh3.googleusercontent.com/test',mimeType:'jpeg'}}});
 t.mock.method(globalThis,'fetch',async()=>new Response('',{status:401}));
 const task={id:'task1',workspace:root,brief:'Design',history:[],stitch:{projectId:'project1',screenId:'screen1'}};
 const output=await connection.generate({stitchProjectId:'project1'},task,'',()=>{});
 assert.match(task.exportWarning,/HTTP 401/);
 assert.deepEqual(task.artifacts.map(a=>a.name),['stitch-reference.json']);
 assert.match(output,/no HTML was provided/);
 assert.ok(fs.existsSync(task.artifacts[0].file));
 assert.equal(fs.existsSync(path.join(root,'design/stitch/task1/screen.jpg')),false);
});
test('image-only design downloads without requiring an HTML export', async t => {
 const root=fs.mkdtempSync(path.join(process.cwd(),'.meznest/stitch-test-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const connection=new StitchConnection();connection.api={project:()=>({id:'p'})};
 connection.readScreen=async()=>({id:'s',data:{screenshot:{downloadUrl:'https://lh3.googleusercontent.com/test',mimeType:'jpeg'}}});
 t.mock.method(globalThis,'fetch',async()=>new Response(new Uint8Array([255,216,255]),{status:200}));
 const task={id:'task2',workspace:root,brief:'Design',history:[],stitch:{projectId:'p',screenId:'s'}};
 await connection.generate({stitchProjectId:'p'},task,'',()=>{});
 assert.equal(task.exportWarning,'');assert.deepEqual(task.artifacts.map(a=>a.name),['screen.jpg','stitch-reference.json']);
});
