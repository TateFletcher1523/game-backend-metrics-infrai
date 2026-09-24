import assert from "node:assert/strict";
import { eventSchema, metricsFor } from "./metrics_service.js";

const parsed = eventSchema.parse({ playerId: "p1", assetKind: "map", moderationState: "pending", liveEvent: true });
const metrics = metricsFor(parsed);
assert.equal(metrics.find(item => item.name === "game.moderation.queue")?.value, 1);
assert.equal(metrics.find(item => item.name === "game.live_events")?.value, 1);
assert.throws(() => eventSchema.parse({ playerId: "", assetKind: "map", moderationState: "pending", liveEvent: true }));
console.log("metrics decision test passed");
