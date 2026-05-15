# FRAS Production Deployment Guide

## Pre-requisites
- Single server (VPS or college lab machine)
- Ubuntu 22.04 recommended
- GPU for face recognition (optional but recommended)
- A registered domain name pointing to your server's IP address (e.g., `your-domain.com`)

## 1. Environment Configuration

Create a `.env.prod` file based on your `.env.example` but securely configure the following variables. **NEVER commit this file to version control.**

```env
DB_PASSWORD=use_strong_random_32_char_password
REDIS_PASSWORD=use_strong_random_32_char_password
SECRET_KEY=use_64_char_random_hex
USE_RTSP=true
RTSP_URL=rtsp://admin:pass@camera-ip:554/Streaming/Channels/101
RECOGNITION_THRESHOLD=0.72
TRACK_CONFIRM_FRAMES=8
VITE_API_URL=https://your-domain.com
VITE_WS_URL=wss://your-domain.com
```

## 2. Server Setup and Deployment Commands

Run these commands on your Ubuntu server:

```bash
# 1. Server setup (Ubuntu 22.04)
sudo apt update && sudo apt install -y docker.io docker-compose-v2 nvidia-docker2

# 2. Clone and configure
git clone <repo> && cd fras
cp .env.example .env.prod
nano .env.prod  # fill in all values

# 3. Build and start
docker compose -f docker-compose.prod.yml up -d --build

# 4. Run migrations
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head

# 5. Seed database
docker compose -f docker-compose.prod.yml exec backend python seed.py

# 6. Verify all healthy
docker compose -f docker-compose.prod.yml ps

# 7. SSL certificate (Let's Encrypt)
docker run --rm -v certbot_webroot:/var/www/certbot \
  certbot/certbot certonly --webroot -w /var/www/certbot \
  -d your-domain.com --email you@email.com --agree-tos
```

## 3. Operations & Monitoring

### Viewing Logs and Health
```bash
# View live logs
docker compose logs -f backend

# Check pipeline health
curl http://localhost:8000/health
# Returns: {status:"ok", pipeline:true/false, faiss_total:N, connected_ws:N}

# Redis session count
docker exec fras-redis-1 redis-cli -a $REDIS_PASSWORD KEYS "session:*" | wc -l

# PostgreSQL: today's attendance count
docker exec fras-postgres-1 psql -U fras_user fras \
  -c "SELECT COUNT(*) FROM attendance WHERE date=CURRENT_DATE;"
```

### Backups

You should configure a daily cron job to run the backup script below. Create `backup.sh` and make it executable:

```bash
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
docker exec fras-postgres-1 pg_dump -U fras_user fras \
  | gzip > ./backups/fras_${TIMESTAMP}.sql.gz
# Also backup FAISS index
cp backend/app/data/embeddings/index.faiss \
   ./backups/faiss_${TIMESTAMP}.faiss
# Keep last 30 days only
find ./backups -name "*.gz" -mtime +30 -delete
```

### Rollback Procedure

If a deployment fails:

```bash
# If deploy fails
docker compose -f docker-compose.prod.yml down
git checkout <previous-tag>
docker compose -f docker-compose.prod.yml up -d --build

# If DB migration failed
docker compose exec backend alembic downgrade -1
```

## Notes
- **Workers**: We use `workers=1` in the backend production Dockerfile because the FAISS index and the face recognition pipeline are in-process singletons. Use Celery for horizontal scale if needed in the future.
