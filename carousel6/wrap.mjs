// Wraps each .dc.html artboard body into a plain page so Chromium can screenshot it.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const jobs = JSON.parse(readFileSync('plates.json', 'utf8'));
mkdirSync('shots', { recursive: true });
for (const { file, w, h } of jobs) {
  const src = readFileSync(file, 'utf8');
  const helmet = (src.match(/<helmet>([\s\S]*?)<\/helmet>/) || [, ''])[1];
  const body = (src.match(/<x-dc>([\s\S]*?)<\/x-dc>/) || [, ''])[1]
    .replace(/<helmet>[\s\S]*?<\/helmet>/, '');
  writeFileSync(`shots/${file.replace('.dc.html','')}.preview.html`,
    `<!doctype html><html><head><meta charset="utf-8">${helmet}<style>html,body{width:${w}px}</style></head><body>${body}</body></html>`);
}
console.log('wrapped', jobs.length);
