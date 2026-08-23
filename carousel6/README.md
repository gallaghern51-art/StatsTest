# Carousel 4 — a rotary pod changer for the Volcano Hybrid

A concept package for an accessory that replaces the Volcano Hybrid's filling chamber with a
four-station rotating disc. Each station carries a sealed pod with its own dose; a small geared
motor steps the disc so a session is loaded once and stepped through between bags.

**Nothing here has been built or measured.** Every host-device dimension is unverified — see
plate 07 for the risk register and the list of things that must come off a real machine first.

## The design in numbers

| | |
|---|---|
| Stations | 4, on a Ø64 pitch circle, 90° apart |
| Envelope | Ø120 × 78 mm above the chamber housing (≈ +28 mm over a stock chamber + Easy Valve adapter) |
| Pod bore | Ø30 — the same diameter as the Volcano's own screen |
| Servings | 0.15 / 0.25 / 0.40 / 0.65 g, set by a drop-in perforated riser |
| Full setting | 7.07 cm³ bed — a stock Volcano bowl is 6.5 cm³ / ~600 mg |
| Loaded | 1.45 g in the example mix, up to 2.6 g all-full |
| Drive | N20-class gearmotor, 30:1, flat on the upper deck into crown teeth on the ring |
| Position | 4 magnets + one Hall sensor, absolute after homing |
| Interlock | MEMS pressure sensor in the transfer plenum — the disc cannot turn while flow is detected |
| Power | USB-C 5 V; the ring keeps a knurled band so it still turns by hand unpowered |

The two things that make the mechanism work: **nothing that seals ever slides** (both sealing faces
retract to free the disc and close again on the detent), and **hot air crosses to the active station
before it reaches the flower**, so the transfer plenum only ever carries clean air.

## What's here

### Concept plates — 8 artboards on one canvas
Authored as Design Component files, laid out by `canvas.json`, published as a pan/zoom canvas.

| File | Plate |
|---|---|
| `Main.dc.html` | 01 · General arrangement |
| `Section.dc.html` | 02 · Section A–A — air path and sealing |
| `Carousel.dc.html` | 03 · Plan, drive and indexing |
| `Pod.dc.html` | 04 · The pod and its riser family |
| `Mount.dc.html` | 05 · Mount and attachment |
| `Exploded.dc.html` | 06 · Exploded assembly |
| `Notes.dc.html` | 07 · Risk register |
| `Route.dc.html` | 08 · Build route |

### Working simulation
`carousel-4-simulator.html` — a self-contained page that runs the whole cycle: fit the collar, load
the disc, home the drive, heat, fill a bag, watch the motor step to the next pod. Seal travel is
drawn at 3× so it's visible. Heat-up follows the published 40-second figure to 180 °C; fill time
scales with bed depth; a pod yields one to three bags depending on its riser.

## Working on it

```bash
node selftest.mjs     # 33 assertions over the simulation state machine
node build.mjs        # inlines sim.js into sim-template.html -> carousel-4-simulator.html
node wrap.mjs         # unwraps each .dc.html into shots/*.preview.html for a browser look
```

`sim.js` is the single source of truth for the simulation — `build.mjs` inlines it into the page, and
`selftest.mjs` runs the same code headlessly, so the published behaviour and the tested behaviour
cannot drift apart. `harness.mjs` writes scripted-state copies of the page for screenshot checks.

The canvas HTML is not committed: it carries a 2.3 MB bundled editor and is regenerated from the
`.dc.html` sources plus `canvas.json` by the `design` skill's `seed-canvas.mjs`.

## Sources for the host figures

Manufacturer domains were unreachable from the machine this was drawn on, so Volcano Hybrid figures
came from retailer and support-page summaries: 20 × 18 × 20 cm and 1.8 kg; 40–230 °C; 270 W hybrid
convection/conduction heater; ~40 s to 180 °C; ceramic-coated filling chamber of 6.5 cm³ / ~600 mg
with a Ø30 mm screen. Dosing capsule capacity is quoted between 0.15 and 0.20 g and its outside
diameter is not consistent between listings — measure it.
