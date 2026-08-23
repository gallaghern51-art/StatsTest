/*--SIM-START--*/
// Pure simulation core. No DOM access — see selftest.mjs.
const DOSES = {
  full:   { key:'full',   label:'FULL',   g:0.65, bed:10.0, riser:0.0, bags:3, band:'#c4491c' },
  large:  { key:'large',  label:'LARGE',  g:0.40, bed:6.5,  riser:3.5, bags:2, band:'#d98b5a' },
  medium: { key:'medium', label:'MEDIUM', g:0.25, bed:4.0,  riser:6.0, bags:1, band:'#7d9aa8' },
  small:  { key:'small',  label:'SMALL',  g:0.15, bed:2.5,  riser:7.5, bags:1, band:'#2d6480' },
  empty:  { key:'empty',  label:'EMPTY',  g:0,    bed:0,    riser:0,   bags:0, band:'transparent' },
};
const DOSE_CYCLE = ['full','large','medium','small','empty'];

const AMBIENT = 22;
const INDEX_SECONDS = 1.4;
const HOME_SECONDS = 2.2;
const AUTO_DELAY = 2.0;

function trapezoid(a, ramp) {           // 0 at both ends, 1 across the middle
  return Math.max(0, Math.min(1, a / ramp, (90 - a) / ramp));
}

function createSim() {
  const s = {
    phase: 'detached',                  // detached idle heating ready filling full indexing homing
    power: false,
    setTemp: 185,
    temp: AMBIENT,
    active: 0,
    homed: false,
    camAngle: 0,
    indexT: 0,
    homeT: 0,
    stations: [
      { dose:'full',   bagsLeft:3 },
      { dose:'large',  bagsLeft:2 },
      { dose:'medium', bagsLeft:1 },
      { dose:'small',  bagsLeft:1 },
    ],
    bag: 0,
    auto: false,
    autoT: 0,
    interlockFlash: 0,
    clock: 0,
    bagsDone: 0,
    log: [],
  };

  const say = (text, kind) => {
    s.log.unshift({ t: s.clock, text, kind: kind || 'info' });
    if (s.log.length > 60) s.log.pop();
  };

  say('Carousel detached. Fit it to the Volcano to begin.');

  const api = {
    state: s,
    doses: DOSES,

    // ---- derived ----------------------------------------------------------
    get fitted()   { return s.phase !== 'detached'; },
    get busy()     { return s.phase === 'indexing' || s.phase === 'homing'; },
    get flow()     { return s.phase === 'filling'; },
    get pod()      { return s.stations[s.active]; },
    get dose()     { return DOSES[s.stations[s.active].dose]; },
    get atTemp()   { return s.power && s.temp >= s.setTemp - 3; },
    nozzleRetract() { return trapezoid(s.camAngle, 16); },   // 0 seated .. 1 clear
    clampRetract()  { return trapezoid(s.camAngle, 18); },   // 0 closed .. 1 open
    sealsShut()     { return s.camAngle === 0; },
    fillSeconds()   { return 30 + 12 * (this.dose.bed / 10); },

    canFill() {
      if (s.phase !== 'ready') return false;
      if (!this.atTemp) return false;
      if (this.pod.bagsLeft <= 0) return false;
      if (s.bag >= 1) return false;
      return true;
    },
    canIndex() { return s.phase === 'ready' || s.phase === 'idle' || s.phase === 'full'; },

    nextStep() {
      if (s.phase === 'detached')            return 'Fit the carousel to the Volcano.';
      if (!s.homed)                          return 'Home the drive so it knows which station is which.';
      if (this.pod.bagsLeft <= 0 && s.phase !== 'indexing') {
        return s.stations.some(p => p.bagsLeft > 0)
          ? 'Station spent — index to the next pod.'
          : 'All four pods spent. Reload the disc.';
      }
      if (!s.power)                          return 'Switch the heater on.';
      if (!this.atTemp && s.phase !== 'filling') return 'Waiting for the set temperature.';
      if (s.bag >= 1)                        return 'Bag full — take it off, then index or fill again.';
      if (s.phase === 'filling')             return 'Filling. The drive is held while flow is detected.';
      return 'Ready — fill a bag.';
    },

    // ---- commands ---------------------------------------------------------
    fit() {
      if (s.phase !== 'detached') return;
      s.phase = 'idle'; s.homed = false; s.camAngle = 0;
      say('Collar seated, quarter turn to the click. Gasket loaded.', 'ok');
    },
    remove() {
      if (s.phase === 'detached' || this.busy) return;
      if (s.phase === 'filling') { this.flash('Cannot remove while the pump is running.'); return; }
      if (s.temp > 60) { this.flash('Deck is at ' + Math.round(s.temp) + ' °C — let it cool below 60.'); return; }
      s.phase = 'detached'; s.power = false; s.bag = 0; s.homed = false;
      say('Reverse twist, lifted clear. Stock chamber can go back in.', 'ok');
    },
    togglePower() {
      if (s.phase === 'detached') return;
      s.power = !s.power;
      if (s.power) { if (s.phase === 'idle') s.phase = 'heating'; say('Heater on, set ' + s.setTemp + ' °C.'); }
      else { if (s.phase === 'heating' || s.phase === 'ready') s.phase = 'idle'; say('Heater off.'); }
    },
    setTemp(v) {
      s.setTemp = Math.max(40, Math.min(230, Math.round(v)));
      if (s.power && s.phase === 'ready' && !this.atTemp) s.phase = 'heating';
    },
    home() {
      if (s.phase === 'detached' || this.busy || s.phase === 'filling') return;
      s.phase = 'homing'; s.homeT = 0;
      say('Homing — one full turn to find the index magnet.');
    },
    fill() {
      if (!this.canFill()) {
        if (!this.atTemp) this.flash('Not at temperature yet.');
        else if (this.pod.bagsLeft <= 0) this.flash('Station ' + (s.active + 1) + ' is spent.');
        else if (s.bag >= 1) this.flash('Bag is already full.');
        return;
      }
      s.phase = 'filling';
      say('Pump running — flow detected in the plenum. Drive locked out.', 'hot');
    },
    stopFill() {
      if (s.phase !== 'filling') return;
      s.phase = s.bag >= 1 ? 'full' : 'ready';
      say('Pump stopped at ' + Math.round(s.bag * 100) + '% bag.');
    },
    takeBag() {
      if (s.bag <= 0) return;
      s.bagsDone += 1;
      say('Bag ' + s.bagsDone + ' off the valve.', 'ok');
      s.bag = 0;
      if (s.phase === 'full') s.phase = 'ready';
    },
    index() {
      if (s.phase === 'filling') {
        s.interlockFlash = 1.6;
        say('INTERLOCK — flow detected, drive held. Stop the pump first.', 'warn');
        return;
      }
      if (this.busy || s.phase === 'detached') return;
      if (!s.homed) { this.flash('Drive is not homed.'); return; }
      if (s.bag > 0) { this.flash('Take the bag off before indexing.'); return; }
      s.phase = 'indexing'; s.indexT = 0;
      say('Index — 90° step. Seals retract, disc turns, seals close.');
    },
    cycleDose(i) {
      if (this.busy || s.phase === 'filling') return;
      if (i === s.active && s.bag > 0) { this.flash('Take the bag off first.'); return; }
      const st = s.stations[i];
      const next = DOSE_CYCLE[(DOSE_CYCLE.indexOf(st.dose) + 1) % DOSE_CYCLE.length];
      st.dose = next; st.bagsLeft = DOSES[next].bags;
      say('Station ' + (i + 1) + ' loaded ' + DOSES[next].label +
          (DOSES[next].g ? ' — ' + DOSES[next].g.toFixed(2) + ' g' : ''));
    },
    reloadAll() {
      if (this.busy || s.phase === 'filling') return;
      s.stations.forEach(st => { st.bagsLeft = DOSES[st.dose].bags; });
      say('Disc reloaded — ' + this.totalCharge().toFixed(2) + ' g across four stations.', 'ok');
    },
    toggleAuto() {
      s.auto = !s.auto; s.autoT = 0;
      say('Auto-advance ' + (s.auto ? 'on — indexes once a pod is spent and flow has stopped.' : 'off.'));
    },
    flash(msg) { s.interlockFlash = 1.4; say(msg, 'warn'); },
    totalCharge() { return s.stations.reduce((a, st) => a + DOSES[st.dose].g, 0); },
    remainingCharge() {
      return s.stations.reduce((a, st) => {
        const d = DOSES[st.dose];
        return a + (d.bags ? d.g * (st.bagsLeft / d.bags) : 0);
      }, 0);
    },
    reset() {
      Object.assign(s, {
        phase:'detached', power:false, setTemp:185, temp:AMBIENT, active:0, homed:false,
        camAngle:0, indexT:0, homeT:0, bag:0, auto:false, autoT:0, interlockFlash:0,
        clock:0, bagsDone:0, log:[],
      });
      s.stations = [
        { dose:'full',   bagsLeft:3 }, { dose:'large',  bagsLeft:2 },
        { dose:'medium', bagsLeft:1 }, { dose:'small',  bagsLeft:1 },
      ];
      say('Reset.');
    },

    // ---- integration ------------------------------------------------------
    step(dt) {
      s.clock += dt;
      if (s.interlockFlash > 0) s.interlockFlash = Math.max(0, s.interlockFlash - dt);

      // heater — first order toward set point, or toward ambient when off
      const target = s.power ? s.setTemp : AMBIENT;
      const k = s.power ? 0.11 : 0.020;
      s.temp += (target - s.temp) * (1 - Math.exp(-k * dt));

      if (s.phase === 'heating' && this.atTemp) {
        s.phase = 'ready';
        say('At ' + Math.round(s.temp) + ' °C. Both seals shut, station ' + (s.active + 1) + ' live.', 'ok');
      }
      if (s.phase === 'ready' && s.power && !this.atTemp) s.phase = 'heating';

      if (s.phase === 'homing') {
        s.homeT += dt;
        s.camAngle = 0;
        if (s.homeT >= HOME_SECONDS) {
          s.homeT = 0; s.homed = true; s.active = 0;
          s.phase = s.power ? (this.atTemp ? 'ready' : 'heating') : 'idle';
          say('Home found. Station 1 at the nozzle.', 'ok');
        }
      }

      if (s.phase === 'indexing') {
        s.indexT += dt;
        const p = Math.min(1, s.indexT / INDEX_SECONDS);
        s.camAngle = p * 90;
        if (p >= 1) {
          s.indexT = 0; s.camAngle = 0;
          s.active = (s.active + 1) % 4;
          s.phase = s.power ? (this.atTemp ? 'ready' : 'heating') : 'idle';
          const d = DOSES[this.pod.dose];
          say('Station ' + (s.active + 1) + ' seated — ' +
              (d.g ? d.label + ', ' + d.g.toFixed(2) + ' g, ' + this.pod.bagsLeft + ' bag(s) left' : 'empty'), 'ok');
        }
      }

      if (s.phase === 'filling') {
        s.bag += dt / this.fillSeconds();
        if (s.bag >= 1) {
          s.bag = 1;
          s.phase = 'full';
          this.pod.bagsLeft = Math.max(0, this.pod.bagsLeft - 1);
          say('Bag full. Station ' + (s.active + 1) + ' has ' + this.pod.bagsLeft + ' bag(s) left.', 'ok');
        }
      }

      if (s.auto && s.phase === 'ready' && this.pod.bagsLeft <= 0 && s.bag === 0) {
        s.autoT += dt;
        if (s.autoT >= AUTO_DELAY) { s.autoT = 0; this.index(); }
      } else if (s.phase !== 'filling') {
        s.autoT = 0;
      }
    },
  };
  api.reset = api.reset.bind(api);
  return api;
}
/*--SIM-END--*/
