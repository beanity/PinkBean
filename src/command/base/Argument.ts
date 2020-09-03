import { _, Md, stringSimilarity } from "../../lib";
import { Range } from "./Range";

export interface ArgumentResult {
  errorMsg?: string;
  value?: string;
  values: string[];
  num?: number;
  nums: number[];
  range?: Range;
}

export interface ArgumentSpecs {
  name: string;
  preset?: string[];
  indexable?: boolean;
  rangeable?: boolean;
  variadic?: boolean;
  naturalable?: boolean;
}

export class Argument {
  private static NATRUAL_REGEX = /^(\d+)$/;
  private static RANGE_REGEX = /^(\d*)\.{2}(\d*)$/;

  public readonly name: string;
  public readonly indexable: boolean;
  public readonly rangeable: boolean;
  public readonly variadic: boolean;
  public readonly inputs: string[];
  public readonly naturalable: boolean;

  private errorMsg: string;
  private numSet: Set<number>;
  private presetSet: Set<string>;
  private range?: Range;
  private values: string[];

  private get nums() {
    return [...this.numSet];
  }

  get input() {
    return this.inputs.join(" ").trim();
  }

  get preset() {
    return [...this.presetSet];
  }

  /**
   * Represents an argument supplied to a command or an option.
   *
   * `preset` is mutually exclusive with `indexable` or `rangeable`.
   *
   * `rangeable` implies `indexable`.
   *
   * @param name argument's name
   * @param preset a preset of values to be matched (case insensitive)
   * @param variadic whether the argument can receieve more than one values
   * @param indexable whether the argument can receive index values.
   * @param rangeable whether the argument can receive range values in format `a..b`
   */
  constructor({
    name,
    preset = [],
    indexable = false,
    rangeable = false,
    variadic = false,
    naturalable = false,
  }: ArgumentSpecs) {
    this.errorMsg = "";
    this.presetSet = new Set(preset.map((v) => v.toLowerCase()));
    this.name = name;
    this.indexable = indexable;
    this.rangeable = rangeable;
    this.variadic = variadic;
    this.naturalable = naturalable;
    this.inputs = [];
    this.values = [];
    this.numSet = new Set();

    if (this.presetSet.size) {
      this.indexable = this.rangeable = false;
    } else if (this.rangeable) {
      this.indexable = true;
    }
  }

  public add(input: string) {
    input = input.trim();
    if (!input) return;
    if (this.variadic) {
      this.inputs.push(input);
    } else if (!this.inputs.length) {
      this.inputs.push(input);
    }
  }

  /**
   * Start parsing the stored input values according to the argument's specifications.
   */
  public parse() {
    this.reset();
    for (const input of this.inputs) {
      if ((!this.variadic && this.values.length) || this.errorMsg) break;
      this.parseInput(input);
    }
    return this.getResult();
  }

  public toString() {
    return `[${this.name}]`;
  }

  private parseInput(input: string) {
    if (this.presetSet.size) {
      this.parsePreset(input);
      return;
    }
    if (this.indexable) {
      if (Argument.NATRUAL_REGEX.test(input)) {
        this.parseIndex(input);
        return;
      }
      if (this.rangeable && /\.\./.test(input)) {
        this.parseRange(input);
        return;
      }
      this.errorMsg = this.msgPrefix(input) + "is not valid";
    }
    if (this.naturalable) {
      this.parseNatural(input);
      return;
    }
    this.values.push(input);
  }

  private msgPrefix(input: string | number) {
    return `The input value ${Md.pre(_.truncate(input.toString()))} `;
  }

  private getResult() {
    const result: ArgumentResult = { values: [], nums: [] };
    if (this.errorMsg) {
      result.errorMsg = this.errorMsg;
      return result;
    }
    if (this.values.length) {
      result.values = this.values;
      result.value = this.values[0];
    }
    if (this.numSet.size) {
      result.nums = this.nums;
      result.num = this.nums[0];
    }
    if (this.range) result.range = this.range;
    return result;
  }

  private reset() {
    this.errorMsg = "";
    this.values = [];
    this.numSet = new Set();
    this.range = undefined;
  }

  private parsePreset(input: string) {
    input = input.toLowerCase();
    if (this.presetSet.has(input)) {
      this.values.push(input);
    } else {
      this.errorMsg =
        this.msgPrefix(input) +
        `is invalid. Did you mean ${Md.pre(
          stringSimilarity.findBestMatch(input, this.preset).bestMatch.target
        )} ?`;
    }
  }

  private parseIndex(input: string) {
    const num = parseInt(input);
    if (Number.isNaN(num) || num <= 0) {
      this.errorMsg = this.msgPrefix(input) + "is not a valid index number";
      return;
    }
    this.numSet.add(num - 1);
  }

  private parseNatural(input: string) {
    const msg = this.msgPrefix(input) + "is not valid";
    const match = Argument.NATRUAL_REGEX.exec(input);
    if (!match) {
      this.errorMsg = msg;
      return;
    }
    const num = Number(match[1]);
    if (!Number.isInteger(num) || num < 0) {
      this.errorMsg = msg;
      return;
    }
    this.numSet.add(num);
  }

  private parseRange(input: string) {
    if (this.range) return;
    const match = Argument.RANGE_REGEX.exec(input);
    const msg = this.msgPrefix(input) + "is not a valid range";
    if (!match) {
      this.errorMsg = msg;
      return;
    }
    const [, i, j] = match;
    const begin = i ? Number(i) - 1 : 0;
    const end = j ? Number(j) - 1 : Infinity;
    if (Math.max(begin, end) < 0) {
      this.errorMsg = msg;
      return;
    }
    this.range = new Range(begin, end);
  }
}
