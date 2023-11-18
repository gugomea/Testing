use automata::Frontend::*;


#[test]
fn parse_simple_range() {
    let input = "[^]a-zlmnsA-z-]*a|b";
    println!("input: {input}");
    let parsed_input = parser::parse(input).unwrap();
    println!("{:#?}", parsed_input);
}
