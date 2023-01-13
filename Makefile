OPTIMIZE="-O3"
LDFLAGS=$(OPTIMIZE)
CFLAGS=$(OPTIMIZE)
CPPFLAGS=$(OPTIMIZE)

SRC = $(wildcard src/wasm/*.js)
LIB = $(SRC:src/wasm/%.js=lib/%.js)

DOCKERIMAGES := jq-wasm
TAGS := $(patsubst %,.%.tag,$(DOCKERIMAGES))
babel := node_modules/.bin/babel
NO_COLOR=\x1b[0m
OK_COLOR=\x1b[32;01m
OK_STRING=$(OK_COLOR)[OK]$(NO_COLOR)

.PHONY: clean

all: docker js wasm

docker: .jq-wasm.tag

$(TAGS): .%.tag: Dockerfile
	@echo "============================================="
	@echo "Building docker build environment"
	@echo "============================================="
	docker build -t jq-wasm .
	@touch $@
	@echo "============================================="
	@echo "Docker images has been built $(OK_STRING)"
	@echo "$(NO_COLOR)============================================="	

transpiled_files := $(patsubst src/wasm/%,lib/%,$(SRC))

lib: $(LIB)
lib/%: src/wasm/%
	@echo "============================================="
	@echo "Transpiling js files"
	@echo "============================================="
	@mkdir -p $(dir $@)
	$(babel) $< --out-file $@
	@echo "============================================="
	@echo "Js files trnaspiled $(OK_STRING)"
	@echo "$(NO_COLOR)============================================="

node_modules: package.json
	npm install

clean:
	rm -rf lib
	rm .jq-wasm.tag

js: node_modules $(transpiled_files)
	@mkdir -p dist && cp src/worker/worker.js dist

wasm:
	@echo "============================================="
	@echo "Compiling wasm bindings"
	@echo "============================================="
	mkdir -p dist
	docker run --platform linux/amd64  --rm -it -v $(PWD):/app jq-wasm /bin/bash -c "cd / && \
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
	@echo "Compiling wasm bindings done $(OK_STRING)"
	@echo "$(NO_COLOR)============================================="


list:= darwin linux
define LIST_RULE
run-server-$(1):
	@echo "============================================="
	@echo "Starting server"
	@echo "============================================="
	./dist/serve_$(1) -dir .
endef

$(foreach l,$(list),$(eval $(call LIST_RULE,$(l))))
