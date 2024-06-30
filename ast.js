import { build_automata, initSync } from "./pkg/automata.js";
function build_tree(ast) {
    function structure(expression) {
        let exp;
        if((exp = expression.concatenation) != undefined) {
            return {
                text: { name: "." },
                children: exp.map(structure),
            };
        } else if((exp = expression.union) != undefined) {
            return {
                text: { name: "|" },
                children: exp.map(structure),
            };
        } else if((exp = expression.l) != undefined) {
            return {
                text: { name: exp.atom || exp },
            };
        } else if((exp = expression.one_or_more) != undefined) {
            return {
                text: { name: '+' },
                children: [structure(exp)],
            };
        } else if((exp = expression.zero_or_more) != undefined) {
            return {
                text: { name: '*' },
                children: [structure(exp)],
            };
        } else if((exp = expression.optional) != undefined) {
            return {
                text: { name: '?' },
                children: [structure(exp)],
            };
        } else if((exp = expression.group) != undefined) {
            return structure(exp);
        } else if(expression === "empty") {
            return {
                text: { name: "empty" },
                children: []
            };
        } else if((exp = expression.any) != undefined || (exp = expression.anyBut) != undefined) {
            console.log('any: ', exp);
            return {
                text: { name: expression.any != undefined ? "[]": '[^]' },
                children: exp.map(x => {
                    if (x.atom != undefined) return { text: { name: x.atom } };
                    return { text: { name: `${x.range.start}-${x.range.end}` } };
                })
            };
        }
    }
    return  {
        chart: { container: "#OrganiseChart-simple" },
        nodeStructure: structure(ast)
    };
}

var simple_chart_config = {
    chart: {
        container: "#OrganiseChart-simple",
    },
    nodeStructure: {
        text: { name: "|" },
        children: [
            {
                HTMLclass: "the-parent",
                text: { name: "|" },
                children: [
                    { text: { name: "a" } },
                    { text: { name: "b" } },
                ]
            },
            {
                HTMLclass: "the-parent",
                text: { name: "." },
                children: [
                    { text: { name: "a-z" } },
                    { text: { name: "0-9" } },
                ]

            }
        ]
    }
};

export default function initAst() {
    let input = document.getElementById('input');
    let form = document.getElementById('form');
    initSync();
    function print_ast() {
        let div = document.getElementById('OrganiseChart-simple');
        div.innerHTML = "";
        let automata = build_automata(input.value);
        let result = build_tree(automata);
        console.log('automata: ', automata);
        console.log(result);
        new Treant(result);
    }
    form.addEventListener('submit', print_ast);
    print_ast();
}
