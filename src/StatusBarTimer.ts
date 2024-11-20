import assert from "assert";
import * as R from "remeda";
import { PackageJson } from "type-fest";
import * as vscode from "vscode";
import * as StartStopTimes from "./StartStopTimes";

type VSCodePackageJson = PackageJson & {
  name: string;
  displayName: string;
  contributes: {
    configuration: {
      title: string;
    };
  };
};

interface StateDto {
  startStopTimes: StartStopTimes.Dto;
}

class State {
  startStopTimes: StartStopTimes.Model;

  constructor(startStopTimes: StartStopTimes.Model) {
    this.startStopTimes = startStopTimes;
  }

  static fromDto = (dto: StateDto): State => {
    return new State(StartStopTimes.fromDto(dto.startStopTimes));
  };

  toDto = (): StateDto => {
    return {
      startStopTimes: StartStopTimes.toDto(this.startStopTimes),
    };
  };
}

// TODO Make more functional and move "IO" to the edges
// TODO Somehow finish open interval and save to storage on shutdown (using focus change callback?)
export default class StatusBarTimer {
  private context: vscode.ExtensionContext;
  private stateStorageKey: string;

  // TODO Move State fields back to this class and only create State during saving/loading?
  private state = new State(StartStopTimes.stopped());

  private readonly statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
  );

  // See https://code.visualstudio.com/api/references/icons-in-labels#icon-listing
  private static icons = {
    started: "clock",
    stopped: "stop-circle",
  };

  constructor(context: vscode.ExtensionContext, stateStorageKey: string) {
    this.context = context;
    this.stateStorageKey = stateStorageKey;
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

  private getPackageJson = (): VSCodePackageJson => {
    return this.context.extension.packageJSON as VSCodePackageJson;
  };

  private getConfigSection = () => {
    return this.getPackageJson().name;
  };

  private getConfig = (): vscode.WorkspaceConfiguration => {
    return vscode.workspace.getConfiguration(this.getConfigSection());
  };

  private loadState = (): void => {
    const stateDto = this.context.workspaceState.get<StateDto>(
      this.stateStorageKey,
    );

    if (!stateDto) {
      this.state = new State(StartStopTimes.stopped());
      return;
    }

    this.state = State.fromDto(stateDto);
  };

  private saveState = (): void => {
    this.context.workspaceState.update(
      this.stateStorageKey,
      this.state.toDto(),
    );
  };

  private updateStatusBarItem = () => {
    const durationAsIfStopped = R.pipe(
      this.state.startStopTimes,
      StartStopTimes.toStopped,
      StartStopTimes.getDuration,
    );

    // TODO Cache durationFormat config setting?
    const format = this.getConfig().durationFormat as string;

    const icon = StartStopTimes.isStarted(this.state.startStopTimes)
      ? StatusBarTimer.icons.started
      : StatusBarTimer.icons.stopped;

    this.statusBarItem.text = `$(${icon}) ${durationAsIfStopped.toFormat(format)}`;
  };

  private readonly commands = {
    startTimer: () => {
      if (StartStopTimes.isStarted(this.state.startStopTimes)) {
        return;
      }

      this.state.startStopTimes = StartStopTimes.toStarted(
        this.state.startStopTimes,
      );
      this.saveState();
      this.updateStatusBarItem();
    },

    stopTimer: () => {
      if (!StartStopTimes.isStarted(this.state.startStopTimes)) {
        return;
      }

      this.state.startStopTimes = StartStopTimes.toStopped(
        this.state.startStopTimes,
      );
      this.saveState();
      this.updateStatusBarItem();
    },

    resetTimer: () => {
      // TODO Add confirmation quickpick
      this.state.startStopTimes = StartStopTimes.stopped();
      this.saveState();
      this.updateStatusBarItem();
    },

    clickStatusBarItem: () => {
      if (StartStopTimes.isStarted(this.state.startStopTimes)) {
        this.commands.stopTimer();
      } else {
        this.commands.startTimer();
      }
    },

    debugShowWorkspaceStorage: () => {
      const data: Record<string, unknown> = {};
      for (const key of this.context.workspaceState.keys()) {
        data[key] = this.context.workspaceState.get(key);
      }

      if (data.length === 0) {
        console.log("Workspace storage empty");
      } else {
        console.log(`Workspace storage:\n${JSON.stringify(data, null, 2)}`);
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
