package main

import (
	"flag"
	"log"
	"net/http"
	"regexp"
)

var dir = flag.String("dir", "", "directory to serve")
var tFile = regexp.MustCompile("\\.wasm$")

func myfileserver(h http.Handler) func(http.ResponseWriter, *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		ruri := r.RequestURI
		if tFile.MatchString(ruri) {
			w.Header().Set("Content-Type", "application/wasm")
		}
		h.ServeHTTP(w, r)
	}
}

func main() {
	flag.Parse()

	port := "8100"

	if *dir == "" {
		panic("please specify a directory to serve")
	}
	handler := myfileserver(http.FileServer(http.Dir(*dir)))
	http.HandleFunc("/", handler)

	log.Printf("Serving on HTTP port: %s and directory %s\n", port, *dir)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
