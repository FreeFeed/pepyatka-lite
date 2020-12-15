VERSION = $(shell git describe --tags --always)
BUILD_ENV ?= stable
IMAGE = freefeed/vanilla-$(BUILD_ENV)

image:
	docker build --build-arg BUILD_ENV=$(BUILD_ENV) --build-arg VERSION=$(VERSION) -t $(IMAGE):$(VERSION) .

latest: image
	@docker tag $(IMAGE):$(VERSION) $(IMAGE):latest

push:
	@docker push $(IMAGE):$(VERSION)

push-latest:
	@docker push $(IMAGE):latest

.PHONY: image latest push push-latest
