use crate::Frontend::tokens::Literal;

#[derive(Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Debug)]
pub struct Interval {
    first: char,
    last: char,
}


impl Interval {
    pub fn char(ch: char) -> Self {
        Interval { first: ch, last: ch }
    }

    pub fn new(first: char, last: char) -> Self {
        Self { first, last }
    }

    pub fn reverse(literal: Literal) -> impl Iterator<Item = Interval> {
        let literal: Interval = literal.into();
        let (first, last): (u32, u32) = (literal.first.into(), literal.last.into());
        let (f1, l1) = ('\u{0}', char::from_u32(first - 1));
        let (f2, l2) = (char::from_u32(last + 1), char::MAX);
        match (l1, f2) {
            (Some(l1), Some(f2)) => vec![Interval::new(f1, l1), Interval::new(f2, l2)].into_iter(),
            (Some(l1), None) => vec![Interval::new(f1, l1)].into_iter(),
            (None, Some(f2)) => vec![Interval::new(f2, l2)].into_iter(),
            _ => vec![].into_iter()
        }
    }

    pub fn unique(intervals: impl Iterator<Item = Interval>) -> impl Iterator<Item = Interval> {
        vec![].into_iter()
    }
}

impl From<Literal> for Interval {
    fn from(value: Literal) -> Self {
        match value {
            Literal::atom(ch) => Interval { first: ch, last: ch },
            Literal::anyLiteral => Interval { first: '\u{0}', last: char::MAX },
            Literal::range(rng) => Interval { first: *rng.start(), last: *rng.end() },
        }
    }
}
