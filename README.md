# jq-wasm

[![Tests](https://github.com/pboutes/jq-wasm/actions/workflows/test.yml/badge.svg)](https://github.com/pboutes/jq-wasm/actions/workflows/test.yml)

A [jq](https://jqlang.org) playground that runs entirely in your browser: the real jq, compiled from C to [WebAssembly](https://webassembly.org).

![The playground: a jq query on top, the JSON input on the left and jq's output on the right](docs/screenshot.png)

## Why

**In the browser.** Try a jq query without installing anything. No server runs your queries, so your JSON never leaves your machine, and you can paste data you would not send anywhere. Once the page has loaded, queries need no network.

**The real jq, not a rewrite.** jq is written in C. A JavaScript rewrite would have to chase its behaviour one feature at a time and would still drift from it. Compiling the C source instead gives the same parser, the same built-in functions, regular expressions included, and the same error messages as the jq in your terminal. Moving to a new jq release means changing a version and a checksum in the [`Dockerfile`](Dockerfile).

## Run it locally

You only need Docker: everything is built in containers.

```bash
make all          # compile jq to WebAssembly into dist/
make run-server   # serve the playground on http://localhost:8100
```

Then open http://localhost:8100. `make run-server` first rebuilds anything in `dist/` that is older than its sources.

## How it works

```text
build   jq's C source ──Emscripten──▶ dist/jq.wasm + dist/jq.js

run     index.html ──{json, query}───────────▶ dist/worker.js
                   ◀──{ok, result} or {ok, error}──   │
                                                      ▼
                                      jq main(-c -M <query>)
                                      stdin  ◀ the JSON, from memory
                                      stdout ▶ the result, into memory
```

- The [`Dockerfile`](Dockerfile) builds jq from its release tarball with Emscripten, together with its bundled regex library.
- Each query is one call to jq's own `main()`, as if you had run `jq -c -M '<query>'` in a terminal. [`src/wasm/pre.js`](src/wasm/pre.js) connects stdin, stdout and stderr to in-memory buffers, and [`src/wasm/post.js`](src/wasm/post.js) runs `main()` and parses what jq printed.
- Calling `main()` over and over needs two fixes, both in `post.js`. jq closes stdout when it finishes, so stdout is reopened before each run. jq also ends with `exit()`, which leaves its C stack behind, so the stack pointer is put back after each run.
- jq runs in a [Web Worker](src/worker/worker.js), so typing stays smooth. The page runs the query 150 ms after the last keystroke.

## Limitations

- About 1 MB to download, mostly `jq.wasm` (about 350 KB gzipped).
- Needs a browser with module Web Workers: Chrome 80+, Safari 15+ or Firefox 114+.
- The JSON goes through JavaScript on its way to jq, so integers beyond 2^53 lose precision: `100000000000000000001` becomes `100000000000000000000`. The jq command line keeps them exact.
- Two known bugs, tracked as `todo` tests in [`test/jq.test.mjs`](test/jq.test.mjs):
  - when a query returns several arrays, they are merged into one: `.[]` on `[[1,2],[3]]` shows `[1,2,3]`;
  - a query with no output, such as `empty`, shows an error instead of nothing.

## Development

Versions are pinned: jq 1.8.2 and Emscripten SDK 7.0.1 in the [`Dockerfile`](Dockerfile), Go 1.27.4 in [`server/Makefile`](server/Makefile).

```bash
make test
```

This runs both test suites in Docker, so no local Node.js or Go is needed:

- `make test-jq` runs `test/*.test.mjs` with Node's built-in test runner against the built `dist/jq.js`. It covers the page examples, Unicode input, jq errors, many queries in a row, and the rebuild rules of `make run-server`.
- `make test-server` runs the tests of the Go file server.

GitHub Actions runs both on every push to `master` and on every pull request.

The file server that `make run-server` starts is a small Go program, prebuilt in `dist/` for macOS and Linux on amd64 and arm64. To rebuild it:

```bash
cd server && make all
```

## License

[MIT](LICENSE). jq, which the build downloads and compiles, comes with its own MIT license.
