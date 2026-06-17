const ISO_DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/

/**
 * Edad en años cumplidos a la fecha de referencia. `birthDate` llega como
 * 'YYYY-MM-DD' (input `type=date` / columna `usuarios.fecha_nacimiento`).
 * Compara mes y día, no solo el año: alguien nacido el 2008-12-31, evaluado el
 * 2026-06-17, aún no cumplió 18. Devuelve `null` si la cadena no es una fecha
 * calendárica real (rechaza '', '2000-02-31', basura).
 */
export function calculateAgeInYears(
  birthDate: string,
  reference: Date,
): number | null {
  const match = ISO_DATE_REGEX.exec(birthDate)
  if (!match) {
    return null
  }
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])

  // Rechaza fechas que el calendario no tiene (p. ej. 2000-02-31): el Date
  // normaliza el desborde, así que comparamos contra lo que pedimos.
  const parsed = new Date(year, month - 1, day)
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null
  }

  let age = reference.getFullYear() - year
  const hasHadBirthdayThisYear =
    reference.getMonth() > month - 1 ||
    (reference.getMonth() === month - 1 && reference.getDate() >= day)
  if (!hasHadBirthdayThisYear) {
    age -= 1
  }
  return age
}

/**
 * ¿La fecha de nacimiento corresponde a alguien con al menos `minAge` años
 * cumplidos a la fecha de referencia? Una fecha inválida o futura devuelve
 * `false`.
 */
export function isAtLeastYearsOld(
  birthDate: string,
  minAge: number,
  reference: Date,
): boolean {
  const age = calculateAgeInYears(birthDate, reference)
  return age !== null && age >= minAge
}

/**
 * Fecha máxima ('YYYY-MM-DD') que cumple `minAge` años a la fecha de referencia.
 * Sirve para el atributo `max` del selector: bloquea elegir fechas más recientes
 * (es decir, personas más jóvenes que `minAge`).
 */
export function maxBirthDateForMinAge(minAge: number, reference: Date): string {
  const year = reference.getFullYear() - minAge
  const month = String(reference.getMonth() + 1).padStart(2, '0')
  const day = String(reference.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
