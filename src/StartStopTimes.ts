import { DateTime, Duration, Interval } from "luxon";

export interface StartStopTimesDto {
  lastStartTime?: string;
  intervals: string[];
}

// TODO Move methods into namespace so it's only plain data?
export class StartStopTimes {
  readonly lastStartTime?: DateTime;
  readonly intervals: readonly Interval[];

  // TODO Wrap constructor params in an object? Then get rid of the class entirely and just have functions that operate on the object itself?
  constructor(lastStartTime?: DateTime, intervals: readonly Interval[] = []) {
    this.lastStartTime = lastStartTime?.setZone("UTC");
    this.intervals = intervals;
  }

  static startedNow = (intervals: readonly Interval[] = []): StartStopTimes => {
    return new StartStopTimes(DateTime.utc(), intervals);
  };

  static stopped = (intervals: readonly Interval[] = []): StartStopTimes => {
    return new StartStopTimes(undefined, intervals);
  };

  isStarted = (): this is { lastStartTime: { time: DateTime } } => {
    return this.lastStartTime !== undefined;
  };

  toStarted = (): StartStopTimes => {
    if (this.isStarted()) {
      return this;
    }

    return StartStopTimes.startedNow(this.intervals);
  };

  toStopped = (): StartStopTimes => {
    if (!this.isStarted()) {
      return this;
    }

    return StartStopTimes.stopped(
      this.intervals.concat(
        Interval.fromDateTimes(this.lastStartTime, DateTime.utc()),
      ),
    );
  };

  getDuration = (): Duration => {
    return this.intervals
      .map((interval) => {
        return interval.toDuration();
      })
      .reduce((durationAcc, duration) => {
        return durationAcc.plus(duration);
      }, Duration.fromObject({}));
  };

  static fromDto = (dto: StartStopTimesDto): StartStopTimes => {
    const lastStartTime = dto.lastStartTime
      ? DateTime.fromISO(dto.lastStartTime).setZone("UTC")
      : undefined;

    return new StartStopTimes(
      lastStartTime,
      dto.intervals.map((s) => Interval.fromISO(s)),
    );
  };

  toDto = (): StartStopTimesDto => {
    return {
      lastStartTime: this.lastStartTime?.setZone("UTC").toISO() ?? undefined,
      intervals: this.intervals.map((i) => i.toISO()),
    };
  };
}
