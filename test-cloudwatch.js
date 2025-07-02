require('dotenv').config();
const { logInfo, logError } = require('./logger');

async function testCloudWatch() {
    console.log('=== TESTE DE CLOUDWATCH ===');
    console.log('LOG_GROUP_NAME:', process.env.LOG_GROUP_NAME);
    console.log('LOG_STREAM_NAME:', process.env.LOG_STREAM_NAME);
    console.log('REGION:', process.env.REGION);
    console.log('===============================');

    try {
        // Simular uma requisição para testar o log
        const mockReq = {
            originalUrl: '/test-cloudwatch'
        };

        console.log('Enviando log de teste...');
        await logInfo('Teste de funcionamento do CloudWatch', mockReq, { 
            timestamp: new Date().toISOString(),
            testData: 'Este é um teste de log' 
        });

        console.log('Log de teste enviado com sucesso!');

        // Testar log de erro também
        console.log('Enviando log de erro de teste...');
        await logError('Teste de erro do CloudWatch', mockReq, new Error('Erro de teste'), { 
            timestamp: new Date().toISOString(),
            testError: 'Este é um teste de log de erro' 
        });

        console.log('Log de erro de teste enviado com sucesso!');

    } catch (error) {
        console.error('Erro no teste:', error);
    }
}

testCloudWatch();
