const expoPreset = require("jest-expo/jest-preset");

module.exports = {
  ...expoPreset,
  testMatch: [
    "<rootDir>/tests/steps/**/*.steps.tsx",
    "<rootDir>/tests/unit/**/*.test.ts",
    "<rootDir>/tests/unit/**/*.test.tsx",
  ],
  setupFiles: expoPreset.setupFiles,
  moduleNameMapper: {
    "^@expo/vector-icons(.*)$": "<rootDir>/tests/__mocks__/@expo/vector-icons.js",
    "^@react-native-async-storage/async-storage$":
      "@react-native-async-storage/async-storage/jest/async-storage-mock",
    "^expo-router$": "<rootDir>/tests/__mocks__/expo-router.js",
    "^react-native-safe-area-context$": "<rootDir>/tests/__mocks__/react-native-safe-area-context.js",
    "^expo-crypto$": "<rootDir>/tests/__mocks__/expo-crypto.js",
  },
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
  transformIgnorePatterns: [
    "/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|@cucumber|jest-cucumber|uuid))",
  ],
};
