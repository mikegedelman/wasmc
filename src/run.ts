declare const WebAssembly: any;

import { TextDecoder } from 'util';
import { stdout, stderr } from 'process';

import { takeWhile } from './utility';


const memory = new WebAssembly.Memory({ initial: 256 });

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
        if (res !== 0) {
            console.error(`warning: main() returned nonzero value: ${res}`);
        }
    }, console.error)
}

export { runWasmc };