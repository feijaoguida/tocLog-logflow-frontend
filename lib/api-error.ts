type ApiErrorPayload = {
  message?: string | string[];
  details?: Array<{ field?: string; messages?: string[] }> | unknown;
};

export function getApiErrorMessage(
  error: unknown,
  fallbackMessage = 'Ocorreu um erro inesperado.',
): string {
  const payload = (
    error as {
      response?: { data?: ApiErrorPayload };
      message?: string;
    }
  )?.response?.data;

  if (typeof payload?.message === 'string' && payload.message.trim()) {
    return payload.message;
  }

  if (Array.isArray(payload?.message)) {
    const firstMessage = payload.message.find(
      (value): value is string =>
        typeof value === 'string' && value.trim().length > 0,
    );

    if (firstMessage) {
      return firstMessage;
    }
  }

  if (Array.isArray(payload?.details)) {
    const firstDetail = payload.details[0] as { messages?: string[] } | undefined;
    const firstDetailMessage = firstDetail?.messages?.[0];

    if (firstDetailMessage) {
      return firstDetailMessage;
    }
  }

  const genericMessage = (error as { message?: string })?.message;
  if (genericMessage) {
    return genericMessage;
  }

  return fallbackMessage;
}
