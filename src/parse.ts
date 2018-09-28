/**
program := (<global-def> | <function-def>)*

global-def := define <type> <ident> <ident>

function-def := function <type> <ident> <param-list> <statement>*

param-list := (<type> <ident>)*

statement := var <declare-local-var>
           | set <set-local-var>
           | if <cond-expr> <statement>* (else <statment>*)?
           | while <cond-expr> <statement>*
           | return <expr>
           | <function-call>

declare-local-var := <type> <ident> <expr>?

set-local-var := <ident> <expr>

function-call := <ident> <expr>*

expr := <ident> | <function-call> | <string-const>

cond-expr :=  = <expr> <expr>
           |  > <expr> <expr>
           |  < <expr> <expr>
           | >= <expr> <expr>
           | <= <expr> <expr>

type := int
      | float
      | string
      | void

Examples:

(define float y 0.5)

(function int main (arc argv)
    (var int x 5)
    (set x 7)
    (printf x)
    (if (= x 5)
      (printf 'yes')
      (++ x)
     else
       (printf 'no'))
    (puts 'Hello world')
    (return 0))

*/
import { Token, IDENT, RESERVED_WORDS } from './lex';


class Parser {
    prog: Token[]
    cur: any

    constructor(prog: Token[]) {
        this.prog = prog;
    }

    next() {
        this.cur = this.prog.shift();
    }

    error(msg) { throw new Error(msg); }

    expect(s): any {
        const val = this.accept(s);
        if (val) {
            return val;
        }

        const expected = s === '__IDENT__' ? 'identifier' : s;
        this.error(`Expected ${expected}, found ${JSON.stringify(this.cur)}`);
    }

    accept(s): any {
        const cur = this.cur;
        if (!cur) {
            this.error(`No more tokens, expecting ${s}`);
        }

        if (cur.type === s) {
            this.next();
            return cur.val;
        }

        return false;
    }

    functionCall() {
        const ret: any = { name: 'FunctionCall' };
        ret.ident = this.expect(IDENT);
        ret.args = [];

        while (!this.accept(')')) {
            ret.args.push(this.expr());
        }

        return ret;
    }

    expr() {
        if (this.accept('(')) {
            return this.functionCall();
        } else if (this.accept('"')) {
            const str = this.expect('__string_constant__');
            const ret = { name: 'StringConstant', val: str };
            this.expect('"');
            return ret;
        }

        return this.expect(IDENT);
    }

    type() {
        const types = ['int', 'float', 'void'];

        if (types.indexOf(this.cur.val) === -1) {
            this.error(`Expected a type, found ${JSON.stringify(this.cur)}`);
        }

        const ret = this.cur.val;
        this.next();
        return ret;
    }

    globalDefinition() {
        const ret: any = { name: 'GlobalDefinition' };
        ret.type = this.type();
        ret.ident = this.expect(IDENT);
        ret.expr = this.expr();
        this.expect(')');
        return ret;
    }

    statement() {
        const ret: any = {};

        if (this.accept('var')) {
            ret.name = 'DeclareLocalVar';
            ret.type = this.type();
            ret.ident = this.expect(IDENT);

            if (this.cur.val !== ')') {
                ret.expr = this.expr();
            }
            this.expect(')');
            return ret;
        } else if (this.accept('set')) {
            ret.name = 'SetLocalVar';
            ret.ident = this.expect(IDENT);
            ret.expr = this.expr();
            this.expect(')');
            return ret;
        } else if (this.accept('return')) {
            ret.name = 'ReturnStatement';
            ret.expr = this.expr();
            this.expect(')');
        // } else if this.accept('if')) {
        } else {
            return this.functionCall();
        }

        return ret;
    }

    functionDefinition() {
        const ret: any = { name: 'FunctionDefinition' };
        ret.type = this.type();
        ret.ident = this.expect(IDENT);
        ret.params = [];
        ret.body = [];

        this.expect('(');

        while (this.cur.val !== ')') {
            const param: any = {};
            param.type = this.type();
            param.ident = this.expect(IDENT);
            ret.params.push(param);
        }
        this.expect(')');

        while (this.cur.val !== ')') {
            this.expect('(');
            const stmt = this.statement();
            ret.body.push(stmt);
        }
        this.expect(')');

        return ret;
    }

    /// Top-level statements can only be global variable defs or functions.
    parse() {
        const ret = [];
        this.next();

        while (this.prog.length && this.accept('(')) {
            if (this.accept('define')) {
                ret.push(this.globalDefinition());
            } else if (this.accept('function')) {
                ret.push(this.functionDefinition());
            } else {
                this.error(`Expected 'define' or 'function', got ${JSON.stringify(this.cur)}`);
            }
        }

        if (this.prog.length) {
            console.warn('Tokens were left over after parsing');
        }

        return ret;
    }
}

function parse(toks: Token[]): any {
    const parser = new Parser(toks);
    return parser.parse();
}

export { parse };