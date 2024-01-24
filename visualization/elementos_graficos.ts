import { Concatenation, Empty, NEW_NFA } from "./new_nfa.js";
import { initSync, build_automata, automata_to_regex } from "../pkg/automata.js";

export class Punto {
    x: number;
    y: number;

    constructor(x: number, y: number) { this.x = x; this.y = y; }

    pos(): Punto { return this; }

    dist(p: Punto) { return Math.sqrt(Math.pow(this.x - p.x, 2) + Math.pow(this.y - p.y, 2)); }

    equals(p: Punto): Boolean { return this.dist(p) <= 0.9; }
}

export class NodoGrafico {
    numero: number;
    centro: Punto;
    radio: number;
    id: number;
    final: boolean;
    visible: boolean;
    name: string;
    ctx: CanvasRenderingContext2D;

    constructor(numero: number, centro: Punto) {
        this.numero = numero;
        this.centro = centro;
        this.radio = 30;
        this.id = 0;
        this.final = false;
        this.name = "";
    }

    pos(): Punto { return this.centro; }

    dist(p: Punto) { return Math.sqrt(Math.pow(this.centro.x - p.x, 2) + Math.pow(this.centro.y - p.y, 2)); }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.beginPath();
        ctx.arc(this.centro.x, this.centro.y, this.radio, 0, 2 * Math.PI);
        ctx.stroke();
        if(this.final) {
            ctx.beginPath();
            ctx.arc(this.centro.x, this.centro.y, 3 * this.radio / 4, 0, 2 * Math.PI);
            ctx.stroke();
        }
        let p = new Punto(this.centro.x, this.centro.y + 15);
        draw_text(p, 0, Math.PI / 2, this.name, this.visible, ctx);
        this.ctx = ctx;
    }

    insterseccion(angulo: number): Punto {
        let x = this.centro.x + this.centro.x * Math.cos(angulo);
        let y = this.centro.y + this.centro.y * Math.sin(angulo);
        return new Punto(x, y);
    }

    set_visible(v: boolean) {
        this.visible = v;
    }

    push_text(t: string) {
        if(this.ctx != undefined && this.ctx.measureText(this.name).width >= this.radio * 2 - this.ctx.measureText(" ").width) return;
        this.name += t;
    }

    pop_text() {
        this.name = this.name.slice(0, -1);
    }
}

function slope_angle(I: Punto, F: Punto): number {
    return Math.atan2(I.y - F.y, F.x - I.x);
}

function draw_text(textPoint: Punto, slope_angle: number, perpendicular_angle: number, text: string, visible: boolean, ctx: CanvasRenderingContext2D) {
    let modulo = perpendicular_angle > 0 ? 10: 20;
    let sp_angle = slope_angle;
    ////angulo texto rotar
    if(sp_angle >= Math.PI / 2 && slope_angle <= Math.PI) {
        sp_angle += Math.PI;
    }
    else if(sp_angle <= -Math.PI / 2 && slope_angle >= - Math.PI) {
        sp_angle += Math.PI;
    }
    let tP = new Punto(textPoint.x, textPoint.y);
    tP.x = tP.x + modulo * Math.cos(perpendicular_angle);
    tP.y = tP.y - modulo * Math.sin(perpendicular_angle);

    let anguloGiratorio = Math.atan2(tP.y, tP.x);
    let radioGiratorio = (new Punto(0, 0)).dist(tP);
    let nuevoX = Math.cos(sp_angle - anguloGiratorio) * radioGiratorio;
    let nuevoY = - Math.sin(sp_angle - anguloGiratorio) * radioGiratorio;

    ctx.rotate(sp_angle);
    ctx.font = "22px serif";
    let longitud = ctx.measureText(text).width;
    nuevoX = nuevoX - longitud / 2;
    ctx.fillText(text, nuevoX, nuevoY);
    if(visible) ctx.fillText('|', nuevoX + longitud, nuevoY);
    ctx.rotate(-sp_angle);
}



export class TransicionGrafica {

    nodoI: NodoGrafico | Punto;
    nodoF: NodoGrafico | Punto;

    aux: number | undefined;
    upper_arc: boolean;
    center: Punto;
    visible: boolean;
    texto: string;

    constructor(nodoI: NodoGrafico | Punto, nodoF: NodoGrafico | Punto, letter?: string) {
        this.nodoI = nodoI;
        this.nodoF = nodoF;
        this.aux = undefined;
        this.visible = false;
        this.texto = (letter == undefined || nodoI instanceof Punto) ? "": letter!;
        this.upper_arc = true;
    }

    push_text(t: string) {
        if(this.nodoI instanceof NodoGrafico) this.texto += t;
    }

    pop_text() {
        if(this.nodoI instanceof NodoGrafico) this.texto = this.texto.slice(0, -1);
    }

    set_visible(v: boolean) {
        if(this.nodoI instanceof NodoGrafico) this.visible = v;
    }

    upper(origin: Punto, target: Punto) {
        let I = this.nodoI.pos(), F = this.nodoF.pos();
        let center_angle = slope_angle(origin, target);
        let t = I.y > F.y ? I: F;
        let angle_transition = slope_angle(origin, t);//[0, -PI]
        if(angle_transition == Math.PI) angle_transition *= -1;
        let condition = (center_angle >= angle_transition && center_angle <= 0) || (center_angle >= 0 && center_angle <= angle_transition + Math.PI);
        if(t == F) return condition;
        else return !condition;
    }

    set_pointer(p: Punto) {
        //this means its a initialization transition
        if(this.nodoF instanceof NodoGrafico && this.nodoI instanceof Punto) {
            this.aux = undefined;
            this.nodoI = new Punto(p.x, p.y);
            return;
        }
        let I = this.nodoI.pos(), F = this.nodoF.pos();
        let medium = new Punto((I.x + F.x) / 2, (I.y + F.y) / 2);
        let [center, radius] = circuloTresPuntos(I, F, p);
        this.upper_arc = this.upper(medium, p);
        this.aux = radius + center.dist(medium) * (this.upper(medium, center) ? 1: -1);
    }

    draw(ctx: CanvasRenderingContext2D) {
        let posI = this.nodoI.pos();
        let posF = this.nodoF.pos();
        let medium = new Punto((posI.x + posF.x) / 2, (posI.y + posF.y) / 2);

        //if we are a straight line, or we are close enough, then we print a line.
        let angle = Math.atan2(posI.y - posF.y, posF.x - posI.x);
        if(this.aux == undefined) {
            ctx.beginPath();
            //only hide the ends of the transition when we are above a node, so there is no distandce between the link and the mouse.
            if(this.nodoI instanceof NodoGrafico) ctx.moveTo(posI.x + 30 * Math.cos(angle), posI.y - 30 * Math.sin(angle));
            else ctx.moveTo(posI.x, posI.y);

            let [endx, endy] = (this.nodoF instanceof NodoGrafico) ? [posF.x - 30 * Math.cos(angle), posF.y + 30 * Math.sin(angle)]: [posF.x, posF.y];
            let final = new Punto(endx, endy), slope = slope_angle(medium, final);
            ctx.lineTo(endx, endy);
            ctx.stroke();
            this.draw_arrow(final, new Punto(final.x - 5 * Math.cos(slope), final.y + 5 * Math.sin(slope)), ctx);
            let reversed = (posI.x > posF.x) ? -1: 1;
            draw_text(medium, -angle, slope_angle(medium, new Punto(medium.x + 10 * reversed *  Math.cos(angle + Math.PI / 2), medium.y - 10 * reversed * Math.sin(angle + Math.PI / 2))), this.texto, this.visible, ctx);
            return;
        }
        let pointer = new Punto(medium.x + this.aux * Math.cos(angle + Math.PI / 2), medium.y - this.aux * Math.sin(angle + Math.PI / 2));
        let [center, radius] = circuloTresPuntos(posI, posF, pointer);
        let offset = 2 * Math.asin((<NodoGrafico>this.nodoI).radio / (2 * radius)) * (this.upper_arc ? -1: 1);

        let left_angle = Math.atan2(center.y - posI.y, posI.x - center.x) + offset;
        let right_angle = Math.atan2(center.y - posF.y, posF.x - center.x) - offset;

        let from = new Punto(center.x + radius * Math.cos(right_angle),  center.y - radius *Math.sin(right_angle));
        let to = new Punto(center.x + radius * Math.cos(right_angle - offset / 4),  center.y - radius *Math.sin(right_angle - offset / 4));
        this.draw_arrow(from, to, ctx);
        if (!this.upper_arc) {
            let aux = left_angle;
            left_angle = right_angle;
            right_angle = aux;
        }
        ctx.beginPath();
        ctx.arc(center.x, center.y, radius, -left_angle, -right_angle);
        ctx.stroke();

        let angulo_nuevo = Math.PI + slope_angle(center, pointer);
        let opposite = new Punto(center.x + Math.cos(angulo_nuevo) * radius, center.y - Math.sin(angulo_nuevo) * radius);
        pointer = (this.upper_arc) ? pointer: opposite;

        draw_text(pointer, -angle, slope_angle(center, pointer), this.texto, this.visible, ctx);
    }

    draw_arrow(from: Punto, to: Punto, ctx: CanvasRenderingContext2D) {
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        let ang = slope_angle(from, to);
        ctx.lineTo(from.x + 10 * Math.cos(ang - 0.6), from.y - 10 * Math.sin(ang - 0.6));
        ctx.lineTo(from.x + 10 * Math.cos(ang + 0.6), from.y - 10 * Math.sin(ang + 0.6));
        ctx.fill();
    }

    dist(p: Punto) {
        let posI = this.nodoI.pos(), posF = this.nodoF.pos();
        let medium = new Punto((posI.x + posF.x) / 2, (posI.y + posF.y) / 2);
        let ang = Math.atan2(posI.y - posF.y, posF.x - posI.x) + Math.PI / 2;
        if(this.aux == undefined) {
            //using heron formula to caluclate area so I can get height of triangle.
            let a = posI.dist(p), b = posF.dist(p), c = posI.dist(posF);
            let s = (a + b + c) / 2;
            let area = Math.sqrt(s * (s - a) * (s - b) * (s - c));
            if(p.dist(medium) > medium.dist(posI)) return Infinity;
            return 2 * area / c;
        }
        let pointer = new Punto(medium.x + this.aux * Math.cos(ang), medium.y - this.aux * Math.sin(ang));
        let [center, radius] = circuloTresPuntos(posI, posF, pointer);
        let condition = this.upper_arc == this.upper(medium, p);

        if(condition) return Math.abs(radius - center.dist(p));
        return Infinity;
    }
}

class SelfTransition extends TransicionGrafica {

    slope: number;
    length: number;

    constructor(nodoI: NodoGrafico, nodoF: NodoGrafico, letter?: string) {
        super(nodoI, nodoF, letter);
    }

    set_pointer(p: Punto) {
        let I = this.nodoI.pos();
        this.slope = slope_angle(I, p);
        this.length = I.dist(p);
    }

    draw(ctx: CanvasRenderingContext2D) {
        let I = this.nodoI.pos();
        if(this.slope == undefined && this.length == undefined) {
            this.slope = Math.PI / 2;
            this.length = 50;
        }
        let pointer = new Punto(I.x + this.length * Math.cos(this.slope), I.y - this.length * Math.sin(this.slope));
        let center = new Punto(I.x + 0.5 * this.length * Math.cos(this.slope), I.y - this.length * 0.5 * Math.sin(this.slope));
        let radius = center.dist(pointer);
        let offset = - 2 * Math.asin((<NodoGrafico>this.nodoI).radio / (2 * radius));
        let ang = Math.atan2(I.y - pointer.y, pointer.x - I.x);
        let right_angle = -Math.PI / 2 - offset - (Math.PI / 2 - ang);
        let left_angle = -Math.PI / 2 + offset - (Math.PI / 2 - ang);

        ctx.beginPath();
        ctx.beginPath();
        ctx.arc(center.x, center.y, radius, -left_angle, -right_angle);
        ctx.stroke();
        draw_text(pointer, - (slope_angle(pointer, I) - Math.PI / 2) % Math.PI , slope_angle(I, pointer), this.texto, this.visible, ctx);
        let from = new Punto(center.x + radius * Math.cos(right_angle),  center.y - radius *Math.sin(right_angle));
        let to = new Punto(center.x + radius * Math.cos(right_angle - offset / 4),  center.y - radius *Math.sin(right_angle - offset / 4));
        this.draw_arrow(from, to, ctx);
    }

    dist(p: Punto) {
        let I = this.nodoI.pos();
        let pointer = new Punto(I.x + this.length * Math.cos(this.slope), I.y - this.length * Math.sin(this.slope));
        let center = new Punto(I.x + 0.5 * this.length * Math.cos(this.slope), I.y - this.length * 0.5 * Math.sin(this.slope));
        let distance = Math.abs(center.dist(pointer) - p.dist(center));
        return distance;
    }
}

export class AutomataGrafico {
    nfa: NEW_NFA;
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    draggin: null | NodoGrafico;
    shaping_transition: null | TransicionGrafica;
    creating_transition: null | TransicionGrafica;
    elemento_seleccionado: any;//cambiar este tipo a cuando cree una interfaz "ElementoGrafico".
    visibilidad: Boolean;//estado de la visibilidad del autómata.
    control: Boolean;

    remove() {
        if(this.elemento_seleccionado != undefined) {
            console.log(this.elemento_seleccionado);
            if(this.elemento_seleccionado instanceof TransicionGrafica) {
                this.nfa.remove_transition(this.elemento_seleccionado);
            } else if(this.elemento_seleccionado instanceof NodoGrafico) {
                let [from, to] = this.nfa.rip_node(this.elemento_seleccionado);
                from.forEach(t => this.nfa.remove_transition(t));
                to.forEach(t => this.nfa.remove_transition(t));
            }
            this.elemento_seleccionado = null;
            this.draw();

            let nfa = this.nfa;
            let IR_NFA = new Map<string, Array<string>>;

            let n = nfa.nodes.length;
            // we set the number to i + 1, becasue we will create the inital and end transitions manually since they are variable.
            for(let i = 0; i < n; i++) {
                nfa.nodes[i].numero = i + 1;
                if(nfa.nodes[i].final) {
                    IR_NFA.set(`(${i+1}, ${n+1})`, ["ε"]);
                }
            }

            console.log('nodes: ', nfa.nodes);

            for(let t of nfa.transitions) {
                let I: any;
                //if the initial point is a Node, then its a normal transition
                //otherwise it if its a `Punto`, that means its the representation of 
                //the first state;
                if(t.nodoI instanceof NodoGrafico) I = (t.nodoI as NodoGrafico).numero;
                else I = 0;
                let F = (t.nodoF as NodoGrafico).numero, key = `(${I}, ${F})`, text = t.texto;
                if(I == 0) text = "ε";
                if(IR_NFA.get(key) == undefined) IR_NFA.set(key, []);
                IR_NFA.get(key)!.push(t.texto);
            }
            let new_IR_NFA = new Map(
                Array.from(IR_NFA, ([key, value]) => {
                    const inp = key.replace(/[()]/g, '');
                    const [k1, k2] = inp.split(',').map(x => parseInt(x.trim()));
                    return [[k1, k2], value]
                })
            );
            console.log('NFA sent to Rust: ', new_IR_NFA);
            console.log('from rust: ', automata_to_regex(new_IR_NFA));

        }
    }

    constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.nfa = new Empty();
        this.control = false;
    }

    clear() {
        //this.nfa.nodes = new Array();
        //this.nfa.transitions = new Array();
        this.nfa = new Empty();
        this.draggin = null;
        this.shaping_transition = null;
        this.creating_transition = null;
        this.elemento_seleccionado = null;
        this.control = false;
    }

    background() {
        if(this.elemento_seleccionado != null) {
            let style = this.ctx.strokeStyle;
            let style2 = this.ctx.fillStyle;
            this.ctx.strokeStyle = 'blue';
            this.ctx.fillStyle = 'blue';
            if(this.visibilidad) {
                this.elemento_seleccionado.set_visible(true);
                this.elemento_seleccionado.draw(this.ctx);
                this.elemento_seleccionado.set_visible(false);
            } else {
                this.elemento_seleccionado.draw(this.ctx);
            }
            this.ctx.strokeStyle = style;
            this.ctx.fillStyle = style2;
        }
    }

    cambiar_texto(texto: string) {
        if(this.nfa == undefined) return;
        if(texto == 'Control') this.control = true;

        if(this.elemento_seleccionado != null) {
            if(this.control && texto == 'v'){
                navigator.clipboard.readText().then(t => this.elemento_seleccionado.texto += t);
            } else if(texto.length == 1) {
                this.elemento_seleccionado.push_text(texto);
            } else if(texto == 'Backspace') {
                this.elemento_seleccionado.pop_text();
            } else if(texto == 'Enter') {
                this.elemento_seleccionado = null;
            }
        }
        this.draw();
    }

    draw() {
        if(this.nfa == undefined) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.nfa.transitions.forEach(n => n.draw(this.ctx));

        this.nfa.nodes.forEach(n => n.draw(this.ctx));
        this.ctx.beginPath();

        if(this.creating_transition != null) this.creating_transition.draw(this.ctx);

        this.background();
    }

    closest_circle(p: Punto): NodoGrafico | null {
        let seleccionados: NodoGrafico[] = [];
        for (let idx = 0; idx < this.nfa.nodes.length; idx++) {
            const element = this.nfa.nodes[idx];
            if(element.dist(p) <= element.radio) {
                seleccionados.push(element);
            }
        }

        let m = -1;
        let closest: NodoGrafico | null = null;

        for (let idx = 0; idx < seleccionados.length; idx++) {
            const element = seleccionados[idx];
            if(element.id > m) {
                closest = element;
                m = element.id;
            }
        }
        return closest;
    }

    closest_line(p: Punto): TransicionGrafica | null {
        let epsilon = 10;
        let closest: TransicionGrafica | null = null;
        let minimo = Infinity;
        for (let idx = 0; idx < this.nfa.transitions.length; idx++) {
            const element = this.nfa.transitions[idx];
            let distancia = element.dist(p);
            if(distancia <= epsilon && distancia < minimo) {
                closest = element;
            }
        }
        return closest;
    }

    //click down(right click and left click)
    //    - Left click 
    //			create Node, if you are in Node, you are draggin it
    //			if there is a line, reshaping it
    //    - Right click create a link
    create_node_or_link(evt: MouseEvent) {
        evt.preventDefault();
        const rect = this.canvas.getBoundingClientRect()
        const p = new Punto( evt.clientX - rect.left, evt.clientY - rect.top);

        let circle = this.closest_circle(p);
        this.elemento_seleccionado = null;
        if(evt.button === 0) { //left-click
            if(circle != null) {//hay un circulo, así que lo hemos seleccionado(para moverlo)
                //si pulsa 'control' mientras pulsa el nodo se convierte en nodo final.
                if(this.control) {
                    circle.final = true;
                } else {
                    this.draggin = circle;
                    this.elemento_seleccionado = circle;
                }
            } else {
                let linea = this.closest_line(p);
                //hay linea, así que la movemos.
                if(linea != null) {
                    //si tenemos 'control' queremos cambiar la transición 
                    if(this.control) {
                        //if there is already a transition, we remove it, because we are going to recreate it now
                        let idx: number = this.nfa.transitions.findIndex(tr => tr == linea);
                        if(idx != -1) this.nfa.transitions.splice(idx, 1);

                        this.creating_transition = new TransicionGrafica(linea.nodoI, p, linea.texto);
                    } else {
                        this.shaping_transition = linea;
                        this.elemento_seleccionado = linea;
                    }
                }
                else {//no hay nada, creamos un nuevo nodo.
                    this.nfa.nodes.push(new NodoGrafico(1, p));
                }
            }
        } else if(evt.button == 2) { //right-click
            let inicio = (circle == null) ? p : circle;
            this.creating_transition =new TransicionGrafica(inicio, p);
        }

        this.draw();
    }

    //move mouse
    //    - If you were draggin, update circle position
    //    - If you were reshaping update line position
    movimiento(evt: MouseEvent) {
        evt.preventDefault();
        const rect = this.canvas.getBoundingClientRect()
        const p = new Punto( evt.clientX - rect.left, evt.clientY - rect.top);

        if(this.draggin != null) {
            this.draggin.centro = p;
            this.draw();
        } else if(this.creating_transition != null) {
            this.creating_transition.nodoF = p;
            this.draw();
        } else if(this.shaping_transition != null) {
            //this.shaping_transition.modificando = true;
            this.shaping_transition.set_pointer(p);
            this.draw();
        }

    }

    //release click
    //    - If you were draggin, you are not anymore
    //    - If you were creating link, if there is Node in current position, instantiate that link
    //    - If you were reshaping youre not anymore
    mouse_release(evt: MouseEvent) {
        evt.preventDefault();
        const rect = this.canvas.getBoundingClientRect()
        const p = new Punto(evt.clientX - rect.left, evt.clientY - rect.top);

        this.draggin = null;
        let t = this.creating_transition;
        if(t != null) {
            let circle = this.closest_circle(p);
            if(circle != null) {
                if(circle == t.nodoI) t = new SelfTransition(circle, circle, t.texto);
                else t.nodoF = circle;
                this.nfa.transitions.push(t);
            }
        }
        this.creating_transition = null;
        this.shaping_transition = null;
        this.draw();
    }
}

export function circuloTresPuntos(p1: Punto, p2: Punto, p3: Punto): [Punto, number] {
    let [x1, x2, x3] = [p1.x, p2.x, p3.x];
    let [y1, y2, y3] = [p1.y, p2.y, p3.y];

    let x12 = x1 - x2;
    let x13 = x1 - x3;

    let y12 = y1 - y2;
    let y13 = y1 - y3;

    let y31 = y3 - y1;
    let y21 = y2 - y1;

    let x31 = x3 - x1;
    let x21 = x2 - x1;

    // x1^2 - x3^2
    let sx13 = Math.pow(x1, 2) - Math.pow(x3, 2);

    // y1^2 - y3^2
    let sy13 =Math.pow(y1, 2) - Math.pow(y3, 2);

    let sx21 =Math.pow(x2, 2) - Math.pow(x1, 2);
    let sy21 =Math.pow(y2, 2) - Math.pow(y1, 2);

    let f = ((sx13) * (x12) + (sy13) * (x12) + (sx21) * (x13) + (sy21) * (x13)) / (2 * ((y31) * (x12) - (y21) * (x13)));
    let g = ((sx13) * (y12) + (sy13) * (y12) + (sx21) * (y13) + (sy21) * (y13)) / (2 * ((x31) * (y12) - (x21) * (y13)));

    let c = -Math.pow(x1, 2) -Math.pow(y1, 2) - 2 * g * x1 - 2 * f * y1;

    // eqn of circle be x^2 + y^2 + 2*g*x + 2*f*y + c = 0
    // where centre is (h = -g, k = -f) and radius r
    // as r^2 = h^2 + k^2 - c
    let h = -g;
    let k = -f;
    let sqr_of_r = h * h + k * k - c;

    // r is the radius
    let r = Math.sqrt(sqr_of_r);

    return [new Punto(h, k), r];
}
