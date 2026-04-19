```
cd ~/data

# Tạo data directory với quyền đúng
sudo mkdir -p data-elasticsearch
sudo chown -R 1000:1000 data-elasticsearch
sudo chmod -R 755 data-elasticsearch

# Restart Elasticsearch
docker-compose -f base/docker-compose-elasticsearch.yml down
docker-compose -f base/docker-compose-elasticsearch.yml up -d

# Check logs
docker logs -f inventory_elasticsearch | tail -30
```