// Import our outputted wasm ES6 module
// Which, export default's, an initialization function
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { AutomataGrafico, Punto } from "./elementos_graficos.js";
import { initSync, build_automata, next, reset_automata } from "../pkg/automata.js";
import { NFA_BUILDER } from "./new_nfa.js";
function fetchWasm() {
    return __awaiter(this, void 0, void 0, function* () {
        // Instantiate our wasm module
        const response = yield fetch("pkg/automata_bg.wasm");
        const buffer = yield response.arrayBuffer();
        initSync(buffer);
    });
}
;
function reshape() {
    let canvas = document.getElementById('canvas');
    if (!canvas)
        return;
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
    let ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}
function load_and_init() {
    return __awaiter(this, void 0, void 0, function* () {
        yield fetchWasm();
        initEventos();
    });
}
var automata;
var mouse_in_canvas;
export var current_index = 0;
export default function initCanvas() {
    let canvas = document.getElementById('canvas');
    let ctx = canvas.getContext('2d');
    automata.canvas = canvas;
    automata.ctx = ctx;
    mouse_in_canvas = false;
    canvas.addEventListener('mouseenter', (_) => {
        console.log('entered');
        mouse_in_canvas = true;
    });
    canvas.addEventListener('mouseleave', (_) => mouse_in_canvas = false);
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    reshape();
    automata.draw();
}
function initEventos() {
    ////////////////////////////////////////////////
    const container = document.getElementById('main-container');
    const center = document.getElementById('center');
    const left = document.getElementById('left');
    let moving = false;
    document.addEventListener('mouseup', _ => {
        moving = false;
        document.body.style.cursor = 'default';
    });
    center.addEventListener('mousedown', _ => moving = true);
    document.addEventListener('mousemove', e => {
        if (!moving)
            return;
        let selection = document.getSelection();
        if (selection != null)
            selection.empty(); //para que no se seleccione el texto cuando nos movemos rápido.
        document.body.style.cursor = 'ew-resize';
        const rec = container.getBoundingClientRect();
        const dx = Math.max(100, e.clientX - rec.x);
        const newLeftWidth = (dx / rec.width) * 100;
        left.style.width = newLeftWidth + '%';
        reshape();
        automata.draw();
    });
    ////////////////////////////////////////////////
    let canvas = document.getElementById('canvas');
    let ctx = canvas.getContext('2d');
    automata = new AutomataGrafico(canvas, ctx);
    mouse_in_canvas = false;
    let input = document.getElementById('input');
    let form = document.getElementById('form');
    const repaint = () => {
        const edit = Array.from(document.getElementsByClassName('op')).slice(1);
        edit[0].click();
        edit[1].click();
    };
    //MAYBE
    reshape();
    const h = canvas.height;
    /*if(!input.value)*/
    input.value = "\"[^\"]*\"";
    let ast = build_automata(input.value);
    new NFA_BUILDER().draw_automata(automata, ast, new Punto(50, h / 2));
    automata.draw();
    automata.compile();
    repaint();
    //
    form.addEventListener('submit', e => {
        e.preventDefault();
        //console.log('preventing');
        let ast = build_automata(input.value);
        console.log('ast: ', ast);
        console.log('ast: ', JSON.stringify(ast));
        automata.clear();
        const h = canvas.height;
        new NFA_BUILDER().draw_automata(automata, ast, new Punto(50, h / 2));
        automata.draw();
        automata.compile();
        repaint();
    });
    canvas.addEventListener('mouseenter', (_) => mouse_in_canvas = true);
    canvas.addEventListener('mouseleave', (_) => mouse_in_canvas = false);
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    window.addEventListener('keydown', (e) => automata.cambiar_texto(e));
    window.addEventListener('keyup', (e) => {
        if (e.key == 'Delete')
            automata.remove();
    });
    window.addEventListener('resize', _ => { reshape(); automata.draw(); });
    window.addEventListener('mousedown', e => {
        if (mouse_in_canvas)
            automata.create_node_or_link(e);
    });
    window.addEventListener('mousemove', e => {
        if (mouse_in_canvas)
            automata.movimiento(e);
    });
    window.addEventListener('mouseup', e => {
        if (mouse_in_canvas)
            automata.mouse_release(e);
    });
    window.setInterval(() => {
        if (automata.elemento_seleccionado != null) {
            automata.draw();
            automata.visibilidad = !automata.visibilidad;
        }
    }, 600);
    const nextch = document.getElementById('next');
    const reset = document.getElementById('reset');
    current_index = 0;
    nextch === null || nextch === void 0 ? void 0 : nextch.addEventListener('click', () => {
        const content = document.getElementsByClassName('content')[0];
        if (current_index >= content.text.length)
            return;
        const input = (ch) => { return { first: ch, last: ch, line: 0, idx: 0 }; };
        const input_letter = input(content.text[current_index]);
        console.log('input: ', input_letter);
        automata.nfa.nodes.forEach((a) => a.activated = false);
        let interval = next(input_letter);
        if (interval == undefined)
            interval = reset_automata();
        console.log('states: ', interval);
        interval.forEach((idx) => {
            let nodes = automata.nfa.nodes;
            if (idx == 0 || idx == nodes.length + 1)
                return;
            nodes[idx - 1].activated = true;
        });
        automata.draw();
        repaint();
        current_index++;
    });
    reset === null || reset === void 0 ? void 0 : reset.addEventListener('click', () => {
        current_index = 0;
        automata.nfa.nodes.forEach((a) => a.activated = false);
        let initial_states = reset_automata();
        initial_states.forEach((idx) => {
            let nodes = automata.nfa.nodes;
            if (idx == 0 || idx == nodes.length + 1)
                return;
            nodes[idx - 1].activated = true;
        });
        automata.draw();
        repaint();
    });
}
window.addEventListener('load', load_and_init);
window.addEventListener('load', reshape);
