use crate::nfa::NFA;

use super::Frontend::*;

pub fn build(input: tokens::Expression) -> NFA {
    match input {
        tokens::Expression::l(literal) => NFA::simple(literal.into()),
        tokens::Expression::any(literals)=> todo!(),
        tokens::Expression::anyBut(literals)=> todo!(),
        tokens::Expression::optional(exp)=> todo!(),
        tokens::Expression::zero_or_more(exp)=> todo!(),
        tokens::Expression::one_or_more(exp)=> todo!(),
        tokens::Expression::concatenation(expressions)=> {
            expressions.into_iter().fold(NFA::default(), |acc, a| {
                let automata = build(a);
                match automata.is_simple() {
                    Some(interval) => NFA::concat_directly(acc, automata, interval),
                    None => NFA::concat(acc, automata),
                }
            })
        }
        tokens::Expression::union(expressions)=> NFA::union(expressions.into_iter().map(build).collect()),
        tokens::Expression::group(exp)=> build(*exp),
        tokens::Expression::empty=> todo!(),
    }
}

#[test]
fn build_automata() {
    let str_input = "a|bc|(de)";
    let parsed_expression = stack::parser::parse(&str_input).ok().unwrap();
    //let parsed_expression = stack::parser_recursivo::parse_recursivo(&str_input).ok().unwrap();
    let automta = build(parsed_expression);
    println!("{}", str_input);
    println!("{:#?}", automta);
    println!("{}", str_input);
}
