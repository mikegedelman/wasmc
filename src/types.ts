const BASE_TYPES = ['int', 'float', 'char', 'void'];
const BINARY_OPS = ['+', '-', '*', '/', '=', '<', '>', '<=', '>=', '==', '!=',
                    '&', '&&', '|', '||', '^'];
const PREFIX_UNARY_OPS = [`++`, `--`, `!`, `*`, `&`, `~`];
const POSTFIX_UNARY_OPS = [`++`, `--`];
const ASSIGNMENT_OPS = ['+=', '-=', '*=', '/=', '&=', '|=', '^='];
const ALL_OPS = [...BINARY_OPS, ...PREFIX_UNARY_OPS, ...BINARY_OPS, ...ASSIGNMENT_OPS];

class Type {
    constructor(public name: string) {
        // this.baseType = this;
    }

    static buildType(name: string, numPointers: number): Type {
        let ret = new Type(name);
        for (var i = 0; i < numPointers; i++) {
            ret = new Pointer(ret);
        }

        return ret;
    }

    equals(other: Type): boolean {
        return this.name === other.name;
    }

    getBaseType(): Type {
        return this;
    }
}

class SuperType extends Type {
    baseType: Type
    subType: Type

    constructor(public wrappedType: (Type|SuperType)) {
        super(wrappedType.name); 
        this.subType = wrappedType;

        if (wrappedType instanceof SuperType) {
            this.baseType = wrappedType.baseType;
        } else {
            this.baseType = wrappedType;
        }
    }

    getBaseType(): Type {
        return this.baseType;
    }
}

class Pointer extends SuperType {
    name: string

    constructor (public wrappedType: Type) {
        super(wrappedType);
        this.name = `*${wrappedType.name}`;
    }
}

class ArrayType extends SuperType {
    name: string
    constructor (public wrappedType: Type, public size: number) {
        super(wrappedType);
        this.name = `${wrappedType.name}[${size}]`;
    }
}

const Types = {
    Float: new Type('float'),
    Int: new Type('int'),
    Void: new Type('void'),
    Char: new Type('char'),
    Bool: new Type('__bool__'), // internal bool type
    Pointer: Pointer,
    Array: ArrayType
};

const BUILTIN_FNS = {
    log: [new Types.Pointer(Types.Char)],
    logInt: [Types.Int],
};

export { BASE_TYPES, BINARY_OPS, PREFIX_UNARY_OPS, POSTFIX_UNARY_OPS, ASSIGNMENT_OPS,
         ALL_OPS, BUILTIN_FNS, Type, Types };