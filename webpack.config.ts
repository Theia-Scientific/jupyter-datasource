// webpack.config.ts
import type { Configuration } from 'webpack';
import { merge } from 'webpack-merge';
import grafanaConfig from './.config/webpack/webpack.config';

const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

const config = async (env: Record<string, string | boolean>): Promise<Configuration> => {
  const baseConfig = await grafanaConfig(env);

  return merge(baseConfig, {
    output: {
      asyncChunks: true,
    },
    plugins: [],
    resolve: {
      plugins: [new TsconfigPathsPlugin()],
    },
  });
};

export default config;
