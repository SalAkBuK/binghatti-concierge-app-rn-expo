const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Optimize transformer with minification
config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve("react-native-svg-transformer"),
  minifierConfig: {
    mangle: true,
    output: {
      comments: false,
      ascii_only: true,
    },
  },
};

// Optimize resolver for faster file resolution
config.resolver = {
  ...config.resolver,
  assetExts: config.resolver.assetExts.filter((ext) => ext !== "svg"),
  sourceExts: [...config.resolver.sourceExts, "svg"],
  // Add platform-specific resolution for better caching
  platforms: ["ios", "android", "native", "web"],
};

module.exports = config;
