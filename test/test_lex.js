const expect = require('chai').expect;
const lexModule = require('../lex.js');

const Token = lexModule.Token;
const RESERVED_WORDS = lexModule.RESERVED_WORDS;
const IDENT = lexModule.IDENT;
const lex = lexModule.lex; 
const toList = lexModule.toList;

const reservedAndParens = RESERVED_WORDS.concat(['(', ')']);

describe('lex', () => {
	it('lexes', () => {
        const expected = ['(', 'test', ')', '(', 'func?', 'arg', ')'].map(x => {
            if (reservedAndParens.indexOf(x) === -1) {
                return new Token(x, 1, IDENT);
            } else {
                return new Token(x, 1);
            }
        });

        const actual = lex('(test) (func? arg)\0(not parsed)');
        expect(actual).to.eql(expected);
    });
});
