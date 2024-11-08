import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	console.log(`Extension activated: ${context.extensionUri}`);

	const clickTimerCommandId = 'statusbartimer.clickTimer';
	const clickTimerCommand = vscode.commands.registerCommand(clickTimerCommandId, () => {
		vscode.window.showInformationMessage('Clicked on status bar timer');
	});
	context.subscriptions.push(clickTimerCommand);

	const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	statusBarItem.command = clickTimerCommandId;
	context.subscriptions.push(statusBarItem);

	const updateStatusBarItem = () => {
		console.log('Updating status bar item');
		statusBarItem.text = '$(clock) timer';
	};
	
	updateStatusBarItem();
	statusBarItem.show();
}

// This method is called when your extension is deactivated
export function deactivate() {}
