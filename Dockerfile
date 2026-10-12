FROM alpine:3.22

ARG PB_VERSION=0.27.2

RUN apk add --no-cache \
    ca-certificates \
    unzip \
    wget

RUN wget -O /tmp/pb.zip \
    https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip \
 && unzip /tmp/pb.zip -d /tmp \
 && mv /tmp/pocketbase /usr/local/bin/pocketbase \
 && chmod +x /usr/local/bin/pocketbase \
 && rm -rf /tmp/*

EXPOSE 8090

CMD ["pocketbase", "serve", "--http=0.0.0.0:8090", "--dir=/pb_data"]
