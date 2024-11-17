import * as vscode from "vscode";
import StatusBarTimer from "./StatusBarTimer";

export function activate(context: vscode.ExtensionContext) {
  const statusBarTimer = new StatusBarTimer(
    context,
    "StatusBarTimerWorkspaceState",
  );

  statusBarTimer.activate();
}

export function deactivate() {
  // deactivate() seems to only be meant for cleaning up OS resources, not a
  // general-purpose shutdown callback.  See
  // https://github.com/Microsoft/vscode/issues/47881.
}
