import { Option } from "./Option";

/**
 * Represents a group of mutually exclusive options.
 */
export class MutexOptionsGroup {
  private _enabledOption?: Option;
  private optionsSet: Set<Option>;

  get enabled() {
    return !!this._enabledOption;
  }

  get enabledOption() {
    return this._enabledOption;
  }

  get options() {
    return [...this.optionsSet];
  }

  constructor(...options: Option[]) {
    this.optionsSet = new Set();
    for (const option of options) {
      this.optionsSet.add(option);
      option.setMutexGroup(this);
    }
  }

  public static add(...options: Option[]) {
    return new MutexOptionsGroup(...options);
  }

  public enable(option: Option) {
    if (!this.enabled && this.optionsSet.has(option)) {
      this._enabledOption = option;
      return true;
    }
    return false;
  }
}
