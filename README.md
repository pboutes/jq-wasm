# jq-wasm

[![Tests](https://github.com/pboutes/jq-wasm/actions/workflows/test.yml/badge.svg)](https://github.com/pboutes/jq-wasm/actions/workflows/test.yml)

A [jq](https://jqlang.org) playground that runs entirely in your browser: the real jq, compiled from C to [WebAssembly](https://webassembly.org).

**Try it: https://pboutes.github.io/jq-wasm/**

![The playground: a jq query on top, the JSON input on the left and jq's output on the right](docs/screenshot.png)

## Why

**In the browser.** Try a jq query without installing anything. No server runs your queries, so your JSON never leaves your machine, and you can paste data you would not send anywhere. Once the page has loaded, queries need no network.

**The real jq, not a rewrite.** jq is written in C. A JavaScript rewrite would have to chase its behaviour one feature at a time and would still drift from it. Compiling the C source instead gives the same parser, the same built-in functions, regular expressions included, and the same output and error messages as the jq in your terminal. Moving to a new jq release means changing a version and a checksum in the [`Dockerfile`](Dockerfile).

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

run     index.html ──{input, query}──────────▶ dist/worker.js
                   ◀──{ok, output} or {ok, error}──   │
                                                      ▼
                                 jq main(-M <query> input.json)
                                 input.json ◀ the JSON text, a file in memory
                                 stdout     ▶ jq's output, a file in memory
```

- The [`Dockerfile`](Dockerfile) builds jq from its release tarball with Emscripten, together with its bundled regex library.
- Each query is one call to jq's own `main()`, as if you had run `jq -M '<query>' input.json` in a terminal. [`src/wasm/post.js`](src/wasm/post.js) writes the input to a file in memory, runs `main()`, and reads back what jq printed.
- The text is never turned into JavaScript values on the way, so the output is jq's own: several results come one after another, and numbers stay exactly as written, `100000000000000000001` and `1.10` included.
- Calling `main()` over and over needs three fixes, all in `post.js`. jq closes stdout when it finishes, so stdout is set up again before each run. jq ends with `exit()`, which leaves its C stack behind, so the stack pointer is put back after each run. And jq leaves the input file open when it stops before the end of the input, so it is closed after each run.
- jq runs in a [Web Worker](src/worker/worker.js), so typing stays smooth. The page runs the query 150 ms after the last keystroke.

## Limitations

- About 1 MB to download, mostly `jq.wasm` (about 350 KB gzipped).
- Needs a browser with module Web Workers: Chrome 80+, Safari 15+ or Firefox 114+.
- Large inputs cost memory and time: jq needs about nine times the size of the input in memory, which the page keeps until it is reloaded, and a browser takes seconds to display a result of several megabytes.
- The input has to be a single JSON document. The jq command line also accepts several in a row.

## Development

Versions are pinned: jq 1.8.2 and Emscripten SDK 7.0.1 in the [`Dockerfile`](Dockerfile), Go 1.27.4 in [`server/Makefile`](server/Makefile).

```bash
make test
```

This runs both test suites in Docker, so no local Node.js or Go is needed:

- `make test-jq` runs `test/*.test.mjs` with Node's built-in test runner against the built `dist/jq.js`. It covers the page examples, jq's output, Unicode input, jq errors, many queries in a row, and the rebuild rules of `make run-server`.
- `make test-server` runs the tests of the Go file server.

GitHub Actions runs both on every push to `master` and on every pull request.

Every push to `master` also publishes the playground to GitHub Pages ([`.github/workflows/pages.yml`](.github/workflows/pages.yml)): it builds jq, runs the module tests, then deploys what `make site` collects, which is `index.html` and the three files it loads from `dist/`.

The file server that `make run-server` starts is a small Go program, prebuilt in `dist/` for macOS and Linux on amd64 and arm64. To rebuild it:

```bash
cd server && make all
```

## License

[MIT](LICENSE). jq, which the build downloads and compiles, comes with its own MIT license.
