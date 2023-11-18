use std::ops::Add;
use crate::Backend::intervals::Interval;
use serde::{Serialize, Deserialize};

#[derive(Clone, PartialEq, Eq, PartialOrd, Ord, Debug, Serialize, Deserialize)]
pub struct Transition<T> {
    start : Interval,
    end: Vec<T>
}

impl<T: Add<Output = T> + Copy + Clone> Transition<T> {
    pub fn new(start: Interval, end: Vec<T>) -> Self {
        Transition { start, end }
    }

    pub fn empty(start: Interval) -> Self {
        Transition::new(start, vec![])
    }

    pub fn push(&mut self, destination: T) {
        self.end.push(destination);
    }
}

#[derive(Clone, PartialEq, Eq, PartialOrd, Ord, Debug, Default, Serialize, Deserialize)]
pub struct Table<T> {
    transitions: Vec<Transition<T>>,
}

impl<T: Add<Output = T> + Copy + Clone> Table<T> {
    fn get_mut(&mut self, it: Interval) -> Option<&mut Transition<T>> {
        self.transitions.iter_mut().find(|x| x.start == it)
    }

    pub fn push(&mut self, it: Interval, destination: T) {
        match self.get_mut(it) {
            Some(transition) => transition.push(destination),
            None => self.transitions.push(Transition::new(it, vec![destination])),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NFA {
    pub n_states: usize,
    pub current: usize,
    pub empty_transitions: Vec<Vec<isize>>,
    pub transition_function: Vec<Table<isize>>,
}

impl Default for NFA {
    fn default() -> Self {
        Self {
            n_states: 1,
            current: 0,
            empty_transitions: vec![vec![]],
            transition_function: vec![Table::default()],
        }
    }
}

impl NFA {

    pub fn is_simple(&self) -> Option<Interval>{
        let tf = &self.transition_function[0];
        let leads_to_one_state = tf.transitions.len() == 1 && tf.transitions[0].end.len() == 1;
        if !leads_to_one_state { return None; }
        
        return Some(tf.transitions[0].start);
    }

    pub fn simple(it: Interval) -> Self {
        let transitions = vec![Transition::new(it, vec![1isize])];
        let table = Table { transitions };
        Self {
            n_states: 2,
            current: 0,
            empty_transitions: vec![vec![], vec![]],
            transition_function: vec![table, Table::default()],

        }
    }

    pub fn from_range(intervals: impl Iterator<Item = Interval>) -> Self {
        let transitions = intervals
            .map(|it| Transition::new(it, vec![1isize]))
            .collect();
        let table = Table { transitions };
        Self {
            n_states: 2,
            current: 0,
            empty_transitions: vec![vec![], vec![]],
            transition_function: vec![table, Table::default()],

        }
    }

    pub fn concat(mut nfa1: Self, nfa2: Self) -> Self {
        let (n, m) = (nfa1.n_states, nfa2.n_states);
        nfa1.empty_transitions.last_mut().unwrap().push(1);

        Self {
            n_states: n + m,
            current: 0,
            empty_transitions: [nfa1.empty_transitions, nfa2.empty_transitions].concat(),
            transition_function: [nfa1.transition_function, nfa2.transition_function].concat(),
        }
    }

    pub fn concat_directly(nfa1: Self, nfa2: Self, interval: Interval) -> Self {
        let (n, m) = (nfa1.n_states, nfa2.n_states);
        let mut tf = [nfa1.transition_function, nfa2.transition_function[1..].to_vec()].concat();
        tf.get_mut(n - 1).unwrap().push(interval, 1);

        Self {
            n_states: n + m - 1,
            current: 0,
            empty_transitions: [nfa1.empty_transitions, nfa2.empty_transitions[1..].to_vec()].concat(),
            transition_function: tf,
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
            current: 0,
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
            current: 0,
            empty_transitions: ets,
            transition_function: tfs,
        }

    }

    pub fn optional(mut nfa: NFA) -> Self {
        let n = nfa.n_states as isize;
        nfa.empty_transitions[0].push(n - 1);
        nfa
    }

    pub fn one_or_more(mut nfa: NFA) -> Self {
        let n = nfa.n_states;
        nfa.empty_transitions[n - 1].push(-(n as isize) + 1);
        nfa
    }

    pub fn zero_or_more(mut nfa: NFA) -> Self {
        let n = nfa.n_states;
        nfa.empty_transitions[0].push(n as isize - 1);
        nfa.empty_transitions[n - 1].push(-(n as isize) + 1);
        nfa
    }

}

#[test]
fn concatenation() {
    let mut trs = Table::default();
    trs.transitions.push(Transition::new(Interval::char('a'), vec![1]));
    let nfa1 = NFA {
        n_states: 2,
        current: 0,
        empty_transitions: vec![vec![], vec![]],
        transition_function: vec![trs, Table::default()],
    };

    let mut trs = Table::default();
    trs.transitions.push(Transition::new(Interval::char('b'), vec![1]));
    let nfa2 = NFA {
        n_states: 2,
        current: 0,
        empty_transitions: vec![vec![], vec![]],
        transition_function: vec![trs, Table::default()],
    };

    println!("{:#?}", NFA::concat(nfa1.clone(), nfa2.clone()));

    println!("{:#?}", NFA::concat_directly(nfa1.clone(), nfa2.clone(), Interval::char('b')));
}

#[test]
fn union() {
    let crear = |ch: char| {
        let mut trs = Table::default();
        trs.transitions.push(Transition::new(Interval::char(ch), vec![1]));
        NFA {
            n_states: 2,
            current: 0,
            empty_transitions: vec![vec![], vec![]],
            transition_function: vec![trs, Table::default()],
        }
    };
    println!("{:#?}", NFA::union(vec![
                                 crear('a'), crear('b'),crear('c'), crear('d')
    ]));
}
