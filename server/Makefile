# Builds the static file server for each OS/arch into ../dist with the
# official Go image, so no local Go install is needed.

GO_IMAGE := golang:1.27.4-alpine
TARGETS  := darwin_amd64 darwin_arm64 linux_amd64 linux_arm64

.PHONY: all test $(TARGETS)

all: $(TARGETS)

test:
	docker run --rm -u $(shell id -u):$(shell id -g) -v $(CURDIR):/src -w /src \
		-e HOME=/tmp -e CGO_ENABLED=0 \
		$(GO_IMAGE) go test ./...

$(TARGETS):
	@mkdir -p ../dist
	docker run --rm -u $(shell id -u):$(shell id -g) -v $(CURDIR):/src -w /src \
		-e HOME=/tmp -e CGO_ENABLED=0 \
		-e GOOS=$(word 1,$(subst _, ,$@)) -e GOARCH=$(word 2,$(subst _, ,$@)) \
		$(GO_IMAGE) go build -trimpath -ldflags '-s -w' -o serve_$@ .
	mv serve_$@ ../dist/
