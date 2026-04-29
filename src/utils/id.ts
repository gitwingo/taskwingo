let counter = 0

export function randomUUID(): string {
  // Simple UUID-like string for client-side use only (not crypto)
  return `id-${Date.now()}-${++counter}-${Math.random().toString(36).slice(2, 7)}`
}
