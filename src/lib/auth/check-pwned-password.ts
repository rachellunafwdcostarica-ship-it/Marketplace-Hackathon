export async function checkPwnedPassword(password: string): Promise<number> {
  const encoded = new TextEncoder().encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-1', encoded)
  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()

  const prefix = hashHex.slice(0, 5)
  const suffix = hashHex.slice(5)

  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    controller.abort()
  }, 5_000)

  let res: Response
  try {
    res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'Add-Padding': 'true' },
      signal: controller.signal,
      cache: 'no-store',
    })
  } catch {
    clearTimeout(timeoutId)
    throw new Error('hibp_unavailable')
  }
  clearTimeout(timeoutId)

  if (!res.ok) throw new Error('hibp_unavailable')

  const text = await res.text()

  for (const line of text.split('\n')) {
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue
    const lineSuffix = line.slice(0, colonIdx).trim()
    const countStr = line.slice(colonIdx + 1).trim()
    if (lineSuffix === suffix) {
      const count = parseInt(countStr, 10)
      return Number.isNaN(count) ? 0 : count
    }
  }

  return 0
}
