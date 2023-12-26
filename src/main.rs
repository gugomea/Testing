use automata::{Backend::build::build, Backend::transformer::nfa_to_dfa};
use automata::Frontend::parser::parse;
fn main () {
    for _ in 0..10 {
        let input = "((a|bc|de*)+|((f)))f+f?".repeat(50);

        let instant = std::time::Instant::now();
        let regex = parse(&input).unwrap();
        let nfa = build(regex);
        let _dfa = nfa_to_dfa(&nfa);

        let elapsed = instant.elapsed();
        //dbg!(dfa);
        println!("elapsed: {:?}", elapsed);
    }
}
