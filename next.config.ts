import createNextIntlPlugin from 'next-intl/plugin'
import type { NextConfig } from 'next'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const nextConfig: NextConfig = {
  // Permite acceder al dev server desde la IP de red local (ademas de localhost)
  // sin el aviso de cross-origin de Next.js.
  allowedDevOrigins: ['192.168.0.7'],
}

export default withNextIntl(nextConfig)
