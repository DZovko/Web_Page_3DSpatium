import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {migrate, documentFor} from '../migration/gallery.mjs';

const manifest = JSON.parse(await readFile(new URL('../migration/gallery-manifest.json', import.meta.url), 'utf8'));
const response = (body) => ({ok: true, json: async () => body});
const originalDocument = (project) => ({
  ...documentFor(project, project.photographs.map((photo) => `image-${photo.sha1}-800x600-webp`)),
  photographs: project.photographs.map((photo) => ({
    _key: photo._key, alt: photo.alt, asset: {sha1hash: photo.sha1},
  })),
});

test('offline validates exact 4/8/9/4 original files without network access', async () => {
  const report = await migrate(manifest, {request: () => assert.fail('Network used')});
  assert.equal(report.photographs, 25);
  assert.equal(report.writes, 0);
  assert.ok(!JSON.stringify(manifest).includes('projekt1/5.webp'));
});

test('write mode requires credentials and explicit target confirmation', async () => {
  await assert.rejects(migrate(manifest, {mode: 'write'}), /SANITY_AUTH_TOKEN/);
  await assert.rejects(migrate(manifest, {mode: 'write', token: 'mock'}), /--confirm/);
});

test('an existing edited project is skipped even in write mode', async () => {
  let requests = 0;
  const report = await migrate(manifest, {mode: 'write', token: 'mock', confirm: 'abufysa8/production',
    request: async (_url, options) => {
      assert.equal(options.method, undefined);
      requests++;
      return response({result: [{_id: 'owner-document', _type: 'galleryProject', title: 'Owner edited title'}]});
    }});
  assert.equal(requests, 4);
  assert.equal(report.writes, 0);
  assert.ok(report.projects.every((p) => p.action === 'skip-existing'));
});

test('first import creates only drafts; a rerun performs zero mutations/uploads', async () => {
  const documents = new Map();
  const assets = new Map();
  const mutations = [];
  const request = async (url, options) => {
    const parsed = new URL(url);
    if (parsed.pathname.includes('/data/query/')) {
      const query = parsed.searchParams.get('query');
      if (query.includes('sanity.imageAsset')) {
        const hash = JSON.parse(parsed.searchParams.get('$hash'));
        return response({result: assets.has(hash) ? [{_id: assets.get(hash)}] : []});
      }
      const id = JSON.parse(parsed.searchParams.get('$draft'));
      return response({result: documents.has(id) ? [documents.get(id)] : []});
    }
    if (parsed.pathname.includes('/assets/')) {
      const {createHash} = await import('node:crypto');
      const hash = createHash('sha1').update(options.body).digest('hex');
      const id = `image-${hash}-800x600-webp`;
      assets.set(hash, id);
      return response({document: {_id: id}});
    }
    const body = JSON.parse(options.body);
    assert.deepEqual(Object.keys(body.mutations[0]), ['createIfNotExists']);
    const doc = body.mutations[0].createIfNotExists;
    assert.ok(doc._id.startsWith('drafts.'));
    documents.set(doc._id, doc);
    mutations.push(doc);
    return response({results: []});
  };
  const options = {mode: 'write', token: 'mock', confirm: 'abufysa8/production', request};
  await migrate(manifest, options);
  assert.equal(mutations.length, 4);
  assert.equal(mutations.reduce((n, doc) => n + doc.photographs.length, 0), 25);
  documents.get('drafts.gallery-import-projekt1').title = 'Owner title';
  const rerun = await migrate(manifest, options);
  assert.equal(rerun.writes, 0);
  assert.equal(mutations.length, 4);
  assert.equal(documents.get('drafts.gallery-import-projekt1').title, 'Owner title');
});

test('read-only verification checks metadata, photo order, and asset hashes', async () => {
  let change = false;
  const request = async (url, options) => {
    assert.equal(options.method, undefined);
    const parsed = new URL(url);
    assert.ok(['raw', 'published'].includes(parsed.searchParams.get('perspective')));
    const source = JSON.parse(parsed.searchParams.get('$source'));
    const doc = originalDocument(manifest.projects.find((p) => p.sourceKey === source));
    if (change) doc.photographs.reverse();
    return response({result: [doc]});
  };
  assert.equal((await migrate(manifest, {mode: 'verify-published', token: 'mock', request})).verified, true);
  change = true;
  assert.equal((await migrate(manifest, {mode: 'verify-published', token: 'mock', request})).verified, false);
});

test('API errors stop processing without attempting writes', async () => {
  await assert.rejects(migrate(manifest, {mode: 'inspect', token: 'mock', request: async (_url, options) => {
    assert.equal(options.method, undefined);
    return {ok: false, status: 403};
  }}), /403/);
});

test('foreign published, draft, and release IDs block the whole migration before uploads', async () => {
  for (const id of ['gallery-import-projekt4', 'drafts.gallery-import-projekt4',
    'versions.release123.gallery-import-projekt4']) {
    for (const mode of ['inspect', 'write', 'verify-published']) {
      let reads = 0;
      const report = await migrate(manifest, {mode, token: 'mock', confirm: 'abufysa8/production',
        request: async (url, options) => {
          assert.equal(options.method, undefined, 'no upload or mutation allowed');
          const parsed = new URL(url);
          assert.equal(parsed.searchParams.get('perspective'), 'raw');
          // Ensure the reserved-ID branches are outside the gallery-type restriction.
          assert.match(parsed.searchParams.get('query'), /\(_type == "galleryProject" && migrationSource == \$source\)\s*\|\| _id/);
          assert.equal(JSON.parse(parsed.searchParams.get('$versions')),
            `versions.*.${JSON.parse(parsed.searchParams.get('$id'))}`);
          reads++;
          return response({result: JSON.parse(parsed.searchParams.get('$id')) === 'gallery-import-projekt4'
            ? [{_id: id, _type: 'unrelatedOwnerContent'}] : []});
        }});
      assert.equal(reads, 4);
      assert.equal(report.blocked, true);
      assert.equal(report.writes, 0);
      assert.equal(report.conflicts[0].id, id);
    }
  }
});

test('a foreign reserved ID appearing during uploads prevents draft creation', async () => {
  let projectReads = 0;
  const report = await migrate(manifest, {mode: 'write', token: 'mock', confirm: 'abufysa8/production',
    request: async (url, options) => {
      assert.equal(options.method, undefined, 'preexisting assets avoid uploads; no document write allowed');
      const parsed = new URL(url);
      if (parsed.searchParams.get('query').includes('sanity.imageAsset')) {
        return response({result: [{_id: 'image-existing-800x600-webp'}]});
      }
      projectReads++;
      return response({result: projectReads > 4
        ? [{_id: 'drafts.gallery-import-projekt1', _type: 'ownerDocument'}] : []});
    }});
  assert.equal(report.blocked, true);
  assert.equal(report.writes, 0);
  assert.equal(report.conflicts[0].type, 'ownerDocument');
});
