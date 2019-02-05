
.PHONY: all
all: darwin linux
list:= darwin linux

define LIST_RULE
$(1):
	@echo "Building $$@ image"
	@mkdir -p ../dist/
	@docker run --rm -v $(PWD):/usr/src/app -w /usr/src/app -e CGO_ENABLED=0 -e GOOS=$$@ golang:1.11.5-alpine go build -a -ldflags '-extldflags "-static"' -o serve_$$@ serve.go
	@mv serve_$$@ ../dist/
endef

$(foreach l,$(list),$(eval $(call LIST_RULE,$(l))))