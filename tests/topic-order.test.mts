import { test } from "node:test";
import assert from "node:assert/strict";
import { splitTopicItems } from "../src/lib/topicOrder.ts";

test("covered → partly → waiting, not covered split out (stable within a status)", () => {
  const items = [
    { id: "a", status: "not_covered" },
    { id: "b", status: "waiting" },
    { id: "c", status: "covered" },
    { id: "d", status: "partly" },
    { id: "e", status: "covered" },
    { id: "f", status: "not_covered" },
  ] as const;
  const { shown, notCovered } = splitTopicItems([...items]);
  assert.deepEqual(shown.map((x) => x.id), ["c", "e", "d", "b"]);
  assert.deepEqual(notCovered.map((x) => x.id), ["a", "f"]);
});
