// Import our outputted wasm ES6 module
// Which, export default's, an initialization function

import {TransicionGrafica, AutomataGrafico, NodoGrafico, Punto } from "./elementos_graficos.js";
import { initSync, build_automata } from "../pkg/automata.js";

async function fetchWasm() {
	// Instantiate our wasm module
	const response = await fetch("./pkg/automata_bg.wasm");
	const buffer = await response.arrayBuffer();
	initSync(buffer);
};

function reshape() {
	let canvas = <HTMLCanvasElement> document.getElementById('canvas');
	canvas.width = (window.innerWidth / 9) * 8;
	canvas.height = (window.innerHeight / 9) * 8;
	let ctx = canvas.getContext("2d")!;
	//ctx.fillStyle = 'white';
	ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function calculate_bounding(automata: AutomataGrafico, expression: any, p: Punto): [any, any] {
	let exp = null;
	if((exp = expression.concatenation) != undefined) {
		let n_expression = exp.length;
		let start_node;
		let [primero, ultimo] = [null, null];
		for(let i = 0; i < n_expression; i++) {
			let [s, e] = calculate_bounding(automata, exp[i], p);
			if(i == 0) primero = s;
			else if(i == (n_expression-1)) ultimo = e;
			if(i > 0) {
				let epsilon_transition = TransicionGrafica.new(start_node, s);
				epsilon_transition.texto = 'ɛ';
				automata.transiciones.push(epsilon_transition);
			}
			start_node = e;
		}
		return [primero, ultimo];
	} else if((exp = expression.union) != undefined) {
		//TODO: I JUST DID IT SO IT WORKS WITH LENGTH == 2
		//console.log('hola');
		let n_expression = exp.length;
		let inicio = new Punto(p.x, p.y + 200+ 100);
		let start_node = new NodoGrafico(0, inicio);
		automata.nodos.push(start_node);
		let final_nodes = [];
		let fijo = new Punto(p.x, p.y);
		for(let i = 0; i < n_expression; i++) {
			p.x = fijo.x;
			p.y += 200
			let [s, e] = calculate_bounding(automata, exp[i], p);
			final_nodes.push(e);
			let epsilon_transition = TransicionGrafica.new(start_node, s);
			epsilon_transition.texto = 'ɛ';
			automata.transiciones.push(epsilon_transition);
		}
		//console.log('final_nodes: ', final_nodes);
		let max_x = Math.max(...final_nodes.map( f=> f.centro.x));
		let final = new NodoGrafico(0, new Punto(max_x + 100, inicio.y));
		//console.log('final: ', final);
		automata.nodos.push(final);
		for(let i = 0; i < final_nodes.length; i++) {
			final_nodes[i].centro.x = max_x;
			let epsilon_transition = TransicionGrafica.new(final_nodes[i], final);
			epsilon_transition.texto = 'ɛ';
			automata.transiciones.push(epsilon_transition);
		}
	} else if((exp = expression.l) != undefined) {
		p.x += 100;
		let start_node = new NodoGrafico(0, new Punto(p.x, p.y)) 
		automata.nodos.push(start_node);
		p.x += 100;
		let end_node = new NodoGrafico(0, new Punto(p.x, p.y)) 
		automata.nodos.push(end_node);
		let transition = TransicionGrafica.new(start_node, end_node);
		transition.texto = <string>Object.values(exp)[0];
		automata.transiciones.push(transition);
		//console.log('exp: ', exp);
		return [start_node, end_node];
	} else if((exp = expression.one_or_more) != undefined) {

	} else if((exp = expression.zero_or_more) != undefined) {

	} else if((exp = expression.optional) != undefined) {

	} else if((exp = expression.group) != undefined) {

	} else if((exp = expression.empty) != undefined) {

	} //else if((exp = expression.atom) != undefined) {

	//} else if((exp = expression.range) != undefined) {

	//} else if((exp = expression.anyLiteral) != undefined) {

	//}
	//console.log('exp: ', exp);
	return [new Punto(0, 0), new Punto(0, 0)];
}

function initEventos() {

	let canvas = <HTMLCanvasElement> document.getElementById('canvas');
	let ctx = canvas.getContext('2d')!;
	let automata = new AutomataGrafico(canvas, ctx);
	let mouse_in_canvas = false;

	let input = <HTMLInputElement> document.getElementById('input');
	let form = <HTMLFormElement> document.getElementById('form');
	form.addEventListener('submit', e => {
		e.preventDefault();
		let [_nfa, ast] = build_automata(input.value);
		automata.clear();
		calculate_bounding(automata, ast, new Punto(100, 100));
		console.log(automata.nodos);
		automata.draw();
	});

	canvas.addEventListener('mouseenter', (_) => mouse_in_canvas = true);
	canvas.addEventListener('mouseleave', (_) => mouse_in_canvas = false);
	window.addEventListener('keydown', (e) => automata.cambiar_texto(e.key));
	window.addEventListener('keyup', (e) => { if(e.key == 'Control') automata.control = false });
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
