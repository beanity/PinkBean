import { _, Color, env } from "../lib";
import { Argument, DiscordData, Command, CommandExample } from "./base";
import got from "got";

export class Mob extends Command {
  private static readonly ELEMENTS: { [id: string]: string | undefined } = {
    f: "Fire",
    i: "Ice",
    l: "Lightning",
    s: "Posion",
    h: "Holy",
    d: "Dark",
    p: "Physical",
  };
  private arg: Argument;
  constructor() {
    super("mob", Color.PINK);
    this.arg = new Argument({ name: "NAME", variadic: true });
    this.addCustomArg(this.arg);
  }

  public description() {
    return "Search mob details.";
  }

  public customExamples(): CommandExample[] {
    return [
      {
        cmd: `${this.fullName} mano`,
        explain: `search the mob "mano"`,
      },
    ];
  }

  public async continue(discord: DiscordData) {
    const name = this.arg.input;
    if (!name) return;

    let data: any;
    const uri = `${env.server}/api/mob/${encodeURI(name)}`;

    try {
      data = await got(uri).json();
    } catch (e) {
      console.error(e);
    }

    if (_.isEmpty(data) || _.isEmpty(data.meta)) {
      discord.channel.send({ embeds: [this.noResultsEmbed()] }).catch(console.error);
      return;
    }
    discord.channel.send({ embeds: [this.mobEmbed(data)] }).catch(console.error);
  }

  private mobEmbed(data: any) {
    const embed = this.embed();
    embed.setTitle(data.name.trim());
    embed.setAuthor(this.type(data.meta));
    embed.setDescription(this.mobDescription(data));
    embed.setThumbnail(data.iconUri);
    return embed;
  }

  private mobDescription(data: any) {
    const meta = data.meta;
    const effects = [
      this.general(meta),
      this.stats(meta),
      this.elementalResistence(meta),
      this.special(meta),
      this.location(data.foundAtNames),
    ];
    return this.filterAndJoin({ effects, join: "\n" });
  }

  private type(meta: any) {
    const effects = [meta.isBoss && `Boss`, meta.isUndead && `Undead`];
    return this.filterAndJoin({ effects, join: ", " });
  }

  private general(meta: any) {
    const effects = [
      meta.level && `Level: ${this.formatNum(meta.level)}`,
      meta.maxHP && `HP: ${this.formatNum(meta.maxHP)}`,
      meta.maxMP && `MP: ${this.formatNum(meta.maxMP)}`,
      meta.exp && `EXP: ${this.formatNum(meta.exp)}`,
    ];
    return this.filterAndJoin({ effects, suffix: "\n" });
  }

  private stats(meta: any) {
    const effects = [
      meta.physicalDamage &&
        `Weapon attack: ${this.formatNum(meta.physicalDamage)}`,
      meta.magicDamage && `Magic attack: ${this.formatNum(meta.magicDamage)}`,
      meta.physicalDefense &&
        `Weapon defence: ${this.formatNum(meta.physicalDefense)}`,
      meta.magicDefense &&
        `Magic defence: ${this.formatNum(meta.magicDefense)}`,
      meta.physicalDefenseRate && `PDRate: ${meta.physicalDefenseRate}%`,
      meta.magicDefenseRate && `MDRate: ${meta.magicDefenseRate}%`,
      meta.speed && `Speed: ${meta.speed}`,
      meta.flySpeed && `Fly speed: ${meta.flySpeed}`,
      meta.accuracy && `Accuracy: ${this.formatNum(meta.accuracy)}`,
      meta.evasion && `Avoidability: ${this.formatNum(meta.evasion)}`,
    ];
    return this.filterAndJoin({ effects, suffix: "\n" });
  }

  // https://forums.maplestory.nexon.net/discussion/15028/elemental-resistance-weakness
  private elementalResistence(meta: any) {
    const resist: string | undefined = meta.elementalAttributes;
    if (!resist) return "";

    const resistMap = new Map<string, string[]>();
    for (const match of resist.matchAll(/(\w)(\d)/g)) {
      const effectId = match[2];
      const elements = resistMap.get(effectId);
      const element = Mob.ELEMENTS[match[1].toLowerCase()];
      if (!element) continue;
      if (!elements) {
        resistMap.set(effectId, [element]);
        continue;
      }
      elements.push(element);
    }

    const weak = this.filterAndJoin({
      effects: resistMap.get("3"),
      join: ", ",
    });
    const strong = this.filterAndJoin({
      effects: resistMap.get("2"),
      join: ", ",
    });
    const immune = this.filterAndJoin({
      effects: resistMap.get("1"),
      join: ", ",
    });

    return this.filterAndJoin({
      effects: [
        weak && `Weak against: ${weak}`,
        strong && `Strong against: ${strong}`,
        immune && `Immune to: ${immune}`,
      ],
      suffix: "\n",
    });
  }

  private special(meta: any) {
    const effects = [
      meta.isInvincible && `Invincible`,
      meta.isAutoAggro && `Auto aggro`,
      meta.publicReward && `Public item drops`,
      meta.explosiveReward && `Explosive item drops`,
    ];
    return this.filterAndJoin({ effects, suffix: "\n" });
  }

  private location(locations = []) {
    if (_.isEmpty(locations)) return "";
    const description = `${locations.join("\n")}\n`;
    return description;
  }
}
