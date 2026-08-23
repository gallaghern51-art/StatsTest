import { readFileSync, writeFileSync } from 'node:fs';
const page = readFileSync('carousel-4-simulator.html','utf8');
const scenarios = {
  detached: '',
  ready:    'sim.fit(); sim.home(); run(3); sim.togglePower(); run(70);',
  filling:  'sim.fit(); sim.home(); run(3); sim.togglePower(); run(70); sim.fill(); run(22);',
  indexing: 'sim.fit(); sim.home(); run(3); sim.togglePower(); run(70); sim.fill(); run(60); sim.takeBag(); sim.index(); run(0.7);',
  spent:    'sim.fit(); sim.home(); run(3); sim.togglePower(); run(70); for(let i=0;i<3;i++){sim.fill(); run(60); sim.takeBag();} sim.toggleAuto(); run(4);',
};
for (const [name, code] of Object.entries(scenarios)) {
  const harness = `
<div id="errbar" style="display:none;position:fixed;top:0;left:0;right:0;z-index:9999;background:#c00;color:#fff;font:12px monospace;padding:6px 10px"></div>
<script>
window.onerror = (m,s,l,c,e) => { const b=document.getElementById('errbar');
  b.style.display='block'; b.textContent += 'JS ERROR: '+m+' @'+l+':'+c+' | '; return false; };
window.addEventListener('unhandledrejection', ev => { const b=document.getElementById('errbar');
  b.style.display='block'; b.textContent += 'REJECT: '+ev.reason+' | '; });
setTimeout(() => {
  try {
    const run = secs => { for (let t=0;t<secs;t+=0.05) sim.step(0.05); };
    ${code}
    speed = 0;
    paint();
  } catch (err) {
    const b=document.getElementById('errbar'); b.style.display='block'; b.textContent += 'HARNESS: '+err.message;
  }
}, 260);
<\/script>`;
  writeFileSync(`shots/sim-${name}.html`, page + harness);
}
console.log('harness pages written');
