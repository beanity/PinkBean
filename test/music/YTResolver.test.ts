import { expect } from "chai";
import { YtResolver, PAGE_TOKENS } from "../../src/youtube";

describe("calculatePageTokens", () => {
  it("returns correct data when total is 0", () => {
    let params = YtResolver.calculatePageTokens();
    expect(params).to.have.lengthOf(0);
    params = YtResolver.calculatePageTokens(0, 1);
    expect(params).to.have.lengthOf(0);
  });
  it("returns correct data when index is out of range", () => {
    let params = YtResolver.calculatePageTokens(1, 5000);
    expect(params).to.have.lengthOf(0);
    params = YtResolver.calculatePageTokens(1, 5001);
    expect(params).to.have.lengthOf(0);
  });
  it("returns correct data when total is not 0 and index is within range", () => {
    let params = YtResolver.calculatePageTokens(1);
    expect(params).to.have.deep.equal([
      { startToken: PAGE_TOKENS[0], size: 1 },
    ]);
    params = YtResolver.calculatePageTokens(50);
    expect(params).to.have.deep.equal([
      { startToken: PAGE_TOKENS[0], size: 50 },
    ]);
    params = YtResolver.calculatePageTokens(60, 3);
    expect(params).to.have.deep.equal([
      { startToken: PAGE_TOKENS[3], size: 50 },
      { startToken: PAGE_TOKENS[53], size: 10 },
    ]);
    params = YtResolver.calculatePageTokens(25, 4999);
    expect(params).to.have.deep.equal([
      { startToken: PAGE_TOKENS[4999], size: 25 },
    ]);
  });
});
