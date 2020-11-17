import { Color, Md } from "../lib";
import { guildMaster } from "../manager";
import { Prefix as PrefixEntity } from "../db/entity";
import { Prefix as PrefixModel } from "../model";
import { DiscordData, Command, CommandExample, Argument, Option } from "./base";
import { getRepository } from "typeorm";

export class Prefix extends Command {
  private arg: Argument;
  private space: Option;
  constructor() {
    super("prefix", Color.BLUE, true);
    this.space = new Option("-s", "include a space");
    this.arg = new Argument({ name: "CONTENT" });
    this.addCustomArg(this.arg);
    this.addCustomOptions(this.space);
  }

  public description() {
    return `Change the current prefix ${Md.pre(this.prefix)} to a new one.`;
  }

  public briefDescription() {
    return "Customize prefix";
  }

  public customArgDescriptions() {
    return [
      "any text without spaces. Automatically removes any surrounding spaces",
    ];
  }

  public customExamples(): CommandExample[] {
    const prefix = "foo";
    return [
      {
        cmd: `${this.fullName} ${prefix}`,
        explain: `change prefix to ${Md.pre(
          prefix
        )} without any spaces. E.g., ${Md.pre(prefix + "help")}`,
      },
      {
        cmd: `${this.fullName} ${this.space} ${prefix}`,
        explain: `change prefix to ${Md.pre(
          prefix
        )} with a space. E.g., ${Md.pre(prefix + " help")}`,
      },
    ];
  }

  public async continue(discord: DiscordData) {
    if (!this.arg.input) {
      return;
    }

    const includeSpace = this.space.enabled;
    const prefix = new PrefixModel(this.arg.input, includeSpace);

    if (prefix.toString() === this.prefix.toString()) {
      return;
    }

    const embed = this.embed();

    try {
      await this.save(discord.guild.id, prefix);
      embed.setTitle(`Prefix is now set to ${Md.pre(prefix)}`);
      embed.setDescription(
        `${this.detail()}. E.g., ${Md.pre(`${prefix}help`)}`
      );
    } catch (e) {
      embed.setDescription("Unable to save prefix");
      console.error(e);
    }
    discord.channel.send(embed).catch(console.error);
  }

  private async save(guildId: string, prefix: PrefixModel) {
    const newPrefix = new PrefixEntity();
    newPrefix.id = guildId;
    newPrefix.content = prefix.content;
    newPrefix.space = prefix.space;
    await getRepository(PrefixEntity).save(newPrefix);
    guildMaster.get(guildId).prefix = prefix;
    this.prefix = prefix;
  }

  private detail() {
    return (this.prefix.space ? "with a " : "without any ") + "space";
  }
}
