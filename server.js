require('dotenv').config();

// Verificar se está rodando em EC2 ou ambiente local
const isEC2 = process.env.NODE_ENV === 'production' || !process.env.ACCESS_KEY_ID;

// Verificação das credenciais AWS
console.log('Verificando configuração AWS...');

// Verificar se está em EC2 (ambiente de produção) ou local (desenvolvimento)

if (isEC2) {
    console.log('🔐 Modo EC2: Usando IAM Role para autenticação AWS');
    console.log('REGION:', process.env.REGION || 'us-east-1');
} else {
    console.log('💻 Modo Local: Usando credenciais do .env');
    if (!process.env.ACCESS_KEY_ID || !process.env.SECRET_ACCESS_KEY || !process.env.REGION) {
        console.error('ERRO: Credenciais AWS não encontradas no arquivo .env');
        console.log('ACCESS_KEY_ID:', process.env.ACCESS_KEY_ID ? 'Presente' : 'Ausente');
        console.log('SECRET_ACCESS_KEY:', process.env.SECRET_ACCESS_KEY ? 'Presente' : 'Ausente');
        console.log('REGION:', process.env.REGION ? 'Presente' : 'Ausente');
        console.log('SESSION_TOKEN:', process.env.SESSION_TOKEN ? 'Presente' : 'Ausente');
    } else {
        console.log('✓ Credenciais AWS carregadas com sucesso');
    }
}

const express = require('express');
const app = express();
const cors = require('cors');
const multer = require('multer');
const multerS3 = require('multer-s3');

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: '*'
}));

//BD
const mongoose = require('mongoose');
// MySQL
const mysql = require('mysql2/promise');

// Configuração do pool de conexão MySQL
const pool = mysql.createPool({
    host: process.env.CNN_MYSQL_DB_HOST.replace(/"/g, ''), // Remove aspas das variáveis
    user: process.env.CNN_MYSQL_DB_USER.replace(/"/g, ''),
    password: process.env.CNN_MYSQL_DB_PASSWORD.replace(/"/g, ''),
    database: process.env.CNN_MYSQL_DB_NAME.replace(/"/g, ''),
    port: parseInt(process.env.CNN_MYSQL_DB_PORT.replace(/"/g, '')),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    acquireTimeout: 60000,
    timeout: 60000,
});

const DB_NAME = process.env.CNN_MYSQL_DB_NAME.replace(/"/g, '');

console.log('Configuração MySQL:');
console.log('Host:', process.env.CNN_MYSQL_DB_HOST);
console.log('User:', process.env.CNN_MYSQL_DB_USER);
console.log('Database:', process.env.CNN_MYSQL_DB_NAME);
console.log('Port:', process.env.CNN_MYSQL_DB_PORT);

//swagger
const swaggerDocs = require('./swagger');
//S3
const AWS = require('aws-sdk');

//Log
const { logInfo, logError } = require('./logger');

app.use(express.json());

/**
* @swagger
* tags:
*   - name: CRUD MongoDb
*     description: Operações de CRUD para usuários no MongoDb.
*   - name: Buckets
*     description: Operações de Listar buckets, upload e remoção de arquivo para um bucket S3.
*   - name: MySQL RDS
*     description: Operações de CRUD para produtos no MySQL RDS da AWS.
*/


//#region CRUD MongoDb
mongoose.connect(process.env.MONGO_URI)
    .then(() => logInfo('MongoDB conectado', null))
    .catch(err => logError('Erro ao logar mongodb' + err, null, err));

const UserSchema = new mongoose.Schema({
    nome: String,
    email: String
});

const User = mongoose.model('Usuario', UserSchema);

/**
 * @swagger
 * /mongodb/testar-conexao:
 *   get:
 *     tags:
 *       - CRUD MongoDb
 *     summary: Testa a conexão com o MongoDB
 *     description: Verifica se a aplicação consegue se conectar ao MongoDB.
 *     responses:
 *       200:
 *         description: Conexão bem-sucedida
 *       500:
 *         description: Erro na conexão com o MongoDB
 */
app.get('/mongodb/testar-conexao', async (req, res) => {
    try {
        //Tentando conectar ao MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        const user = await User.findOne(); //Consulta simples (primeiro usuário encontrado)

        logInfo('Conexão com o MongoDB efetuada com sucesso', req);

        if (user) {
            res.status(200).send('Conexão com o MongoDB bem-sucedida e usuário encontrado!');
        } else {
            res.status(200).send('Conexão com o MongoDB bem-sucedida, mas nenhum usuário encontrado.');
        }
    } catch (error) {
        await logError('Erro ao conectar no MongoDb' + error, req, error);
        res.status(500).send('Erro na conexão com o MongoDB');
    } finally {
        mongoose.connection.close();
    }
});

/**
 * @swagger
 * /usuarios:
 *   post:
 *     tags:
 *       - CRUD MongoDb
 *     summary: Criar um novo usuário
 *     description: Este endpoint cria um novo usuário no sistema.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nome do usuário
 *               email:
 *                 type: string
 *                 description: Email do usuário
 *             required:
 *               - name
 *               - email
 *     responses:
 *       201:
 *         description: Usuário criado com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                   description: ID do usuário
 *                 name:
 *                   type: string
 *                 email:
 *                   type: string
 *       400:
 *         description: Requisição inválida.
 */
app.post('/usuarios', async (req, res) => {
    try {
        const user = new User(req.body);
        await user.save();
        logInfo('Usuário criado', req);
        res.status(201).send(user);
    } catch (error) {
        logError("Erro ao criar usuário", req, error);
        res.status(500).send('Ocorreu um erro interno');
    }
});

/**
 * @swagger
 * /usuarios:
 *   get:
 *     tags:
 *       - CRUD MongoDb
 *     summary: Listar todos os usuários
 *     description: Este endpoint retorna todos os usuários cadastrados no sistema.
 *     responses:
 *       200:
 *         description: Lista de usuários
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   nome:
 *                     type: string
 *                   email:
 *                     type: string
 */
app.get('/usuarios', async (req, res) => {
    try {
        const users = await User.find();
        logInfo('Usuários encontrados', req, users);
        res.send(users);
    } catch (error) {
        logError("Erro ao buscar usuários", req, error);
        res.status(500).send('Ocorreu um erro interno');
    }

});

/**
 * @swagger
 * /usuarios/{id}:
 *   get:
 *     tags:
 *       - CRUD MongoDb
 *     summary: Obter um usuário específico
 *     description: Este endpoint retorna um usuário baseado no ID fornecido.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID do usuário
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Usuário encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 nome:
 *                   type: string
 *                 email:
 *                   type: string
 *       404:
 *         description: Usuário não encontrado.
 */
app.get('/usuarios/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).send('Usuário não encontrado');

        logInfo('Usuário encontrado', req, user);
        res.send(user);
    } catch (error) {
        logError("Erro ao buscar usuário", req, error);
        res.status(500).send('Ocorreu um erro interno');
    }

});

/**
 * @swagger
 * /usuarios/{id}:
 *   put:
 *     tags:
 *       - CRUD MongoDb
 *     summary: Atualizar um usuário específico
 *     description: Este endpoint atualiza um usuário baseado no ID fornecido.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID do usuário
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nome:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Usuário atualizado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 nome:
 *                   type: string
 *                 email:
 *                   type: string
 *       404:
 *         description: Usuário não encontrado.
 */
app.put('/usuarios/:id', async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!user) return res.status(404).send('Usuário não encontrado');

        logInfo('Usuário atualizado', req, user);
        res.send(user);
    } catch (error) {
        logError("Erro ao atualizar usuário", req, error);
        res.status(500).send('Ocorreu um erro interno');
    }
});

/**
 * @swagger
 * /usuarios/{id}:
 *   delete:
 *     tags:
 *       - CRUD MongoDb
 *     summary: Remover um usuário específico
 *     description: Este endpoint remove um usuário baseado no ID fornecido.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID do usuário
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Usuário removido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 nome:
 *                   type: string
 *                 email:
 *                   type: string
 *       404:
 *         description: Usuário não encontrado.
 */
app.delete('/usuarios/:id', async (req, res) => {
    try {
        const result = await User.deleteOne({ _id: req.params.id });
        if (result.deletedCount === 0) {
            return res.status(404).send('Usuário não encontrado');
        }

        logInfo('Usuário removido', req);
        res.send({ message: 'Usuário removido com sucesso' });
    } catch (error) {
        logError("Erro ao remover usuário", req, error)
        res.status(500).send('Ocorreu um erro interno');
    }

});
//#endregion

//#region S3
// Configuração AWS - usa IAM Role em EC2 ou credenciais localmente
const awsConfig = {
    region: process.env.REGION || 'us-east-1'
};

// Se não estiver em EC2, usar credenciais do .env
if (!isEC2 && process.env.ACCESS_KEY_ID) {
    awsConfig.accessKeyId = process.env.ACCESS_KEY_ID;
    awsConfig.secretAccessKey = process.env.SECRET_ACCESS_KEY;
    if (process.env.SESSION_TOKEN) {
        awsConfig.sessionToken = process.env.SESSION_TOKEN;
    }
    console.log('🔑 Usando credenciais explícitas para desenvolvimento local');
} else {
    console.log('🎭 Usando IAM Role da EC2 para autenticação');
}

AWS.config.update(awsConfig);

const s3 = new AWS.S3();

/**
 * @swagger
 * /buckets:
 *   get:
 *     summary: Lista todos os buckets
 *     tags: 
 *       - Buckets
 *     responses:
 *       200:
 *         description: Lista de todos os buckets
 */
app.get('/buckets', async (req, res) => {
    try {
        const data = await s3.listBuckets().promise();
        logInfo('Buckets encontrados', req, data.Buckets);
        res.status(200).json(data.Buckets);
    } catch (error) {
        logError("Erro ao buscar buckets", req, error);
        res.status(500).json({ error: 'Erro ao listar buckets', details: error });
    }
});

/**
 * @swagger
 * /buckets/{bucketName}:
 *   get:
 *     summary: Lista os objetos de um bucket
 *     tags: 
 *       - Buckets
 *     parameters:
 *       - in: path
 *         name: bucketName
 *         required: true
 *         description: Nome do bucket
 *     responses:
 *       200:
 *         description: Lista dos objetos do bucket
 */
app.get('/buckets/:bucketName', async (req, res) => {
    const { bucketName } = req.params;
    const params = {
        Bucket: bucketName,
    };

    try {
        const data = await s3.listObjectsV2(params).promise();
        logInfo('Objetos encontrados', req, data.Contents);
        res.status(200).json(data.Contents);
    } catch (error) {
        logError("Erro ao buscar objetos", req, error);
        res.status(500).json({ error: 'Erro ao listar objetos do bucket', details: error });
    }
});

/**
 * @swagger
 * /buckets/{bucketName}/upload:
 *   post:
 *     summary: Faz o upload de um arquivo para um bucket
 *     tags: 
 *       - Buckets
 *     parameters:
 *       - in: path
 *         name: bucketName
 *         required: true
 *         description: Nome do bucket
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Arquivo enviado com sucesso
 */
//Utilizar alguma lib para fazer o upload/strem de arquivos, sugestão: multer
// Configuração do multer para armazenar em memória
const upload = multer({ storage: multer.memoryStorage() });
app.post('/buckets/:bucketName/upload', upload.single('file'), async (req, res) => {
    const { bucketName } = req.params;
    const file = req.file;

    if (!file) {
        return res.status(400).json({ message: 'Nenhum arquivo enviado.' });
    }

    const params = {
        Bucket: bucketName,
        Key: file.originalname,
        Body: file.buffer,
        ContentType: file.mimetype,
    };
    try {
        const data = await s3.upload(params).promise();
        logInfo('Upload efetuado', req, data);
        res.status(200).json({ message: 'Upload concluído com sucesso', data });
    } catch (error) {
        logError('Erro ao efetuar upload', req, error);
        res.status(500).json({ message: 'Erro no upload', error: error.message });
    }
});

/**
 * @swagger
 * /buckets/{bucketName}/file/{fileName}:
 *   delete:
 *     summary: Deleta um arquivo específico de um bucket
 *     tags: 
 *       - Buckets
 *     parameters:
 *       - in: path
 *         name: bucketName
 *         required: true
 *         description: Nome do bucket
 *       - in: path
 *         name: fileName
 *         required: true
 *         description: Nome do arquivo a ser deletado
 *     responses:
 *       200:
 *         description: Arquivo deletado com sucesso
 */
app.delete('/buckets/:bucketName/file/:fileName', async (req, res) => {
    try {
        logInfo('Objeto removido', req, data.Buckets);
    } catch (error) {
        logError("Erro ao remover objeto", req, error);
    }
});
//#endregion

//#region MySql

/**
 * @swagger
 * /mysql/testar-conexao:
 *   get:
 *     tags:
 *       - MySQL RDS
 *     summary: Testa a conexão com o MySQL RDS
 *     description: Verifica se a aplicação consegue se conectar ao MySQL RDS da AWS.
 *     responses:
 *       200:
 *         description: Conexão bem-sucedida
 *       500:
 *         description: Erro na conexão com o MySQL
 */
app.get('/mysql/testar-conexao', async (req, res) => {
    try {
        // Testando conexão com o MySQL
        const connection = await pool.getConnection();
        await connection.ping();
        
        // Verificando versão do MySQL
        const [rows] = await connection.execute('SELECT VERSION() as version');
        const version = rows[0].version;
        
        // Verificando se o banco existe
        const [databases] = await connection.execute('SHOW DATABASES');
        const hasDatabase = databases.some(db => db.Database === DB_NAME);
        
        connection.release();
        
        logInfo('Conexão com o MySQL RDS efetuada com sucesso', req);
        
        res.status(200).json({
            status: 'Conexão com o MySQL RDS bem-sucedida!',
            version: version,
            host: process.env.CNN_MYSQL_DB_HOST.replace(/"/g, ''),
            database_exists: hasDatabase,
            target_database: DB_NAME
        });
    } catch (error) {
        await logError('Erro ao conectar no MySQL RDS: ' + error.message, req, error);
        res.status(500).json({ 
            error: 'Erro na conexão com o MySQL RDS',
            message: error.message,
            host: process.env.CNN_MYSQL_DB_HOST.replace(/"/g, ''),
            code: error.code
        });
    }
});

/**
 * @swagger
 * /init-db:
 *   post:
 *     tags:
 *       - MySQL RDS
 *     summary: Cria o banco de dados e a tabela produto
 *     responses:
 *       200:
 *         description: Banco de dados e tabela criados com sucesso
 *       500:
 *         description: Erro ao criar banco/tabela
 */
app.post('/init-db', async (req, res) => {
    try {
      // Criar banco de dados se não existir
      await pool.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
      
      // Usar o banco de dados
      await pool.query(`USE \`${DB_NAME}\``);
      
      // Criar tabela produto se não existir
      await pool.query(`CREATE TABLE IF NOT EXISTS produto (
          Id INT AUTO_INCREMENT PRIMARY KEY,
          Nome VARCHAR(255) NOT NULL,
          Descricao VARCHAR(255) NOT NULL,
          Preco DECIMAL(10,2) NOT NULL
        )`);
      
      res.json({ message: 'Banco de dados e tabela criados com sucesso.', database: DB_NAME });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  
  /**
   * @swagger
   * /produtos:
   *   get:
   *     tags:
   *       - MySQL RDS
   *     summary: Lista todos os produtos
   *     responses:
   *       200:
   *         description: Lista de produtos
   */
  app.get('/produtos', async (req, res) => {
    try {
      await pool.query(`USE \`${DB_NAME}\``);
      const [rows] = await pool.query('SELECT * FROM produto');
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  
  /**
   * @swagger
   * /produtos/{id}:
   *   get:
   *     tags:
   *       - MySQL RDS
   *     summary: Busca um produto pelo ID
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Produto encontrado
   *       404:
   *         description: Produto não encontrado
   */
  app.get('/produtos/:id', async (req, res) => {
    try {
      await pool.query(`USE \`${DB_NAME}\``);
      const [rows] = await pool.query('SELECT * FROM produto WHERE id = ?', [req.params.id]);
      if (rows.length === 0) return res.status(404).json({ error: 'Produto não encontrado' });
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  
  /**
   * @swagger
   * /produtos:
   *   post:
   *     tags:
   *       - MySQL RDS
   *     summary: Cria um novo produto
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - Nome
   *               - Descricao
   *               - Preco
   *             properties:
   *               Nome:
   *                 type: string
   *               Descricao:
   *                 type: string
   *               Preco:
   *                 type: number
   *     responses:
   *       201:
   *         description: Produto criado
   */
  app.post('/produtos', async (req, res) => {
    const { Nome, Descricao, Preco } = req.body;
    try {
      await pool.query(`USE \`${DB_NAME}\``);
      const [result] = await pool.query(
        'INSERT INTO produto (Nome, Descricao, Preco) VALUES (?, ?, ?)',
        [Nome, Descricao, Preco]
      );
      res.status(201).json({ id: result.insertId });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  
  /**
   * @swagger
   * /produtos/{id}:
   *   put:
   *     tags:
   *       - MySQL RDS
   *     summary: Atualiza um produto
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - Nome
   *               - Descricao
   *               - Preco
   *             properties:
   *               Nome:
   *                 type: string
   *               Descricao:
   *                 type: string
   *               Preco:
   *                 type: number
   *     responses:
   *       200:
   *         description: Produto atualizado
   *       404:
   *         description: Produto não encontrado
   */
  app.put('/produtos/:id', async (req, res) => {
    const { Nome, Descricao, Preco } = req.body;
    try {
      await pool.query(`USE \`${DB_NAME}\``);
      const [result] = await pool.query(
        'UPDATE produto SET Nome = ?, Descricao = ?, Preco = ? WHERE Id = ?',
        [Nome, Descricao, Preco, req.params.id]
      );
      if (result.affectedRows === 0) return res.status(404).json({ error: 'Produto não encontrado' });
      res.json({ message: 'Produto atualizado com sucesso' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  
  /**
   * @swagger
   * /produtos/{id}:
   *   delete:
   *     tags:
   *       - MySQL RDS
   *     summary: Deleta um produto
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Produto deletado com sucesso
   *       404:
   *         description: Produto não encontrado
   */
  app.delete('/produtos/:id', async (req, res) => {
    try {
      await pool.query(`USE \`${DB_NAME}\``);
      const [result] = await pool.query('DELETE FROM produto WHERE Id = ?', [req.params.id]);
      if (result.affectedRows === 0) return res.status(404).json({ error: 'Produto não encontrado' });
      res.json({ message: 'Produto deletado com sucesso' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

//#endregion

swaggerDocs(app);
app.listen(3000, () => console.log('Servidor rodando na porta 3000'));
