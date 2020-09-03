import { expect } from "chai";
import { Argument, ArgumentSpecs } from "../../../src/command/base/Argument";

describe("Argument", () => {
  const name = "argName";
  describe("#new()", () => {
    it("should not be indexable or rangeable when preset is not empty", () => {
      const specs: ArgumentSpecs = {
        name: name,
        preset: ["foo"],
        rangeable: true,
      };
      const arg = new Argument(specs);
      expect(arg.preset).to.deep.equal(specs.preset);
      expect(arg.indexable).to.equal(false);
      expect(arg.rangeable).to.equal(false);
    });
    it("should be indexable when it is also rangeable", () => {
      const arg = new Argument({ name: name, rangeable: true });
      expect(arg.preset).to.be.empty;
      expect(arg.indexable).to.equal(true);
      expect(arg.rangeable).to.equal(true);
    });
    it("should have correct flags when indexable", () => {
      const arg = new Argument({ name: name, indexable: true });
      expect(arg.preset).to.be.empty;
      expect(arg.indexable).to.equal(true);
      expect(arg.rangeable).to.equal(false);
    });
  });

  describe("#add()", () => {
    it("should add inputs correctly when variadic", () => {
      const arg = new Argument({ name: name, variadic: true });
      arg.add("foo");
      arg.add("");
      arg.add("bar");
      arg.add(" ");
      arg.add("baz");
      expect(arg.inputs).to.deep.equal(["foo", "bar", "baz"]);
    });
    it("should add input correctly when not variadic", () => {
      const arg = new Argument({ name: name });
      arg.add("");
      expect(arg.inputs).to.be.empty;
      arg.add(" ");
      expect(arg.inputs).to.be.empty;
      arg.add("foo");
      expect(arg.inputs).to.deep.equal(["foo"]);
      arg.add("bar");
      expect(arg.inputs).to.deep.equal(["foo"]);
    });
  });

  describe("#parse()", () => {
    let arg: Argument;
    let argv: Argument;
    describe("when preset is not empty", () => {
      beforeEach(() => {
        const specs: ArgumentSpecs = {
          name: name,
          preset: ["foo", "bar", "baz"],
        };
        arg = new Argument(specs);
        specs.variadic = true;
        argv = new Argument(specs);
      });
      it("returns correct result when input is a subset of preset", () => {
        for (const input of ["foo", "bar", "bar"]) {
          arg.add(input);
          argv.add(input);
        }
        expect(arg.parse()).to.deep.equal({
          nums: [],
          values: ["foo"],
          value: "foo",
        });
        expect(argv.parse()).to.deep.equal({
          values: ["foo", "bar", "bar"],
          value: "foo",
          nums: [],
        });
      });
      it("returns error when input is not contained in preset", () => {
        for (const input of ["f00", "b@r", "bazz"]) {
          arg.add(input);
          argv.add(input);
        }
        expect(arg.parse()).to.have.own.property("errorMsg").to.be.not.empty;
        expect(argv.parse()).to.have.own.property("errorMsg").to.be.not.empty;
      });
    });
    describe("when indexable only", () => {
      beforeEach(() => {
        const specs: ArgumentSpecs = {
          name: name,
          indexable: true,
        };
        arg = new Argument(specs);
        specs.variadic = true;
        argv = new Argument(specs);
      });
      it("returns correct response when index is valid", () => {
        for (const input of ["1", "12"]) {
          arg.add(input);
          argv.add(input);
        }
        expect(arg.parse()).to.deep.equal({
          nums: [0],
          num: 0,
          values: [],
        });
        expect(argv.parse()).to.deep.equal({
          nums: [0, 11],
          num: 0,
          values: [],
        });
      });
      it("returns error when index is not an integer", () => {
        arg.inputs[0] = "3.14";
        expect(arg.parse()).to.have.own.property("errorMsg").to.be.not.empty;
      });
      it("returns error when index is not a number", () => {
        arg.inputs[0] = "foo";
        expect(arg.parse()).to.have.own.property("errorMsg").to.be.not.empty;
        arg.inputs[0] = "";
        expect(arg.parse()).to.have.own.property("errorMsg").to.be.not.empty;
      });
      it("returns error when index is out of range", () => {
        arg.inputs[0] = "0";
        expect(arg.parse()).to.have.own.property("errorMsg").to.be.not.empty;
        arg.inputs[0] = "-1";
        expect(arg.parse()).to.have.own.property("errorMsg").to.be.not.empty;
      });
    });
    describe("when naturalable only", () => {
      beforeEach(() => {
        const specs: ArgumentSpecs = {
          name: name,
          naturalable: true,
        };
        arg = new Argument(specs);
        specs.variadic = true;
        argv = new Argument(specs);
      });
      it("returns correct response when number is valid", () => {
        for (const input of ["0", "1", "10"]) {
          arg.add(input);
          argv.add(input);
        }
        expect(arg.parse()).to.deep.equal({
          nums: [0],
          num: 0,
          values: [],
        });
        expect(argv.parse()).to.deep.equal({
          nums: [0, 1, 10],
          num: 0,
          values: [],
        });
      });
      it("returns error when number is not an integer", () => {
        arg.inputs[0] = "3.14";
        expect(arg.parse()).to.have.own.property("errorMsg").to.be.not.empty;
      });
      it("returns error when index is not a valid number", () => {
        arg.inputs[0] = "-0";
        expect(arg.parse()).to.have.own.property("errorMsg").to.be.not.empty;
        arg.inputs[0] = "foo";
        expect(arg.parse()).to.have.own.property("errorMsg").to.be.not.empty;
        arg.inputs[0] = "";
        expect(arg.parse()).to.have.own.property("errorMsg").to.be.not.empty;
        arg.inputs[0] = "NaN";
        expect(arg.parse()).to.have.own.property("errorMsg").to.be.not.empty;
        arg.inputs[0] = "Infinity";
        expect(arg.parse()).to.have.own.property("errorMsg").to.be.not.empty;
      });
      it("returns error when number is out of range", () => {
        arg.inputs[0] = "-1";
        expect(arg.parse()).to.have.own.property("errorMsg").to.be.not.empty;
      });
    });
    describe("when rangeable only", () => {
      beforeEach(() => {
        const specs: ArgumentSpecs = {
          name: name,
          rangeable: true,
        };
        arg = new Argument(specs);
        specs.variadic = true;
        argv = new Argument(specs);
      });
      it("returns correct response when range is valid", () => {
        arg.inputs[0] = "1..11";
        expect(arg.parse()).to.deep.equal({
          range: {
            start: 0,
            end: 10,
            startFromBegin: true,
            endAtFinal: false,
          },
          nums: [],
          values: [],
        });
        arg.inputs[0] = "11..1";
        expect(arg.parse()).to.deep.equal({
          range: {
            start: 0,
            end: 10,
            startFromBegin: true,
            endAtFinal: false,
          },
          nums: [],
          values: [],
        });
        arg.inputs[0] = "..11";
        expect(arg.parse()).to.deep.equal({
          range: {
            start: 0,
            end: 10,
            startFromBegin: true,
            endAtFinal: false,
          },
          nums: [],
          values: [],
        });
        arg.inputs[0] = "2..";
        expect(arg.parse()).to.deep.equal({
          range: {
            start: 1,
            end: Infinity,
            startFromBegin: false,
            endAtFinal: true,
          },
          nums: [],
          values: [],
        });
        arg.inputs[0] = "..";
        expect(arg.parse()).to.deep.equal({
          range: {
            start: 0,
            end: Infinity,
            startFromBegin: true,
            endAtFinal: true,
          },
          nums: [],
          values: [],
        });
        argv.add("4..2");
        argv.add("x..y");
        expect(argv.parse()).to.deep.equal({
          range: {
            start: 1,
            end: 3,
            startFromBegin: false,
            endAtFinal: false,
          },
          nums: [],
          values: [],
        });
      });
      it("returns error when range is not valid", () => {
        arg.inputs[0] = "...";
        expect(arg.parse()).to.have.own.property("errorMsg").to.be.not.empty;
        arg.inputs[0] = "0x123";
        expect(arg.parse()).to.have.own.property("errorMsg").to.be.not.empty;
        arg.inputs[0] = "0..0";
        expect(arg.parse()).to.have.own.property("errorMsg").to.be.not.empty;
        arg.inputs[0] = "-1..0";
        expect(arg.parse()).to.have.own.property("errorMsg").to.be.not.empty;
        arg.inputs[0] = "..foo";
        expect(arg.parse()).to.have.own.property("errorMsg").to.be.not.empty;
      });
    });
    describe("when nothing is specified", () => {
      it("should accept any input", () => {
        const arg = new Argument({ name: name });
        const argv = new Argument({ name: name, variadic: true });
        for (const input of ["foo", "bar", "0", "-1..inf", "..."]) {
          arg.add(input);
          argv.add(input);
        }
        expect(arg.parse()).to.deep.equal({
          values: ["foo"],
          value: "foo",
          nums: [],
        });
        expect(argv.parse()).to.deep.equal({
          values: ["foo", "bar", "0", "-1..inf", "..."],
          value: "foo",
          nums: [],
        });
      });
    });
  });
});
