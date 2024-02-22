use std::{char, collections::HashSet, fmt::Debug, iter::Peekable, time::Instant};

use crate::Backend::intervals::Interval;
use serde::{Serialize, Deserialize};

trait Automata<Domain, Image>
where Domain: PartialEq + Eq + PartialOrd + Debug + Clone,
{
    fn matches(&mut self, input: &mut Peekable<impl Iterator<Item = Domain>>) -> Option<Vec<Domain>>;
    fn next(&self, input: Domain) -> Image;
    fn is_final(&self) -> bool;
    fn is_error(&self) -> bool;
}

#[derive(Clone, PartialEq, Eq, PartialOrd, Ord, Debug, Serialize, Deserialize)]
pub struct Transition<Domain, Image> {
    pub start : Domain,
    pub end: Image
}

impl<Image: Clone + Default, Domain: Copy + Clone + PartialEq + Eq> Transition<Domain, Image> {
    pub fn new(start: Domain, end: Image) -> Self {
        Transition { start, end }
    }

    pub fn empty(start: Domain) -> Self {
        Transition::new(start, Image::default())
    }
}

#[derive(Clone, PartialEq, Eq, PartialOrd, Ord, Debug, Serialize, Deserialize)]
pub struct Table<Domain, Image> {
    pub transitions: Vec<Transition<Domain, Image>>,
}

impl<Domain, Image> Default for Table<Domain, Image> {
    fn default() -> Self {
        Self { transitions: vec![] }
    }
}

impl<Image: Clone + Default, Domain: Copy + Clone + PartialEq + Eq + PartialOrd> Table<Domain, Image> {
    pub fn get_mut(&mut self, it: Domain) -> Option<&mut Transition<Domain, Image>> {
        self.transitions.iter_mut().find(|x| x.start >= it)
    }

    pub fn get(&self, it: Domain) -> Option<&Image> {
        Some(&self.transitions.iter().find(|x| x.start >= it)?.end)
    }

    pub fn from_tuples(transitions: Vec<(Domain, Image)>) -> Self {
        Self { 
            transitions: transitions.into_iter().map(|(d, i)| Transition::new(d, i)).collect(),
        }
    }

    pub fn add(&mut self, d: Domain, i: Image) {
        self.transitions.push(Transition::new(d, i));
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NFA {
    pub n_states: usize,
    pub current: HashSet<usize>,
    pub empty_transitions: Vec<Vec<isize>>,
    pub transition_function: Vec<Table<Interval, Vec<isize>>>,
}

impl Automata<Interval, HashSet<usize>> for NFA {
    fn next(&self, input: Interval) -> HashSet<usize> {
        self.current
            .iter()
            .flat_map(|&x| self.tf(x, input))
            .collect()
    }

    fn matches(&mut self, input: &mut Peekable<impl Iterator<Item = Interval>>) -> Option<Vec<Interval>> {
        let (mut acc, mut maybe) = (vec![], vec![]);
        self.current = self.closure([0].into_iter());
        //skip not matching characters
        while let Some(&n) = input.peek() {
            let current_states = self.next(n);
            if !current_states.is_empty() {
                break;
            }
            input.next();
        }
        //take longest matching string
        while let Some(&n) = input.peek() {
            let current_states = self.next(n);
            //     error state
            if current_states.is_empty() {
                self.current = current_states;
                return if !acc.is_empty() { Some(acc) } else { None };
            }
            maybe.push(n);
            self.current = current_states;
            if self.is_final() {
                acc.append(&mut maybe);
            }
            input.next();
        }
        return if !acc.is_empty() { Some(acc) } else { None };
    }

    fn is_error(&self) -> bool {
        self.current.is_empty()
    }

    fn is_final(&self) -> bool {
        !self.is_error() &&
        self.current.contains(&(self.n_states - 1))
    }
}

impl Default for NFA {
    fn default() -> Self {
        Self {
            n_states: 1,
            current: HashSet::from([0]),
            empty_transitions: vec![vec![]],
            transition_function: vec![Table::default()],
        }
    }
}

impl NFA {

    pub fn tf(&self, state: usize, input: Interval) -> HashSet<usize> {
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

    pub fn is_simple(&self) -> Option<Interval>{
        let tf = &self.transition_function[0];
        let leads_to_one_state = tf.transitions.len() == 1 && tf.transitions[0].end.len() == 1;
        if !leads_to_one_state { return None; }
        
        return Some(tf.transitions[0].start);
    }

    pub fn alphabet(&self) -> Vec<Interval> {
        self.transition_function
            .iter()
            .map(|ei| ei.transitions.iter().map(|x| x.start))
            .flatten()
            .collect()
    }

    pub fn simple(it: Interval) -> Self {
        let transitions = vec![Transition::new(it, vec![1isize])];
        let table = Table { transitions };
        Self {
            n_states: 2,
            current: HashSet::from([0]),
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
            current: HashSet::from([0]),
            empty_transitions: vec![vec![], vec![]],
            transition_function: vec![table, Table::default()],

        }
    }

    pub fn concat(mut nfa1: Self, nfa2: Self) -> Self {
        let (n, m) = (nfa1.n_states, nfa2.n_states);
        nfa1.empty_transitions.last_mut().unwrap().push(1);

        Self {
            n_states: n + m,
            current: HashSet::from([0]),
            empty_transitions: [nfa1.empty_transitions, nfa2.empty_transitions].concat(),
            transition_function: [nfa1.transition_function, nfa2.transition_function].concat(),
        }
    }

    pub fn concat_directly(nfa1: Self, nfa2: Self, interval: Interval) -> Self {
        let (n, m) = (nfa1.n_states, nfa2.n_states);
        let mut tf = [nfa1.transition_function, nfa2.transition_function[1..].to_vec()].concat();
        let last = tf.get_mut(n - 1).unwrap();
        match last.get_mut(interval) {
            Some(table) => table.end.push(1),
            None => last.transitions.push(Transition::new(interval, vec![1])),
        }

        Self {
            n_states: n + m - 1,
            current: HashSet::from([0]),
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
            current: HashSet::from([0]),
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
            current: HashSet::from([0]),
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
            current: HashSet::from([0]),
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

    pub fn optional(mut nfa: NFA) -> Self {
        let n = nfa.n_states as isize;
        nfa.empty_transitions[0].push(n - 1);
        //IMPORTANT
        nfa.push_empty();
        //IMPORTANT
        nfa
    }

    pub fn one_or_more(mut nfa: NFA) -> Self {
        let n = nfa.n_states;
        nfa.empty_transitions[n - 1].push(-(n as isize) + 1);
        //IMPORTANT
        nfa.push_empty();
        //IMPORTANT
        nfa
    }

    pub fn zero_or_more(mut nfa: NFA) -> Self {
        let n = nfa.n_states;
        nfa.empty_transitions[0].push(n as isize - 1);
        nfa.empty_transitions[n - 1].push(-(n as isize) + 1);
        //IMPORTANT
        nfa.push_empty();
        //IMPORTANT
        nfa
    }

}

#[test]
fn concatenation() {
    let mut trs = Table::default();
    trs.transitions.push(Transition::new(Interval::char('a'), vec![1]));
    let nfa1 = NFA {
        n_states: 2,
        current: HashSet::from([0]),
        empty_transitions: vec![vec![], vec![]],
        transition_function: vec![trs, Table::default()],
    };

    let mut trs = Table::default();
    trs.transitions.push(Transition::new(Interval::char('b'), vec![1]));
    let nfa2 = NFA {
        n_states: 2,
        current: HashSet::from([0]),
        empty_transitions: vec![vec![], vec![]],
        transition_function: vec![trs, Table::default()],
    };

    println!("{:#?}", NFA::concat(nfa1.clone(), nfa2.clone()));

    println!("{:#?}", NFA::concat_directly(nfa1.clone(), nfa2.clone(), Interval::char('b')));

    println!("{:#?}", NFA::concat_all_directly(vec![nfa1.clone(), nfa2.clone()].into_iter()));
}

#[test]
fn union() {
    let crear = |ch: char| {
        let mut trs = Table::default();
        trs.transitions.push(Transition::new(Interval::char(ch), vec![1]));
        NFA {
            n_states: 2,
            current: HashSet::from([0]),
            empty_transitions: vec![vec![], vec![]],
            transition_function: vec![trs, Table::default()],
        }
    };
    println!("{:#?}", NFA::union(vec![
            crear('a'), crear('b'),crear('c'), crear('d')
    ]));
}

#[test]
fn match_language_nfa() {
    use super::build::build;
    use crate::Frontend::parser::parse;

    let input = std::fs::read_to_string("bible.txt").unwrap();
    let exp = "\"[^\"]*\"";//"
    let mut chars = input.chars().map(Interval::char).peekable();

    println!("All string literals:");
    let expression = parse(exp).unwrap();
    let mut automata = build(expression);
    let instant = Instant::now();
    while let Some(_) = chars.peek() {
        let Some(matching) = automata.matches(&mut chars) else { continue };
        //println!("Automata: {:#?}", automata);return;
        print!("\x1b[33mResultado:\x1b[0m");
        matching.iter().for_each(|x| print!("{}", x));
        println!();
    }
    println!("elapsed: {:?}", instant.elapsed());
}
