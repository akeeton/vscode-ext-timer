import * as vscode from 'vscode';
import { commands, window } from 'vscode';

import { DateTime, Duration, Interval } from 'luxon';

const registerCommand = commands.registerCommand;
const showInformationMessage = window.showInformationMessage;

export function activate({ extension, subscriptions }: vscode.ExtensionContext) {
	function makeCommandId(commandName: string) {
		return `${extension.packageJSON.name}.${commandName}`;
	}

	console.log(`Extension activated: ${extension.id}`);

	let lastStartTime: DateTime | null = null;
	const intervals: Interval[] = [];
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
		if (!lastStartTime) {
			intervalsStoppedNow = intervals;
		} else {
			intervalsStoppedNow = intervals.concat(
				Interval.fromDateTimes(lastStartTime, DateTime.utc())
			);
		}

		const duration = intervalsStoppedNow.map((interval) => {
			return interval.toDuration();
		}).reduce((durationAcc, duration) => {
			return durationAcc.plus(duration);
		}, Duration.fromObject({}));

		statusBarItem.text = `$(clock) ${duration.toFormat('hh:mm:ss')}`;
	};

	updateStatusBarItem();
	statusBarItem.show();
	setInterval(updateStatusBarItem, statusBarItemUpdateInMs);

	subscriptions.push(registerCommand(makeCommandId('startTimer'), () => {
		if (!lastStartTime) {
			lastStartTime = DateTime.utc();
			showInformationMessage('Started timer');
		} else {
			showInformationMessage('Timer already started');
		}
	}));

	subscriptions.push(registerCommand(makeCommandId('stopTimer'), () => {
		if (!lastStartTime) {
			showInformationMessage('Timer already stopped');
		} else {
			intervals.push(
				Interval.fromDateTimes(lastStartTime, DateTime.utc())
			);
			lastStartTime = null;
			showInformationMessage('Stopped timer');
		}
	}));
}

export function deactivate() {}
