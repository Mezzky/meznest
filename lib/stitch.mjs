import { Stitch, StitchToolClient, Screen } from '@google/stitch-sdk';
import fs from 'node:fs';
import path from 'node:path';

export class StitchConnection {
  constructor() { this.models = []; this.status = 'disconnected'; }
  async connect(apiKey) {
    if (typeof apiKey !== 'string' || !apiKey.trim()) throw new Error('Enter your Stitch API key.');
    const client = new StitchToolClient({ apiKey: apiKey.trim(), timeout: 240000 });
    try {
      const tools = await client.listTools();
      const api = new Stitch(client);
      await api.projects();
      const generation = tools.tools.find(t => t.name === 'generate_screen_from_text');
      if (!generation) throw new Error('Generation is unavailable.');
      const values = generation.inputSchema?.properties?.modelId?.enum || [];
      await this.client?.close();
      this.client = client; this.api = api;
      this.models = values.filter(v => v !== 'MODEL_ID_UNSPECIFIED').map(model => ({ model, displayName: model.replaceAll('_', ' ') }));
      this.status = 'connected';
    } catch { await client.close().catch(() => {}); throw new Error('Could not connect to Stitch. Check your key and account access.'); }
  }
  snapshot() { return { status: this.status, models: this.models }; }
  async readScreen(projectId, screenId) {
    const name = 'projects/' + projectId + '/screens/' + screenId;
    // Do not send both the canonical resource name and deprecated ID fields.
    const data = await this.client.callTool('get_screen', { name });
    return new Screen(this.client, { ...data, projectId, id: screenId });
  }
  async generate(project, task, model, save) {
    if (!this.api) throw new Error('Connect Google Stitch in Team first.');
    const remote = project.stitchProjectId ? this.api.project(project.stitchProjectId) : await this.api.createProject(project.name);
    project.stitchProjectId = remote.id; save();
    const prompt = task.brief + '\n\nTeam handoff:\n' + task.history.map(h => h.text).join('\n');
    let screen;
    if (task.stitch?.screenId) {
      screen = await this.readScreen(task.stitch.projectId, task.stitch.screenId);
    } else {
      screen = project.stitchScreenId
        ? await (await this.readScreen(remote.id, project.stitchScreenId)).edit(prompt, 'DESKTOP', model || undefined)
        : await remote.generate(prompt, 'DESKTOP', model || undefined);
    }
    project.stitchScreenId = screen.id;
    task.stitch = { projectId: remote.id, screenId: screen.id }; save();
    const directory = path.join(task.workspace, 'design', 'stitch', task.id);
    fs.mkdirSync(directory, { recursive: true });
    const artifacts = [];
    const warnings = [];
    if (!screen.data?.htmlCode?.downloadUrl && !screen.data?.screenshot?.downloadUrl) screen = await this.readScreen(remote.id, screen.id);
    const htmlUrl = screen.data?.htmlCode?.downloadUrl;
    const imageUrl = screen.data?.screenshot?.downloadUrl;
    if (!htmlUrl && !imageUrl) throw new Error('Stitch created the design but exports are not ready. Retry to download the existing screen.');
    const imageName = screen.data?.screenshot?.mimeType === 'jpeg' || screen.data?.screenshot?.mimeType === 'image/jpeg' ? 'screen.jpg' : 'screen.png';
    for (const [name, url] of [['screen.html', htmlUrl], [imageName, imageUrl]].filter(([, url]) => !!url)) {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:' || !['googleusercontent.com','googleapis.com','gstatic.com'].some(host => parsed.hostname === host || parsed.hostname.endsWith('.' + host))) throw new Error('Stitch returned an unsupported download host.');
      const response = await fetch(url, { signal: AbortSignal.timeout(60000), redirect: 'error' });
      if (!response.ok) { warnings.push(name + ': download returned HTTP ' + response.status + '. Open the Stitch project to view or export this file.'); continue; }
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length > 25000000) throw new Error('Stitch artifact is too large.');
      const file = path.join(directory, name); fs.writeFileSync(file, bytes); artifacts.push({ name, file });
    }
    const reference = path.join(directory, 'stitch-reference.json');
    fs.writeFileSync(reference, JSON.stringify({ ...task.stitch, title: screen.data?.title, warnings }, null, 2));
    artifacts.push({name:'stitch-reference.json',file:reference});
    task.artifacts = artifacts;
    task.exportWarning = warnings.join(' ');
    return 'Stitch design created. Files saved in ' + directory + '. Saved files: ' + artifacts.map(a => a.name).join(', ') + (warnings.length ? '. Export warning: ' + warnings.join(' ') + ' Do not claim missing exports were downloaded.' : '') + (htmlUrl ? '. Use these files as the implementation reference.' : '. Stitch returned an image-only design; no HTML was provided.') + ' Stitch project: ' + remote.id + ', screen: ' + screen.id;
  }
  async close() { await this.client?.close(); this.client = null; this.api = null; this.status = 'disconnected'; this.models = []; }
}
