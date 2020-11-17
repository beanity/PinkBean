import { Command } from "../command/base";
import * as BotCommand from "../command";

class Commander {
  public readonly cmdMap: Map<string, new () => Command>;

  constructor() {
    this.cmdMap = new Map();
  }

  public addCommand<T extends Command>(command: new () => T) {
    const cmd = new command();
    for (const alias of cmd.aliases) {
      if (this.cmdMap.has(alias))
        throw new Error(
          `alias '${alias}' cannot be added to '${
            command.name
          }' as it already exists for '${this.cmdMap.get(alias)?.name}'`
        );
      this.cmdMap.set(alias, command);
    }
  }

  public addCommands<T extends Command>(...commands: Array<new () => T>) {
    for (const command of commands) {
      this.addCommand(command);
    }
  }

  public buildCommand(name: string) {
    const command = this.cmdMap.get(name);
    if (command) return new command();
  }
}

const commander = new Commander();
const commands = [
  BotCommand.Join,
  BotCommand.Leave,
  BotCommand.Play,
  BotCommand.Pause,
  BotCommand.Resume,
  BotCommand.Skip,
  BotCommand.Queue,
  BotCommand.Shuffle,
  BotCommand.Current,
  BotCommand.Ping,
  BotCommand.Time,
  BotCommand.Prefix,
  BotCommand.Sub,
  BotCommand.Rank,
  BotCommand.Item,
  BotCommand.Mob,
  BotCommand.News,
  BotCommand.Invite,
  BotCommand.Help,
  BotCommand.About,
];
commander.addCommands(...commands);

export { commander };
