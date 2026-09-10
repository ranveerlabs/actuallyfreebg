# actuallyfree.bg

apparently this needed to be paywalled

Drop an image in, download the cutout. runs in your browser

Node 22.12+ or 24+. Run `npm ci`, `npm run assets`, then `npm run dev`

Open http://127.0.0.1:5173

`npm run build` downloads and verifies the pinned model files then writes the site to `dist`. `vercel.json` handles the build and response headers on Vercel

The model files come from IMG.LY during the build, their SHA-256 hashes are checked against `scripts/resources-1.7.0.json`. The browser loads them from `/models/1.7.0/` on the same site. Images never leave the browser. PNG, JPG and WebP, up to 30 MB and 25 megapixels

WebGPU runs first when available. A failed GPU run retries in a fresh WASM worker. Browsers without a GPU adapter use WASM directly

The production CSP blocks third-party connections. No analytics packages or Vercel Toolbar, keep those disabled in the project settings

Background removal uses [IMG.LY's library](https://github.com/imgly/background-removal-js). First run loads the model, it takes a bit

AGPLv3. no ads, cookies or tracking
