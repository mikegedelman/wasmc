# wasmc
A toy compiler for a subset of C to WebAssembly

## Quick Example

```c
/* main.wasmc */
int main() {
    log("Hello world from WebAssembly!\n");
}
```

```bash
# command line
$ ts-node src/compile.ts main.wasmc -o main.wasm
$ ts-node src/run.ts main.wasm
> Hello world from WebAssembly!
```

# Overview

wasmc supports most basic features of C, although a few are still being added:

### Function Definition

```c
/* <type> <identifier> (<param>, ...) { <statement>* } */

char* fn_name (char* ptr, int sz) { ... }
```

### Variables
```c
/* Declaration
 * <type> <identifier> <array-expression>? ;
 * <type> <identifier> = <expr> ;
 */

int x;
int arr[25];
int y = 5;

/* Set value of a variable
 * <identifier> <array-expression>? = <expr> */
x = 25;
y = (9 * 46);
arr[2] = (99 + 4);
```

### If/Else
```c
/* 
 * if (<expr>) { <statement>* }
 * if (<expr>) { <statement>* } else { <statement>* }
 * if (<expr>) { <statement>* } else <if-statement>+
 */

if (x > 0) {
    x = x + 1;
} else {
    return;
}
```

### Loops
```c
/* while (<expr>) { <statement>* } */

int x = 10;
while (x > 0) {
    if (x == 5) {
        // Don't print 5
        x--;
        continue;
    }
    logInt(x);
    x--;

    if (x < 2) {
        // Exit loop early
        break;
    }
}

/* do-while { <statement>* } (<expr>); */

int x = 10;
do {
  logInt(x);
  x--;
} while (x > 0);

/* for (<variable-dec>?; <expr>?; <statement>?) { <statement>* } */

for (int x = 10; x > 0; x--) {
  logInt(x);
}
```

### Operators

Supported binary operators: `+`, `-`, `*`, `/`, `>`, `<`, `>=`, `<=`, `==`, `!=`, `&&`, `&`, `||`, `|`, `^`

Assignment operators: `+=`, `-=`, `*=`, `/=`, `&=`, `|=`, `^=`

Unary operators: `++`, `--`, `!`, `*`, `&`; todo: `~`, type casts, `sizeof`

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

### Compiler

```ts-node src/compile.ts [filename] <opts>```

Opts:

* `-o` output filename, defaults to `a.out.wasm`
* `-S` generate wast only (default filename `a.out.wast`)
* `-i` keep intermediate wast
* `-r` immediately run generated wasm
* `-d` debug

### WASM Runner

```ts-node src/run.ts [filename]```

# Roadmap

* Proper array sizes (they're all 8-bit currently)
* Properly implement operator precedence
  - Currently it's just in the order given, but parens are supported
  - Because of this be really careful with conditional expressions, `&&` is currently equivalent to `&`
    and could cause confusion
* Preprocessor/multiple file support
* Support for structs
* Flesh out a std library with `printf`, etc
* Use a stack for local arrays; currently all arrays are stored in global memory and never freed.
* malloc/free support
* Web demo (need to figure out how to get wat2wasm running in the browser)
