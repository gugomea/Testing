use std::collections::VecDeque;

use crate::Frontend::{error::*, tokens::*};

pub fn parse(input: &str) -> Result<Expression, ParsingError> {
    let mut it = input.chars().enumerate().peekable();

    //The stack where we are going to store the expressions while constructing them,
    //when the process ends, this should only have one expression, the final one.
    let mut expressions = vec![];

    //we have this, so we can keep trak of how many expressions there are on each level,
    //this helps when we want to unroll the unions to create the Vec<union>, since we have
    //to crete one expression for each element on a union.
    //Example => a|b|c|d.   number_of_expressions = vec[4]
    let mut number_of_expressions = vec![0_usize];

    let mut parentesis = 0;

    while let Some((idx, current)) = it.next() {
        match current {
            '[' => {
                let negation = match it.peek() {
                    Some((_, '^')) => { it.next(); true }
                    _ => false,
                };

                let mut ranges = vec![];
                if let Some((_, ']')) = it.peek() {
                    ranges.push(Literal::atom(']'));
                    it.next();
                }

                let (mut start, mut mid, mut end) = (None, false, None);
                loop {
                    match it.next() {
                        Some((_, ']')) => break,
                        None => return Err(ParsingError::new("Set not closed".into(), ErrorType::range, 0)),
                        Some((_i, '-')) => mid = true,
                        Some((_i, ch)) => {
                            match (mid, start) {
                                (true, _) => end = Some(ch),
                                (false, None) => start = Some(ch),
                                (false, Some(st)) => {
                                    ranges.push(Literal::atom(st));
                                    start = Some(ch);
                                }
                            }
                        }
                    }
                    if let (Some(st), true, Some(en)) = (start, mid, end) {
                        ranges.push(Literal::range(st..=en));
                        (start, end) = (None, None);
                        mid = false;
                    }
                }

                if mid { ranges.push(Literal::atom('-')); }

                match negation {
                    true => expressions.push(Some(Expression::anyBut(ranges))),
                    false => expressions.push(Some(Expression::any(ranges))),
                }

                match number_of_expressions.last_mut() {
                    Some(n) => *n += 1,
                    None => return Err(ParsingError::new("Unión encontrada en sitio inesperado".into(), ErrorType::union, idx)),
                }

            }

            '|' => {
                match number_of_expressions.last() {
                    Some(0) | None => return Err(ParsingError::new(("Union mal formada").into(), ErrorType::union, idx)),
                    _ => {}
                }
                expressions.push(None);
            }

            quantifier @ ('*' | '+' | '?') => {
                let new_exp = match expressions.pop() {
                    Some(Some(Expression::optional(_))) | Some(Some(Expression::one_or_more(_))) | Some(Some(Expression::zero_or_more(_))) => return Err(ParsingError::new("no puedes poner dos cuantificadores seguidos".into(), ErrorType::unexpected, idx)),
                    Some(Some(exp)) => match quantifier {
                        '*' => Expression::zero_or_more(Box::new(exp)),
                        '+' => Expression::one_or_more(Box::new(exp)),
                        '?' => Expression::optional(Box::new(exp)),
                        _ => unreachable!(),
                    }
                    None => return Err(ParsingError::new("Cuantificador sobre expresión vacía".into(), ErrorType::unexpected, idx)),
                    _ => return Err(ParsingError::new("una expresión fue esperada antes".into(), ErrorType::unexpected, idx)),
                };
                expressions.push(Some(new_exp));
            }

            '(' => {
                match number_of_expressions.last_mut() {
                    Some(n) => *n += 1,
                    None => return Err(ParsingError::new("Unión encontrada en sitio inesperado".into(), ErrorType::union, idx)),
                }
                number_of_expressions.push(0);
                parentesis += 1;
            }

            ')' => {
                unroll_expressions(&mut expressions, &mut number_of_expressions)?;
                if let Some(Some(exp)) = expressions.pop() {
                    expressions.push(Some(Expression::group(Box::new(exp))));
                }
                parentesis -= 1;
            }

            ch => {
                let ch_value = match ch {
                    '\\' => match it.next() {
                        Some((_, car)) => Literal::atom(car),
                        None => return Err(ParsingError::new("Se esperaba otro caracter".into(), ErrorType::union, idx)),
                    }
                    '.' => Literal::anyLiteral,
                    other => Literal::atom(other),
                };
                match number_of_expressions.last_mut() {
                    Some(n) => *n += 1,
                    None => return Err(ParsingError::new("Unión encontrada en sitio inesperado".into(), ErrorType::union, idx)),
                }
                expressions.push(Some(Expression::l(ch_value)));
            }
        }
        if parentesis < 0 {
            return Err(ParsingError::new("Has mas paréntesis cerrados que abiertos".into(), ErrorType::union, idx));
        }
    };

    if parentesis != 0 {
        return Err(ParsingError::new("paréntesis mal formados".into(), ErrorType::union, 0));
    }

    match unroll_expressions(&mut expressions, &mut number_of_expressions) {
        Ok(()) => match expressions.pop() {
            Some(Some(exp)) => Ok(exp),
            _ => Err(ParsingError::new("Se esperaba al menos, una expresión".into(), ErrorType::unexpected, 0)),
        }
        Err(e) if e.typ() == ErrorType::emptyExpression => Ok(Expression::empty),
        Err(other) => Err(other),
    }
}

fn unroll_expressions(expressions: &mut Vec<Option<Expression>>, depth: &mut Vec<usize>) -> Result<(), ParsingError> {
    let mut n = match depth.pop() {
        Some(0) => return Err(ParsingError::new("Expresión vacía".into(), ErrorType::emptyExpression, 0)),
        Some(value) => value,
        None => return Err(ParsingError::new("se esperaba otra expresión".into(), ErrorType::unexpected, 0)),
    };

    let mut finale = VecDeque::from(vec![VecDeque::new()]);
    while n != 0 {
        match expressions.pop() {
            Some(Some(expr)) => {
                if let Some(v) = finale.get_mut(0) { v.push_front(expr); }
                n -= 1;
            }
            Some(None) => finale.push_front(VecDeque::new()),
            None => return Err(ParsingError::new("No quedan expresiones".into(), ErrorType::unexpected, 0)),
        }
    }

    if finale.iter().any(|x| x.is_empty()) {
        return Err(ParsingError::new("Expresión vacía dentro de la Unión".into(), ErrorType::union, 0));
    }

    let mut finale = finale.into_iter().map(|mut x| match x.len() {
        1 => x.pop_front().unwrap(),
        _ => Expression::concatenation(x.into())
    }).collect::<VecDeque<Expression>>();
    if finale.len() == 1 {
        let exp = Some(finale.pop_front().unwrap());
        expressions.push(exp);
    } else if finale.len() > 1 {
        expressions.push(Some(Expression::union(finale.into())));
    }

    Ok(())
}
