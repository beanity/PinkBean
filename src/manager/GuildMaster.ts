import { Guild, Prefix } from "../model";

class GuildMaster {
  private guildMap: Map<string, Guild>;

  constructor() {
    this.guildMap = new Map();
  }

  public has(guildId: string) {
    return this.guildMap.has(guildId);
  }

  public add(guild: Guild) {
    this.guildMap.set(guild.id, guild);
  }

  public set(guildId: string, prefix?: Prefix) {
    const guild = this.get(guildId);
    if (prefix) guild.prefix = prefix;
    this.guildMap.set(guildId, guild);
  }

  public delete(guildId: string) {
    this.guildMap.delete(guildId);
  }

  /**
   * Get a guild by its id.
   * If none exists, then creates one and returns it.
   */
  public get(guildId: string) {
    let guild = this.guildMap.get(guildId);
    if (!guild) {
      guild = new Guild(guildId);
      this.add(guild);
    }
    return guild;
  }
}

export const guildMaster = new GuildMaster();
