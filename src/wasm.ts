import { FunctionDefinition, FunctionCall, Type, ASTNode, Variable, ConstExpr,
         ReturnStatement, SetLocalVar, DeclareLocalVar } from './ast';

enum WasmType {
    i32 = 'i32',
    f32 = 'f32'
}

const typeToWasmType = {
    'float': 'f32',
    'int': 'i32'
};

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

class WasmText {
    functions: []
}

class WasmFunction {
    name: string
    type: WasmType
    params: WasmType[]
    locals: WasmType[] = []
    body: Instr[] = []

    private identMap: any = {}
    private localCounter: number = 0
    private stack: any[] = []  // Represent values currently on the stack
    private returnType: any = false  // Later this will be an actual type for type checking

    constructor(fn: FunctionDefinition) {
        this.name = fn.ident;
        this.type = <WasmType>typeToWasmType[fn.type];
        this.params = fn.params.map(p => p.type === Type.Float ? WasmType.f32 : WasmType.i32);

        fn.params.forEach((param, idx) => {
            this.identMap[param.ident] = idx;
            this.localCounter++;
        });

        fn.body.forEach(stmt => this.statement(stmt));

        // TODO check for void
        if (!this.returnType) {
            throw new Error(`Function ${this.name} must return a value`);
        }
    }

    instr(name: string, ...args: any[]) {
        this.body.push(new Instr(name, args));
    }

    statement(stmt: ASTNode) {
        // Call
        if (stmt instanceof FunctionCall) {
            this.fnCall(<FunctionCall>stmt);
        // Return
        } else if (stmt instanceof ReturnStatement) {
            this.expr(stmt.expr);
            this.instr('return');
            this.returnType = true;
        // Set variable
        } else if (stmt instanceof SetLocalVar) {
            this.expr(stmt.expr);
            this.instr('set_local', this.getVar(stmt.ident));
        // Define variable
        } else if (stmt instanceof DeclareLocalVar) {
            this.addLocal(stmt.ident, <WasmType> typeToWasmType[stmt.type]);

            if (stmt.expr) {
                // TODO this is copypasted from directly above
                this.expr(stmt.expr);
                this.instr('set_local', this.getVar(stmt.ident));
            }
        }

    }

    expr(expr: ASTNode) {
        if (expr instanceof FunctionCall) {
            this.fnCall(expr);
        } else if (expr instanceof Variable) {
            if (this.peekStack() !== expr.ident) {
                this.pushVar(expr.ident);
            }
       } else if (expr instanceof ConstExpr) {
            this.pushConst(expr);
       }
    }

    /// Create a new local var
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
            '/': 'div'
        };
        const instr = `${typeToWasmType[type]}.${instrMap[ident]}`;
        this.instr(instr);
    }

    fnCall(fnCall: FunctionCall) {
        const args = fnCall.args;
        const types: Type[] = [];
        args.forEach(arg => {
            // if (arg instanceof Variable) {
            //     this.pushVar(arg.ident);
            //     types.push(Type.Int); // TODO
            // } else if (arg instanceof ConstExpr) {
            //     this.pushConst(arg);
            //     types.push((<ConstExpr>arg).type)
            // } else if (arg instanceof FunctionCall) {
            //     // TODO check return type matches
            //     this.fnCall(arg);
            //     types.push(Type.Int); // TODO
            // }
            this.expr(arg);
        });

        if (['+', '-', '/', '*'].indexOf(fnCall.ident) > -1) {
            if (args.length !== 2) {
                throw new Error(`${fnCall.ident} operation accepts exactly two args`);
            }
            // TODO type check args
            this.arithmetic(fnCall.ident, Type.Int);
        } else {
            this.instr('call', `$${fnCall.ident}`);
        }
        this.stack.push('fnCall');
    }

    /// Return the index of the given var
    getVar(ident: string): number {
        const idx = this.identMap[ident];
        if (idx === undefined) { throw new Error(`Couldn't resolve variable ${ident}`); };
        return idx;
    }

    pushVar(ident: string) {
        this.instr('get_local', this.getVar(ident));
        this.stack.push(ident);
    }

    pushConst(e: ConstExpr) {
        const instrMap = {
            'float': 'f32.const',
            'int': 'i32.const'
        };
        const instr = instrMap[e.type];
        if (!instr) { throw new Error(`Unexpected internal type ${e.type}`)};

        this.instr(instr, e.val);
        this.stack.push(e.val);
    }

    peekStack() {
        return this.stack.slice(-1).pop()
    }

    serialize(): string { // TODO
        let ret = `(func $${this.name} (export "${this.name}") ` 
                + this.params.map(p => `(param ${p})`).join(' ')
                + `(result ${this.type})\n`;
        if (this.locals.length) {
            ret += this.locals.map(l => `(local ${l})`).join(' ') + '\n';
        }
        ret += this.body.map(i => '  ' + i.serialize()).join('\n');
        ret += ')';

        return ret;
    }
}

class WasmCompiler {
    globals: any[]
    functions: WasmFunction[]

    constructor(private astList: ASTNode[]) {
        this.globals = [];
        this.functions = [];
    }

    compile() {
        this.astList.forEach(ast => {
            if (ast instanceof FunctionDefinition) {
                this.functions.push(new WasmFunction(<FunctionDefinition>ast));
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

export { WasmCompiler };
