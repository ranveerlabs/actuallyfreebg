# actuallyfreebg

big tech cant stop me

[actuallyfreebg.vercel.app](https://actuallyfreebg.vercel.app)

Drop an image in, get a transparent PNG. no uploads, cookies, ads or tracking

Node 22.12+ or 24+

```
npm ci
npm run assets
npm run dev
```

opens at http://127.0.0.1:5173

`npm run build` fetches the model files and builds into `dist`. Vercel settings are in `vercel.json`

The remover is [IMG.LY's](https://github.com/imgly/background-removal-js). Model files get downloaded at build time, hashes are in `scripts/resources-1.7.0.json`. Your browser loads them from this site, first run takes a bit

WebGPU first, WASM fallback. PNG, JPG and WebP up to 30 MB and 25 megapixels

AGPLv3
