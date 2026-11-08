import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
const excluded = new Set(['.git','.next','.meznest','node_modules','dist','build']);
export function inventory(root, prefix = '', result = {}) {
  for (const entry of fs.readdirSync(path.join(root,prefix), {withFileTypes:true})) {
    if (excluded.has(entry.name) || entry.isSymbolicLink()) continue;
    const name=path.join(prefix,entry.name);
    if(entry.isDirectory()) inventory(root,name,result);
    else if(entry.isFile()) result[name]=createHash('sha256').update(fs.readFileSync(path.join(root,name))).digest('hex');
  }
  return result;
}
export function prepareCopies(workspace, root, roles) {
  const baseline=inventory(workspace); fs.mkdirSync(root,{recursive:true});
  for(const role of roles) {
    const target=path.join(root,role); fs.mkdirSync(target,{recursive:true});
    for(const file of Object.keys(baseline)) { fs.mkdirSync(path.dirname(path.join(target,file)),{recursive:true}); fs.copyFileSync(path.join(workspace,file),path.join(target,file)); }
    // Dependencies are read-only inputs by instruction; source files remain isolated.
    if(fs.existsSync(path.join(workspace,'node_modules'))) fs.symlinkSync(path.join(workspace,'node_modules'),path.join(target,'node_modules'),'junction');
  }
  return baseline;
}
export function integrateCopies(workspace, root, roles, baseline) {
  const current=inventory(workspace), changes=new Map();
  for(const role of roles) {
    const folder=path.join(root,role), files=inventory(folder);
    for(const name of new Set([...Object.keys(baseline),...Object.keys(files)])) {
      if(files[name]===baseline[name])continue;
      if(current[name]!==baseline[name] && current[name]!==files[name])throw Error(`Integration conflict: ${name}. Your project edits were preserved.`);
      const previous=changes.get(name);
      if(previous && previous.hash!==files[name])throw Error(`Both engineers changed ${name}. Resolve their copies before retrying.`);
      changes.set(name,{hash:files[name],source:path.join(folder,name)});
    }
  }
  for(const [name,change] of changes) {
    const target=path.join(workspace,name);
    if(change.hash===undefined) { if(fs.existsSync(target))fs.unlinkSync(target); }
    else { fs.mkdirSync(path.dirname(target),{recursive:true}); fs.copyFileSync(change.source,target); }
  }
  return [...changes.keys()];
}
