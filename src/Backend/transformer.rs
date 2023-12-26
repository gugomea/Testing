use std::{hash::{Hash, Hasher}, collections::{hash_map::DefaultHasher, HashMap}};

use super::{nfa::NFA, dfa::DFA, intervals::Interval, nfa::Table};

//If any of the ComplexState(our simple states on the dfa) has a
//state that is final on the nfa, or have empty transition to 
//(to some state that itself have some empty transition path to an end state, the end state itself is valid),
//this new state will be final too.
// example:
// q0 --ε-->  q1 --ε--> q2 --ε--> q3
// ^                              ^
// |                              |
// start                        end
//then the states containging q0, have to be final, since there is a chain, of empty
//transitions that lead to a final state.
fn empty_transitions(nfa: &NFA, state: isize) -> Vec<isize> {
    let mut stack = vec![state];
    let mut visited: Vec<isize> = vec![];
    let mut result = vec![];

    while let Some(last) = stack.pop() {
        visited.push(last);
        let locations = &nfa.empty_transitions[last as usize];
        for location in locations {
            let location = location + last;
            if !visited.contains(&location) {
                stack.push(location);
                result.push(location);
            }
        }
    }

    //println!("  resulting empty transitions from state: {state}: {:?}", result);

    return result;
}

fn δn(nfa: &NFA, L: &ComplexState, a: Interval) -> Option<ComplexState> {
    let from_letter = L.states
        .iter()
        .filter_map(|state| unsafe {
            let image = nfa.transition_function
                .get_unchecked(*state as usize)
                .get(a)
                .cloned()?;
            Some(image.into_iter().map(|x| x + *state))
        })
        .flatten()
        .collect::<Vec<_>>();

    let from_empty = from_letter.iter()//.chain(&L.states)
        .flat_map(|state| empty_transitions(nfa, *state))
        .collect::<Vec<_>>();
    let mut all = [from_letter, from_empty].concat();
    all.sort();
    all.dedup();

    match all.is_empty() {
        true => None,
        false => Some(ComplexState::new(all)),
    }
}

//Algorithm we are going to follow:
// [ ] Closure => Is the set of states we can go trough ε-transitions from our current set of states.
// [ ] δn => Non-Deterministic Transition function.
// [ ] δd => Deterministic Transition function.
//
//     D := {{ Closure(q0) }}
//     while( ∃ L ∈ D ) do:
//          foreach( a ∈ Σ ) do:
//              T := δ(L, a)
//              if (T ∉ D) do:
//                  D.push(T)
//              end 
//              δd(L, a) = T
//          end 
//     end

pub fn nfa_to_dfa(nfa: &NFA) -> DFA {
    // if nfa.n_states > 0 { unimplemented!("Falta implementar que los intervalos sean todos disjuntos"); }

    let mut D = vec![ComplexState::new([vec![0], empty_transitions(nfa, 0)].concat())];
    //let Σ = nfa.alphabet();
    let Σ = vec![
        Interval::new('a', 'a'),
        Interval::new('b', 'b'),
        Interval::new('c', 'c'),
        Interval::new('d', 'd'),
        Interval::new('e', 'e'),
        Interval::new('f', 'f'),
    ];
    //println!("alphabet: {:?}", Σ);
    let mut δd = vec![Table::default()];

    let mut nfa_to_dfa_states: HashMap<ComplexState, usize> = HashMap::new();
    nfa_to_dfa_states.insert(D[0].clone(), 0);

    let mut cont = 1;
    while let Some(L) = D.pop() {
        let L_DFA = *nfa_to_dfa_states.get(&L).unwrap();
        for &a in &Σ {
            if let Some(T) = δn(nfa, &L, a) { //ignore error transition
                let T_DFA = match nfa_to_dfa_states.get(&T) {
                    Some(state) => *state,
                    None => {
                        let current = cont;
                        nfa_to_dfa_states.insert(T.clone(),  current);
                        δd.push(Table::default());
                        D.push(T);
                        cont += 1;
                        current
                    }
                };
                δd[L_DFA].add(a, T_DFA);
            }
        }
    }

    let last = nfa.n_states - 1;
    let n_states = nfa_to_dfa_states.len();
    let mut final_states = vec![false; n_states];

    for (complex, simple) in nfa_to_dfa_states {
        if complex.states.contains(&(last as isize)) {
            final_states[simple] = true;
        }
    }

    DFA {
        n_states,
        current: 0,
        final_states,
        transition_function: δd,
    }
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
struct ComplexState {
    //this attribute first so equals is faster, because if they are equal, 
    //at least the hash has to be the same.
    calculated_hash: u64,
    //this vector is expected to be sorted when calculating the hash, otherwise we could
    //have inconsistency with previusly created states from the NFA.
    states: Vec<isize>,
}


impl ComplexState {
    fn new(mut states: Vec<isize>) -> Self {
        states.sort();
        let mut hasher = DefaultHasher::new();
        states.hash(&mut hasher);
        let calculated_hash = hasher.finish();
        Self { calculated_hash, states }
    }

    fn hash(&self) -> u64 {
        self.calculated_hash
    }
}

impl Hash for ComplexState {
    fn hash<H: Hasher>(&self, state: &mut H) {
        state.write_u64(self.hash())
    }
}

#[test]
fn hash_test() {

    let states = HashMap::from([(ComplexState::new(vec![1, 2, 3, 4, 5]), 1)]);

    let possible_key1 = ComplexState::new(vec![1, 2, 5, 4, 3]);
    let possible_key2 = ComplexState::new(vec![3, 2, 5, 4, 1]);
    let impossible_key1 = ComplexState::new(vec![3, 2, 5, 4, 1, 1]); 
    let impossible_key2 = ComplexState::new(vec![1, 2, 3, 4, 5, 6]); 

    assert_eq!(Some(&1), states.get(&possible_key1));
    assert_eq!(Some(&1), states.get(&possible_key2));
    assert_eq!(None, states.get(&impossible_key1));
    assert_eq!(None, states.get(&impossible_key2));
}

#[test]
fn simple_compilation() {
    use crate::Frontend::parser::parse;
    use super::build::build;
    //let input = "((a|bc|de*)+|((f)))f+f?".repeat(1);
    let input = "(a|b)|cd".repeat(1);
    let instant = std::time::Instant::now();
    let regex = parse(&input).unwrap();
    let nfa = build(regex);
    //println!("{:#?}", nfa);
    let dfa = nfa_to_dfa(&nfa);
    let elapsed = instant.elapsed();
    println!("elapsed: {:?}", elapsed);

    dbg!(dfa);
}
