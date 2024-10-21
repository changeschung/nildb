import { describe, expect, it } from "@jest/globals"

import { add } from "@nillion/api/add"

describe("api", () => {
  it("is alive", () => {
    expect(add()).toBe(42)
  })
})
