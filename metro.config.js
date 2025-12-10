const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.transformer = {
  ...config.transformer,
  minifierConfig: {
    compress: {
      drop_console: true,
    },
  },
};

config.resolver = {
  ...config.resolver,
  unstable_enablePackageExports: true,
};

module.exports = config;
