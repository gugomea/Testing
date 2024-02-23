from colorama import Fore, Style
from wasmtime import Engine, Linker, Module, Store, WasiConfig

engine = Engine()
linker = Linker(engine)
linker.define_wasi()

module = Module.from_file(linker.engine, "../target/wasm32-wasi/debug/automata.wasm")
store = Store(linker.engine)

wasi_config = WasiConfig()
wasi_config.preopen_dir(path="..", guest_path=".")

store.set_wasi(wasi_config)
instance = linker.instantiate(store, module)
exports = instance.exports(store)
memory = exports['memory']

input = "./sample.txt".encode()
regex = "\"[^\"]*\"".encode()
memory.write(store, input, 0)
memory.write(store, regex, len(input))

vector_string = exports['grep_file'](store, 0, len(input), len(input), len(regex))
start = (vector_string >> 32) & 0xffffffff
length = (vector_string) & 0xffffffff
v = memory.read(store, start=start, stop=(start) + length * 8)

i = 0
while i < len(v) - 7:
    length = (v[i] << (32 - 32)) | (v[i+1] << (32 - 24)) | (v[i+2] << (32 - 16)) | (v[i+3] << (32 - 8))
    start = (v[i+4] << (32 - 32)) | (v[i+5] << (32 - 24)) | (v[i+6] << (32 - 16)) | (v[i+7] << (32 - 8))
    print(Fore.RED + memory.read(store, start=start, stop=(start + length)).decode(), Style.RESET_ALL)
    i += 8
