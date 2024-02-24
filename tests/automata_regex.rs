use automata::{Backend::{build::build, gnfa::{nfa_to_regex, GNFA}, nfa::NFA}, Frontend::parser::parse};

#[test]
fn groups_with_quantifiers() {

    let input = "(a|b)*";
    let regex_ast = parse(input).unwrap();
    let nfa = build(regex_ast);

    let (start, end) = (NFA::default(), NFA::default());
    let nfa = NFA::concat_all([start, nfa, end].into_iter());
    let gnfa = GNFA::from_nfa(&nfa);
    let generated_regex = format!("{}", nfa_to_regex(&gnfa).unwrap());
    assert_eq!("(ε|a|b)((ε|a|b))*", generated_regex);
}

#[test]
fn simple_concatenation() {

    let input = "Hello my name is Guillermo";
    let regex_ast = parse(input).unwrap();
    let nfa = build(regex_ast);

    let (start, end) = (NFA::default(), NFA::default());
    let nfa = NFA::concat_all([start, nfa, end].into_iter());
    let gnfa = GNFA::from_nfa(&nfa);
    let generated_regex = format!("{}", nfa_to_regex(&gnfa).unwrap());
    assert_eq!("Hello my name is Guillermo", generated_regex);
}

#[test]
fn ignore_simple_groups() {

    let input = "(one (two (three)))";
    let regex_ast = parse(input).unwrap();
    let nfa = build(regex_ast);

    let (start, end) = (NFA::default(), NFA::default());
    let nfa = NFA::concat_all([start, nfa, end].into_iter());
    let gnfa = GNFA::from_nfa(&nfa);
    let generated_regex = format!("{}", nfa_to_regex(&gnfa).unwrap());
    assert_eq!("one two three", generated_regex);
}

#[test]
fn union() {

    let input = "ab|(c(de)|f)";
    let regex_ast = parse(input).unwrap();
    let nfa = build(regex_ast);

    let (start, end) = (NFA::default(), NFA::default());
    let nfa = NFA::concat_all([start, nfa, end].into_iter());
    let gnfa = GNFA::from_nfa(&nfa);
    let generated_regex = format!("{}", nfa_to_regex(&gnfa).unwrap());
    assert_eq!("(ab|(cde|f))", generated_regex);
}
