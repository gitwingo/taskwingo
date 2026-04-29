import type { Configuration } from 'electron-builder'

const config: Configuration = {
  appId: "com.gitwingo.taskwingo",
  productName: "Taskwingo",
  copyright: "Copyright © 2025 Gitwingo",
  icon: 'logo.ico',
  directories: {
    output: 'dist'
  },
  files: [
    'dist-electron/**/*',
    'dist/**/*'
  ],
  win: {
    target: ['nsis', 'portable'],
    icon: 'logo.ico'
  },
  mac: {
    target: ['dmg'],
    icon: 'logo.ico',
    category: 'public.app-category.productivity'
  },
  linux: {
    target: ['AppImage', 'deb'],
    icon: 'logo.ico',
    category: 'Office'
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true
  }
}

export default config
