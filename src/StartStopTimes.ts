import { DateTime, Duration, Interval } from "luxon";

export interface StartStopTimesDto {
  lastStartTime?: string;
  intervals: string[];
}

export class StartStopTimes {
  readonly lastStartTime?: DateTime;
  readonly intervals: readonly Interval[];

  // TODO Get rid of the class entirely and just have functions that operate on the data itself?
  constructor({
    lastStartTime,
    intervals = [],
  }: {
    lastStartTime?: DateTime;
    intervals: readonly Interval[];
  }) {
    this.lastStartTime = lastStartTime?.setZone("UTC");
    this.intervals = intervals;
  }

  static startedNow = (intervals: readonly Interval[] = []): StartStopTimes => {
    return new StartStopTimes({
      lastStartTime: DateTime.utc(),
      intervals: intervals,
    });
  };

  static stopped = (intervals: readonly Interval[] = []): StartStopTimes => {
    return new StartStopTimes({ intervals: intervals });
  };

  isStarted = (): this is { lastStartTime: DateTime } => {
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

    return new StartStopTimes({
      lastStartTime: lastStartTime,
      intervals: dto.intervals.map((s) => Interval.fromISO(s)),
    });
  };

  toDto = (): StartStopTimesDto => {
    return {
      lastStartTime: this.lastStartTime?.setZone("UTC").toISO() ?? undefined,
      intervals: this.intervals.map((i) => i.toISO()),
    };
  };
}
