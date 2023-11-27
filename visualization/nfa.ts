import { TransicionGrafica, NodoGrafico, circuloTresPuntos, AutomataGrafico, Punto } from "./elementos_graficos.js";

export class NFA {

	//tiene para cada elemento el comienzo, fin y nodo tangente
	tangents: Array<[NodoGrafico, NodoGrafico, Punto]>

	constructor() {
		this.tangents = [];
	}

	tangent(automata: AutomataGrafico) {
			this.tangents.forEach((elemento) => {
				let [comienzo, fin, tangente] = elemento;
				let [centro, _radius] = circuloTresPuntos(tangente, comienzo.centro, fin.centro);
				let ang = Math.atan2(tangente.y - centro.y, centro.x - tangente.x) + Math.PI;

				let trans = TransicionGrafica.new(comienzo, fin);
				trans.texto = 'ɛ';
				trans.puntero = new Punto(tangente.x + 30 * Math.cos(ang), tangente.y - 30 * Math.sin(ang));
				trans.modificando = true;
				trans.reversed = true;
				automata.transiciones.push(trans);

				automata.draw();
				trans.modificando = false;
			});
	}

	draw_automata(automata: AutomataGrafico, expression: any, p: Punto) {
		this.calculate_bounding(automata, expression, p);
		this.tangent(automata);
	}

	private calculate_bounding(automata: AutomataGrafico, expression: any, p: Punto): [any[], number] {
		let exp = null;
		if((exp = expression.concatenation) != undefined) {
			let n_expression = exp.length;
			let start_node;
			let [primero, ultimo, altura] = [null, null, 0];
			let lista_total = [[]]
			for(let i = 0; i < n_expression; i++) {
				let [a, aux] = this.calculate_bounding(automata, exp[i], p);
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
				let actual = this.calculate_bounding(automata, exp[i], new Punto(p.x, p.y));
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
			p = new Punto(nodo_final.centro.x, nodo_final.centro.y);
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
			if(typeof exp === 'string') transition.texto = exp;
			else transition.texto = <string> Object.values(exp)[0];

			//////////////////////////////////////////////////////
			automata.ctx.font = "22px serif";
			let long = automata.ctx.measureText(transition.texto).width;
			let diff = Math.max(0, long - (end_node.centro.x - start_node.centro.x) + start_node.radio * 2);
			/////////////////////////////////////////////////////

			p.x += diff;
			end_node.centro.x += diff;

			automata.transiciones.push(transition);
			return [[start_node, end_node], 1];
		} else if((exp = expression.one_or_more) != undefined) {
			let [states, height] = this.calculate_bounding(automata, exp, p);
			let [first, last] = [states[0], states[states.length - 1]];

			let max = Math.max(...states.map(x => x.centro.y));
			let equis = states.filter( x => x.centro.y >= max).sort((a, b) => a.centro.x - b.centro.x);
			let izda = Math.abs(equis[0].centro.x - first.centro.x) <= Math.abs(equis[equis.length - 1].centro.x - last.centro.x) ? equis[0].centro: equis[equis.length - 1].centro;
			this.tangents.push([last, first, izda]);
			return [states, height];
		} else if((exp = expression.zero_or_more) != undefined) {
			let [states, height] = this.calculate_bounding(automata, exp, p);
			let [first, last] = [states[0], states[states.length - 1]];

			let max = Math.min(...states.map(x => x.centro.y));
			let equis = states.filter( x => x.centro.y <= max).sort((a, b) => a.centro.x - b.centro.x);
			let izda = Math.abs(equis[0].centro.x - first.centro.x) <= Math.abs(equis[equis.length - 1].centro.x - last.centro.x) ? equis[0].centro: equis[equis.length - 1].centro;
			this.tangents.push([first, last, izda]);

			max = Math.max(...states.map(x => x.centro.y));
			equis = states.filter( x => x.centro.y >= max).sort((a, b) => a.centro.x - b.centro.x);
			izda = Math.abs(equis[0].centro.x - first.centro.x) <= Math.abs(equis[equis.length - 1].centro.x - last.centro.x) ? equis[0].centro: equis[equis.length - 1].centro;
			this.tangents.push([last, first, izda]);
			return [states, height];

		} else if((exp = expression.optional) != undefined) {
			let [states, height] = this.calculate_bounding(automata, exp, p);
			let [first, last] = [states[0], states[states.length - 1]];

			let max = Math.min(...states.map(x => x.centro.y));
			let equis = states.filter( x => x.centro.y <= max).sort((a, b) => a.centro.x - b.centro.x);
			let izda = Math.abs(equis[0].centro.x - first.centro.x) <= Math.abs(equis[equis.length - 1].centro.x - last.centro.x) ? equis[0].centro: equis[equis.length - 1].centro;
			this.tangents.push([first, last, izda]);
			return [states, height];
		} else if((exp = expression.group) != undefined) {
			return this.calculate_bounding(automata, exp, p);

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
}
