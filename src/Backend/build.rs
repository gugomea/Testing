use crate::Backend::nfa::NFA;

use crate::Frontend::tokens::Expression;

pub fn build(input: Expression) -> NFA {
    match input {
        Expression::l(literal) => NFA::simple(literal.into()),
        Expression::any(_literals)=> todo!(),
        Expression::anyBut(_literals)=> todo!(),
        Expression::optional(_exp)=> todo!(),
        Expression::zero_or_more(_exp)=> todo!(),
        Expression::one_or_more(_exp)=> todo!(),
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
        Expression::empty=> todo!(),
    }
}

#[test]
fn build_automata() {
    use crate::Frontend::parser;
    let str_input = "a|bc|(de)";
    let parsed_expression = parser::parse(&str_input).ok().unwrap();
    //let parsed_expression = stack::parser_recursivo::parse_recursivo(&str_input).ok().unwrap();
    let automta = build(parsed_expression);
    println!("{}", str_input);
    println!("{:#?}", automta);
    println!("{}", str_input);
}
