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

function calculate_bounding(automata: AutomataGrafico, expression: any, p: Punto): [any[], number] {
	let exp = null;
	if((exp = expression.concatenation) != undefined) {
		let n_expression = exp.length;
		let start_node;
		let [primero, ultimo, altura] = [null, null, 0];
		let lista_total = [[]]
		for(let i = 0; i < n_expression; i++) {
			let [a, aux] = calculate_bounding(automata, exp[i], p);
			altura = Math.max(aux, altura);
			lista_total = lista_total.concat(a);
			let [s, e] = [a[0], a[a.length-1]];

			p = new Punto(e.centro.x, e.centro.y);
			p.x += 100;

			if(i == 0) primero = s;
			else if(i == (n_expression-1)) ultimo = e;
			if(i > 0) {
				let epsilon_transition = TransicionGrafica.new(start_node, s);
				epsilon_transition.texto = 'ɛ';
				automata.transiciones.push(epsilon_transition);
			}
			start_node = e;
		}
		console.log('listatotal: ', lista_total.slice(1));
		return [lista_total.slice(1), altura];
	} else if((exp = expression.union) != undefined) {
		//////////////////////////////////////////////////////////
		//////////////////////////////////////////////////////////

		let boundings = []
		let n = exp.length;
		let inicio = new Punto(p.x, p.y);
		p.x += 100;
		let start_node = new NodoGrafico(0, inicio);
		automata.nodos.push(start_node);
		let altura_total = 0;
		// calcular todos los boundings y meterlos en una lista.
		let espacio = 100;
		// calcular la suma de las alturas.
		for(let i = 0; i < n; i++) {
			let actual = calculate_bounding(automata, exp[i], new Punto(p.x, p.y));
			altura_total += actual[1];
			boundings.push(actual);
			let trans = TransicionGrafica.new(start_node, actual[0][0]);
			trans.texto = 'ɛ';
			automata.transiciones.push(trans);
		}


		let max_x = Math.max(...boundings.map(f => Math.max(...f[0].map(xx => xx.centro.x))));
		boundings.forEach(f => f[0][f[0].length - 1].centro.x = max_x);
		console.log('max: ', max_x);
		let nodo_final = new NodoGrafico(0, new Punto(max_x + 100, start_node.centro.y));
		automata.nodos.push(nodo_final);

		let alt_t = altura_total;
		altura_total *= 100;
		let contador_altura = -(altura_total-100) / 2;
		// dividir las alturas verticalmente.
		for(let i = 0; i < Math.floor(n / 2); i++) {
			let len_len = boundings[i][0].length;
			let trans = TransicionGrafica.new(boundings[i][0][len_len-1], nodo_final);
			trans.texto = 'ɛ';
			automata.transiciones.push(trans);
			//mover todos los nodos de el boundings[i];
			for(let k = 0; k < boundings[i][0].length; k++) {
				boundings[i][0][k].centro.y += contador_altura;
			}
			contador_altura += (boundings[i][1] * 100);
		}

		//let diff = (altura_total) / 2;
		//console.log('diff: ', diff);

		//start_node.centro.y += diff;
		//nodo_final.centro.y += diff;
		p = new Punto(nodo_final.centro.x, nodo_final.centro.y);
		//if(alt_t % 2 == 0) contador_altura += 100

		console.log('start_node: ', start_node);

		//meter padding
		
		for(let i = Math.floor(n / 2); i < n; i++) {
			let len_len = boundings[i][0].length;
			let trans = TransicionGrafica.new(boundings[i][0][len_len-1], nodo_final);
			trans.texto = 'ɛ';
			automata.transiciones.push(trans);
			for(let k = 0; k < boundings[i][0].length; k++) {
				boundings[i][0][k].centro.y += contador_altura;
			}
			contador_altura += (boundings[i][1] * 100);
		}


		console.log('altura de la union: ', alt_t);
		return [[start_node].concat(...boundings.map(x => x[0]), nodo_final), alt_t];

		//////////////////////////////////////////////////////////
		//////////////////////////////////////////////////////////
	} else if((exp = expression.l) != undefined) {
		let start_node = new NodoGrafico(0, new Punto(p.x, p.y)) 
		automata.nodos.push(start_node);
		p.x += 100;
		let end_node = new NodoGrafico(0, new Punto(p.x, p.y)) 
		automata.nodos.push(end_node);
		let transition = TransicionGrafica.new(start_node, end_node);
		transition.texto = <string> Object.values(exp)[0];
		automata.transiciones.push(transition);
		return [[start_node, end_node], 1];
	} else if((exp = expression.one_or_more) != undefined) {

	} else if((exp = expression.zero_or_more) != undefined) {

	} else if((exp = expression.optional) != undefined) {

	} else if((exp = expression.group) != undefined) {
		return calculate_bounding(automata, exp, p);

	} else if((exp = expression.empty) != undefined) {

	} else if((exp = expression.any) != undefined) {
		let start_node = new NodoGrafico(0, new Punto(p.x, p.y)) 
		automata.nodos.push(start_node);
		p.x += 100;
		let end_node = new NodoGrafico(0, new Punto(p.x, p.y)) 
		automata.nodos.push(end_node);
		let transition = TransicionGrafica.new(start_node, end_node);

		let literals = (<Array<any>>exp).map(x => {
			if (x.atom != undefined) return x.atom;
			else return `[${x.range.start}-${x.range.end}]`;
		});
		let text = literals.join(',');

		//////////////////////////////////////////////////////
		automata.ctx.font = "22px serif";
		let long = automata.ctx.measureText(text).width;
		let diff = Math.max(0, long - (end_node.centro.x - start_node.centro.x) + start_node.radio * 2);
		/////////////////////////////////////////////////////

		p.x += diff;
		end_node.centro.x += diff;

		transition.texto = text;
		automata.transiciones.push(transition);
		return [[start_node, end_node], 1];
	} else if((exp = expression.anyBut) != undefined) {
		let start_node = new NodoGrafico(0, new Punto(p.x, p.y)) 
		automata.nodos.push(start_node);
		p.x += 100;
		let end_node = new NodoGrafico(0, new Punto(p.x, p.y)) 
		automata.nodos.push(end_node);

		let transition = TransicionGrafica.new(start_node, end_node);

		let literals = (<Array<any>>exp).map(x => {
			if (x.atom != undefined) return x.atom;
			else return `[${x.range.start}-${x.range.end}]`;
		});

		let text = '~(' + literals.join(',') + ')';
		//////////////////////////////////////////////////////
		automata.ctx.font = "22px serif";
		let long = automata.ctx.measureText(text).width;
		let diff = Math.max(0, long - (end_node.centro.x - start_node.centro.x) + start_node.radio * 2);
		/////////////////////////////////////////////////////

		p.x += diff;
		end_node.centro.x += diff;

		transition.texto = text;

		automata.transiciones.push(transition);
		return [[start_node, end_node], 1];
	}
	return [[], NaN];
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
		let ast = build_automata(input.value);
		console.log('ast: ', ast);
		automata.clear();
		calculate_bounding(automata, ast, new Punto(250, 500));
		automata.nodos.push(new NodoGrafico(0, new Punto(50, 500)));
		//automata.nodos.push(new NodoGrafico(0, new Punto(110, 210)));
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
