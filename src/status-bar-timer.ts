import assert from "assert";
import * as R from "remeda";
import { keys } from "ts-transformer-keys";
import { PackageJson } from "type-fest";
import * as vscode from "vscode";
import * as StartStopTimes from "./start-stop-times";

type VsCodePackageJson = PackageJson & {
  name: string;
  displayName: string;
  contributes: {
    configuration: {
      title: string;
    };
  };
};

interface WorkspaceStateDto {
  readonly startStopTimes: StartStopTimes.Dto;
}

// TODO Make more functional and move "IO" to the edges
// TODO Somehow finish open interval and save to storage on shutdown (using focus change callback?)
export class StatusBarTimer {
  private readonly context: vscode.ExtensionContext;
  private readonly storageKey: string;

  private readonly statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
  );

  private startStopTimes = StartStopTimes.makeStopped();

  // See https://code.visualstudio.com/api/references/icons-in-labels#icon-listing
  private static icons = {
    started: "clock",
    stopped: "stop-circle",
  };

  constructor(context: vscode.ExtensionContext, storageKey: string) {
    this.context = context;
    this.storageKey = storageKey;
  }

  activate = () => {
    assert(
      this.getPackageJson().contributes.configuration.title ===
        this.getPackageJson().displayName,
      "Display name and contributed configuration title should match",
    );

    // FIXME If the shape of the loaded state is different than how it was stored, the commands won't be registered, meaning the debug command to clear the workspace storage won't work.
    this.loadState();
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

  private getPackageJson = (): VsCodePackageJson => {
    return this.context.extension.packageJSON as VsCodePackageJson;
  };

  private getConfigSection = () => {
    return this.getPackageJson().name;
  };

  private getConfig = (): vscode.WorkspaceConfiguration => {
    return vscode.workspace.getConfiguration(this.getConfigSection());
  };

  private loadState = (): void => {
    const workspaceStateDto =
      this.context.workspaceState.get<WorkspaceStateDto>(this.storageKey);

    if (!workspaceStateDto) {
      this.startStopTimes = StartStopTimes.makeStopped();
      return;
    }

    for (const key of keys<WorkspaceStateDto>()) {
      if (!Object.prototype.hasOwnProperty.call(workspaceStateDto, key)) {
        vscode.window.showWarningMessage(
          `Failed loading workspace state: missing key '${key}'`,
        );
        this.startStopTimes = StartStopTimes.makeStopped();
        return;
      }
    }

    this.startStopTimes = StartStopTimes.fromDto(
      workspaceStateDto.startStopTimes,
    );
  };

  private saveState = (): void => {
    this.context.workspaceState.update(
      this.storageKey,
      StartStopTimes.toDto(this.startStopTimes),
    );
  };

  private updateStatusBarItem = () => {
    const durationAsIfStopped = R.pipe(
      this.startStopTimes,
      StartStopTimes.toStopped,
      StartStopTimes.getDuration,
    );

    // TODO Cache durationFormat config setting?
    const format = this.getConfig().durationFormat as string;

    const icon = StartStopTimes.isStarted(this.startStopTimes)
      ? StatusBarTimer.icons.started
      : StatusBarTimer.icons.stopped;

    this.statusBarItem.text = `$(${icon}) ${durationAsIfStopped.toFormat(format)}`;
  };

  private readonly commands = {
    startTimer: () => {
      if (StartStopTimes.isStarted(this.startStopTimes)) {
        return;
      }

      this.startStopTimes = StartStopTimes.toStarted(this.startStopTimes);
      this.saveState();
      this.updateStatusBarItem();
    },

    stopTimer: () => {
      if (!StartStopTimes.isStarted(this.startStopTimes)) {
        return;
      }

      this.startStopTimes = StartStopTimes.toStopped(this.startStopTimes);
      this.saveState();
      this.updateStatusBarItem();
    },

    resetTimer: () => {
      // TODO Add confirmation quickpick
      this.startStopTimes = StartStopTimes.makeStopped();
      this.saveState();
      this.updateStatusBarItem();
    },

    clickStatusBarItem: () => {
      if (StartStopTimes.isStarted(this.startStopTimes)) {
        this.commands.stopTimer();
      } else {
        this.commands.startTimer();
      }
    },

    debugShowWorkspaceStorage: () => {
      const workspaceState: Record<string, unknown> = {};
      for (const key of this.context.workspaceState.keys()) {
        workspaceState[key] = this.context.workspaceState.get(key);
      }

      if (workspaceState.length === 0) {
        console.log("Workspace storage empty");
      } else {
        console.log(
          `Workspace storage:\n${JSON.stringify(workspaceState, null, 2)}`,
        );
      }
    },

    debugClearAllWorkspaceStorage: () => {
      const no = "No";
      const yes = "Yes";
      vscode.window
        .showQuickPick([no, yes], {
          title: `Clear all workspace storage for ${this.getPackageJson().displayName}?`,
        })
        .then((value) => {
          if (value !== yes) {
            return;
          }

          for (const key of this.context.workspaceState.keys()) {
            this.context.workspaceState.update(key, undefined);
          }

          this.loadState();

          vscode.window.showInformationMessage("Cleared workspace storage");
        });
    },
  } as const;

  private makeCommandId = (commandName: keyof typeof this.commands) => {
    return `${this.getPackageJson().name}.${commandName}`;
  };

  private registerCommand = (commandName: keyof typeof this.commands) => {
    this.context.subscriptions.push(
      vscode.commands.registerCommand(
        this.makeCommandId(commandName),
        this.commands[commandName],
      ),
    );
  };

  private registerCommands = () => {
    let commandName: keyof typeof this.commands;
    for (commandName in this.commands) {
      this.registerCommand(commandName);
    }

    this.statusBarItem.command = this.makeCommandId("clickStatusBarItem");
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
