import type { Configuration } from 'electron-builder'

const config: Configuration = {
  appId: "com.gitwingo.taskwingo",
  productName: "Taskwingo",
  copyright: "Copyright © 2025 Gitwingo",
  icon: 'build/logo.ico',
  directories: {
    output: 'dist',
    app: '.'
  },
  files: [
    'out/**/*',
    'package.json'
  ],
  win: {
    target: ['nsis'],
    icon: 'build/logo.ico'
  },
  mac: {
    target: ['dmg'],
    icon: 'build/logo.ico',
    category: 'public.app-category.productivity'
  },
  linux: {
    target: ['AppImage', 'deb'],
    icon: 'build/logo.ico',
    category: 'Office'
  },
  nsis: {
    oneClick: false,
    perMachine: true,
    allowElevation: true,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true
  }
}

export default config
