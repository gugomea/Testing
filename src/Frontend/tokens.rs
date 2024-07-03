use std::{ops::RangeInclusive, fmt::{Debug, Display}};
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

impl Display for Expression {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let str = match self {
            Expression::l(l) => format!("{}", l),

            Expression::anyBut(ls) => format!("[^{}]", ls.iter().map(|x|format!("{}", x)).collect::<String>()),
            Expression::any(ls) => format!("[{}]", ls.iter().map(|x|format!("{}", x)).collect::<String>()),

            Expression::optional(exp) => format!("({})?", exp),
            Expression::zero_or_more(exp) => format!("({})*", exp),
            Expression::one_or_more(exp) => format!("({})+", exp),

            Expression::concatenation(ls) => ls.iter().map(|x| format!("{}", x)).collect::<String>(),
            Expression::union(ls) => {
                let mut str = ls.iter().map(|x| format!("{}|", x)).collect::<String>();
                str.pop();
                format!("({})", str)
            }
            Expression::group(exp) => format!("({})", exp),

            Expression::empty => "ε".into(),
        };

        write!(f, "{}", str)
    }
}

impl Expression {
    pub fn concatenate(exp1: Expression, exp2: Expression) -> Self {
        match (exp1, exp2) {
            (Expression::empty, Expression::empty) => Expression::empty,
            (Expression::empty, other) => other,
            (other, Expression::empty) => other,
            (Expression::concatenation(v1), Expression::concatenation(v2)) => Expression::concatenation(vec![v1, v2].concat()),
            (e1, Expression::concatenation(v)) => Expression::concatenation(vec![vec![e1], v].concat()),
            (Expression::concatenation(v), e2) => Expression::concatenation(vec![v, vec![e2]].concat()),
            (e1, e2) => Expression::concatenation(vec![e1, e2]),
        }
    }
}

#[derive(Debug, PartialEq, Eq, Clone, Serialize, Deserialize)]
pub enum Literal {
    atom(char),
    range(RangeInclusive<char>),
    anyLiteral,
}

impl Display for Literal {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let str = match self {
            Literal::atom('.') => format!("\\."),
            Literal::atom(ch) => ch.to_string(),
            Literal::anyLiteral => '.'.to_string(),
            Literal::range(r) => format!("{}-{}", r.start(), r.end()),
        };
        write!(f, "{}", str)
    }
}
