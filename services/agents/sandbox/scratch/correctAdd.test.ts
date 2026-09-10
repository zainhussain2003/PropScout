import { add } from "./correctAdd";

describe("add", () => {
  it("returns 4 when adding 2 + 2", () => {
    expect(add(2, 2)).toBe(4);
  });

  it("returns 0 when adding -1 + 1", () => {
    expect(add(-1, 1)).toBe(0);
  });
});
