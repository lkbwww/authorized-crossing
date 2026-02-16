# Authorized Crossing

Two browser-playable build flavors are included:

- `static-build/`: no-build static entry (Phaser from pinned CDN)
- `vite-build/`: Vite project that outputs `vite-build/dist/`

Shared logic is in `shared/`.

## Static flavor

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080/static-build/`.

## Vite flavor

```bash
cd vite-build
npm install
npm run dev
npm run build
```

`npm run build` outputs deployable files to `vite-build/dist/`.
