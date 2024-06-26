import initCanvas from './visualization/index.js';
import initAst from './ast.js';

window.addEventListener('load', function() {
    const options = document.querySelectorAll('.option');
    const highlight = document.querySelector('.highlight');
    const right = document.getElementById('right');
    options.forEach((option, index) => {
        option.addEventListener('click', (event) => {
            const width = option.offsetWidth;
            const left = parseInt(option.offsetLeft) - 10;

            highlight.style.transform = `translateX(${left}px)`;
            highlight.style.width = width + 'px';
            options.forEach((o, i) => {
                if(i != index) o.className = 'option';
            });
            option.className += " active";

            let is_nfa= event.target.innerText == 'NFA';
            if(is_nfa) {
                const is_canvas = right.innerHTML.includes('canvas');
                right.innerHTML = `<canvas id="canvas"></canvas>`;
                if(!is_canvas) initCanvas();
            }
            else {
                right.innerHTML = `<div class="chart" id="OrganiseChart-simple"></div>`;
                initAst();
            }
        });
    });
    const nfa = document.getElementById('nfa');
    const style = (value) => window.getComputedStyle(nfa).getPropertyValue(value);
    nfa.click();
    highlight.style.height = (parseInt(style('height')) + 2*parseInt(style('padding'))) + 'px';
});
