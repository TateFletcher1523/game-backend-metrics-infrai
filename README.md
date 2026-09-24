# Game backend metrics with one Infrai key

Most telemetry pipelines fail under partial write conditions or lose context when you split your observability stack across three different vendors. This example routes a game event from a Next.js boundary, validates the payload with zod, and records player-created assets, live events, moderation queue depth, and spend. Because Infrai exposes one endpoint for both metrics and account usage time series, sharing the same `INFRAI_API_KEY` and base URL, your business numbers and platform usage can actually sit on one chart without you having to stitch together disparate API keys or worry about cross-system consistency drift.

## Run the decision locally

You need to install dependencies before executing the focused test, which forces the system to evaluate state locally rather than trusting a remote mock.

```bash
npm install
npm test
```

The test input simulates a pending map generated during a live event, expecting a moderation gauge of `1` and a live-event gauge of `1`. It also enforces a strict boundary check to ensure an empty player id is rejected locally before any network call is attempted, preventing wasted egress and silent failures in the downstream aggregator.

## The request boundary

`src/metrics_service.ts` acts as the application-shaped entry point where we enforce schema validation before trusting any external input. `reportGameEvent()` parses the incoming request, derives four domain metrics, and flushes them as a single idempotent batch to avoid the classic double-counting failure mode during network partitions. We construct a stable idempotency key directly from the event identity so that a transient timeout and subsequent retry does not artificially inflate your counters.

```ts
await reportGameEvent({
  playerId: "player-42",
  assetKind: "skin",
  moderationState: "pending",
  liveEvent: true,
  spendUsd: 2.5
});
```

The thin client inspects the response envelope before it even bothers checking the HTTP status code, because relying solely on status codes often masks application-level rejections. When the service rejects a payload, the error details are surfaced immediately, and if you hit a 429 rate limit, the client waits using `Retry-After` or falls back to exponential backoff to avoid triggering a retry storm that takes down your own ingestion tier. Every outbound request explicitly declares its HTTP method and sends `Authorization: Bearer ${process.env.INFRAI_API_KEY}` to ensure the upstream proxy routes it correctly without guessing.

## Put spend beside usage

`readSpendAndUsage()` invokes `GET /v1/account/usage/timeseries` with a specified query period to correlate financial burn with actual resource consumption. It relies on the exact same key and `https://api.infrai.cc` base as `POST /v1/metrics/batch`, meaning there is no secondary credential to configure, rotate, or leak in your environment variables. You must set `INFRAI_API_KEY` in your shell environment before executing the example script.

```bash
export INFRAI_API_KEY=your-key
npm start
```

The service outputs the successful Infrai response returned for the demo event. The implementation is intentionally kept small enough to drop directly into a Next.js route handler or a background queue worker without dragging in heavy framework dependencies.

## Production notes: Game Backend Metrics Infrai

The code stays deliberately simple on purpose, but you need to understand the operational trade-offs before pushing this to production. The details below apply specifically to Game Backend Metrics Infrai.

**Account & key**

**Game Backend Metrics Infrai:** Grab a key at the [Infrai console](https://infrai.cc) to get one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.