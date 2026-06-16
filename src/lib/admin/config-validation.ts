import { ok, err, type Result } from '@/lib/result'
import type { Database } from '@/types/database'

type TipoDato = Database['public']['Enums']['tipo_dato_enum']

/** Claves cuyo orden se valida entre sí (plazo mínimo no puede superar al máximo). */
export const PLAZO_MIN_KEY = 'plazo_min_dias_proyecto'
export const PLAZO_MAX_KEY = 'plazo_max_dias_proyecto'

/**
 * Valida y normaliza el valor de un parámetro de `configuracion_sistema` según su
 * `tipo_dato`. Lógica pura: no toca la BD, por eso vive aparte y se testea sola.
 *
 * Los parámetros del sistema son cupos, plazos, tamaños y conteos: ninguno admite
 * negativos, así que `integer`/`decimal` exigen valor >= 0.
 *
 * Códigos de error (devueltos como `string`, los traduce la UI): `invalid_integer`,
 * `invalid_decimal`, `invalid_boolean`, `empty_string`, `negative_value`.
 */
export function validateConfigValue(
  tipoDato: TipoDato,
  rawValor: string,
): Result<string> {
  const valor = rawValor.trim()

  switch (tipoDato) {
    case 'integer': {
      if (!/^-?\d+$/.test(valor)) {
        return err('invalid_integer')
      }
      const parsed = Number(valor)
      if (parsed < 0) {
        return err('negative_value')
      }
      return ok(String(parsed))
    }
    case 'decimal': {
      if (!/^-?\d+(\.\d+)?$/.test(valor)) {
        return err('invalid_decimal')
      }
      const parsed = Number(valor)
      if (Number.isNaN(parsed)) {
        return err('invalid_decimal')
      }
      if (parsed < 0) {
        return err('negative_value')
      }
      return ok(valor)
    }
    case 'boolean': {
      if (valor !== 'true' && valor !== 'false') {
        return err('invalid_boolean')
      }
      return ok(valor)
    }
    case 'string': {
      if (valor.length === 0) {
        return err('empty_string')
      }
      return ok(valor)
    }
  }
}

/**
 * Verifica el invariante entre claves `plazo_min_dias_proyecto <=
 * plazo_max_dias_proyecto`. Devuelve `true` (válido) si falta alguna de las dos o
 * si alguna no es numérica (en ese caso el error lo reporta `validateConfigValue`).
 */
export function checkPlazoOrder(
  min: string | undefined,
  max: string | undefined,
): boolean {
  if (min === undefined || max === undefined) {
    return true
  }
  const minNum = Number(min)
  const maxNum = Number(max)
  if (Number.isNaN(minNum) || Number.isNaN(maxNum)) {
    return true
  }
  return minNum <= maxNum
}
