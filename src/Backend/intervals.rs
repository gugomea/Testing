use std::{collections::HashSet, fmt::Display, hash::Hash};

use crate::Frontend::tokens::Literal;
use serde::{Serialize, Deserialize};

use super::automata;

#[derive(Clone, Copy, PartialEq, Eq, Debug, Serialize, Deserialize)]
pub struct Interval {
    pub first: char,
    pub last: char,
}

impl PartialOrd for Interval {
    fn lt(&self, other: &Self) -> bool {
        self.first > other.first && self.last <other.last
    }
    fn le(&self, other: &Self) -> bool {
        self.first >= other.first && self.last <= other.last
    }
    fn gt(&self, other: &Self) -> bool {
        self.first < other.first && self.last > other.last
    }
    fn ge(&self, other: &Self) -> bool {
        self.first <= other.first && self.last >= other.last
    }
    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
        if self < other { Some(std::cmp::Ordering::Less) }
        else if self > other { Some(std::cmp::Ordering::Greater) }
        else { Some(std::cmp::Ordering::Equal) }
    }
}


impl Display for Interval {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        if self.first == self.last {
            write!(f, "{}", self.first)
        } else {
            write!(f, "[{}-{}]", self.first, self.last)
        }
    }
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
            _ => vec![].into_iter(),
        }
    }

    pub fn exp(&self) -> Literal {
        match self.first == self.last {
            true => Literal::atom(self.first),
            false => Literal::range(self.first..=self.last),
        }
    }

    pub fn unique(intervals: impl Iterator<Item = Interval>) -> impl Iterator<Item = Interval> {
        let mut letters = HashSet::new();
        let mut intervals: Vec<u32> = intervals
            .flat_map(|x| {
                if x.first == x.last { letters.insert(x.first); }
                [x.first as u32, x.last as u32]
            })
            .collect();
        intervals.extend([0x0, 0x10ffff]);
        intervals.sort();
        intervals.dedup();

        let mut result = vec![];
        for w in intervals.windows(2) {
            let (mut fu, lu) = (w[0], w[1]);
            let f = char::from_u32(fu).unwrap();
            if letters.contains(&f) {
                result.push(Interval::char(f));
                fu += 1;
            }
            let Some(first) = char::from_u32(fu) else { continue };
            let Some(last) = char::from_u32(lu-1) else { continue };
            if first > last { 
                continue;
            }
            if first == last { 
                letters.insert(first);
            }
            result.push(Interval::new(first, last));
        }
        result.last_mut().unwrap().last = char::MAX;
        return result.into_iter();
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

#[test]
fn simple_alphabet() {
    let minus_one = |ch: char| char::from_u32(ch as u32 -1).unwrap();
    use crate::Frontend::{tokens::*, parser::parse};
    let input = "[a-z]";
    let Expression::any(intervals) = parse(input).unwrap() else { panic!("error while parsing {}", input) };
    let intervals = intervals.into_iter().map(Interval::from);
    assert_eq!(
        Interval::unique(intervals.into_iter()).collect::<Vec<_>>(),
        [Interval::new('\u{0}', minus_one('a')), Interval::new('a', minus_one('z')), Interval::new('z', char::MAX)],
        "Simple alphabet",
    );
}

#[test]
fn mixed_alphabet() {
    let plus_one = |ch: char| char::from_u32(ch as u32 + 1).unwrap();
    let minus_one = |ch: char| char::from_u32(ch as u32 -1).unwrap();
    use crate::Frontend::{tokens::*, parser::parse};
    let input = "[a-zazh]";
    let Expression::any(intervals) = parse(input).unwrap() else { panic!("error while parsing {}", input) };
    let intervals = intervals.into_iter().map(Interval::from);
    assert_eq!(
        Interval::unique(intervals.into_iter()).collect::<Vec<_>>(),
        [
            Interval::new('\u{0}', minus_one('a')),
            Interval::char('a'),
            Interval::new(plus_one('a'), minus_one('h')),
            Interval::char('h'),
            Interval::new(plus_one('h'), minus_one('z')),
            Interval::char('z'),
            Interval::new(plus_one('z'), char::MAX),
        ],
        "Simple alphabet",
    );
}
