#!/bin/bash

set -e

NGINX_AVAILABLE="/etc/nginx/sites-available"
NGINX_ENABLED="/etc/nginx/sites-enabled"

echo "👉 Copy nginx configs..."

sudo cp sites-available/* $NGINX_AVAILABLE/

echo "👉 Enable sites..."

for file in sites-available/*; do
    name=$(basename $file)
    sudo ln -sf $NGINX_AVAILABLE/$name $NGINX_ENABLED/$name
done

echo "👉 Testing nginx config..."
sudo nginx -t

echo "👉 Reload nginx..."
sudo systemctl reload nginx

echo "✅ Done!"