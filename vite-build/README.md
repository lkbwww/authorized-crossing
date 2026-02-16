# Authorized Crossing (Vite Build)

## Run locally

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

Built files are emitted to `vite-build/dist/`.

## Deploy under a subfolder (example: `/game/`)

Use `VITE_BASE_PATH` when building:

```bash
VITE_BASE_PATH=/game/ npm run build
```

Then upload the generated `dist/` contents to your host.

## Browser-based E2E tests (Playwright)

Install browser runtime once:

```bash
npm run test:e2e:install
```

Run headless smoke tests:

```bash
npm run test:e2e
```

Run headed mode:

```bash
npm run test:e2e:headed
```

Notes:
- Tests auto-start a local Vite server on `http://127.0.0.1:4273` by default.
- If that port is used, override it:
  ```bash
  E2E_PORT=4373 npm run test:e2e
  ```
- Current smoke test validates Intro -> Shop -> River progression and checks runtime errors.
- Playwright browser binaries are stored under `vite-build/.playwright-browsers`.
