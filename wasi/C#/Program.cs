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

string f_address = "sample.txt";
string regex = "\"[^\"]*\"";

memory.WriteString(0, f_address);
memory.WriteString(f_address.Length, regex);
var grep_file = instance.GetFunction<int, int, int, int, Int64>("grep_file");

if (grep_file is null)
{
	Console.WriteLine("nop");
    return;
}

Int64 full_int64 = grep_file(0, f_address.Length, f_address.Length, regex.Length);
int start = (int)((full_int64 >> 32) & 0xffffffff);
int length= (int)(full_int64 & 0xffffffff);
for(int i = 0; i < length; i++) {
    long address = memory.ReadInt64((long)start + i * 8);
    int nstart = (int)((address >> 32) & 0xffffffff);
    int nlength= (int)(address & 0xffffffff);
    Console.ForegroundColor = ConsoleColor.DarkYellow;
    Console.WriteLine(memory.ReadString(nstart, nlength, System.Text.Encoding.UTF8));
}
