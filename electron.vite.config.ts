import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: resolve('electron/main.ts')
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: resolve('electron/preload.ts')
      }
    }
  },
  renderer: {
    root: resolve('src'),
    // Explicitly relative, not Vite's default '/' (root-relative). This is
    // a well-known Electron+Vite gotcha: in dev mode the renderer loads
    // from http://localhost:5173/, where root-relative paths resolve
    // correctly against the dev server's own root. In a packaged build,
    // the renderer loads via a file:// URL pointing at a specific file
    // deep inside the installed app's directory tree — there's no
    // meaningful "root" in that context, so a root-relative path like
    // '/logo.png' tries to resolve to the filesystem root (e.g. C:\logo.png
    // on Windows) instead of the actual file sitting right next to
    // index.html. This is exactly what caused the in-app logo and About
    // screen images to silently fail to load (with their onError fallback
    // glyphs quietly taking over) after installing a packaged build, while
    // dev mode showed no problem at all. Setting base: './' makes Vite
    // resolve and rewrite every asset reference relative to index.html's
    // own location instead, which is correct in both dev and production.
    base: './',
    publicDir: resolve('src/public'),
    build: {
      rollupOptions: {
        input: resolve('src/index.html')
      }
    },
    resolve: {
      alias: {
        '@': resolve('src')
      }
    },
    plugins: [react()]
  }
})
