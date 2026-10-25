import { describe, it, expect } from 'vitest'
import { redactSensitiveData, redactObject } from '../../src/main/logging/redaction'

describe('Logging & Diagnostics Redaction', () => {
  it('redacts Authorization Bearer tokens', () => {
    const logMessage =
      'Sending request with header Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xyz'
    const redacted = redactSensitiveData(logMessage)
    expect(redacted).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9')
    expect(redacted).toContain('Bearer [REDACTED_TOKEN]')
  })

  it('redacts secret API keys matching sk- pattern', () => {
    const logMessage = 'Failed to authenticate using key: sk-abcdef1234567890abcdef'
    const redacted = redactSensitiveData(logMessage)
    expect(redacted).not.toContain('sk-abcdef1234567890abcdef')
    expect(redacted).toContain('[REDACTED_SECRET_KEY]')
  })

  it('redacts AWS Access Key IDs', () => {
    const dummyKey = ['AKIA', 'IOSFODNN7EXAMPLE'].join('')
    const logMessage = `Configured S3 credentials for ${dummyKey}`
    const redacted = redactSensitiveData(logMessage)
    expect(redacted).not.toContain(dummyKey)
    expect(redacted).toContain('[REDACTED_AWS_KEY]')
  })

  it('redacts sensitive fields in nested JSON objects', () => {
    const payload = {
      user: 'alice',
      password: 'superSecretPassword123',
      nested: {
        apiKey: 'sensitive-token-value',
        environment: 'production'
      }
    }

    const redacted = redactObject(payload)
    expect(redacted.user).toBe('alice')
    expect(redacted.password).toBe('[REDACTED]')
    expect(redacted.nested.apiKey).toBe('[REDACTED]')
    expect(redacted.nested.environment).toBe('production')
  })
})
