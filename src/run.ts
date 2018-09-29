declare const WebAssembly: any;

import { TextDecoder } from 'util';
import { stdout, stderr, exit } from 'process';
import { readFileSync } from 'fs';

import { argv } from 'yargs';

import { takeWhile } from './utility';

const memory = new WebAssembly.Memory({ initial: 256 });

/* The following two functions are imported into the WebAssembly environment
   for convenient logging. They eventually will be replaced with printf, etc */
function logString(offset: number) {
    const bytes = new Uint8Array(memory.buffer, offset);
    const strBytes = new Uint8Array(<any>takeWhile(bytes, b => b !== 0));
    var string = new TextDecoder('utf8').decode(strBytes);
    stdout.write(string);
}

function logInt(n: number) {
    console.log(n);
}

function runWasmc(buf: any) {
    WebAssembly.compile(buf).then(module =>
        new WebAssembly.Instance(module, {
            env: {
              memory,
              log: logString,
              logInt: logInt,
            },
          }))
    .then(instance => {
        return instance.exports.main();
    })
    .then(res => {
        exit(res);
    }, console.error)
}

export { runWasmc };

if (require.main === module) {
    const wasm = argv._[0];
    if (!wasm) { console.error('Need a wasm file to run!'); }
    runWasmc(readFileSync(argv._[0]));
}