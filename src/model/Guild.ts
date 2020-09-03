import { Prefix, Queue } from ".";

export class Guild {
  public static readonly LIST_MAX = 200;
  public readonly id: string;
  public readonly queue: Queue;
  public readonly cooldowns: Set<string>;
  public prefix: Prefix;

  constructor(id: string) {
    this.id = id;
    this.prefix = new Prefix(id);
    this.queue = new Queue();
    this.cooldowns = new Set();
  }
}
