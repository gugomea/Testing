// Import our outputted wasm ES6 module
// Which, export default's, an initialization function

import * as elem from "./visualization/elementos_graficos.js";
import { initSync, build_automata } from "./pkg/automata.js";

async function fetchWasm() {
	// Instantiate our wasm module
	// Call the Add function export from wasm, save the result
	const response = await fetch("./pkg/automata_bg.wasm");
	const buffer = await response.arrayBuffer();
	const _initialization = initSync(buffer);
	const nfa = build_automata("a|b");
	console.log(nfa)
};

function reshape() {
	let canvas = <HTMLCanvasElement> document.getElementById('canvas');
	canvas.width = (window.innerWidth / 9) * 8;
	canvas.height = (window.innerHeight / 9) * 8;
	let ctx = unwrap(canvas.getContext("2d"));
	//ctx.fillStyle = 'white';
	ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function unwrap<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) {
    throw new Error("Error, valor nulo inesperado");
  }
  return value;
}

function initEventos() {

	let canvas = <HTMLCanvasElement> document.getElementById('canvas');
	let ctx = unwrap(canvas.getContext('2d'));

	let automata = new elem.AutomataGrafico(canvas, ctx);

	let mouse_in_canvas = false;

	canvas.addEventListener('mouseenter', (_) => mouse_in_canvas = true);
	canvas.addEventListener('mouseleave', (_) => mouse_in_canvas = false);

	window.addEventListener('keydown', (e) => automata.cambiar_texto(e.key));

	window.addEventListener('resize', _ => { reshape(); automata.draw(); });

	window.addEventListener('mousedown', e => {
		if(mouse_in_canvas) automata.create_node_or_link(e);
	});

	window.addEventListener('mousemove', e => {
		if(mouse_in_canvas) automata.movimiento(e);
	});

	window.addEventListener('mouseup', e => {
		if(mouse_in_canvas) automata.mouse_release(e);
	});

	window.setInterval(() => {
		if(automata.elemento_seleccionado != null) {
			automata.draw();
			automata.visibilidad = !automata.visibilidad;
		}
	}, 600)

	canvas.addEventListener('contextmenu', e => {
		e.preventDefault();
	});

}

window.addEventListener('load', initEventos);
window.addEventListener('load', reshape);
window.addEventListener('load', fetchWasm);
