use std::ops::Add;

#[derive(Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Debug)]
pub struct Interval {
    first: char,
    last: char,
}

impl Interval {
    pub fn char(ch: char) -> Self {
        Interval { first: ch, last: ch }
    }
}

use crate::Frontend::tokens::Literal;
impl From<Literal> for Interval {
    fn from(value: Literal) -> Self {
        match value {
            Literal::atom(ch) => Interval { first: ch, last: ch },
            Literal::anyLiteral => Interval { first: '\u{0}', last: char::MAX },
            Literal::range(rng) => Interval { first: *rng.start(), last: *rng.end() },
        }
    }
}

impl Interval {
    pub fn new(first: char, last: char) -> Self {
        Interval { first, last }
    }
}

#[derive(Clone, PartialEq, Eq, PartialOrd, Ord, Debug)]
pub struct Transition<T: Add + Copy + Clone> {
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

#[derive(Clone, PartialEq, Eq, PartialOrd, Ord, Debug, Default)]
pub struct Table<T: Add + Copy + Clone> {
    transitions: Vec<Transition<T>>,
}

impl<T: Add<Output = T> + Copy + Clone> Table<T> {
    pub fn get_mut(&mut self, it: Interval) -> Option<&mut Transition<T>> {
        self.transitions.iter_mut().find(|x| x.start == it)
    }

    pub fn push(&mut self, it: Interval, destination: T) {
        match self.get_mut(it) {
            Some(transition) => transition.push(destination),
            None => self.transitions.push(Transition::new(it, vec![destination])),
        }
    }

    fn offset(self, offset: T) -> Self {
        let transitions = self.transitions.into_iter()
            .map(|x| Transition::new(x.start, x.end.into_iter().map(|v| v + offset).collect()))
            .collect::<Vec<_>>();
        Self { transitions }
    }

    pub fn offset_tables(tables: Vec<Table<T>>, offset: T) -> Vec<Table<T>> {
        tables.into_iter().map(|t| t.offset(offset)).collect()
    }
}

#[derive(Debug, Clone)]
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

    pub fn concat(mut nfa1: NFA, nfa2: NFA) -> NFA {
        let (n, m) = (nfa1.n_states, nfa2.n_states);
        nfa1.empty_transitions.last_mut().unwrap().push(1);

        Self {
            n_states: n + m,
            current: 0,
            empty_transitions: [nfa1.empty_transitions, nfa2.empty_transitions].concat(),
            transition_function: [nfa1.transition_function, nfa2.transition_function].concat(),
        }
    }

    pub fn concat_directly(nfa1: NFA, nfa2: NFA, interval: Interval) -> NFA {
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

    pub fn union(nfas: Vec<NFA>) -> NFA {
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
