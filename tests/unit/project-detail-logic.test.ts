import { describe, it, expect } from 'vitest'
import {
  canAdvanceProject,
  canOpenParticipacion,
  computeEstadoEfectivoProyecto,
  computeEstadoParticipacionEfectivo,
  getParticipacionActions,
  getProjectForwardStates,
  isParticipacionActionAllowed,
  isParticipacionSealed,
  matchesParticipacionFilter,
  PARTICIPACION_ACTION_TARGET,
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

describe('filtros de participación', () => {
  const sinEntrega = { estado: 'enviada' as const, fechaEntregaPrototipo: null }
  const conEntrega = {
    estado: 'enviada' as const,
    fechaEntregaPrototipo: '2026-06-10T00:00:00Z',
  }

  it('todos siempre pasa', () => {
    expect(matchesParticipacionFilter(sinEntrega, 'todos')).toBe(true)
  })

  it('con_entregas exige fecha de entrega de prototipo', () => {
    expect(matchesParticipacionFilter(conEntrega, 'con_entregas')).toBe(true)
    expect(matchesParticipacionFilter(sinEntrega, 'con_entregas')).toBe(false)
  })

  it('revisadas incluye en_revision, no_seleccionada y contratada', () => {
    for (const estado of [
      'en_revision',
      'no_seleccionada',
      'contratada',
    ] as const) {
      expect(
        matchesParticipacionFilter(
          { estado, fechaEntregaPrototipo: null },
          'revisadas',
        ),
      ).toBe(true)
    }
    expect(
      matchesParticipacionFilter(
        { estado: 'enviada', fechaEntregaPrototipo: null },
        'revisadas',
      ),
    ).toBe(false)
  })

  it('contratados incluye contratada y finalizada', () => {
    expect(
      matchesParticipacionFilter(
        { estado: 'finalizada', fechaEntregaPrototipo: null },
        'contratados',
      ),
    ).toBe(true)
  })

  it('rechazados es solo no_seleccionada', () => {
    expect(
      matchesParticipacionFilter(
        { estado: 'no_seleccionada', fechaEntregaPrototipo: null },
        'rechazados',
      ),
    ).toBe(true)
    expect(
      matchesParticipacionFilter(
        { estado: 'retirada', fechaEntregaPrototipo: null },
        'rechazados',
      ),
    ).toBe(false)
  })
})
