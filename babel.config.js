module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      // Enable CommonJS transformation for better bundling
      [
        "@babel/plugin-transform-modules-commonjs",
        {
          allowTopLevelThis: true,
          strictMode: false,
        },
      ],
      // Keep react-native-reanimated plugin last
      "react-native-reanimated/plugin",
    ],
    env: {
      production: {
        plugins: [
          // Additional optimizations for production builds
          ["transform-remove-console", { exclude: ["error", "warn"] }],
        ],
      },
    },
  };
};
