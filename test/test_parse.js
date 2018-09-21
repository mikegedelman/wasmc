const expect = require('chai').expect;
const parseModule = require('../parse.js');
const lexModule= require('../lex.js');

const lex = lexModule.lex;
const parse = parseModule.parse;

describe('parse integration', () => {
    const testParse = input => {
        return parse(lex(input))
    };

    it('parses global definitions', () => {
        expect(testParse('(define int x 5)')).to.eql([{
            name: 'GlobalDefinition',
            type: 'int',
            ident: 'x',
            expr: '5',
        }]);

        expect(testParse('(define float x (+ 5 3))')).to.eql([{
            name: 'GlobalDefinition',
            type: 'float',
            ident: 'x',
            expr: {
                name: 'FunctionCall',
                ident: '+',
                args: ['5', '3'],
            }
        }]);
    });

    it('parses function definitions', () => {
        expect(testParse('(function int main ())')).to.eql([{
            name: 'FunctionDefinition',
            type: 'int',
            ident: 'main',
            params: [],
            body: []
        }]);

        const input = `(function int main (int argc)
                           (printf 1)
                           (return 0))`;
        expect(testParse(input)).to.eql([{
            name: 'FunctionDefinition',
            type: 'int',
            ident: 'main',
            params: [{
                ident: 'argc',
                type: 'int',
            }],
            body: [{
                name: 'FunctionCall',
                ident: 'printf',
                args: ['1']
            }, {
                name: 'FunctionCall',
                ident: 'return',
                args: ['0']
            }],
        }]);
    });
});
