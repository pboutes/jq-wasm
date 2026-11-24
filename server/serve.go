package main

import (
	"flag"
	"log"
	"net/http"
	"strings"
)

var dir = flag.String("dir", "", "directory to serve")

// Browsers only compile wasm while it downloads when it is served as application/wasm.
func wasmFileServer(h http.Handler) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, ".wasm") {
			w.Header().Set("Content-Type", "application/wasm")
		}
		h.ServeHTTP(w, r)
	}
}

func main() {
	flag.Parse()

	port := "8100"

	if *dir == "" {
		log.Fatal("please specify a directory to serve with -dir")
	}
	http.Handle("/", wasmFileServer(http.FileServer(http.Dir(*dir))))

	log.Printf("Serving on HTTP port: %s and directory %s\n", port, *dir)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
