const RESERVED_WORDS = ['define', 'function', 'var', 'set', 'if', 'int', 'float',
                        'string', 'void', 'return', '=', '>=', '<=', '<', '>'];
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

function takeWhile(arr: any[], pred: Function): any[] {
    let idx = 0;
    while (pred(arr[idx])) {
        idx++;
    }
    return arr.slice(0, idx);
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
        } else if (isWord(ch)) {
            const matching = charsToString(takeWhile(chars.slice(idx), isWord));

            if (RESERVED_WORDS.indexOf(matching) === -1) {
                ret.push(new Token(matching, line, IDENT));
            } else {
                ret.push(new Token(matching, line));
            }
            idx += matching.length;

        } else if (ch === '\0') {
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
