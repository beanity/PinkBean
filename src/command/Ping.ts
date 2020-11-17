import { Color, moment } from "../lib";
import { DiscordData, Command, CommandExample } from "./base";

export class Ping extends Command {
  constructor() {
    super("ping", Color.BLUE);
  }

  public description() {
    return "Pink Bean latency.";
  }

  public customExamples(): CommandExample[] {
    return [
      {
        cmd: this.fullName,
        explain: "show the bot's previous heartbeat ping",
      },
    ];
  }

  public async continue(discord: DiscordData) {
    const ping = discord.guild.shard.ping;
    const uptime = moment
      .duration(discord.client.uptime, "ms")
      .format("y [years], w [weeks], d [days], h [hours], m [minutes]");
    const embed = this.embed();
    embed.addFields(
      { name: "Ping", value: `${ping} ms` },
      { name: "Uptime", value: uptime }
    );
    discord.channel.send(embed).catch(console.error);
  }
}
