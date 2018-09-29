const expect = require('chai').expect;

const { Token, lex } = require('../dist/lex.js')

describe('lex', () => {
	it('lexes', () => {
        const expected = ['char', '*', 'func', '(', ')', '{', 'int', 'x',
                          '[', '25', ']', ';', 'return', '5', ';', '}'].map(ch => new Token(ch, 1));

        const actual = lex(' char* func() { int x[25]; return 5; } ');
        expect(actual).to.eql(expected);
    });
});
