import { Color } from "../lib";
import { Time as MapleTime } from "../maplestory/Time";
import { DiscordData, Command, CommandExample } from "./base";

export class Time extends Command {
  get timeEmbed() {
    const embed = this.embed();
    const serverTime = MapleTime.time;
    embed.setTitle(serverTime.format("h:mm A"));
    embed.setDescription(`${serverTime.format("dddd, MMMM D, YYYY")} (UTC)`);
    embed.addFields(
      {
        name: "Daily reset in",
        value: MapleTime.formatDuration(MapleTime.daily),
      },
      {
        name: "Weekly reset in",
        value: MapleTime.formatDuration(MapleTime.weeklyBoss),
      },
      {
        name: "Guild and Dojo reset in",
        value: MapleTime.formatDuration(MapleTime.weeklyMule),
      },
      {
        name: "Kritias Invasion in",
        value: MapleTime.formatDuration(MapleTime.invasion),
      }
    );
    return embed;
  }

  constructor() {
    super("time", Color.MAPLE);
  }

  public description() {
    return "Server time and reset time.";
  }

  public customExamples(): CommandExample[] {
    return [
      {
        cmd: this.fullName,
        explain: "show server time and reset time",
      },
    ];
  }

  public async continue(discord: DiscordData) {
    discord.channel.send(this.timeEmbed).catch(console.error);
  }
}
