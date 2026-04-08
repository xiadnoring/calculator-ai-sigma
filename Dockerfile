FROM node:20-alpine AS frontend-builder

WORKDIR /frontend

COPY frontend/package*.json ./

RUN npm ci

COPY frontend/ .

RUN npm run build

FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive
ENV CXX=g++-13
ENV CC=gcc-13

RUN apt-get update && apt-get install -y \
    wget \
    cmake \
    make \
    gcc-13 \
    g++-13 \
    libpq-dev \
    libuv1-dev \
    libbrotli-dev \
    libzstd-dev \
    libgmp-dev \
    libcurl4-openssl-dev \
    libnghttp2-dev \
    libssl-dev \
    zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/manapihttp-v1.1.0ubuntu24.04-dbg.deb /tmp/
RUN dpkg -i /tmp/manapihttp-v1.1.0ubuntu24.04-dbg.deb
RUN rm /tmp/manapihttp-v1.1.0ubuntu24.04-dbg.deb

COPY backend/ ./backend/

COPY --from=frontend-builder /frontend/build /app/frontend/build

WORKDIR /app/backend

RUN cmake -B build
RUN cmake --build build

RUN chmod +x build/backend
RUN chmod +x start.sh

EXPOSE 8888

CMD ["./start.sh"]
