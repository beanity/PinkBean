import { _, Color, env } from "../lib";
import { Argument, DiscordData, Command, CommandExample } from "./base";
import got from "got";

export class Item extends Command {
  public static readonly JOBS = new Map([
    [1, "Warrior"],
    [2, "Magician"],
    [4, "Bowman"],
    [8, "Thief"],
    [16, "Pirate"],
  ]);
  public static readonly JOB_IDS_DESC = [...Item.JOBS.keys()].sort(
    (a, b) => b - a
  );
  public static readonly ATTACK_SPEED = new Map([
    [3, "Faster"],
    [4, "Fast"],
    [5, "Fast"],
    [6, "Normal"],
    [7, "Slow"],
    [8, "Slow"],
    [9, "Slower"],
  ]);

  private arg: Argument;

  constructor() {
    super("item", Color.PINK);
    this.arg = new Argument({ name: "NAME", variadic: true });
    this.addCustomArg(this.arg);
  }

  public description() {
    return "Search item details.";
  }

  public customExamples(): CommandExample[] {
    return [
      {
        cmd: `${this.fullName} Hero of Legend`,
        explain: `search the item "Hero of Legend"`,
      },
    ];
  }

  public async continue(discord: DiscordData) {
    const itemName = this.arg.input;
    if (!itemName) return;

    let itemData: any;
    const uri = `${env.server}/api/item/${encodeURI(itemName)}`;
    try {
      itemData = await got(uri).json();
    } catch (e) {
      console.error(e);
    }

    if (_.isEmpty(itemData)) {
      discord.channel.send(this.noResultsEmbed()).catch(console.error);
      return;
    }
    discord.channel.send(this.itemEmbed(itemData)).catch(console.error);
  }

  private getCategory(typeInfo: any) {
    if (_.isEmpty(typeInfo)) return "";
    return [typeInfo.overallCategory, typeInfo.category, typeInfo.subCategory]
      .filter((v) => v)
      .join(" / ");
  }

  private getDescription(itemData: any) {
    const descriptionData = itemData.description;
    if (_.isEmpty(descriptionData) || !descriptionData.description) return "";
    const description = descriptionData.description
      .replace(/\\r\\n/g, "\n")
      .replace(/#c/g, "")
      .replace(/#/g, "")
      .replace(/\\n/g, "\n")
      .trim();
    return `${description}\n`;
  }

  private getEffects(metaInfo: any) {
    const effects = [
      metaInfo.incSTR && `STR +${metaInfo.incSTR}`,
      metaInfo.incINT && `INT +${metaInfo.incINT}`,
      metaInfo.incDEX && `DEX +${metaInfo.incDEX}`,
      metaInfo.incLUK && `LUK +${metaInfo.incLUK}`,
      metaInfo.incMHP && `MaxHp +${metaInfo.incMHP}`,
      metaInfo.incMMP && `MaxMp +${metaInfo.incMMP}`,
      metaInfo.incACC && `Accuracy +${metaInfo.incACC}`,
      metaInfo.incEVA && `Avoidability +${metaInfo.incEVA}`,
      metaInfo.incCraft && `Craft +${metaInfo.incCraft}`,
      metaInfo.incSpeed && `Speed +${metaInfo.incSpeed}`,
      metaInfo.incJump && `Jump +${metaInfo.incJump}`,
    ];
    return this.filterAndJoin({ effects, suffix: "\n" });
  }

  private getReqJob(metaInfo: any) {
    const effects = [
      this.getJob(metaInfo.reqJob),
      this.getJob(metaInfo.reqJob2),
    ];
    return this.filterAndJoin({ effects, join: ", " });
  }

  private getJob(bitInfo: number) {
    const jobs: string[] = [];
    for (const jobId of Item.JOB_IDS_DESC) {
      if (!bitInfo || bitInfo < 0) break;
      if (bitInfo < jobId) continue;
      const job = Item.JOBS.get(jobId) || "";
      jobs.push(job);
      bitInfo -= jobId;
    }
    return this.filterAndJoin({ effects: jobs, join: " and " });
  }

  private getReqStats(metaInfo: any) {
    const reqSTR = metaInfo.reqSTR,
      reqDEX = metaInfo.reqDEX,
      reqINT = metaInfo.reqINT,
      reqLUK = metaInfo.reqLUK,
      reqPOP = metaInfo.reqPOP;
    const effects = [
      reqSTR && `STR ${reqSTR}`,
      reqINT && `INT ${reqINT}`,
      reqDEX && `DEX ${reqDEX}`,
      reqLUK && `LUK ${reqLUK}`,
      reqPOP && `POP ${reqPOP}`,
    ];
    return this.filterAndJoin({ effects, join: ", " });
  }

  private getReq(metaInfo: any) {
    const reqStats = this.getReqStats(metaInfo);
    const reqJob = this.getReqJob(metaInfo);
    const price = !metaInfo.tradeBlock && metaInfo.price;
    const effects = [
      metaInfo.reqLevel && `Req Level: ${metaInfo.reqLevel}`,
      reqStats && `Req Stats: ${reqStats}`,
      reqJob && `Job: ${reqJob}`,
      metaInfo.tuc && `Upgrades Available: ${metaInfo.tuc}`,
      price && `Sold For: ${this.formatNum(price)} mesos`,
    ];
    return this.filterAndJoin({ effects, suffix: "\n" });
  }

  private getSpecialEffects(metaInfo: any) {
    const effects = [
      metaInfo.bdR && `When fighting bosses, damage +${metaInfo.bdR}%`,
      metaInfo.imdR && `Ignore monster defense +${metaInfo.imdR}%`,
    ];
    return this.filterAndJoin({ effects, suffix: "\n" });
  }

  private getAttackSpeed(attackSpeed?: number) {
    if (!attackSpeed) return "";
    const attackSpeedDesc = Item.ATTACK_SPEED.get(attackSpeed) || "";
    return attackSpeedDesc || (attackSpeed < 3 ? "Fastest" : "Slowest");
  }

  private getStats(metaInfo: any) {
    const effects = [
      metaInfo.incPAD && `Weapon Attack: ${metaInfo.incPAD}`,
      metaInfo.incMAD && `Magic Attack: ${metaInfo.incMAD}`,
      metaInfo.attackSpeed &&
        `Attack Speed: ${this.getAttackSpeed(metaInfo.attackSpeed)} (${
          metaInfo.attackSpeed
        })`,
      metaInfo.incPDD && `Weapon Defence: ${metaInfo.incPDD}`,
      metaInfo.incMDD && `Magic Defence: ${metaInfo.incMDD}`,
    ];
    return this.filterAndJoin({ effects, suffix: "\n" });
  }

  private getTraits(metaInfo: any) {
    const effects = [
      metaInfo.charismaEXP && `Ambition EXP +${metaInfo.charismaEXP}`,
      metaInfo.willEXP && `Willpower EXP +${metaInfo.willEXP}`,
      metaInfo.craftEXP && `Diligence EXP +${metaInfo.craftEXP}`,
      metaInfo.senseEXP && `Empathy EXP +${metaInfo.senseEXP}`,
      metaInfo.charmEXP && `Charm EXP +${metaInfo.charmEXP}`,
    ];
    return this.filterAndJoin({ effects, suffix: "\n" });
  }

  private getTradesEffects(metaInfo: any) {
    const effects = [
      metaInfo.exItem && `This is an exclusive/unique item`,
      metaInfo.tradeBlock && `Cannot be traded`,
      metaInfo.equipTradeBlock && `Cannot be traded after equipping`,
      metaInfo.noPotential && `Cannot put any potential on this item`,
      metaInfo.unchangeable && `Cannot be changed`,
    ];
    return this.filterAndJoin({ effects, suffix: "\n" });
  }

  private itemDescription(data: any) {
    const metaInfo = data.metaInfo;
    const effects = [
      this.getDescription(data),
      this.getReq(metaInfo),
      this.getStats(metaInfo),
      this.getEffects(metaInfo),
      this.getTraits(metaInfo),
      this.getSpecialEffects(metaInfo),
      this.getTradesEffects(metaInfo),
    ];
    return this.filterAndJoin({ effects, join: "\n" });
  }

  private itemEmbed(data: any) {
    const embed = this.embed();
    embed.setTitle(data.description.name || "");
    embed.setAuthor(this.getCategory(data.typeInfo));
    embed.setThumbnail(data.iconUri);
    embed.setDescription(this.itemDescription(data));
    return embed;
  }
}
