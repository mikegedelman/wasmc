import * as AST from './ast';
import { BASE_TYPES, BINARY_OPS, PREFIX_UNARY_OPS, POSTFIX_UNARY_OPS, ASSIGNMENT_OPS,
         Type, Types } from './types';

const VALID_IDENT_REGEX = /^([a-zA-Z_]+[a-zA-Z0-9_]*|[0-9]*)$/;
const FLOAT_REGEX = /^[0-9]+\.[0-9]+$/;
const INT_REGEX = /^[0-9]+$/;


let toks, cur, lastAccept;

function next() {
    cur = (toks.shift() || {}).val;
}

function peek(idx: number) {
    return (toks[idx] || {}).val;
}

function error(msg) { throw new Error(msg); }

function expect(s: string | string[] | RegExp): any {
    const val = accept(s);
    if (val) {
        return val;
    }

    error(`Expected ${s}, found ${JSON.stringify(cur)}`);
}

function accept(s: string | string[] | RegExp): any {
    if (!cur) {
        error(`No more tokens, expecting ${s}`);
    }

    let test = false;
    if (s instanceof RegExp) {
        test = s.test(cur);
    } else if (s instanceof Array) {
        test = s.includes(cur);
    } else {
        test = cur === s;
    }

    if (test) {
        lastAccept = cur;
        next();
        return lastAccept;
    }

    return false;
}

function expectIdent() { return expect(VALID_IDENT_REGEX); }
function acceptIdent() { return accept(VALID_IDENT_REGEX); }

function functionCall(ident): AST.FunctionCall {
    const args = [];

    if (cur !== ')') {
        do {
            args.push(expr());
        } while (accept(','));
    }
    expect(')');

    return new AST.FunctionCall({ ident, args });
}

function getIdent(ident: string): AST.Expr {
    if (INT_REGEX.test(ident)) {
        return new AST.ConstExpr(parseInt(ident), Types.Int);
    } else if (FLOAT_REGEX.test(ident)) {
        return new AST.ConstExpr(parseInt(ident), Types.Float);
    } else if (VALID_IDENT_REGEX.test(ident)) {
        return new AST.Variable(ident);
    } else {
        error(`Invalid identifier: ${ident}`);
    }
}

function binaryOp(left: AST.Expr): AST.BinaryOp {
    const op = expect(BINARY_OPS);
    const right = expr();
    return new AST.BinaryOp(left, right, op);
}

function declareVar() {
    let varType = type();
    const ident = expectIdent();

    // TODO support some kind of expressions here
    while (accept('[')) {
        const arrSzIdent = getIdent(expectIdent());
        let sz;
        if (arrSzIdent instanceof AST.ConstExpr) {
            if (!arrSzIdent.type.equals(Types.Int)) {
                error(`Array size expression must be an integer (for array: ${ident}`);
            }
            sz = arrSzIdent.val;
        } else {console.log(arrSzIdent);
            error(`Only literal integers currently supported for array sizes (for array ${ident}`);

        }

        varType = new Types.Array(varType, sz);
        expect(']');
    }

    let varExpr;
    if (accept('=')) {
        varExpr = expr();
    }
    const ret = new AST.DeclareVar({ type: varType, ident, expr: varExpr });
    expect(';');
    return ret;
}

// TODO fix operator precedence
function expr(): AST.Expr {
    if (accept('"')) {
        const val = cur;
        next();
        expect('"');
        return new AST.StringConstant(val);
    }

    let ret;

    if (accept('(')) {
        ret = expr();
        expect(')');
    } else if (accept(PREFIX_UNARY_OPS)) {
        const op = lastAccept;
        return new AST.UnaryOp(expr(), op);
    } else {
        const ident = expectIdent();

        if (accept('(')) {    
            ret = functionCall(ident);
        } else if (accept('[')) {
            const offset = expr();
            expect(']');
            ret = new AST.ArrayOffset(getIdent(ident), offset);
        } else if (accept(POSTFIX_UNARY_OPS)) {
            const op = lastAccept;
            ret = new AST.UnaryOp(new AST.Variable(ident), op, true);
        } else if (BINARY_OPS.includes(cur)) {
            ret = binaryOp(getIdent(ident));
        } else {
            ret = getIdent(ident);
        }
    }

    // Look for a binary op to see if we need to continue this expression
    if (accept(BINARY_OPS)) {
        const lval = ret;
        const op = lastAccept;
        const rval = expr();

        ret = new AST.BinaryOp(lval, rval, op);
    }

    return ret;
}

function ifStatement(): AST.IfStatement {
    expect('(');
    const condExpr = expr();
    expect(')');
    expect('{');
    const body = [];
    const elseBody = [];

    while (!accept('}')) {
        body.push(statement());
    }

    while (accept('else')) {
        if (accept('if')) {
            elseBody.push(ifStatement());
        } else {
            expect('{');
            while (!accept('}')) {
                elseBody.push(statement());
            }
        }
    }
    return new AST.IfStatement({ cond: condExpr, body, elseBody });
}

// If noSemi, don't expect a semi before returning. Used for for loops
function statement(noSemi?: boolean): AST.Statement {
    // TODO for loop, do-while
    if (accept('return')) {
        const ret = new AST.ReturnStatement(expr());
        expect(';');
        return ret;
    } else if (accept('if')) {
        return ifStatement();
    } else if (accept('while')) {
        expect('(');
        const condExpr = expr();
        expect(')');
        expect('{');
        const body = [];

        while (!accept('}')) {
            body.push(statement());
        }
        return new AST.WhileStatement({ cond: condExpr, body });
    } else if (accept('do')) {
        expect('{');
        const body = [];
        while (!accept('}')) {
            body.push(statement());
        }
        expect('while');
        expect('(');
        const condExpr = expr();
        expect(')');
        expect(';');
        return new AST.DoWhileStatement({ cond: condExpr, body })
    } else if (accept('for')) {
        expect('(');
        let decl, cond, update, body = [];
        if (cur !== ';') {
            decl = statement(true);
        } else {
            expect(';');
        }

        if (cur !== ';') {
            cond = expr();
            expect(';');
        } else {
            expect(';');
        }

        if (cur !== ')') {
            update = statement(true); // true for no semicolon
        }
        expect(')');
        expect('{');
        while (!accept('}')) {
            body.push(statement());
        }

        return new AST.ForLoop({ decl, cond, update, body })

    } else if (accept('continue')) {
        expect(';');
        return new AST.ContinueStatement();
    } else if (accept('break')) {
        expect(';');
        return new AST.BreakStatement();
    } else if (BASE_TYPES.includes(cur)) {
        return declareVar();
    } else if (peek(0) === '=') {
        const ident = expectIdent();
        expect('=');
        let varExpr = expr();
        const ret = new AST.SetLocalVar({ ident, expr: varExpr });
        expect(';');
        return ret;
    } else if (peek(0) === '[') {
        // Not allowing unused array expressions to simplify this
        const ident = getIdent(expectIdent());
        expect('[');
        const offset = expr();
        expect(']');
        expect('=');
        const val = expr();
        if (!noSemi) expect(';');
        return new AST.SetArray(ident, offset, val);
    } else if (ASSIGNMENT_OPS.includes(peek(0))) {
        const vari = new AST.Variable(expectIdent());
        const op = expect(ASSIGNMENT_OPS);
        const rval = expr();
        if (!noSemi) expect(';');
        return new AST.AssignmentOp(vari, op, rval);
    } else {
        const ret = expr();
        if (!noSemi) expect(';');
        return ret;
    }
}

function type(): Type {
    const typeName = expect(BASE_TYPES);
    let numPointers = 0;
    while (accept('*')) {
        numPointers++;
    }

    return Type.buildType(typeName, numPointers);
}

function functionDefinition(fnType, ident): AST.FunctionDefinition {
    const params = [];
    const body = [];
    if (cur !== ')') {
        do {
            const paramType = type();
            const paramName = expectIdent();
            params.push(new AST.FunctionParam({ type: paramType, ident: paramName }));
        } while (accept(','));
    }
    expect(')');
    expect('{');
    while (cur !== '}') {
        body.push(statement());
    }
    expect('}');

    return new AST.FunctionDefinition({ ident, type: fnType, params, body });
}

function parse(_toks) {
    toks = _toks;
    next();

    const ret: (AST.FunctionDefinition)[] = [];

    while (toks.length) {
        const newType = type();
        const ident = expectIdent();

        // Top-level statements can only be global variable defs or functions.
        if (accept('(')) {
            ret.push(functionDefinition(newType, ident));
        } else {
            error('Global defs not yet supported');
        }
    }

    if (toks.length) {
        console.warn('Tokens were left over after parsing');
    }

    return ret;
}

export { parse };