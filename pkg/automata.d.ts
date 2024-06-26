/* tslint:disable */
/* eslint-disable */
/**
* @param {any} nfa
* @returns {any}
*/
export function compile_nfa(nfa: any): any;
/**
* @param {any} input
* @returns {any}
*/
export function match_string(input: any): any;
/**
* @returns {any}
*/
export function reset_automata(): any;
/**
* @param {any} letter
* @returns {any}
*/
export function next(letter: any): any;
/**
* @param {any} val
* @returns {any}
*/
export function build_automata(val: any): any;
/**
* @param {any} automata
* @returns {any}
*/
export function automata_to_regex(automata: any): any;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly alloc: (a: number) => number;
  readonly grep_file: (a: number, b: number, c: number, d: number) => number;
  readonly compile_nfa: (a: number, b: number) => void;
  readonly match_string: (a: number, b: number) => void;
  readonly reset_automata: () => number;
  readonly next: (a: number, b: number) => void;
  readonly build_automata: (a: number, b: number) => void;
  readonly automata_to_regex: (a: number, b: number) => void;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
  readonly __wbindgen_exn_store: (a: number) => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {SyncInitInput} module
*
* @returns {InitOutput}
*/
export function initSync(module: SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {InitInput | Promise<InitInput>} module_or_path
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: InitInput | Promise<InitInput>): Promise<InitOutput>;
