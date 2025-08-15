import fetch from 'node-fetch';

async function checkServer() {
  try {
    console.log('Verificando servidor...');
    
    // Probar endpoint básico
    const response = await fetch('http://localhost:3000/api/test');
    const data = await response.json();
    
    console.log('Servidor responde:', data);
    
    // Probar endpoint de planes
    const planesResponse = await fetch('http://localhost:3000/api/planes');
    console.log('Endpoint de planes status:', planesResponse.status);
    
  } catch (error) {
    console.error('Error verificando servidor:', error.message);
  }
}

checkServer(); 