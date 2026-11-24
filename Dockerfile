# Build environment: the Emscripten SDK plus jq's C sources compiled to
# static libraries. `make wasm` links them with src/wasm/{pre,post}.js.
FROM emscripten/emsdk:7.0.1

ARG JQ_VERSION=1.8.2
ARG JQ_SHA256=71b8d6e8f5fe81f6c6d0d110e3892251f6ce76ed095abd315e26e6e1193af3af

WORKDIR /build

RUN curl -fsSL "https://github.com/jqlang/jq/releases/download/jq-${JQ_VERSION}/jq-${JQ_VERSION}.tar.gz" -o jq.tar.gz \
 && echo "${JQ_SHA256}  jq.tar.gz" | sha256sum -c - \
 && tar xzf jq.tar.gz \
 && rm jq.tar.gz

# --with-oniguruma=builtin also compiles jq's vendored regex library,
# which test/match/capture/sub need.
# --disable-shared: only static libraries, otherwise libtool links a .so.
# PTHREAD_CFLAGS: jq only needs pthread_key/pthread_once, which Emscripten's
# single-threaded libc provides. Giving configure a no-op flag stops it from
# picking -pthread, which would make the wasm need SharedArrayBuffer and
# cross-origin isolation headers.
RUN cd "jq-${JQ_VERSION}" \
 && emconfigure ./configure \
      --with-oniguruma=builtin \
      --disable-shared \
      --disable-docs \
      --disable-valgrind \
      --disable-maintainer-mode \
      PTHREAD_CFLAGS=-D_REENTRANT \
      CFLAGS=-O3 \
 && emmake make -j"$(nproc)" \
 && mkdir -p /jq \
 && cp src/main.o .libs/libjq.a vendor/oniguruma/src/.libs/libonig.a /jq/

# `make wasm` runs emcc as the host user; keep the cache it writes to
# writable (building jq above created new cache entries as root).
RUN chmod -R a+rwX /emsdk/upstream/emscripten/cache

WORKDIR /app
