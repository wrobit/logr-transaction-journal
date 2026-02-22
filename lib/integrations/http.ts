const DEFAULT_TIMEOUT_MS = 8_000;
const DEFAULT_RETRIES = 2;

export async function fetchJsonWithRetry<T>(
  url: string,
  options: RequestInit = {},
  config: { timeoutMs?: number; retries?: number } = {},
): Promise<T> {
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retries = config.retries ?? DEFAULT_RETRIES;

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          ...options.headers,
        },
      });

      if (!response.ok) {
        if (response.status >= 500 && attempt < retries) {
          await wait(backoffMs(attempt));
          continue;
        }
        throw new Error(`Provider request failed with status ${response.status}.`);
      }

      return (await response.json()) as T;
    } catch (error) {
      lastError = error;

      if (attempt >= retries) {
        break;
      }

      await wait(backoffMs(attempt));
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Provider request failed.");
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffMs(attempt: number) {
  return 200 * 2 ** attempt;
}
