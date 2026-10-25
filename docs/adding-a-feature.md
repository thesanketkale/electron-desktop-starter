# Tutorial: Adding an IPC Channel End-to-End

This guide walks through adding a new feature that spans across the Main, Preload, and Renderer processes using our zero-trust typed IPC architecture.

**Example Feature**: Querying system storage / disk space metrics.

---

### Step 1: Define IPC Channel & Zod Schemas

Open `src/shared/constants.ts` and declare your new IPC channel:

```typescript
// src/shared/constants.ts
export const IPC_CHANNELS = {
  // ... existing channels
  SYSTEM_GET_DISK_SPACE: 'system:getDiskSpace'
} as const
```

Open `src/shared/ipc.ts` and define the request and response Zod schemas:

```typescript
// src/shared/ipc.ts
export const SystemGetDiskSpaceRequestSchema = z.void()

export const SystemGetDiskSpaceResponseSchema = z.object({
  freeBytes: z.number().nonnegative(),
  totalBytes: z.number().positive(),
  freePercentage: z.number().min(0).max(100)
})

export type SystemDiskSpaceInfo = z.infer<typeof SystemGetDiskSpaceResponseSchema>
```

Add your channel schemas to `IpcContract` for full compile-time validation:

```typescript
export const IpcContract = {
  // ...
  [IPC_CHANNELS.SYSTEM_GET_DISK_SPACE]: {
    request: SystemGetDiskSpaceRequestSchema,
    response: SystemGetDiskSpaceResponseSchema
  }
}
```

---

### Step 2: Register Main Process Handler

Open `src/main/ipc/handlers.ts` and register your handler using `registerIpcHandler`:

```typescript
// src/main/ipc/handlers.ts
import { statfsSync } from 'node:fs'
import { app } from 'electron'
import { SystemGetDiskSpaceRequestSchema, type SystemDiskSpaceInfo } from '../../shared/ipc'

export function registerAllIpcHandlers(settingsManager: SettingsManager, isDev: boolean): void {
  // ...

  registerIpcHandler(
    IPC_CHANNELS.SYSTEM_GET_DISK_SPACE,
    SystemGetDiskSpaceRequestSchema,
    async (): Promise<SystemDiskSpaceInfo> => {
      const stats = statfsSync(app.getPath('userData'))
      const freeBytes = stats.bfree * stats.bsize
      const totalBytes = stats.blocks * stats.bsize
      const freePercentage = Math.round((freeBytes / totalBytes) * 100)

      return {
        freeBytes,
        totalBytes,
        freePercentage
      }
    },
    isDev
  )
}
```

`registerIpcHandler` automatically validates the sender frame origin and asserts that the incoming request matches `SystemGetDiskSpaceRequestSchema`.

---

### Step 3: Expose via Preload Bridge

Open `src/preload/index.ts` and expose your new method on the `api` object:

```typescript
// src/preload/index.ts
export const api = {
  // ...
  system: {
    getDiskSpace: (): Promise<SystemDiskSpaceInfo> => invokeIpc(IPC_CHANNELS.SYSTEM_GET_DISK_SPACE)
  }
}
```

Update TypeScript ambient definitions in `src/preload/index.d.ts`:

```typescript
// src/preload/index.d.ts
import type { api } from './index'

declare global {
  interface Window {
    api: typeof api
  }
}
```

---

### Step 4: Consume in Renderer React Component

Open or create a view in `src/renderer/src/views/`:

```tsx
import { useEffect, useState } from 'react'
import type { SystemDiskSpaceInfo } from '@shared/ipc'

export function DiskSpaceWidget(): React.JSX.Element {
  const [disk, setDisk] = useState<SystemDiskSpaceInfo | null>(null)

  useEffect(() => {
    window.api.system
      .getDiskSpace()
      .then(setDisk)
      .catch((err) => console.error('Failed to query disk space:', err))
  }, [])

  if (!disk) return <div>Loading storage info...</div>

  return (
    <div className="card">
      <h3>Available Storage</h3>
      <p>
        {(disk.freeBytes / 1024 ** 3).toFixed(2)} GB free ({disk.freePercentage}%)
      </p>
    </div>
  )
}
```

---

### Step 5: Add Unit & E2E Tests

In `tests/unit/ipc.test.ts`, add a schema test:

```typescript
it('validates disk space response schema', () => {
  const valid = SystemGetDiskSpaceResponseSchema.safeParse({
    freeBytes: 1000000,
    totalBytes: 5000000,
    freePercentage: 20
  })
  expect(valid.success).toBe(true)
})
```

In `tests/e2e/app.spec.ts`, assert the new IPC call from Playwright:

```typescript
test('queries disk space through window.api.system.getDiskSpace', async () => {
  const disk = await page.evaluate(() => window.api.system.getDiskSpace())
  expect(disk.freeBytes).toBeGreaterThan(0)
  expect(disk.totalBytes).toBeGreaterThan(0)
})
```
