import assert from 'assert';
import { DateTime, Duration, Interval } from 'luxon';
import * as vscode from 'vscode';
import StartStopTimes from './StartStopTimes';

// TODO Replace checking this.startStopTimes.lastStartTime with an isRunning() function
// TODO Somehow finish open interval and save to storage on shutdown (using focus change callback?)
export default class StatusBarTimer {
	constructor(
		private context: vscode.ExtensionContext,
		// TODO Construct these instead of injecting them?
		private startStopTimes: StartStopTimes,
		private statusBarItem: vscode.StatusBarItem
	) {
	}

	activate = () => {
		assert(
			this.context.extension.packageJSON.contributes.configuration.title
			=== this.getPackageDisplayName(),
			'Display name and contributed configuration title should match'
		);

		this.startStopTimes.loadFromStorage(this.context.workspaceState);

		this.registerCommands();
		this.registerEventHandlers();

		this.context.subscriptions.push(this.statusBarItem);

		// TODO Move statusBarItemUpdateInMs to user settings?
		const statusBarItemUpdateInMs = 1000;
		// TODO Only update when timer is running
		setInterval(this.updateStatusBarItem, statusBarItemUpdateInMs);
		this.updateStatusBarItem();

		this.statusBarItem.show();

		console.log(`Extension ${this.context.extension.id} activated`);
	};

	private getPackageDisplayName = (): string => {
		return this.context.extension.packageJSON.displayName;
	};

	private getPackageName = (): string => {
		return this.context.extension.packageJSON.name;
	};

	private getConfigSection = this.getPackageName;

	private getConfig = (): vscode.WorkspaceConfiguration => {
		return vscode.workspace.getConfiguration(this.getConfigSection());
	};

	private updateStatusBarItem = () => {
		// TODO Move all time-based code to StartStopTimes class and remove luxon import from this file
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

		// TODO Cache durationFormat config setting?
		const format = this.getConfig().durationFormat as string;
		// See https://code.visualstudio.com/api/references/icons-in-labels#icon-listing
		const icon = this.startStopTimes.lastStartTime ? 'clock' : 'stop-circle';
		this.statusBarItem.text = `$(${icon}) ${duration.toFormat(format)}`;
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
			// TODO Add confirmation quickpick
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
				{ title: `Clear all workspace storage for ${this.getPackageDisplayName()}?` }
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
		let commandName: keyof typeof this.commands;
		for (commandName in this.commands) {
			this.registerCommand(commandName);
		}

		this.statusBarItem.command = this.makeCommandId('clickStatusBarItem');
	};

	private registerEventHandlers = () => {
		vscode.workspace.onDidChangeConfiguration((event) => {
			if (!event.affectsConfiguration(this.getConfigSection())) {
				return;
			}

			this.updateStatusBarItem();
		});
	};
}