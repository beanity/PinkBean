import { _ } from "../lib";
import { Range } from "../command/base";
import { Song } from ".";

export interface RemoveParam {
  index?: number;
  requestorId?: string;
}

export interface BulkRemoveParam {
  indexes?: number[];
  range?: Range;
  requestorId?: string;
}

/**
 * Queue that stores requested music.
 */
export class Queue {
  public static readonly MAX_SIZE = 2000;
  private songs: Song[] = [];
  private shouldShift = true;

  get empty() {
    return !this.songs.length;
  }

  get full() {
    return this.songs.length >= Queue.MAX_SIZE;
  }

  get size() {
    return this.songs.length;
  }

  get availableSize() {
    return Math.max(Queue.MAX_SIZE - this.size, 0);
  }

  get first() {
    return this.getSong(0);
  }

  get last() {
    return this.getSong(this.size - 1);
  }

  get all() {
    return this.songs;
  }

  public add(song: Song) {
    if (this.full) {
      return false;
    }
    this.songs.push(song);
    return true;
  }

  public shift() {
    if (this.shouldShift) {
      return this.songs.shift();
    }
    this.shouldShift = true;
  }

  public ignoreNextShift() {
    this.shouldShift = false;
  }

  public getSong(index: number) {
    return this.songs[index] as Song | undefined;
  }

  public getSongs(indexes: number[]) {
    const songs = new Set<Song>();
    for (const i of indexes) {
      const song = this.getSong(i);
      song && songs.add(song);
    }
    return [...songs];
  }

  public removeAll(requestorId?: string) {
    if (!requestorId) {
      const temp = this.songs;
      this.songs = [];
      return temp;
    }
    const own = [];
    const others = [];
    for (const song of this.songs) {
      if (song.requestor.id === requestorId) {
        own.push(song);
      } else {
        others.push(song);
      }
    }
    this.songs = others;
    return own;
  }

  public remove(index = 0, requestorId?: string) {
    const song = this.getSong(index);
    if (!song) return;
    if (requestorId && requestorId !== song.requestor.id) return;
    return index ? this.songs.splice(index, 1).shift() : this.shift();
  }

  // public bulkRemove({ indexes = [], range, requestorId }: BulkRemoveParam) {
  //   const rangeIndexes: number[] = [];
  //   if (range && range.start < this.size) {
  //     if (range.coverAll) {
  //       return this.removeAll(requestorId);
  //     }
  //     rangeIndexes.push(...range.getIndexes(this.size - 1));
  //   }
  //   indexes = [...new Set([...indexes, ...rangeIndexes])];
  //   const validIndexes = indexes.filter((v) =>
  //     requestorId ? this.songs[v]?.requestor?.id === requestorId : this.songs[v]
  //   );
  //   return _.pullAt(this.songs, validIndexes);
  // }

  public bulkRemove(indexes: number[], requestorId?: string) {
    if (this.empty) return [];
    indexes = [...new Set(indexes)];
    const validIndexes = indexes.filter((v) =>
      requestorId ? this.songs[v]?.requestor?.id === requestorId : this.songs[v]
    );
    return _.pullAt(this.songs, validIndexes);
  }

  // private isValidIndex(index: number) {
  //   return Number.isInteger(index) && index >= 0 && index < this.size;
  // }
}
