import * as assert from "assert";
import { DateTime, Duration, Interval } from "luxon";
import { StartStopTimes } from "../StartStopTimes";
import { deepStrictValuesEqual } from "./assert";

suite("StartStopTimes Test Suite", () => {
  const testDateTime = DateTime.fromObject({ year: 1970, month: 1, day: 1 });
  const testDuration = Duration.fromObject({ hours: 4, minutes: 20 });
  const testIntervals = [
    Interval.after(testDateTime, testDuration),
    Interval.after(
      testDateTime.plus(testDuration).plus(testDuration),
      testDuration,
    ),
  ];

  test("startedNow() returns an object where isStarted() is true and lastStartTime is near DateTime.utc()", () => {
    const startedNow = StartStopTimes.startedNow();

    assert.ok(startedNow.isStarted());

    const epsilonMillis = 100;
    const diffMillis = Interval.fromDateTimes(
      startedNow.lastStartTime,
      DateTime.utc(),
    )
      .toDuration()
      .toMillis();

    assert.ok(Math.abs(diffMillis) < epsilonMillis);
  });

  test("StartStopTimes DTO round trip is the same as the original", () => {
    const startStopTimes = StartStopTimes.startedNow(testIntervals);
    const roundTrip = StartStopTimes.fromDto(startStopTimes.toDto());

    deepStrictValuesEqual(roundTrip, startStopTimes);
  });

  test("startedNow() returns an object where isStarted() is true", () => {
    assert.ok(StartStopTimes.startedNow().isStarted());
  });

  test("stopped() returns an object where isStarted() is false", () => {
    assert.ok(!StartStopTimes.stopped().isStarted());
  });

  test("toStarted() returns the same object when isStarted() is true", () => {
    const started = StartStopTimes.startedNow();
    const startedAgain = started.toStarted();

    assert.ok(started.isStarted());
    assert.ok(startedAgain.isStarted());
    assert.strictEqual(startedAgain, started);
  });

  test("toStarted() returns a new object when isStarted() is false", () => {
    const stopped = StartStopTimes.stopped();
    const started = stopped.toStarted();

    assert.ok(!stopped.isStarted());
    assert.ok(started.isStarted());
    assert.notStrictEqual(started, stopped);
  });

  test("toStopped() returns the same object when isStarted() is false", () => {
    const stopped = StartStopTimes.stopped();
    const stoppedAgain = stopped.toStopped();

    assert.ok(!stopped.isStarted());
    assert.ok(!stoppedAgain.isStarted());
    assert.strictEqual(stoppedAgain, stopped);
  });

  test("toStopped() returns a new object when isStarted() is true", () => {
    const started = StartStopTimes.startedNow();
    const stopped = started.toStopped();

    assert.ok(started.isStarted());
    assert.ok(!stopped.isStarted());
    assert.notStrictEqual(stopped, started);
  });
});
