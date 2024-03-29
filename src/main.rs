use std::collections::HashSet;

use automata::{Backend::{automata::Automata, build::build, intervals::Interval, nfa::NFA}, Frontend::parser::parse};

#[derive(Default, Debug, Clone, Copy, PartialEq, Eq)]
struct Index {
    line: usize,
    idx: usize,
}

static mut SHARED_AUTOMATA: Option<NFA<Interval<Index>>> = None;

fn main() {
    let input = std::fs::read_to_string("sample.txt").unwrap();
    let exp = "\"[^\"]*\"";
    let mut chars = input.lines().enumerate().flat_map(|(line, str)|{
        str.chars().enumerate().map(move |(idx, ch)| {
            Interval {
                first: ch,
                last: ch,
                ctx: Index { line, idx },
            }
        })
    }).peekable();

    let expression = parse(exp).unwrap();
    unsafe { SHARED_AUTOMATA = Some(build(expression)); }
    let mut result_strings = vec![];
    let automata = unsafe { SHARED_AUTOMATA.as_mut().unwrap() };
    while chars.peek().is_some() {
        automata.set_current(Some(HashSet::from([0])));
        let Some(matching) = automata.matches(&mut chars) else { 
            continue 
        };
        result_strings.push(matching);
    }

    for str in result_strings {
        let string = str[1..str.len() - 1].iter().map(|x| x.first).collect::<String>();
        println!("---------------");
        println!("string value: {}", string);
        let string = str[1..str.len() - 1].iter().map(|x| format!("{:?}", x.ctx)).collect::<Vec<String>>();
        println!("indexes: {:?}", string);
        println!("---------------");
    }
    println!("input: {}", input);
}
