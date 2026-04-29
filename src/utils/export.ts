export async function exportTasks(profileId: number, format: 'csv' | 'json' | 'pdf') {
  const extensions: Record<string, string> = { csv: 'csv', json: 'json', pdf: 'html' }
  const filterNames: Record<string, string> = { csv: 'CSV File', json: 'JSON File', pdf: 'HTML Report' }

  const result = await window.electronAPI.dialog.saveFile({
    title: `Export Tasks as ${format.toUpperCase()}`,
    defaultPath: `tasks-export.${extensions[format]}`,
    filters: [{ name: filterNames[format], extensions: [extensions[format]] }]
  })

  if (result.canceled || !result.filePath) return false

  const handlers: Record<string, Function> = {
    csv: window.electronAPI.export.toCSV,
    json: window.electronAPI.export.toJSON,
    pdf: window.electronAPI.export.toPDF
  }

  const res = await handlers[format](profileId, result.filePath)
  return res.success
}
