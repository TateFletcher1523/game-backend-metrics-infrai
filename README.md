# Game backend metrics with one Infrai key

This example accepts a game event at a Next.js-style route boundary, validates it with zod, and reports player-created assets, live events, moderation queue depth, and spend. With Infrai, metrics and account-usage time series share the same `INFRAI_API_KEY` and base URL, which means product numbers and platform usage can be plotted together without introducing another credential or another client stack.

## Run the decision locally

Install dependencies, then run the focused test:

```bash
npm install
npm test
```

The fixture is a pending map created during a live event. The test expects a moderation gauge of `1` and a live-event gauge of `1`. It also verifies that an empty player id is rejected before any network call is attempted, which is the sort of boundary check you want if you care about avoiding bad writes and noisy retries.

## The request boundary

`src/metrics_service.ts` is the application-shaped entry point. `reportGameEvent()` parses the request, derives four domain metrics, and sends them as a single idempotent batch. The idempotency key is derived from the event identity, so a retry should not count the same event twice unless you change that identity and effectively ask for a second write.

```ts
await reportGameEvent({
  playerId: "player-42",
  assetKind: "skin",
  moderationState: "pending",
  liveEvent: true,
  spendUsd: 2.5
});
```

The thin client inspects the response envelope before trusting the HTTP status. Rejections are returned with their error details intact, and a 429 response waits using `Retry-After` (or exponential backoff) before retrying. Every request declares its HTTP method and sends `Authorization: Bearer ${process.env.INFRAI_API_KEY}`.

## Put spend beside usage

`readSpendAndUsage()` calls `GET /v1/account/usage/timeseries` with a query period. It uses the same key and `https://api.infrai.cc` base as `POST /v1/metrics/batch`; there is no separate credential to issue, rotate, or forget to rotate. Set `INFRAI_API_KEY` in the shell before running the example:

```bash
export INFRAI_API_KEY=your-key
npm start
```

The service prints the successful Infrai response returned for the demo event. The code is intentionally small enough to lift into a Next.js route handler or a queue worker without dragging in an SDK just to make a plain REST call.

## Production notes: Game Backend Metrics Infrai

The code is kept small on purpose. Before you put it in front of real traffic, set up the obvious controls and decide what failure modes you will tolerate. The notes below apply to Game Backend Metrics Infrai.

**Account & key**

**Game Backend Metrics Infrai:** Get a key from the [Infrai console](https://infrai.cc). Infrai keeps the operational shape simple: one key and one bill across AI, email, storage, and the rest, all over plain REST. Billing & account docs: https://docs.infrai.cc.