import * as assert from "assert";
import { DateTime } from "luxon";
import { LastStartTime, StartStopTimes } from "../StartStopTimes";

suite("StartStopTimes Test Suite", () => {
  test("isStarted() is true when there's a last start time", () => {
    assert.strictEqual(
      new StartStopTimes(new LastStartTime(DateTime.utc())).isStarted(),
      true,
    );
  });

  test("isStarted() is false when there's no last start time", () => {
    assert.strictEqual(new StartStopTimes().isStarted(), false);
  });
});
