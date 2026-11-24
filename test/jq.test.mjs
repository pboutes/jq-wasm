// Tests for the jq WebAssembly module, run against the built dist/jq.js.
// Run with `make test`, or `node --test 'test/*.test.mjs'` after `make all`.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import createJq from '../dist/jq.js';

const jq = await createJq();

// The results of a query as JavaScript values: with -c, jq prints one per line.
const results = (json, query) =>
  jq.run(JSON.stringify(json), query, ['-c']).split('\n').filter(Boolean).map((line) => JSON.parse(line));

// Asserts that the call throws and returns the error.
const failure = (fn) => {
  let error;
  assert.throws(fn, (e) => { error = e; return true; });
  return error;
};

describe('page examples', () => {
  // Same inputs and queries as the example links in index.html.
  const languages = [{ name: 'JSON', good: true }, { name: 'XML', good: false }];
  const examples = [
    ['basic', languages, '.[0].name', ['JSON']],
    ['pipe', languages, '.[] | .name', ['JSON', 'XML']],
    ['destructuring',
      [{ a: 1, b: 2, c: { d: 3, e: 4 } }, { a: 1, b: 2, c: [{ d: 3, e: 4 }] }],
      '.[] as {$a, $b, c: {$d, $e}} ?// {$a, $b, c: [{$d, $e}]} | {$a, $b, $d, $e}',
      [{ a: 1, b: 2, d: 3, e: 4 }, { a: 1, b: 2, d: 3, e: 4 }]],
    ['maths', 1, '(. + 2) * 5', [15]],
    ['recursive descent', [[{ a: 1 }]], '..|.a?', [1]],
    ['regexp capture', 'xyzzy-14', 'capture("(?<a>[a-z]+)-(?<n>[0-9]+)")', [{ a: 'xyzzy', n: '14' }]],
    ['variables',
      {
        posts: [{ title: 'Frist psot', author: 'anon' }, { title: 'A well-written article', author: 'person1' }],
        realnames: { anon: 'Anonymous Coward', person1: 'Person McPherson' },
      },
      '.realnames as $names | .posts[] | {title, author: $names[.author]}',
      [{ title: 'Frist psot', author: 'Anonymous Coward' }, { title: 'A well-written article', author: 'Person McPherson' }]],
    ['functions', [[1, 2], [10, 20]], 'def addvalue(f): . + [f]; map(addvalue(.[0]))', [[[1, 2, 1], [10, 20, 10]]]],
    ['has(key)', [{ foo: 42 }, {}], 'map(has("foo"))', [[true, false]]],
    ['arithmetic assignment', { foo: 42 }, '[.foo += 1, .foo *= 2, .foo -=1, .foo /= 2]',
      [[{ foo: 43 }, { foo: 84 }, { foo: 41 }, { foo: 21 }]]],
  ];
  for (const [name, json, query, expected] of examples) {
    test(name, () => {
      assert.deepEqual(results(json, query), expected);
    });
  }
});

describe('output', () => {
  test('is what the jq command line prints, pretty-printed', () => {
    assert.equal(jq.run('{"a":[1,2],"b":{}}', '.'), '{\n  "a": [\n    1,\n    2\n  ],\n  "b": {}\n}\n');
  });

  test('takes extra jq options, such as -c for compact output', () => {
    assert.equal(jq.run('{"a":[1,2]}', '.', ['-c']), '{"a":[1,2]}\n');
  });

  // Each result is printed on its own; they used to be merged into one array.
  test('keeps several results apart', () => {
    assert.equal(jq.run('[[1,2],[3]]', '.[]', ['-c']), '[1,2]\n[3]\n');
  });

  test('is empty for a query with no result', () => {
    assert.equal(jq.run('{}', 'empty'), '');
  });

  // The text goes to jq untouched: no JavaScript number in between.
  test('keeps numbers exactly as written', () => {
    assert.equal(jq.run('{"id": 100000000000000000001, "price": 1.10}', '.', ['-c']),
      '{"id":100000000000000000001,"price":1.10}\n');
  });

  test('accepts a query that starts with a dash', () => {
    assert.equal(jq.run('5', '-(. + 1)'), '-6\n');
  });
});

describe('unicode', () => {
  const ZWSP = '​';

  test('round-trips non-ASCII text', () => {
    const json = { text: 'héllo wörld ✓ 🎉', 日本: '語' };
    assert.deepEqual(results(json, '.'), [json]);
  });

  // Regression test for issue 13: any non-ASCII output used to throw URIError.
  test('handles zero-width spaces in keys and values', () => {
    const json = { [`na${ZWSP}me`]: `a${ZWSP}b` };
    assert.deepEqual(results(json, '.'), [json]);
    assert.deepEqual(results(json, 'keys'), [[`na${ZWSP}me`]]);
    assert.deepEqual(results(json, '.[] | length'), [3]);
  });

  test('accepts non-ASCII characters in the query', () => {
    assert.deepEqual(results(`a${ZWSP}b`, `gsub("${ZWSP}"; "_")`), ['a_b']);
    assert.deepEqual(results({ clé: 'é' }, '.["clé"]'), ['é']);
  });
});

describe('errors', () => {
  test('throws the message and exit status of a runtime error', () => {
    const error = failure(() => jq.run('{"a":1}', '.a | error("boom")'));
    assert.match(error.message, /^jq: error .*boom/);
    assert.equal(error.status, 5);
  });

  test('throws the message and exit status of a syntax error', () => {
    const error = failure(() => jq.run('{}', '.['));
    assert.match(error.message, /^jq: error: syntax error/);
    assert.equal(error.status, 3);
  });

  test('throws when the input is not valid JSON', () => {
    assert.match(failure(() => jq.run('{"a": tru}', '.')).message, /^jq: .*parse error/);
  });

  // A failure is reported even when jq printed results first.
  test('throws when an error follows some output, and keeps that output', () => {
    const error = failure(() => jq.run('[1,2]', '.[] | if . > 1 then error("boom") else . end'));
    assert.match(error.message, /boom/);
    assert.equal(error.output, '1\n');
  });

  test('keeps working after errors', () => {
    failure(() => jq.run('{}', '.['));
    failure(() => jq.run('{}', 'error("x")'));
    failure(() => jq.run('{"a": tru}', '.'));
    assert.equal(jq.run('{"n":1}', '.n'), '1\n');
  });

  // Emscripten copies jq's exit status into process.exitCode; post.js puts it
  // back, otherwise a failing query would make this whole test file fail.
  test('does not change process.exitCode', (t) => {
    const saved = process.exitCode;
    t.after(() => { process.exitCode = saved; });
    process.exitCode = undefined;
    failure(() => jq.run('{}', '.['));
    assert.equal(process.exitCode, undefined);
  });
});

describe('repeated runs', () => {
  // Each query re-enters jq's main(), which ends with exit(). post.js has to
  // undo the C stack that exit() leaves behind, or jq crashes after ~16 runs.
  test('leave the stack pointer where it was', () => {
    const stackPointer = jq.stackSave();
    jq.run('{"n":1}', '.n');
    failure(() => jq.run('{}', '.['));
    assert.equal(jq.stackSave(), stackPointer);
  });

  // jq leaves the input file open when it stops before the end of the input
  // (invalid JSON, or halt with input left); post.js closes it.
  test('leave no file open or behind', () => {
    const snapshot = () => ({
      open: jq.FS.streams.filter(Boolean).map((stream) => stream.fd),
      files: jq.FS.readdir('/').sort(),
    });
    jq.run('1', '.');
    const before = snapshot();
    jq.run('{"a":1}', '.a');
    jq.run('{}', 'empty');
    jq.run('1 2', 'halt');
    failure(() => jq.run('{"a": tru}', '.'));
    failure(() => jq.run('{}', '.['));
    failure(() => jq.run('{}', 'error("x")'));
    assert.deepEqual(snapshot(), before);
    assert.deepEqual(before.open, [0]);
  });

  test('1000 queries in a row give correct results', () => {
    for (let i = 0; i < 1000; i++) {
      assert.equal(jq.run(`{"n":${i}}`, '.n * 2'), `${i * 2}\n`);
    }
  });
});
