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
        Expression::concatenation(expressions)=> {
            //expressions.into_iter().fold(NFA::default(), |acc, a| {
            //    let automata = build(a);
            //    match automata.is_simple() {
            //        Some(interval) => NFA::concat_directly(acc, automata, interval),
            //        None => NFA::concat(acc, automata),
            //    }
            //})
            /////////////////////////////////////////////////////////////
            /////////////////////////////////////////////////////////////
            NFA::concat_all(expressions.into_iter().map(build).collect())
            /////////////////////////////////////////////////////////////
            /////////////////////////////////////////////////////////////
        }
        Expression::union(expressions)=> NFA::union(expressions.into_iter().map(build).collect()),
        Expression::group(exp)=> build(*exp),
        Expression::empty => NFA::default(),
    }
}

#[test]
fn build_automata() {
    use crate::Frontend::*;
    use std::time::Instant;
    let str_input = "((a|bc|de*)+|((f)))f+f?".repeat(500_000);
    //let str_input = "(((a)))|b*c?d+(sp)|tt".repeat(100000);
    let str_input = "a|b|c|d".repeat(1000);

    let now = Instant::now();
    let parsed_expression = parser::parse(&str_input).ok().unwrap();
    let automata = build(parsed_expression);
    let elapsed = now.elapsed();

    println!("Elapsed BUILDING This crate: {:.2?}", elapsed);
    println!("{:#?}", automata.n_states);
    //println!("{:#?}", automata);

    //////////////////////////////////////////////////
    use regex_automata::nfa::thompson::NFA;
    //////////////////////////////////////////////////

    let now = Instant::now();

    let config = NFA::config();
    let nfa = NFA::compiler().configure(config).build(&str_input).unwrap();

    let elapsed = now.elapsed();
    println!("Elapsed regex_automata crate: {:.2?}", elapsed);
    println!("{:#?}", nfa.states().len());
}
