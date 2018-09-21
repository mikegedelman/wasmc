const expect = require('chai').expect;

const { AST, Variable, FunctionCall, ConstExpr, GlobalDefinition,
        FunctionDefinition, Type } = require('../ast.js');

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
        const ast = new AST(prog);

        const fnCall = new FunctionCall({ name: 0, args: [] });
        fnCall.ident = '+';
        fnCall.args = [new ConstExpr(5), new ConstExpr(3)];

        const globalDef = new GlobalDefinition({});
        globalDef.ident = 'x';
        globalDef.type = Type.Float;
        globalDef.expr = fnCall;

        expect(ast.values()[0]).to.eql(globalDef)
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
        const ast = new AST(prog);

        const printfCall = new FunctionCall({ name: 0, args: [] });
        printfCall.ident = 'printf';
        printfCall.args = [new Variable('argc')];

        const fnDef = new FunctionDefinition({ body: [] });
        fnDef.ident = 'main';
        fnDef.type = Type.Int;
        fnDef.params = [{ ident: 'argc', type: Type.Int}];
        fnDef.body = [printfCall];

        expect(ast.values()[0]).to.eql(fnDef)
    });

    
});
