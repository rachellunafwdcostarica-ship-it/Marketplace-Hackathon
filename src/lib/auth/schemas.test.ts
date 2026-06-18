import { describe, it, expect } from 'vitest'
import {
  AssignRoleSchema,
  SignInSchema,
  SaveEmpresarioProfileSchema,
} from './schemas'

describe('AssignRoleSchema', () => {
  it('acepta "egresado"', () => {
    const result = AssignRoleSchema.safeParse({ role: 'egresado' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.role).toBe('egresado')
  })

  it('acepta "empresario"', () => {
    const result = AssignRoleSchema.safeParse({ role: 'empresario' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.role).toBe('empresario')
  })

  it('rechaza "administrador" (no auto-asignable)', () => {
    const result = AssignRoleSchema.safeParse({ role: 'administrador' })
    expect(result.success).toBe(false)
  })

  it('rechaza string vacío', () => {
    const result = AssignRoleSchema.safeParse({ role: '' })
    expect(result.success).toBe(false)
  })

  it('rechaza rol inexistente', () => {
    const result = AssignRoleSchema.safeParse({ role: 'superadmin' })
    expect(result.success).toBe(false)
  })

  it('rechaza objeto vacío', () => {
    const result = AssignRoleSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

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

  it('rechaza cuando falta el email', () => {
    const result = SignInSchema.safeParse({ password: 'secreto123' })
    expect(result.success).toBe(false)
  })

  it('rechaza cuando falta la contraseña', () => {
    const result = SignInSchema.safeParse({ email: 'a@b.com' })
    expect(result.success).toBe(false)
  })
})

describe('SaveEmpresarioProfileSchema', () => {
  // Fecha de un adulto mayor de 18 con margen amplio
  const FECHA_ADULTO = '1990-05-15'

  const validBase = {
    nombre: 'Carlos',
    primer_apellido: 'Rodríguez',
    fecha_nacimiento: FECHA_ADULTO,
    nombre_empresa: 'Tech Solutions SA',
    tipo_empresario: 'empresa_formal' as const,
    pais: 'Costa Rica',
    ciudad: 'San José',
    alcance_operativo: 'nacional' as const,
  }

  it('acepta un objeto completamente válido', () => {
    const result = SaveEmpresarioProfileSchema.safeParse(validBase)
    expect(result.success).toBe(true)
  })

  it('acepta con segundo_apellido opcional', () => {
    const result = SaveEmpresarioProfileSchema.safeParse({
      ...validBase,
      segundo_apellido: 'Mora',
    })
    expect(result.success).toBe(true)
  })

  it('acepta alcance_operativo "internacional"', () => {
    const result = SaveEmpresarioProfileSchema.safeParse({
      ...validBase,
      alcance_operativo: 'internacional',
    })
    expect(result.success).toBe(true)
  })

  it('acepta alcance_operativo "ambos"', () => {
    const result = SaveEmpresarioProfileSchema.safeParse({
      ...validBase,
      alcance_operativo: 'ambos',
    })
    expect(result.success).toBe(true)
  })

  it('acepta tipo_empresario "emprendedor"', () => {
    const result = SaveEmpresarioProfileSchema.safeParse({
      ...validBase,
      tipo_empresario: 'emprendedor',
    })
    expect(result.success).toBe(true)
  })

  it('rechaza nombre con menos de 2 caracteres', () => {
    const result = SaveEmpresarioProfileSchema.safeParse({
      ...validBase,
      nombre: 'A',
    })
    expect(result.success).toBe(false)
  })

  it('rechaza primer_apellido con menos de 2 caracteres', () => {
    const result = SaveEmpresarioProfileSchema.safeParse({
      ...validBase,
      primer_apellido: 'R',
    })
    expect(result.success).toBe(false)
  })

  it('rechaza nombre_empresa con menos de 2 caracteres', () => {
    const result = SaveEmpresarioProfileSchema.safeParse({
      ...validBase,
      nombre_empresa: 'A',
    })
    expect(result.success).toBe(false)
  })

  it('rechaza fecha_nacimiento con formato incorrecto', () => {
    const result = SaveEmpresarioProfileSchema.safeParse({
      ...validBase,
      fecha_nacimiento: '15-05-1990',
    })
    expect(result.success).toBe(false)
  })

  it('rechaza fecha_nacimiento de menor de 18 años', () => {
    // Una fecha muy reciente siempre será menor de 18
    const result = SaveEmpresarioProfileSchema.safeParse({
      ...validBase,
      fecha_nacimiento: '2020-01-01',
    })
    expect(result.success).toBe(false)
  })

  it('rechaza tipo_empresario inválido', () => {
    const result = SaveEmpresarioProfileSchema.safeParse({
      ...validBase,
      tipo_empresario: 'freelance',
    })
    expect(result.success).toBe(false)
  })

  it('rechaza alcance_operativo inválido', () => {
    const result = SaveEmpresarioProfileSchema.safeParse({
      ...validBase,
      alcance_operativo: 'global',
    })
    expect(result.success).toBe(false)
  })

  it('acepta foto_perfil_url como null', () => {
    const result = SaveEmpresarioProfileSchema.safeParse({
      ...validBase,
      foto_perfil_url: null,
    })
    expect(result.success).toBe(true)
  })

  it('rechaza foto_perfil_url no-URL cuando se provee', () => {
    const result = SaveEmpresarioProfileSchema.safeParse({
      ...validBase,
      foto_perfil_url: 'no-es-url',
    })
    expect(result.success).toBe(false)
  })

  it('acepta foto_perfil_url válida', () => {
    const result = SaveEmpresarioProfileSchema.safeParse({
      ...validBase,
      foto_perfil_url: 'https://storage.example.com/foto.jpg',
    })
    expect(result.success).toBe(true)
  })
})
