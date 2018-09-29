import { readFileSync, writeFileSync, unlink } from 'fs';
import { exec } from 'child_process';
import { stdout, stderr } from 'process';

import { argv } from 'yargs';

import { lex } from './lex';
import { parse } from './parse';
import { compile } from './wasm';
import { takeWhile } from './utility';
import { runWasmc } from './run';


const WAST_FILENAME = 'a.out.wast';
const WASM_FILENAME = 'a.out.wasm';


function wast2wasm(wastName: string, wasmName: string, deleteWast: boolean): Promise<string> {
    // TODO find a way to run wast2wasm without subprocess
    return new Promise((resolve, reject) => {
        exec(`wast2wasm ${wastName} -o ${wasmName}`, (err, out, errOut) => {
            if (err) { reject(err); }
            if (out) { stdout.write(out); } ;
            if (errOut) { stdout.write(errOut); }

            if (deleteWast) {
                unlink(wastName, e => { if (e) console.error(e); });
            }
            resolve(wasmName);
        });
    });
}

/// Returns: promise with wasm filename
function compileWast(ast: any, _opts: { wastOnly?: boolean, outfile?: string, keepWast?: boolean }): Promise<string> {
    const opts = _opts || {};
    
    let wastOutfile = WAST_FILENAME;
    if (opts.wastOnly && opts.outfile) {
        wastOutfile = opts.outfile;
    }

    // TODO: don't hardcode this header
    const wastHeader = '(module\n'
        + '  (import "env" "log" (func $log (param i32)))\n'
        + '  (import "env" "logInt" (func $logInt (param i32)))\n'
        + '  (import "env" "memory" (memory 1))\n\n';
    const wast = compile(ast);

    writeFileSync(wastOutfile, wastHeader + wast + ')');
    if (opts.wastOnly) {
        return;
    }

    let wasmOutfile = WASM_FILENAME;
    if (opts.outfile) {
      wasmOutfile = opts.outfile;
    }
    return wast2wasm(wastOutfile, wasmOutfile, !opts.keepWast);
}

function main() {
    const filename = argv._[0];
    if (!filename) {
      console.log('Usage: compile.js [filename] <opts> (Filename is required)');
      return;
    }

    const prog = readFileSync(filename).toString();
    const toks = lex(prog);
    const ast = parse(toks);
    if (argv.d) { // d for debug
        console.log(JSON.stringify(ast, null, 2));
    }

    const compilePromise = compileWast(ast, { 
        wastOnly: argv.S,
        keepWast: argv.i,
        outfile: argv.o,
    });

    if (!argv.S) {
        compilePromise.then((wasmName) => {
            if (argv.r) {
                const buf = readFileSync(wasmName);
                runWasmc(buf);
            }
        });
    }
}

main();
