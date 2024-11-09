import * as vscode from 'vscode';
import { Duration, Interval } from 'luxon';

export function activate({ extension, subscriptions }: vscode.ExtensionContext) {
	function makeCommmandId(commandName: string) {
		return `${extension.packageJSON.name}.${commandName}`;
	}

	console.log(`Extension activated: ${extension.id}`);

	subscriptions.push(
		vscode.commands.registerCommand(
			makeCommmandId('startTimer'), () => {
				vscode.window.showInformationMessage('Started timer');
			}));

	subscriptions.push(
		vscode.commands.registerCommand(
			makeCommmandId('stopTimer'), () => {
				vscode.window.showInformationMessage('Stopped timer');
			}));

	const clickStatusBarItemId = makeCommmandId('clickStatusBarItem');
	subscriptions.push(
		vscode.commands.registerCommand(clickStatusBarItemId, () => {
			vscode.window.showInformationMessage('Clicked on status bar timer');
		}));

	const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	statusBarItem.command = clickStatusBarItemId;
	subscriptions.push(statusBarItem);

	const updateStatusBarItem = () => {
		console.log('Updating status bar item');
		statusBarItem.text = '$(clock) timer';
	};

	updateStatusBarItem();
	statusBarItem.show();

	setTimeout(() => {
		
	}, 1000);
}

export function deactivate() {}
