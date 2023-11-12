#![allow(dead_code)]
use std::{error::Error, fmt::Display};
use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct ParsingError {
    pub message: String,
    error_type: ErrorType,
    idx: usize,
}

impl ParsingError {
    pub fn new(message: String, error_type: ErrorType, idx: usize) -> Self { 
        ParsingError { message, error_type, idx} 
    }
    pub fn typ(&self) -> ErrorType {  self.error_type }
}

impl Display for ParsingError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{:?}", self)
    }
}

impl Error for ParsingError {}

#[derive(Copy, Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum ErrorType {
    union,
    range,
    unexpected,
    group,
    emptyExpression,
}

