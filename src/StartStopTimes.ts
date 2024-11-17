import { DateTime, Interval } from "luxon";

export interface StartStopTimesDto {
  lastStartTime?: string;
  intervals: string[];
}

export class StartStopTimes {
  // TODO private? readonly?
  intervals: Interval[];
  lastStartTime?: DateTime;

  constructor(intervals: Interval[] = [], lastStartTime?: DateTime) {
    this.intervals = intervals;
    this.lastStartTime = lastStartTime;
  }

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
}
