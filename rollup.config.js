import svelte from 'rollup-plugin-svelte' 
import commonjs from '@rollup/plugin-commonjs' 
import resolve from '@rollup/plugin-node-resolve' 
import livereload from 'rollup-plugin-livereload' 
import { terser } from 'rollup-plugin-terser' 
import sveltePreprocess from 'svelte-preprocess'
import css from 'rollup-plugin-css-only'
import serve from 'rollup-plugin-serve-proxy'
import babel from "@rollup/plugin-babel"

const fs = require('fs')
const writeFileSync = fs.writeFileSync
const copyFileSync = fs.copyFileSync

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
    //The includable Modal raw source (vanilla js)
    {
        input: 'src/Modal.svelte',
        output: {
            sourcemap: true,
            file: 'dist/modal.js',
            name: "modal",
            format: 'umd'  //For browser and node
        },
        plugins: plugins("dist/", "", true),

        watch: {
            clearScreen: false
        }
    },
    //Test page for svelte
    {
        input: 'src/svelte-test.js',
        output: {
            sourcemap: true,
            file: './svelte-test.js',
            name: "modal",
            format: 'iife'
        },
        plugins: plugins("dist/", "", false),
    }
]

//Copy Svelte file to dist directory
copyFileSync("src/Modal.svelte", "dist/Modal.svelte")