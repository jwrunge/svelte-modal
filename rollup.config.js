import svelte from 'rollup-plugin-svelte' 
import commonjs from '@rollup/plugin-commonjs' 
import resolve from '@rollup/plugin-node-resolve' 
import livereload from 'rollup-plugin-livereload' 
import { terser } from 'rollup-plugin-terser' 
import sveltePreprocess from 'svelte-preprocess'
import css from 'rollup-plugin-css-only'
import serve from 'rollup-plugin-serve-proxy'
import babel from "@rollup/plugin-babel"

const writeFileSync = require('fs').writeFileSync

const prod = !process.env.ROLLUP_WATCH
const babelSettings = {
    babelHelpers: 'runtime',
    extensions: [ '.js', '.mjs', '.html', '.svelte' ],
    plugins: ['@babel/plugin-external-helpers', '@babel/plugin-transform-runtime', '@babel/plugin-proposal-object-rest-spread']
}

function plugins(watchDir, loadDir, watch = false) {
    return [
        svelte({
            preprocess: sveltePreprocess(),
        }),

        css({
            output: (styles)=> {
                writeFileSync("dist/modalstyle.css", styles)
            },
        }),

        resolve({ 
            browser: true,
            dedupe: ['svelte']
        }),

        commonjs(),

        //In dev mode, call npm run start once the bundle is generated
        watch && !prod && serve({
            open: true,
            port: 8080,
            contentBase: loadDir
        }),

        //Watch root directory and refresh when not in production
        watch && !prod && livereload({
            watch: watchDir,
            verbose: false
        }),

        prod && babel(babelSettings),

        //If in production, run build instead of dev and minify
        prod && terser()
    ]
}

export default [
    {
        input: 'src/Modal.svelte',
        output: {
            sourcemap: true,
            file: 'dist/modal.js',
            name: "modal",
            format: 'iife'
        },
        plugins: plugins("dist/", "", true),

        watch: {
            clearScreen: false
        }
    }
]