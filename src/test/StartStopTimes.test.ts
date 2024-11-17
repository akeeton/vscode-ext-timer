import * as assert from "assert";
import { DateTime } from "luxon";
import { StartStopTimes } from "../StartStopTimes";

suite("StartStopTimes Test Suite", () => {
  test("isStopped() is true when there's no last start time", () => {
    assert.strictEqual(new StartStopTimes().isStopped(), true);
  });

  test("isStopped() is false when there's a last start time", () => {
    assert.strictEqual(
      new StartStopTimes([], DateTime.utc()).isStopped(),
      false,
    );
  });
});
