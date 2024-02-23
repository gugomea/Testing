using Wasmtime;

var engine = new Engine();
var module = Module.FromFile(engine, "../../target/wasm32-wasi/debug/automata.wasm");
var linker = new Linker(engine);
linker.DefineWasi();

var wasi_config = new WasiConfiguration();
wasi_config.WithPreopenedDirectory("../..", ".");

var store = new Store(engine);
store.SetWasiConfiguration(wasi_config);

var instance = linker.Instantiate(store, module);
var memory = instance.GetMemory("memory");
if (memory is null) { return; }

var alloc = instance.GetFunction<int, int>("alloc")!;
var grep_file = instance.GetFunction<int, int, int, int, Int64>("grep_file")!;

string file = "src/lib.rs";
string regex = "\"[^\"]*\"";
int file_address = alloc(file.Length);
int regex_address = alloc(file.Length);
memory.WriteString(file_address, file);
memory.WriteString(regex_address, regex);

Int64 full_int64 = grep_file(file_address, file.Length, regex_address, regex.Length);
int start = (int)((full_int64 >> 32) & 0xffffffff);
int length= (int)(full_int64 & 0xffffffff);
for(int i = 0; i < length; i++) {
    long address = memory.ReadInt64((long)start + i * 8);
    int nstart = (int)((address >> 32) & 0xffffffff);
    int nlength= (int)(address & 0xffffffff);
    Console.ForegroundColor = ConsoleColor.DarkYellow;
    Console.WriteLine(memory.ReadString(nstart, nlength, System.Text.Encoding.UTF8));
}
