# Authorized Crossing (Static Build)

This flavor has no bundler and runs directly from static files.

## Run locally

Serve the repository root with any static server, then open `/static-build/`.

Example:

```bash
cd /home/ubuntu/project/authorized_crossing
python3 -m http.server 8080
```

Open: `http://localhost:8080/static-build/`

## Deploy

Upload static files to your host.

Required paths:
- `static-build/` (entry HTML/CSS/JS)
- `shared/` (shared game logic modules imported by `static-build/main.js`)
