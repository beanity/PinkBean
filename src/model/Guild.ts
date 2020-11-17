import { Prefix, Queue, SongData } from ".";

export interface GuildData {
  id: string;
  songs: SongData[];
}

export class Guild {
  public static readonly LIST_MAX = 200;
  public readonly id: string;
  public readonly queue: Queue;
  public readonly cooldowns: Set<string>;
  public prefix: Prefix;

  constructor(id: string) {
    this.id = id;
    this.prefix = new Prefix();
    this.queue = new Queue();
    this.cooldowns = new Set();
  }

  public toData(): GuildData {
    return {
      id: this.id,
      songs: this.queue.songs.map((song) => song.toData()),
    };
  }
}
