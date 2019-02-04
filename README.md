# jq-wasm
Run jq native library in your browser with [Web Assembly](https://webassembly.org/)

# Getting started

1 - Create our container which will handle the build process
```
docker build -t . jq-wasm
```

2 - Transpile js code and compile our wasm binary
```
make all
```

3 (Optional) - Compile go sample go server (binaries are already included in dist)
```
cd server && make all
```

4 - Run the server to serve content from the root (depending on your distro)
```bash
./dist/server_{arch} -dir .
```

5 - Check result on http://localhost:8100/