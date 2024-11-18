import { DateTime, Duration, Interval } from "luxon";

interface LastStartTimeDto {
  time?: string;
}

// FIXME Make sure time parameter is UTC since toDto and fromDto assume UTC
// TODO Is LastStartTime even necessary?
// TODO Move methods into namespace so it's only plain data?
export class LastStartTime {
  readonly time?: DateTime;

  constructor(time?: DateTime) {
    this.time = time;
  }

  // TODO Is this necessary anymore since adding the type guard return to StartStopTimes.isStarted()?
  isStarted = (): this is { time: LastStartTime } => {
    return this.time !== undefined;
  };

  static fromDto = (dto: LastStartTimeDto): LastStartTime => {
    if (!dto.time) {
      return new LastStartTime();
    }

    return new LastStartTime(DateTime.fromISO(dto.time).setZone("UTC"));
  };

  toDto = (): LastStartTimeDto => {
    return {
      time: this.time?.setZone("UTC").toISO() ?? undefined,
    };
  };
}

export interface StartStopTimesDto {
  lastStartTime: LastStartTimeDto;
  intervals: string[];
}

// TODO Move methods into namespace so it's only plain data?
export class StartStopTimes {
  readonly lastStartTime: LastStartTime;
  readonly intervals: readonly Interval[];

  // TODO Remove default parameters when new StartStopTimes() instances are replaced with startedNow() and stopped()
  constructor(
    lastStartTime: LastStartTime = new LastStartTime(),
    intervals: readonly Interval[] = [],
  ) {
    this.lastStartTime = lastStartTime;
    this.intervals = intervals;
  }

  // TODO Use startedNow() instead of constructor where appropriate
  static startedNow = (): StartStopTimes => {
    return new StartStopTimes(new LastStartTime(DateTime.utc()));
  };

  // TODO Use stopped() instead of constructor where appropriate
  static stopped = (): StartStopTimes => {
    return new StartStopTimes();
  };

  isStarted = (): this is { lastStartTime: { time: DateTime } } => {
    return this.lastStartTime.isStarted();
  };

  toStarted = (): StartStopTimes => {
    if (this.lastStartTime.isStarted()) {
      return this;
    }

    return new StartStopTimes(
      new LastStartTime(DateTime.utc()),
      this.intervals,
    );
  };

  toStopped = (): StartStopTimes => {
    if (!this.lastStartTime.isStarted()) {
      return this;
    }

    return new StartStopTimes(
      new LastStartTime(),
      this.intervals.concat(
        Interval.fromDateTimes(this.lastStartTime.time, DateTime.utc()),
      ),
    );
  };

  getDuration = (): Duration => {
    const emptyDuration = Duration.fromObject({});

    return this.intervals
      .map((interval) => {
        return interval.toDuration();
      })
      .reduce((durationAcc, duration) => {
        return durationAcc.plus(duration);
      }, emptyDuration);
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
}
