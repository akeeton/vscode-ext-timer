import * as assert from "assert";
import { DateTime, Duration, Interval } from "luxon";
import * as R from "remeda";
import * as StartStopTimes from "../StartStopTimes";
import { assertDeepStrictValuesEqual, assertFalse, assertTrue } from "./assert";

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

    assertTrue(StartStopTimes.isStarted(startedNow));

    const epsilonMillis = 100;
    const diffMillis = Interval.fromDateTimes(
      startedNow.lastStartTime,
      DateTime.utc(),
    )
      .toDuration()
      .toMillis();

    assertTrue(Math.abs(diffMillis) < epsilonMillis);
  });

  test("StartStopTimes DTO round trip is the same as the original", () => {
    const startStopTimes = StartStopTimes.startedNow(testIntervals);
    const roundTrip = R.pipe(
      startStopTimes,
      StartStopTimes.toDto,
      StartStopTimes.fromDto,
    );

    assertDeepStrictValuesEqual(roundTrip, startStopTimes);
  });

  test("startedNow() returns an object where isStarted() is true", () => {
    assertTrue(R.pipe(StartStopTimes.startedNow(), StartStopTimes.isStarted));
  });

  test("stopped() returns an object where isStarted() is false", () => {
    assertFalse(R.pipe(StartStopTimes.stopped(), StartStopTimes.isStarted));
  });

  test("toStarted() returns the same object when isStarted() is true", () => {
    const started = StartStopTimes.startedNow();
    const startedAgain = StartStopTimes.toStarted(started);

    assertTrue(StartStopTimes.isStarted(started));
    assertTrue(StartStopTimes.isStarted(startedAgain));
    assert.strictEqual(startedAgain, started);
  });

  test("toStarted() returns a new object when isStarted() is false", () => {
    const stopped = StartStopTimes.stopped();
    const started = StartStopTimes.toStarted(stopped);

    assertFalse(StartStopTimes.isStarted(stopped));
    assertTrue(StartStopTimes.isStarted(started));
    assert.notStrictEqual(started, stopped);
  });

  test("toStopped() returns the same object when isStarted() is false", () => {
    const stopped = StartStopTimes.stopped();
    const stoppedAgain = StartStopTimes.toStopped(stopped);

    assertFalse(StartStopTimes.isStarted(stopped));
    assertFalse(StartStopTimes.isStarted(stoppedAgain));
    assert.strictEqual(stoppedAgain, stopped);
  });

  test("toStopped() returns a new object when isStarted() is true", () => {
    const started = StartStopTimes.startedNow();
    const stopped = StartStopTimes.toStopped(started);

    assertTrue(StartStopTimes.isStarted(started));
    assertFalse(StartStopTimes.isStarted(stopped));
    assert.notStrictEqual(stopped, started);
  });
});
