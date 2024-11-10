import * as vscode from 'vscode';
import { commands, window } from 'vscode';

import { DateTime, Duration, Interval } from 'luxon';
import { start } from 'repl';

const registerCommand = commands.registerCommand;
const showInformationMessage = window.showInformationMessage;

type StartStopTimesDto = {
	lastStartTime?: string;
	intervals: string[];
}

// TODO: Somehow finish open interval and save to storage on shutdown
// TODO: Move to its own file
class StartStopTimes {
	lastStartTime?: DateTime;
	intervals: Interval[] = [];

	private static storageKey = 'startStopTimes';

	reset = (): void => {
		this.lastStartTime = undefined;
		this.intervals = [];
	};

	saveToStorage = (memento: vscode.Memento): void => {
		memento.update(StartStopTimes.storageKey, this.toDto());
	};

	/**
	 * Loads stored data in-place from the given memento.
	 * @param memento
	 */
	loadFromStorage = (memento: vscode.Memento): void => {
		this.fromDto(memento.get(StartStopTimes.storageKey));
	};

	// TODO: Necessary? Currently using reset() then saveToStorage().
	// clearStorage = (memento: vscode.Memento): void => {
	// 	memento.update(StartStopTimes.storageKey, undefined);
	// };

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

interface Command {
	command: string,
	callback: () => void
}

export function activate({
	extension,
	subscriptions,
	workspaceState,
}: vscode.ExtensionContext) {
	// TODO: Move some of this into its own class
	console.log(`Extension activated: ${extension.id}`);

	function makeCommandId(commandName: string) {
		return `${extension.packageJSON.name}.${commandName}`;
	}

	const startStopTimes = new StartStopTimes();
	startStopTimes.loadFromStorage(workspaceState);

	const startTimer: Command = {
		command: makeCommandId('startTimer'),
		callback() {
			if (!startStopTimes.lastStartTime) {
				startStopTimes.lastStartTime = DateTime.utc();
				showInformationMessage('Started timer');
			} else {
				showInformationMessage('Timer already started');
			}

			startStopTimes.saveToStorage(workspaceState);
			updateStatusBarItem();
		}
	};
	subscriptions.push(registerCommand(startTimer.command, startTimer.callback));

	const stopTimer: Command = {
		command: makeCommandId('stopTimer'),
		callback() {
			if (!startStopTimes.lastStartTime) {
				showInformationMessage('Timer already stopped');
			} else {
				startStopTimes.intervals.push(
					Interval.fromDateTimes(startStopTimes.lastStartTime, DateTime.utc())
				);
				startStopTimes.lastStartTime = undefined;
				showInformationMessage('Stopped timer');
			}

			startStopTimes.saveToStorage(workspaceState);
			updateStatusBarItem();
		}
	};
	subscriptions.push(registerCommand(stopTimer.command, stopTimer.callback));

	const clickStatusBarItem: Command = {
		command: makeCommandId('clickStatusBarItem'),
		callback() {
			if (!startStopTimes.lastStartTime) {
				startTimer.callback();
			} else {
				stopTimer.callback();
			}
		}
	};
	subscriptions.push(registerCommand(clickStatusBarItem.command, clickStatusBarItem.callback));

	// TODO: Move statusBarItemUpdateInMs to user settings
	const statusBarItemUpdateInMs = 1000;
	const statusBarItem = window.createStatusBarItem(vscode.StatusBarAlignment.Right);
	statusBarItem.command = clickStatusBarItem.command;
	subscriptions.push(statusBarItem);

	function updateStatusBarItem() {
		let intervalsStoppedNow: Interval[];
		if (!startStopTimes.lastStartTime) {
			intervalsStoppedNow = startStopTimes.intervals;
		} else {
			intervalsStoppedNow = startStopTimes.intervals.concat(
				Interval.fromDateTimes(startStopTimes.lastStartTime, DateTime.utc())
			);
		}

		const duration = intervalsStoppedNow.map((interval) => {
			return interval.toDuration();
		}).reduce((durationAcc, duration) => {
			return durationAcc.plus(duration);
		}, Duration.fromObject({}));

		// TODO: Make format a user setting?
		statusBarItem.text = `$(clock) ${duration.toFormat('hh:mm:ss')}`;
	};

	const resetTimer: Command = {
		command: makeCommandId('resetTimer'),
		callback() {
			startStopTimes.reset();
			startStopTimes.saveToStorage(workspaceState);
			updateStatusBarItem();
		}
	};
	subscriptions.push(registerCommand(resetTimer.command, resetTimer.callback));

	const debugShowWorkSpaceStorage: Command = {
		command: makeCommandId('debug.showWorkspaceStorage'),
		callback() {
			let data = '';
			for (const key of workspaceState.keys()) {
				data += `${key}: ${JSON.stringify(workspaceState.get(key), null, 2)}\n`;
			}

			if (data.length === 0) {
				console.log('Workspace storage empty');
			} else {
				console.log(`Workspace storage:\n${data}`);
			}
		}
	};
	subscriptions.push(registerCommand(debugShowWorkSpaceStorage.command, debugShowWorkSpaceStorage.callback));

	updateStatusBarItem();
	statusBarItem.show();
	setInterval(updateStatusBarItem, statusBarItemUpdateInMs);
}

export function deactivate() {
	// deactivate() seems to only be meant for cleaning up OS resources, not a
	// general-purpose shutdown callback.  See
	// https://github.com/Microsoft/vscode/issues/47881.
}
