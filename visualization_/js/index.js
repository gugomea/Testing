import * as elem from "./elementos_graficos.js";
function reshape() {
    var canvas = document.getElementById('canvas');
    canvas.width = (window.innerWidth / 9) * 8;
    canvas.height = (window.innerHeight / 9) * 8;
    var ctx = unwrap(canvas.getContext("2d"));
    //ctx.fillStyle = 'white';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}
function unwrap(value) {
    if (value === null || value === undefined) {
        throw new Error("Error, valor nulo inesperado");
    }
    return value;
}
function initEventos() {
    var canvas = document.getElementById('canvas');
    var ctx = unwrap(canvas.getContext('2d'));
    var automata = new elem.AutomataGrafico(canvas, ctx);
    var mouse_in_canvas = false;
    canvas.addEventListener('mouseenter', function (_) { return mouse_in_canvas = true; });
    canvas.addEventListener('mouseleave', function (_) { return mouse_in_canvas = false; });
    window.addEventListener('keydown', function (e) { return automata.cambiar_texto(e.key); });
    window.addEventListener('resize', function (_) { reshape(); automata.draw(); });
    window.addEventListener('mousedown', function (e) {
        if (mouse_in_canvas)
            automata.create_node_or_link(e);
    });
    window.addEventListener('mousemove', function (e) {
        if (mouse_in_canvas)
            automata.movimiento(e);
    });
    window.addEventListener('mouseup', function (e) {
        if (mouse_in_canvas)
            automata.mouse_release(e);
    });
    window.setInterval(function () {
        if (automata.elemento_seleccionado != null) {
            automata.draw();
            automata.visibilidad = !automata.visibilidad;
        }
    }, 600);
    canvas.addEventListener('contextmenu', function (e) {
        e.preventDefault();
    });
}
window.addEventListener('load', initEventos);
window.addEventListener('load', reshape);
