# jq-wasm
Run jq native library in your browser with web assembly

# Getting started

1 - Install js dependencies
```
npm install
```

2 - Create our container which will handle the build process
```
docker build -t . jq-wasm
```

3 - Transpile js code and compile our wasm binary
```
make all
```

4 (Optional) - Compile go sample go server (you must have the go compiler)
```
cd server && make all
```

5 - Run the server to serve content from the root (depending on your distro)
```bash
./dist/server_{arch} -dir .
```

6 - Check result on http://localhost:8100/