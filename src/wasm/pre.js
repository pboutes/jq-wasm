// Included inside the Emscripten module factory, before the generated runtime.
// Connects jq's stdin/stdout/stderr to in-memory buffers so that each query is
// one call to jq's main() (see post.js).

const jqStdio = {
  encoder: new TextEncoder(),
  decoder: new TextDecoder(),
  stdin: new Uint8Array(0),
  stdinPos: 0,
  stdout: [],
  stderr: [],
  reset(input) {
    this.stdin = this.encoder.encode(input);
    this.stdinPos = 0;
    this.stdout = [];
    this.stderr = [];
  },
  decode(bytes) {
    return this.decoder.decode(new Uint8Array(bytes));
  },
};

Module['preRun'] = [].concat(Module['preRun'] || [], () => {
  FS.init(
    // stdin: one byte per call, null at end of input.
    () => (jqStdio.stdinPos < jqStdio.stdin.length ? jqStdio.stdin[jqStdio.stdinPos++] : null),
    // stdout / stderr: one byte per call.
    (byte) => { if (byte != null) jqStdio.stdout.push(byte); },
    (byte) => { if (byte != null) jqStdio.stderr.push(byte); },
  );
});
