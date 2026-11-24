// Included inside the Emscripten module factory, after the generated runtime.
// Adds `parse(json)(query)` to the module instance that createJq() resolves to.

const JQ_SPLIT_SEPARATOR = '\n';

// jq's main() fclose()s stdout before exiting, so put back any standard
// stream that is gone. FS.open() takes the lowest free descriptor, which
// restores them on fds 1 and 2.
const jqReopenStdStreams = () => {
  if (!FS.getStream(1)) FS.open('/dev/stdout', 'w');
  if (!FS.getStream(2)) FS.open('/dev/stderr', 'w');
};

const jqCall = (input, query) => {
  jqStdio.reset(input);
  jqReopenStdStreams();
  // jq's main() ends with exit(), which Emscripten implements by throwing
  // through the wasm frames, so the C stack pointer is never popped. Put it
  // back, or every query leaks ~3 KB of the 64 KB stack and jq crashes
  // after a dozen or so runs.
  const stackPointer = stackSave();
  // Under Node.js, Emscripten copies jq's exit status into process.exitCode.
  // Put the host's value back: a query that fails must not fail the process.
  const nodeProcess = globalThis.process?.versions?.node ? globalThis.process : null;
  const exitCode = nodeProcess?.exitCode;
  try {
    // Compact (-c) and monochrome (-M) output.
    callMain(['-c', '-M', query]);
  } finally {
    stackRestore(stackPointer);
    if (nodeProcess) nodeProcess.exitCode = exitCode;
  }

  if (jqStdio.stdout.length) {
    return jqStdio.decode(jqStdio.stdout).trim();
  }
  if (jqStdio.stderr.length) {
    throw new Error(jqStdio.decode(jqStdio.stderr));
  }
  return '';
};

const jqParse = (json, query) => {
  const result = jqCall(JSON.stringify(json), query).trim();
  if (result.includes(JQ_SPLIT_SEPARATOR)) {
    return result
      .split(JQ_SPLIT_SEPARATOR)
      .reduce((acc, line) => acc.concat(JSON.parse(line)), []);
  }
  return JSON.parse(result);
};

Module['parse'] = (json) => async (query) => jqParse(json, query);
