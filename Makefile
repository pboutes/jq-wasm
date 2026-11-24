# jq's C sources are compiled inside an Emscripten Docker image (see
# Dockerfile), then linked here with the JS glue in src/wasm into
# dist/jq.js + dist/jq.wasm.

DOCKER_IMAGE := jq-wasm
DOCKER_RUN   := docker run --rm -u $(shell id -u):$(shell id -g) -v $(CURDIR):/app -w /app $(DOCKER_IMAGE)

OPTIMIZE := -O3

# MODULARIZE + EXPORT_ES6: dist/jq.js default-exports createJq(), which
# resolves to the module instance once the wasm is ready.
# INVOKE_RUN=0: don't run main() on load; post.js calls it once per query.
# stackSave/stackRestore: post.js uses them to undo the stack that jq's
# exit() leaves behind after each run.
EMCC_FLAGS := \
	$(OPTIMIZE) \
	-sALLOW_MEMORY_GROWTH=1 \
	-sMODULARIZE=1 \
	-sEXPORT_ES6=1 \
	-sEXPORT_NAME=createJq \
	-sINVOKE_RUN=0 \
	-sEXPORTED_RUNTIME_METHODS=callMain,FS,stackSave,stackRestore \
	--pre-js src/wasm/pre.js \
	--post-js src/wasm/post.js

SERVER_OS   := $(shell uname -s | tr '[:upper:]' '[:lower:]')
SERVER_ARCH := $(shell uname -m | sed -e 's/x86_64/amd64/' -e 's/aarch64/arm64/')

.PHONY: all docker js wasm clean run-server

all: docker js wasm

docker: .jq-wasm.tag

.jq-wasm.tag: Dockerfile
	docker build -t $(DOCKER_IMAGE) .
	@touch $@

js: dist/worker.js

dist/worker.js: src/worker/worker.js
	@mkdir -p dist
	cp $< $@

wasm: dist/jq.js

dist/jq.js: .jq-wasm.tag Makefile src/wasm/pre.js src/wasm/post.js
	@mkdir -p dist
	$(DOCKER_RUN) emcc /jq/main.o /jq/libjq.a /jq/libonig.a $(EMCC_FLAGS) -o dist/jq.js

clean:
	rm -f dist/jq.js dist/jq.wasm dist/worker.js .jq-wasm.tag

run-server:
	./dist/serve_$(SERVER_OS)_$(SERVER_ARCH) -dir .
