# actuallyfree.bg

apparently this needed to be paywalled

Drop an image in, download the cutout. runs in your browser

Node 22.12+ or 24+. Run `npm ci`, `npm run assets`, then `npm run dev`

Open http://127.0.0.1:5173

`npm run build` writes the site to `dist`. Serve it with `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`

The model files come from IMG.LY during setup and are served locally. Images never leave the browser. PNG, JPG and WebP, up to 30 MB and 25 megapixels

Background removal uses [IMG.LY's library](https://github.com/imgly/background-removal-js). First run loads the model, it takes a bit

AGPLv3. no ads, cookies or tracking
