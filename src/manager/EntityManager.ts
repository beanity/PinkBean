interface HasId {
  id: string;
}

export class EntityManager<T extends HasId> {
  private cache: Map<string, T>;
  // public readonly cache: Map<string, T>;

  get values() {
    return [...this.cache.values()];
  }

  constructor(data: T[] = []) {
    this.cache = this.createMap(data);
  }

  public get(id: string) {
    return this.cache.get(id);
  }

  public set(...entities: T[]) {
    for (const entity of entities) {
      this.cache.set(entity.id, entity);
    }
  }

  public delete(...entities: T[]) {
    for (const entity of entities) {
      this.cache.delete(entity.id);
    }
  }

  private createMap(data: T[]) {
    return new Map(data.map((v) => [v.id, v]));
  }
}
