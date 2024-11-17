import { DateTime, Interval } from "luxon";
import { Memento } from "vscode";

interface StartStopTimesDto {
  lastStartTime?: string;
  intervals: string[];
}

export default class StartStopTimes {
  // TODO private? readonly?
  intervals: Interval[];
  lastStartTime?: DateTime;

  constructor(intervals: Interval[] = [], lastStartTime?: DateTime) {
    this.intervals = intervals;
    this.lastStartTime = lastStartTime;
  }

  // TODO Move to StatusBarTimer
  private static storageKey = "startStopTimes";

  static fromDto = (dto?: StartStopTimesDto): StartStopTimes => {
    if (!dto) {
      return new StartStopTimes();
    }

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

  // TODO Handle in StatusBarTimer
  saveToStorage = (memento: Memento): void => {
    memento.update(StartStopTimes.storageKey, this.toDto());
  };

  // TODO Handle in StatusBarTimer
  static loadFromStorage = (memento: Memento): StartStopTimes => {
    return StartStopTimes.fromDto(
      memento.get<StartStopTimesDto>(StartStopTimes.storageKey),
    );
  };
}
