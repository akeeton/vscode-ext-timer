import * as vscode from 'vscode';

import { DateTime, Duration, Interval } from 'luxon';

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

// TODO: Use <method>.name and runtime check of package.json instead?
type CommandName =
	| 'startTimer'
	| 'stopTimer'
	| 'resetTimer'
	| 'clickStatusBarItem'
	| 'debug.showWorkspaceStorage'
	| 'debug.clearAllWorkspaceStorage'

// TODO: Replace checking this.startStopTimes.lastStartTime with an isRunning() function
class StatusBarTimer {
	constructor(
		private context: vscode.ExtensionContext,
		private startStopTimes: StartStopTimes,
		private statusBarItem: vscode.StatusBarItem
	) {
	}

	activate = () => {
		this.startStopTimes.loadFromStorage(this.context.workspaceState);

		this.registerCommands();

		this.context.subscriptions.push(this.statusBarItem);

		// TODO: Move statusBarItemUpdateInMs to user settings
		const statusBarItemUpdateInMs = 1000;
		// TODO: Update only when timer is running
		setInterval(this.updateStatusBarItem, statusBarItemUpdateInMs);
		this.updateStatusBarItem();

		this.statusBarItem.show();

		console.log(`Extension ${this.context.extension.id} activated`);
	};

	private makeCommandId = (commandName: CommandName) => {
		return `${this.context.extension.packageJSON.name}.${commandName}`;
	};

	private registerCommands() {
		this.context.subscriptions.push(vscode.commands.registerCommand(
			this.makeCommandId('startTimer'), this.startTimer
		));

		this.context.subscriptions.push(vscode.commands.registerCommand(
			this.makeCommandId('stopTimer'), this.stopTimer
		));

		this.context.subscriptions.push(vscode.commands.registerCommand(
			this.makeCommandId('resetTimer'), this.resetTimer
		));

		this.context.subscriptions.push(vscode.commands.registerCommand(
			this.makeCommandId('clickStatusBarItem'), this.clickStatusBarItem
		));
		this.statusBarItem.command = this.makeCommandId('clickStatusBarItem');

		// TODO: Only register debug commands when debugging (how?)
		this.context.subscriptions.push(vscode.commands.registerCommand(
			this.makeCommandId('debug.showWorkspaceStorage'),
			this.debugShowWorkSpaceStorage
		));

		this.context.subscriptions.push(vscode.commands.registerCommand(
			this.makeCommandId('debug.clearAllWorkspaceStorage'),
			this.debugClearAllWorkspaceStorage
		));
	}

	private updateStatusBarItem = () => {
		let intervalsStoppedNow: Interval[];
		if (!this.startStopTimes.lastStartTime) {
			intervalsStoppedNow = this.startStopTimes.intervals;
		} else {
			intervalsStoppedNow = this.startStopTimes.intervals.concat(
				Interval.fromDateTimes(this.startStopTimes.lastStartTime, DateTime.utc())
			);
		}

		const duration = intervalsStoppedNow.map((interval) => {
			return interval.toDuration();
		}).reduce((durationAcc, duration) => {
			return durationAcc.plus(duration);
		}, Duration.fromObject({}));

		const icon = this.startStopTimes.lastStartTime ? 'stop-circle' : 'clock';
		// TODO: Make format a user setting?
		this.statusBarItem.text = `$(${icon}) ${duration.toFormat('hh:mm:ss')}`;
	};

	private startTimer = () => {
		if (!this.startStopTimes.lastStartTime) {
			this.startStopTimes.lastStartTime = DateTime.utc();
			vscode.window.showInformationMessage('Started timer');
		} else {
			vscode.window.showInformationMessage('Timer already started');
		}

		this.startStopTimes.saveToStorage(this.context.workspaceState);
		this.updateStatusBarItem();
	};

	private stopTimer = () => {
		if (!this.startStopTimes.lastStartTime) {
			vscode.window.showInformationMessage('Timer already stopped');
		} else {
			this.startStopTimes.intervals.push(
				Interval.fromDateTimes(this.startStopTimes.lastStartTime, DateTime.utc())
			);
			this.startStopTimes.lastStartTime = undefined;
			vscode.window.showInformationMessage('Stopped timer');
		}

		this.startStopTimes.saveToStorage(this.context.workspaceState);
		this.updateStatusBarItem();
	};

	private resetTimer = () => {
		this.startStopTimes.reset();
		this.startStopTimes.saveToStorage(this.context.workspaceState);
		this.updateStatusBarItem();
	};

	private clickStatusBarItem = () => {
		if (!this.startStopTimes.lastStartTime) {
			this.startTimer();
		} else {
			this.stopTimer();
		}
	};

	private debugShowWorkSpaceStorage = () => {
		const data: { [key: string]: any } = {};
		for (const key of this.context.workspaceState.keys()) {
			data[key] = this.context.workspaceState.get(key);
		}

		if (data.length === 0) {
			console.log('Workspace storage empty');
		} else {
			console.log(`Workspace storage:\n${JSON.stringify(data, null, 2)}`);
		}
	};

	private debugClearAllWorkspaceStorage = () => {
		// TODO: Add confirmation (showQuickPick(yes/no))?
		for (const key of this.context.workspaceState.keys()) {
			this.context.workspaceState.update(key, undefined);
		}
	};
}

export function activate(context: vscode.ExtensionContext) {
	const statusBarTimer = new StatusBarTimer(
		context,
		new StartStopTimes(),
		vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right)
	);

	statusBarTimer.activate();
}

export function deactivate() {
	// deactivate() seems to only be meant for cleaning up OS resources, not a
	// general-purpose shutdown callback.  See
	// https://github.com/Microsoft/vscode/issues/47881.
}
