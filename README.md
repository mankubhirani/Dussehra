# Dussehra V4 — Cinematic Ravan Dahan

An interactive 3D Dussehra experience: explore a ten-headed Ravana effigy, then watch Shri Ram draw his bow, loose a glowing arrow, and set the effigy ablaze, followed by fireworks and the message **बुराई पर अच्छाई की विजय**.

React 19 · Vite · Three.js · React Three Fiber · Drei · postprocessing · Web Audio API

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build → dist/
npm run preview    # serve dist/ at http://localhost:4173
```

Needs Node 18+. No assets have to be downloaded: every model, texture and sound is generated in code.
(The Google Fonts links in `index.html` are optional; the page falls back to system fonts offline.)

Handy URL parameter: `?q=low|medium|high` forces a quality tier and disables the automatic downgrade.

## What you get

| Area | Implementation |
|---|---|
| Ravana | Procedural 3D effigy (`scene/ravanaGeometry.js`): ten heads on a curved yoke with crowns, moustaches and expressions, four arms with sword/mace/trident/bow, armour, belt, dhoti, plinth. PBR materials, shadows. Heads animate independently. |
| Shri Ram | Procedural stylised archer (`scene/RamaModel.jsx`) with IK arms; bow and string deform while drawing. |
| Arrow | Glowing golden arrow, dotted aim trajectory, particle trail, flight along an arc, sticks in Ravana's chest (`DivineArrow.jsx`). |
| Impact | Flash light, shockwave rings, spark burst, camera shake (`ImpactEffects.jsx`). |
| Fire | Fire spreads outward from the impact point across sampled body surface; embers, smoke, ground fire, flickering lights, shader-based charring and dissolve of the effigy (`FireParticles.jsx`, `SmokeParticles.jsx`, `burnMaterial.js`). |
| Fireworks | Pooled particle shells and trails (`Fireworks.jsx`). |
| Camera | Wide establishing → Ravana reveal → Ram close-up → arrow chase cam → impact → burn orbit → fireworks → final shot. Depth of field on close-ups (high quality only). Bloom, vignette, ACES tone mapping (`CameraDirector.jsx`). |
| Timeline | One finite-state machine, `animation/DahanTimeline.js`, with 11 stages; start / pause / resume / skip / replay / reset. Starting while running is ignored, so animations cannot overlap. |
| Audio | 100 % synthesised with Web Audio (`audio/AudioManager.js`): drone, shehnai melody, dhol / nagada / tasha rhythm, conch, bow draw and release, whoosh, impact, crackling fire, firework launch and burst, finale. Starts only after a click. Master / music / SFX volumes, mute (persisted in `localStorage`), fades. |
| UI | Header with nav, music toggle, volume panel, fullscreen; hero; viewer toolbar (rotate, auto-rotate, zoom, reset, play/pause, reduced effects); progress indicator; Story, Significance (ten-head symbolism), Gallery, Celebrations and Wishes, footer; Share Wishes (Web Share, clipboard fallback). |
| Accessibility | Keyboard-operable controls, visible focus, ARIA labels, canvas keyboard controls (←/→ rotate, +/− zoom, 0 reset), `prefers-reduced-motion` plus a manual reduced-effects mode, skip link. |
| Performance | Merged geometries, pooled particle systems, quality tiers (high / medium / low) chosen by device and lowered automatically when FPS drops, DPR caps, disposal on unmount, loading screen and a WebGL-failure fallback. |

## Controls

* Drag or touch-drag to orbit; scroll or pinch to zoom (limits 14–62 units); toolbar buttons, or keyboard with the canvas focused.
* **Start Ravan Dahan** runs the cinematic. **Pause**, **Skip cinematic**, **Replay** and **Reset** appear while it runs.
* About 3 s after the finale starts the camera is handed back to you.

## Limitations (please read)

* **The characters are stylised procedural geometry, not sculpted GLB models.** No licensed Ram or Ravana GLB is bundled, so the figures are simpler than a hand-modelled asset. To upgrade, put optimised `.glb` files in `public/models/` and swap them into `RavanaModel.jsx` / `RamaModel.jsx` (the burn shader is injected through `injectBurn()` in `burnMaterial.js`). `public/models`, `public/textures` and `public/audio` are intentionally empty.
* **Audio is synthesised, not recorded.** It is an Indian-flavoured arrangement but will not sound like a studio recording of a real dhol or shehnai. Licensed audio files can be routed through `AudioManager`.
* **Heat shimmer** is approximated with additive glow and haze, not true screen-space refraction.
* **Gallery tiles are illustrated gradients with emoji**, not photographs.
* Motion blur is not implemented; the arrow's speed is conveyed by a particle trail.

## How it was tested

Only in headless Chromium with a **software** GL renderer (SwiftShader, about 1 fps), driven by Playwright at 1280×720, 900×560, 800×450 and a 390×780 touch viewport. Verified there:

* `npm run build` succeeds and `npm run dev` serves.
* The full 11-stage sequence runs through to the celebration at low, medium and high quality with no console errors. The only messages are a blocked Google Fonts request in the sandbox and a Three.js Clock deprecation notice from React Three Fiber.
* Zoom limits, camera reset, mouse drag, touch drag, auto-rotate toggle, pause (timeline and audio both freeze), resume, skip, replay, reset, double-start guard, mute persistence across reload, volume sliders, reduced-effects persistence, Share Wishes (clipboard), and a mobile layout with no horizontal overflow.
* Every audio cue produces non-silent output in the Web Audio graph, and the automatic quality downgrade triggers on a slow device.

**Not verified:** real-GPU frame rate (60 FPS is a design target, not a measurement), how the audio sounds to a human ear, Safari and Firefox behaviour, fullscreen (not exercised in headless), and Web Share on a real phone.

## Layout

```
src/
  components/  Header, HeroSection, SceneControls, AudioControls, ProgressIndicator,
               CelebrationOverlay, LoadingScreen, Sections, Toast, ErrorBoundary
  scene/       DussehraScene, Environment, Lighting, CameraDirector, RavanaModel, RamaModel,
               DivineArrow, ImpactEffects, FireParticles, SmokeParticles, Fireworks,
               ParticleSystem, burnMaterial, textures, constants
  animation/   DahanTimeline.js   (stage state machine)
  audio/       AudioManager.js, audioCues.js   (timeline → sound)
  hooks/       useSceneControls.js, useAudio.js
  styles/      global.css
```
