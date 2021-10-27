'use strict'

const path = require('path')
const webpack = require('webpack')
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin

const CompressionPlugin = require('compression-webpack-plugin')

var nodeExternals = require('webpack-node-externals')

var browser_config = {
  mode: 'development',
  target: 'web',
  entry: {
    '@teleop-xyz': './src/index.js'
  },
  devtool: 'eval-source-map',
  optimization: {
    minimize: true
  },
  output: {
    library: ['teleopxyz'],
    libraryTarget: 'var',
    path: path.join(__dirname, 'dist'),
    filename: 'teleopxyz.js'
  },
  resolve: {
    fallback: {
      "path": require.resolve("path-browserify"),
      /*"zlib": require.resolve("zlib-browserify"),
      "http": require.resolve("http-browserify"),
      "https": require.resolve("https-browserify"),
      "constants": require.resolve("constants-browserify")*/
    }
  },
  /*node: {
    fs: 'empty',
    net: 'empty',
    dns: 'empty',
  },*/
  plugins: [
    new CompressionPlugin(),
    /*new webpack.ProvidePlugin({
      process: 'process/browser',
    }),*/
    new webpack.DefinePlugin({
      'process.env.ENV': JSON.stringify('browser')
    })
   /* new webpack.DefinePlugin({
      'process.env.ENV': JSON.stringify('web')
    })*//*,
    new BundleAnalyzerPlugin()*/
  ]
}

module.exports = [
  browser_config, 
  //node_config
]
