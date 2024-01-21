use std::collections::HashMap;

use serde::{Serialize, Deserialize};


///THIS REPRESENTATION OF THE AUTOAMTA IS THE ONLY
///ONE WHO IS GOING TO CONNECT TO WASM.
///EVERY TYPE THAT WANTS TO INTERCHANGE AUTOMATA -> Regex
///BETWEEN RUST AND WASM HAS TO IMPLEMENT FROM<IRAutoamta>
#[derive(Debug, Serialize, Deserialize)]
pub struct IRAutoamta {
    pub transition_map: HashMap<(usize, usize), Vec<String>>,
}
