use std::ops::RangeInclusive;
use serde::{Serialize, Deserialize};

#[derive(Debug, PartialEq, Eq, Clone, Serialize, Deserialize)]
pub enum Expression {
    l(Literal),
    any(Vec<Literal>),
    anyBut(Vec<Literal>),

    optional(Box<Expression>),
    zero_or_more(Box<Expression>),
    one_or_more(Box<Expression>),

    concatenation(Vec<Expression>),
    union(Vec<Expression>),
    group(Box<Expression>),

    empty
}

#[derive(Debug, PartialEq, Eq, Clone, Serialize, Deserialize)]
pub enum Literal {
    atom(char),
    range(RangeInclusive<char>),
    anyLiteral,
}
