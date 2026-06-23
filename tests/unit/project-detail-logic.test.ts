import { describe, it, expect } from 'vitest'
import {
  canAdvanceProject,
  canOpenParticipacion,
  compareParticipacionesBy,
  computeEstadoEfectivoProyecto,
  computeEstadoParticipacionEfectivo,
  getParticipacionActions,
  getProjectForwardStates,
  isParticipacionActionAllowed,
  isParticipacionEnPanel,
  isParticipacionSealed,
  matchesPanelSeleccion,
  PANEL_FILTER_DETALLE,
  PANEL_FILTER_POSTULACIONES,
  PARTICIPACION_ACTION_TARGET,
  type EstadoParticipacion,
  type ParticipacionOrdenable,
} from '@/lib/projects/project-detail-logic'

describe('computeEstadoEfectivoProyecto', () => {
  const NOW = new Date('2026-06-16T00:00:00Z').getTime()

  it('marca en_evaluacion un abierto con cierre vencido', () => {
    expect(
      computeEstadoEfectivoProyecto('abierto', '2026-06-15T00:00:00Z', NOW),
    ).toBe('en_evaluacion')
  })

  it('mantiene abierto si el cierre no venció', () => {
    expect(
      computeEstadoEfectivoProyecto('abierto', '2026-06-17T00:00:00Z', NOW),
    ).toBe('abierto')
  })

  it('mantiene abierto si no hay fecha de cierre', () => {
    expect(computeEstadoEfectivoProyecto('abierto', null, NOW)).toBe('abierto')
  })

  it('no toca estados distintos de abierto aunque haya vencido', () => {
    expect(
      computeEstadoEfectivoProyecto('adjudicado', '2026-06-15T00:00:00Z', NOW),
    ).toBe('adjudicado')
  })
})

describe('transiciones de proyecto', () => {
  it('abierto y en_evaluacion solo avanzan a adjudicado', () => {
    expect(getProjectForwardStates('abierto')).toEqual(['adjudicado'])
    expect(getProjectForwardStates('en_evaluacion')).toEqual(['adjudicado'])
  })

  it('adjudicado avanza a en_desarrollo', () => {
    expect(canAdvanceProject('adjudicado', 'en_desarrollo')).toBe(true)
  })

  it('no permite saltos ni finalizar manualmente', () => {
    expect(canAdvanceProject('abierto', 'en_desarrollo')).toBe(false)
    expect(canAdvanceProject('en_desarrollo', 'finalizado')).toBe(false)
  })

  it('estados terminales no avanzan', () => {
    expect(getProjectForwardStates('finalizado')).toEqual([])
    expect(getProjectForwardStates('cancelado')).toEqual([])
  })
})

describe('acciones de participación', () => {
  it('enviada solo se puede marcar en revisión', () => {
    expect(getParticipacionActions('enviada')).toEqual(['revisar'])
  })

  it('en_revision se puede contratar o rechazar', () => {
    expect(getParticipacionActions('en_revision')).toEqual([
      'contratar',
      'rechazar',
    ])
  })

  it('estados terminales no tienen acciones', () => {
    expect(getParticipacionActions('contratada')).toEqual([])
    expect(getParticipacionActions('no_seleccionada')).toEqual([])
    expect(getParticipacionActions('retirada')).toEqual([])
  })

  it('valida la acción contra el estado actual', () => {
    expect(isParticipacionActionAllowed('enviada', 'contratar')).toBe(false)
    expect(isParticipacionActionAllowed('en_revision', 'rechazar')).toBe(true)
  })

  it('mapea cada acción a su estado destino', () => {
    expect(PARTICIPACION_ACTION_TARGET.revisar).toBe('en_revision')
    expect(PARTICIPACION_ACTION_TARGET.contratar).toBe('contratada')
    expect(PARTICIPACION_ACTION_TARGET.rechazar).toBe('no_seleccionada')
  })
})

describe('sobre sellado de participación', () => {
  it('una enviada está sellada', () => {
    expect(isParticipacionSealed('enviada')).toBe(true)
  })

  it('cualquier estado distinto de enviada está abierto', () => {
    for (const estado of [
      'en_revision',
      'contratada',
      'no_seleccionada',
      'retirada',
      'finalizada',
      'cancelada',
    ] as const) {
      expect(isParticipacionSealed(estado)).toBe(false)
    }
  })
})

describe('puede abrir un sobre', () => {
  it('permite abrir mientras el proyecto recibe o evalúa', () => {
    for (const estado of [
      'abierto',
      'en_recepcion',
      'en_evaluacion',
    ] as const) {
      expect(canOpenParticipacion(estado)).toBe(true)
    }
  })

  it('no permite abrir tras adjudicar o cerrar', () => {
    for (const estado of [
      'borrador',
      'adjudicado',
      'en_desarrollo',
      'finalizado',
      'cancelado',
    ] as const) {
      expect(canOpenParticipacion(estado)).toBe(false)
    }
  })
})

describe('estado efectivo de participación (derivado)', () => {
  it('deriva a no_seleccionada las vivas cuando el proyecto se adjudicó', () => {
    for (const estadoProyecto of [
      'adjudicado',
      'en_desarrollo',
      'finalizado',
    ] as const) {
      expect(
        computeEstadoParticipacionEfectivo('enviada', estadoProyecto),
      ).toBe('no_seleccionada')
      expect(
        computeEstadoParticipacionEfectivo('en_revision', estadoProyecto),
      ).toBe('no_seleccionada')
    }
  })

  it('deriva a cancelada las vivas cuando el proyecto se canceló', () => {
    expect(computeEstadoParticipacionEfectivo('enviada', 'cancelado')).toBe(
      'cancelada',
    )
    expect(computeEstadoParticipacionEfectivo('en_revision', 'cancelado')).toBe(
      'cancelada',
    )
  })

  it('no toca las vivas mientras el proyecto sigue abierto', () => {
    for (const estadoProyecto of [
      'borrador',
      'abierto',
      'en_recepcion',
    ] as const) {
      expect(
        computeEstadoParticipacionEfectivo('enviada', estadoProyecto),
      ).toBe('enviada')
      expect(
        computeEstadoParticipacionEfectivo('en_revision', estadoProyecto),
      ).toBe('en_revision')
    }
  })

  it('respeta los estados terminales aunque el proyecto esté cerrado', () => {
    expect(computeEstadoParticipacionEfectivo('contratada', 'adjudicado')).toBe(
      'contratada',
    )
    expect(
      computeEstadoParticipacionEfectivo('no_seleccionada', 'cancelado'),
    ).toBe('no_seleccionada')
    expect(computeEstadoParticipacionEfectivo('retirada', 'finalizado')).toBe(
      'retirada',
    )
  })
})

describe('panel de participaciones: universo por contexto', () => {
  it('detalle incluye los 7 estados', () => {
    for (const estado of [
      'enviada',
      'en_revision',
      'contratada',
      'no_seleccionada',
      'retirada',
      'finalizada',
      'cancelada',
    ] as const) {
      expect(isParticipacionEnPanel(estado, PANEL_FILTER_DETALLE)).toBe(true)
    }
  })

  it('postulaciones excluye finalizada y cancelada del universo', () => {
    expect(
      isParticipacionEnPanel('finalizada', PANEL_FILTER_POSTULACIONES),
    ).toBe(false)
    expect(
      isParticipacionEnPanel('cancelada', PANEL_FILTER_POSTULACIONES),
    ).toBe(false)
    for (const estado of [
      'enviada',
      'en_revision',
      'contratada',
      'no_seleccionada',
      'retirada',
    ] as const) {
      expect(isParticipacionEnPanel(estado, PANEL_FILTER_POSTULACIONES)).toBe(
        true,
      )
    }
  })
})

describe('panel de participaciones: selección multiselección', () => {
  it('selección vacía deja pasar cualquier estado', () => {
    const vacia = new Set<EstadoParticipacion>()
    expect(matchesPanelSeleccion('enviada', vacia)).toBe(true)
    expect(matchesPanelSeleccion('contratada', vacia)).toBe(true)
  })

  it('con selección, solo pasan los estados marcados (OR)', () => {
    const seleccion = new Set<EstadoParticipacion>(['enviada', 'contratada'])
    expect(matchesPanelSeleccion('enviada', seleccion)).toBe(true)
    expect(matchesPanelSeleccion('contratada', seleccion)).toBe(true)
    expect(matchesPanelSeleccion('retirada', seleccion)).toBe(false)
  })
})

describe('panel de participaciones: orden', () => {
  const base = {
    estudianteNombre: 'Ana',
    estudianteApellidos: 'Lopez',
    fechaPostulacion: '2026-06-10T00:00:00Z',
  }
  const ana: ParticipacionOrdenable = { ...base }
  const bruno: ParticipacionOrdenable = {
    estudianteNombre: 'Bruno',
    estudianteApellidos: 'Diaz',
    fechaPostulacion: '2026-06-12T00:00:00Z',
  }

  it('ordena por fecha ascendente y descendente', () => {
    expect(
      compareParticipacionesBy(ana, bruno, 'fecha_postulacion', 'asc'),
    ).toBeLessThan(0)
    expect(
      compareParticipacionesBy(ana, bruno, 'fecha_postulacion', 'desc'),
    ).toBeGreaterThan(0)
  })

  it('ordena por nombre de participante insensible a mayúsculas', () => {
    expect(
      compareParticipacionesBy(ana, bruno, 'nombre_participante', 'asc'),
    ).toBeLessThan(0)
  })

  it('ordena por nombre de proyecto y tolera proyecto ausente', () => {
    const conProyecto: ParticipacionOrdenable = {
      ...base,
      proyecto: { titulo: 'Zeta' },
    }
    const sinProyecto: ParticipacionOrdenable = { ...base }
    // El que no tiene proyecto ('') va antes en orden ascendente.
    expect(
      compareParticipacionesBy(
        sinProyecto,
        conProyecto,
        'nombre_proyecto',
        'asc',
      ),
    ).toBeLessThan(0)
  })
})
