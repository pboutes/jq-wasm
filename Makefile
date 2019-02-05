OPTIMIZE="-O3"
LDFLAGS=$(OPTIMIZE)
CFLAGS=$(OPTIMIZE)
CPPFLAGS=$(OPTIMIZE)

SRC = $(wildcard src/wasm/*.js)
LIB = $(SRC:src/wasm/%.js=lib/%.js)

babel := node_modules/.bin/babel

.PHONY: clean

all: js wasm

transpiled_files := $(patsubst src/wasm/%,lib/%,$(SRC))

lib: $(LIB)
lib/%: src/wasm/%
	@echo "============================================="
	@echo "Transpiling js files"
	@echo "============================================="
	@mkdir -p $(dir $@)
	$(babel) $< --out-file $@

node_modules: package.json
	npm install

clean:
	rm -rf lib

js: node_modules $(transpiled_files)
	@mkdir -p dist && cp src/worker/worker.js dist

go: %:
	@echo $@

wasm:
	@echo "============================================="
	@echo "Compiling wasm bindings"
	@echo "============================================="
	mkdir -p dist
	docker run --rm -it -v $(PWD):/app jq-wasm /bin/bash -c "cd /src/jq-1.6 && \
	emcc \
		$(OPTIMIZE) \
		--llvm-lto 3 \
		--llvm-opts 3 \
		-s ALLOW_MEMORY_GROWTH=1 \
		-s ERROR_ON_UNDEFINED_SYMBOLS=0 \
		-s MALLOC=dlmalloc \
		-s MODULARIZE_INSTANCE=1 \
		-s EXPORT_NAME="jq" \
		-s WASM=1 \
		-s --pre-js /app/lib/pre.js \
		-s --post-js /app/lib/post.js \
		jq.o -o /app/dist/jq.js"
	@echo "============================================="
	@echo "Compiling wasm bindings done"
	@echo "============================================="
