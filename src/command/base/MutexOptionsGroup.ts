import { Option } from "./Option";

/**
 * Represents a group of mutually exclusive options.
 */
export class MutexOptionsGroup {
  private _enabled: boolean;
  private _enabledOption?: Option;
  private optionsSet: Set<Option>;

  get enabled() {
    return this._enabled;
  }

  get enabledOption() {
    return this._enabledOption;
  }

  get options() {
    return [...this.optionsSet];
  }

  constructor(...options: Option[]) {
    this._enabled = false;
    this.optionsSet = new Set();
    for (const option of options) {
      this.optionsSet.add(option);
      option.setMutexGroup(this);
    }
  }

  public enable(option: Option) {
    if (!this.enabled && this.optionsSet.has(option)) {
      this._enabled = true;
      this._enabledOption = option;
      return true;
    }
    return false;
  }
}

export function groupMutexOptions(...options: Option[]) {
  return new MutexOptionsGroup(...options);
}
