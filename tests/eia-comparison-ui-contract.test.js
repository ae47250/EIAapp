import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const comparisonGroupsSource = readFileSync(
  new URL("../components/search/ComparisonGroups.js", import.meta.url),
  "utf8"
);

test("multi-country choices expose identified series and explicit actions", () => {
  assert.match(comparisonGroupsSource, /country\.title \|\| definition\.title/);
  assert.match(comparisonGroupsSource, /country\.seriesId \|\| "Series unavailable"/);
  assert.match(comparisonGroupsSource, />Graph all countries</);
  assert.match(comparisonGroupsSource, />Excel all countries</);
});
