import { DateTime, Duration, Interval } from "luxon";

export interface StartStopTimesDto {
  lastStartTime?: string;
  intervals: string[];
}

// TODO Write more tests
export class StartStopTimes {
  private readonly intervals: Interval[];
  private lastStartTime?: DateTime;

  constructor(intervals: Interval[] = [], lastStartTime?: DateTime) {
    this.intervals = intervals;
    this.lastStartTime = lastStartTime;
  }

  isStarted = (): boolean => {
    return StartStopTimes.isTimeStarted(this.lastStartTime);
  };

  // isStarted = (): this is { lastStartTime: DateTime } => {
  //   return this.lastStartTime !== undefined;
  // };

  // TODO Return an error if already started?
  start = (): void => {
    if (this.isStarted()) {
      return;
    }

    this.lastStartTime = DateTime.utc();
  };

  // TODO Return an error if already stopped?
  stop = (): void => {
    if (!StartStopTimes.isTimeStarted(this.lastStartTime)) {
      return;
    }

    this.intervals.push(
      Interval.fromDateTimes(this.lastStartTime, DateTime.utc()),
    );
    this.lastStartTime = undefined;
  };

  getDurationAsIfStopped = (): Duration => {
    let intervalsAsIfStopped: Interval[];
    if (StartStopTimes.isTimeStarted(this.lastStartTime)) {
      intervalsAsIfStopped = this.intervals.concat(
        Interval.fromDateTimes(this.lastStartTime, DateTime.utc()),
      );
    } else {
      intervalsAsIfStopped = this.intervals;
    }

    return intervalsAsIfStopped
      .map((interval) => {
        return interval.toDuration();
      })
      .reduce((durationAcc, duration) => {
        return durationAcc.plus(duration);
      }, Duration.fromObject({}));
  };

  static fromDto = (dto: StartStopTimesDto): StartStopTimes => {
    const lastStartTime = dto.lastStartTime
      ? DateTime.fromISO(dto.lastStartTime)
      : undefined;

    return new StartStopTimes(
      dto.intervals.map((s) => Interval.fromISO(s)),
      lastStartTime,
    );
  };

  toDto = (): StartStopTimesDto => {
    return {
      lastStartTime: this.lastStartTime?.toISO() ?? undefined,
      intervals: this.intervals.map((i) => i.toISO()),
    };
  };

  private static isTimeStarted = (
    lastStartTime?: DateTime,
  ): lastStartTime is DateTime => {
    return lastStartTime !== undefined;
  };
}
