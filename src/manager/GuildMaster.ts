import { Guild, Prefix, Song } from "../model";

export interface SetParam {
  prefix?: Prefix;
  songs?: Song[];
}

class GuildMaster {
  private guildMap: Map<string, Guild>;

  get guilds() {
    return [...this.guildMap.values()];
  }

  constructor() {
    this.guildMap = new Map();
  }

  public has(guildId: string) {
    return this.guildMap.has(guildId);
  }

  public set(guildId: string, { prefix, songs }: SetParam = {}) {
    const guild = this.get(guildId);
    if (prefix) guild.prefix = prefix;
    if (songs) guild.queue.songs = songs;
  }

  public delete(guildId: string) {
    return this.guildMap.delete(guildId);
  }

  /**
   * Get a guild by its id.
   * If none exists, then creates one and returns it.
   */
  public get(guildId: string) {
    let guild = this.guildMap.get(guildId);
    if (!guild) {
      guild = new Guild(guildId);
      this.guildMap.set(guildId, guild);
    }
    return guild;
  }
}

export const guildMaster = new GuildMaster();
