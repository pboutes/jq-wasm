const _STDOUT = '/dev/stdout';
const _STDERR = '/dev/stderr';

const util = {
  initialized: false,
  stdin: '',
  input: {
    buffer: []
  },
  output: {
    buffer: []
  },
  error: {
    buffer: []
  },
  flush: () => util.stdin = '',
  isInputData: () => util.input.buffer.length > 0,
  isResponse: () => util.output.buffer.length > 0,
  isError: () => util.error.buffer.length > 0,
  resetBuffers: () => {
    util.input.buffer = [];
    util.output.buffer = [];
    util.error.buffer = [];
  },
  toByteArray: (str) => {
    const byteArray = [];
    const encodedPayload = unescape(encodeURIComponent(str));
    const size = encodedPayload.length;
    byteArray.push(null);
    for (let i = size - 1; i >= 0; i--) {
      byteArray.push(encodedPayload.charCodeAt(i))
    } 
    return byteArray;
  },
  fromByteArray: (bytes) => {
    const size = bytes.length;
    let str = '';
    for (let i = 0; i < size; ++i) {
      str += String.fromCharCode(bytes[i]);
    }
    return decodeURIComponent(escape(str));
  },
  openFileSystem: () => {
    if (!FS.streams[1]) {
      FS.streams[1] = FS.open(_STDOUT, 577, 0);
    }
    if (!FS.streams[2]) {
      FS.streams[2] = FS.open(_STDERR, 577, 0);
    }
  }
};

const input = () => {
  if (util.isInputData()) {
    return util.input.buffer.pop();
  }
  if (!util.stdin) return null;
  util.input.buffer = util.toByteArray(util.stdin);
  util.flush();
  return util.input.buffer.pop();
};

const output = (out) => {
  if (out) {
    util.output.buffer.push(out);
  }
};

const error = (err) => {
  if (err) {
    util.error.buffer.push(err);
  }
};


const conf = {
  noInitialRun: true,
  noExitRuntime: true,
  onRuntimeInitialized: () => util.initialized = true,
  preRun: () => FS.init(input, output, error)
};

Module = { ...Module, ...conf };

