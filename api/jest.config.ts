import "dotenv/config"

import { type JestConfigWithTsJest } from "ts-jest"

const config: JestConfigWithTsJest = {
  preset: "ts-jest/presets/default-esm",
  moduleNameMapper: {
    "^@nillion/api/(.*)$": "<rootDir>/src/$1",
  },
}

export default config
