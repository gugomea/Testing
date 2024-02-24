use std::collections::HashSet;

use automata::Backend::{build::build, intervals::Interval, transformer, automata::Automata};
use automata::Frontend::parser::parse;
use std::fs::read_to_string;
#[test]
fn match_string_with_nfa() {
    let input = read_to_string("sample.txt").unwrap();
    let exp = "\"[^\"]*\"";
    let mut chars = input.chars().map(Interval::char).peekable();

    let expression = parse(exp).unwrap();
    let mut automata = build(expression);
    let mut result_strings: Vec<String> = vec![];
    while chars.peek().is_some() {
        automata.set_current(Some(HashSet::from([0])));
        let Some(matching) = automata.matches(&mut chars) else { 
            continue 
        };
        result_strings.push(matching.into_iter().map(|x| x.first).collect());
    }
    assert_eq!(
        read_to_string("result_sample.txt").unwrap().lines().collect::<Vec<_>>(),
        result_strings,
        "Match sample.txt with nfa",
    );
}

#[test]
fn match_string_with_dfa() {
    let input = read_to_string("sample.txt").unwrap();
    let exp = "\"[^\"]*\"";
    let mut chars = input.chars().map(Interval::char).peekable();

    let expression = parse(exp).unwrap();
    let nfa = build(expression);
    let mut automata = transformer::nfa_to_dfa(&nfa);
    let mut result_strings: Vec<String> = vec![];
    while chars.peek().is_some() {
        automata.set_current(Some(0));
        let Some(matching) = automata.matches(&mut chars) else { 
            continue 
        };
        result_strings.push(matching.into_iter().map(|x| x.first).collect());
    }
    assert_eq!(
        read_to_string("result_sample.txt").unwrap().lines().collect::<Vec<_>>(),
        result_strings,
        "Match sample.txt with dfa",
    );
}
