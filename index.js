// Import our outputted wasm ES6 module
// Which, export default's, an initialization function
import { initSync, build_automata } from "./pkg/automata.js";

const runWasm = async () => {
	// Instantiate our wasm module
	// Call the Add function export from wasm, save the result
	const response = await fetch("./pkg/automata_bg.wasm");
	const buffer = await response.arrayBuffer();
	const _initialization = initSync(buffer);
	const nfa = build_automata("a|b");
	console.log(nfa)
};
runWasm();
