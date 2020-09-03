import { Color, moment } from "../lib";
import { DiscordData, Command, CommandExample } from "./base";

export class Ping extends Command {
  constructor() {
    super("ping", Color.GENERAL);
  }

  public description() {
    return "Show the previous heartbeat ping.";
  }

  public customExamples(): CommandExample[] {
    return [
      {
        cmd: this.fullName,
        explain: "show the previous heartbeat ping",
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
      { name: "Ping", value: `${ping} ms`, inline: true },
      { name: "Uptime", value: uptime, inline: true }
    );
    discord.channel.send(embed).catch(console.error);
  }
}
