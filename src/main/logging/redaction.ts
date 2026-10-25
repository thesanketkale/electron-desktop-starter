/**
 * Sensitive patterns to redact from logs and diagnostics.
 */
const SENSITIVE_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  // Bearer tokens
  {
    pattern: /Bearer\s+([A-Za-z0-9\-._~+/]+=*)/gi,
    replacement: 'Bearer [REDACTED_TOKEN]'
  },
  // API Keys (e.g. sk-..., key-..., etc.)
  {
    pattern: /(sk-[A-Za-z0-9_-]{16,})/gi,
    replacement: '[REDACTED_SECRET_KEY]'
  },
  // AWS Access Keys
  {
    pattern: /(AKIA[0-9A-Z]{16})/g,
    replacement: '[REDACTED_AWS_KEY]'
  },
  // Generic key/password key-value pairs
  {
    pattern: /("(?:password|secret|apiKey|access_token|refreshToken)":\s*")([^"]+)(")/gi,
    replacement: '$1[REDACTED]$3'
  },
  // Key=Value query string or env-style
  {
    pattern: /((?:password|secret|api_key|token)=)([^&\s]+)/gi,
    replacement: '$1[REDACTED]'
  }
]

/**
 * Strip sensitive strings from a log message.
 */
export function redactSensitiveData(input: string): string {
  let result = input
  for (const { pattern, replacement } of SENSITIVE_PATTERNS) {
    result = result.replace(pattern, replacement)
  }
  return result
}

/**
 * Deep-traverse an object or array and redact string fields.
 */
export function redactObject<T>(item: T): T {
  if (typeof item === 'string') {
    return redactSensitiveData(item) as unknown as T
  }
  if (Array.isArray(item)) {
    return item.map((element) => redactObject(element)) as unknown as T
  }
  if (item !== null && typeof item === 'object') {
    const output: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(item)) {
      if (/password|secret|token|apikey|credential/i.test(key) && typeof value === 'string') {
        output[key] = '[REDACTED]'
      } else {
        output[key] = redactObject(value)
      }
    }
    return output as T
  }
  return item
}
