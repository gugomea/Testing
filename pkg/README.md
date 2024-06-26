
# WebAssembly Automata Regex Engine

Rust autoamta regex engine compiled to web assembly. When compiling to wasm exports functions to comunicate with Typescript to achieve the automata visualization and calculate the regular expression from the automata.
The only dependencies in this code is to comunicate to Typescript through WASM, the drawing automata algorithm and automata data structures are all implemented from scratch.




## Features

- Automata from regular expression
- Modify the automata in-place: remove/add state, transitions and modify transitions
- The transitions can handle regular expressions itself(not only characters, its a GNFAgeneralized NFA)
- Currently working with .NET, Elixir and Python to implement a Grep on each language using the Rust crate to show how WebAssembly with WASI brings extreme portability.


## Demo

![Demo with generated regex](https://i.imgur.com/hrm0PJO.png "hola")

## Running in local machine
Dependencies
```
cargo install wasm-pack # this will generate the js glue code to interact with js/ts and high level types
```
Compilation
```
wasm-pack build --target web && tsc
```
Execution
```
python3 -m http.server # or any other server
```
