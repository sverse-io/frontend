#!/bin/bash

cd /data/docker/sverse/frontend/

echo "Pulling latest image..."
sudo docker-compose pull

echo "Recreating containers..."
sudo docker-compose -p sverse-fe up -d