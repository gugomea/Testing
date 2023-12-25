use serde::{Serialize, Deserialize};
use super::nfa::Table;
use super::intervals::Interval;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DFA {
    pub n_states: usize,
    pub current: usize,
    pub final_states: Vec<bool>,
    pub transition_function: Vec<Table<Interval, usize>>,
}
