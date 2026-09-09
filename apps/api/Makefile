.PHONY: dev build run tidy seed

dev:
	go run ./cmd/main.go

build:
	go build -o bin/api ./cmd/main.go

run:
	./bin/api

tidy:
	go mod tidy

seed:
	go run ./cmd/main.go --seed
