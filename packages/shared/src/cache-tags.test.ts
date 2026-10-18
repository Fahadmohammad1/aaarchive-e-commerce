import { expect, test } from "bun:test";
import { cacheTags } from "./cache-tags.js";

test("per-item tags carry the slug", () => {
  expect(cacheTags.product("black-hoodie")).toBe("product:black-hoodie");
  expect(cacheTags.category("hoodies")).toBe("category:hoodies");
  expect(cacheTags.collection("eid")).toBe("collection:eid");
});
