// Tests for the jq WebAssembly module, run against the built dist/jq.js.
// Run with `make test`, or `node --test 'test/*.test.mjs'` after `make all`.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import createJq from '../dist/jq.js';

const jq = await createJq();
const run = (json, query) => jq.parse(json)(query);

describe('page examples', () => {
  // Same inputs and queries as the example buttons in index.html.
  const languages = [{ name: 'JSON', good: true }, { name: 'XML', good: false }];
  const examples = [
    ['basic', languages, '.[0].name', 'JSON'],
    ['pipe', languages, '.[] | .name', ['JSON', 'XML']],
    ['destructuring alternative operator',
      [{ a: 1, b: 2, c: { d: 3, e: 4 } }, { a: 1, b: 2, c: [{ d: 3, e: 4 }] }],
      '.[] as {$a, $b, c: {$d, $e}} ?// {$a, $b, c: [{$d, $e}]} | {$a, $b, $d, $e}',
      [{ a: 1, b: 2, d: 3, e: 4 }, { a: 1, b: 2, d: 3, e: 4 }]],
    ['maths expression', 1, '(. + 2) * 5', 15],
    ['recursive descent', [[{ a: 1 }]], '..|.a?', 1],
    ['regexp capture', 'xyzzy-14', 'capture("(?<a>[a-z]+)-(?<n>[0-9]+)")', { a: 'xyzzy', n: '14' }],
    ['variables',
      {
        posts: [{ title: 'Frist psot', author: 'anon' }, { title: 'A well-written article', author: 'person1' }],
        realnames: { anon: 'Anonymous Coward', person1: 'Person McPherson' },
      },
      '.realnames as $names | .posts[] | {title, author: $names[.author]}',
      [{ title: 'Frist psot', author: 'Anonymous Coward' }, { title: 'A well-written article', author: 'Person McPherson' }]],
    ['function definition', [[1, 2], [10, 20]], 'def addvalue(f): . + [f]; map(addvalue(.[0]))', [[1, 2, 1], [10, 20, 10]]],
    ['has(key)', [{ foo: 42 }, {}], 'map(has("foo"))', [true, false]],
    ['arithmetic assignment', { foo: 42 }, '[.foo += 1, .foo *= 2, .foo -=1, .foo /= 2]',
      [{ foo: 43 }, { foo: 84 }, { foo: 41 }, { foo: 21 }]],
  ];
  for (const [name, json, query, expected] of examples) {
    test(name, async () => {
      assert.deepEqual(await run(json, query), expected);
    });
  }
});

describe('unicode', () => {
  const ZWSP = '​';

  test('round-trips non-ASCII text', async () => {
    const json = { text: 'héllo wörld ✓ 🎉', 日本: '語' };
    assert.deepEqual(await run(json, '.'), json);
  });

  // Regression test for issue 13: any non-ASCII output used to throw URIError.
  test('handles zero-width spaces in keys and values', async () => {
    const json = { [`na${ZWSP}me`]: `a${ZWSP}b` };
    assert.deepEqual(await run(json, '.'), json);
    assert.deepEqual(await run(json, 'keys'), [`na${ZWSP}me`]);
    assert.equal(await run(json, '.[] | length'), 3);
  });

  test('accepts non-ASCII characters in the query', async () => {
    assert.equal(await run(`a${ZWSP}b`, `gsub("${ZWSP}"; "_")`), 'a_b');
    assert.equal(await run({ clé: 'é' }, '.["clé"]'), 'é');
  });
});

describe('errors', () => {
  test('rejects with the message of a runtime error', async () => {
    await assert.rejects(run({ a: 1 }, '.a | error("boom")'), /jq: error .*boom/);
  });

  test('rejects with the message of a syntax error', async () => {
    await assert.rejects(run({}, '.['), /jq: error: syntax error/);
  });

  test('keeps working after errors', async () => {
    await assert.rejects(run({}, '.['));
    await assert.rejects(run({}, 'error("x")'));
    assert.equal(await run({ n: 1 }, '.n'), 1);
  });

  // Emscripten copies jq's exit status into process.exitCode; post.js puts it
  // back, otherwise a failing query would make this whole test file fail.
  test('does not change process.exitCode', async (t) => {
    const saved = process.exitCode;
    t.after(() => { process.exitCode = saved; });
    process.exitCode = undefined;
    await assert.rejects(run({}, '.['));
    assert.equal(process.exitCode, undefined);
  });
});

describe('repeated runs', () => {
  // Each query re-enters jq's main(), which ends with exit(). post.js has to
  // undo the C stack that exit() leaves behind, or jq crashes after ~16 runs.
  test('leave the stack pointer where it was', async () => {
    const stackPointer = jq.stackSave();
    await run({ n: 1 }, '.n');
    await assert.rejects(run({}, '.['));
    assert.equal(jq.stackSave(), stackPointer);
  });

  test('1000 queries in a row give correct results', async () => {
    for (let i = 0; i < 1000; i++) {
      assert.equal(await run({ n: i }, '.n * 2'), i * 2);
    }
  });
});

describe('known issues', () => {
  test('keeps several array outputs apart', { todo: 'parse() joins outputs with concat, which flattens arrays' }, async () => {
    assert.deepEqual(await run([[1, 2], [3]], '.[]'), [[1, 2], [3]]);
  });

  test('accepts a query with no output', { todo: 'parse() runs JSON.parse on an empty string' }, async () => {
    await assert.doesNotReject(run({}, 'empty'));
  });
});
