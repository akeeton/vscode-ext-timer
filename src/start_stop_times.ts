import { DateTime, Duration, Interval } from 'luxon';
import { Memento } from 'vscode';

type StartStopTimesDto = {
	lastStartTime?: string;
	intervals: string[];
}

// TODO: Somehow finish open interval and save to storage on shutdown
export class StartStopTimes {
	lastStartTime?: DateTime;
	intervals: Interval[] = [];

	private static storageKey = 'startStopTimes';

	reset = (): void => {
		this.lastStartTime = undefined;
		this.intervals = [];
	};

	saveToStorage = (memento: Memento): void => {
		memento.update(StartStopTimes.storageKey, this.toDto());
	};

	/**
	 * Loads stored data in-place from the given memento.
	 * @param memento
	 */
	loadFromStorage = (memento: Memento): void => {
		this.fromDto(memento.get(StartStopTimes.storageKey));
	};

	private toDto = (): StartStopTimesDto => {
		return {
			lastStartTime: this.lastStartTime?.toISO() ?? undefined,
			intervals: this.intervals.map((i) => i.toISO()),
		};
	};

	private fromDto = (dto?: StartStopTimesDto): void => {
		if (!dto) {
			this.reset();
			return;
		}

		this.lastStartTime = dto.lastStartTime
			? DateTime.fromISO(dto.lastStartTime)
			: undefined;

		this.intervals = dto.intervals.map((s) => Interval.fromISO(s));
	};
}