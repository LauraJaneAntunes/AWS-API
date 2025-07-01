# API AWS - Node.js com RDS MySQL

API RESTful integrada com serviços AWS (S3, RDS MySQL, CloudWatch).

## 🚀 Funcionalidades

- **MongoDB**: CRUD de usuários
- **MySQL RDS**: CRUD de produtos 
- **S3**: Upload e gerenciamento de arquivos
- **CloudWatch**: Logs centralizados
- **Swagger**: Documentação interativa

## 📋 Pré-requisitos

- Node.js 18+
- NPM
- Credenciais AWS configuradas

## � Configuração de Segurança AWS

### Desenvolvimento Local
Use credenciais no arquivo `.env`:
```bash
cp .env.example .env
# Editar .env com suas credenciais AWS
```

### Produção (EC2) - IAM Role ⭐
**Recomendado**: Use IAM Role em vez de credenciais hardcoded:

1. **Criar IAM Role**:
   - Nome: `EC2-API-Role`
   - Trusted entity: `EC2`
   - Permissions: `AmazonS3FullAccess`, `CloudWatchLogsFullAccess`

2. **Associar à EC2**:
   - EC2 Console → Instance → Actions → Security → Modify IAM Role
   - Selecionar: `EC2-API-Role`

3. **Configurar produção**:
```bash
# Na EC2
chmod +x setup-production.sh
./setup-production.sh
pm2 restart api-aws
```

### Diferenças por Ambiente

| Ambiente | Autenticação | Arquivo .env |
|----------|-------------|--------------|
| **Local** | Credenciais explícitas | ACCESS_KEY_ID, SECRET_ACCESS_KEY |
| **EC2** | IAM Role | Apenas REGION (sem credenciais) |

## �🛠️ Instalação Local

```bash
# Clonar repositório
git clone <seu-repo>
cd api-aws

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas credenciais

# Iniciar servidor
npm start
```

## 🌐 URLs

- **API**: http://localhost:3000
- **Swagger**: http://localhost:3000/swagger

## 🔐 Variáveis de Ambiente (.env)

```bash
# MongoDB
MONGO_URI=mongodb://user:pass@host:port/database

# MySQL RDS
CNN_MYSQL_DB_HOST=your-rds-endpoint
CNN_MYSQL_DB_USER=username
CNN_MYSQL_DB_PASSWORD=password
CNN_MYSQL_DB_NAME=database
CNN_MYSQL_DB_PORT=3306

# AWS
REGION=us-east-1
ACCESS_KEY_ID=your-access-key
SECRET_ACCESS_KEY=your-secret-key
SESSION_TOKEN=your-session-token

# CloudWatch
LOG_GROUP_NAME=your-log-group
LOG_STREAM_NAME=your-log-stream
```

## 🚀 Deploy na EC2

### Opção 1: Deploy Automático (GitHub Actions)

1. Configure os secrets no GitHub:
   - `EC2_HOST`: IP da sua EC2
   - `EC2_USERNAME`: ec2-user
   - `EC2_SSH_KEY`: Sua chave privada SSH

2. Push para main/master:
```bash
git add .
git commit -m "Deploy automático"
git push origin main
```

### Opção 2: Deploy Manual

```bash
# Na EC2
chmod +x deploy.sh
./deploy.sh
```

## 📊 Endpoints

### MySQL RDS
- `GET /mysql/testar-conexao` - Testar conexão
- `POST /init-db` - Criar banco e tabela
- `GET /produtos` - Listar produtos
- `POST /produtos` - Criar produto
- `PUT /produtos/{id}` - Atualizar produto
- `DELETE /produtos/{id}` - Deletar produto

### MongoDB
- `GET /mongodb/testar-conexao` - Testar conexão
- `GET /usuarios` - Listar usuários
- `POST /usuarios` - Criar usuário
- `PUT /usuarios/{id}` - Atualizar usuário
- `DELETE /usuarios/{id}` - Deletar usuário

### S3
- `GET /buckets` - Listar buckets
- `GET /buckets/{name}` - Listar objetos
- `POST /buckets/{name}/upload` - Upload arquivo
- `DELETE /buckets/{name}/file/{file}` - Deletar arquivo

## 🔧 Comandos MySQL (CloudShell)

```bash
# Conectar no RDS
mysql -h your-rds-endpoint -u username -p

# Comandos úteis
SHOW DATABASES;
USE database_name;
SHOW TABLES;
SELECT * FROM produto;
```

## 📝 Logs

- **Local**: Console e CloudWatch
- **EC2**: `./logs/` (PM2)
- **CloudWatch**: Configurado automaticamente

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch: `git checkout -b feature/nova-feature`
3. Commit: `git commit -m 'Adiciona nova feature'`
4. Push: `git push origin feature/nova-feature`
5. Abra um Pull Request
