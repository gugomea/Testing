import { NodoLogico, AutomataLogico } from "./elementos_logicos.js";
import { Concatenation, Empty, NEW_NFA } from "./new_nfa.js";

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
    nodo: NodoLogico;
    centro: Punto;
    radio: number;
    id: number;

    constructor(numero: number, centro: Punto) {
        this.numero = numero;
        this.centro = centro;
        this.radio = 30;
        this.id = 0;
    }

    pos(): Punto { return this.centro; }

    dist(p: Punto) { return Math.sqrt(Math.pow(this.centro.x - p.x, 2) + Math.pow(this.centro.y - p.y, 2)); }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.beginPath();
        ctx.arc(this.centro.x, this.centro.y, this.radio, 0, 2 * Math.PI);
        ctx.stroke();
    }

    insterseccion(angulo: number): Punto {
        let x = this.centro.x + this.centro.x * Math.cos(angulo);
        let y = this.centro.y + this.centro.y * Math.sin(angulo);
        return new Punto(x, y);
    }
}

export class TransicionGrafica {
    nombre: string;
    nodoI: NodoGrafico | Punto;
    nodoF: NodoGrafico | Punto;
    puntero: Punto
    centro: Punto;
    radio: number;
    aux: number;
    modificando: Boolean;
    reversed: Boolean;
    anguloI: number;
    anguloD: number;
    visible: Boolean;
    texto: string;

    constructor(nodoI: NodoGrafico | Punto, nodoF: NodoGrafico | Punto, letter?: string) {
        this.nodoI = nodoI;
        this.nodoF = nodoF;
        this.aux = 0;
        this.puntero = new Punto(0, 0);
        this.modificando = true;
        this.reversed = false;
        this.visible = false;
        this.texto = (letter == undefined) ? "": letter!;
    }

    static new(nodoI: NodoGrafico, nodoF: NodoGrafico, letter?: string) : TransicionGrafica {
        let t = new TransicionGrafica(nodoI, nodoF);
        t.aux = 0.1;
        t.modificando = false;
        t.texto = (letter == undefined) ? "": letter!;
        return t;
    }

    
    draw(ctx: CanvasRenderingContext2D) {
        let posI = this.nodoI.pos();
        let posF = this.nodoF.pos();

        //if(this.nodoI == this.nodoF && this.nodoI instanceof NodoGrafico) {
        //    this.self_transition(ctx);
        //    return;
        //}

        if(this.aux == 0 ) {
            if(!this.modificando) {
                this.aux = 0.1;
                this.draw(ctx);
                return;
            }
            this.puntero = new Punto((posI.x + posF.x) / 2, (posI.y + posF.y) / 2);
            ctx.beginPath();
            ctx.moveTo(posI.x, posI.y);
            ctx.lineTo(posF.x, posF.y);
            ctx.stroke();
            return;
        }

        let medio = new Punto((posI.x + posF.x) / 2, (posI.y + posF.y) / 2);
        if(!this.modificando) {
            //creamos el punto a partir de la mitad(el punto es la perpendicular)
            let angulo = Math.PI / 2 + Math.atan2(medio.y - posF.y, posF.x - medio.x);
            medio.x = medio.x + this.aux * Math.cos(angulo);
            medio.y = medio.y + (-1) * this.aux * Math.sin(angulo);
            this.puntero = medio
        } 

        let [centro, radio] = circuloTresPuntos(posI, posF, this.puntero);
        this.centro = centro;
        this.radio = radio;

        if(this.modificando) {
            let Alpha_arriba = Math.PI / 2 + Math.atan2(medio.y - posF.y, posF.x - medio.x);
            let Alpha_abajo = - Math.PI + Alpha_arriba;
            let modulo = 10;
            let arriba_punto = new Punto(medio.x + Math.cos(Alpha_arriba) * modulo, medio.y - Math.sin(Alpha_arriba) * modulo);
            let abajo_punto = new Punto(medio.x + Math.cos(Alpha_abajo) * modulo, medio.y - Math.sin(Alpha_abajo) * modulo);
            let dis_arriba = arriba_punto.dist(this.puntero);
            let dis_abajo = abajo_punto.dist(this.puntero);

            let encima = (dis_arriba < dis_abajo) ? true: false;
            this.reversed = !encima;
            dis_arriba = arriba_punto.dist(this.centro);
            dis_abajo = abajo_punto.dist(this.centro);
            encima = (dis_arriba <= dis_abajo) ? true: false;
            let centro_esta_encima = encima;

            let mult = centro_esta_encima ? -1: 1;
            if(this.reversed) {
                this.aux = this.radio + this.centro.dist(medio) * mult;
                this.aux = this.aux * (-1);
            } else {
                this.aux = this.radio - (this.centro.dist(medio)) * mult;
            }
        }

        let multe = this.reversed ? 1: -1;
        let offset = 2 * Math.asin((<NodoGrafico>this.nodoI).radio / (2 * this.radio)) * multe;

        let anguloIzda = Math.atan2(centro.y - posI.y ,posI.x - centro.x) + offset;
        let anguloDcha = Math.atan2(centro.y - posF.y ,posF.x - centro.x) - offset;

        //////////DIBUJAR FLECHA
        let xF = this.centro.x + (6 + this.radio) * Math.cos(anguloDcha - offset / 4);
        let yF = this.centro.y - (6 + this.radio) * Math.sin(anguloDcha - offset / 4);
        let xF2 = this.centro.x + (- 6 + this.radio) * Math.cos(anguloDcha - offset / 4);
        let yF2 = this.centro.y - (- 6 + this.radio) * Math.sin(anguloDcha - offset / 4);

        let xI = this.centro.x + this.radio * Math.cos(anguloDcha);
        let yI = this.centro.y - this.radio * Math.sin(anguloDcha);

        ctx.beginPath();
        ctx.moveTo(xF, yF);
        ctx.lineTo(xI, yI);
        ctx.lineTo(xF2, yF2);
        ctx.fill();
        //////////DIBUJAR FLECHA

        if(this.reversed) {
            let aux = anguloIzda;
            anguloIzda = anguloDcha;
            anguloDcha = aux;
        }


        this.anguloI = anguloIzda;
        if(anguloIzda > Math.PI) this.anguloI= 2*Math.PI - anguloIzda;
        else if(anguloIzda < -Math.PI) this.anguloI= 2*Math.PI + anguloIzda;

        this.anguloD = anguloDcha;
        if(anguloDcha > Math.PI) this.anguloD= 2*Math.PI - anguloDcha;
        else if(anguloDcha < -Math.PI) this.anguloD= 2*Math.PI + anguloDcha;

        ctx.beginPath();
        ctx.arc(centro.x, centro.y, radio, -anguloIzda, -anguloDcha);
        ctx.stroke();

        /////////DIBUJAR TEXTO
        let medioGiratorio =  new Punto((posI.x + posF.x) / 2, (posI.y + posF.y) / 2);
        let anguloaux = Math.PI / 2 + Math.atan2(medioGiratorio.y - posF.y, posF.x - medioGiratorio.x);
        let angulo = Math.atan2(posF.y - medioGiratorio.y, posF.x - medioGiratorio.x);
        medioGiratorio.x = medioGiratorio.x + this.aux * Math.cos(anguloaux);
        medioGiratorio.y = medioGiratorio.y + (-1) * this.aux * Math.sin(anguloaux);

        let anguloGiratorio = Math.atan2(medioGiratorio.y, medioGiratorio.x);

        ////angulo texto rotar
        if(angulo >= Math.PI / 2 && angulo <= Math.PI) {
            angulo += Math.PI;
        }
        else if(angulo <= -Math.PI / 2 && angulo >= - Math.PI) {
            angulo += Math.PI;
        }
        ////angulo texto rotar

        let radioGiratorio = (new Punto(0, 0)).dist(medioGiratorio);
        let nuevoX = Math.cos(angulo - anguloGiratorio) * radioGiratorio;
        let nuevoY = - Math.sin(angulo - anguloGiratorio) * radioGiratorio;


        ctx.rotate(angulo);
        ctx.font = "22px serif";
        //this.texto = "ε-Transición";
        let longitud = ctx.measureText(this.texto).width;

        nuevoX = nuevoX - longitud / 2;
        if(this.reversed && posF.x >= posI.x || !this.reversed && posF.x <= posI.x) nuevoY = nuevoY + 22;
        else nuevoY = nuevoY - 6;

        ctx.fillText(this.texto, nuevoX, nuevoY);

        if(this.visible) ctx.fillText('|', nuevoX + longitud, nuevoY);

        ctx.rotate(-angulo);
        /////////DIBUJAR TEXTO
    }

    dist(p: Punto) {
        if(this.aux == 0) {
            let posF = this.nodoF.pos();
            let posI = this.nodoI.pos();
            let angulo = Math.atan2(posI.y - posF.y, posF.x - posI.x);
            let d1 = Math.sqrt(Math.cos(angulo)*Math.cos(angulo) + Math.sin(angulo)*Math.sin(angulo)) * posI.dist(posF);
            let d2 = Math.sqrt(Math.cos(angulo)*Math.cos(angulo) + Math.sin(angulo)*Math.sin(angulo)) * posI.dist(p);
            return Math.abs(d1 - d2);
        } else {
            ///SENTIDO HORARIO
            let final = this.anguloD;
            let inicio = this.anguloI;
            let anguloPuntero = Math.atan2(this.centro.y - p.y ,p.x - this.centro.x);
            console.log('inicio:', inicio);
            console.log('final:', final);
            console.log('puntero: ', anguloPuntero);

            let condicion = anguloPuntero >= final && anguloPuntero <= inicio;
            if(inicio > 0 && final > 0 && inicio <= final) {
                condicion = anguloPuntero <= inicio || anguloPuntero >= final;
            } else if(inicio < 0 && final < 0 && inicio <= final) {
                condicion = anguloPuntero > 0 || anguloPuntero <= inicio || anguloPuntero >= final;
            } else if(inicio < 0 && final > 0) {
                condicion = (anguloPuntero <= inicio) || (anguloPuntero >= final);
            } else if(inicio > 0 && final < 0) {
                condicion = (anguloPuntero <= inicio && anguloPuntero >= 0) || (anguloPuntero >= final && anguloPuntero <= 0);
            }

            if(!condicion) return Infinity;
            let dist = this.centro.dist(p);
            return Math.abs(dist - this.radio);
        }
    }
}

class SelfTransition extends TransicionGrafica {

    dx: number;
    dy: number;

    constructor(nodoI: NodoGrafico | Punto, nodoF: NodoGrafico | Punto, letter?: string) {
        super(nodoI, nodoF, letter);
    }

    draw(ctx: CanvasRenderingContext2D) {
        let pos = this.nodoI.pos();
        //we simulate that we are modifiying above the circle
        //and then we go back to this.modificando = false;
        if(this.aux == 0) {
            this.aux = 0.1;
            this.puntero = new Punto(pos.x, pos.y - 200);
            this.modificando = true;
            this.draw(ctx);
            this.modificando = false;
            return;
        }
        //calculate the other two points from this.puntero
        //crear circunferencia a partir del centro(fijado en el axis) y el radio
        //para el axis coger el angulo con el puntero y extender la longitud, ya que el diametro es (puntero-centro)
        if(this.modificando) {
            let center = new Punto((pos.x + this.puntero.x) / 2, (pos.y + this.puntero.y) / 2);
            let radius = center.dist(pos);
            this.radio = radius;
            this.centro = center;
            this.aux = 2 * radius - 30;
            this.dx = center.x - pos.x;
            this.dy = center.y - pos.y;
            //console.log('slope angle: ', ang);
            //console.log('drawing self transition...');
            //console.log('radius: ', radius);
        }
        let center = new Punto(pos.x + this.dx, pos.y + this.dy);
        let puntero = new Punto(pos.x + this.dx * 2, pos.y + this.dy * 2);
        this.puntero = puntero;
        this.centro = center;
        let offset = - 2 * Math.asin((<NodoGrafico>this.nodoI).radio / (2 * this.radio));
        let ang = Math.atan2(pos.y - this.puntero.y, this.puntero.x - pos.x);
        ctx.beginPath();
        this.anguloD = -Math.PI / 2 - offset - (Math.PI / 2 - ang);
        this.anguloI = -Math.PI / 2 + offset - (Math.PI / 2 - ang);
        ctx.arc(center.x, center.y, this.radio, -this.anguloI, -this.anguloD);
        ctx.stroke();

        let anguloDcha = this.anguloD;
        //////////DIBUJAR FLECHA
        let xF = center.x + (6 + this.radio) * Math.cos(anguloDcha - offset / 4);
        let yF = center.y - (6 + this.radio) * Math.sin(anguloDcha - offset / 4);
        let xF2 = center.x + (- 6 + this.radio) * Math.cos(anguloDcha - offset / 4);
        let yF2 = center.y - (- 6 + this.radio) * Math.sin(anguloDcha - offset / 4);

        let xI = center.x + this.radio * Math.cos(anguloDcha);
        let yI = center.y - this.radio * Math.sin(anguloDcha);

        ctx.beginPath();
        ctx.moveTo(xF, yF);
        ctx.lineTo(xI, yI);
        ctx.lineTo(xF2, yF2);
        ctx.fill();
        //////////DIBUJAR FLECHA
        console.log(this);
    }
}

export class AutomataGrafico {
    logico: AutomataLogico;
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
            if(this.elemento_seleccionado instanceof TransicionGrafica) {
                this.nfa.remove_transition(this.elemento_seleccionado);
            } else if(this.elemento_seleccionado instanceof NodoGrafico) {
                let [from, to] = this.nfa.rip_node(this.elemento_seleccionado);
                from.forEach(t => this.nfa.remove_transition(t));
                to.forEach(t => this.nfa.remove_transition(t));
            }
            this.elemento_seleccionado = null;
            this.draw();
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
                this.elemento_seleccionado.visible = true;
                this.elemento_seleccionado.draw(this.ctx);
                this.elemento_seleccionado.visible = false;
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
                this.elemento_seleccionado.texto += texto;
            } else if(texto == 'Backspace') {
                //console.log(texto);
                let t = this.elemento_seleccionado.texto;
                this.elemento_seleccionado.texto = t.slice(0, -1);
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

        //console.log('dibujando...');
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
            console.log('distancia a link: ', distancia);
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
                this.draggin = circle;
                this.elemento_seleccionado = circle;
            } else {
                let linea = this.closest_line(p);
                if(linea != null) {//hay linea, así que la movemos.
                    this.shaping_transition = linea;
                this.elemento_seleccionado = linea;
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
            this.shaping_transition.modificando = true;
            this.shaping_transition.puntero = p;
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
                if(circle == t.nodoI) {
                    console.log('self transition');
                    console.log(this.nfa.transitions.length);
                    t = new SelfTransition(circle, circle);
                }  else {
                    t.nodoF = circle;
                    t.modificando = false; //TODO
                }
                this.nfa.transitions.push(t);
            }
        }
        this.creating_transition = null;
        if(this.shaping_transition != null) this.shaping_transition.modificando = false;
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
