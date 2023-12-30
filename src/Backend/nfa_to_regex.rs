use std::{cell::RefCell, collections::{HashMap, HashSet}};
use serde::{Serialize, Deserialize};
use crate::Frontend::tokens::Expression;
use super::nfa::NFA;

#[test]
fn GNFA_fromNFA() {
        use crate::Frontend::parser::parse;
        use crate::Backend::build::build;

        let input = "(ab)*";
        let regex_ast = parse(input).unwrap();
        let nfa = build(regex_ast);

        let (start, end) = (NFA::default(), NFA::default());
        let nfa = NFA::concat_all([start, nfa, end].into_iter());
        let GNFA = GNFA::from_nfa(&nfa);

        for i in 1..nfa.n_states - 1 {
            GNFA.rip_state(i);
        }

        for (k, v) in GNFA.flow.borrow().iter() {
            if k == &(0, GNFA.n_states - 1) {
                println!("{:?} => {}", k, v);
            }
        }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GNFA {
    n_states: usize,
    current: usize,
    flow: RefCell<HashMap<(usize, usize), Expression>>,
    ripped: RefCell<HashSet<usize>>,
}

impl GNFA {

    fn from_nfa(nfa: &NFA) -> Self {
        let n_states = nfa.n_states;

        let mut flow: HashMap<(usize, usize), Expression> = HashMap::new();
        for i in 0..n_states {
            let empty = [(Expression::empty, nfa.empty_transitions[i].clone())].into_iter();
            let current = nfa.transition_function[i].transitions.clone()
                .into_iter()
                .map(|x| (Expression::l(x.start.exp()), x.end))
                .chain(empty);

            for (exp, transitions) in current {
                for t in transitions {
                    let t = (t + i as isize) as usize;
                    match flow.get_mut(&(i, t)) {
                        Some(Expression::union(vec)) => vec.push(exp.clone()),
                        Some(ex) => *ex = Expression::union(vec![ex.clone(), exp.clone()]),
                        None => {flow.insert((i, t), exp.clone());}
                    };
                }
            }
        }

        GNFA {
            n_states,
            current: 0,
            flow: RefCell::new(flow),
            ripped: RefCell::new(HashSet::new()),
        }
    }

    fn rip_state(&self, state: usize) {
        let mut ripped = self.ripped.borrow_mut();
        assert!(!ripped.contains(&state), "This state has been ripped, the order of the sates doesn't change");

        
        let mut flow = self.flow.borrow_mut();
        let Q = flow.clone().into_iter()
            .filter(|((from, to), _)| *to == state && !ripped.contains(from))
            .collect::<Vec<_>>();
        let R = flow.clone().into_iter()
            .filter(|((from, to), _)| *from == state && !ripped.contains(to))
            .collect::<Vec<_>>();

        let self_transition= Q.iter()
            .find(|((from, to), _)| *from == state && *to == state)
            .map(|(_, exp)| Expression::zero_or_more(Box::new(exp.clone())))
            .unwrap_or(Expression::empty);
        for ((Qi, _), Ei) in &Q {
            let left_side = Expression::concatenate(Ei.clone(), self_transition.clone());

            for((_, Rj), Ej) in &R {
                let right_side = Ej.clone();
                if *Qi == *Rj && *Qi == state {
                    continue;
                }
                let full_expression = Expression::concatenate(left_side.clone(), right_side);
                match flow.get_mut(&(*Qi, *Rj)) {
                    Some(Expression::union(v)) => v.push(full_expression),
                    Some(value) => *value = Expression::union(vec![value.clone(), full_expression]),
                    None => {flow.insert((*Qi, *Rj), full_expression);}
                };
            }
        }
        ripped.insert(state);
    }
}

pub fn nfa_to_regex(_nfa: &GNFA) -> Expression {
    unimplemented!()
}
