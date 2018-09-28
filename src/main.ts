declare const WebAssembly: any;

import { readFileSync, writeFileSync } from 'fs';
import { exec } from 'child_process';
import { TextDecoder } from 'util';

import { lex } from './lex';
import { parse } from './parse';
import { buildAST } from './ast';
import { WasmCompiler } from './wasm';
import { takeWhile } from './utility';


const WAST_FILENAME = 'a.out.wast';
const WASM_FILENAME = 'a.out.wasm';


function wast2wasm() {
    return new Promise((resolve, reject) => {
        exec(`wast2wasm ${WAST_FILENAME} -o ${WASM_FILENAME}`, (err, stdout, stderr) => {
            if (err) { reject(err); }
            console.log(stdout);
            console.error(stderr);

            resolve();
        });
    });
}

const memory = new WebAssembly.Memory({ initial: 256 });

function consoleLogString(offset: number) {
    const bytes = new Uint8Array(memory.buffer, offset);
    const strBytes = new Uint8Array(<any>takeWhile(bytes, b => b !== 0));
    var string = new TextDecoder('utf8').decode(strBytes);
    console.log(string);
}


function runWasm(buf: any) {
    WebAssembly.compile(buf).then(module =>
        new WebAssembly.Instance(module, {
            env: {
              memory,
              log: consoleLogString,

              // table: new WebAssembly.Table({
              //   initial: 0,
              //   element: "anyfunc",
              // }),
            },
          }))
    .then(instance => {
        return instance.exports.main();
    })
    // .then(console.log, console.error);
}

function main() {
    const prog = `
        (function int addOne (int x)
           (set x (+ x 1))
           (return x)
        )

         (function int addTwo (int x)
           (var int y)
           (set y (+ x 1))
           (set y (+ y 1))
           (return y)
        )

        (function int main ()
            (log "Hello world")
            (return 0)
        )
    `;

    const wastHeader = '(module\n'
        + '  (import "env" "log" (func $log (param i32)))\n'
        + '  (import "env" "memory" (memory 1))\n\n';

    const toks = lex(prog);
    // console.log(toks);
    const parseIr = parse(toks);
    // console.log(JSON.stringify(parseIr, null, 2));
    const ast = buildAST(parseIr);
    // console.log(JSON.stringify(ast, null, 2));
    const compiler = new WasmCompiler(ast);
    compiler.compile();
    const wast = compiler.serialize();
    writeFileSync(WAST_FILENAME, wastHeader + wast + ')');

    wast2wasm().then(() => {
        const buf = readFileSync(WASM_FILENAME);
        runWasm(buf);
    });
}

main();
