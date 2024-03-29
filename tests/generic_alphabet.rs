use std::collections::HashSet;
use automata::Backend::intervals::Interval;

use automata::Backend::{build::build, automata::Automata};
use automata::Frontend::parser::parse;

#[derive(Default, Debug, Clone, Copy, PartialEq, Eq)]
struct Index {
    line: usize,
    idx: usize,
}

#[test]
fn new_alphabet() {
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
    let mut automata = build(expression);
    let mut result_strings = vec![];
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
