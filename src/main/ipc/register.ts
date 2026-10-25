import { ipcMain, type IpcMainInvokeEvent } from 'electron'
import { z } from 'zod'
import { PROTOCOL_ORIGIN } from '../../shared/constants'
import type { IpcResult } from '../../shared/types'

export type SafeHandler<TReq, TRes> = (
  payload: TReq,
  event: IpcMainInvokeEvent
) => Promise<TRes> | TRes

/**
 * Validate that an IPC invocation originates from our authorized renderer frame.
 */
export function isValidSenderFrame(event: IpcMainInvokeEvent, isDev: boolean): boolean {
  const frame = event.senderFrame
  if (!frame) {
    return false
  }

  const url = frame.url
  if (isDev) {
    return (
      url.startsWith('http://localhost:') ||
      url.startsWith('http://127.0.0.1:') ||
      url.startsWith(PROTOCOL_ORIGIN)
    )
  }

  return url.startsWith(PROTOCOL_ORIGIN)
}

/**
 * Register a typed IPC handler with sender origin checking and Zod schema validation.
 */
export function registerIpcHandler<TReq, TRes>(
  channel: string,
  requestSchema: z.ZodType<TReq>,
  handler: SafeHandler<TReq, TRes>,
  isDev = process.env.NODE_ENV === 'development'
): void {
  ipcMain.handle(channel, async (event, rawPayload): Promise<IpcResult<TRes>> => {
    // 1. Origin verification
    if (!isValidSenderFrame(event, isDev)) {
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED_ORIGIN',
          message: 'IPC invocation rejected: unauthorized sender frame origin'
        }
      }
    }

    // 2. Request payload schema validation
    const parseResult = requestSchema.safeParse(rawPayload)
    if (!parseResult.success) {
      return {
        success: false,
        error: {
          code: 'INVALID_PAYLOAD',
          message: 'IPC request failed schema validation',
          details: parseResult.error.format()
        }
      }
    }

    // 3. Handler execution
    try {
      const data = await handler(parseResult.data, event)
      return {
        success: true,
        data
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown internal error'
      return {
        success: false,
        error: {
          code: 'HANDLER_ERROR',
          message
        }
      }
    }
  })
}
