declare const WebAssembly: any;

import { lex } from './lex';
import { parse } from './parse';
import { AST } from './ast';
import { WasmCompiler } from './wasm';
import { readFileSync, writeFileSync } from 'fs';
import { exec } from 'child_process';

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

const memory = new WebAssembly.Memory({ initial: 256 })
function consoleLogString(offset: number, length: number) {
  var bytes = new Uint8Array(memory.buffer, offset, length);
  var string = new TextDecoder('utf8').decode(bytes);
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
    .then(console.log, console.error);
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
            (return (addTwo (addOne 77)))
        )
    `;

    const wastHeader = '(module\n'
        + '  (import "env" "log" (func $log (param i32 i32)))\n'
          '  (import "env" "memory" (memory 1))\n\n';

    const toks = lex(prog);
    const parseIr = parse(toks);
    // console.log(JSON.stringify(parseIr, null, 2));
    const ast = new AST(parseIr).values();
    console.log(JSON.stringify(ast, null, 2));
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
