# ID Photo Maker

A local-first SvelteKit prototype for preparing application photos and signatures on a phone. No backend, accounts, image uploads or analytics. Photos exist in browser memory until the tab closes or the user starts another file.

## Run locally

```sh
npm install
npm run dev
```

Development: http://localhost:5173

For the production build, including offline caching:

```sh
npm run build
npm run preview -- --port 4173
```

Production preview: http://localhost:4173

The server also prints a LAN address for testing from another device on the same network. **Phone camera access requires a secure HTTPS origin.** Plain HTTP over the LAN supports the gallery flow; localhost on the computer supports its camera. Use a trusted local HTTPS setup for a real phone camera test.

## Included

- Responsive form picker with photo/signature paths, searchable presets and per-form links (`/upsc-cse`, `/ssc-cgl`, `/neet-ug`, `/ibps`, `/pan`, `/sarathi`, `/custom`).
- English, Hindi and Marathi for the core task flow, with remembered language. Help/privacy detail copy and some technical labels remain English.
- Live front/back camera, framing outline, face centring/coverage hints, dark-frame guidance, optional spoken guidance, and gallery import. Camera permissions are requested only on tap.
- Local MediaPipe face detection and selfie segmentation, feathered white background, face-based crop, zoom/reposition/rotation controls, and optional name/date strip.
- Signature extraction with adaptive local thresholding, basic rule-line cleanup, ink crop, white paper cleanup and manual straightening.
- Exact pixel exports, cm/DPI custom dimensions, and JPEG quality search. Valid JPEG comment segments fill minimum KB requirements without changing pixels; export fails rather than exceeding a specified range. JFIF DPI metadata is set for physical-size outputs.
- NEET passport/postcard formats; SSC signature-first behavior; UPSC three-signature capture instructions.
- Download, share, local acceptance feedback, and repeat-customer café mode with customer-based file names. No stored photo history.
- Static production build, installable web manifest, and a service worker for the app shell, fonts, models and runtime. The footer confirms when processing tools are cached.

## Preset policy

Values start from the supplied October 29, 2026 spec. **No preset is represented as independently verified.** Source/portal links and a notice-check reminder appear with every preset. UPSC photo pixels are a chosen export size because the supplied spec contains no required pixel count. SSC pixels preserve the stated 3:1 ratio. PAN, Sarathi, IBPS and NEET values must be checked against the applicant's current portal/notice before use. Presets live in `src/lib/presets.js`.

## Validation and remaining launch work

`npm run check` and `npm run build` pass. Browser QA exercised 360 px and 390 px phone layouts, English/Hindi/Marathi switching, actual photo/signature downloads, deep preset links, and a tight custom KB range. A full app reload and successful photo background removal/export were also verified with the local HTTP server stopped. Downloaded JPEG headers, dimensions, bytes and DPI were inspected independently.

This is a working prototype, not a portal-acceptance guarantee. Remaining launch work:

- Reverify official notices and settle conflicting/provider-specific requirements.
- Test real cameras and outputs across low-end Android phones and Safari; run the 20-user acceptance gate.
- Measure peak memory, processing latency and first-load performance on the reference ₹7k phone / 3G network. The two model files total about 468 KB, but the MediaPipe WASM runtime is roughly 11 MB before transfer compression. The under-1-MB model budget alone does not make the full vision download under 1 MB.
- Face detection checks centring/relative size; eye openness, glasses, head tilt, calibrated shadow checks and full landmark-driven compliance are not implemented. Photo quality checks are guidance, not biometric certification.
- Background segmentation uses the CPU/WASM path. WebGPU acceleration is not implemented. A low-confidence background keeps the original and asks for a better photo.
- Signature straightening is manual; robust perspective correction and full paper-boundary detection need further work.
- Finish translations for help/privacy details and technical labels, and validate Hindi/Marathi speech availability on target devices.
- Café mode processes one customer at a time; no multi-file batch or history database is included.

## Assets

The demonstration portrait is sourced from [Unsplash](https://images.unsplash.com/photo-1506794778202-cad84cf45f1d). It is sample-only, clearly labelled in the app, and must not be submitted with a real application. Fonts are DM Sans and Manrope from Google Fonts, served locally. MediaPipe Tasks Vision is from its official npm package; the face-detector and selfie-segmenter models are served locally from the official MediaPipe model distribution.

The app runs locally by default. Publishing this source to GitHub does not deploy the application. Sites is used only when explicitly requested.
