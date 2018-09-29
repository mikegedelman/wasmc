import { takeWhile } from './utility';

const RESERVED_WORDS = ['define', 'function', 'var', 'set', 'if', 'else', 'int', 'float',
                        'while', 'string', 'void', 'return'];
const IDENT = '__IDENT__';

class Token {
    val: string
    line: number
    type: string

    constructor(val: string, line: number, type?: string) {
        this.val = val;
        this.line = line;

        if (type) {
            this.type = type;
        } else {
            this.type = val;
        }
    }
}


function isWhitespace(ch: string): boolean {
    return ch === ' ' || ch === '\t';
}

function isWord(ch: string): boolean {
    return ch >= 'a' && ch <= 'z' || 
        ch >= 'A' && ch <= 'Z' ||
        ch >= '0' && ch <= '9' ||
        /[~!@#$%^&*-_+=?\"']/.test(ch);
}

function charsToString(arr: string[]): string {
    return arr.reduce((a, b) => a + b);
}

function lex(raw: string): Token[] {
    const chars = raw.split('');
    const ret: Token[] = [];
    let idx = 0;
    let line = 1;

    while (idx < chars.length) {
        const ch = chars[idx];

        if (isWhitespace(ch)) {
            const matching = charsToString(takeWhile(chars.slice(idx), isWhitespace));
            idx += matching.length;
        } else if (ch === '(' || ch === ')') {
            ret.push(new Token(ch, line));
            idx++;
        } else if (ch == '"') {
            ret.push(new Token('"', line));
            const cs = takeWhile(chars.slice(idx + 1), c => c !== '"');
            const matching = charsToString(cs);
            if (matching.indexOf('\n') > -1) { throw new Error("Unexpected line break in string constant"); }

            ret.push(new Token(matching, line, '__string_constant__'));
            ret.push(new Token('"', line));
            idx += matching.length + 2;
        } else if (isWord(ch)) {
            const matching = charsToString(takeWhile(chars.slice(idx), isWord));

            if (RESERVED_WORDS.indexOf(matching) === -1) {
                ret.push(new Token(matching, line, IDENT));
            } else {
                ret.push(new Token(matching, line));
            }
            idx += matching.length;

        } else if (ch === '\0') { // TODO I don't think null char is EOF
            return ret;
        } else if (ch === '\n' || ch === '\r') {
            line++;
            idx++;
        } else {
            throw new Error('Encountered an illegal character');
        }
    }

    return ret;
}

export { lex, Token, IDENT, RESERVED_WORDS };
