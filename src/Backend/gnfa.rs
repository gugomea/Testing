use std::{cell::RefCell, collections::{HashMap, HashSet}, ops::Deref};
use serde::{Serialize, Deserialize};
use crate::Frontend::{tokens::Expression, parser::parse, error::ParsingError};
use super::{nfa::NFA, intermediate_automata::IRAutoamta};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GNFA {
    pub n_states: usize,
    current: usize,
    pub flow: RefCell<HashMap<(usize, usize), Expression>>,
    pub ripped: RefCell<HashSet<usize>>,
}

impl TryFrom<IRAutoamta> for GNFA {
    type Error = ParsingError;
    fn try_from(autoamta: IRAutoamta) -> Result<Self, Self::Error> {
        let mut flow = HashMap::new();
        let mut size = HashSet::new();
        for(k, expressions) in  autoamta.transition_map {
            let mut union_vec = vec![];
            let mut contains_empty = false;
            for exp in expressions {
                match exp.deref() {
                    "ε" => contains_empty = true,
                    e => union_vec.push(parse(e)?),
                }
            }
            if contains_empty { union_vec.push(Expression::empty); }
            if union_vec.len() > 1 {
                flow.insert(k, Expression::union(union_vec));
            } else if union_vec.len() == 1 {
                flow.insert(k, union_vec.pop().unwrap());
            }
            size.insert(k.0);
            size.insert(k.1);
        }
        return Ok(Self {
            n_states: size.len(),
            current: 0,
            flow: RefCell::new(flow),
            ripped: RefCell::new(HashSet::new()),
        })
    }
}

impl GNFA {

    pub fn from_nfa(nfa: &NFA) -> Self {
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

    pub fn rip_state(&self, state: usize) {
        let mut ripped = self.ripped.borrow_mut();
        assert!(!ripped.contains(&state), "This state has been ripped, the order of the sates doesn't change");
        
        let mut flow = self.flow.borrow_mut();
        let Q: Vec<_> = flow.clone().into_iter()
            .filter(|((from, to), _)| *to == state && !ripped.contains(from))
            .collect();
        let R: Vec<_> = flow.clone().into_iter()
            .filter(|((from, to), _)| *from == state && !ripped.contains(to))
            .collect();

        let self_transition= Q.iter()
            .filter(|(_, e)| e != &Expression::empty)
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

pub fn nfa_to_regex(gnfa: &GNFA) -> Option<Expression> {
        for i in 1..gnfa.n_states - 1 {
            println!("ripping state {i}...");
            gnfa.rip_state(i);
            gnfa.flow.borrow()
                .iter()
                .for_each(|(k, v)| println!("{:?} => {}", k , v));
        }
        return gnfa.flow.borrow().get(&(0, gnfa.n_states - 1)).cloned()
}
