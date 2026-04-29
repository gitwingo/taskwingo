import { useState, useEffect } from 'react'

/**
 * In dev, Vite serves `src/public/` at `/`, so `/logo.ico` works fine.
 * In production (packaged app), the renderer is loaded via file://, and
 * relative paths like `/logo.ico` don't resolve. We ask main for the
 * renderer directory path and build a proper file:// URL instead.
 */
export function useAssetUrl(filename: string): string {
  const [url, setUrl] = useState(`/${filename}`)

  useEffect(() => {
    window.electronAPI.theme.getAssetPath().then((assetPath: string | null) => {
      if (assetPath) {
        // assetPath is a Windows/Linux absolute path — convert to file:// URL
        const normalized = assetPath.replace(/\\/g, '/')
        setUrl(`file:///${normalized}/${filename}`)
      }
      // if null, we're in dev — keep the default relative URL
    }).catch(() => {
      // fallback: keep relative URL
    })
  }, [filename])

  return url
}
