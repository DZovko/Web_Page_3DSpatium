// Local-only snapshot of the current HTML gallery. Does not contact Sanity.
import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const html = await readFile(path.join(root, 'index.html'), 'utf8');
const cards = [...html.matchAll(/<div class="pf-card reveal">([\s\S]*?)<\/h3>/g)];
const expected = [4, 8, 9, 4];
if (cards.length !== 4) throw new Error('Expected four original HTML projects');
const projects = [];
for (const [index, match] of cards.entries()) {
  const content = match[1];
  const title = content.match(/<h3>([^<]+)$/)?.[1];
  const location = content.match(/<span class="pf-tag">([^<]+)<\/span>/)?.[1];
  const alt = content.match(/\balt="([^"]+)"/)?.[1];
  const paths = [...content.matchAll(/slike\/projekt\d+\/\d+\.webp/g)].map((m) => m[0]);
  if (!title || !location || !alt || paths.length !== expected[index]) throw new Error('Unexpected source markup');
  const photographs = [];
  for (const [photoIndex, sourcePath] of paths.entries()) {
    if (sourcePath !== `slike/projekt${index + 1}/${photoIndex + 1}.webp`) throw new Error('Source order changed');
    const bytes = await readFile(path.join(root, sourcePath));
    photographs.push({
      _key: `photo-${photoIndex + 1}`, sourcePath, alt,
      sha1: createHash('sha1').update(bytes).digest('hex'), bytes: bytes.length,
    });
  }
  projects.push({
    sourceKey: `static-gallery/projekt${index + 1}`,
    documentId: `gallery-import-projekt${index + 1}`,
    title, location, category: title, displayOrder: (index + 1) * 10, photographs,
  });
}
const manifest = {version: 1, projectId: 'abufysa8', dataset: 'production', projects};
const target = new URL('./gallery-manifest.json', import.meta.url);
if (process.argv.includes('--check')) {
  if (await readFile(target, 'utf8') !== JSON.stringify(manifest, null, 2) + '\n') {
    throw new Error('Source gallery differs from the reviewed manifest');
  }
  console.log('Manifest matches all four projects and 25 original image files.');
} else {
  await writeFile(target, JSON.stringify(manifest, null, 2) + '\n');
  console.log('Local manifest saved: four projects, 25 photographs; unused projekt1/5.webp excluded.');
}
