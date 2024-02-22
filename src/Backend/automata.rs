use std::{fmt::Debug, iter::Peekable};
use serde::{Serialize, Deserialize};

pub trait Automata<Event, State>
where Event: PartialEq + Eq + PartialOrd + Debug + Clone + Copy,
{
    fn is_final(&self) -> bool;
    fn is_error(&self) -> bool;
    fn next(&self, input: Event) -> Option<State>;
    fn set_current(&mut self, curr: Option<State>);
    fn matches(&mut self, input: &mut Peekable<impl Iterator<Item = Event>>) -> Option<Vec<Event>> {
        let (mut acc, mut maybe) = (vec![], vec![]);
        //skip not matching characters
        while let Some(&n) = input.peek() {
            if self.next(n).is_some() {
                break;
            }
            input.next();
        }
        //take longest matching string
        while let Some(&n) = input.peek() {
            let current_states = self.next(n);
            //     error state
            if current_states.is_none() {
                self.set_current(None);
                break;
            }
            maybe.push(n);
            self.set_current(current_states);
            if self.is_final() {
                acc.append(&mut maybe);
            }
            input.next();
        }
        return if !acc.is_empty() { Some(acc) } else { None };

    }
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

