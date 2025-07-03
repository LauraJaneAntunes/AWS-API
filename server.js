require('dotenv').config();

// Verificação das credenciais AWS
console.log('Verificando configuração AWS...');
if (process.env.ACCESS_KEY_ID && process.env.SECRET_ACCESS_KEY) {
    console.log('💻 Modo Local: Usando credenciais do .env');
    console.log('ACCESS_KEY_ID:', process.env.ACCESS_KEY_ID ? 'Presente' : 'Ausente');
    console.log('SECRET_ACCESS_KEY:', process.env.SECRET_ACCESS_KEY ? 'Presente' : 'Ausente');
    console.log('REGION:', process.env.REGION ? 'Presente' : 'Ausente');
    console.log('SESSION_TOKEN:', process.env.SESSION_TOKEN ? 'Presente' : 'Ausente');
    console.log('✓ Credenciais AWS carregadas com sucesso');
} else {
    console.log('🔐 Modo EC2: Usando IAM Role para autenticação AWS');
    console.log('REGION:', process.env.REGION);
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
        // Usa a conexão global que já foi estabelecida
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
// Configuração do AWS SDK baseada no ambiente
if (process.env.ACCESS_KEY_ID && process.env.SECRET_ACCESS_KEY) {
    // Modo Local: usando credenciais explícitas
    AWS.config.update({
        accessKeyId: process.env.ACCESS_KEY_ID,
        secretAccessKey: process.env.SECRET_ACCESS_KEY,
        region: process.env.REGION,
        sessionToken: process.env.SESSION_TOKEN,
    });
} else {
    // Modo EC2: usando IAM Role
    AWS.config.update({
        region: process.env.REGION,
    });
}

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
    const { bucketName, fileName } = req.params;
    
    const params = {
        Bucket: bucketName,
        Key: fileName,
    };

    try {
        const data = await s3.deleteObject(params).promise();
        logInfo('Objeto removido', req, { bucketName, fileName });
        res.status(200).json({ message: 'Arquivo deletado com sucesso', data });
    } catch (error) {
        logError("Erro ao remover objeto", req, error);
        res.status(500).json({ error: 'Erro ao deletar arquivo', details: error });
    }
});
//#endregion

//#region MySql
const mysql = require('mysql2/promise');

// Configuração do MySQL
const DB_NAME = process.env.CNN_MYSQL_DB_NAME || 'testdb';
console.log('Configuração MySQL:');
console.log('Host:', process.env.CNN_MYSQL_DB_HOST);
console.log('User:', process.env.CNN_MYSQL_DB_USER);
console.log('Database:', DB_NAME);
console.log('Port:', process.env.CNN_MYSQL_DB_PORT);

const pool = mysql.createPool({
    host: process.env.CNN_MYSQL_DB_HOST || 'localhost',
    user: process.env.CNN_MYSQL_DB_USER || 'root',
    password: process.env.CNN_MYSQL_DB_PASSWORD || '',
    port: process.env.CNN_MYSQL_DB_PORT || 3306,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

/**
 * @swagger
 * /mysql/testar-conexao:
 *   get:
 *     tags:
 *       - MySQL
 *     summary: Testa a conexão com o MySQL
 *     description: Verifica se a aplicação consegue se conectar ao MySQL.
 *     responses:
 *       200:
 *         description: Conexão bem-sucedida
 *       500:
 *         description: Erro na conexão com o MySQL
 */
app.get('/mysql/testar-conexao', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT 1 as test');
        logInfo('Conexão com o MySQL efetuada com sucesso', req);
        res.status(200).send('Conexão com o MySQL bem-sucedida!');
    } catch (error) {
        logError('Erro ao conectar no MySQL: ' + error, req, error);
        res.status(500).send('Erro na conexão com o MySQL');
    }
});

/**
 * @swagger
 * /init-db:
 *   post:
 *     summary: Cria o banco de dados e a tabela produto
 *     responses:
 *       200:
 *         description: Banco de dados e tabela criados com sucesso
 */
app.post('/init-db', async (req, res) => {
    try {
      const createDB = `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`; USE \`${DB_NAME}\`;
        CREATE TABLE IF NOT EXISTS produto (
          Id INT AUTO_INCREMENT PRIMARY KEY,
          Nome VARCHAR(255) NOT NULL,
          Descricao VARCHAR(255) NOT NULL,
          Preco DECIMAL(10,2) NOT NULL
        );`;
      await pool.query(createDB);
      res.send('Banco de dados e tabela criados com sucesso.');
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  
  /**
   * @swagger
   * /produtos:
   *   get:
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
    // Aceita tanto campos em maiúscula quanto minúscula
    const nome = req.body.Nome || req.body.nome;
    const descricao = req.body.Descricao || req.body.descricao;
    const preco = req.body.Preco || req.body.preco;

    if (!nome || !descricao || !preco) {
      return res.status(400).json({ 
        error: 'Campos obrigatórios: nome, descricao, preco' 
      });
    }

    try {
      await pool.query(`USE \`${DB_NAME}\``);
      const [result] = await pool.query(
        'INSERT INTO produto (Nome, Descricao, Preco) VALUES (?, ?, ?)',
        [nome, descricao, preco]
      );
      
      // Busca o produto recém-criado para retornar os dados completos
      const [rows] = await pool.query(
        'SELECT * FROM produto WHERE Id = ?', 
        [result.insertId]
      );
      
      const produtoCriado = rows[0];
      const response = {
        id: produtoCriado.id,
        nome: produtoCriado.nome,
        descricao: produtoCriado.descricao,
        preco: produtoCriado.preco
      };
      
      res.status(201).json(response);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  
  /**
   * @swagger
   * /produtos/{id}:
   *   put:
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

// Rota raiz para evitar 404
app.get('/', (req, res) => {
    res.json({
        message: 'API AWS funcionando!',
        swagger: '/swagger',
        endpoints: {
            mongodb: '/mongodb/testar-conexao',
            mysql: '/mysql/testar-conexao',
            usuarios: '/usuarios',
            produtos: '/produtos',
            buckets: '/buckets'
        }
    });
});

swaggerDocs(app);
app.listen(3000, () => console.log('Servidor rodando na porta 3000'));
