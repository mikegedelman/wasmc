const expect = require('chai').expect;

const { buildAST, Variable, FunctionCall, ConstExpr, GlobalDefinition,
        FunctionDefinition, Type, Types, makeType } = require('../dist/ast.js');

describe('AST', () => {
    const testParse = input => {
        return parse(lex(input))
    };

    it('loads global definitions to AST', () => {
        const prog = [{
            name: 'GlobalDefinition',
            type: 'float',
            ident: 'x',
            expr: {
                name: 'FunctionCall',
                ident: '+',
                args: ['5', '3'],
            }
        }];

        const fnCall = new FunctionCall({ name: 0, args: [] });
        fnCall.ident = '+';
        fnCall.args = [new ConstExpr(5), new ConstExpr(3)];

        const globalDef = new GlobalDefinition({});
        globalDef.ident = 'x';
        globalDef.type = Types.Float;
        globalDef.expr = fnCall;

        expect(buildAST()[0]).to.eql(globalDef)
    });

    it('loads function definitions to AST', () => {
        const prog = [{
            name: 'FunctionDefinition',
            type: 'int',
            ident: 'main',
            params: [{
                ident: 'argc',
                type: 'int'
            }],
            body: [{
                name: 'FunctionCall',
                ident: 'printf',
                args: ['argc'],
            }]
        }];

        const printfCall = new FunctionCall({ name: 0, args: [] });
        printfCall.ident = 'printf';
        printfCall.args = [new Variable('argc')];

        const fnDef = new FunctionDefinition({ body: [] });
        fnDef.ident = 'main';
        fnDef.type = Types.Int;
        fnDef.params = [{ ident: 'argc', type: Type.Int}];
        fnDef.body = [printfCall];

        expect(buildAST()[0]).to.eql(fnDef)
    });

    it('parses types', () => {
        const cases = [
            ['char', Types.Char],
            ['int', Types.Int],
            ['float', Types.Float],
            ['void', Types.Void],
            ['char*', new Types.Pointer(Types.Char)],
            ['char**', new Types.Pointer(new Types.Pointer(Types.Char))],
            ['int[25]', new Types.Array(Types.Int, 25)],
            ['int[25][25]', new Types.Array(new Types.Array(Types.Int, 25), 25)],
            ['char**[25]', new Types.Array(new Types.Pointer(new Types.Pointer(Types.Char)), 25)],
        ];

        // cases.forEach(case => {
        //     const expected = case[1];
        //     const actual = makeType(case[0]);
        //     expect(actual.equals(expected)).to.be(true);
        // });
    });
});
