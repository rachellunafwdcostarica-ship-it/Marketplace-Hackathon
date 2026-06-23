import { describe, it, expect } from 'vitest'
import {
  SignInSchema,
  OnboardingSchema,
  SignUpSchema,
  tieneAlMenos18,
} from './schemas'

describe('SignInSchema', () => {
  it('acepta credenciales válidas', () => {
    const result = SignInSchema.safeParse({
      email: 'usuario@ejemplo.com',
      password: 'secreto123',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.email).toBe('usuario@ejemplo.com')
      expect(result.data.password).toBe('secreto123')
    }
  })

  it('normaliza el email a minúsculas', () => {
    const result = SignInSchema.safeParse({
      email: 'USUARIO@EJEMPLO.COM',
      password: 'secreto',
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.email).toBe('usuario@ejemplo.com')
  })

  it('rechaza email inválido', () => {
    const result = SignInSchema.safeParse({
      email: 'no-es-email',
      password: 'secreto123',
    })
    expect(result.success).toBe(false)
  })

  it('rechaza contraseña vacía', () => {
    const result = SignInSchema.safeParse({
      email: 'usuario@ejemplo.com',
      password: '',
    })
    expect(result.success).toBe(false)
  })
})

describe('OnboardingSchema — egresado', () => {
  const valido = {
    role: 'egresado' as const,
    tituloFwd: 'frontend' as const,
    aceptaTerminos: true as const,
    aceptaCotejo: true as const,
  }

  it('acepta un egresado válido', () => {
    expect(OnboardingSchema.safeParse(valido).success).toBe(true)
  })

  it('rechaza titulo_fwd inválido', () => {
    expect(
      OnboardingSchema.safeParse({ ...valido, tituloFwd: 'devops' }).success,
    ).toBe(false)
  })

  it('exige aceptar términos y cotejo (RNF-36 / RNF-38)', () => {
    expect(
      OnboardingSchema.safeParse({ ...valido, aceptaTerminos: false }).success,
    ).toBe(false)
    expect(
      OnboardingSchema.safeParse({ ...valido, aceptaCotejo: false }).success,
    ).toBe(false)
  })
})

describe('OnboardingSchema — empresario', () => {
  const FECHA_ADULTO = '1990-05-15'
  const valido = {
    role: 'empresario' as const,
    tipoEmpresario: 'empresa_formal' as const,
    nombreEmpresa: 'Tech Solutions SA',
    cedula: '3-101-123456',
    nombre: 'Carlos',
    primerApellido: 'Rodríguez',
    fechaNacimiento: FECHA_ADULTO,
    pais: 'CR',
    region: 'CR-SJ',
    alcanceOperativo: 'nacional' as const,
    aceptaTerminos: true as const,
  }

  it('acepta un empresario válido', () => {
    expect(OnboardingSchema.safeParse(valido).success).toBe(true)
  })

  it('acepta segundoApellido y sitioWeb opcionales', () => {
    expect(
      OnboardingSchema.safeParse({
        ...valido,
        segundoApellido: 'Mora',
        sitioWeb: 'https://empresa.com',
      }).success,
    ).toBe(true)
  })

  it('acepta sitioWeb vacío', () => {
    expect(
      OnboardingSchema.safeParse({ ...valido, sitioWeb: '' }).success,
    ).toBe(true)
  })

  it('rechaza sitioWeb que no es URL', () => {
    expect(
      OnboardingSchema.safeParse({ ...valido, sitioWeb: 'no-url' }).success,
    ).toBe(false)
  })

  it('exige cédula (RF-17)', () => {
    expect(OnboardingSchema.safeParse({ ...valido, cedula: '' }).success).toBe(
      false,
    )
  })

  it('rechaza nombre_empresa con menos de 2 caracteres', () => {
    expect(
      OnboardingSchema.safeParse({ ...valido, nombreEmpresa: 'A' }).success,
    ).toBe(false)
  })

  it('rechaza tipo_empresario inválido', () => {
    expect(
      OnboardingSchema.safeParse({ ...valido, tipoEmpresario: 'freelance' })
        .success,
    ).toBe(false)
  })

  it('rechaza alcance_operativo inválido', () => {
    expect(
      OnboardingSchema.safeParse({ ...valido, alcanceOperativo: 'global' })
        .success,
    ).toBe(false)
  })

  it('rechaza fecha con formato incorrecto', () => {
    expect(
      OnboardingSchema.safeParse({ ...valido, fechaNacimiento: '15-05-1990' })
        .success,
    ).toBe(false)
  })

  it('rechaza a un menor de 18 años', () => {
    expect(
      OnboardingSchema.safeParse({ ...valido, fechaNacimiento: '2020-01-01' })
        .success,
    ).toBe(false)
  })
})

describe('SignUpSchema — egresado', () => {
  const valido = {
    role: 'egresado' as const,
    email: 'fwd+test@gmail.com',
    password: 'contraseña12',
    fullName: 'María López',
    tituloFwd: 'frontend' as const,
  }

  it('acepta un egresado válido', () => {
    expect(SignUpSchema.safeParse(valido).success).toBe(true)
  })

  it('normaliza el email a minúsculas', () => {
    const result = SignUpSchema.safeParse({ ...valido, email: 'FWD@GMAIL.COM' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.email).toBe('fwd@gmail.com')
  })

  it('rechaza contraseña menor de 8 caracteres', () => {
    expect(
      SignUpSchema.safeParse({ ...valido, password: 'corta' }).success,
    ).toBe(false)
  })

  it('rechaza fullName con menos de 2 caracteres', () => {
    expect(SignUpSchema.safeParse({ ...valido, fullName: 'A' }).success).toBe(
      false,
    )
  })

  it('rechaza tituloFwd fuera del enum', () => {
    expect(
      SignUpSchema.safeParse({ ...valido, tituloFwd: 'devops' }).success,
    ).toBe(false)
  })
})

describe('SignUpSchema — empresario', () => {
  const valido = {
    role: 'empresario' as const,
    email: 'empresa@dominio.com',
    password: 'contraseña12',
    fullName: 'Juan Pérez',
    tipoEmpresario: 'empresa_formal' as const,
    nombreEmpresa: 'Tech Solutions SA',
    cedula: '3-101-123456',
  }

  it('acepta un empresario válido', () => {
    expect(SignUpSchema.safeParse(valido).success).toBe(true)
  })

  it('acepta sitioWeb como URL válida o cadena vacía', () => {
    expect(
      SignUpSchema.safeParse({ ...valido, sitioWeb: 'https://empresa.com' })
        .success,
    ).toBe(true)
    expect(SignUpSchema.safeParse({ ...valido, sitioWeb: '' }).success).toBe(
      true,
    )
  })

  it('rechaza cedula vacía (RF-17)', () => {
    expect(SignUpSchema.safeParse({ ...valido, cedula: '' }).success).toBe(
      false,
    )
  })

  it('rechaza nombreEmpresa con menos de 2 caracteres', () => {
    expect(
      SignUpSchema.safeParse({ ...valido, nombreEmpresa: 'A' }).success,
    ).toBe(false)
  })

  it('rechaza tipoEmpresario fuera del enum', () => {
    expect(
      SignUpSchema.safeParse({ ...valido, tipoEmpresario: 'freelance' })
        .success,
    ).toBe(false)
  })
})

describe('tieneAlMenos18', () => {
  it('acepta a un adulto mayor de 18 años', () => {
    expect(tieneAlMenos18('1990-01-01')).toBe(true)
  })

  it('rechaza a un menor de edad', () => {
    expect(tieneAlMenos18('2020-01-01')).toBe(false)
  })

  it('acepta a quien ya cumplió 18 el 1 de enero de este año', () => {
    // Nacido el 1 de enero de hace 18 años: age===18, m>0 en feb-dic; m===0,d===1 en ene 1.
    const año = new Date().getFullYear() - 18
    expect(tieneAlMenos18(`${año}-01-01`)).toBe(true)
  })

  it('rechaza a quien cumple 18 el próximo año', () => {
    // Nacido el 1 de enero de hace 17 años: age===17, devuelve false hasta 2038.
    const año = new Date().getFullYear() - 17
    expect(tieneAlMenos18(`${año}-01-01`)).toBe(false)
  })
})
