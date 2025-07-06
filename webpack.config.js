const path = require('path');

module.exports = {
  entry: './src/module.ts',
  mode: 'development',
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: 'module.js',
    path: path.resolve(__dirname, 'dist'),
    libraryTarget: 'amd',
  },
  externals: [
    '@grafana/data',
    '@grafana/runtime',
    '@grafana/ui',
    'react',
    'react-dom',
  ],
};
