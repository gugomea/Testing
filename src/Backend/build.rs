use crate::Backend::{nfa::NFA, intervals::Interval};

use crate::Frontend::tokens::Expression;

pub fn build(input: Expression) -> NFA {
    match input {
        Expression::l(literal) => NFA::simple(literal.into()),
        Expression::any(literals)=> NFA::from_range(literals.into_iter().map(|x| x.into())),
        Expression::anyBut(literals)=> NFA::from_range(literals.into_iter().flat_map(Interval::reverse)),
        Expression::optional(exp)=> NFA::optional(build(*exp)),
        Expression::one_or_more(exp)=> NFA::one_or_more(build(*exp)),
        Expression::zero_or_more(exp)=> NFA::zero_or_more(build(*exp)),
        Expression::concatenation(expressions)=> NFA::concat_all_directly(expressions.into_iter().map(build)),
        Expression::union(expressions)=> NFA::union(expressions.into_iter().map(build).collect()),
        Expression::group(exp)=> build(*exp),
        Expression::empty => NFA::default(),
    }
}

#[test]
fn build_literal() {
    use crate::Frontend::*;
    let input = "🙉";
    let parsed_expression = parser::parse(input).ok().unwrap();
    let built_automata = build(parsed_expression);
    let automata = NFA::simple(Interval::char('🙉'));
    assert_eq!(built_automata, automata, "literal autoamta");
}

#[test]
fn build_ranges() {
    use crate::Frontend::*;
    let input = "[a-zA-ZñÑ. -]";
    let parsed_expression = parser::parse(input).ok().unwrap();
    let built_automata = build(parsed_expression);
    let automata = NFA::from_range([
        Interval::new('a', 'z'), Interval::new('A', 'Z'), Interval::char('ñ'), 
        Interval::char('Ñ'), Interval::char('.'), Interval::char('-'), Interval::char(' ')
    ].into_iter());
    assert_eq!(built_automata, automata, "literal autoamta");
}

#[test]
fn build_quantifiers() {
    use crate::Frontend::*;
    let input = "a*b?c+";
    let parsed_expression = parser::parse(input).ok().unwrap();
    let built_automata = build(parsed_expression);
    let automata = NFA::concat_all_directly([
        NFA::zero_or_more(NFA::simple(Interval::char('a'))),
        NFA::optional(NFA::simple(Interval::char('b'))),
        NFA::one_or_more(NFA::simple(Interval::char('c'))),
    ].into_iter());
    assert_eq!(built_automata, automata, "literal autoamta");
}

#[test]
fn build_union() {
    use crate::Frontend::*;
    let input = "a*b?|c+d|ef";
    let parsed_expression = parser::parse(input).ok().unwrap();
    let built_automata = build(parsed_expression);
    let automata = NFA::union(vec![
        NFA::concat_all_directly([NFA::zero_or_more(NFA::simple(Interval::char('a'))), NFA::optional(NFA::simple(Interval::char('b')))].into_iter()),
        NFA::concat_all_directly([NFA::one_or_more(NFA::simple(Interval::char('c'))), NFA::simple(Interval::char('d'))].into_iter()),
        NFA::concat_all_directly([NFA::simple(Interval::char('e')), NFA::simple(Interval::char('f'))].into_iter()),
    ]);
    assert_eq!(built_automata, automata, "literal autoamta");
}

#[test]
fn build_with_groups() {
    use crate::Frontend::*;
    let input = "(a|bc)*|de";
    let parsed_expression = parser::parse(input).ok().unwrap();
    let built_automata = build(parsed_expression);
    let automata = NFA::union(vec![
        NFA::zero_or_more(
            NFA::union(vec![
                NFA::simple(Interval::char('a')),
                NFA::concat_all_directly([NFA::simple(Interval::char('b')), NFA::simple(Interval::char('c'))].into_iter()),
            ])
        ),
        NFA::concat_all_directly([NFA::simple(Interval::char('d')), NFA::simple(Interval::char('e'))].into_iter()),
    ]);
    assert_eq!(built_automata, automata, "literal autoamta");
}
