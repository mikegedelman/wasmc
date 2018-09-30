import { Type, Types } from './types';

class ASTNode {
    type?: Type
}

type Expr = ConstExpr | Variable | StringConstant | FunctionCall | BinaryOp | ArrayOffset | UnaryOp;
type Statement = ReturnStatement | SetLocalVar | DeclareVar | IfStatement | ForLoop
               | WhileStatement | ContinueStatement | BreakStatement 
               | SetArray | Expr;

class ConstExpr extends ASTNode {
    constructor(public val: number, public type: Type) {
        super();
    }
}

class StringConstant extends ASTNode {
    type: Type = new Types.Pointer(Types.Char)

    constructor(public val: string) {
        super();
    }
}

class Variable extends ASTNode {
    constructor(public ident: string) {
        super();
    }
}

class ReturnStatement extends ASTNode {
    constructor(public expr: Expr) {
        super();
    }
}

class BinaryOp extends ASTNode {
    constructor(public left: Expr, public right: Expr, public op: string) {
        super();
    }
}

class UnaryOp extends ASTNode {
    constructor(public base: Expr, public op: string, public postfix?: boolean) {
        super();
    }
}

class AssignmentOp extends ASTNode {
    constructor(public lval: Variable, public op: string, public expr: Expr) {
        super();
    }
}

class ArrayOffset extends ASTNode {
    constructor(public ident: Expr, public offset: Expr) {
        super();
    }
}

class SetLocalVar extends ASTNode {
    ident: string
    expr: Expr

    constructor({ident, expr}: {ident: string, expr: Expr}) {
        super();
        this.ident = ident;
        this.expr = expr;
    }
}

class DeclareVar extends ASTNode {
    ident: string
    type: Type
    expr?: Expr

    constructor(obj: {ident: string, type: Type, expr?: Expr}) {
        super();
        this.ident = obj.ident;
        this.type =  obj.type;

        if (obj.expr) {
            this.expr = obj.expr;
        }
    }
}

class SetArray extends ASTNode {
    constructor(public ident: Expr, public offset: Expr, public val: Expr) {
        super();
    }
}

class IfStatement extends ASTNode {
    cond: Expr
    body: Statement[]
    elseBody: Statement[]

    constructor(obj: {cond: Expr, body: Statement[], elseBody: Statement[]}) {
        super();
        this.cond = obj.cond;
        this.body = obj.body;
        this.elseBody = obj.elseBody;
    }
}

class WhileStatement extends ASTNode {
    cond: Expr
    body: Statement[]

    constructor(obj: {cond: Expr, body: Statement[]}) {
        super();
        this.cond = obj.cond;
        this.body = obj.body;
    }
}

class DoWhileStatement extends WhileStatement {}

class ForLoop extends ASTNode {
    decl?: (DeclareVar | SetLocalVar)
    update?: Statement
    cond?: Expr
    body: Statement[]

    constructor(obj: {cond: Expr, body: Statement[], decl: DeclareVar, update: Statement}) {
        super();
        this.cond = obj.cond;
        this.body = obj.body;
        this.decl = obj.decl;
        this.update = obj.update;
    }
}

class ContinueStatement extends ASTNode {}
class BreakStatement extends ASTNode {}

class FunctionCall extends ASTNode {
    ident: string
    args: Expr[]

    constructor({ident, args}: {ident: string, args: Expr[]}) {
        super();
        this.ident = ident;
        this.args = args;
    }
}

class GlobalDefinition extends ASTNode {
    ident: string
    type: Type
    expr: ASTNode

    constructor({ident, type, expr}: {ident: string, type: Type, expr: Expr}) {
        super();
        this.ident = ident;
        this.type = type;
        this.expr = expr;
    }
}

class FunctionParam extends ASTNode {
    ident: string
    type: Type
    constructor({ident, type}: {ident: string, type: Type}) {
        super();
        this.ident = ident;
        this.type = type;
    }
}

class FunctionDefinition extends ASTNode {
    ident: string
    type: Type
    params: FunctionParam[]
    body: Statement[]

    constructor({ident, type, params, body}: {ident: string, type: Type,
                                             params: FunctionParam[],
                                              body: Statement[]}) {
        super();
        this.ident = ident;
        this.type = type;
        this.params = params;
        this.body = body;
    }
}

let typeMap: any;

function lookupVar(ident: string): Type {
    const retType = typeMap[ident];
    if (!retType) { console.warn(`Couldn't determine type for var ${ident}`); return null; }
    return retType;
}

function checkExprTypes(expr: Expr | Statement): Type {  // the statement union type should not be necessary D:<
    // Base cases
    if (expr instanceof ConstExpr) {
        return expr.type;
    } else if (expr instanceof StringConstant) {
        return expr.type;
    } else if (expr instanceof Variable) {
        expr.type = lookupVar(expr.ident);
        return expr.type;
    }

    if (expr instanceof FunctionCall) {
        expr.args.forEach(arg => {
            const exprType = checkExprTypes(arg);
            if (!exprType) { throw new Error(`Couldn't determine type of ${JSON.stringify(expr)}`); }
            arg.type = exprType;
        });
    } else if (expr instanceof BinaryOp) {
        const lType = checkExprTypes(expr.left);
        const rType = checkExprTypes(expr.right);
        if (!lType.equals(rType)) { console.warn(`Type mismatch: ${lType.name} ${expr.op} ${rType.name}`) };
        expr.type = lType;
        return lType;
    } else if (expr instanceof ArrayOffset) {
        const arrType = checkExprTypes(expr.ident);
        if (!arrType) { console.warn(`Missing type info for ${JSON.stringify(expr.ident)}`); return null; }
        if (arrType instanceof Types.Array || arrType instanceof Types.Pointer) {
           // do something?
        } else {
            console.warn(`Indexing into ${arrType.constructor.name}, expected Array or Pointer`);
        }
        return expr.type;
    } else if (expr instanceof UnaryOp) {
        const baseType = checkExprTypes(expr.base);
        if (!baseType) { console.warn(`Missing type info for ${JSON.stringify(expr.base)}`); return null; }
        expr.type = baseType;
        return expr.type;
    }
}

function checkStatementTypes(stmt: Statement) {
    if (stmt instanceof ReturnStatement) {
        stmt.type = checkExprTypes(stmt.expr);
    } else if (stmt instanceof DeclareVar) {
        typeMap[stmt.ident] = stmt.type;

        if (stmt.expr) {
            const exprType = checkExprTypes(stmt.expr);
            if (!exprType) { console.warn(`Missing type info for declaration of ${stmt.ident}`); return; }

            if (!exprType.equals(stmt.type)) {
                throw new Error(`Type mismatch while setting var ${stmt.ident} (expected ${stmt.type.name}, got ${exprType.name})`);
            }
        }

    } else if (stmt instanceof SetLocalVar) {
        const lvalType = lookupVar(stmt.ident);
        const rvalType = checkExprTypes(stmt.expr);

        if (!lvalType.equals(rvalType)) {
            console.warn(`Type mismatch: assigning ${lvalType} to ${lvalType} (var: ${stmt.ident}`);
        }
    } else if (stmt instanceof IfStatement || stmt instanceof DoWhileStatement
               || stmt instanceof WhileStatement) {
        stmt.body.forEach(stmt => checkStatementTypes(stmt));
    } else if (stmt instanceof ForLoop) {
        [stmt.decl, stmt.update, ...stmt.body].forEach(stmt => {
            if (stmt) {
                checkStatementTypes(stmt);
            }
        });
        const condExprType = checkExprTypes(stmt.cond);
        // TODO check this
    } else if (stmt instanceof SetArray) {
        const ltype = checkExprTypes(stmt.ident);
        const rtype = checkExprTypes(stmt.val);
        if (ltype instanceof Types.Array || ltype instanceof Types.Pointer) {
            if (!ltype.subType.equals(rtype)) {
                throw new Error(`Type mismatch: assigning ${rtype.name} to array of ${ltype.subType.name} (var: ${JSON.stringify(stmt.ident)})`);
            }
        } else {
            console.warn(`Setting array value on a non-array and non-pointer: ${JSON.stringify(stmt.ident)}`);
        }
    } else {
        checkExprTypes(stmt);
    }
}


/** Walk the AST, adding type info and performing some initial checks */
function checkTypes(ast: ASTNode[]) {
    typeMap = {};

    // todo check globals when they're supported

    // Gather all known function types first
    (<FunctionDefinition[]>ast).forEach(fn => {
        typeMap[fn.ident] = fn.type;
    });

    (<FunctionDefinition[]>ast).forEach(fn => {
        fn.body.forEach(stmt => checkStatementTypes(stmt));
    });
}

export { Variable, ConstExpr, FunctionCall, GlobalDefinition,
         FunctionDefinition, ReturnStatement, ASTNode, SetLocalVar, DeclareVar,
         FunctionParam, StringConstant, IfStatement, WhileStatement, DoWhileStatement,
         ContinueStatement,
         BreakStatement, SetArray, ArrayOffset, ForLoop,
         Statement, Expr, BinaryOp, UnaryOp, AssignmentOp,
         checkTypes };