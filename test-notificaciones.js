import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000/api';
const TEST_TOKEN = 'your-test-token-here'; // Reemplazar con un token válido

async function testNotificaciones() {
  console.log('=== TESTING NOTIFICACIONES ===\n');

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${TEST_TOKEN}`
  };

  try {
    // 1. Listar notificaciones
    console.log('1. Probando GET /api/notificaciones/{idPerfil}');
    const listResponse = await fetch(`${BASE_URL}/notificaciones/test-user-123`, {
      method: 'GET',
      headers
    });
    console.log('Status:', listResponse.status);
    const listData = await listResponse.json();
    console.log('Response:', JSON.stringify(listData, null, 2));
    console.log('');

    // 2. Marcar como leída
    if (listData && listData.length > 0) {
      const firstNoti = listData[0];
      console.log('2. Probando PUT /api/notificaciones/{idNoti}/leer');
      const markResponse = await fetch(`${BASE_URL}/notificaciones/${firstNoti.idNoti}/leer`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ idPerfil: 'test-user-123' })
      });
      console.log('Status:', markResponse.status);
      const markData = await markResponse.json();
      console.log('Response:', JSON.stringify(markData, null, 2));
      console.log('');

      // 3. Eliminar notificación
      console.log('3. Probando DELETE /api/notificaciones/{idNoti}');
      const deleteResponse = await fetch(`${BASE_URL}/notificaciones/${firstNoti.idNoti}`, {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ idPerfil: 'test-user-123' })
      });
      console.log('Status:', deleteResponse.status);
      const deleteData = await deleteResponse.json();
      console.log('Response:', JSON.stringify(deleteData, null, 2));
      console.log('');

      // 4. Verificar que se eliminó
      console.log('4. Verificando que la notificación se eliminó');
      const verifyResponse = await fetch(`${BASE_URL}/notificaciones/test-user-123`, {
        method: 'GET',
        headers
      });
      console.log('Status:', verifyResponse.status);
      const verifyData = await verifyResponse.json();
      console.log('Response:', JSON.stringify(verifyData, null, 2));
    } else {
      console.log('No hay notificaciones para probar');
    }

  } catch (error) {
    console.error('Error en las pruebas:', error);
  }
}

// Ejecutar las pruebas
testNotificaciones();
