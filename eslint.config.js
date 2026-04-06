// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}", "utils/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "ImportSpecifier[imported.name='useApp']",
          message:
            "useApp() has been removed. Prefer useAuth(), useRequests(), useNotifications(), useNotices(), useMessaging(), or useAppDomain().",
        },
        {
          selector: "CallExpression[callee.name='useApp']",
          message:
            "useApp() has been removed. Prefer the narrower hooks instead.",
        },
      ],
    },
  },
]);
