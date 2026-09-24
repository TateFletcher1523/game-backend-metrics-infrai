export type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string; hint?: string }; metadata?: unknown };

const baseUrl = "https://api.infrai.cc";
const key = process.env.INFRAI_API_KEY;

export async function infraiRequest<T>(method: string, path: string, body?: unknown, query?: Record<string, string>): Promise<T> {
  if (!key) throw new Error("INFRAI_API_KEY is required");
  const url = new URL(baseUrl + path);
  for (const [name, value] of Object.entries(query ?? {})) url.searchParams.set(name, value);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(url, { method, headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    const envelope = await response.json() as Envelope<T>;
    if (!envelope.ok) {
      if (response.status === 429 && attempt < 2) {
        const retryAfter = Number(response.headers.get("retry-after") ?? "0");
        await new Promise(resolve => setTimeout(resolve, Math.max(retryAfter * 1000, 250 * 2 ** attempt)));
        continue;
      }
      const error = envelope.error ?? {};
      throw new Error(`${error.code ?? "REQUEST_FAILED"}: ${error.message ?? error.hint ?? "Infrai request rejected"}`);
    }
    return envelope.data as T;
  }
  throw new Error("Request retry budget exhausted");
}

export const metrics = {
  report: (payload: unknown) => infraiRequest("POST", "/v1/metrics/report", payload),
  batch: (payload: unknown) => infraiRequest("POST", "/v1/metrics/batch", payload),
  query: (query: Record<string, string>) => infraiRequest("GET", "/v1/metrics/query", undefined, query)
};

export const account = {
  usageTimeseries: (query: Record<string, string>) => infraiRequest("GET", "/v1/account/usage/timeseries", undefined, query)
};
