# Mobile support plan

Goal: the same build plays properly on a phone and on a laptop. Target is a
LinkedIn audience opening the link on a phone, so it must work on first tap
with no instructions.

## Phase 1 — Input  [DONE]
- [x] `device.ts`: coarse-pointer detection, flips true on first touch event
- [x] `TouchControls.tsx`: on-screen buttons that write the SAME `input` refs
      the keyboard writes (steerLeft/steerRight/throttle/brake) so physics and
      game systems need no changes at all
- [x] Pointer capture per button so sliding a thumb off doesn't stick a control on
- [x] Multi-touch: steer + throttle simultaneously (independent pointerIds)
- [x] Magnet + recover as tap buttons; pause reachable without Esc

## Phase 2 — Performance tier  [DONE]
- [x] Mobile: shadow map 2048 -> 1024, DPR clamp 2 -> 1.5, particles scaled down
- [x] Desktop path unchanged

## Phase 3 — Browser behaviour  [DONE]
- [x] `touch-action: none`, `overscroll-behavior: none` (kills pull-to-refresh)
- [x] viewport meta: `user-scalable=no, maximum-scale=1, viewport-fit=cover`
- [x] `100dvh` so the mobile address bar doesn't crop the HUD
- [x] Fullscreen request + best-effort landscape lock on Start (Android; iOS ignores)

## Phase 4 — Orientation + layout  [DONE]
- [x] Portrait rotate prompt on touch devices, dismissible ("play anyway")
- [x] Touch-specific HUD spacing so controls don't cover the road or gauges

## Phase 5 — Verification  [DONE]
- [x] Playwright device emulation (real touch events, iPhone/Pixel viewports)
- [x] Drive a full run using ONLY touch input
- [x] Desktop keyboard regression unaffected

## Hosting notes
Static SPA: build `npm run build`, output `dist`, no rewrites needed (no router).
Cloudflare Pages preferred over Vercel for a shared link (unlimited free bandwidth).
