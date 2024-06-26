import { TransicionGrafica, NodoGrafico, circuloTresPuntos, Punto } from "./elementos_graficos.js";
export class NEW_NFA {
    constructor() {
        this.nodes = [];
        this.transitions = [];
    }
    copy() {
        return Object.create(this);
    }
    updated_start() {
        return this.start;
    }
    updated_end() {
        return this.end;
    }
    dump_into(automata) {
        //automata.nodos.push(...this.nodes);
        //automata.transiciones.push(...this.transitions);
        automata.nfa = this;
    }
    highest() {
        return this.nodes.reduce((previus, current_node) => previus.centro.y > current_node.centro.y ? previus : current_node, this.start);
    }
    lowest() {
        return this.nodes.reduce((previus, current_node) => previus.centro.y < current_node.centro.y ? previus : current_node, this.start);
    }
    height() {
        return this.highest().centro.y - this.lowest().centro.y + 100;
    }
    shift(dx, dy) {
        this.nodes.forEach(node => {
            node.centro.x += dx;
            node.centro.y += dy;
        });
    }
    remove_transition(t) {
        let idx = this.transitions.findIndex(it => it == t);
        this.transitions.splice(idx, 1);
    }
    //Removes the given state, and returns the transition it was involved
    //so the caller of the function handles them how they want
    //  [ ] removing them
    //  [ ] changing the state to another valid state
    //  [ ] ...
    //                           [  from node        ,   to node    ]
    rip_node(node) {
        let from = [], to = [];
        let n = this.transitions.length;
        let self_transitions = [];
        for (let i = 0; i < n; i++) {
            const transition = this.transitions[i];
            let I = transition.nodoI, F = transition.nodoF;
            //remove transition
            if (I == F && I == node)
                self_transitions.push(this.transitions[i]);
            else if (I == node)
                from.push(transition);
            else if (F == node)
                to.push(transition);
        }
        //safe removal of self transitions
        for (let t of self_transitions) {
            let idx = this.transitions.findIndex(tt => t == tt);
            this.transitions.splice(idx, 1);
        }
        //remove node
        let index = this.nodes.findIndex(n => n == node);
        this.nodes.splice(index, 1);
        //if(node == this.start) this.start = this.nodes[0];
        //else if(node == this.end) this.end = this.nodes[this.nodes.length - 1];
        return [from, to];
    }
}
export class Concatenation extends NEW_NFA {
    constructor(start) {
        super();
        this.start = start;
        this.end = start;
        this.nodes.push(start);
    }
    //this implementation represents the concatenation of two automatas
    //avoiding to link them with the ε-transition. Instead I rip the first
    //state of the second automata and merge it with the las one of the first automata.
    push(...next) {
        let result = this.copy();
        for (let nfa of next) {
            let [from, to] = nfa.rip_node(nfa.start);
            //replace the transitions so that they led to(or come from) the final state
            //of the first automata
            from.forEach(t => t.nodoI = result.end);
            to.forEach(t => t.nodoF = result.end);
            nfa.shift(result.end.centro.x - nfa.start.centro.x, 0);
            //dump the nodes taking into account removed node of the secont automata into this automata
            result.nodes.push(...nfa.nodes);
            //dump the transitions of the secont automata into this automata
            result.transitions.push(...nfa.transitions);
            nfa.start = result.end;
            result.end = nfa.end;
        }
        return result;
    }
}
export class Empty extends NEW_NFA {
    constructor() {
        super();
    }
    push(...next) {
        throw "empty remains empty";
    }
}
export class Literal extends NEW_NFA {
    constructor(start, letter) {
        super();
        let s = new NodoGrafico(0, new Punto(start.x, start.y));
        start.x += 100;
        let e = new NodoGrafico(0, new Punto(start.x, start.y));
        start.x += 100;
        this.nodes.push(s, e);
        this.start = s;
        this.end = e;
        //this.transitions.push(TransicionGrafica.new(s, e, letter));
        this.transitions.push(new TransicionGrafica(s, e, letter));
    }
    push(...next) {
        return this.push(...next);
    }
}
export class Union extends NEW_NFA {
    constructor(start) {
        super();
        this.start = start;
        this.end = start;
        this.nodes.push(start);
    }
    //this implementation represents the concatenation of two automatas
    //avoiding to link them with the ε-transition. Instead I rip the first
    //state of the second automata and merge it with the las one of the first automata.
    push(...next) {
        let union = this.copy();
        let node = new NodoGrafico(0, new Punto(union.start.centro.x, union.start.centro.y));
        union.end = node;
        // WARNING: IDK i moved it down.
        // union.nodes.push(node);
        let unitary_heigtht = next.reduce((acc, a) => acc + a.height() / 100, 0);
        let total_height = ((unitary_heigtht - 1) / 2) * 100 + union.start.pos().y;
        next.forEach(nfa => {
            //console.log('desde ', nfa.end, ' hacia: ', union.end);
            union.transitions.push(new TransicionGrafica(union.start, nfa.start, "ε"));
            union.transitions.push(new TransicionGrafica(nfa.end, union.end, "ε"));
            union.nodes.push(...nfa.nodes);
            union.transitions.push(...nfa.transitions);
        });
        union.nodes.push(node);
        for (let nfa of next) {
            let anchor = nfa.highest().pos();
            nfa.shift(union.start.pos().x + 100 - nfa.start.pos().x, anchor.y - total_height);
            total_height -= nfa.height();
        }
        let max_x = next.reduce((acc, a) => Math.max(a.end.pos().x, acc), 0);
        next.forEach(a => a.end.centro.x = max_x);
        union.end.centro.x = max_x + 100;
        return union;
    }
}
export class NFA_BUILDER {
    constructor() {
        this.tangents = [];
    }
    draw_tangents(automata) {
        for (let [transition, nodes_from] of this.tangents) {
            let from = transition.nodoI, to = transition.nodoF;
            let m_h = 0, point = new Punto(0, 0);
            //the circunference is in the upper side.
            const positive = from.pos().x <= to.pos().x;
            for (let node of nodes_from.nodes) {
                let center = new Punto(node.centro.x, positive ? node.centro.y - 0.001 : node.centro.y + 0.001);
                //skip from and to states, and the states in the same x-axis
                if (node == from || node == to)
                    continue;
                let [centro, radius] = circuloTresPuntos(from.centro, to.centro, center);
                let ang = Math.atan2(center.y - centro.y, centro.x - center.x) + Math.PI;
                let tang_point = new Punto(center.x + 35 * Math.cos(ang), center.y - 35 * Math.sin(ang));
                if (positive && tang_point.pos().y <= from.pos().y ||
                    !positive && tang_point.pos().y >= from.pos().y) {
                    let height = radius + (from.centro.pos().y - centro.y) * (positive ? 1 : -1);
                    if (m_h < height) {
                        m_h = height;
                        point = tang_point;
                    }
                }
            }
            transition.set_pointer(m_h == 0 ? new Punto((from.pos().x + to.pos().x) / 2, from.pos().y + (30 + 15) * (positive ? 1 : -1)) : point); //radius + 15
            automata.draw();
        }
    }
    draw_automata(automata, expression, p) {
        console.log('expression: ', expression);
        let nfa = this.calculate_bounding(automata, expression, p);
        console.log(nfa.transitions);
        if (nfa instanceof Empty) {
            automata.draw();
            return;
        }
        nfa.end.final = true;
        nfa.dump_into(automata);
        nfa.transitions.push(new TransicionGrafica(new Punto(nfa.start.centro.x - 25, nfa.start.centro.y - 80), nfa.start));
        this.draw_tangents(automata);
    }
    calculate_bounding(automata, expression, p) {
        var _a;
        let add_empty = (e) => {
            let concat = new Concatenation(new NodoGrafico(0, new Punto(p.x, p.y)));
            let left = this.calculate_bounding(automata, e, p);
            let result = concat.push(left, new Literal(p, "ε"));
            return [left, result];
        };
        let exp;
        if ((exp = expression.concatenation) != undefined) {
            let concatenation = new Concatenation(new NodoGrafico(0, new Punto(p.x, p.y)));
            return concatenation.push(...exp.map(e => this.calculate_bounding(automata, e, p)));
        }
        else if ((exp = expression.union) != undefined) {
            let union = new Union(new NodoGrafico(0, new Punto(p.x, p.y)));
            return union.push(...exp.map(e => this.calculate_bounding(automata, e, p)));
        }
        else if ((exp = expression.l) != undefined) {
            const event = exp.atom == "." ? "\\." : (_a = exp.atom) !== null && _a !== void 0 ? _a : ".";
            return new Literal(p, event);
        }
        else if ((exp = expression.one_or_more) != undefined) {
            //using result.start, and not left.start, becasue 
            //when concatenating, left.start is ripped.
            let [left, result] = add_empty(exp);
            let t = new TransicionGrafica(left.updated_end(), result.updated_start(), "ε");
            result.transitions.push(t);
            this.tangents.push([t, left]);
            return result;
        }
        else if ((exp = expression.zero_or_more) != undefined) {
            let [left, result] = add_empty(exp);
            let t = new TransicionGrafica(result.updated_start(), left.updated_end(), "ε");
            result.transitions.push(t);
            this.tangents.push([t, left]);
            let tt = new TransicionGrafica(left.updated_end(), result.updated_start(), "ε");
            result.transitions.push(tt);
            this.tangents.push([tt, left]);
            return result;
        }
        else if ((exp = expression.optional) != undefined) {
            let [left, result] = add_empty(exp);
            let t = new TransicionGrafica(result.updated_start(), left.updated_end(), "ε");
            result.transitions.push(t);
            this.tangents.push([t, left]);
            return result;
        }
        else if ((exp = expression.group) != undefined) {
            return this.calculate_bounding(automata, exp, p);
        }
        else if (expression === "empty") {
            return new Empty();
        }
        else if ((exp = expression.any) != undefined || (exp = expression.anyBut) != undefined) {
            let text = exp.map(x => {
                if (x.atom != undefined)
                    return x.atom;
                else
                    return `${x.range.start}-${x.range.end}`;
            }).join('');
            text = (expression.any != undefined) ? `[${text}]` : `[^${text}]`;
            automata.ctx.font = "22px serif";
            let long = automata.ctx.measureText(text).width;
            let literal = new Literal(p, text);
            literal.end.centro.x += long;
            return literal;
        }
        throw "Invalid Input";
    }
}
