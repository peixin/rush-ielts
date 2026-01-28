#!/bin/bash
set -e

# Load environment variables
if [ -f .env.local ]; then
    export $(grep -v '^#' .env.local | xargs)
else
    echo "❌ Error: .env.local file not found!"
    exit 1
fi

# Configuration
VERSION=$(node -p "require('./package.json').version")
IMAGE_NAME="${ALIYUN_REGISTRY}/${ALIYUN_NAMESPACE}/rush-ielts"
# SERVER_HOST, SERVER_DIR and others are loaded from .env.local

echo "🚀 Starting Remote Deployment to $SERVER_HOST..."

# Generate Nginx Config from Template
# We use sed to replace variables since envsubst might not be available or tricky with $host
echo "⚙️ Generating Nginx configuration..."
sed -e "s|\${DOMAIN_NAME}|$DOMAIN_NAME|g" \
    -e "s|\${SSL_CERT_NAME}|$SSL_CERT_NAME|g" \
    nginx/default.conf.template > nginx/default.conf

# 1. Build and Tag Docker Image
echo "📦 Building Docker image: $IMAGE_NAME:$VERSION..."
# Build for linux/amd64 (common for servers) to ensure compatibility if building on Mac Silicon
docker build --platform linux/amd64 -t $IMAGE_NAME:$VERSION -t $IMAGE_NAME:latest .

# 2. Push to Registry
echo "☁️ Pushing image to Aliyun Registry..."
docker push $IMAGE_NAME:$VERSION
docker push $IMAGE_NAME:latest

# 3. Create Remote Directory
echo "📂 Preparing remote directory..."
ssh $SERVER_HOST "mkdir -p $SERVER_DIR/nginx/cert"

echo "🔐 Updating remote certificates..."
ssh $SERVER_HOST "cp /root/.acme.sh/rush-ielts.stillume.com_ecc/fullchain.cer $SERVER_DIR/nginx/cert/$SSL_CERT_NAME.pem"
ssh $SERVER_HOST "cp /root/.acme.sh/rush-ielts.stillume.com_ecc/rush-ielts.stillume.com.key $SERVER_DIR/nginx/cert/$SSL_CERT_NAME.key"

# 4. Upload Configuration and Certs
echo "📤 Uploading Configs..."
# Copy docker-compose
scp docker-compose-remote.yml $SERVER_HOST:$SERVER_DIR/docker-compose.yml
# Copy nginx config
scp nginx/default.conf $SERVER_HOST:$SERVER_DIR/nginx/default.conf

# 5. Deploy on Server
echo "🔄 Restarting services on remote server..."
ssh $SERVER_HOST << EOF
    cd $SERVER_DIR
    export TAG=$VERSION
    export ALIYUN_REGISTRY=$ALIYUN_REGISTRY
    export ALIYUN_NAMESPACE=$ALIYUN_NAMESPACE
    
    # Pull the new image
    docker compose pull
    
    # Restart services (downtime is minimized)
    docker compose up -d --remove-orphans
    
    # Prune old images to save space
    docker image prune -f
EOF

echo "✅ Remote deployment success!"
echo "👉 Visit: https://rush-ielts.stillume.com"
