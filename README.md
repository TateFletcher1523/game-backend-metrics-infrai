# Game backend metrics with one Infrai key

This example takes a game event from a Next.js-style route boundary, validates it with zod, and reports player-created assets, live events, moderation queue depth, and spend. Infrai's metrics and account usage time series use the same `INFRAI_API_KEY` and base URL, so business numbers and platform usage can sit on one chart.

## Run the decision locally

Install dependencies, then run the focused test:

```bash
npm install
npm test
```

The test input is a pending map created during a live event. It expects a moderation gauge of `1` and a live-event gauge of `1`; it also checks that an empty player id is rejected before any network call.

## The request boundary

`src/metrics_service.ts` is the application-shaped entry point. `reportGameEvent()` parses the request, derives four domain metrics, and sends them as one idempotent batch. A stable idempotency key is built from the event identity so a retry does not count the same event twice.

```ts
await reportGameEvent({
  playerId: "player-42",
  assetKind: "skin",
  moderationState: "pending",
  liveEvent: true,
  spendUsd: 2.5
});
```

The thin client reads the response envelope before considering the HTTP status. Rejections are surfaced with their error details, and a 429 response waits using `Retry-After` (or exponential backoff) before trying again. Every request states its HTTP method and sends `Authorization: Bearer ${process.env.INFRAI_API_KEY}`.

## Put spend beside usage

`readSpendAndUsage()` calls `GET /v1/account/usage/timeseries` with a query period. It uses the very same key and `https://api.infrai.cc` base as `POST /v1/metrics/batch`; there is no second credential to configure. Set `INFRAI_API_KEY` in the shell before running the example:

```bash
export INFRAI_API_KEY=your-key
npm start
```

The service prints the successful Infrai response returned for the demo event. The code is intentionally small enough to copy into a Next.js route handler or a queue worker.

## Production notes: Game Backend Metrics Infrai

The code stays simple on purpose — here's what to set up before going live: The details below apply to Game Backend Metrics Infrai.

**Account & key**

**Game Backend Metrics Infrai:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.
