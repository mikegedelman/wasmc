const expect = require('chai').expect;

const { lex } = require('../dist/lex.js');
const { parse } = require('../dist/parse.js');


describe('parse integration', () => {
    const testParse = input => {
        return parse(lex(input))
    };

    it('parses an empty fn', () => {
        expect(testParse(`
            int main() {}
        `)).to.eql([{
            name: 'FunctionDefinition',
            type: { name: 'int', numPointers: 0 },
            ident: 'main',
            body: [],
            params: [],
        }]);
    });

    it('parses fn params', () => {
        expect(testParse(`
            int main(int argc, char* argv) {}
        `)).to.eql([{
            name: 'FunctionDefinition',
            type: { name: 'int', numPointers: 0 },
            ident: 'main',
            body: [],
            params: [{
                type: {
                    name: 'int',
                    numPointers: 0
                },
                ident: 'argc',
            }, {
                type: {
                    name: 'char',
                    numPointers: 1
                },
                ident: 'argv'
            }],
        }]);
    });

    it('parses fn calls', () => {
        expect(testParse(`
            int main() {
                printf("Hello world");
                return 0;
            }
        `)).to.eql([{
            name: 'FunctionDefinition',
            type: { name: 'int', numPointers: 0 },
            ident: 'main',
            params: [],
            body: [{
                name: 'FunctionCall',
                ident: 'printf',
                args: [{
                    name: 'StringConstant',
                    val: 'Hello world'
                }]
            }, {
                name: 'ReturnStatement',
                expr: '0'
            }],
        }]);
    });

    // it('parses global definitions', () => {
    //     expect(testParse('(define int x 5)')).to.eql([{
    //         name: 'GlobalDefinition',
    //         type: 'int',
    //         ident: 'x',
    //         expr: '5',
    //     }]);

    //     expect(testParse('(define float x (+ 5 3))')).to.eql([{
    //         name: 'GlobalDefinition',
    //         type: 'float',
    //         ident: 'x',
    //         expr: {
    //             name: 'FunctionCall',
    //             ident: '+',
    //             args: ['5', '3'],
    //         }
    //     }]);
    // });

    // it('parses function definitions', () => {
    //     expect(testParse('(function int main ())')).to.eql([{
    //         name: 'FunctionDefinition',
    //         type: 'int',
    //         ident: 'main',
    //         params: [],
    //         body: []
    //     }]);

    //     const input = `(function int main (int argc)
    //                        (printf 1)
    //                        (return 0))`;
    //     expect(testParse(input)).to.eql([{
    //         name: 'FunctionDefinition',
    //         type: 'int',
    //         ident: 'main',
    //         params: [{
    //             ident: 'argc',
    //             type: 'int',
    //         }],
    //         body: [{
    //             name: 'FunctionCall',
    //             ident: 'printf',
    //             args: ['1']
    //         }, {
    //             name: 'FunctionCall',
    //             ident: 'return',
    //             args: ['0']
    //         }],
    //     }]);
    // });
});
