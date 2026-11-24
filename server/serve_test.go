package main

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestWasmFileServer(t *testing.T) {
	dir := t.TempDir()
	files := map[string]string{
		"jq.wasm":    "\x00asm",
		"jq.js":      "export default {};",
		"index.html": "<!doctype html>",
	}
	for name, content := range files {
		if err := os.WriteFile(filepath.Join(dir, name), []byte(content), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	srv := httptest.NewServer(wasmFileServer(http.FileServer(http.Dir(dir))))
	defer srv.Close()

	tests := []struct {
		path       string
		wantStatus int
		wantType   string // prefix of the Content-Type header; empty to skip
	}{
		// Browsers only compile wasm while it downloads when served as application/wasm.
		{"/jq.wasm", http.StatusOK, "application/wasm"},
		{"/jq.wasm?v=2", http.StatusOK, "application/wasm"},
		// The page loads jq.js in a module worker, which requires a JavaScript MIME type.
		{"/jq.js", http.StatusOK, "text/javascript"},
		{"/index.html", http.StatusOK, "text/html"},
		{"/missing.wasm", http.StatusNotFound, ""},
	}
	for _, tt := range tests {
		t.Run(tt.path, func(t *testing.T) {
			resp, err := http.Get(srv.URL + tt.path)
			if err != nil {
				t.Fatal(err)
			}
			defer resp.Body.Close()

			if resp.StatusCode != tt.wantStatus {
				t.Errorf("status = %d, want %d", resp.StatusCode, tt.wantStatus)
			}
			if got := resp.Header.Get("Content-Type"); tt.wantType != "" && !strings.HasPrefix(got, tt.wantType) {
				t.Errorf("Content-Type = %q, want prefix %q", got, tt.wantType)
			}
		})
	}
}
