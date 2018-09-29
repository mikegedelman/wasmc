import { takeWhile } from './utility';

// The following two lists are strings that should always get their own token.
const TOKENIZE_CHARS = ['(', ')', '[', ']', '{', '}', '<', '>', '=',
                        '*', '+', '-', '/', ';', ',', '&', '|', '^',
                        '!'];
const TOKENIZE_DOUBLE_CHARS = ['==', '!=', '<=', '>=', '||', '&&', '>>', '<<'];

class Token {
    constructor(public val: string, public line: number, public isStringLiteral?: boolean) {}
}

function isWhitespace(ch: string): boolean {
    return ch === ' ' || ch === '\t';
}

function isWord(ch: string): boolean {
    return ch >= 'a' && ch <= 'z' || 
        ch >= 'A' && ch <= 'Z' ||
        ch >= '0' && ch <= '9' ||
        /[-_]/.test(ch);
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
        const next = chars[idx + 1];

        // Whitespace
        if (isWhitespace(ch)) {
            const matching = charsToString(takeWhile(chars.slice(idx), isWhitespace));
            idx += matching.length;

        // Inline comment
        } else if (ch === '/' && next === '*') {
            const matching = charsToString(takeWhile(chars.slice(idx + 2), (cur, arr, idx) => {
                return cur !== '*' && arr[idx + 1] !== '/'
            }));
            idx += matching.length + 4;
            line += (matching.match(/\n/) || []).length;

        // One-line comment
        } else if (ch === '/' && next === '/') {
            const matching = charsToString(takeWhile(chars.slice(idx + 2), c => c !== '\n' && c !== '\r'));
            idx += matching.length + 3;
            line += (matching.match(/\n/) || []).length;

        // Tokenize individual chars
        } else if (TOKENIZE_CHARS.includes(ch)) {
            const doubleChar = ch + next;
            if (TOKENIZE_DOUBLE_CHARS.includes(doubleChar)) {
                ret.push(new Token(doubleChar, line));
                idx += 2;
            } else {
                ret.push(new Token(ch, line));
                idx++;
            }

        // Tokenize a string constant
        } else if (ch == '"') {
            ret.push(new Token('"', line));
            const cs = takeWhile(chars.slice(idx + 1), c => c !== '"');
            const matching = charsToString(cs);
            if (matching.indexOf('\n') > -1) { throw new Error("Unexpected line break in string constant"); }

            ret.push(new Token(matching, line, true));
            ret.push(new Token('"', line));
            idx += matching.length + 2;

        // Word
        } else if (isWord(ch)) {
            const matching = charsToString(takeWhile(chars.slice(idx), isWord));
            ret.push(new Token(matching, line));
            idx += matching.length;

        // Count line breaks
        } else if (ch === '\n' || ch === '\r') {
            line++;
            idx++;

        } else {
            throw new Error(`Encountered an illegal character: ${ch}`);
        }
    }

    return ret;
}

export { lex, Token };
