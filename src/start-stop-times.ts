import { DateTime, Duration, Interval } from "luxon";

export interface Dto {
  readonly lastStartTime?: string;
  readonly intervals: readonly string[];
}

export interface Model {
  readonly lastStartTime?: DateTime;
  readonly intervals: readonly Interval[];
}

export function makeStartedNow(intervals: readonly Interval[] = []): Model {
  return {
    lastStartTime: DateTime.utc(),
    intervals: intervals,
  };
}

export function makeStopped(intervals: readonly Interval[] = []): Model {
  return { intervals: intervals };
}

export function isStarted(startStopTimes: Model): startStopTimes is {
  readonly lastStartTime: DateTime;
  readonly intervals: readonly Interval[];
} {
  return startStopTimes.lastStartTime !== undefined;
}

export function toStarted(startStopTimes: Model): Model {
  if (isStarted(startStopTimes)) {
    return startStopTimes;
  }

  return makeStartedNow(startStopTimes.intervals);
}

export function toStopped(startStopTimes: Model): Model {
  if (!isStarted(startStopTimes)) {
    return startStopTimes;
  }

  return makeStopped(
    startStopTimes.intervals.concat(
      Interval.fromDateTimes(startStopTimes.lastStartTime, DateTime.utc()),
    ),
  );
}

export function getDuration(startStopTimes: Model): Duration {
  return startStopTimes.intervals
    .map((interval) => {
      return interval.toDuration();
    })
    .reduce((durationAcc, duration) => {
      return durationAcc.plus(duration);
    }, Duration.fromObject({}));
}

export function fromDto(dto: Dto): Model {
  const lastStartTime = dto.lastStartTime
    ? DateTime.fromISO(dto.lastStartTime).setZone("UTC")
    : undefined;

  return {
    lastStartTime: lastStartTime,
    intervals: dto.intervals.map((s) => Interval.fromISO(s)),
  };
}

export function toDto(startStopTimes: Model): Dto {
  return {
    lastStartTime:
      startStopTimes.lastStartTime?.setZone("UTC").toISO() ?? undefined,
    intervals: startStopTimes.intervals.map((i) => i.toISO()),
  };
}
