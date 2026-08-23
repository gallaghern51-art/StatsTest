import { readFileSync } from 'node:fs';
const src = readFileSync('sim.js','utf8');
const body = src.split('/*--SIM-START--*/')[1].split('/*--SIM-END--*/')[0];
const createSim = new Function(body + '\n return createSim;')();

let fails = 0;
const ok = (label, cond, extra='') => { if (!cond) { fails++; console.log('  FAIL', label, extra); } else console.log('  ok  ', label); };
const run = (sim, secs, dt=0.05) => { for (let t=0;t<secs;t+=dt) sim.step(dt); };

console.log('— cold start —');
const s = createSim();
ok('starts detached', s.state.phase === 'detached');
ok('cannot fill detached', !s.canFill());
s.fill(); ok('fill rejected detached', s.state.phase === 'detached');

console.log('— fit and home —');
s.fit(); ok('fitted -> idle', s.state.phase === 'idle');
s.index(); ok('index refused before homing', s.state.phase === 'idle');
s.home(); run(s, 3);
ok('homed', s.state.homed === true);
ok('active is station 1', s.state.active === 0);

console.log('— heat —');
s.togglePower(); ok('heating', s.state.phase === 'heating');
run(s, 15); ok('mid-heat not yet ready', s.state.phase === 'heating', s.state.temp.toFixed(1));
run(s, 45); ok('reaches ready', s.state.phase === 'ready', s.state.temp.toFixed(1));
ok('temp near set point', Math.abs(s.state.temp - 185) < 4, s.state.temp.toFixed(1));

console.log('— fill a bag —');
ok('can fill', s.canFill());
s.fill(); ok('filling', s.state.phase === 'filling');
run(s, 10);
ok('bag partly full', s.state.bag > 0.1 && s.state.bag < 0.9, s.state.bag.toFixed(2));

console.log('— interlock —');
const before = s.state.active;
s.index();
ok('index blocked during flow', s.state.phase === 'filling' && s.state.active === before);
ok('interlock flagged', s.state.interlockFlash > 0);
ok('log records interlock', s.state.log[0].kind === 'warn');

console.log('— finish the bag —');
run(s, 45);
ok('bag full', s.state.bag === 1 && s.state.phase === 'full');
ok('charge decremented 3 -> 2', s.state.stations[0].bagsLeft === 2);
s.index(); ok('index blocked with bag attached', s.state.phase === 'full');
s.takeBag(); ok('bag cleared', s.state.bag === 0 && s.state.phase === 'ready');

console.log('— index —');
s.index(); ok('indexing', s.state.phase === 'indexing');
run(s, 0.7);
ok('seals open mid-index', s.nozzleRetract() > 0.9 && s.clampRetract() > 0.9);
ok('cam mid-travel', s.state.camAngle > 30 && s.state.camAngle < 60, s.state.camAngle.toFixed(1));
run(s, 1.2);
ok('landed on station 2', s.state.active === 1);
ok('seals shut again', s.sealsShut() && s.nozzleRetract() === 0 && s.clampRetract() === 0);

console.log('— spend a station, auto advance —');
s.toggleAuto();
s.fill(); run(s, 60); s.takeBag();          // station 2 bag 1 of 2
s.fill(); run(s, 60); s.takeBag();          // station 2 spent
ok('station 2 spent', s.state.stations[1].bagsLeft === 0);
run(s, 4);
ok('auto advanced to station 3', s.state.active === 2, 'active=' + s.state.active);

console.log('— removal guard —');
s.remove(); ok('hot removal refused', s.state.phase !== 'detached');
s.togglePower(); run(s, 400);
ok('cooled below 60', s.state.temp < 60, s.state.temp.toFixed(1));
s.remove(); ok('cool removal allowed', s.state.phase === 'detached');

console.log('— dose maths —');
const t = createSim();
ok('full load 1.45 g', Math.abs(t.totalCharge() - 1.45) < 1e-9, t.totalCharge());
ok('remaining equals total when fresh', Math.abs(t.remainingCharge() - 1.45) < 1e-9);
t.cycleDose(3); ok('small -> empty', t.state.stations[3].dose === 'empty');
ok('empty load 1.30 g', Math.abs(t.totalCharge() - 1.30) < 1e-9, t.totalCharge());
ok('fill time longer for a full bed', createSim().fillSeconds() > 40);

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
