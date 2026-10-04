import { api } from '@/lib/api'

export interface ErrorReportContext {
  module?: string
  screen?: string
  action?: string
  errorMessage?: string
  requestPayload?: unknown
  metadata?: Record<string, unknown>
}

/**
 * Reporta erros ocorridos no cliente web para o backend em modo fire-and-forget.
 * Nunca rejeita nem quebra o fluxo de execução da UI.
 */
export function reportError(error: unknown, context: ErrorReportContext = {}): void {
  try {
    const errObj = error instanceof Error ? error : null
    const responseErr = (error as { response?: { status?: number; data?: unknown } })?.response

    const errorMessage =
      context.errorMessage ||
      (typeof responseErr?.data === 'object' &&
      responseErr.data !== null &&
      'message' in responseErr.data
        ? String((responseErr.data as { message: unknown }).message)
        : errObj?.message || 'Erro inesperado no cliente')

    const originalError =
      errObj?.stack ||
      (errObj ? errObj.message : typeof error === 'string' ? error : JSON.stringify(error))

    const statusCode = responseErr?.status || (error as { statusCode?: number })?.statusCode

    let payloadString: string | undefined
    if (context.requestPayload !== undefined && context.requestPayload !== null) {
      payloadString =
        typeof context.requestPayload === 'string'
          ? context.requestPayload
          : JSON.stringify(context.requestPayload)
    }

    const currentScreen =
      context.screen || (typeof window !== 'undefined' ? window.location.pathname : undefined)

    const payload = {
      source: 'FRONTEND' as const,
      module: context.module,
      screen: currentScreen,
      action: context.action,
      errorMessage: String(errorMessage).slice(0, 1000),
      originalError: originalError ? String(originalError).slice(0, 5000) : undefined,
      stackTrace: errObj?.stack ? String(errObj.stack).slice(0, 10000) : undefined,
      statusCode: typeof statusCode === 'number' ? statusCode : undefined,
      requestPayload: payloadString ? payloadString.slice(0, 10000) : undefined,
      metadata: {
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        timestamp: new Date().toISOString(),
        ...(context.metadata || {}),
      },
    }

    // Fire and forget: post silencioso com descarte imediato se falhar
    api.post('/error-logs', payload).catch(() => {
      // Falha de envio silenciosamente ignorada para garantir overhead zero e sem crash
    })
  } catch {
    // Silencioso - proteção total
  }
}
