const https = require('https');
const http = require('http');

// Função para fazer requisições HTTP
function makeRequest(url, method = 'GET') {
    return new Promise((resolve, reject) => {
        const module = url.startsWith('https') ? https : http;
        
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = module.request(url, options, (res) => {
            let data = '';
            
            res.on('data', chunk => {
                data += chunk;
            });
            
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    data: data,
                    headers: res.headers
                });
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.end();
    });
}

// Testa os endpoints
async function testEndpoints() {
    console.log('🧪 Testando endpoints da API...\n');

    // Lista de endpoints para testar
    const endpoints = [
        { name: 'MongoDB Test', url: 'http://localhost:3000/mongodb/testar-conexao' },
        { name: 'MySQL Test', url: 'http://localhost:3000/mysql/testar-conexao' },
        { name: 'Usuarios', url: 'http://localhost:3000/usuarios' },
        { name: 'Produtos', url: 'http://localhost:3000/produtos' },
        { name: 'Buckets', url: 'http://localhost:3000/buckets' }
    ];

    for (const endpoint of endpoints) {
        try {
            console.log(`📡 Testando: ${endpoint.name}`);
            const response = await makeRequest(endpoint.url);
            
            if (response.statusCode >= 200 && response.statusCode < 300) {
                console.log(`✅ ${endpoint.name} - Status: ${response.statusCode}`);
                
                // Tenta parsear JSON se possível
                try {
                    const jsonData = JSON.parse(response.data);
                    console.log(`📄 Resposta: ${JSON.stringify(jsonData, null, 2)}`);
                } catch {
                    console.log(`📄 Resposta: ${response.data}`);
                }
            } else {
                console.log(`❌ ${endpoint.name} - Status: ${response.statusCode}`);
                console.log(`📄 Erro: ${response.data}`);
            }
        } catch (error) {
            console.log(`🚨 ${endpoint.name} - Erro: ${error.message}`);
        }
        console.log('---\n');
    }
}

testEndpoints();
