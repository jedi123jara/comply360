/**
 * GET /api/v1/openapi
 *
 * Devuelve un documento OpenAPI 3.1 con la descripción de la API pública v1
 * de COMPLY360. Es estático (mantenido a mano) — al escalar, migrar a
 * generación automática con zod-to-openapi.
 *
 * Visualizable en cualquier viewer Swagger / Stoplight Elements.
 */

import { NextResponse } from 'next/server'

const OPENAPI = {
  openapi: '3.1.0',
  info: {
    title: 'COMPLY360 API v1',
    version: '1.0.0',
    description:
      'API pública para integraciones con COMPLY360 — la plataforma de compliance laboral peruano. Autenticación con API Key (header `X-API-Key`).',
    contact: {
      name: 'COMPLY360',
      url: 'https://comply360.pe',
    },
    license: { name: 'Proprietary' },
  },
  servers: [
    { url: 'https://app.comply360.pe', description: 'Producción' },
    { url: 'http://localhost:3000', description: 'Desarrollo local' },
  ],
  security: [{ ApiKeyAuth: [] }],
  tags: [
    { name: 'Workers', description: 'Trabajadores de la organización' },
    { name: 'Contracts', description: 'Contratos laborales' },
    { name: 'Compliance', description: 'Diagnósticos y score de cumplimiento' },
    { name: 'Agents', description: 'Agentes IA especializados' },
  ],
  paths: {
    '/api/v1/workers': {
      get: {
        tags: ['Workers'],
        summary: 'Lista trabajadores',
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50, maximum: 200 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'TERMINATED'] } },
        ],
        responses: {
          '200': {
            description: 'Lista de trabajadores',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    workers: { type: 'array', items: { $ref: '#/components/schemas/Worker' } },
                    total: { type: 'integer' },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
      post: {
        tags: ['Workers'],
        summary: 'Crea un trabajador',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/WorkerInput' },
            },
          },
        },
        responses: {
          '201': { description: 'Creado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Worker' } } } },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/v1/contracts': {
      get: {
        tags: ['Contracts'],
        summary: 'Lista contratos',
        responses: {
          '200': { description: 'Lista de contratos' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/v1/compliance': {
      get: {
        tags: ['Compliance'],
        summary: 'Score de compliance vigente',
        responses: {
          '200': {
            description: 'Resumen de compliance',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    score: { type: 'integer', minimum: 0, maximum: 100 },
                    multaEstimadaSoles: { type: 'number' },
                    areasAuditadas: { type: 'integer' },
                    ultimoDiagnostico: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/agents/{slug}/run': {
      post: {
        tags: ['Agents'],
        summary: 'Ejecuta un agente IA por slug',
        parameters: [
          {
            name: 'slug',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              enum: ['sunafil-analyzer', 'descargo-writer', 'payslip-auditor', 'risk-monitor'],
            },
          },
        ],
        requestBody: {
          required: false,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  file: { type: 'string', format: 'binary' },
                  params: { type: 'string', description: 'JSON serializado con parámetros' },
                },
              },
            },
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  type: { type: 'string', enum: ['pdf', 'docx', 'text', 'json'] },
                  text: { type: 'string' },
                  params: { type: 'object' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Resultado del agente',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AgentResult' },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { description: 'Agente no encontrado' },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
      },
    },
    responses: {
      Unauthorized: {
        description: 'API key inválida o ausente',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: { error: { type: 'string' } },
            },
          },
        },
      },
      BadRequest: {
        description: 'Datos inválidos',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: { error: { type: 'string' } },
            },
          },
        },
      },
    },
    schemas: {
      Worker: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          dni: { type: 'string', pattern: '^\\d{8}$' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          email: { type: 'string', format: 'email', nullable: true },
          position: { type: 'string', nullable: true },
          regimenLaboral: {
            type: 'string',
            enum: [
              'GENERAL',
              'MYPE_MICRO',
              'MYPE_PEQUENA',
              'AGRARIO',
              'CONSTRUCCION_CIVIL',
              'DOMESTICO',
              'CAS',
              'MODALIDAD_FORMATIVA',
            ],
          },
          tipoContrato: {
            type: 'string',
            enum: [
              'INDEFINIDO',
              'PLAZO_FIJO',
              'TIEMPO_PARCIAL',
              'PRACTICAS_PREPROFESIONALES',
              'PRACTICAS_PROFESIONALES',
              'LOCACION_SERVICIOS',
            ],
          },
          fechaIngreso: { type: 'string', format: 'date' },
          sueldoBruto: { type: 'number' },
        },
      },
      WorkerInput: {
        type: 'object',
        required: ['dni', 'firstName', 'lastName', 'fechaIngreso', 'sueldoBruto'],
        properties: {
          dni: { type: 'string', pattern: '^\\d{8}$' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          email: { type: 'string', format: 'email', nullable: true },
          fechaIngreso: { type: 'string', format: 'date' },
          sueldoBruto: { type: 'number', minimum: 0 },
          regimenLaboral: { type: 'string' },
          tipoContrato: { type: 'string' },
        },
      },
      AgentResult: {
        type: 'object',
        properties: {
          agentSlug: { type: 'string' },
          runId: { type: 'string' },
          status: { type: 'string', enum: ['success', 'partial', 'error'] },
          confidence: { type: 'integer', minimum: 0, maximum: 100 },
          summary: { type: 'string' },
          warnings: { type: 'array', items: { type: 'string' } },
          data: {},
          recommendedActions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                label: { type: 'string' },
                description: { type: 'string' },
                type: { type: 'string', enum: ['navigate', 'download', 'create', 'agent-call', 'external'] },
                priority: { type: 'string', enum: ['critical', 'important', 'info'] },
              },
            },
          },
          model: { type: 'string' },
          durationMs: { type: 'integer' },
        },
      },
    },
  },
}

export async function GET() {
  return NextResponse.json(OPENAPI, {
    headers: {
      'Cache-Control': 'public, max-age=3600',
      // SECURITY: Restrict CORS to same origin only (no wildcard)
      'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL || 'https://comply360.pe',
    },
  })
}
