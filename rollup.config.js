const commonjs = require('@rollup/plugin-commonjs');
const resolve = require('@rollup/plugin-node-resolve');
const typescript = require('@rollup/plugin-typescript');
const dts = require('rollup-plugin-dts');

const packageJson = require('./package.json');

module.exports = [
    {
        input: 'src/index.ts',
        output: [
            {
                file: packageJson.main,
                format: 'cjs',
            },
            {
                file: packageJson.module,
                format: 'esm',
            },
        ],
        external: ['axios', 'moment'],
        plugins: [
            resolve({
                browser: true,
                preferBuiltins: false,
            }),
            commonjs(),
            typescript(),
        ],
    },
    {
        input: 'dist/esm/types/index.d.ts',
        output: [{ file: 'dist/index.d.ts', format: 'es' }],
        external: [/\.(css|less|scss)$/],
        plugins: [dts.default()],
    },
];
