import { Argument, Option } from ".";
import { _, Color, Discord, Md, numeral, stringSimilarity } from "../../lib";
import { guildMaster } from "../../manager";
import { Prefix } from "../../model";

export interface CommandExample {
  cmd: string;
  explain: string;
}

export interface CommandExecutionParam {
  /**
   * The list of inputs excluding the prefix and the invoked name.
   */
  inputs: string[];

  /**
   * The object that holds the discord data.
   */
  discord: DiscordData;

  /**
   * The name that invoked the bot command.
   */
  invokedName: string;
}

export interface DiscordData {
  /**
   * The main hub for interacting with the Discord API, and the starting point for any bot.
   */
  client: Discord.Client;

  /**
   * Represents the bot as the logged in client's Discord user.
   */
  clientUser: Discord.ClientUser;

  /**
   * The original discord message object.
   */
  message: Discord.Message;

  /**
   * The channel that the message was sent in.
   */
  channel: Discord.TextChannel | Discord.DMChannel | Discord.NewsChannel;
  /**
   * The bot as a guild member.
   */
  bot: Discord.GuildMember;
  /**
   * The author of the message as a guild member.
   */
  member: Discord.GuildMember;

  /**
   * The user that the guild member instance represents
   */
  user: Discord.User;
  /**
   * The guild the message was sent in (if in a guild channel).
   */
  guild: Discord.Guild;
}

export interface JoinParam {
  effects?: string[];
  join?: string;
  suffix?: string;
  end?: string;
}

export abstract class Command {
  public readonly adminOnly: boolean;
  public readonly aliases: string[];
  public readonly name: string;
  public color: number;
  public invokedName: string;
  public options: Option[];
  public prefix: Prefix;

  protected help: Option;

  private argDescriptions: string[];
  private cooldown: number;
  private customArg?: Argument;
  private examples: CommandExample[];
  private invalidOpt: string;
  private longestOptionLength: number;
  private optionsMap: Map<string, Option>;

  /**
   * prefix + invokedName
   */
  get fullName() {
    return this.prefix + this.invokedName;
  }

  get argument() {
    return this.customArg;
  }

  constructor(name: string, color = Color.PINK, adminOnly = false) {
    this.adminOnly = adminOnly;
    this.aliases = [name];
    this.name = name;
    this.color = color;
    this.invokedName = name;
    this.options = [];
    this.prefix = new Prefix();

    this.cooldown = 0;
    this.argDescriptions = [];
    this.examples = [];
    this.help = new Option("-h", "show command help");
    this.invalidOpt = "";
    this.longestOptionLength = 0;
    this.optionsMap = new Map();

    this.addAliases();
    this.addOption(this.help);
  }

  /**
   * Start executing the command.
   */
  public async execute({
    inputs,
    discord,
    invokedName,
  }: CommandExecutionParam) {
    this.invokedName = invokedName;
    this.prefix = guildMaster.get(discord.guild.id).prefix;
    this.parse(inputs);

    if (this.help.enabled) {
      this.examples = this.customExamples();
      discord.channel.send(this.helpEmbed()).catch(console.error);
      return;
    }

    if (this.invalidOpt) {
      discord.channel.send(this.invalidOptionEmbed()).catch(console.error);
      return;
    }

    if (this.adminOnly && !discord.member.hasPermission("ADMINISTRATOR")) {
      discord.channel.send(this.adminOnlyEmbed()).catch(console.error);
      return;
    }

    if (this.cooldown) {
      const cooldowns = guildMaster.get(discord.guild.id).cooldowns;
      if (cooldowns.has(this.name)) {
        discord.channel.send(this.cooldownEmbed()).catch(console.error);
        return;
      }
      cooldowns.add(this.name);
      setTimeout(() => {
        cooldowns.delete(this.name);
      }, this.cooldown);
    }

    await this.continue(discord);
  }

  public briefDescription() {
    const description = this.description();
    return !description.endsWith(".")
      ? description
      : description.substring(0, description.length - 1);
  }

  protected addCustomArg(arg: Argument) {
    this.customArg = arg;
    this.addArgDescriptions();
  }

  protected addCustomOptions(...options: Option[]) {
    options.forEach((v) => this.addOption(v));
    this.options = [...options, this.help];
  }

  protected customAliases(): string[] {
    return [];
  }

  protected customArgDescriptions(): string[] {
    return [];
  }

  protected customExamples(): CommandExample[] {
    return [];
  }

  protected customOptions(): Option[] {
    return [];
  }

  protected deleteMsg(msg?: Discord.Message, timeoutMs = 0) {
    if (!msg) return;
    msg.delete({ timeout: timeoutMs }).catch(console.error);
  }

  protected formatNum(num: any, format = "0,0") {
    return numeral(num).format(format);
  }

  protected filterAndJoin({
    effects = [],
    join = "",
    suffix = "",
    end = "",
  }: JoinParam = {}) {
    const filtered = effects.filter((v) => v);
    const mapped = suffix ? filtered.map((v) => v + suffix) : filtered;
    let joined = mapped.join(join);
    if (joined && end) joined += end;
    return joined;
  }

  protected embed(color = this.color) {
    return new Discord.MessageEmbed().setColor(color);
  }

  protected noResultsEmbed() {
    return this.embed().setDescription("No results found");
  }

  protected enableCooldown(ms = 1000) {
    this.cooldown = ms;
  }

  private addAliases() {
    for (const alias of this.customAliases()) {
      if (this.aliases.includes(alias)) {
        throw new Error(
          `alias '${alias}' already exists for command '${this.name}'.`
        );
      }
      this.aliases.push(alias);
    }
  }

  private addArgDescriptions() {
    const custom = this.customArgDescriptions();
    if (custom.length) {
      this.argDescriptions = custom;
    } else {
      this.setDefaultArgDescriptions();
    }
    for (let i = 0; i < this.argDescriptions.length; i++) {
      this.argDescriptions[i] = " ⁃ " + this.argDescriptions[i];
    }
  }

  /**
   * Add an option to the command if it does not already exist.
   */
  private addOption(option: Option) {
    if (this.optionsMap.has(option.short) || this.optionsMap.has(option.long)) {
      throw new Error(
        `option '${option}' already exists for command '${this.name}'.`
      );
    }
    if (option.short) this.optionsMap.set(option.short, option);
    if (option.long) this.optionsMap.set(option.long, option);
    this.options.push(option);
    this.longestOptionLength = Math.max(
      this.longestOptionLength,
      option.length
    );
  }

  private argInfo() {
    if (!this.customArg || !this.argDescriptions.length) return "";
    const info = `${Md.pre(this.customArg.name)} can be:\n`;
    return info + this.argDescriptions.join("\n") + "\n\n";
  }

  private helpDescription() {
    return (
      this.usageInfo() +
      this.aliasInfo() +
      (this.adminOnly ? "**(Admin and above only)**\n" : "") +
      this.description() +
      "\n\n" +
      this.argInfo() +
      this.optionsInfo() +
      (this.examples.length ? "**Examples:**" : "")
    );
  }

  private aliasInfo() {
    if (this.aliases.length <= 1) return "";
    return (
      Md.bld("Aliases: ") +
      _.without(this.aliases, this.invokedName)
        .map((v) => Md.pre(this.prefix + v))
        .join(", ") +
      "\n\n"
    );
  }

  private examplesEmbedFields(): Discord.EmbedFieldData[] {
    this.examples = this.customExamples();
    return this.examples.map((example) => {
      const cmd = example.cmd
        .split("||")
        .map((v) => Md.pre(v.trim()))
        .join(" or ");
      return {
        name: cmd,
        value: example.explain,
      };
    });
  }

  private adminOnlyEmbed() {
    const embed = this.embed(Color.BLUE);
    embed.setDescription(`${Md.pre(this.fullName)} is for administrators only`);
    return embed;
  }

  private cooldownEmbed() {
    return this.embed().setDescription(
      `${Md.pre(this.fullName)} is on cooldown`
    );
  }

  private helpEmbed() {
    const embed = this.embed(Color.BLUE);
    embed.setTitle(`Command Help`);
    embed.setDescription(this.helpDescription());
    embed.addFields(this.examplesEmbedFields());
    return embed;
  }

  private invalidOptionEmbed() {
    const embed = this.embed();
    embed.setDescription(
      `The option ${Md.pre(
        _.truncate(this.invalidOpt)
      )} does not exist for command ${Md.pre(
        this.fullName
      )}. Did you mean ${Md.pre(
        stringSimilarity.findBestMatch(this.invalidOpt, [
          ...this.optionsMap.keys(),
        ]).bestMatch.target
      )}?`
    );
    return embed;
  }

  private optionsInfo() {
    if (!this.options.length) return "";
    const descriptions = this.options
      .map(
        (option) =>
          option.toString().padEnd(this.longestOptionLength, " ") +
          "\t" +
          option.description +
          "\t"
      )
      .join("\n");
    return Md.bld("Options:") + Md.cb(descriptions) + "\n";
  }

  private parse(inputs: string[]) {
    let previousOpt: Option | undefined;
    for (const input of inputs) {
      if (input.startsWith("-")) {
        previousOpt = this.parseOption(input);
      } else if (previousOpt && previousOpt.arg) {
        previousOpt.arg.add(input);
        previousOpt = void 0;
      } else {
        this.customArg?.add(input);
      }
      if (this.help.enabled) return;
    }
  }

  private parseOption(opt: string) {
    const option = this.optionsMap.get(opt);
    if (option) {
      option.enable();
      return option;
    }
    if (!this.invalidOpt) this.invalidOpt = opt;
  }

  private setDefaultArgDescriptions() {
    if (!this.customArg) return;
    if (this.customArg.preset.length) {
      this.argDescriptions.push(
        "any one of: " + this.customArg.preset.map((v) => Md.pre(v)).join(", ")
      );
    }
    if (this.customArg.indexable) {
      this.argDescriptions.push(
        this.customArg.variadic
          ? "one or more numbers separated by space"
          : "an index number"
      );
    }
    if (this.customArg.rangeable) {
      this.argDescriptions.push(
        "a range of indexes in the form `a..b`. Omit `a` to start at the very first item; omit `b` to end at the very last item"
      );
    }
  }

  private usageInfo() {
    const usage = `${this.fullName}${
      this.customArg ? " " + this.customArg.toString() : ""
    }`;
    return `${Md.cb(usage)}\n`;
  }

  /**
   * A brief description of the command.
   */
  public abstract description(): string;

  /**
   * Continue running the command after processing help.
   */
  protected abstract async continue(data: DiscordData): Promise<void>;
}
