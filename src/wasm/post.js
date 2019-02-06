const SPLIT_SEPARATOR = '\n';

class jq {

  constructor() { }

  static _call = (data, query) => {
    util.stdin = data;
    util.resetBuffers();
    util.openFileSystem();
    // Passing compact and monochrome flag to jq binary
    Module.callMain(['-c', '-M'].concat(query));
  
    if (util.isResponse()) {
      return util.fromByteArray(util.output.buffer).trim();
    }
  
    if (util.isError()) {
      const err = util.fromByteArray(util.error.buffer);
      throw new Error(err);
    }
  
    return '';
  }

  static _parse = (json, query) => {
    const result = jq._call(JSON.stringify(json), query).trim();
    if (!!~result.indexOf(SPLIT_SEPARATOR)) {
      return result
        .split(SPLIT_SEPARATOR)
        .reduce((acc, line) => acc.concat(JSON.parse(line)), []);
    } else {
      return JSON.parse(result);
    }
  } 

  static parse = json => query => {
    return new Promise((resolve, reject) => {
      try {
        resolve(jq._parse(json, query))
      } catch (e) {
        reject(e);
      }
    })
  }
}
