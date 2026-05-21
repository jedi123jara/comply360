import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('uploadFile (Supabase Storage)', () => {
  const originalEnv = process.env
  const pdfBytes = ['%PDF-1.4\n%test\n1 0 obj\n<<>>\nendobj\n%%EOF']

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
    process.env.SUPABASE_URL = 'https://fake-supabase.co'
    process.env.SUPABASE_SERVICE_KEY = 'fake-service-key'
    global.fetch = vi.fn()
  })

  afterEach(() => {
    process.env = originalEnv
    vi.restoreAllMocks()
  })

  it('debería arrojar un error indicando crear un bucket privado si falla la creación (SEC-05)', async () => {
    const { uploadFile } = await import('../upload')
    const file = new File(pdfBytes, 'test.pdf', { type: 'application/pdf' })

    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: vi.fn().mockResolvedValue('Some generic error from Supabase'),
      } as Response)

    global.fetch = mockFetch

    await expect(uploadFile(file, 'worker-docs')).rejects.toThrowError(/private access/i)
    await expect(uploadFile(file, 'worker-docs')).rejects.not.toThrowError(/public bucket/i)
  })

  it('debería arrojar un error de "private bucket" al subir a un bucket inexistente sin permisos para crearlo', async () => {
    const { uploadFile } = await import('../upload')
    const file = new File(pdfBytes, 'test.pdf', { type: 'application/pdf' })

    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true } as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: vi.fn().mockResolvedValue('bucket not found'),
      } as Response)

    global.fetch = mockFetch

    await expect(uploadFile(file, 'worker-docs')).rejects.toThrowError(/Private bucket/i)
  })
})
