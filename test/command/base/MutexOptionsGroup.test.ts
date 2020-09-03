import { expect } from "chai";
import { Option } from "../../../src/command/base/Option";
import {
  groupMutexOptions,
  MutexOptionsGroup,
} from "../../../src/command/base/MutexOptionsGroup";

describe("mutexOptions", () => {
  let foo: Option;
  let bar: Option;
  let baz: Option;
  let group: MutexOptionsGroup;
  beforeEach(() => {
    foo = new Option("-f --all", "");
    bar = new Option("--bar", "");
    baz = new Option("--baz", "");
    group = groupMutexOptions(foo, bar, baz);
  });
  it("should enable only one of its options", () => {
    foo.enable();
    bar.enable();
    baz.enable();
    expect(
      group.options
        .map((v) => Number(v.enabled))
        .reduce((acc, cur) => acc + cur)
    ).to.equal(1);
    expect(group.enabled).to.be.true;
    expect(group.enabledOption).to.deep.equal(foo);
    expect(foo.enabled).to.be.true;
    expect(bar.enabled).to.be.false;
    expect(baz.enabled).to.be.false;
  });
});
