import { DateTime, Duration, Interval } from 'luxon';
import * as vscode from 'vscode';
import { StartStopTimes } from './start_stop_times';

// TODO: Replace checking this.startStopTimes.lastStartTime with an isRunning() function
export class StatusBarTimer {
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

	private getDisplayName = () => {
		return this.context.extension.packageJSON.displayName;
	};

	private updateStatusBarItem = () => {
		// TODO: Move all time-based code to StartStopTimes class and remove luxon import from this file
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

	private readonly commands = {
		startTimer: () => {
			if (!this.startStopTimes.lastStartTime) {
				this.startStopTimes.lastStartTime = DateTime.utc();
			} else {
				vscode.window.showInformationMessage('Timer already started');
			}

			this.startStopTimes.saveToStorage(this.context.workspaceState);
			this.updateStatusBarItem();

		},

		stopTimer: () => {
			if (!this.startStopTimes.lastStartTime) {
				vscode.window.showInformationMessage('Timer already stopped');
			} else {
				this.startStopTimes.intervals.push(
					Interval.fromDateTimes(this.startStopTimes.lastStartTime, DateTime.utc())
				);
				this.startStopTimes.lastStartTime = undefined;
			}

			this.startStopTimes.saveToStorage(this.context.workspaceState);
			this.updateStatusBarItem();


		},

		resetTimer: () => {
			this.startStopTimes.reset();
			this.startStopTimes.saveToStorage(this.context.workspaceState);
			this.updateStatusBarItem();


		},

		clickStatusBarItem: () => {
			if (!this.startStopTimes.lastStartTime) {
				this.commands.startTimer();
			} else {
				this.commands.stopTimer();
			}
		},

		debugShowWorkspaceStorage: () => {
			const data: { [key: string]: any } = {};
			for (const key of this.context.workspaceState.keys()) {
				data[key] = this.context.workspaceState.get(key);
			}

			if (data.length === 0) {
				console.log('Workspace storage empty');
			} else {
				console.log(`Workspace storage:\n${JSON.stringify(data, null, 2)}`);
			}
		},

		debugClearAllWorkspaceStorage: () => {
			const no = 'No';
			const yes = 'Yes';
			vscode.window.showQuickPick(
				[no, yes],
				{ title: `Clear all workspace storage for ${this.getDisplayName()}?` }
			).then((value) => {
				if (value !== yes) {
					return;
				}

				for (const key of this.context.workspaceState.keys()) {
					this.context.workspaceState.update(key, undefined);
				}

				this.startStopTimes.loadFromStorage(this.context.workspaceState);

				vscode.window.showInformationMessage('Cleared workspace storage');
			});

		},
	} as const;

	private makeCommandId = (commandName: keyof typeof this.commands) => {
		return `${this.context.extension.packageJSON.name}.${commandName}`;
	};

	private registerCommand = (commandName: keyof typeof this.commands) => {
		this.context.subscriptions.push(vscode.commands.registerCommand(
			this.makeCommandId(commandName),
			this.commands[commandName]
		));
	};

	private registerCommands = () => {
		this.registerCommand('startTimer');
		this.registerCommand('stopTimer');
		this.registerCommand('resetTimer');
		this.registerCommand('clickStatusBarItem');
		this.registerCommand('debugShowWorkspaceStorage');
		this.registerCommand('debugClearAllWorkspaceStorage');

		this.statusBarItem.command = this.makeCommandId('clickStatusBarItem');
	};
}