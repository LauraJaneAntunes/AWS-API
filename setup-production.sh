#!/bin/bash

# Script para configurar ambiente de produção na EC2
echo "🔧 Configurando ambiente de produção na EC2..."

# Criar arquivo .env de produção (sem credenciais AWS)
cat > .env << 'EOF'
# MongoDB
MONGO_URI=mongodb://laurajaneantunes:Senh%40123@13.221.68.62:27017/users?authSource=admin

# MySQL RDS
CNN_MYSQL_DB_HOST="ra3011392313034.cxd4aa6j3bdy.us-east-1.rds.amazonaws.com"
CNN_MYSQL_DB_USER="laurajaneantunes"
CNN_MYSQL_DB_PASSWORD="Senha_123"
CNN_MYSQL_DB_NAME="api-aws"
CNN_MYSQL_DB_PORT="3306"

# AWS Region (IAM Role será usado para autenticação)
REGION="us-east-1"

# CloudWatch Logs
LOG_GROUP_NAME="ra3011392313034-api-logs"
LOG_STREAM_NAME="ra3011392331034-api-stream"

# Environment (production para usar IAM Role)
NODE_ENV=production
EOF

echo "✅ Arquivo .env de produção criado!"
echo "🔐 Usando IAM Role para autenticação AWS"
echo ""
echo "📋 Próximos passos:"
echo "1. Verificar se IAM Role está associada à EC2"
echo "2. Reiniciar aplicação: pm2 restart api-aws"
echo "3. Testar endpoints AWS"
