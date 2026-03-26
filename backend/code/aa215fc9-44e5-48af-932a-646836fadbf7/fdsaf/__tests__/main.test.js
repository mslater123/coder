"use strict";

import hello, { hello as namedHello } from "../main.js"

describe("hello function", () => {
  let consoleOutput = []
  const mockedLog = (output) => consoleOutput.push(output)

  beforeEach(() => {
    consoleOutput = []
    jest.spyOn(console, "log").mockImplementation(mockedLog)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test("default export prints default message", () => {
    hello()
    expect(consoleOutput).toEqual(["Hello, World!"])
  })

  test("named export prints custom message", () => {
    namedHello("Custom")
    expect(consoleOutput).toEqual(["Custom"])
  })

  test("throws TypeError for non‑string input", () => {
    expect(() => hello(123)).toThrow(TypeError)
  })
})