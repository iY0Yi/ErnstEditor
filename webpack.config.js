const path = require('path');

module.exports = {
  mode: 'development',
  target: 'electron-renderer',
  entry: './src/renderer/index.tsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'renderer.js',
    globalObject: 'globalThis'
  },
  module: {
    rules: [
      {
        test: /\.(jsx?|tsx?)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader'
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.ttf$/,
        type: 'asset/resource'
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    alias: {
      // 既定の editor.main は TS/JSON/CSS/HTML の言語サービス（ワーカー込み）まで含む。
      // シェーダ編集には不要なので、言語を含まないエディタ本体だけを使う
      'monaco-editor$': path.resolve(__dirname, 'node_modules/monaco-editor/esm/vs/editor/edcore.main.js')
    },
    fallback: {
      "fs": false,
      "path": false
    }
  }
};