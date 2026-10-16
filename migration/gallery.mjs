// Node 22+ built-ins only. Default mode is offline. No automatic publishing/deleting/updating.
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath, pathToFileURL} from 'node:url';
import path from 'node:path';

export const PROJECT = 'abufysa8';
export const DATASET = 'production';
const API = `https://${PROJECT}.api.sanity.io/v2025-02-19`;
const root = fileURLToPath(new URL('../', import.meta.url));

export async function validateManifest(manifest) {
  if (manifest.version !== 1 || manifest.projectId !== PROJECT || manifest.dataset !== DATASET ||
      manifest.projects?.length !== 4) throw new Error('Unexpected manifest target or shape');
  const expected = [4, 8, 9, 4];
  for (const [index, project] of manifest.projects.entries()) {
    if (project.documentId !== `gallery-import-projekt${index + 1}` ||
        project.sourceKey !== `static-gallery/projekt${index + 1}` ||
        !project.title || !project.location || project.displayOrder !== (index + 1) * 10 ||
        project.photographs.length !== expected[index]) throw new Error('Unexpected project or ordering');
    for (const [photoIndex, photo] of project.photographs.entries()) {
      if (photo.sourcePath !== `slike/projekt${index + 1}/${photoIndex + 1}.webp` ||
          photo._key !== `photo-${photoIndex + 1}` || !photo.alt) throw new Error('Unexpected photograph');
      const bytes = await readFile(path.join(root, photo.sourcePath));
      if (bytes.length !== photo.bytes || createHash('sha1').update(bytes).digest('hex') !== photo.sha1) {
        throw new Error(`Image changed: ${photo.sourcePath}`);
      }
    }
  }
}

export function documentFor(project, assetIds) {
  return {
    _id: `drafts.${project.documentId}`, _type: 'galleryProject',
    migrationSource: project.sourceKey, title: project.title, location: project.location,
    category: project.category, displayOrder: project.displayOrder,
    photographs: project.photographs.map((photo, index) => ({
      _type: 'galleryPhotograph', _key: photo._key, alt: photo.alt,
      asset: {_type: 'reference', _ref: assetIds[index]},
    })),
  };
}

export function differences(project, document) {
  const issues = [];
  for (const field of ['title', 'location', 'category', 'displayOrder']) {
    if (document[field] !== project[field]) issues.push(field);
  }
  if (document.photographs?.length !== project.photographs.length) issues.push('photo count');
  project.photographs.forEach((photo, index) => {
    const actual = document.photographs?.[index];
    if (!actual || actual._key !== photo._key || actual.alt !== photo.alt || actual.caption ||
        actual.asset?.sha1hash !== photo.sha1) issues.push(`photo ${index + 1} metadata/order/asset`);
  });
  return issues;
}

export async function migrate(manifest, {mode = 'offline', request = fetch, token = '', confirm = ''} = {}) {
  if (!['offline', 'inspect', 'write', 'verify', 'verify-published'].includes(mode)) throw new Error('Unknown mode');
  await validateManifest(manifest);
  if (mode === 'offline') return {mode, projects: 4, photographs: 25, writes: 0};
  if (!token) throw new Error('Set SANITY_AUTH_TOKEN in this terminal; never put it in a source file.');
  if (mode === 'write' && confirm !== `${PROJECT}/${DATASET}`) throw new Error('Write requires --confirm=abufysa8/production');

  async function api(endpoint, options = {}) {
    const response = await request(API + endpoint, {
      ...options, signal: AbortSignal.timeout(60000),
      headers: {Authorization: `Bearer ${token}`, ...options.headers},
    });
    if (!response.ok) throw new Error(`Sanity request failed (${response.status}); no response body logged.`);
    const data = await response.json();
    if (data.error) throw new Error('Sanity returned an API error.');
    return data;
  }
  async function query(groq, params = {}, perspective = 'raw') {
    const search = new URLSearchParams({query: groq, perspective});
    for (const [key, value] of Object.entries(params)) search.set(`$${key}`, JSON.stringify(value));
    const result = (await api(`/data/query/${DATASET}?${search}`)).result;
    if (!Array.isArray(result)) throw new Error('Unexpected Sanity query response');
    return result;
  }
  async function existing(project, published = false) {
    // Reserved IDs must be checked independently of document type.
    return query(`*[(_type == "galleryProject" && migrationSource == $source)
      || _id in [$id, $draft] || _id match $versions]{
        ..., photographs[]{..., asset->{_id, sha1hash, url}}
      }`, {source: project.sourceKey, id: project.documentId, draft: `drafts.${project.documentId}`,
      versions: `versions.*.${project.documentId}`}, published ? 'published' : 'raw');
  }

  const report = {mode, projects: [], writes: 0, conflicts: [], blocked: false};
  // Complete read preflight before any uploads or document mutations.
  // Always use raw here, including when verifying published content, to see drafts/releases.
  let inventory = await Promise.all(manifest.projects.map((project) => existing(project)));
  for (const [index, documents] of inventory.entries()) {
    for (const doc of documents) {
      if (doc._type !== 'galleryProject') {
        report.conflicts.push({source: manifest.projects[index].sourceKey, id: doc._id, type: doc._type,
          reason: 'Reserved migration ID belongs to another document type'});
      }
    }
  }
  if (report.conflicts.length) {
    report.blocked = true;
    return report;
  }
  if (mode === 'verify-published') {
    inventory = await Promise.all(manifest.projects.map((project) => existing(project, true)));
  }
  for (const [index, project] of manifest.projects.entries()) {
    const found = inventory[index];
    if (found.length) {
      const documents = found.map((doc) => ({id: doc._id, differences: differences(project, doc)}));
      report.projects.push({source: project.sourceKey, action: 'skip-existing', documents});
      continue;
    }
    if (mode !== 'write') {
      report.projects.push({source: project.sourceKey, action: 'missing'});
      continue;
    }
    const ids = [];
    for (const photo of project.photographs) {
      const assets = await query('*[_type == "sanity.imageAsset" && sha1hash == $hash]{_id}', {hash: photo.sha1});
      let id = assets[0]?._id;
      if (!id) {
        const bytes = await readFile(path.join(root, photo.sourcePath));
        const upload = await api(`/assets/images/${DATASET}?filename=${encodeURIComponent(path.basename(photo.sourcePath))}`, {
          method: 'POST', headers: {'Content-Type': 'image/webp'}, body: bytes,
        });
        id = upload.document?._id;
        report.writes++;
      }
      if (!id) throw new Error('Asset upload returned no ID');
      ids.push(id);
    }
    // Recheck after uploads. createIfNotExists also prevents concurrent draft replacement.
    const rechecked = await existing(project);
    const collisions = rechecked.filter((doc) => doc._type !== 'galleryProject');
    if (collisions.length) {
      report.conflicts.push(...collisions.map((doc) => ({source: project.sourceKey, id: doc._id,
        type: doc._type, reason: 'Reserved migration ID appeared during upload'})));
      report.blocked = true;
      return report;
    }
    if (rechecked.length) {
      report.projects.push({source: project.sourceKey, action: 'skip-created-during-upload'});
      continue;
    }
    await api(`/data/mutate/${DATASET}?visibility=sync`, {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({mutations: [{createIfNotExists: documentFor(project, ids)}]}),
    });
    report.writes++;
    report.projects.push({source: project.sourceKey, action: 'create-draft-if-absent'});
  }
  if (mode.startsWith('verify')) {
    report.verified = report.projects.every((p) => p.documents?.length &&
      p.documents.every((doc) => doc.differences.length === 0));
    // Compare actual unique asset hashes to the reviewed source, which may contain duplicates.
    report.expectedProjects = 4;
    report.expectedPhotographs = 25;
  }
  return report;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    const args = process.argv.slice(2);
    const supported = ['--inspect', '--write', '--verify', '--verify-published'];
    if (args.some((arg) => !supported.includes(arg) && !arg.startsWith('--confirm=')) ||
        args.filter((arg) => supported.includes(arg)).length > 1) throw new Error('Use one mode: --inspect, --write, --verify, --verify-published; no mode is offline.');
    const mode = args.find((arg) => supported.includes(arg))?.slice(2) || 'offline';
    const manifest = JSON.parse(await readFile(new URL('./gallery-manifest.json', import.meta.url), 'utf8'));
    const report = await migrate(manifest, {mode, token: process.env.SANITY_AUTH_TOKEN,
      confirm: args.find((arg) => arg.startsWith('--confirm='))?.slice('--confirm='.length)});
    console.log(JSON.stringify(report, null, 2));
    if (report.blocked || report.verified === false) process.exitCode = 1;
  } catch (error) {
    // Never print request headers, token values, or raw HTTP errors.
    console.error(error.message);
    process.exitCode = 1;
  }
}
