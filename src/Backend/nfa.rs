use std::{collections::HashSet, fmt::Debug};
use serde::{Serialize, Deserialize};
use crate::Frontend::{parser::parse, tokens::Literal};

use super::{automata::{Alphabet, Automata, Table, Transition}, build::build, intermediate_automata::IRAutoamta};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct NFA<T: PartialOrd + Eq + PartialEq + Clone + Copy + Alphabet<T>> {
    pub n_states: usize,
    pub current: Option<HashSet<usize>>,
    pub empty_transitions: Vec<Vec<isize>>,
    pub transition_function: Vec<Table<T, Vec<isize>>>,
}

impl<T: PartialOrd + Eq + PartialEq + Clone + Copy + Alphabet<T> + From<Literal>> TryFrom<IRAutoamta> for NFA<T> {
    type Error = Box<dyn std::error::Error>;
    fn try_from(automata: IRAutoamta) -> Result<Self, Self::Error> {
        let n = automata.transition_map.iter()
            .flat_map(|(x, _)| [x.0, x.1])
            .max().unwrap();
        let mut et = vec![vec![]; n + 1];
        let mut tf = vec![Table::default(); n + 1];
        for((from, to), expressions) in  automata.transition_map {
            for exp in expressions {
                match exp.as_ref() {
                    "ε" => et[from].push(to as isize - from as isize),
                    e => {
                        let expression = parse(e)?;
                        let err_msg = expression.to_string();
                        let mut nfa = build::<T>(expression);
                        if nfa.n_states != 2 {
                            return Err(format!("Expected Literal, found: Expression: {}", err_msg).into());
                        }
                        let mut transitions = nfa.transition_function.swap_remove(0).transitions;
                        transitions.iter_mut().for_each(|t| t.end = vec![to as isize - from as isize]);
                        tf[from].transitions.append(&mut transitions);
                    },
                };
            }
        }

        let mut nfa = NFA {
            n_states: n + 1,
            current: None,
            empty_transitions: et,
            transition_function: tf,
        };
        nfa.set_current(Some(HashSet::from([0])));
        return Ok(nfa);
    }
}

impl<T: PartialOrd + Eq + PartialEq + Clone + Copy + Alphabet<T>> Automata<T, HashSet<usize>> for NFA<T> {
    fn set_current(&mut self, curr: Option<HashSet<usize>>) {
        self.current = match curr {
            Some(current) => Some(self.closure(current.into_iter())),
            None => None,
        };
    }

    fn next(&self, input: T) -> Option<HashSet<usize>> {
        let Some(current) = &self.current else {return None};
        let result: HashSet<usize> = current
            .iter()
            .flat_map(|&x| self.tf(x, input))
            .collect();
        if result.is_empty() { None } else { Some(result) }
    }

    fn is_error(&self) -> bool {
        self.current.is_none()
    }

    fn is_final(&self) -> bool {
        !self.is_error() &&
        self.current.as_ref().unwrap().contains(&(self.n_states - 1))
    }
}

impl<T: PartialOrd + Eq + PartialEq + Clone + Copy + Alphabet<T>> Default for NFA<T> {
    fn default() -> Self {
        Self {
            n_states: 1,
            current: Some(HashSet::from([0])),
            empty_transitions: vec![vec![]],
            transition_function: vec![Table::default()],
        }
    }
}

impl<T: PartialOrd + Eq + PartialEq + Clone + Copy + Alphabet<T>> NFA<T> {

    pub fn tf(&self, state: usize, input: T) -> HashSet<usize> {
        let normalize = |a: isize| (state as isize + a) as usize;
        let from_empty = self.empty_transitions[state].clone().into_iter().map(normalize).chain([state]);
        //closure of the set of { 'state' + "states through the empty transitions from 'state'" }
        self.closure(
            from_empty.flat_map(|st|
                self.transition_function[st].get(input)
                .cloned()
                .unwrap_or(vec![])
                .into_iter()
                .map(move |a| (st as isize + a) as usize)
            )
        )
    }

    fn closure(&self, v: impl Iterator<Item = usize>) -> HashSet<usize>{
        let mut stack: Vec<usize> = v.collect();
        let mut result = HashSet::new();
        while let Some(curr) = stack.pop() {
            if result.contains(&curr) { continue; }
            for &i in &self.empty_transitions[curr] {
                let aux = (i + curr as isize) as usize;
                if !result.contains(&aux) {
                    stack.push(aux);
                }
            }
            result.insert(curr);
        }
        return result;
    }

    pub fn is_simple(&self) -> Option<T>{
        let tf = &self.transition_function[0];
        let leads_to_one_state = tf.transitions.len() == 1 && tf.transitions[0].end.len() == 1;
        if !leads_to_one_state { return None; }
        
        return Some(tf.transitions[0].start);
    }

    pub fn alphabet(&self) -> Vec<T> {
        T::unique(
            self.transition_function.iter()
            .map(|ei| ei.transitions.iter().map(|x| x.start))
            .flatten()
        ).collect()
    }

    pub fn simple(it: T) -> Self {
        let transitions = vec![Transition::new(it, vec![1isize])];
        let table = Table { transitions };
        Self {
            n_states: 2,
            current: Some(HashSet::from([0])),
            empty_transitions: vec![vec![], vec![]],
            transition_function: vec![table, Table::default()],

        }
    }

    pub fn from_range(intervals: impl Iterator<Item = T>) -> Self {
        let transitions = intervals
            .map(|it| Transition::new(it, vec![1isize]))
            .collect();
        let table = Table { transitions };
        Self {
            n_states: 2,
            current: Some(HashSet::from([0])),
            empty_transitions: vec![vec![], vec![]],
            transition_function: vec![table, Table::default()],

        }
    }

    pub fn concat(mut nfa1: Self, nfa2: Self) -> Self {
        let (n, m) = (nfa1.n_states, nfa2.n_states);
        nfa1.empty_transitions.last_mut().unwrap().push(1);

        Self {
            n_states: n + m,
            current: Some(HashSet::from([0])),
            empty_transitions: [nfa1.empty_transitions, nfa2.empty_transitions].concat(),
            transition_function: [nfa1.transition_function, nfa2.transition_function].concat(),
        }
    }

    pub fn concat_directly(nfa1: Self, nfa2: Self, interval: T) -> Self {
        let (n, m) = (nfa1.n_states, nfa2.n_states);
        let mut tf = [nfa1.transition_function, nfa2.transition_function[1..].to_vec()].concat();
        let last = tf.get_mut(n - 1).unwrap();
        match last.get_mut(interval) {
            Some(table) => table.end.push(1),
            None => last.transitions.push(Transition::new(interval, vec![1])),
        }

        Self {
            n_states: n + m - 1,
            current: Some(HashSet::from([0])),
            empty_transitions: [nfa1.empty_transitions, nfa2.empty_transitions[1..].to_vec()].concat(),
            transition_function: tf,
        }
    }

    pub fn concat_all_directly(mut nfas: impl Iterator<Item = Self>) -> Self {
        let first = nfas.next().unwrap();
        //println!("FIRST: {:#?}", first);
        let mut tfs = first.transition_function;
        let mut ets = first.empty_transitions;

        for (_i, mut nfa) in nfas.enumerate() {
            let mut l_ets = ets.pop().unwrap();
            let l_tfs = tfs.pop().unwrap();
            for mut t in l_tfs.transitions {
                match nfa.transition_function[0].get_mut(t.start) {
                    Some(v) => v.end.append(&mut t.end),
                    None => nfa.transition_function[0].transitions.push(t),
                }
            }

            nfa.empty_transitions[0].append(&mut l_ets);

            tfs.append(&mut nfa.transition_function);
            ets.append(&mut nfa.empty_transitions);
        }

        Self {
            n_states: tfs.len(),
            current: Some(HashSet::from([0])),
            empty_transitions: ets,
            transition_function: tfs,
        }
    }

    pub fn concat_all(nfas: impl Iterator<Item = Self>) -> Self {
        let mut tfs = vec![];
        let mut ets = vec![];

        for (_i, mut nfa) in nfas.enumerate() {
            tfs.append(&mut nfa.transition_function);
            nfa.empty_transitions.last_mut().unwrap().push(1);
            ets.append(&mut nfa.empty_transitions);
        }

        let _ = ets.last_mut().unwrap().pop();

        Self {
            n_states: tfs.len(),
            current: Some(HashSet::from([0])),
            empty_transitions: ets,
            transition_function: tfs,
        }

    }

    pub fn union(nfas: Vec<Self>) -> Self {
        let l = nfas.len();

        let mut prefix_sum = vec![0isize; l];
        let mut total = nfas.last().unwrap().n_states as isize;
        prefix_sum[0] = 1;
        for i in 1..l {
            let n = *(&nfas[i - 1].n_states) as isize;
            prefix_sum[i] = prefix_sum[i - 1] + n;
            total += n;
        }

        let mut tfs = vec![Table::default()];
        let mut ets = vec![prefix_sum];

        let mut n = 0;
        for (_i, mut nfa) in nfas.into_iter().enumerate() {
            n += nfa.n_states;
            tfs.append(&mut nfa.transition_function);
            ets.append(&mut nfa.empty_transitions);
            ets.last_mut().unwrap().push(total + 1 - n as isize);
        }

        tfs.push(Table::default());
        ets.push(vec![]);

        Self {
            n_states: n + 2,
            current: Some(HashSet::from([0])),
            empty_transitions: ets,
            transition_function: tfs,
        }

    }

    pub fn push_empty(&mut self) {
        let n = self.n_states;
        self.n_states += 1;
        self.empty_transitions[n - 1].push(1);
        self.transition_function.push(Table::default());
        self.empty_transitions.push(vec![]);
    }

    pub fn optional(mut nfa: Self) -> Self {
        let n = nfa.n_states as isize;
        nfa.empty_transitions[0].push(n - 1);
        //IMPORTANT
        nfa.push_empty();
        //IMPORTANT
        nfa
    }

    pub fn one_or_more(mut nfa: Self) -> Self {
        let n = nfa.n_states;
        nfa.empty_transitions[n - 1].push(-(n as isize) + 1);
        //IMPORTANT
        nfa.push_empty();
        //IMPORTANT
        nfa
    }

    pub fn zero_or_more(mut nfa: Self) -> Self {
        let n = nfa.n_states;
        nfa.empty_transitions[0].push(n as isize - 1);
        nfa.empty_transitions[n - 1].push(-(n as isize) + 1);
        //IMPORTANT
        nfa.push_empty();
        //IMPORTANT
        nfa
    }

}

#[cfg(test)]
mod unit_test {
    use super::*;
    use crate::Backend::intervals::Interval;

    fn create(ch: char) -> NFA<Interval<()>> {
        let mut trs = Table::default();
        trs.transitions.push(Transition::new(Interval::char(ch), vec![1]));
        NFA {
            n_states: 2,
            current: Some(HashSet::from([0])),
            empty_transitions: vec![vec![], vec![]],
            transition_function: vec![trs, Table::default()],
        }
    }

    #[test]
    fn concatenation() {
        let nfa1 = create('a');
        let nfa2 = create('b');

        let simple_concatenation = NFA::concat(nfa1.clone(), nfa2.clone());
        let direct_concatenation = NFA::concat_directly(nfa1.clone(), nfa2.clone(), Interval::char('b'));
        let direct_concatenation_general = NFA::concat_all_directly([nfa1.clone(), nfa2.clone()].into_iter());

        //Nº of states
        assert_eq!(simple_concatenation.n_states, 4, "SIMPLE CONCATENATION: Expected nº of states: 4");
        assert_eq!(direct_concatenation.n_states, 3, "DIRECT CONCATENATION: Expected nº of states: 3");
        assert_eq!(direct_concatenation_general.n_states, 3, "DIRECT GENERAL CONCATENATION: Expected nº of states: 3");

        //Empty transitions
        assert_eq!(simple_concatenation.empty_transitions, vec![vec![], vec![1], vec![], vec![]], "SIMPLE CONCATENATION");
        assert_eq!(direct_concatenation.empty_transitions, vec![vec![], vec![], vec![]], "DIRECT CONCATENATION");
        assert_eq!(direct_concatenation_general.empty_transitions, vec![vec![], vec![], vec![]], "DIRECT GENERAL CONCATENATION");

        //Transition function
        let simple_table = vec![
            Table { transitions: vec![Transition::new(Interval::char('a'), vec![1])] }, Table::default(),
            Table { transitions: vec![Transition::new(Interval::char('b'), vec![1])] }, Table::default(),
        ];
        let direct_table = vec![
            Table { transitions: vec![Transition::new(Interval::char('a'), vec![1])] },
            Table { transitions: vec![Transition::new(Interval::char('b'), vec![1])] }, Table::default(),
        ];
        let direct_table_general = vec![
            Table { transitions: vec![Transition::new(Interval::char('a'), vec![1])] },
            Table { transitions: vec![Transition::new(Interval::char('b'), vec![1])] }, Table::default(),
        ];
        assert_eq!(simple_concatenation.transition_function, simple_table, "SIMPLE CONCATENATION");
        assert_eq!(direct_concatenation.transition_function, direct_table, "DIRECT CONCATENATION");
        assert_eq!(direct_concatenation_general.transition_function, direct_table_general, "DIRECT GENERAL CONCATENATION");
    }

    #[test]
    fn union() {
        let union_automata = NFA::union(vec![create('a'), create('b'),create('c'), create('d')]);
        //Nº of states
        assert_eq!(union_automata.n_states, 10, "Nº states");
        //Empty transition
        let non_empty: Vec<Vec<isize>> = union_automata.empty_transitions.clone().into_iter().filter(|x| !x.is_empty()).collect();
        assert_eq!(non_empty, vec![vec![1, 3, 5, 7], vec![7], vec![5], vec![3], vec![1]], "Empty transitions");
        //Transition function
        let tf = union_automata.transition_function[1].get(Interval::char('a'));
        assert_eq!(tf, Some(&vec![1]), "Transition function: a");
        let tf = union_automata.transition_function[3].get(Interval::char('b'));
        assert_eq!(tf, Some(&vec![1]), "Transition function: b");
        let tf = union_automata.transition_function[5].get(Interval::char('c'));
        assert_eq!(tf, Some(&vec![1]), "Transition function: c");
        let tf = union_automata.transition_function[7].get(Interval::char('d'));
        assert_eq!(tf, Some(&vec![1]), "Transition function: d");
    }

    #[test]
    fn optional() {
        let nfa = NFA::concat_all_directly([NFA::optional(create('a')), create('b')].into_iter());
        //Nº of states
        assert_eq!(nfa.n_states, 4, "Nº states");
        //Empty transition
        let empty: Vec<Vec<isize>> = vec![vec![1], vec![1], vec![], vec![]];
        assert_eq!(empty, nfa.empty_transitions, "Empty transitions");
        //Transition function
        let tf = nfa.transition_function[0].get(Interval::char('a'));
        assert_eq!(tf, Some(&vec![1]), "Transition function: a");
        let tf = nfa.transition_function[2].get(Interval::char('b'));
        assert_eq!(tf, Some(&vec![1]), "Transition function: b");
    }

    #[test]
    fn zero_or_more() {
        let nfa = NFA::concat_all_directly([NFA::zero_or_more(create('a')), create('b')].into_iter());
        //Nº of states
        assert_eq!(nfa.n_states, 4, "Nº states");
        //Empty transition
        let empty: Vec<Vec<isize>> = vec![vec![1], vec![-1, 1], vec![], vec![]];
        assert_eq!(empty, nfa.empty_transitions, "Empty transitions");
        //Transition function
        let tf = nfa.transition_function[0].get(Interval::char('a'));
        assert_eq!(tf, Some(&vec![1]), "Transition function: a");
        let tf = nfa.transition_function[2].get(Interval::char('b'));
        assert_eq!(tf, Some(&vec![1]), "Transition function: b");
    }

    #[test]
    fn one_or_more() {
        let nfa = NFA::concat_all_directly([NFA::one_or_more(create('a')), create('b')].into_iter());
        //Nº of states
        assert_eq!(nfa.n_states, 4, "Nº states");
        //Empty transition
        let empty: Vec<Vec<isize>> = vec![vec![], vec![-1, 1], vec![], vec![]];
        assert_eq!(empty, nfa.empty_transitions, "Empty transitions");
        //Transition function
        let tf = nfa.transition_function[0].get(Interval::char('a'));
        assert_eq!(tf, Some(&vec![1]), "Transition function: a");
        let tf = nfa.transition_function[2].get(Interval::char('b'));
        assert_eq!(tf, Some(&vec![1]), "Transition function: b");

    }
}

