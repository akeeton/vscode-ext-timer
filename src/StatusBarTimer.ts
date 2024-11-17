import assert from "assert";
import { DateTime, Duration, Interval } from "luxon";
import { PackageJson } from "type-fest";
import * as vscode from "vscode";
import { StartStopTimes, StartStopTimesDto } from "./StartStopTimes";

type VSCodePackageJson = PackageJson & {
  name: string;
  displayName: string;
  contributes: {
    configuration: {
      title: string;
    };
  };
};

interface WorkspaceStateDto {
  startStopTimes: StartStopTimesDto;
}

class WorkspaceState {
  startStopTimes: StartStopTimes;

  constructor(startStopTimes: StartStopTimes) {
    this.startStopTimes = startStopTimes;
  }

  static fromDto = (dto: WorkspaceStateDto): WorkspaceState => {
    return new WorkspaceState(StartStopTimes.fromDto(dto.startStopTimes));
  };

  toDto = (): WorkspaceStateDto => {
    return {
      startStopTimes: this.startStopTimes.toDto(),
    };
  };
}

// TODO Replace checking this.startStopTimes.lastStartTime with an isRunning() function
// TODO Somehow finish open interval and save to storage on shutdown (using focus change callback?)
export default class StatusBarTimer {
  private context: vscode.ExtensionContext;
  private workspaceStateKey: string;

  private workspaceState = new WorkspaceState(new StartStopTimes());
  private statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
  );

  constructor(context: vscode.ExtensionContext, workspaceStateKey: string) {
    this.context = context;
    this.workspaceStateKey = workspaceStateKey;
  }

  activate = () => {
    assert(
      this.getPackageJson().contributes.configuration.title ===
        this.getPackageJson().displayName,
      "Display name and contributed configuration title should match",
    );

    this.loadWorkspaceState();

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

  private loadWorkspaceState = (): void => {
    const workspaceStateDto =
      this.context.workspaceState.get<WorkspaceStateDto>(
        this.workspaceStateKey,
      );

    if (!workspaceStateDto) {
      this.workspaceState = new WorkspaceState(new StartStopTimes());
      return;
    }

    this.workspaceState = WorkspaceState.fromDto(workspaceStateDto);
  };

  private saveWorkspaceState = (): void => {
    this.context.workspaceState.update(
      this.workspaceStateKey,
      this.workspaceState.toDto(),
    );
  };

  private updateStatusBarItem = () => {
    // TODO Move all time-based code to StartStopTimes class and remove luxon import from this file
    let intervalsStoppedNow: Interval[];
    if (!this.workspaceState.startStopTimes.lastStartTime) {
      intervalsStoppedNow = this.workspaceState.startStopTimes.intervals;
    } else {
      intervalsStoppedNow = this.workspaceState.startStopTimes.intervals.concat(
        Interval.fromDateTimes(
          this.workspaceState.startStopTimes.lastStartTime,
          DateTime.utc(),
        ),
      );
    }

    const duration = intervalsStoppedNow
      .map((interval) => {
        return interval.toDuration();
      })
      .reduce((durationAcc, duration) => {
        return durationAcc.plus(duration);
      }, Duration.fromObject({}));

    // TODO Cache durationFormat config setting?
    const format = this.getConfig().durationFormat as string;
    // See https://code.visualstudio.com/api/references/icons-in-labels#icon-listing
    const icon = this.workspaceState.startStopTimes.lastStartTime
      ? "clock"
      : "stop-circle";
    this.statusBarItem.text = `$(${icon}) ${duration.toFormat(format)}`;
  };

  private readonly commands = {
    startTimer: () => {
      if (!this.workspaceState.startStopTimes.lastStartTime) {
        this.workspaceState.startStopTimes.lastStartTime = DateTime.utc();
      } else {
        vscode.window.showInformationMessage("Timer already started");
      }

      this.saveWorkspaceState();
      this.updateStatusBarItem();
    },

    stopTimer: () => {
      if (!this.workspaceState.startStopTimes.lastStartTime) {
        vscode.window.showInformationMessage("Timer already stopped");
      } else {
        this.workspaceState.startStopTimes.intervals.push(
          Interval.fromDateTimes(
            this.workspaceState.startStopTimes.lastStartTime,
            DateTime.utc(),
          ),
        );
        this.workspaceState.startStopTimes.lastStartTime = undefined;
      }

      this.saveWorkspaceState();
      this.updateStatusBarItem();
    },

    resetTimer: () => {
      // TODO Add confirmation quickpick
      this.workspaceState.startStopTimes = new StartStopTimes();
      this.saveWorkspaceState();
      this.updateStatusBarItem();
    },

    clickStatusBarItem: () => {
      if (!this.workspaceState.startStopTimes.lastStartTime) {
        this.commands.startTimer();
      } else {
        this.commands.stopTimer();
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

          this.loadWorkspaceState();

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
