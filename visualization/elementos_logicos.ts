export class AutomataLogico {
    estado_inicial: NodoLogico;
    estado_actual: NodoLogico;
    estados: Array<NodoLogico>;
}

export class NodoLogico {
    nombre: String;
    transiciones: Array<TransicionLogica>;
    transiciones_vacias: Array<NodoLogico>;
    final: Boolean;
}

export class TransicionLogica {
    rango: [String, String];
    destinos: Array<NodoLogico>;
}

