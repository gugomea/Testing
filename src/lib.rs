#![allow(non_snake_case, non_camel_case_types)]
pub mod Frontend;
pub mod Backend;

use std::collections::{HashMap, HashSet};
use serde::{Deserialize, Serialize};
use Backend::{gnfa::{nfa_to_regex, GNFA}, intermediate_automata::IRAutoamta, nfa::NFA};
use wasm_bindgen::prelude::*;
use crate::{Backend::{automata::Automata, build::build, intervals::Interval}, Frontend::parser::parse};

#[derive(Debug, Default, PartialEq, Eq, Copy, Clone, Serialize, Deserialize)]
struct Index {
    idx: usize,
}

static mut SHARED_AUTOMATA: Option<NFA<Interval<Index>>> = None;

#[wasm_bindgen]
pub fn compile_nfa(nfa: JsValue) -> Result<JsValue, JsValue> {
    let transition_map: HashMap<(usize, usize), Vec<String>> = serde_wasm_bindgen::from_value(nfa)?;
    match NFA::try_from(IRAutoamta { transition_map }) {
        Ok(nfa) => {
            unsafe { SHARED_AUTOMATA = Some(nfa.clone()); }
            Ok(serde_wasm_bindgen::to_value(&nfa)?)
        }
        Err(error) => Err(error.to_string().into()),
    }
}

#[wasm_bindgen]
pub fn match_string(input: JsValue) -> Result<JsValue, JsValue> {
    let mut automata = unsafe { SHARED_AUTOMATA.clone().unwrap() };
    automata.set_current(Some(HashSet::from([0])));
    let mut result_strings = vec![];
    let input: String = serde_wasm_bindgen::from_value(input)?;
    let mut chars = input.chars().enumerate().map(|(idx, ch)| {
            Interval {
                first: ch,
                last: ch,
                ctx: Index { idx },
            }
        })
    .peekable();
    while chars.peek().is_some() {
        automata.set_current(Some(HashSet::from([0])));
        let Some(matching) = automata.matches(&mut chars) else { 
            continue 
        };
        result_strings.push(matching);
    }
    return Ok(serde_wasm_bindgen::to_value(&result_strings)?);
}

#[wasm_bindgen]
pub fn reset_automata() -> JsValue {
    let automata = unsafe { SHARED_AUTOMATA.as_mut().unwrap() };
    automata.set_current(Some(HashSet::from([0])));
    let current = &automata.current;
    return serde_wasm_bindgen::to_value(current).unwrap();
}

#[wasm_bindgen]
pub fn next(letter: JsValue) -> Result<JsValue, JsValue>{
    let automata = unsafe { SHARED_AUTOMATA.as_mut().unwrap() };
    let interval = serde_wasm_bindgen::from_value(letter)?;
    let next_states = automata.next(interval);
    automata.set_current(next_states.clone());
    return Ok(serde_wasm_bindgen::to_value(&next_states)?);
}

#[wasm_bindgen]
pub fn build_automata(val: JsValue) -> Result<JsValue, JsValue> {
    //use Backend::build::build;
    use Frontend::parser::parse;

    let input: String = serde_wasm_bindgen::from_value(val)?;
    let parsed_input = parse(&input);
    let result = match parsed_input {
        Ok(value) => Ok(serde_wasm_bindgen::to_value(
                &value
        )?),
        Err(er) => Ok(serde_wasm_bindgen::to_value(&er)?),
    };

    return result;
}

#[wasm_bindgen]
pub fn automata_to_regex(automata: JsValue) -> Result<JsValue, JsValue> {
    let transition_map: HashMap<(usize, usize), Vec<String>> = serde_wasm_bindgen::from_value(automata)?;
    if let Ok(gnfa) = GNFA::try_from(IRAutoamta { transition_map }) {
        let result = match nfa_to_regex(&gnfa) {
            Some(exp) => format!("{}", exp),
            None => format!("Invalid Automata"),
        };
        return Ok(result.into());
    } else {
        return Err("nope".into());
    }
}

#[no_mangle]
pub fn alloc(len: i32) -> i32 {
    unsafe {
        let layout = std::alloc::Layout::from_size_align(len as usize, 1).unwrap();
        std::alloc::alloc(layout) as i32
    }
}

#[no_mangle]
pub fn grep_file(f_address: i32, f_len: i32, exp_address: i32, exp_len: i32) -> i64 {
    let name_file = unsafe { String::from_raw_parts(f_address as *mut u8, f_len as usize, f_len as usize) };
    let string_file = std::fs::read_to_string(&name_file).unwrap();
    let expression = unsafe { String::from_raw_parts(exp_address as *mut u8, exp_len as usize, exp_len as usize) };
    let mut chars = string_file.chars().map(Interval::<()>::char).peekable();

    let expression = parse(&expression).unwrap();
    let mut automata = build(expression);
    let mut result_strings: Vec<i64> = vec![];
    while chars.peek().is_some() {
        automata.set_current(Some(HashSet::from([0])));
        let Some(matching) = automata.matches(&mut chars) else { 
            continue 
        };
        let matched_string: String = matching.into_iter().map(|x| x.first).collect();
        result_strings.push((matched_string.as_ptr() as i64) << 32 | matched_string.len() as i64);
        std::mem::forget(matched_string);
    }
    let address = ((result_strings.as_ptr() as i64) << 32) | (result_strings.len() as i64);
    std::mem::forget(result_strings);
    return address;
}
