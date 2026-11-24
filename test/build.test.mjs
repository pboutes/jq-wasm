// dist/ is build output and is not in git, so it goes stale when the sources
// change (switching branches, pulling). `make run-server` must rebuild it
// before serving: an old dist/worker.js under a new index.html fails with
// "Module scripts don't support importScripts()".
//
// `make -n -W <file>` prints what make would run if <file> had just changed,
// without running anything or touching the working tree.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const runServerPlan = (changedFile) =>
  execFileSync('make', ['--no-print-directory', '-n', '-W', changedFile, 'run-server'], { encoding: 'utf8' });

test('run-server copies the worker again when its source changed', () => {
  assert.match(runServerPlan('src/worker/worker.js'), /cp src\/worker\/worker\.js dist\/worker\.js/);
});

test('run-server relinks jq when the glue code changed', () => {
  assert.match(runServerPlan('src/wasm/post.js'), /emcc .* -o dist\/jq\.js/);
});
