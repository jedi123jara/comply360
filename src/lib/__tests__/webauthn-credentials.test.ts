/**
 * Tests para src/lib/webauthn-credentials.ts
 *
 * Estos tests mockean Prisma + @simplewebauthn/server. Validan el contrato
 * que el helper expone a los endpoints API: persistencia correcta tras
 * registro, anti-cloning del counter, búsqueda por credentialID exacto, y
 * gating de userHasStrongCredential.
 */

const { mockPrisma, mockSwa } = vi.hoisted(() => {
  const mockPrisma = {
    webAuthnCredential: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  }
  const mockSwa = {
    generateRegistrationOptions: vi.fn(),
    verifyRegistrationResponse: vi.fn(),
    generateAuthenticationOptions: vi.fn(),
    verifyAuthenticationResponse: vi.fn(),
  }
  return { mockPrisma, mockSwa }
})

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))
vi.mock('@simplewebauthn/server', () => mockSwa)

import {
  buildRegistrationOptions,
  verifyAndPersistRegistration,
  buildAuthenticationOptions,
  verifyAndUpdateAuthentication,
  userHasStrongCredential,
} from '../webauthn-credentials'

const FAKE_RP_ID = 'app.comply360.pe'
beforeAll(() => {
  process.env.NEXT_PUBLIC_APP_URL = `https://${FAKE_RP_ID}`
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('buildRegistrationOptions', () => {
  test('llama a generateRegistrationOptions con rp + excludeCredentials', async () => {
    mockPrisma.webAuthnCredential.findMany.mockResolvedValue([
      { credentialID: Buffer.from('cred-A'), transports: ['internal'] },
    ])
    mockSwa.generateRegistrationOptions.mockResolvedValue({
      challenge: 'fake-challenge',
      rp: { id: FAKE_RP_ID, name: 'COMPLY360' },
    })

    const opts = await buildRegistrationOptions({
      userId: 'user_1',
      userEmail: 'a@b.pe',
      userDisplayName: 'Ana B',
    })

    expect(mockSwa.generateRegistrationOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        rpName: 'COMPLY360',
        rpID: FAKE_RP_ID,
        userName: 'a@b.pe',
        userDisplayName: 'Ana B',
        attestationType: 'none',
        excludeCredentials: [
          expect.objectContaining({ id: expect.any(String), transports: ['internal'] }),
        ],
      }),
    )
    expect(opts.challenge).toBe('fake-challenge')
  })
})

describe('verifyAndPersistRegistration', () => {
  test('persiste credential cuando la verificación es exitosa', async () => {
    mockSwa.verifyRegistrationResponse.mockResolvedValue({
      verified: true,
      registrationInfo: {
        credential: {
          id: 'cred-id-base64url',
          publicKey: new Uint8Array([1, 2, 3]),
          counter: 0,
          transports: ['internal', 'hybrid'],
        },
        aaguid: 'aaguid-123',
        credentialDeviceType: 'multiDevice',
        credentialBackedUp: true,
      },
    })
    mockPrisma.webAuthnCredential.create.mockResolvedValue({ id: 'wac_1' })

    const result = await verifyAndPersistRegistration({
      userId: 'user_1',
      expectedChallenge: 'ch1',
      response: {} as never,
      nickname: 'iPhone 15',
    })

    expect(result.credentialId).toBe('wac_1')
    expect(mockPrisma.webAuthnCredential.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user_1',
          aaguid: 'aaguid-123',
          deviceType: 'multiDevice',
          backedUp: true,
          nickname: 'iPhone 15',
          transports: ['internal', 'hybrid'],
        }),
      }),
    )
  })

  test('lanza si verifyRegistrationResponse no verifica', async () => {
    mockSwa.verifyRegistrationResponse.mockResolvedValue({ verified: false })

    await expect(
      verifyAndPersistRegistration({
        userId: 'user_1',
        expectedChallenge: 'ch1',
        response: {} as never,
      }),
    ).rejects.toThrow(/inválido/)
    expect(mockPrisma.webAuthnCredential.create).not.toHaveBeenCalled()
  })
})

describe('buildAuthenticationOptions', () => {
  test('retorna null si el user no tiene credentials registrados', async () => {
    mockPrisma.webAuthnCredential.findMany.mockResolvedValue([])
    const opts = await buildAuthenticationOptions({ userId: 'user_2' })
    expect(opts).toBeNull()
    expect(mockSwa.generateAuthenticationOptions).not.toHaveBeenCalled()
  })

  test('genera opciones con allowCredentials filtrados a este user (no legacy)', async () => {
    mockPrisma.webAuthnCredential.findMany.mockResolvedValue([
      { credentialID: Buffer.from('A'), transports: ['internal'] },
      { credentialID: Buffer.from('B'), transports: ['hybrid'] },
    ])
    mockSwa.generateAuthenticationOptions.mockResolvedValue({ challenge: 'ch' })

    const opts = await buildAuthenticationOptions({ userId: 'user_3' })

    expect(opts).toEqual({ challenge: 'ch' })
    expect(mockPrisma.webAuthnCredential.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user_3', legacy: false },
      }),
    )
    expect(mockSwa.generateAuthenticationOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        rpID: FAKE_RP_ID,
        userVerification: 'required',
        allowCredentials: expect.arrayContaining([
          expect.objectContaining({ transports: ['internal'] }),
          expect.objectContaining({ transports: ['hybrid'] }),
        ]),
      }),
    )
  })
})

describe('verifyAndUpdateAuthentication — anti-cloning', () => {
  test('credential no encontrado → reason=credential_not_found', async () => {
    mockPrisma.webAuthnCredential.findFirst.mockResolvedValue(null)

    const r = await verifyAndUpdateAuthentication({
      userId: 'user_1',
      expectedChallenge: 'ch',
      response: { id: 'unknown-id' } as never,
    })

    expect(r).toEqual({ verified: false, reason: 'credential_not_found' })
  })

  test('counter no aumenta → counter_replay (anti-cloning)', async () => {
    mockPrisma.webAuthnCredential.findFirst.mockResolvedValue({
      id: 'wac_1',
      credentialID: Buffer.from('A'),
      publicKey: Buffer.from([1, 2]),
      counter: BigInt(5),
      transports: ['internal'],
    })
    mockSwa.verifyAuthenticationResponse.mockResolvedValue({
      verified: true,
      authenticationInfo: { newCounter: 5 }, // mismo, no aumentó
    })

    const r = await verifyAndUpdateAuthentication({
      userId: 'u1',
      expectedChallenge: 'ch',
      response: { id: Buffer.from('A').toString('base64url') } as never,
    })

    expect(r).toEqual({ verified: false, reason: 'counter_replay' })
    expect(mockPrisma.webAuthnCredential.update).not.toHaveBeenCalled()
  })

  test('verifyAuthenticationResponse exitoso + counter sube → update + verified', async () => {
    mockPrisma.webAuthnCredential.findFirst.mockResolvedValue({
      id: 'wac_2',
      credentialID: Buffer.from('A'),
      publicKey: Buffer.from([1, 2]),
      counter: BigInt(3),
      transports: ['internal'],
    })
    mockSwa.verifyAuthenticationResponse.mockResolvedValue({
      verified: true,
      authenticationInfo: { newCounter: 7 },
    })
    mockPrisma.webAuthnCredential.update.mockResolvedValue({})

    const r = await verifyAndUpdateAuthentication({
      userId: 'u1',
      expectedChallenge: 'ch',
      response: { id: Buffer.from('A').toString('base64url') } as never,
    })

    expect(r).toEqual({ verified: true, credentialId: 'wac_2' })
    expect(mockPrisma.webAuthnCredential.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'wac_2' },
        data: expect.objectContaining({ counter: BigInt(7), lastUsedAt: expect.any(Date) }),
      }),
    )
  })

  test('verifyAuthenticationResponse lanza → reason=verify_failed', async () => {
    mockPrisma.webAuthnCredential.findFirst.mockResolvedValue({
      id: 'wac_3',
      credentialID: Buffer.from('A'),
      publicKey: Buffer.from([1, 2]),
      counter: BigInt(0),
      transports: [],
    })
    mockSwa.verifyAuthenticationResponse.mockRejectedValue(new Error('signature mismatch'))

    const r = await verifyAndUpdateAuthentication({
      userId: 'u1',
      expectedChallenge: 'ch',
      response: { id: Buffer.from('A').toString('base64url') } as never,
    })

    expect(r.verified).toBe(false)
    if (!r.verified) expect(r.reason).toMatch(/verify_failed/)
  })
})

describe('userHasStrongCredential', () => {
  test('true si hay credentials no-legacy', async () => {
    mockPrisma.webAuthnCredential.count.mockResolvedValue(2)
    expect(await userHasStrongCredential('u1')).toBe(true)
    expect(mockPrisma.webAuthnCredential.count).toHaveBeenCalledWith({
      where: { userId: 'u1', legacy: false },
    })
  })

  test('false si solo hay legacy', async () => {
    mockPrisma.webAuthnCredential.count.mockResolvedValue(0)
    expect(await userHasStrongCredential('u1')).toBe(false)
  })
})
