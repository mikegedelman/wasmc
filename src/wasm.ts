import * as AST from './ast';
import { Type, Types } from './types';

enum WasmType {
    i32 = 'i32',
    f32 = 'f32'
}

class Instr {
    name: string
    args: any[]

    constructor(name: string, ...args: any[]) {
        this.name = name;
        this.args = args;
    }

    serialize(): string {
        let ret = `${this.name}`;
        if (this.args.length) {
            ret += ' ' + this.args.join(' ');
        }
        return ret;
    }
}

class Global {
    constructor (public val: any, public idx: number) {}

    serialize() {
        let serialized = Buffer.from(this.val).toString('utf-8');
        if (typeof this.val === 'string') {
            serialized = '"' + serialized + '"';
        }
        return `(data (i32.const ${this.idx})` + serialized + ')';
    }
}

class Function {
    name: string
    type: WasmType
    params: WasmType[]
    locals: WasmType[] = []
    body: Instr[] = []
    compiler: Compiler

    private identMap: any = {}
    private localCounter: number = 0
    private stack: any[] = []  // Represent values currently on the local stack
    private returnType: any = false  // Later this will be an actual type for type checking

    private ifDepth: number = 0 // We need to know how deeply nested we are in if-statements
                                // so we can break out of the nearest loop when necessary

    constructor(compiler: Compiler, fn: AST.FunctionDefinition) {
        this.compiler = compiler;
        this.name = fn.ident;
        this.type = <WasmType>typeToWasmType(fn.type);
        this.params = fn.params.map(p => p.type === Types.Float ? WasmType.f32 : WasmType.i32);

        fn.params.forEach((param, idx) => {
            this.identMap[param.ident] = idx;
            this.localCounter++;
        });

        fn.body.forEach(stmt => this.statement(stmt));

        // TODO check for void
        if (!fn.type.equals(Types.Void) && !this.returnType) {
            throw new Error(`Function ${this.name} must return a value`);
        }
    }

    instr(name: string, ...args: any[]) {
        this.body.push(new Instr(name, args));
    }

    statement(stmt: AST.Statement) {
        // Call
        if (stmt instanceof AST.FunctionCall) {
            this.fnCall(<AST.FunctionCall>stmt);

        // Return
        } else if (stmt instanceof AST.ReturnStatement) {
            this.expr(stmt.expr);
            this.instr('return');
            this.returnType = true;

        // Set variable
        } else if (stmt instanceof AST.SetLocalVar) {
            this.expr(stmt.expr);
            this.instr('set_local', this.getVar(stmt.ident));

        // Define variable
        } else if (stmt instanceof AST.DeclareVar) {
            let arr = false;
            if (stmt.type instanceof Types.Array) {
                arr = true;
                const sz = stmt.type.size;
                const idx = this.compiler.addGlobalArray(sz);
                this.addLocal(stmt.ident, WasmType.i32);
                this.instr('i32.const', idx);
                this.instr('set_local', this.getVar(stmt.ident));
            } else {
                this.addLocal(stmt.ident, <WasmType> typeToWasmType(stmt.type));
            }

            if (stmt.expr) {
                if (arr) { throw new Error('Inline initialization of arrays not supported yet'); }
                this.expr(stmt.expr);
                this.instr('set_local', this.getVar(stmt.ident));
            }

        // Set array
        } else if (stmt instanceof AST.SetArray) {
            this.expr(stmt.ident);
            this.expr(stmt.offset);
            this.instr('i32.add');

            this.expr(stmt.val);
            this.instr('i32.store8');

        /** Loops/Conditionals **/
        // If
        } else if (stmt instanceof AST.IfStatement) {
            this.expr(stmt.cond);
            this.instr('if');
            this.ifDepth++;

            stmt.body.forEach(innerStmt => {
                this.statement(innerStmt);
            });
            if (stmt.elseBody.length) {
                this.instr('else');
                stmt.elseBody.forEach(innerStmt => {
                    this.statement(innerStmt);
                });
            }
            this.instr('end');
            this.ifDepth--;

        // While
        } else if (stmt instanceof AST.WhileStatement) {
            this.expr(stmt.cond);
            this.instr('if');
            this.instr('loop');
            stmt.body.forEach(innerStmt => {
                this.statement(innerStmt);
            });

            this.expr(stmt.cond);
            this.instr('br_if', 0);
            this.instr('end');
            this.instr('end');

        // Break
        } else if (stmt instanceof AST.BreakStatement) {
            this.instr('br', this.ifDepth + 1);

        // Continue
        } else if (stmt instanceof AST.ContinueStatement) {
            this.instr('br', 0);

        // Assume it's an expr
        } else {
            this.expr(stmt, true);
        }

    }

    expr(expr: AST.Expr, topLevel?: boolean) {
        if (expr instanceof AST.FunctionCall) {
            this.fnCall(expr);
        } else if (expr instanceof AST.Variable) {
            this.pushVar(expr.ident);
       } else if (expr instanceof AST.ConstExpr) {
            this.pushConst(expr);
       } else if (expr instanceof AST.StringConstant) {
           this.stringConstant(expr);
       } else if (expr instanceof AST.BinaryOp) {
           this.binaryOp(expr);
       } else if (expr instanceof AST.UnaryOp) {
           this.unaryOp(expr, !topLevel);
       } else if (expr instanceof AST.ArrayOffset) {
           this.arrayOffset(expr);
       } else {
           throw new Error(`Unexpected expr type ${(<any>expr).constructor.name}`);
       }
    }

    binaryOp(expr: AST.BinaryOp) {
        this.expr(expr.left);
        this.expr(expr.right);
        this.arithmetic(expr.op, Types.Int)
    }

    unaryOp(expr: AST.UnaryOp, resultIsUsed: boolean) {
        if (['++', '--'].includes(expr.op)) {
            if (expr.postfix && resultIsUsed) {
                this.pushVar(expr.base.ident);
            }
            this.pushVar(expr.base.ident);
            this.instr('i32.const', 1);
            this.arithmetic(expr.op.substr(1), Types.Int); // TODO
            this.instr(expr.postfix || !resultIsUsed ? 'set_local' : 'tee_local',
                       this.getVar(expr.base.ident));
        }

        // throw new Error(`Unexpected unary op ${expr.op}`);
    }

    stringConstant(expr: AST.StringConstant) {
        const str = expr.val;
        const idx = this.compiler.addGlobalString(str);
        this.instr('i32.const', idx);
    }

    arrayOffset(expr: AST.ArrayOffset) {
        this.expr(expr.ident);
        this.expr(expr.offset);
        this.instr('i32.add');
        this.instr('i32.load8_s');
    }

    /* Create a new local var
     * TODO properly support vars of the same name in different blocks
     */
    addLocal(ident: string, type?: WasmType) {
        const locType = type || WasmType.i32;
        this.locals.push(locType)
        this.identMap[ident] = this.localCounter;

        this.localCounter++;
    }

    arithmetic(ident: string, type: Type) {
        const instrMap = {
            '+': 'add',
            '-': 'sub',
            '*': 'mul',
            '/': 'div',
            '==': 'eq',
            '!=': 'ne',
            '<': 'lt_s',
            '>': 'gt_s',
            '<=': 'le_s',
            '>=': 'ge_s',
            '&&': 'and',
            '&': 'and',
            '||': 'or',
            '|': 'or',
            '^': 'xor'
        };
        const instr = `${typeToWasmType(type)}.${instrMap[ident]}`;
        this.instr(instr);
    }

    fnCall(fnCall: AST.FunctionCall) {
        const args = fnCall.args;
        const types: Type[] = [];
        args.forEach(arg => {
            this.expr(arg);
        });

        this.instr('call', `$${fnCall.ident}`);
        this.stack.push('fnCall');
    }

    /** Return the index of the given var */
    getVar(ident: string): number {
        const idx = this.identMap[ident];
        if (idx === undefined) { throw new Error(`Couldn't resolve variable ${ident}`); };
        return idx;
    }

    pushVar(ident: string) {
        this.instr('get_local', this.getVar(ident));
        this.stack.push(ident);
    }

    pushConst(e: AST.ConstExpr) {
        const instr = `${typeToWasmType(e.type)}.const`;
        if (!instr) { throw new Error(`Unexpected internal type ${e.type}`)};

        this.instr(instr, e.val);
        this.stack.push(e.val);
    }

    serialize(): string {
        let ret = `(func $${this.name} (export "${this.name}") ` 
                + this.params.map(p => `(param ${p})`).join(' ');

        if (this.type) {
            ret += `(result ${this.type})\n`;
        }
        if (this.locals.length) {
            ret += this.locals.map(l => `(local ${l})`).join(' ') + '\n';
        }
        ret += this.body.map(i => '  ' + i.serialize()).join('\n');
        ret += ')';

        return ret;
    }
}

class Compiler {
    globals: Global[]
    functions: Function[]

    // Where in memory to put the next global
    private globalIdx: number = 1

    constructor(private astList: (AST.DeclareVar | AST.FunctionDefinition)[]) {
        this.globals = [];
        this.functions = [];
    }

    /* Will be hardcoded in the wat file as a (data ...) expression,
     *  and our index will be bumped to the length of the string + 1
     */
    addGlobalString(val: any): number {
        const ret = this.globalIdx;
        const str = <string> val;

        this.globals.push(new Global(str, this.globalIdx));
        this.globalIdx += str.length + 1; // add one for null terminator

        return ret;
    }

    addGlobalArray(sz: number): number {
        const ret = this.globalIdx;
        this.globalIdx += sz;
        return ret;
    }

    compile() {
        this.astList.forEach(ast => {
            if (ast instanceof AST.FunctionDefinition) {
                const fn = new Function(this, <AST.FunctionDefinition>ast);
                this.functions.push(fn);
            } else {
                throw new Error('Not yet supported');
            }
        });
    }

    serialize(): string {
        return this.globals.map(g => g.serialize()).join('\n\n')
            + this.functions.map(f => f.serialize()).join('\n\n');
    }
}

function typeToWasmType(t: Type): WasmType {
    if (t.equals(Types.Void)) {
        return null;
    } else if (t.equals(Types.Float)) {
        return WasmType.f32;
    } else if (t.equals(Types.Int) || t instanceof Types.Pointer || t instanceof Types.Array) {
        return WasmType.i32;
    } else {
        console.log(t, Types.Int);
        throw new Error(`Can't convert ${t.name} to WasmType`);
    }
}

function compile(ast) {
    const compiler = new Compiler(ast);
    compiler.compile();
    return compiler.serialize();
}

export { compile };
