var Punto = /** @class */ (function () {
    function Punto(x, y) {
        this.x = x;
        this.y = y;
    }
    Punto.prototype.pos = function () { return this; };
    Punto.prototype.dist = function (p) { return Math.sqrt(Math.pow(this.x - p.x, 2) + Math.pow(this.y - p.y, 2)); };
    Punto.prototype.equals = function (p) { return this.dist(p) <= 0.9; };
    return Punto;
}());
export { Punto };
var NodoGrafico = /** @class */ (function () {
    function NodoGrafico(numero, centro) {
        this.numero = numero;
        this.centro = centro;
        this.radio = 30;
        this.id = 0;
    }
    NodoGrafico.prototype.pos = function () { return this.centro; };
    NodoGrafico.prototype.dist = function (p) { return Math.sqrt(Math.pow(this.centro.x - p.x, 2) + Math.pow(this.centro.y - p.y, 2)); };
    NodoGrafico.prototype.draw = function (ctx) {
        ctx.beginPath();
        ctx.arc(this.centro.x, this.centro.y, this.radio, 0, 2 * Math.PI);
        ctx.stroke();
    };
    NodoGrafico.prototype.insterseccion = function (angulo) {
        var x = this.centro.x + this.centro.x * Math.cos(angulo);
        var y = this.centro.y + this.centro.y * Math.sin(angulo);
        return new Punto(x, y);
    };
    return NodoGrafico;
}());
export { NodoGrafico };
var TransicionGrafica = /** @class */ (function () {
    function TransicionGrafica(nodoI, nodoF) {
        this.nodoI = nodoI;
        this.nodoF = nodoF;
        this.aux = 0;
        this.puntero = new Punto(0, 0);
        this.modificando = true;
        this.reversed = false;
        this.visible = false;
        this.texto = "";
    }
    TransicionGrafica.prototype.draw = function (ctx) {
        var posI = this.nodoI.pos();
        var posF = this.nodoF.pos();
        if (this.aux == 0) {
            if (!this.modificando) {
                this.aux = 1;
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
        var medio = new Punto((posI.x + posF.x) / 2, (posI.y + posF.y) / 2);
        if (!this.modificando) {
            //creamos el punto a partir de la mitad(el punto es la perpendicular)
            var angulo_1 = Math.PI / 2 + Math.atan2(medio.y - posF.y, posF.x - medio.x);
            medio.x = medio.x + this.aux * Math.cos(angulo_1);
            medio.y = medio.y + (-1) * this.aux * Math.sin(angulo_1);
            this.puntero = medio;
        }
        var _a = circuloTresPuntos(posI, posF, this.puntero), centro = _a[0], radio = _a[1];
        this.centro = centro;
        this.radio = radio;
        if (this.modificando) {
            var Alpha_arriba = Math.PI / 2 + Math.atan2(medio.y - posF.y, posF.x - medio.x);
            var Alpha_abajo = -Math.PI + Alpha_arriba;
            var modulo = 10;
            var arriba_punto = new Punto(medio.x + Math.cos(Alpha_arriba) * modulo, medio.y - Math.sin(Alpha_arriba) * modulo);
            var abajo_punto = new Punto(medio.x + Math.cos(Alpha_abajo) * modulo, medio.y - Math.sin(Alpha_abajo) * modulo);
            var dis_arriba = arriba_punto.dist(this.puntero);
            var dis_abajo = abajo_punto.dist(this.puntero);
            var encima = (dis_arriba < dis_abajo) ? true : false;
            this.reversed = !encima;
            dis_arriba = arriba_punto.dist(this.centro);
            dis_abajo = abajo_punto.dist(this.centro);
            encima = (dis_arriba <= dis_abajo) ? true : false;
            var centro_esta_encima = encima;
            var mult = centro_esta_encima ? -1 : 1;
            if (this.reversed) {
                this.aux = this.radio + this.centro.dist(medio) * mult;
                this.aux = this.aux * (-1);
            }
            else {
                this.aux = this.radio - (this.centro.dist(medio)) * mult;
            }
        }
        var multe = this.reversed ? 1 : -1;
        var offset = 2 * Math.asin(this.nodoI.radio / (2 * this.radio)) * multe;
        var anguloIzda = Math.atan2(centro.y - posI.y, posI.x - centro.x) + offset;
        var anguloDcha = Math.atan2(centro.y - posF.y, posF.x - centro.x) - offset;
        //////////DIBUJAR FLECHA
        var xF = this.centro.x + (6 + this.radio) * Math.cos(anguloDcha - offset / 4);
        var yF = this.centro.y - (6 + this.radio) * Math.sin(anguloDcha - offset / 4);
        var xF2 = this.centro.x + (-6 + this.radio) * Math.cos(anguloDcha - offset / 4);
        var yF2 = this.centro.y - (-6 + this.radio) * Math.sin(anguloDcha - offset / 4);
        var xI = this.centro.x + this.radio * Math.cos(anguloDcha);
        var yI = this.centro.y - this.radio * Math.sin(anguloDcha);
        ctx.beginPath();
        ctx.moveTo(xF, yF);
        ctx.lineTo(xI, yI);
        ctx.lineTo(xF2, yF2);
        ctx.fill();
        //////////DIBUJAR FLECHA
        if (this.reversed) {
            var aux = anguloIzda;
            anguloIzda = anguloDcha;
            anguloDcha = aux;
        }
        this.anguloI = anguloIzda;
        if (anguloIzda > Math.PI)
            this.anguloI = 2 * Math.PI - anguloIzda;
        else if (anguloIzda < -Math.PI)
            this.anguloI = 2 * Math.PI + anguloIzda;
        this.anguloD = anguloDcha;
        if (anguloDcha > Math.PI)
            this.anguloD = 2 * Math.PI - anguloDcha;
        else if (anguloDcha < -Math.PI)
            this.anguloD = 2 * Math.PI + anguloDcha;
        ctx.beginPath();
        ctx.arc(centro.x, centro.y, radio, -anguloIzda, -anguloDcha);
        ctx.stroke();
        /////////DIBUJAR TEXTO
        var medioGiratorio = new Punto((posI.x + posF.x) / 2, (posI.y + posF.y) / 2);
        var anguloaux = Math.PI / 2 + Math.atan2(medioGiratorio.y - posF.y, posF.x - medioGiratorio.x);
        var angulo = Math.atan2(posF.y - medioGiratorio.y, posF.x - medioGiratorio.x);
        medioGiratorio.x = medioGiratorio.x + this.aux * Math.cos(anguloaux);
        medioGiratorio.y = medioGiratorio.y + (-1) * this.aux * Math.sin(anguloaux);
        var anguloGiratorio = Math.atan2(medioGiratorio.y, medioGiratorio.x);
        ////angulo texto rotar
        if (angulo >= Math.PI / 2 && angulo <= Math.PI) {
            angulo += Math.PI;
        }
        else if (angulo <= -Math.PI / 2 && angulo >= -Math.PI) {
            angulo += Math.PI;
        }
        ////angulo texto rotar
        var radioGiratorio = (new Punto(0, 0)).dist(medioGiratorio);
        var nuevoX = Math.cos(angulo - anguloGiratorio) * radioGiratorio;
        var nuevoY = -Math.sin(angulo - anguloGiratorio) * radioGiratorio;
        ctx.rotate(angulo);
        ctx.font = "22px serif";
        //this.texto = "ε-Transición";
        var longitud = ctx.measureText(this.texto).width;
        nuevoX = nuevoX - longitud / 2;
        if (this.reversed && posF.x >= posI.x || !this.reversed && posF.x <= posI.x)
            nuevoY = nuevoY + 22;
        else
            nuevoY = nuevoY - 6;
        ctx.fillText(this.texto, nuevoX, nuevoY);
        if (this.visible)
            ctx.fillText('|', nuevoX + longitud, nuevoY);
        ctx.rotate(-angulo);
        /////////DIBUJAR TEXTO
    };
    TransicionGrafica.prototype.dist = function (p) {
        if (this.aux == 0) {
            var posF = this.nodoF.pos();
            var posI = this.nodoI.pos();
            var angulo = Math.atan2(posI.y - posF.y, posF.x - posI.x);
            var d1 = Math.sqrt(Math.cos(angulo) * Math.cos(angulo) + Math.sin(angulo) * Math.sin(angulo)) * posI.dist(posF);
            var d2 = Math.sqrt(Math.cos(angulo) * Math.cos(angulo) + Math.sin(angulo) * Math.sin(angulo)) * posI.dist(p);
            return Math.abs(d1 - d2);
        }
        else {
            //let final = (this.reversed) ? this.anguloI: this.anguloD;
            //let inicio = (this.reversed) ? this.anguloD: this.anguloI;
            ///SENTIDO HORARIO
            var final = this.anguloD;
            var inicio = this.anguloI;
            var anguloPuntero = Math.atan2(this.centro.y - p.y, p.x - this.centro.x);
            var condicion = anguloPuntero >= final && anguloPuntero <= inicio;
            if (inicio > 0 && final > 0 && inicio <= final) {
                condicion = anguloPuntero <= inicio || anguloPuntero >= final;
            }
            else if (inicio < 0 && final < 0 && inicio <= final) {
                condicion = anguloPuntero > 0 || anguloPuntero <= inicio || anguloPuntero >= final;
            }
            else if (inicio < 0 && final > 0) {
                condicion = (anguloPuntero <= inicio) || (anguloPuntero >= final);
            }
            else if (inicio > 0 && final < 0) {
                condicion = (anguloPuntero <= inicio && anguloPuntero >= 0) || (anguloPuntero >= final && anguloPuntero <= 0);
            }
            //if(reversed) condicion = !condicion;
            //console.log('inicio:', inicio);
            //console.log('final:', final);
            //console.log('p', anguloPuntero);
            console.log('DENTRO:', condicion);
            //console.log(`DENTRO: ${condicion}`);
            // ATAN2 => { 0, 1, 2, PI, -PI, 2, 1, 0 }
            if (!condicion)
                return Infinity;
            var dist = this.centro.dist(p);
            return Math.abs(dist - this.radio);
        }
    };
    return TransicionGrafica;
}());
export { TransicionGrafica };
var AutomataGrafico = /** @class */ (function () {
    function AutomataGrafico(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.nodos = new Array();
        this.transiciones = new Array();
    }
    AutomataGrafico.prototype.background = function () {
        if (this.elemento_seleccionado != null) {
            var style = this.ctx.strokeStyle;
            var style2 = this.ctx.fillStyle;
            this.ctx.strokeStyle = 'blue';
            this.ctx.fillStyle = 'blue';
            if (this.visibilidad) {
                this.elemento_seleccionado.visible = true;
                this.elemento_seleccionado.draw(this.ctx);
                this.elemento_seleccionado.visible = false;
            }
            else {
                this.elemento_seleccionado.draw(this.ctx);
            }
            this.ctx.strokeStyle = style;
            this.ctx.fillStyle = style2;
        }
    };
    AutomataGrafico.prototype.cambiar_texto = function (texto) {
        if (this.elemento_seleccionado != null) {
            if (texto.length == 1) {
                this.elemento_seleccionado.texto += texto;
            }
            else if (texto == 'Backspace') {
                //console.log(texto);
                var t = this.elemento_seleccionado.texto;
                this.elemento_seleccionado.texto = t.slice(0, -1);
            }
            else if (texto == 'Enter') {
                this.elemento_seleccionado = null;
            }
        }
        this.draw();
    };
    AutomataGrafico.prototype.draw = function () {
        var _this = this;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.transiciones.forEach(function (n) { return n.draw(_this.ctx); });
        this.nodos.forEach(function (n) { return n.draw(_this.ctx); });
        this.ctx.beginPath();
        if (this.creating_transition != null)
            this.creating_transition.draw(this.ctx);
        this.background();
        //console.log('dibujando...');
    };
    AutomataGrafico.prototype.closest_circle = function (p) {
        var seleccionados = [];
        for (var idx = 0; idx < this.nodos.length; idx++) {
            var element = this.nodos[idx];
            if (element.dist(p) <= element.radio) {
                seleccionados.push(element);
            }
        }
        var m = -1;
        var closest = null;
        for (var idx = 0; idx < seleccionados.length; idx++) {
            var element = seleccionados[idx];
            if (element.id > m) {
                closest = element;
                m = element.id;
            }
        }
        return closest;
    };
    AutomataGrafico.prototype.closest_line = function (p) {
        var epsilon = 10;
        var closest = null;
        var minimo = Infinity;
        for (var idx = 0; idx < this.transiciones.length; idx++) {
            var element = this.transiciones[idx];
            var distancia = element.dist(p);
            if (distancia <= epsilon && distancia < minimo) {
                closest = element;
            }
        }
        return closest;
    };
    //click down(right click and left click)
    //    - Left click 
    //			create Node, if you are in Node, you are draggin it
    //			if there is a line, reshaping it
    //    - Right click create a link
    AutomataGrafico.prototype.create_node_or_link = function (evt) {
        evt.preventDefault();
        var rect = this.canvas.getBoundingClientRect();
        var p = new Punto(evt.clientX - rect.left, evt.clientY - rect.top);
        var circle = this.closest_circle(p);
        this.elemento_seleccionado = null;
        if (evt.button === 0) { //left-click
            if (circle != null) { //hay un circulo, así que lo hemos seleccionado(para moverlo)
                this.draggin = circle;
                this.elemento_seleccionado = circle;
            }
            else {
                var linea = this.closest_line(p);
                if (linea != null) { //hay linea, así que la movemos.
                    this.shaping_transition = linea;
                    this.elemento_seleccionado = linea;
                }
                else { //no hay nada, creamos un nuevo nodo.
                    this.nodos.push(new NodoGrafico(1, p));
                }
            }
        }
        else if (evt.button == 2) { //right-click
            var inicio = (circle == null) ? p : circle;
            this.creating_transition = new TransicionGrafica(inicio, p);
        }
        this.draw();
    };
    //move mouse
    //    - If you were draggin, update circle position
    //    - If you were reshaping update line position
    AutomataGrafico.prototype.movimiento = function (evt) {
        evt.preventDefault();
        var rect = this.canvas.getBoundingClientRect();
        var p = new Punto(evt.clientX - rect.left, evt.clientY - rect.top);
        if (this.draggin != null) {
            this.draggin.centro = p;
            this.draw();
        }
        else if (this.creating_transition != null) {
            this.creating_transition.nodoF = p;
            this.draw();
        }
        else if (this.shaping_transition != null) {
            this.shaping_transition.modificando = true;
            this.shaping_transition.puntero = p;
            this.draw();
        }
    };
    //release click
    //    - If you were draggin, you are not anymore
    //    - If you were creating link, if there is Node in current position, instantiate that link
    //    - If you were reshaping youre not anymore
    AutomataGrafico.prototype.mouse_release = function (evt) {
        evt.preventDefault();
        var rect = this.canvas.getBoundingClientRect();
        var p = new Punto(evt.clientX - rect.left, evt.clientY - rect.top);
        this.draggin = null;
        var t = this.creating_transition;
        if (t != null) {
            var circle = this.closest_circle(p);
            if (circle != null) {
                t.nodoF = circle;
                t.modificando = false; //TODO
                this.transiciones.push(t);
            }
        }
        this.creating_transition = null;
        if (this.shaping_transition != null)
            this.shaping_transition.modificando = false;
        this.shaping_transition = null;
        this.draw();
    };
    return AutomataGrafico;
}());
export { AutomataGrafico };
function circuloTresPuntos(p1, p2, p3) {
    var _a = [p1.x, p2.x, p3.x], x1 = _a[0], x2 = _a[1], x3 = _a[2];
    var _b = [p1.y, p2.y, p3.y], y1 = _b[0], y2 = _b[1], y3 = _b[2];
    var x12 = x1 - x2;
    var x13 = x1 - x3;
    var y12 = y1 - y2;
    var y13 = y1 - y3;
    var y31 = y3 - y1;
    var y21 = y2 - y1;
    var x31 = x3 - x1;
    var x21 = x2 - x1;
    // x1^2 - x3^2
    var sx13 = Math.pow(x1, 2) - Math.pow(x3, 2);
    // y1^2 - y3^2
    var sy13 = Math.pow(y1, 2) - Math.pow(y3, 2);
    var sx21 = Math.pow(x2, 2) - Math.pow(x1, 2);
    var sy21 = Math.pow(y2, 2) - Math.pow(y1, 2);
    var f = ((sx13) * (x12) + (sy13) * (x12) + (sx21) * (x13) + (sy21) * (x13)) / (2 * ((y31) * (x12) - (y21) * (x13)));
    var g = ((sx13) * (y12) + (sy13) * (y12) + (sx21) * (y13) + (sy21) * (y13)) / (2 * ((x31) * (y12) - (x21) * (y13)));
    var c = -Math.pow(x1, 2) - Math.pow(y1, 2) - 2 * g * x1 - 2 * f * y1;
    // eqn of circle be x^2 + y^2 + 2*g*x + 2*f*y + c = 0
    // where centre is (h = -g, k = -f) and radius r
    // as r^2 = h^2 + k^2 - c
    var h = -g;
    var k = -f;
    var sqr_of_r = h * h + k * k - c;
    // r is the radius
    var r = Math.sqrt(sqr_of_r);
    return [new Punto(h, k), r];
}
