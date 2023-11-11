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
            expressions.into_iter().fold(NFA::default(), |acc, a| {
                let automata = build(a);
                match automata.is_simple() {
                    Some(interval) => NFA::concat_directly(acc, automata, interval),
                    None => NFA::concat(acc, automata),
                }
            })
        }
        Expression::union(expressions)=> NFA::union(expressions.into_iter().map(build).collect()),
        Expression::group(exp)=> build(*exp),
        Expression::empty => NFA::default(),
    }
}

#[test]
fn build_automata() {
    use crate::Frontend::parser;
    let str_input = "(a|bc|(de))?";
    let parsed_expression = parser::parse(&str_input).ok().unwrap();
    let automta = build(parsed_expression);
    println!("{}", str_input);
    println!("{:#?}", automta);
    println!("{}", str_input);
}
