#!/bin/bash

# Script de deploy manual para EC2
echo "🚀 Iniciando deploy da API AWS..."

# Parar o servidor atual (se estiver rodando)
echo "📦 Parando servidor atual..."
pm2 stop api-aws 2>/dev/null || echo "Servidor não estava rodando"

# Atualizar código do GitHub
echo "📥 Baixando código do GitHub..."
git pull origin main

# Instalar dependências
echo "📦 Instalando dependências..."
npm install

# Criar diretório de logs se não existir
mkdir -p logs

# Iniciar servidor com PM2
echo "🚀 Iniciando servidor..."
pm2 start ecosystem.config.json

# Salvar configuração do PM2
pm2 save

# Configurar PM2 para iniciar automaticamente
pm2 startup

echo "✅ Deploy concluído!"
echo "📊 Status do servidor:"
pm2 status
