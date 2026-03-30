# SAPOL Web App

React Vite front end application to consume sapol-data-service.

## Live Demo
You can find the live demo [here](https://sapol-web-app.vercel.app/)
_Note: due to free-tier hosting, the backend may take up to a minute to return results on the initial reuqest (cold-start)_

## Development

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

Configure environment variables in `.env` or `.env.local` (see [Vite env files](https://vite.dev/guide/env-and-mode.html)). Variables must be prefixed with `VITE_` to be exposed to the client.

| Variable | Purpose |
| -------- | ------- |
| `VITE_API_BASE_URL` | Base URL for the data API (e.g. `https://your-service.example.com`). Requests use `${VITE_API_BASE_URL}/api/...`. |
| `VITE_MAPTILER_KEY` | MapTiler API key for map tiles. |
| `VITE_PORT` | Dev server port (default `5173`). |

In development, `vite.config.ts` proxies `/api` to `http://localhost:3000`. If `VITE_API_BASE_URL` is unset, camera location requests use relative `/api/...` URLs and hit that proxy. If you set `VITE_API_BASE_URL`, requests go to that host instead (typical when pointing at a hosted API).

## Production

- **Build:** `npm run build` runs TypeScript (`tsc -b`) then Vite. Output is in `dist/`.
- **Smoke test locally:** `npm run preview` serves `dist/` (not for production traffic).
- **Environment:** Set `VITE_API_BASE_URL` and `VITE_MAPTILER_KEY` in the hosting provider’s build environment. Vite inlines these at **build time**; changing them requires a new build.
- **Hosting:** Deploy `dist/` as static files (CDN, object storage + CDN, or any static host). Use SPA fallback so client routes resolve to `index.html` if you add routing later.
- **CORS:** The deployed API must allow your production origin for browser `fetch` calls.
- **Secrets:** Do not commit API keys. Keep `.env.local` and similar out of version control.

## Quality checks

```bash
npm run lint
npm run build
```

GitHub Actions runs `npm run build` on push and pull requests (see `.github/workflows/ci.yml`). Configure repository secrets `VITE_MAPTILER_KEY` and optionally `VITE_API_BASE_URL` so CI builds succeed.
