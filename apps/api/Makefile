.PHONY: dev build run tidy

dev:
	go run main.go

build:
	go build -o bin/api main.go

run: build
	./bin/api

tidy:
	go mod tidy
