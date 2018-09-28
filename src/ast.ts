interface ASTNode {}

const FLOAT_REGEX = /^[0-9]+\.[0-9]+$/;
const INT_REGEX = /^[0-9]+$/;
const VALID_IDENT_REGEX = /^[a-zA-Z_]+[a-zA-Z0-9_]*$/;

class Type {
    constructor(public name: string) {}

    equals(other: Type): boolean {
        return this.name === other.name;
    }
}

class Pointer extends Type {
    name: string

    constructor (public wrappedType: Type) {
        super('this gets overwritten');
        this.name = `*${wrappedType}`;
    }
}

class ArrayType extends Type {
    name: string
    constructor (public wrappedType: Type, public size: number) {
        super('this gets overwritten');
        this.name = `${wrappedType}[${size}]`;
    }
}

const Types = {
    Float: new Type('float'),
    Int: new Type('int'),
    VoidType: new Type('void'),
    Char: new Type('char'),
    Pointer: Pointer,
    Array: ArrayType
};

const baseTypes = {
    'int': Types.Int,
    'float': Types.Float,
    'void': Types.VoidType,
    'char': Types.Char
}


class ConstExpr implements ASTNode {
    val: any
    type: Type

    constructor(val: string) {
        if (FLOAT_REGEX.test(val)) {
            this.val = parseFloat(val);
            this.type = Types.Float;
        } else if (INT_REGEX.test(val)) {
            this.val = parseInt(val);
            this.type = Types.Int;
        } else {
            throw new Error(`Invalid identifier: ${val}`);
        }
    }
}

class StringConstant implements ASTNode {
    val: string

    constructor({name, val}: {name: string, val: string}) {
        this.val = val;
    }
}

class Variable implements ASTNode {
    constructor(public ident: string) {}

    static isValid(ident: string) {
        return VALID_IDENT_REGEX.test(ident);
    }
}

class ReturnStatement implements ASTNode {
    expr: ASTNode

    constructor({name, expr}: {name: string, expr: any}) {
        this.expr = makeExpr(expr);
    }
}

class SetLocalVar implements ASTNode {
    ident: string
    expr: ASTNode

    constructor({ident, expr}: {ident: string, expr: any}) {
        this.ident = ident;
        this.expr = makeExpr(expr);
    }
}

class DeclareLocalVar implements ASTNode {
    ident: string
    type: Type
    expr?: ASTNode

    constructor(obj: {ident: string, type: string, expr?: any}) {
        this.ident = obj.ident;
        this.type = makeType(obj.type);

        if (this.expr) {
            this.expr = makeExpr(this.expr);
        }
    }
}

class FunctionCall implements ASTNode {
    ident: string
    args: ASTNode[]

    constructor({ident, args}: {ident: string, args: any[]}) {
        this.ident = ident;
        this.args = args.map(makeExpr);
    }
}

class GlobalDefinition implements ASTNode {
    ident: string
    type: Type
    expr: ASTNode

    constructor({ident, type, expr}: {ident: string, type: string, expr: any}) {
        this.ident = ident;
        this.type = makeType(type)
        this.expr = makeExpr(expr);
    }
}

class FunctionDefinition implements ASTNode {
    ident: string
    type: Type
    params: { ident: string, type: Type }[]
    body: ASTNode[]

    constructor({ ident, type, params, body}: {ident: string, type: string, params: any[],
                                               body: any[]}) {
        this.ident = ident;
        this.type = makeType(type);
        this.params = params;
        this.body = body.map(makeStatement);
    }
}

function makeExpr(expr: any): FunctionCall | ConstExpr | Variable | StringConstant {
    if (expr && expr.name === 'FunctionCall') {
        return new FunctionCall(expr);
    } else if (expr.name === 'StringConstant') {
        return new StringConstant(expr);
    } else if (Variable.isValid(expr)) {
        return new Variable(expr);
    } else {
        return new ConstExpr(expr);
    }
}

function makeStatement(stmt: any): FunctionCall | ReturnStatement | SetLocalVar | DeclareLocalVar {
    if (!stmt) { throw new Error('Fatal: found undefined statement'); }

    if (stmt.name === 'FunctionCall') {
        return new FunctionCall(stmt);
    } else if (stmt.name === 'ReturnStatement') {
        return new ReturnStatement(stmt);
    } else if (stmt.name === 'SetLocalVar') {
        return new SetLocalVar(stmt);
    } else if (stmt.name === 'DeclareLocalVar') {
        return new DeclareLocalVar(stmt);
    } else {
        throw new Error(`Unexpected function body statement: ${JSON.stringify(stmt)}`);
    }
}

function makeType(typeName: string): Type {
    // let workType = typeName;
    const firstStar = typeName.indexOf('*');
    const firstBracket = typeName.indexOf('[');
    const firstSym = Math.min(firstStar, firstBracket);

    let baseTypeName = typeName;
    if (firstSym > -1) {
        baseTypeName = typeName.slice(0, firstSym);
    }
    let ret = baseTypes[baseTypeName];
    if (!ret) { throw new Error(`Unrecognized type "${baseTypeName}"`)};
    if (firstSym == -1) {
        return ret;
    }
    
    if (firstBracket > -1) {
        let brackets = typeName.slice(firstBracket);
        while (brackets !== '') {
            const nextBracket = brackets.indexOf(']');
            const num = brackets.slice(0, nextBracket);
            const sz = parseInt(num);
            if (isNaN(sz)) {
                throw new Error(`Couldn't parse array size "${num}"`);
            }

            ret = new Types.Array(ret, sz);
            brackets = brackets.slice(nextBracket + 1);
        }
    }

    if (firstStar > -1) {
        let end = undefined;
        if (firstBracket > -1) {
            end = firstBracket;
        }
        let stars = typeName.slice(firstStar, end);
        while (stars !== '') {
            ret = new Types.Pointer(ret);
            stars = stars.substr(1);
        }
    }

    return ret;
}

let nodes;
function buildAST(parseData: any[]) {
    nodes = [];

    parseData.forEach(topLevel => {
        if (topLevel.name === 'GlobalDefinition') {
            nodes.push(new GlobalDefinition(topLevel));
        } else if (topLevel.name === 'FunctionDefinition') {
            nodes.push(new FunctionDefinition(topLevel));
        } else {
            throw new Error(`Unexpected top level node: ${JSON.stringify(topLevel)}`);
        }
    });

    return nodes;
}

export { buildAST, Type, Types, Variable, ConstExpr, FunctionCall, GlobalDefinition,
         FunctionDefinition, ReturnStatement, ASTNode, SetLocalVar, DeclareLocalVar,
         makeType, StringConstant };