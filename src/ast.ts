import { Type, Types } from './types';

interface ASTNode {}

type Expr = ConstExpr | Variable | StringConstant | FunctionCall | BinaryOp | ArrayOffset | UnaryOp;
type Statement = ReturnStatement | SetLocalVar | DeclareVar | IfStatement
               | WhileStatement | ContinueStatement | BreakStatement 
               | SetArray | Expr;

class ConstExpr implements ASTNode {
    constructor(public val: number, public type: Type) {}
}

class StringConstant implements ASTNode {
    constructor(public val: string) {}
}

class Variable implements ASTNode {
    constructor(public ident: string) {}
}

class ReturnStatement implements ASTNode
 {
    constructor(public expr: Expr) {}
}

class BinaryOp implements ASTNode {
    constructor(public left: Expr, public right: Expr, public op: string) {}
}

class UnaryOp implements ASTNode {
    constructor(public base: Variable, public op: string, public postfix?: boolean) {}
}

class ArrayOffset implements ASTNode {
    constructor(public ident: Expr, public offset: Expr) {}
}

class SetLocalVar implements ASTNode {
    ident: string
    expr: Expr

    constructor({ident, expr}: {ident: string, expr: Expr}) {
        this.ident = ident;
        this.expr = expr;
    }
}

class DeclareVar implements ASTNode {
    ident: string
    type: Type
    expr?: Expr

    constructor(obj: {ident: string, type: Type, expr?: Expr}) {
        this.ident = obj.ident;
        this.type =  obj.type;

        if (obj.expr) {
            this.expr = obj.expr;
        }
    }
}

class SetArray implements ASTNode {
    constructor(public ident: Expr, public offset: Expr, public val: Expr) {}
}

class IfStatement implements ASTNode {
    cond: Expr
    body: Statement[]
    elseBody: Statement[]

    constructor(obj: {cond: Expr, body: Statement[], elseBody: Statement[]}) {
        this.cond = obj.cond;
        this.body = obj.body;
        this.elseBody = obj.elseBody;
    }
}

class WhileStatement implements ASTNode {
    cond: Expr
    body: Statement[]

    constructor(obj: {cond: Expr, body: Statement[] }) {
        this.cond = obj.cond;
        this.body = obj.body;
    }
}

class ContinueStatement implements ASTNode {}
class BreakStatement implements ASTNode {}

class FunctionCall implements ASTNode {
    ident: string
    args: Expr[]

    constructor({ident, args}: {ident: string, args: Expr[]}) {
        this.ident = ident;
        this.args = args;
    }
}

class GlobalDefinition implements ASTNode {
    ident: string
    type: Type
    expr: ASTNode

    constructor({ident, type, expr}: {ident: string, type: Type, expr: Expr}) {
        this.ident = ident;
        this.type = type;
        this.expr = expr;
    }
}

class FunctionParam implements ASTNode {
    ident: string
    type: Type
    constructor({ident, type}: {ident: string, type: Type}) {
        this.ident = ident;
        this.type = type;
    }
}

class FunctionDefinition implements ASTNode {
    ident: string
    type: Type
    params: FunctionParam[]
    body: Statement[]

    constructor({ident, type, params, body}: {ident: string, type: Type, params: FunctionParam[],
                                              body: Statement[]}) {
        this.ident = ident;
        this.type = type;
        this.params = params;
        this.body = body;
    }
}

export { Variable, ConstExpr, FunctionCall, GlobalDefinition,
         FunctionDefinition, ReturnStatement, ASTNode, SetLocalVar, DeclareVar,
         FunctionParam, StringConstant, IfStatement, WhileStatement, ContinueStatement,
         BreakStatement, SetArray, ArrayOffset,
         Statement, Expr, BinaryOp, UnaryOp };