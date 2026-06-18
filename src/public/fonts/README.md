# Self-hosted fonts

Taskwingo v1.0.0 loaded the "Inter" font from Google's CDN
(`fonts.googleapis.com`) on every app launch. This was flagged by a user
running SimpleWall as an unexpected outbound connection — fair complaint,
since the app is marketed as fully offline with no telemetry.

This folder is where the self-hosted replacement goes.

## One-time setup

1. Download the Inter variable font (OFL-1.1 licensed, free to bundle):
   https://github.com/rsms/inter/releases/latest
   Grab `Inter.zip`, then take `Inter-Variable.woff2` from inside
   `Inter Web/` (or `web/` depending on release version).

2. Place that single file here as:
   `src/public/fonts/Inter-Variable.woff2`

3. Rebuild the app. `electron.vite.config.ts` already copies everything
   in `src/public/` into the final build (it's the configured `publicDir`),
   so no config changes are needed.

That's it — `global.css` already points to `/fonts/Inter-Variable.woff2`
via a local `@font-face` rule and makes zero network requests.

## If you skip this step

No font file just means the CSS `@font-face` silently fails to find a
source, and the existing fallback chain in `global.css`
(`-apple-system, BlinkMacSystemFont, sans-serif`) takes over — which
renders as Segoe UI on Windows. The app still looks clean, just not
pixel-identical to the original Inter typeface.
