# Makefile for Sonic Forge

.PHONY: install dev build clean lint

install:
	npm install

dev:
	npm run dev

build:
	npm run build

clean:
	rm -rf node_modules dist

lint:
	npm run lint
