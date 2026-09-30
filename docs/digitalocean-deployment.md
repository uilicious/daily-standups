# Deploying Daily Standups to DigitalOcean with PostgreSQL

This guide provides complete, step-by-step instructions for deploying the **Daily Standups** application to **DigitalOcean** using a **PostgreSQL** database.

---

## 1. Choosing Your Deployment Architecture

DigitalOcean offers two distinct deployment models:

| Feature | Path 1: App Platform (PaaS) | Path 2: Droplet + Docker Compose (IaaS) |
|---|---|---|
| **Best For** | Zero server maintenance, automated CI/CD | Maximum cost efficiency, total server control |
| **Estimated Cost** | ~$15/mo (Managed DB) + ~$5/mo (App) = ~$20/mo | ~$4 to $6/mo total (Single Droplet) |
| **SSL / HTTPS** | Automated by DigitalOcean | Automated via Caddy / Let's Encrypt |
| **Database Backups** | Automated daily + point-in-time recovery | Manual / Docker volume backup script |
| **Scaling** | 1-click slider | Resize Droplet or migrate DB |
| **Setup Time** | ~10 minutes | ~15 minutes |

---

## 2. Prerequisites

1. A [DigitalOcean Account](https://cloud.digitalocean.com).
2. Your repository pushed to GitHub or GitLab.
3. A generated 32+ character random string for `SESSION_SECRET`:
   ```bash
   openssl rand -hex 32
   ```

---

## 3. Path 1: DigitalOcean App Platform + Managed PostgreSQL (Recommended)

### Step 1: Create a Managed PostgreSQL Database Cluster

1. Log in to the [DigitalOcean Cloud Console](https://cloud.digitalocean.com).
2. In the left navigation, click **Databases** > **Create Database Cluster**.
3. Configure the database:
   - **Database Engine**: Choose **PostgreSQL** (version 16).
   - **Datacenter**: Select the region closest to your team (e.g., `NYC3`, `SGP1`, `FRA1`).
   - **Cluster Configuration**: Choose the **Basic Nodes** tier ($15/month for 10 GB disk / 1 GB RAM).
   - **Cluster Name**: `daily-standups-db`.
4. Click **Create Database Cluster**. It takes ~3–5 minutes to provision.
5. Once created, note the **Connection Details**:
   - In the **Connection Parameters** dropdown, select **Connection string** (`postgresql://doadmin:SECRET@db-postgresql-...:25060/defaultdb?sslmode=require`).

---

### Step 2: Deploy the Application on App Platform

1. In the DigitalOcean console, click **Create** (top right) > **Apps** (or navigate to **Apps** > **Create App**).
2. **Choose Source**:
   - Select **GitHub** (or **GitLab**).
   - Authorize DigitalOcean and choose your `daily-standups` repository.
   - Select the branch: `main`.
   - Check **Auto-deploy** to automatically trigger builds when changes are pushed.
   - Click **Next**.
3. **Configure the Web Service**:
   - App Platform will automatically detect the **Dockerfile** in the repository root.
   - **Resource Type**: Web Service (`daily-standups`).
   - **HTTP Port**: `3000`.
   - **Instance Size**: Choose **Basic** (`$5.00/mo - 512 MB RAM | 1 vCPU`).
4. **Attach the Database**:
   - Click **Add Component** > **Database**.
   - Select **Attach Existing Database** and pick `daily-standups-db`.
   - App Platform automatically exposes `${db.DATABASE_URL}`.
5. **Configure Environment Variables**:
   Under the `daily-standups` web service, navigate to **Environment Variables** and add:

   | Key | Value | Scope | Encrypt (Secret) |
   |---|---|---|---|
   | `NODE_ENV` | `production` | Run time | No |
   | `PORT` | `3000` | Run time | No |
   | `HOST` | `0.0.0.0` | Run time | No |
   | `DB_CLIENT` | `pg` | Run time | No |
   | `DATABASE_URL` | `${db.DATABASE_URL}` *(or paste connection string)* | Run time | No |
   | `SESSION_SECRET` | *(paste your 32-character generated secret)* | Run time | **Yes** (Check Encrypt) |
   | `ADMIN_USERNAME` | `admin` | Run time | No |
   | `ADMIN_PASSWORD` | *(your strong admin password, e.g. MyAdminPass!123)* | Run time | **Yes** (Check Encrypt) |
   | `APP_URL` | `${APP_URL}` | Run time | No |

6. **Configure Health Check**:
   - Under **Health Checks**, set:
     - **Path**: `/api/health`
     - **Initial delay**: `15` seconds
     - **Period**: `20` seconds
7. **Deploy**:
   - Review your configuration and click **Create Resources**.
   - DigitalOcean will build the multi-stage Dockerfile, package the static Vue client, start the Fastify server, run database initialization and initial admin seeding, and generate an SSL certificate.

---

### Step 3: Access Your App

1. Once the build status shows **Healthy**, click the default domain link (e.g., `https://daily-standups-xxxxx.ondigitalocean.app`).
2. Log in with:
   - **Username or Email:** `admin`
   - **Password:** The password configured in `ADMIN_PASSWORD`.
3. To attach a custom domain (e.g., `standups.yourcompany.com`):
   - Go to **Settings** > **Domains** > **Add Domain**.
   - Add the CNAME record in your DNS provider pointing to your App Platform default domain. DigitalOcean automatically provisions a free Let's Encrypt SSL certificate.

---

## 4. Path 2: DigitalOcean Droplet + Docker Compose (Budget / $4-$6/mo)

If you prefer to run both PostgreSQL and the application container on a single virtual machine:

### Step 1: Create a Droplet

1. Click **Create** > **Droplets**.
2. **Choose Region**: Select the datacenter closest to your team.
3. **Choose Image**: Select **Ubuntu 24.04 LTS**.
4. **Choose Size**:
   - Basic Plan > Regular SSD ($4/mo or $6/mo with 1 GB RAM / 1 vCPU).
5. **Authentication**: Select your **SSH Key** (or root password).
6. Click **Create Droplet** and copy the **Public IPv4 Address**.

---

### Step 2: Install Docker & Docker Compose on the Droplet

SSH into your Droplet:
```bash
ssh root@YOUR_DROPLET_IP
```

Install Docker and the Compose plugin via the official script:
```bash
# Update packages
apt-get update && apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Verify Docker installation
docker --version
docker compose version
```

---

### Step 3: Clone the Repository & Configure Environment

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/daily-standups.git /opt/daily-standups
cd /opt/daily-standups

# Create production .env file
cp .env.example .env
```

Generate secure secrets and edit `.env`:
```bash
# Generate secrets
SESSION_SECRET=$(openssl rand -hex 32)
POSTGRES_PASSWORD=$(openssl rand -hex 24)
ADMIN_PASSWORD="ChooseYourSecurePassword123!"

# Update .env
cat <<EOF > .env
PORT=3000
NODE_ENV=production
SESSION_SECRET=$SESSION_SECRET
APP_URL=https://yourdomain.com

ADMIN_USERNAME=admin
ADMIN_PASSWORD=$ADMIN_PASSWORD
ADMIN_EMAIL=

DB_CLIENT=pg
POSTGRES_USER=standup_user
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
POSTGRES_DB=daily_standups
EOF
```

---

### Step 4: Launch the Containers

Start the PostgreSQL database and application:
```bash
docker compose up -d --build
```

Check the status and logs:
```bash
docker compose ps
docker compose logs -f app
```

You should see:
```
[Seed] Seeded 2 teams from seed.json
[Seed] Seeded initial admin user (admin) from seed.json
🚀 Fastify standups server running at http://localhost:3000
```

---

### Step 5: Setup HTTPS with Caddy (Automatic SSL)

Install [Caddy Server](https://caddyserver.com/) to automatically handle Let's Encrypt SSL certificates and reverse-proxy to port 3000:

```bash
apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install caddy -y
```

Configure `/etc/caddy/Caddyfile`:
```caddyfile
# Point your DNS A record (e.g. standups.yourdomain.com) to your Droplet IP
standups.yourdomain.com {
    reverse_proxy 127.0.0.1:3000
}
```

Reload Caddy:
```bash
systemctl reload caddy
```

Enable the firewall (UFW):
```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

Visit `https://standups.yourdomain.com` in your browser. SSL is active immediately.

---

## 5. Day-2 Operations & Maintenance

### Updating Application Code

#### On App Platform:
Simply push your changes to branch `main` on GitHub:
```bash
git push origin main
```
App Platform will automatically build the new image, run zero-downtime container swapping, and execute database table migrations.

#### On Droplet:
```bash
cd /opt/daily-standups
git pull origin main
docker compose up -d --build
```

### PostgreSQL Backups (Droplet)
To create an on-demand SQL dump from the container:
```bash
docker exec daily-standups-db pg_dump -U standup_user daily_standups > /opt/backup_$(date +%Y%m%d_%H%M%S).sql
```

To restore from a backup:
```bash
cat backup.sql | docker exec -i daily-standups-db psql -U standup_user -d daily_standups
```

---

## 6. Troubleshooting

- **Self-Signed Certificate in Chain (`UNABLE_TO_VERIFY_LEAF_SIGNATURE`)**:
  - The application automatically configures `ssl: { rejectUnauthorized: false }` whenever `sslmode=require` or `PGSSL=true` is present in the `DATABASE_URL`.
- **Database Connection Refused**:
  - Ensure the database cluster has allowed inbound connections from your App Platform app (under **Settings** > **Trusted Sources** on the DigitalOcean database cluster).
- **Session Cookie Invalidation**:
  - If `SESSION_SECRET` is changed or restarted without persistence, existing browser cookies are invalidated and users will need to re-login.
