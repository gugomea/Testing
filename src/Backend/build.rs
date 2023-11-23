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
        Expression::concatenation(expressions)=> NFA::concat_all(expressions.into_iter().map(build)),
        Expression::union(expressions)=> NFA::union(expressions.into_iter().map(build).collect()),
        Expression::group(exp)=> build(*exp),
        Expression::empty => NFA::default(),
    }
}

#[test]
fn build_automata() {
    use crate::Frontend::*;
    use std::time::Instant;
    //let str_input = "((a|bc|de*)+|((f)))f+f?".repeat(500_000);
    //let str_input = "(((a)))|b*c?d+(sp)|tt".repeat(100000);
    //let str_input = "a|b|c|d".repeat(1000);
    //let str_input = "abcd".repeat(2_000_000);

    let str_input = "[^abcd-z]".repeat(1_000_00);
    for _ in 0..10 {
        let now = Instant::now();

        let parsed_expression = parser::parse(&str_input).ok().unwrap();
        let automata = build(parsed_expression);

        let elapsed = now.elapsed();
        println!("Elapsed BUILDING This crate: {:.2?}", elapsed);
        println!("{:#?}", automata.n_states);
    }
}
