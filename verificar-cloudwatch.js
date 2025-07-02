require('dotenv').config();
const { logInfo, logError } = require('./logger');

console.log('🔍 VERIFICANDO CLOUDWATCH - GERANDO LOGS DE TESTE');
console.log('===============================================');

async function gerarLogsTest() {
    console.log('\n📝 Enviando logs de teste para CloudWatch...\n');
    
    // Log 1: Informação
    console.log('1️⃣ Enviando log de INFORMAÇÃO...');
    await logInfo('🧪 TESTE CLOUDWATCH - Log de informação', { 
        timestamp: new Date().toISOString(),
        test: 'verificacao-cloudwatch',
        status: 'success'
    });
    
    // Aguardar um pouco
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Log 2: Erro simulado
    console.log('2️⃣ Enviando log de ERRO...');
    await logError('🚨 TESTE CLOUDWATCH - Log de erro simulado', new Error('Erro de teste para verificação'), {
        timestamp: new Date().toISOString(),
        test: 'verificacao-cloudwatch',
        errorType: 'simulado'
    });
    
    // Aguardar um pouco
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Log 3: Operação específica
    console.log('3️⃣ Enviando log de OPERAÇÃO...');
    await logInfo('⚙️ TESTE CLOUDWATCH - Operação de verificação executada', {
        timestamp: new Date().toISOString(),
        operation: 'cloudwatch-verification',
        user: 'system',
        duration: '1.5s'
    });
    
    console.log('\n✅ Todos os logs de teste foram enviados!');
    console.log('\n📍 COMO VERIFICAR NO AWS CONSOLE:');
    console.log('================================');
    console.log('1. Acesse: https://console.aws.amazon.com/cloudwatch/');
    console.log('2. Vá em "Log groups" no menu lateral');
    console.log(`3. Procure pelo grupo: ${process.env.LOG_GROUP_NAME}`);
    console.log(`4. Clique no grupo e procure pelo stream: ${process.env.LOG_STREAM_NAME}`);
    console.log('5. Você deve ver os logs de teste que acabaram de ser enviados!');
    console.log('\n🔍 Procure por estas mensagens nos logs:');
    console.log('   - "🧪 TESTE CLOUDWATCH - Log de informação"');
    console.log('   - "🚨 TESTE CLOUDWATCH - Log de erro simulado"');
    console.log('   - "⚙️ TESTE CLOUDWATCH - Operação de verificação executada"');
    
    console.log('\n⏰ Os logs podem levar alguns segundos para aparecer no console.');
    console.log('💡 Dica: Use Ctrl+F para procurar por "TESTE CLOUDWATCH" nos logs.');
}

// Executar teste
gerarLogsTest().catch(console.error);
