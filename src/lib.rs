#![allow(non_snake_case, non_camel_case_types)]
pub mod Frontend;
pub mod Backend;

use std::collections::HashMap;

use Backend::{intermediate_automata::IRAutoamta, nfa_to_regex::GNFA};
use wasm_bindgen::prelude::*;

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
        for i in 1..n - 1 {
            println!("ripping state {i}...");
            gnfa.rip_state(i);
            gnfa.flow.borrow()
                .iter()
                .for_each(|(k, v)| println!("{:?} => {}", k , v));
        }

        //let result = format!("{:#?}", gnfa);
        let result = match gnfa.flow.borrow().get(&(0, n - 1)) {
            Some(exp) => format!("{:?} => {}", (0, n-1), exp),
            None => format!("Invalid Automata"),
        };
        return Ok(result.into());
    } else {
        return Err("nope".into());
    }
}
