const fs = require('node:fs');
const path = require('node:path');
const { rspack, DefinePlugin } = require('@rspack/core');
const { modulePattern } = require('./proposed-fix-loader.cjs');

const compiler = rspack([false, true].map((fixed) => ({
  name: fixed ? 'proposed-fix' : 'original',
  mode: 'development',
  target: 'web',
  context: __dirname,
  entry: './main.js',
  output: {
    path: path.join(__dirname, 'dist'),
    filename: fixed ? 'fixed/bundle.js' : 'bundle.js',
  },
  module: {
    rules: fixed ? [{
      test: modulePattern,
      use: require.resolve('./proposed-fix-loader.cjs'),
    }] : [],
  },
  plugins: [new DefinePlugin({ __PROPOSED_FIX__: JSON.stringify(fixed) })],
  resolve: { conditionNames: ['visgl:webgl-only', '...'] },
  experiments: { topLevelAwait: true },
})));

compiler.run((error, stats) => {
  if (error) {
    console.error(error);
    process.exitCode = 1;
  } else {
    console.log(stats.toString({ all: false, errors: true, warnings: true, timings: true }));
    if (stats.hasErrors()) process.exitCode = 1;
  }
  compiler.close((closeError) => {
    if (closeError) {
      console.error(closeError);
      process.exitCode = 1;
    }
    if (!process.exitCode) {
      const template = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
      for (const fixed of [false, true]) {
        const directory = path.join(__dirname, 'dist', fixed ? 'fixed' : '');
        fs.mkdirSync(directory, { recursive: true });
        fs.writeFileSync(
          path.join(directory, 'index.html'),
          template.replaceAll('__DEMO_ROOT__', fixed ? '../' : './')
        );
      }
    }
  });
});
