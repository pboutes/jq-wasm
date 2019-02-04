FROM trzeci/emscripten:latest

RUN apt-get update && apt-get install -y autoconf libtool

RUN wget https://github.com/stedolan/jq/releases/download/jq-1.6/jq-1.6.tar.gz -O jq-1.6.tar.gz && \
    sha512sum jq-1.6.tar.gz | grep 5da71f53c325257f1f546a2520fe47828b495c953270df25ea0e37741463fdda72f0ba4d5b05b25114ec30f27a559344c2b024bacabf610759f4e3e9efadb480 && \
    tar xvzf jq-1.6.tar.gz && rm jq-1.6.tar.gz

RUN cd jq-1.6 && \
    autoreconf -i && \
    emconfigure ./configure --disable-maintainer-mode --with-oniguruma=builtin && \
    make clean && env CCFLAGS=-O3 emmake make LDFLAGS=-all-static CCFLAGS=-O3 -j8 && \
    cp jq jq.o

WORKDIR /app