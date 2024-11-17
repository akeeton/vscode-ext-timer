import { DateTime, Duration, Interval } from "luxon";

interface LastStartTimeDto {
  time?: string;
}

export class LastStartTime {
  time?: DateTime;

  constructor(time?: DateTime) {
    this.time = time;
  }

  isStarted = (): this is { time: LastStartTime } => {
    return this.time !== undefined;
  };

  static fromDto = (dto: LastStartTimeDto): LastStartTime => {
    if (!dto.time) {
      return new LastStartTime();
    }

    return new LastStartTime(DateTime.fromISO(dto.time));
  };

  toDto = (): LastStartTimeDto => {
    return {
      time: this.time?.toISO() ?? undefined,
    };
  };
}

export interface StartStopTimesDto {
  lastStartTime: LastStartTimeDto;
  intervals: string[];
}

// TODO Write more tests
export class StartStopTimes {
  private lastStartTime: LastStartTime;
  private readonly intervals: Interval[];

  constructor(
    lastStartTime: LastStartTime = new LastStartTime(),
    intervals: Interval[] = [],
  ) {
    this.lastStartTime = lastStartTime;
    this.intervals = intervals;
  }

  isStarted = (): boolean => {
    return this.lastStartTime.isStarted();
  };

  // TODO Return an error if already started?
  start = (): void => {
    if (this.isStarted()) {
      return;
    }

    this.lastStartTime = new LastStartTime(DateTime.utc());
  };

  // TODO Return an error if already stopped?
  stop = (): void => {
    if (!this.lastStartTime.isStarted()) {
      return;
    }

    this.intervals.push(
      Interval.fromDateTimes(this.lastStartTime.time, DateTime.utc()),
    );
    this.lastStartTime = new LastStartTime();
  };

  getDurationAsIfStopped = (): Duration => {
    let intervalsAsIfStopped: Interval[];
    if (this.lastStartTime.isStarted()) {
      intervalsAsIfStopped = this.intervals.concat(
        Interval.fromDateTimes(this.lastStartTime.time, DateTime.utc()),
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
    return new StartStopTimes(
      LastStartTime.fromDto(dto.lastStartTime),
      dto.intervals.map((s) => Interval.fromISO(s)),
    );
  };

  toDto = (): StartStopTimesDto => {
    return {
      lastStartTime: this.lastStartTime.toDto(),
      intervals: this.intervals.map((i) => i.toISO()),
    };
  };

  private static isTimeStarted = (
    lastStartTime?: DateTime,
  ): lastStartTime is DateTime => {
    return lastStartTime !== undefined;
  };
}
