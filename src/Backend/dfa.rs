use serde::{Serialize, Deserialize};
use super::automata::{Alphabet, Automata, Table};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DFA<T: PartialOrd + Eq + PartialEq + Clone + Copy + Alphabet<T>> {
    pub n_states: usize,
    pub current: Option<usize>,
    pub final_states: Vec<bool>,
    pub transition_function: Vec<Table<T, usize>>,
}

impl<T: PartialOrd + Eq + PartialEq + Clone + Copy + Alphabet<T>> Automata<T, usize> for DFA<T> {
    fn set_current(&mut self, curr: Option<usize>) {
        self.current = curr;
    }

    fn next(&self, input: T) -> Option<usize> {
        let Some(current) = self.current else { return None };
        self.transition_function[current].get(input).copied()
    }

    fn is_final(&self) -> bool {
        let Some(current) = self.current else { return false };
        self.final_states[current]
    }

    fn is_error(&self) -> bool {
        self.current.is_none()
    }
}
