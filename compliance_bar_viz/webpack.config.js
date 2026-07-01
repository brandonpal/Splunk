const path = require('path');
const webpack = require('webpack');
const webpackMerge = require('webpack-merge');
const createDashboardConfig = require('@splunk/webpack-configs/dashboard.config').create;

// @splunk/dashboard-extension-webpack-plugin (the officially documented way to
// convert the emitted `define(...)` into a self-executing `require(...)`) relies
// on an old webpack-sources internal shape (`ConcatSource.children`) that no
// longer exists on the webpack-sources version resolved here, and throws
// during asset rendering. Drop it and use an equivalent, version-safe
// processAssets replacement that does the same `define` -> `require` rewrite.
const baseConfig = createDashboardConfig();
baseConfig.plugins = (baseConfig.plugins || []).filter(
    (plugin) => plugin.constructor.name !== 'DashboardExtensionWebpackPlugin'
);

class AmdSelfExecutePlugin {
    apply(compiler) {
        compiler.hooks.compilation.tap('AmdSelfExecutePlugin', (compilation) => {
            compilation.hooks.processAssets.tap(
                {
                    name: 'AmdSelfExecutePlugin',
                    stage: webpack.Compilation.PROCESS_ASSETS_STAGE_REPORT,
                },
                (assets) => {
                    Object.keys(assets).forEach((name) => {
                        if (!name.endsWith('.js')) return;
                        const content = compilation.getAsset(name).source.source();
                        if (typeof content === 'string' && content.startsWith('define(')) {
                            compilation.updateAsset(
                                name,
                                new webpack.sources.RawSource(`require(${content.slice('define('.length)}`)
                            );
                        }
                    });
                }
            );
        });
    }
}

module.exports = webpackMerge.merge(baseConfig, {
    entry: {
        visualization: './src/visualization.jsx',
    },
    externals: {
        react: 'react',
    },
    output: {
        path: path.resolve(__dirname, 'appserver/static/visualizations/compliance_bar'),
        filename: '[name].js',
    },
    plugins: [new AmdSelfExecutePlugin()],
});
