/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testMatch: [
    "**/__tests__/**/*.test.[jt]s?(x)",
    "**/?(*.)+(spec|test).[jt]s?(x)",
  ],
  testPathIgnorePatterns: [
    "/node_modules/",
    "/docs/archive/source-backups/",
    "/docs/archive/design/stitch-downloads/",
    "<rootDir>/lib/services/api/test.ts",
  ],
  modulePathIgnorePatterns: [
    "<rootDir>/docs/archive/source-backups/",
    "<rootDir>/docs/archive/design/stitch-downloads/",
  ],
  collectCoverageFrom: [
    "lib/**/*.{ts,tsx}",
    "components/**/*.{ts,tsx}",
    "app/**/*.{ts,tsx}",
    "!**/*.d.ts",
    "!**/node_modules/**",
    "!<rootDir>/lib/services/api/test.ts",
  ],
};
