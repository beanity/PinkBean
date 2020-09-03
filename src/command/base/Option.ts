import { Argument, MutexOptionsGroup } from "./";

export class Option {
  public readonly short: string;
  public readonly long: string;
  public readonly description: string;
  public readonly length: number;
  public readonly arg?: Argument;

  private _enabled: boolean;
  private _mutexGroup?: MutexOptionsGroup;

  get enabled() {
    return this._enabled;
  }

  get mutexGroup() {
    return this._mutexGroup;
  }

  /**
   * Represents an option supplied to a command.
   *
   * A name is a space-separated string with a short form and/or a long form.
   * Short form is `-` followed by one letter.
   * Long form is `--` follwoed by one or more letters.
   *
   * @param spec format is `-p --pizza`.
   * @param description briefly describe what the option does
   * @param arg an optional argument
   */
  constructor(spec: string, description: string, arg?: Argument) {
    if (!spec) throw new Error("Option: cannot be empty.");
    this._enabled = false;
    this.short = "";
    this.long = "";
    this.description = description;

    const names = spec.trim().split(/\s+/);
    if (Option.isShort(names[0])) {
      this.short = names.shift() || "";
    }
    if (Option.isLong(names[0])) {
      this.long = names.shift() || "";
    }
    if (!(this.long || this.short)) {
      throw new Error("Option: must have a short or a long name.");
    }
    if (arg) {
      if (arg.variadic) {
        throw new Error(
          `The argument '${arg.name}' supplied to an option should not be variadic`
        );
      }
      this.arg = arg;
    }
    this.length = this.toString().length;
  }

  /**
   * Check if the long option is of valid format.
   * Valid format is `--` concatenated with one or more letters.
   * @param long long option name
   */
  public static isLong(long: string) {
    return /^--\w+$/.test(long);
  }

  /**
   * Check if an option's short name is of valid format.
   * Valid format is `-` concatenated with any single letter.
   * @param short short option name
   */
  public static isShort(short: string) {
    return /^-[A-Za-z]$/.test(short);
  }

  /**
   * Check if the option is composed of multiple short options.
   * E.g. `-abc` is equivalent to `-a -b -c`.
   * @param shortOpts short option composite name
   */
  public static isCompositeShort(shortOpts: string) {
    return /^-[A-Za-z]+$/.test(shortOpts);
  }

  /**
   * Check if the `value` looks like an option or not.
   */
  public static isOption(value: string) {
    return Option.isShort(value) || Option.isLong(value);
  }

  /**
   * Sets `enabled` to `true`.
   */
  public enable() {
    if (this.mutexGroup) {
      if (this.mutexGroup.enable(this)) this._enabled = true;
      return;
    }
    this._enabled = true;
  }

  public setMutexGroup(mutexGroup: MutexOptionsGroup) {
    this._mutexGroup = mutexGroup;
  }

  public toString(includeArg = true) {
    const options = [];
    if (this.short) options.push(this.short);
    if (this.long) options.push(this.long);
    return options.join(", ") + (this.arg && includeArg ? " " + this.arg : "");
  }
}
