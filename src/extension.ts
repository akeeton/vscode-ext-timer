import * as vscode from 'vscode';
import { StartStopTimes } from './start_stop_times';
import { StatusBarTimer } from './stats_bar_timer';

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
