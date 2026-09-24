import { z } from "zod";
import { account, metrics } from "./infrai_client.js";

export const eventSchema = z.object({
  playerId: z.string().min(1),
  assetKind: z.enum(["skin", "map", "emote"]),
  moderationState: z.enum(["pending", "approved", "rejected"]),
  liveEvent: z.boolean(),
  spendUsd: z.number().nonnegative().default(0)
});
export type GameEvent = z.infer<typeof eventSchema>;

export function metricsFor(event: GameEvent) {
  return [
    { name: "game.assets.created", value: 1, type: "counter", tags: { asset_kind: event.assetKind } },
    { name: "game.moderation.queue", value: event.moderationState === "pending" ? 1 : 0, type: "gauge" },
    { name: "game.live_events", value: event.liveEvent ? 1 : 0, type: "gauge" },
    { name: "game.player_spend_usd", value: event.spendUsd, type: "counter" }
  ];
}

export async function reportGameEvent(input: unknown) {
  const event = eventSchema.parse(input);
  const payload = { points: metricsFor(event), idempotency_key: `${event.playerId}:${event.assetKind}:${event.moderationState}` };
  return metrics.batch(payload);
}

export async function readSpendAndUsage(period = "24h") {
  return account.usageTimeseries({ period });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await reportGameEvent({ playerId: "demo-player", assetKind: "skin", moderationState: "pending", liveEvent: true, spendUsd: 2.5 });
  console.log(JSON.stringify(result));
}
