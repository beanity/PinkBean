export class Range {
  public readonly start: number;
  public readonly end: number;
  public readonly startFromBegin: boolean;
  public readonly endAtFinal: boolean;
  // public readonly coverAll: boolean;

  get coverAll() {
    return this.startFromBegin && this.endAtFinal;
  }
  /**
   * Represents a zero-based range of indexes. Automatically sets the
   * the smaller one to `begin` and the larger one to `end`.
   *
   * If `end` is greater than or equals to 0 but `begin` is less than 0,
   * then automatically sets `begin` to 0. Otherwise, nothing will be modified.
   *
   * Use `Infinity`to indicate the range ends at the largest possible index.
   */
  constructor(i: number, j: number) {
    if (i > j) [i, j] = [j, i];
    if (j >= 0 && i < 0) i = 0;
    this.start = i;
    this.end = j;
    this.startFromBegin = this.start === 0;
    this.endAtFinal = this.end === Infinity;
    // this.coverAll = this.startFromBegin && this.endAtFinal;
  }

  public static buildCoverAll() {
    return new Range(0, Infinity);
  }

  /**
   * Tests whether the range contains the given number.
   */
  public contains(num: number) {
    return num >= this.start && num <= this.end;
  }

  public getIndexes(end: number) {
    const nums: number[] = [];
    const start = this.start < 0 ? 0 : this.start;
    end = Math.min(end, this.end);
    for (let i = start; i <= end; i++) {
      nums.push(i);
    }
    return nums;
  }
}
