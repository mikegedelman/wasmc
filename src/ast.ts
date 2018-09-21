interface ASTNode {}

enum Type {
    Int = 'int',
    Float = 'float'
}

const FLOAT_REGEX = /^[0-9]+\.[0-9]+$/;
const INT_REGEX = /^[0-9]+$/;
const VALID_IDENT_REGEX = /^[a-zA-Z_]+[a-zA-Z0-9_]*$/;

class ConstExpr implements ASTNode {
    val: any
    type: Type

    constructor(val: string) {
        if (FLOAT_REGEX.test(val)) {
            this.val = parseFloat(val);
            this.type = Type.Float
        } else if (INT_REGEX.test(val)) {
            this.val = parseInt(val);
            this.type = Type.Int
        } else {
            throw new Error(`Invalid identifier: ${val}`);
        }
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
        this.type = <Type> obj.type;

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
        this.type = <Type> type;
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
        this.type = <Type> type;
        this.params = params;
        this.body = body.map(makeStatement);
    }
}

class AST {
    nodes: ASTNode[]

    constructor(private parseData: any[]) {}

    load() {
        this.nodes = [];
        this.parseData.forEach(topLevel => {
            if (topLevel.name === 'GlobalDefinition') {
                this.nodes.push(new GlobalDefinition(topLevel));
            } else if (topLevel.name === 'FunctionDefinition') {
                this.nodes.push(new FunctionDefinition(topLevel));
            } else {
                throw new Error(`Unexpected top level node: ${JSON.stringify(topLevel)}`);
            }
        });
    }

    values(): ASTNode[] {
        if (!this.nodes) {
            this.load();
        }

        return this.nodes;
    }
}


function makeExpr(expr: any): FunctionCall | ConstExpr | Variable {
    if (expr && expr.name === 'FunctionCall') {
        return new FunctionCall(expr);
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

export { AST, Type, Variable, ConstExpr, FunctionCall, GlobalDefinition,
         FunctionDefinition, ReturnStatement, ASTNode, SetLocalVar, DeclareLocalVar };