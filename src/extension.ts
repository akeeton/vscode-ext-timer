import * as vscode from 'vscode';
import { commands, window } from 'vscode';

import { DateTime, Duration, Interval } from 'luxon';

const registerCommand = commands.registerCommand;
const showInformationMessage = window.showInformationMessage;

export function activate({
	extension,
	subscriptions,
	workspaceState,
}: vscode.ExtensionContext) {
	function makeCommandId(commandName: string) {
		return `${extension.packageJSON.name}.${commandName}`;
	}

	console.log(`Extension activated: ${extension.id}`);

	type StartStopTimes = {
		lastStartTime: DateTime | null,
		intervals: Interval[],
	}

	const startStopTimes: StartStopTimes = workspaceState.get('startStopTimes', {
		lastStartTime: null,
		intervals: [],
	});

	// TODO: Move to user settings
	const statusBarItemUpdateInMs = 1000;

	const clickStatusBarItemId = makeCommandId('clickStatusBarItem');
	subscriptions.push(registerCommand(clickStatusBarItemId, () => {
		showInformationMessage('Clicked on status bar timer');
	}));

	const statusBarItem = window.createStatusBarItem(vscode.StatusBarAlignment.Right);
	statusBarItem.command = clickStatusBarItemId;
	subscriptions.push(statusBarItem);

	const updateStatusBarItem = () => {
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

	updateStatusBarItem();
	statusBarItem.show();
	setInterval(updateStatusBarItem, statusBarItemUpdateInMs);

	subscriptions.push(registerCommand(makeCommandId('startTimer'), () => {
		if (!startStopTimes.lastStartTime) {
			startStopTimes.lastStartTime = DateTime.utc();
			showInformationMessage('Started timer');
		} else {
			showInformationMessage('Timer already started');
		}
	}));

	subscriptions.push(registerCommand(makeCommandId('stopTimer'), () => {
		if (!startStopTimes.lastStartTime) {
			showInformationMessage('Timer already stopped');
		} else {
			startStopTimes.intervals.push(
				Interval.fromDateTimes(startStopTimes.lastStartTime, DateTime.utc())
			);
			startStopTimes.lastStartTime = null;
			showInformationMessage('Stopped timer');
		}
	}));
}

export function deactivate() {
	// TODO: Save lastStartTime to intervals and set to null
}
