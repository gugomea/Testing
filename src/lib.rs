#![allow(non_snake_case, non_camel_case_types)]
pub mod Frontend;
pub mod Backend;

use std::collections::{HashMap, HashSet};

use Backend::{intermediate_automata::IRAutoamta, gnfa::GNFA};
use wasm_bindgen::prelude::*;
use Frontend::tokens::Expression;

use crate::{Backend::{automata::Automata, build::build, intervals::Interval}, Frontend::parser::parse};

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

    println!("{:#?}", result);
    return result;
}

#[wasm_bindgen]
pub fn automata_to_regex(automata: JsValue) -> Result<JsValue, JsValue> {
    let transition_map: HashMap<(usize, usize), Vec<String>> = serde_wasm_bindgen::from_value(automata)?;
    if let Ok(gnfa) = GNFA::try_from(IRAutoamta { transition_map }) {
        let n = gnfa.n_states;
        if n < 2 { return Err("not enough states".into()); }
        //let result_gnfa = format!("{:#?}", gnfa);
        for i in 1..n - 1 {
            println!("ripping state {i}...");
            gnfa.rip_state(i);
            gnfa.flow.borrow()
                .iter()
                .for_each(|(k, v)| println!("{:?} => {}", k , v));
        }

        let result = match gnfa.flow.borrow().get(&(0, n - 1)) {
            Some(exp) => format!("{:?} => {:#?}\n{}", (0, n-1), exp, exp),
            None => format!("Invalid Automata"),
        };
        return Ok(result.into());
    } else {
        return Err("nope".into());
    }
}

#[no_mangle]
pub fn grep_file(f_address: i32, f_len: i32, exp_address: i32, exp_len: i32) -> i64 {
    let name_file = unsafe { String::from_raw_parts(f_address as *mut u8, f_len as usize, f_len as usize) };
    //let string_file = std::fs::read_to_string(&name_file).unwrap();
    let string_file = std::fs::read_to_string("./sample.txt").unwrap();
    //let expression = unsafe { String::from_raw_parts(exp_address as *mut u8, exp_len as usize, exp_len as usize) };
    let expression = "\"[^\"]*\"";
    let mut chars = string_file.chars().map(Interval::char).peekable();

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
