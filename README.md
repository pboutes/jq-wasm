# jq-wasm
Run jq native library in your browser with [Web Assembly](https://webassembly.org/)

# prerequisites

- Docker >= 1.11
- npm >= 5.x.x
- go >= 1.10 (optional)

# Getting started

Be sure to have docker install on you machine

1 - Bootstrap the environment
```
make all
```

2 (Optional) - Compile go sample go server (binaries are already included in dist)
```
cd server && make all
```

3 - Run the server (depending on your distro)

- For linux user:
```bash
make run-server-linux
```

- For mac user:
```bash
make run-server-darwin
```

5 - Check result on http://localhost:8100/
