import { readFileSync, writeFileSync } from 'node:fs';
const sim = readFileSync('sim.js','utf8').split('/*--SIM-START--*/')[1].split('/*--SIM-END--*/')[0].trim();
const tpl = readFileSync('sim-template.html','utf8');
writeFileSync('carousel-4-simulator.html', tpl.replace('/*__SIM__*/', sim));
console.log('built carousel-4-simulator.html');
