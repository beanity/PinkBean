import { Permissions } from "discord.js";
import { Color } from "../lib";
import { DiscordData, Command, CommandExample } from "./base";

export class Invite extends Command {
  constructor() {
    super("invite", Color.BLUE);
  }

  public description() {
    return "Generate invite link.";
  }

  public customExamples(): CommandExample[] {
    return [
      {
        cmd: this.fullName,
        explain: "generate invite link",
      },
    ];
  }

  public async continue(discord: DiscordData) {
    const link = discord.guild.client.generateInvite({
      scopes: ['bot'],
      permissions: [Permissions.FLAGS.ADMINISTRATOR],
    });
    const embed = this.embed();
    embed.setTitle("Invite Link");
    embed.setDescription(link);
    discord.channel.send({ embeds: [embed] }).catch(console.error);
  }
}
