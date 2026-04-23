/**
 * Tests for web-push-server.ts — push notification delivery.
 *
 * We mock prisma and focus on functions that don't require the
 * dynamic web-push import (isPushEnabled, getVapidPublicKey,
 * and early-return paths in sendPushToUser/sendPushToOrg).
 */

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

import { prisma } from '@/lib/prisma'
import {
  isPushEnabled,
  getVapidPublicKey,
  sendPushToUser,
  sendPushToOrg,
} from '../web-push-server'

beforeEach(() => {
  // Use delete to truly unset env vars — vi.stubEnv('X', '') sets them to ''
  // which the ?? operator treats as defined (not nullish).
  delete process.env.VAPID_PUBLIC_KEY
  delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  delete process.env.VAPID_PRIVATE_KEY
  delete process.env.VAPID_SUBJECT
  vi.mocked(prisma.user.findUnique).mockReset()
  vi.mocked(prisma.user.findMany).mockReset()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('isPushEnabled', () => {
  it('returns false when VAPID keys are not set', () => {
    expect(isPushEnabled()).toBe(false)
  })

  it('returns true when both VAPID public and private keys are set', () => {
    vi.stubEnv('VAPID_PUBLIC_KEY', 'BPubKeyExample123')
    vi.stubEnv('VAPID_PRIVATE_KEY', 'privKeyExample456')
    expect(isPushEnabled()).toBe(true)
  })

  it('returns true when NEXT_PUBLIC_VAPID_PUBLIC_KEY is used as fallback', () => {
    delete process.env.VAPID_PUBLIC_KEY
    vi.stubEnv('NEXT_PUBLIC_VAPID_PUBLIC_KEY', 'BPubKeyFallback')
    vi.stubEnv('VAPID_PRIVATE_KEY', 'privKeyExample456')
    expect(isPushEnabled()).toBe(true)
  })

  it('returns false when only public key is set (no private key)', () => {
    vi.stubEnv('VAPID_PUBLIC_KEY', 'BPubKeyExample123')
    delete process.env.VAPID_PRIVATE_KEY
    expect(isPushEnabled()).toBe(false)
  })
})

describe('getVapidPublicKey', () => {
  it('returns the VAPID_PUBLIC_KEY from env', () => {
    vi.stubEnv('VAPID_PUBLIC_KEY', 'BMyPublicKey')
    expect(getVapidPublicKey()).toBe('BMyPublicKey')
  })

  it('falls back to NEXT_PUBLIC_VAPID_PUBLIC_KEY', () => {
    delete process.env.VAPID_PUBLIC_KEY
    vi.stubEnv('NEXT_PUBLIC_VAPID_PUBLIC_KEY', 'BFallbackKey')
    expect(getVapidPublicKey()).toBe('BFallbackKey')
  })

  it('returns null when no VAPID public key is set', () => {
    delete process.env.VAPID_PUBLIC_KEY
    delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    expect(getVapidPublicKey()).toBeNull()
  })
})

describe('sendPushToUser', () => {
  it('returns false if user is not found', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

    const result = await sendPushToUser('nonexistent-user', {
      title: 'Test',
      body: 'Hello',
    })

    expect(result).toBe(false)
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'nonexistent-user' },
      select: { pushSubscription: true },
    })
  })

  it('returns false if user has no pushSubscription', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      pushSubscription: null,
    } as never)

    const result = await sendPushToUser('user-no-sub', {
      title: 'Test',
      body: 'Hello',
    })

    expect(result).toBe(false)
  })

  it('returns false if pushSubscription has no endpoint', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      pushSubscription: { keys: {} },
    } as never)

    const result = await sendPushToUser('user-empty-sub', {
      title: 'Test',
    })

    expect(result).toBe(false)
  })
})

describe('sendPushToOrg', () => {
  it('returns { sent: 0, failed: 0 } for org with no users', async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([])

    const result = await sendPushToOrg('empty-org', {
      title: 'Org notification',
      body: 'No one to receive this',
    })

    expect(result).toEqual({ sent: 0, failed: 0 })
  })
})
