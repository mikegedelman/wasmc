import { FunctionDefinition, FunctionCall, Type, ASTNode, Variable, ConstExpr,
         ReturnStatement, SetLocalVar, DeclareLocalVar, Types, StringConstant } from './ast';

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

class WasmGlobal {
    constructor (public val: any, public idx: number) {}

    serialize() {
        let serialized = Buffer.from(this.val).toString('utf-8');
        if (typeof this.val === 'string') {
            serialized = '"' + serialized + '"';
        }
        return `(data (i32.const ${this.idx})` + serialized + ')';
    }
}

class WasmFunction {
    name: string
    type: WasmType
    params: WasmType[]
    locals: WasmType[] = []
    body: Instr[] = []
    compiler: WasmCompiler

    private identMap: any = {}
    private localCounter: number = 0
    private stack: any[] = []  // Represent values currently on the local stack
    private returnType: any = false  // Later this will be an actual type for type checking

    constructor(compiler: WasmCompiler, fn: FunctionDefinition) {
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
            this.addLocal(stmt.ident, <WasmType> typeToWasmType(stmt.type));

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
       } else if (expr instanceof StringConstant) {
           this.stringConstant(expr);
       }
    }

    stringConstant(expr: StringConstant) {
        const str = expr.val;
        const idx = this.compiler.addGlobal(str, 'StringConstant'); // todo hack alert
        this.instr('i32.const', idx);
        // this.instr('i32.load');
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
        const instr = `${typeToWasmType(type)}.${instrMap[ident]}`;
        this.instr(instr);
    }

    fnCall(fnCall: FunctionCall) {
        const args = fnCall.args;
        const types: Type[] = [];
        args.forEach(arg => {
            this.expr(arg);
        });

        if (['+', '-', '/', '*'].indexOf(fnCall.ident) > -1) {
            if (args.length !== 2) {
                throw new Error(`${fnCall.ident} operation accepts exactly two args`);
            }
            // TODO type check args
            this.arithmetic(fnCall.ident, Types.Int);
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
        const instr = `${typeToWasmType(e.type)}.const`;
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
    globals: WasmGlobal[]
    functions: WasmFunction[]

    private globalIdx: number = 1

    constructor(private astList: ASTNode[]) {
        this.globals = [];
        this.functions = [];
    }

    /// TODO passing nodeType in here is kind of a shortcut
    addGlobal(val: any, nodeType: string): number {
        const ret = this.globalIdx;
        if (nodeType === 'StringConstant') {
            const str = <string> val;
            const sz = str.length;

            this.globals.push(new WasmGlobal(str, this.globalIdx));
            this.globalIdx += val.length;

            // TODO this is a hack but I can't get wast to serialize the null in null terminated strings
            // this.globals.push(new WasmGlobal(0, this.globalIdx));
            // this.globalIdx++;
        } else {
            this.globals.push(new WasmGlobal(val, this.globalIdx));
            this.globalIdx++;
        }



        return ret;
    }

    compile() {
        this.astList.forEach(ast => {
            if (ast instanceof FunctionDefinition) {
                const fn = new WasmFunction(this, <FunctionDefinition>ast);
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
    if (t === Types.Float) {
        return WasmType.f32;
    } else if (t === Types.Int) {
        return WasmType.i32;
    } else {
        throw new Error(`Can't convert ${t.name} to WasmType`);
    }
}

export { WasmCompiler };
