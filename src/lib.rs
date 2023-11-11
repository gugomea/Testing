#![allow(non_snake_case, non_camel_case_types)]
pub mod Frontend;
pub mod Backend;

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn build_automata(val: JsValue) -> Result<JsValue, JsValue> {
    use Backend::build::build;
    use Frontend::parser::parse;
    let input: String = serde_wasm_bindgen::from_value(val)?;
    let parsed_input = parse(&input);
    match parsed_input {
        Ok(value) => Ok(serde_wasm_bindgen::to_value(&build(value))?),
        Err(er) => Ok(serde_wasm_bindgen::to_value(&er.message)?),
    }
}
