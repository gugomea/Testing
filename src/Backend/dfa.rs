use serde::{Serialize, Deserialize};
use super::automata::{Automata, Table};
use super::intervals::Interval;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DFA {
    pub n_states: usize,
    pub current: Option<usize>,
    pub final_states: Vec<bool>,
    pub transition_function: Vec<Table<Interval, usize>>,
}

impl Automata<Interval, usize> for DFA {
    fn set_current(&mut self, curr: Option<usize>) {
        self.current = curr;
    }

    fn next(&self, input: Interval) -> Option<usize> {
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
