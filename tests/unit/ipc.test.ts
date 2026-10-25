import { describe, it, expect } from 'vitest'
import {
  DbCreateNoteRequestSchema,
  DbUpdateNoteRequestSchema,
  DbDeleteNoteRequestSchema,
  SettingsSetRequestSchema,
  UpdateSetChannelRequestSchema
} from '../../src/shared/ipc'
import { isValidSenderFrame } from '../../src/main/ipc/register'
import type { IpcMainInvokeEvent } from 'electron'

describe('IPC Zod Schemas Validation', () => {
  describe('DbCreateNoteRequestSchema', () => {
    it('accepts valid note title and content', () => {
      const result = DbCreateNoteRequestSchema.safeParse({
        title: 'Project Roadmap',
        content: 'Draft for Q4 release'
      })
      expect(result.success).toBe(true)
    })

    it('rejects empty title', () => {
      const result = DbCreateNoteRequestSchema.safeParse({
        title: '',
        content: 'Some content'
      })
      expect(result.success).toBe(false)
    })

    it('rejects title longer than 200 characters', () => {
      const result = DbCreateNoteRequestSchema.safeParse({
        title: 'a'.repeat(201),
        content: 'Some content'
      })
      expect(result.success).toBe(false)
    })
  })

  describe('DbUpdateNoteRequestSchema', () => {
    it('accepts valid UUID and fields', () => {
      const result = DbUpdateNoteRequestSchema.safeParse({
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Updated Title',
        content: 'Updated Content'
      })
      expect(result.success).toBe(true)
    })

    it('rejects invalid non-UUID id', () => {
      const result = DbUpdateNoteRequestSchema.safeParse({
        id: 'not-a-uuid',
        title: 'Updated Title',
        content: 'Updated Content'
      })
      expect(result.success).toBe(false)
    })
  })

  describe('DbDeleteNoteRequestSchema', () => {
    it('rejects invalid non-UUID id', () => {
      const result = DbDeleteNoteRequestSchema.safeParse({
        id: 'invalid-id'
      })
      expect(result.success).toBe(false)
    })
  })

  describe('SettingsSetRequestSchema', () => {
    it('accepts valid theme and update channel', () => {
      const result = SettingsSetRequestSchema.safeParse({
        theme: 'dark',
        updateChannel: 'beta'
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.theme).toBe('dark')
        expect(result.data.updateChannel).toBe('beta')
      }
    })

    it('rejects invalid theme name', () => {
      const result = SettingsSetRequestSchema.safeParse({
        theme: 'neon-cyberpunk'
      })
      expect(result.success).toBe(false)
    })
  })

  describe('UpdateSetChannelRequestSchema', () => {
    it('accepts "latest" or "beta"', () => {
      expect(UpdateSetChannelRequestSchema.safeParse({ channel: 'latest' }).success).toBe(true)
      expect(UpdateSetChannelRequestSchema.safeParse({ channel: 'beta' }).success).toBe(true)
    })

    it('rejects unauthorized channels', () => {
      expect(UpdateSetChannelRequestSchema.safeParse({ channel: 'nightly' }).success).toBe(false)
    })
  })
})

describe('IPC Sender Origin Verification', () => {
  const createMockEvent = (url: string): IpcMainInvokeEvent =>
    ({
      senderFrame: { url }
    }) as unknown as IpcMainInvokeEvent

  it('allows app://- origin in production mode', () => {
    const event = createMockEvent('app://-/index.html')
    expect(isValidSenderFrame(event, false)).toBe(true)
  })

  it('rejects external or malicious origins in production mode', () => {
    expect(isValidSenderFrame(createMockEvent('https://malicious-site.com'), false)).toBe(false)
    expect(isValidSenderFrame(createMockEvent('file:///C:/malicious.html'), false)).toBe(false)
    expect(isValidSenderFrame(createMockEvent('http://localhost:5173'), false)).toBe(false)
  })

  it('allows localhost origin in development mode', () => {
    const event = createMockEvent('http://localhost:5173/index.html')
    expect(isValidSenderFrame(event, true)).toBe(true)
  })

  it('rejects missing senderFrame', () => {
    const event = {} as IpcMainInvokeEvent
    expect(isValidSenderFrame(event, false)).toBe(false)
  })
})
