/**
 * @deprecated Este archivo existe como capa de compatibilidad.
 * El contexto monolítico StateContext fue dividido en:
 *   - AuthContext  (src/lib/auth/AuthContext.tsx) → autenticación y rol
 *   - DemoDataContext (src/lib/DemoDataContext.tsx) → datos de la app
 *
 * Usa directamente useAuth() y useDemoData() en código nuevo.
 */

export {
  AuthProvider as StateProvider,
  useAuth as useAppState,
  FWD_STORAGE_KEYS,
} from '@/lib/auth/AuthContext'

export { DemoDataProvider, useDemoData } from '@/lib/DemoDataContext'
