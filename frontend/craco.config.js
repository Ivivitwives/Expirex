const path = require("path");

module.exports = {
  eslint: { /* your eslint config */ },
  webpack: {
    alias: { '@': path.resolve(__dirname, 'src') },
    configure: (webpackConfig) => {
      webpackConfig.watchOptions = {
        ...webpackConfig.watchOptions,
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/build/**',
          '**/dist/**',
          '**/coverage/**',
          '**/public/**',
        ],
      };

      // Force no-cache headers in dev server
      if (!webpackConfig.devServer) webpackConfig.devServer = {};
      webpackConfig.devServer.headers = {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
        'Surrogate-Control': 'no-store',
      };

      return webpackConfig;
    },
  },
};