# jq-wasm
Run the [jq](https://github.com/jqlang/jq) command-line JSON processor in your browser with [Web Assembly](https://webassembly.org/) 👊

![ui](docs/screenshot.png)

This is inspired from [jq-web](https://github.com/fiatjaf/jq-web).

# prerequisites

- Docker (everything is built in containers)

Versions used: jq 1.8.2, Emscripten SDK 7.0.1, Go 1.27.4. They are pinned in the `Dockerfile` and `server/Makefile`.

# Getting started

1 - Build jq to wasm (`dist/jq.js`, `dist/jq.wasm`, `dist/worker.js`)
```bash
make all
```

2 (Optional) - Rebuild the Go static server (binaries for macOS and Linux, amd64 and arm64, are already included in `dist`)
```bash
cd server && make all
```

3 - Run the server (it picks the binary for your OS and CPU)
```bash
make run-server
```

4 - Check result on http://localhost:8100/

The page needs a browser with module Web Worker support (Chrome 80+, Safari 15+, Firefox 114+).

# FAQ

## What is WebAssembly ? 

> WebAssembly (abbreviated Wasm) is a binary instruction format for a stack-based virtual machine. Wasm is designed as a portable target for compilation of high-level languages like C/C++/Rust, enabling deployment on the web for client and server applications.

WebAssembly is efficient, fast, safe, and a lot more. Get more info on [here](https://webassembly.org/).

## But why doing this ?

![But why?](https://media.giphy.com/media/1M9fmo1WAFVK0/giphy.gif)

In this use case, we wanted to parse some json expression by using the famous [jq](https://github.com/stedolan/jq) syntax.
But, as you may know, this tool is written in C, so we have two options:
- rewrite a parser library that will try to mimic the jq behavior, will we get the same functionalities? The same performance? 
- find a way to use the native code, in order to leverage the existing library, a native speed execution (guess what we choose 😛)

## So, what's in the bag?

So, the main idea is to compile the existing code to the wasm format, and then loading it in the browser. Simple, no?

To compile our code to the wasm format, we have serveral options:
- directly use the [LLVM](http://llvm.org/) toolchain (TL;DR **HARD**)
- or use [emscripten](https://emscripten.org/), initially known to be a C to [asm.js](http://asmjs.org/) compiler, he can now target Wasm, and leverage LLVM internally (TL;DR **TAKE THIS**)

[To be continued]

