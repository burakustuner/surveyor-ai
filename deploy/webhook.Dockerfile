FROM almir/webhook:latest

# Root user olarak çalıştır (apk için gerekli)
USER root

# Git, docker-cli ve openssh-client yükle
RUN apk add --no-cache \
    git \
    openssh-client \
    docker-cli \
    docker-cli-compose

# Webhook genellikle root olarak çalışır, USER değiştirmeye gerek yok
