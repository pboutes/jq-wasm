
.PHONY: all
all: darwin linux

darwin:
	@echo "Building darwin image"
	@mkdir -p ../dist/
	@docker run --rm -v $(PWD):/usr/src/app -w /usr/src/app -e CGO_ENABLED=0 -e GOOS=darwin golang:1.11.5-alpine go build -a -ldflags '-extldflags "-static"' -o serve_darwin serve.go
	@mv serve_darwin ../dist/

linux:
	@echo "Building linux image"
	@mkdir -p ../dist/
	@docker run --rm -v $(PWD):/usr/src/app -w /usr/src/app -e CGO_ENABLED=0 -e GOOS=linux golang:1.11.5-alpine go build -a -ldflags '-extldflags "-static"' -o serve_linux serve.go
	@mv serve_linux ../dist/