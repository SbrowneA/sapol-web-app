# SAPOL Web App

React Vite front end application. Camera locations load from **Supabase** (PostgREST) via the JavaScript client.

## Live Demo

You can find the live demo [here](https://sapol-web-app.vercel.app/)

## Development

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

Configure environment variables in `.env` or `.env.local` (see [Vite env files](https://vite.dev/guide/env-and-mode.html)). Variables must be prefixed with `VITE_` to be exposed to the client.


| Variable                        | Purpose                                                                                                             |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `VITE_SUPABASE_URL`             | Supabase project URL (Dashboard → Project Settings → API → Project URL).                                            |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable (anon/public) JWT — safe for the browser; never use the **service_role** secret in the client. |
| `VITE_MAPTILER_KEY`             | MapTiler API key for map tiles.                                                                                     |
| `VITE_PORT`                     | Dev server port (default `5173`).                                                                                   |


### Supabase RPC contract

The app calls Postgres functions exposed as RPC (names and argument names must match your database).

Currently, **`api_resolved_locations_by_date_by_region`** is invoked via `.rpc(..., { q_date })` (`YYYY-MM-DD`, South Australia calendar day via `formatSapolDate` — the Postgres parameter name **`q_date`** must match what PostgREST expects). A **date-range** analogue may be added later; wire a second RPC in `src/api/cameraLocations.ts` when the backend is ready.

The response must be JSON shaped like `ApiCameraLocations` (see `src/types/api.ts`): `{ locations: { country, metro }, dateRange }`. If `country` or `metro` is SQL `NULL`, PostgREST sends JSON `null`; the client normalizes those to **`[]`** so layers always get arrays—the map stays empty until the RPC returns real rows.

Grant **`EXECUTE`** so the browser role can call the function:

```sql
GRANT EXECUTE ON FUNCTION public.api_resolved_locations_by_date_by_region(date)
  TO anon, authenticated;
```

Adjust the signature in `GRANT EXECUTE` to match your SQL (types, defaults, overloads).

### RLS so the RPC returns data (not `null` arrays)

The **SQL editor** often runs as **`postgres`**, which bypasses RLS; the app uses the anon JWT. If your function is **`SECURITY INVOKER`** (Postgres default), every `SELECT` inside it still runs as the **invoker** (`anon`), so **RLS applies** to underlying tables and views.

1. **Identify** every table and view read inside `api_resolved_locations_by_date_by_region` (including transitive views/functions).
2. **Enable RLS** where missing: `ALTER TABLE public.<name> ENABLE ROW LEVEL SECURITY;`
3. **Add `SELECT` policies** that allow **`anon`** (and `authenticated` if you use logged-in keys) to read rows that feeding queries need. Adapt names and predicates; **`USING (true)`** means world-readable via the API key:

```sql
-- Example: repeatable read for public geo data (narrow `USING (...)` when data is sensitive)
CREATE POLICY "anon_select_<table>"
ON public.<table>
FOR SELECT
TO anon
USING (true);
```

Repeat per table/view. For **materialized**/plain views, policy targets the underlying tables or the **view** if Supabase exposes it separately—check Dashboard → advisors if `SELECT` is still denied.

4. **`SECURITY DEFINER` alternative.** If policies are awkward, define the RPC using **`SECURITY DEFINER`**, **`SET search_path = public`** (or a dedicated schema list), **`STABLE`**, or **`VOLATILE`** as appropriate. The body must not trust client input blindly. Prefer a **narrow** owning role rather than widening table access unless you intend public reads.

Dashboard SQL succeeding while the browser shows empty data usually means **`anon`**/`authenticated` lack **`EXECUTE`**, the RPC argument name (**`q_date`**) does not match Postgres, or **RLS** blocks reads invoked as **`SECURITY INVOKER`**.

The optional **Open query results in new tab** control (map options panel) repeats the Supabase JS `rpc` call in a spare tab showing the RPC payload and prettified JSON—it does **not** issue its own standalone HTTP GET to PostgREST.

## Production

- **Build:** `npm run build` runs TypeScript (`tsc -b`) then Vite. Output is in `dist/`.
- **Smoke test locally:** `npm run preview` serves `dist/` (not for production traffic).
- **Environment:** Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_MAPTILER_KEY` in the hosting provider’s build environment. Vite inlines these at **build time**; changing them requires a new build.
- **Hosting:** Deploy `dist/` as static files (CDN, object storage + CDN, or any static host). Use SPA fallback so client routes resolve to `index.html` if you add routing later.
- **Secrets:** Do not commit API keys. Keep `.env.local` and similar out of version control.

## Quality checks

```bash
npm run lint
npm run build
```

GitHub Actions runs `npm run build` on push and pull requests (see `.github/workflows/ci.yml`). Configure repository secrets `VITE_MAPTILER_KEY`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_PUBLISHABLE_KEY` so CI builds bundle the correct config.