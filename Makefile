.PHONY: install start dev health docker-build docker-up docker-down logs

install:
	pnpm install

start:
	pnpm start

dev:
	pnpm start

health:
	curl -s http://127.0.0.1:3000/health

docker-build:
	docker compose build

docker-up:
	docker compose up -d

docker-down:
	docker compose down

logs:
	docker compose logs -f topdf
