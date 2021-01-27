import { Color } from "../lib";
import { DiscordData, Command, CommandExample } from "./base";
import * as BotCommand from ".";

interface CmdInfo {
  name: string;
  arg: string;
  description: string;
}

interface LengthInfo {
  longestArgLength: number;
  longestCmdLength: number;
}

export class Help extends Command {
  constructor() {
    super("help", Color.BLUE);
  }

  public description() {
    return "Show bot commands.";
  }

  public customExamples(): CommandExample[] {
    return [
      {
        cmd: this.fullName,
        explain: "show bot commands",
      },
    ];
  }

  public async continue(discord: DiscordData) {
    const msCmdInfos = this.getCmdInfos(this.msCmds());
    const musicCmdInfos = this.getCmdInfos(this.musicCmds());
    const generalCmdInfos = this.getCmdInfos(this.generalCmds());
    const lengthInfo = this.getLengthInfo([
      ...msCmdInfos,
      ...musicCmdInfos,
      ...generalCmdInfos,
    ]);

    const content = `\`\`\`css
Pink Bean

To show help for a command, add ' -h' after the command.
For example, '${new BotCommand.Item().fullName} -h'

MapleStory:
${this.getCmdContent(msCmdInfos, lengthInfo)}

Music:
${this.getCmdContent(musicCmdInfos, lengthInfo)}

General:
${this.getCmdContent(generalCmdInfos, lengthInfo)}
\`\`\`
  **Website:**
  <https://www.pinkbean.xyz>
  
  **Donate:**
  <https://www.patreon.com/PinkBean>
  
  **Support:**
  https://discord.gg/wBUKQhN`;

    await discord.message.author.send(content);
  }

  private getCmdInfos(cmds: (new () => Command)[]): CmdInfo[] {
    const infos = cmds.map((cmd) => {
      const instance = new cmd();
      const info: CmdInfo = {
        name: instance.fullName,
        arg: instance?.argument?.toString() ?? "",
        description: instance.briefDescription(),
      };
      return info;
    });
    return infos;
  }

  private getLengthInfo(infos: CmdInfo[]): LengthInfo {
    let longestArgLength = 0;
    let longestCmdLength = 0;
    for (const info of infos) {
      info.arg.length > longestArgLength &&
        (longestArgLength = info.arg.length);

      info.name.length > longestCmdLength &&
        (longestCmdLength = info.name.length);
    }
    return {
      longestArgLength,
      longestCmdLength,
    };
  }

  private msCmds(): (new () => Command)[] {
    return [
      BotCommand.Sub,
      BotCommand.Time,
      BotCommand.News,
      BotCommand.Rank,
      BotCommand.Item,
      BotCommand.Mob,
    ];
  }
  private musicCmds(): (new () => Command)[] {
    return [
      BotCommand.Play,
      BotCommand.Current,
      BotCommand.Skip,
      BotCommand.Queue,
      BotCommand.Shuffle,
      BotCommand.Pause,
      BotCommand.Resume,
      BotCommand.Join,
      BotCommand.Leave,
    ];
  }
  private generalCmds(): (new () => Command)[] {
    return [
      BotCommand.Prefix,
      BotCommand.Invite,
      BotCommand.About,
      BotCommand.Ping,
    ];
  }

  private getCmdContent(cmds: CmdInfo[], length: LengthInfo, tabSize = 2) {
    const tab = " ".repeat(tabSize);
    return cmds
      .map(
        (cmd) =>
          `${tab}${cmd.name.padEnd(
            length.longestCmdLength,
            " "
          )}\t${cmd.arg.padEnd(length.longestArgLength, " ")}\t${
            cmd.description
          }`
      )
      .join("\n");
  }
}
