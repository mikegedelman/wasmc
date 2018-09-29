# wasmc
A toy compiler for a subset of C to WebAssembly

## Quick Example

```
# main.wasmc
int main() {
    log("Hello world from WebAssembly!\n");
}
```

```
# command line
$ ts-node src/compile.ts main.wasmc -o main.wasm
$ ts-node src/run.ts main.wasm
> Hello world from WebAssembly!
```

# Overview

wasmc supports most basic features of C, although a few are still being added:

### Function Definition

```
<type> <identifier> (<param>, ...) { <statement>* }

char* fn_name (char* ptr, int sz) { ... }
```

### Variables
```
# Declaration
<type> <identifier> <array-expression>? ;
<type> <identifier> = <expr> ;

int x;
int arr[25];
int y = 5;

# Set value of a variable
<identifier> <array-expression>? = <expr>
x = 25;
y = (9 * 46);
arr[2] = (99 + 4);
```

### If/Else
```
if (<expr>) { <statement>* }
if (<expr>) { <statement>* } else { <statement>* }
if (<expr>) { <statement>* } else if (<expr) { <statement>* } ...

if (x > 0) {
    x = x + 1;
} else {
    return;
}
```

### Loops
```
while (<expr>) { <statement>* }

int x = 10;
while (x > 0) {
    if (x == 5) {
        // Don't print 5
        continue;
    }
    logInt(x);
    x = x - 1;

    if (x < 2) {
        // Exit loop early
        break;
    }
}
```

`do-while` and `for` to be added soon.

### Operators

Supported binary operators: `+`, `-`, `*`, `/`, `>`, `<`, `>=`, `<=`, `==`, `!=`, `&&`, `&`, `||`, `|`, `^`

### Provided Functions

Currently only: `void log(char*)` for strings and `void logInt(int)` for integers.

# Setup

Install https://github.com/WebAssembly/wabt.
I know this is clunky, I will find a way to streamline this eventually.
The compiler depends on `wast2wasm` being in your `$PATH`.

```
# ts-node is the easiest way, but you can also use tsc to compile, then run js from dist/ folder
npm i -g typescript ts-node  # Or install these locall only, if you want
npm i
```

`ts-node src/compile.ts [filename] <opts>`
Opts:
    * `-o` output filename, defaults to `a.out.wasm`
    * `-S` generate wast only (default filename `a.out.wast`)
    * `-i` keep intermediate wast
    * `-r` immediately run generated wasm
    * `-d` debug

`ts-node src/run.ts [filename]`

# Roadmap

* Unary operators, assignment operators
* Properly implement operator precedence
  - Currently it's just in the order given, but parens are supported
  - Because of this be really careful with conditional expressions, `&&` is currently equivalent to `&`
    and could cause confusion
* Preprocessor/multiple file support
* Add `do-while`, `for` loops
* Support for structs
* Add type checking
* Flesh out a std library with `printf`, etc
* Use a stack for local arrays; currently all arrays are stored in global memory and never freed.
* malloc/free support
* Web demo (need to figure out how to get wat2wasm running in the browser)
