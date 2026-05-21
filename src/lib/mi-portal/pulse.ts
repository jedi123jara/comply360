export const PULSE_REACTIONS = ['APPLAUSE', 'THANKS', 'CELEBRATE'] as const

export const PULSE_KUDOS = [
  'BUEN_COMPANERO',
  'PUNTUALIDAD',
  'APOYO_EQUIPO',
  'CAPACITACION_COMPLETADA',
] as const

export type PulseReactionType = (typeof PULSE_REACTIONS)[number]
export type PulseKudoType = (typeof PULSE_KUDOS)[number]

export const kudoCopy: Record<PulseKudoType, { label: string; title: string; description: string; icon: string; tone: string }> = {
  BUEN_COMPANERO: {
    label: 'Buen compañero',
    title: 'recibió un kudo por ser buen compañero',
    description: 'Su apoyo diario hace que el equipo trabaje mejor.',
    icon: 'heart',
    tone: 'emerald',
  },
  PUNTUALIDAD: {
    label: 'Puntualidad',
    title: 'recibió un kudo por puntualidad',
    description: 'Su constancia ayuda a que la operación avance sin fricción.',
    icon: 'clock',
    tone: 'blue',
  },
  APOYO_EQUIPO: {
    label: 'Apoyo en equipo',
    title: 'recibió un kudo por apoyar al equipo',
    description: 'Estuvo presente cuando el equipo necesitaba una mano.',
    icon: 'users',
    tone: 'violet',
  },
  CAPACITACION_COMPLETADA: {
    label: 'Capacitación completada',
    title: 'recibió un kudo por completar capacitación',
    description: 'Sigue subiendo el estándar del equipo con aprendizaje real.',
    icon: 'award',
    tone: 'amber',
  },
}

export function isPulseReactionType(value: unknown): value is PulseReactionType {
  return typeof value === 'string' && PULSE_REACTIONS.includes(value as PulseReactionType)
}

export function isPulseKudoType(value: unknown): value is PulseKudoType {
  return typeof value === 'string' && PULSE_KUDOS.includes(value as PulseKudoType)
}

export function getWorkerPreviewPulse() {
  return {
    today: {
      greeting: 'Hola, Ronald',
      dateLabel: 'Domingo, 17 de mayo',
      statusLabel: 'Todo listo para arrancar el día',
      streakDays: 12,
      pendingCount: 3,
      primaryAction: {
        label: 'Firmar boletas pendientes',
        href: '/mi-portal/boletas',
      },
    },
    personal: {
      levelName: 'Nivel Pro Activo',
      score: 88,
      percentileLabel: 'Top 20% en legajo completo',
      metrics: [
        { label: 'Legajo', value: '100%', detail: 'Información al día', tone: 'emerald' },
        { label: 'Boletas', value: '9/12', detail: 'Firmadas este año', tone: 'blue' },
        { label: 'Asistencia', value: '92%', detail: 'Registro del mes', tone: 'violet' },
        { label: 'Racha', value: '12 días', detail: 'Abriendo tu portal', tone: 'amber' },
      ],
    },
    team: {
      scopeLabel: 'Equipo Reparto',
      summary: 'Tu equipo completó 82% de capacitaciones del mes.',
      progress: 82,
    },
    challenges: [
      {
        id: 'preview-training',
        title: 'Equipo Reparto: capacitaciones al día',
        description: 'Completen las capacitaciones activas antes del cierre de semana.',
        progress: 82,
        target: 100,
        unit: '%',
        scopeLabel: 'Equipo Reparto',
        status: 'ACTIVE',
        tone: 'emerald',
        endsAt: '2026-05-24T05:00:00.000Z',
      },
      {
        id: 'preview-docs',
        title: 'Legajos fuertes',
        description: 'Mantengan documentos verificados y credenciales activas.',
        progress: 94,
        target: 100,
        unit: '%',
        scopeLabel: 'Toda la empresa',
        status: 'ACTIVE',
        tone: 'blue',
        endsAt: '2026-05-31T05:00:00.000Z',
      },
      {
        id: 'preview-payslips',
        title: 'Boletas firmadas del mes',
        description: 'Meta colectiva para cerrar pagos con recepción confirmada.',
        progress: 76,
        target: 100,
        unit: '%',
        scopeLabel: 'Operaciones',
        status: 'ACTIVE',
        tone: 'amber',
        endsAt: '2026-05-30T05:00:00.000Z',
      },
    ],
    feed: [
      {
        id: 'preview-feed-1',
        type: 'KUDO',
        title: 'María recibió un kudo por apoyar al equipo',
        description: 'Estuvo presente cuando el equipo necesitaba una mano.',
        workerName: 'María Flores',
        actorName: 'Ronald Pérez',
        icon: 'users',
        tone: 'violet',
        createdAt: '2026-05-17T14:20:00.000Z',
        reactions: { APPLAUSE: 8, THANKS: 3, CELEBRATE: 5 },
        myReactions: ['APPLAUSE'],
      },
      {
        id: 'preview-feed-2',
        type: 'SYSTEM_ACHIEVEMENT',
        title: 'Carlos completó una capacitación',
        description: 'Sumó una constancia más al avance del equipo.',
        workerName: 'Carlos Rojas',
        actorName: null,
        icon: 'award',
        tone: 'emerald',
        createdAt: '2026-05-17T11:00:00.000Z',
        reactions: { APPLAUSE: 12, THANKS: 2, CELEBRATE: 9 },
        myReactions: [],
      },
      {
        id: 'preview-feed-3',
        type: 'TEAM_CHALLENGE',
        title: 'Equipo Reparto llegó al 82%',
        description: 'El reto de capacitaciones está muy cerca de completarse.',
        workerName: null,
        actorName: null,
        icon: 'trophy',
        tone: 'blue',
        createdAt: '2026-05-16T22:15:00.000Z',
        reactions: { APPLAUSE: 21, THANKS: 4, CELEBRATE: 16 },
        myReactions: ['CELEBRATE'],
      },
    ],
    kudoOptions: PULSE_KUDOS.map((value) => ({ value, label: kudoCopy[value].label })),
    kudoTargets: [
      { id: 'preview-worker-maria', name: 'María Flores', role: 'Repartidora' },
      { id: 'preview-worker-carlos', name: 'Carlos Rojas', role: 'Auxiliar de reparto' },
      { id: 'preview-worker-ana', name: 'Ana Torres', role: 'Coordinadora' },
    ],
  }
}
