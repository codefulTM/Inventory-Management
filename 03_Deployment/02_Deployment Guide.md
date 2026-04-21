# Hướng Dẫn Deploy - Inventory Management System

> **Điều kiện ban đầu:** Đã có VPS Ubuntu (22.04+) và domain `inventory-system.cloud` đã trỏ về IP VPS.

---

## Mục Lục

1. [Cấu trúc thư mục trên VPS](#1-cấu-trúc-thư-mục-trên-vps)
2. [Cài đặt hệ thống cơ bản](#2-cài-đặt-hệ-thống-cơ-bản)
3. [Cài đặt Docker](#3-cài-đặt-docker)
4. [Clone code và cấu hình](#4-clone-code-và-cấu-hình)
5. [Cài đặt Nginx và SSL](#5-cài-đặt-nginx-và-ssl)
6. [Khởi động Infrastructure (Base Services)](#6-khởi-động-infrastructure-base-services)
7. [Cấu hình Keycloak](#7-cấu-hình-keycloak)
8. [Cài đặt và cấu hình Jenkins](#8-cài-đặt-và-cấu-hình-jenkins)
9. [Deploy ứng dụng](#9-deploy-ứng-dụng)
10. [Kiểm tra hệ thống](#10-kiểm-tra-hệ-thống)

---

## 1. Cấu trúc thư mục trên VPS

```
/home/ubuntu/
├── codes/
│   └── Inventory-Management/        # Git repo
│       ├── 02_Source/01_Source Code/ # Application source
│       └── 03_Deployment/
│           └── 01_Deployment_Package/
│               ├── docker-compose.yml
│               ├── .env
│               └── base/
├── data/                            # Infrastructure data & compose files
│   ├── docker-compose-mongo.yml
│   ├── docker-compose-keycloak.yml
│   ├── docker-compose-redis.yml
│   ├── docker-compose-elasticsearch.yml
│   ├── data-mongo/
│   ├── data-keycloak-postgres/
│   ├── data-redis/
│   └── data-elasticsearch/
└── jenkins_home/                    # Jenkins persistent data
```

---

## 2. Cài đặt hệ thống cơ bản

### 2.1 SSH vào VPS và đặt hostname

```bash
ssh ubuntu@<VPS_IP>
sudo hostnamectl set-hostname inventory-server
sudo nano /etc/hosts
# Thêm dòng: 127.0.0.1 inventory-server
```

### 2.2 Cài đặt các công cụ cơ bản

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git nano vim fail2ban locales
```

### 2.3 Cấu hình locale

```bash
sudo apt install -y locales
sudo locale-gen en_US.UTF-8
sudo update-locale LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8
echo 'export LANG=en_US.UTF-8' | sudo tee -a /etc/environment
echo 'export LC_ALL=en_US.UTF-8' | sudo tee -a /etc/environment
```

### 2.4 Cài đặt Node.js và Yarn

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g yarn
```

Kiểm tra:
```bash
node -v
yarn --version
```

### 2.5 Bảo mật cơ bản với fail2ban

```bash
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo systemctl restart fail2ban
```

---

## 3. Cài đặt Docker

```bash
# Cài Docker
curl -fsSL https://get.docker.com | sudo sh

# Cài Docker Compose plugin
sudo apt install -y docker-compose-plugin

# Thêm user ubuntu vào group docker (không cần sudo mỗi lần)
sudo usermod -aG docker ubuntu

# Enable Docker auto-start
sudo systemctl enable docker
sudo systemctl start docker

# Đăng xuất và SSH lại để group có hiệu lực
exit
```

> **Lưu ý:** Phải đăng xuất và SSH lại để lệnh `docker` chạy được không cần `sudo`.

Kiểm tra sau khi SSH lại:
```bash
docker --version
docker compose version
docker run hello-world
```

---

## 4. Clone code và cấu hình

### 4.1 Tạo thư mục và clone repo

```bash
mkdir -p ~/codes ~/data
cd ~/codes
git clone git@github.com:nguyenthaitan/Inventory-Management.git
```

> **Lưu ý:** Cần tạo SSH key và thêm vào GitHub trước:
> ```bash
> ssh-keygen -t ed25519 -C "deploy@inventory-server"
> cat ~/.ssh/id_ed25519.pub   # Copy và thêm vào GitHub → Settings → SSH Keys
> ```

### 4.2 Tạo file `.env` cho production

```bash
cp ~/codes/Inventory-Management/03_Deployment/01_Deployment_Package/.env.example \
   ~/codes/Inventory-Management/03_Deployment/01_Deployment_Package/.env

nano ~/codes/Inventory-Management/03_Deployment/01_Deployment_Package/.env
```

Chỉnh sửa các giá trị quan trọng:
```env
# MongoDB
MONGO_USER=admin
MONGO_PASSWORD=<mật_khẩu_mạnh>

# Keycloak
KEYCLOAK_ADMIN_PASSWORD=<mật_khẩu_admin_keycloak>
KEYCLOAK_CLIENT_SECRET=<secret_từ_keycloak_console>
KC_HOSTNAME_URL=https://keycloak.inventory-system.cloud
KC_HOSTNAME_ADMIN_URL=https://keycloak.inventory-system.cloud

# JWT
JWT_SECRET=<chuỗi_ngẫu_nhiên_dài_ít_nhất_32_ký_tự>
JWT_ISSUER=https://keycloak.inventory-system.cloud/realms/inventory

# Redis
REDIS_PASSWORD=<mật_khẩu_redis>

# CORS
FRONTEND_ORIGIN=https://inventory-system.cloud
VITE_API_URL=https://api.inventory-system.cloud

# AI (optional)
HUGGINGFACE_API_KEY=
GOOGLE_API_KEY=
```

### 4.3 Copy file compose base về thư mục data

```bash
cp ~/codes/Inventory-Management/03_Deployment/01_Deployment_Package/base/docker-compose-mongo.yml ~/data/
cp ~/codes/Inventory-Management/03_Deployment/01_Deployment_Package/base/docker-compose-keycloak.yml ~/data/
cp ~/codes/Inventory-Management/03_Deployment/01_Deployment_Package/base/docker-compose-redis.yml ~/data/
cp ~/codes/Inventory-Management/03_Deployment/01_Deployment_Package/base/docker-compose-elasticsearch.yml ~/data/
```

---

## 5. Cài đặt Nginx và SSL

### 5.1 Cài đặt Nginx và Certbot

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
sudo mkdir -p /var/www/certbot
sudo chown -R www-data:www-data /var/www
```

### 5.2 Deploy Nginx config bằng script

```bash
cd ~/codes/Inventory-Management/03_Deployment/01_Deployment_Package/nginx
chmod +x install.sh
sudo ./install.sh
```

> Script sẽ copy toàn bộ config trong `sites-available/` vào `/etc/nginx/sites-available/`, tạo symlink vào `sites-enabled/`, kiểm tra và reload Nginx.

### 5.3 Cấp SSL

```bash
# Cấp SSL cho tất cả domain (chỉ nếu chưa có)
if ! sudo certbot certificates | grep -q "inventory-system.cloud"; then
  sudo certbot --nginx \
    -d inventory-system.cloud \
    -d www.inventory-system.cloud \
    -d api.inventory-system.cloud \
    -d keycloak.inventory-system.cloud \
    -d jenkins.inventory-system.cloud \
    -d kibana.inventory-system.cloud \
    -d grafana.inventory-system.cloud \
    --agree-tos \
    --no-eff-email \
    -m your-email@example.com \
    --redirect
else
  echo "SSL certificates already installed"
fi

# Kiểm tra lại config Nginx
sudo nginx -t
sudo systemctl reload nginx

# Xem danh sách certificates đã cài
sudo certbot certificates
```

---

## 6. Khởi động Infrastructure (Base Services)

### 6.1 Tạo Docker network dùng chung

```bash
docker network create inventory_network
```

### 6.2 Khởi động MongoDB

```bash
cd ~/data
docker compose -f docker-compose-mongo.yml up -d
docker logs inventory_mongo --tail 20
```

### 6.3 Khởi động Redis

```bash
cd ~/data
docker compose -f docker-compose-redis.yml up -d
docker logs inventory_redis --tail 10
```

### 6.4 Khởi động Elasticsearch

Elasticsearch yêu cầu thư mục data phải thuộc UID 1000:
# Tạo data directory với quyền đúng
sudo mkdir -p data-elasticsearch
sudo chown -R 1000:1000 data-elasticsearch
sudo chmod -R 755 data-elasticsearch

```bash
cd ~/data
mkdir -p data-elasticsearch
sudo chown -R 1000:1000 data-elasticsearch
sudo chmod -R 755 data-elasticsearch
docker compose -f docker-compose-elasticsearch.yml up -d
docker logs inventory_elasticsearch --tail 20
```

Kiểm tra ES đã sẵn sàng:
```bash
curl http://localhost:9200
# Kết quả mong đợi: {"name":"...","cluster_name":"docker-cluster",...}
```

Tạo user kibana_system cho kibana connect:
```bash
docker exec -it inventory_elasticsearch bin/elasticsearch-reset-password -u kibana_system
```
Response (copy value dán vào ELASTICSEARCH_PASSWORD trong docker-compose-kibana.yml):
```
New value: abc...
```

### 6.5 Khởi động Keycloak

```bash
cd ~/data
docker compose -f docker-compose-keycloak.yml up -d
docker logs inventory_keycloak -f
# Chờ đến khi thấy: "Running the server in development mode..."
```

---

## 7. Cấu hình Keycloak

### 7.1 Truy cập Keycloak Admin Console

Mở trình duyệt: `https://keycloak.inventory-system.cloud`

Đăng nhập:
- Username: `admin`
- Password: giá trị `KEYCLOAK_ADMIN_PASSWORD` trong `.env`

### 7.2 Kiểm tra Realm

Realm `inventory` sẽ được tự động import từ file `realm-export.json`. Kiểm tra:
1. Vào **Realm Settings** → đảm bảo realm `inventory` tồn tại
2. Vào **Clients** → kiểm tra client `inventory-backend` tồn tại

### 7.3 Lấy Client Secret

1. Vào **Clients** → `inventory-backend` → tab **Credentials**
2. Copy **Client Secret**
3. Cập nhật vào `.env`:
```bash
nano ~/codes/Inventory-Management/03_Deployment/01_Deployment_Package/.env
# KEYCLOAK_CLIENT_SECRET=<secret_vừa_copy>
```

---

## 8. Cài đặt và cấu hình Jenkins

### 8.1 Tạo thư mục và khởi động Jenkins

```bash
mkdir -p ~/jenkins_home

docker run -d \
  --name jenkins \
  -p 8080:8080 \
  -p 50000:50000 \
  -v ~/jenkins_home:/var/jenkins_home \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /home/ubuntu/codes:/home/ubuntu/codes \
  --group-add $(getent group docker | cut -d: -f3) \
  jenkins/jenkins:lts
```

> **Giải thích các tham số:**
> - `-v /var/run/docker.sock` → Jenkins có thể chạy lệnh `docker` trực tiếp
> - `-v /home/ubuntu/codes` → Jenkins truy cập được source code
> - `--group-add $(getent group docker ...)` → Jenkins user có quyền docker

### 8.2 Lấy mật khẩu ban đầu

```bash
docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

### 8.3 Cài đặt Jenkins qua Web UI

Truy cập: `https://jenkins.inventory-system.cloud`

1. **Nhập mật khẩu** vừa lấy ở bước trên
2. Chọn **"Install suggested plugins"** và chờ cài xong
3. **Tạo admin user** (ghi nhớ username/password)
4. **Configure Jenkins URL**: Đặt thành `https://jenkins.inventory-system.cloud`

### 8.4 Cài thêm plugin cần thiết

Vào **Manage Jenkins** → **Plugins** → **Available plugins**, tìm và cài:
- **Docker Pipeline** — chạy Docker trong pipeline
- **Git** — (thường đã có sẵn)
- **SSH Agent** — nếu cần SSH key cho Git

### 8.5 Tạo Pipeline Job

1. Vào **Dashboard** → **New Item**
2. Nhập tên: `inventory-deploy`
3. Chọn **Pipeline** → **OK**
4. Trong phần **Pipeline**:
   - **Definition**: `Pipeline script from SCM`
   - **SCM**: `Git`
   - **Repository URL**: `git@github.com:nguyenthaitan/Inventory-Management.git`
   - **Credentials**: Thêm SSH key deploy (xem bước 8.6)
   - **Branch**: `*/main`
   - **Script Path**: `Jenkinsfile`
5. **Save**

### 8.6 Thêm SSH Credentials cho GitHub

1. Vào **Manage Jenkins** → **Credentials** → **System** → **Global credentials** → **Add Credentials**
2. **Kind**: SSH Username with private key
3. **ID**: `github-ssh-key`
4. **Username**: `git`
5. **Private Key**: Copy nội dung `~/.ssh/id_ed25519` từ VPS:
   ```bash
   cat ~/.ssh/id_ed25519
   ```
6. **Save**

### 8.7 Cấu hình `.env` path cho Jenkins pipeline

Jenkins pipeline sử dụng lệnh:
```bash
cp /home/ubuntu/data/.env 03_Deployment/01_Deployment_Package/.env
```

Tạo symlink hoặc copy file `.env` vào thư mục data:
```bash
cp ~/codes/Inventory-Management/03_Deployment/01_Deployment_Package/.env ~/data/.env
```

> **Lưu ý:** File `.env` không được commit lên Git. Pipeline sẽ copy từ `/home/ubuntu/data/.env` vào workspace mỗi lần chạy.

---

## 9. Deploy ứng dụng

### 9.1 Deploy lần đầu (thủ công)

```bash
cd ~/codes/Inventory-Management
git pull

# Copy .env vào đúng vị trí
cp ~/data/.env 03_Deployment/01_Deployment_Package/.env

# Build và khởi động tất cả services
cd 03_Deployment/01_Deployment_Package
docker compose --env-file .env build
docker compose --env-file .env up -d
```

### 9.2 Kiểm tra containers

```bash
docker ps
# Kết quả mong đợi - thấy các container:
# inventory_frontend         (port 3000)
# inventory_api_gateway      (port 3001)
# inventory_backend          (port 3100)
# inventory_keycloak_service (port 3200)
# inventory_ai_service       (port 3300)
# inventory_analytics_indexer
# inventory_metrics_service
# inventory_mongo            (port 27017)
# inventory_keycloak         (port 8090)
# inventory_keycloak_db
# inventory_elasticsearch    (port 9200)
# inventory_redis            (port 6379)
```

### 9.3 Deploy tự động qua Jenkins

Khi code được push lên branch `main`, trigger Jenkins job:
1. Vào `https://jenkins.inventory-system.cloud`
2. Chọn job `inventory-deploy` → **Build Now**

Hoặc cấu hình **Webhook** từ GitHub:
1. Trên GitHub repo → **Settings** → **Webhooks** → **Add webhook**
2. **Payload URL**: `https://jenkins.inventory-system.cloud/github-webhook/`
3. **Content type**: `application/json`
4. **Events**: chọn **Just the push event**

---

## 10. Kiểm tra hệ thống

### 10.1 Kiểm tra các URL

| URL | Mong đợi |
|-----|----------|
| `https://inventory-system.cloud` | Frontend load được |
| `https://api.inventory-system.cloud/auth/login` | 404 hoặc 405 (endpoint tồn tại) |
| `https://keycloak.inventory-system.cloud` | Keycloak login page |
| `https://jenkins.inventory-system.cloud` | Jenkins dashboard |

### 10.2 Test API Gateway

```bash
# Test login
TOKEN=$(curl -s -X POST https://api.inventory-system.cloud/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin_manager","password":"password"}' | jq -r '.data.access_token')

echo "Token: $TOKEN"

# Test protected endpoint
curl -X GET https://api.inventory-system.cloud/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

### 10.3 Xem logs khi có lỗi

```bash
# Xem log service cụ thể
docker logs inventory_api_gateway -f
docker logs inventory_backend -f
docker logs inventory_keycloak -f

# Xem log tất cả services
cd ~/codes/Inventory-Management/03_Deployment/01_Deployment_Package
docker compose logs -f

# Xem trạng thái resource
docker stats --no-stream
free -h
df -h
```

### 10.4 Restart khi cần

```bash
cd ~/codes/Inventory-Management/03_Deployment/01_Deployment_Package

# Restart tất cả
docker compose --env-file .env restart

# Restart service cụ thể
docker compose --env-file .env restart api-gateway
docker compose --env-file .env restart inventory-management-service
```

---

## Phụ lục: Lệnh thường dùng

```bash
# Cập nhật code và redeploy
cd ~/codes/Inventory-Management
git pull
cp ~/data/.env 03_Deployment/01_Deployment_Package/.env
cd 03_Deployment/01_Deployment_Package
docker compose --env-file .env down
docker compose --env-file .env build
docker compose --env-file .env up -d

# Dọn dẹp Docker (khi đầy ổ đĩa)
docker system prune -af
docker builder prune -af

# Gia hạn SSL (tự động, hoặc thủ công)
sudo certbot renew --dry-run
sudo certbot renew

# Kiểm tra Nginx
sudo nginx -t
sudo systemctl reload nginx
```
