// Included inside the Emscripten module factory, after the generated runtime.
// Adds `run(input, query, flags)` to the module instance that createJq()
// resolves to: JSON text in, jq's own output out. Nothing is converted to
// JavaScript values on the way, so numbers and formatting are jq's.

const jqEncoder = new TextEncoder();
const jqDecoder = new TextDecoder();

// In-memory files. jq reads the input as a file argument, so its messages
// read "(at input.json:0)".
const JQ_INPUT = 'input.json';
const JQ_STDOUT = '/jq-stdout';
const JQ_STDERR = '/jq-stderr';

// Closes every open file except stdin (descriptor 0): stdout and stderr, and
// the input file, which jq leaves open when it stops before reading it to the
// end (invalid JSON, or `halt` with input left).
const jqCloseFiles = () => {
  for (const stream of FS.streams) {
    if (stream && stream.fd > 0) FS.close(stream);
  }
};

const jqReadAndRemove = (path) => {
  const text = jqDecoder.decode(FS.readFile(path));
  FS.unlink(path);
  return text;
};

// Runs `jq -M [flags] -- <query> input.json` and returns exactly what jq
// wrote to stdout. `flags` are extra jq options, such as ['-c'] for compact
// output. When jq exits with a non-zero status this throws an Error with
// jq's own message; `error.status` is the exit status and `error.output`
// what jq had printed before failing.
const jqRun = (input, query, flags = []) => {
  // The input is written, and the output read back, in one go.
  FS.writeFile(JQ_INPUT, jqEncoder.encode(input), { canOwn: true });

  // Send stdout and stderr to in-memory files. jq closes stdout itself when
  // main() ends, so both are set up again for every run. FS.open() takes the
  // lowest free descriptor: 1, then 2 (0, stdin, stays open and unused).
  jqCloseFiles();
  const stdout = FS.open(JQ_STDOUT, 'w');
  const stderr = FS.open(JQ_STDERR, 'w');
  if (stdout.fd !== 1 || stderr.fd !== 2) {
    throw new Error('jq-wasm: could not redirect stdout and stderr');
  }

  // jq's main() ends with exit(), which Emscripten implements by throwing
  // through the wasm frames, so the C stack pointer is never popped. Put it
  // back, or every query leaks ~3 KB of the 64 KB stack and jq crashes
  // after a dozen or so runs.
  const stackPointer = stackSave();
  // Under Node.js, Emscripten copies jq's exit status into process.exitCode.
  // Put the host's value back: a query that fails must not fail the process.
  const nodeProcess = globalThis.process?.versions?.node ? globalThis.process : null;
  const exitCode = nodeProcess?.exitCode;
  let status;
  try {
    // Monochrome (-M). `--` ends the options, so a query that starts with a
    // dash is never taken for one.
    status = callMain(['-M', ...flags, '--', query, JQ_INPUT]);
  } finally {
    stackRestore(stackPointer);
    if (nodeProcess) nodeProcess.exitCode = exitCode;
    jqCloseFiles();
  }

  const output = jqReadAndRemove(JQ_STDOUT);
  const errors = jqReadAndRemove(JQ_STDERR);
  FS.unlink(JQ_INPUT);

  if (status !== 0) {
    const error = new Error(errors.trim() || `jq exited with status ${status}`);
    error.status = status;
    error.output = output;
    throw error;
  }
  return output;
};

Module['run'] = jqRun;
