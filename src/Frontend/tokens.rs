use std::ops::RangeInclusive;

#[derive(Debug, PartialEq, Eq)]
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

#[derive(Debug, PartialEq, Eq)]
pub enum Literal {
    atom(char),
    range(RangeInclusive<char>),
    anyLiteral,
}
