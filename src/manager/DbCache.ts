import { Prefix, Time, News } from "../db/entity";
import { EntityManager } from "./EntityManager";

/**
 * Caches database data for efficiency purposes.
 */
class DbCache {
  public prefix: EntityManager<Prefix>;
  public time: EntityManager<Time>;
  public news: EntityManager<News>;

  constructor() {
    this.prefix = new EntityManager();
    this.time = new EntityManager();
    this.news = new EntityManager();
  }
}

export const dbCache = new DbCache();
