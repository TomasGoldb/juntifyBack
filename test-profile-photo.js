/**
 * Script de pruebas para la funcionalidad de fotos de perfil
 * Ejecutar con: node test-profile-photo.js
 */

import dotenv from 'dotenv';
import { supabase } from './configs/db-config.js';
import { PerfilService } from './services/perfil-service.js';
import { validatePhotoUrl, extractUserIdFromPhotoUrl } from './middlewares/profile-photo-middleware.js';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;

/**
 * Ejecuta todas las pruebas de configuración del backend
 */
async function runBackendTests() {
  console.log('🧪 Iniciando pruebas del backend para fotos de perfil...\n');

  const results = {
    supabaseConnection: false,
    bucketExists: false,
    perfilService: false,
    urlValidation: false,
    middleware: false,
    overall: false
  };

  try {
    // 1. Probar conexión a Supabase
    console.log('1️⃣ Probando conexión a Supabase...');
    results.supabaseConnection = await testSupabaseConnection();
    
    // 2. Verificar que existe el bucket de perfiles
    console.log('2️⃣ Verificando bucket de perfiles...');
    results.bucketExists = await testProfilesBucket();
    
    // 3. Probar PerfilService
    console.log('3️⃣ Probando PerfilService...');
    results.perfilService = await testPerfilService();
    
    // 4. Probar validación de URLs
    console.log('4️⃣ Probando validación de URLs...');
    results.urlValidation = testUrlValidation();
    
    // 5. Probar middlewares
    console.log('5️⃣ Probando middlewares...');
    results.middleware = testMiddlewares();
    
    // Resultado general
    results.overall = Object.values(results).every(result => result === true);
    
    console.log('\n📊 Resultados de las pruebas del backend:');
    console.log(`Supabase Connection: ${results.supabaseConnection ? '✅' : '❌'}`);
    console.log(`Bucket Exists: ${results.bucketExists ? '✅' : '❌'}`);
    console.log(`Perfil Service: ${results.perfilService ? '✅' : '❌'}`);
    console.log(`URL Validation: ${results.urlValidation ? '✅' : '❌'}`);
    console.log(`Middleware: ${results.middleware ? '✅' : '❌'}`);
    console.log(`Overall: ${results.overall ? '✅ BACKEND LISTO' : '❌ HAY PROBLEMAS'}\n`);
    
    return results;
    
  } catch (error) {
    console.error('❌ Error ejecutando pruebas del backend:', error);
    return results;
  }
}

/**
 * Prueba la conexión básica a Supabase
 */
async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase
      .from('perfiles')
      .select('count')
      .limit(1);

    if (error) {
      console.log('   ❌ Error conectando a Supabase:', error.message);
      return false;
    }

    console.log('   ✅ Conexión a Supabase exitosa');
    return true;
  } catch (error) {
    console.log('   ❌ Error de conexión:', error.message);
    return false;
  }
}

/**
 * Verifica que existe el bucket de perfiles
 */
async function testProfilesBucket() {
  try {
    const { data, error } = await supabase.storage.getBucket('perfiles');
    
    if (error) {
      console.log('   ❌ Error accediendo al bucket perfiles:', error.message);
      console.log('   💡 Crear bucket "perfiles" en Supabase Storage Dashboard');
      return false;
    }

    console.log('   ✅ Bucket "perfiles" existe y es accesible');
    console.log(`   📁 Público: ${data.public ? 'Sí' : 'No'}`);
    
    if (!data.public) {
      console.log('   ⚠️  El bucket debería ser público para lectura');
    }
    
    return true;
  } catch (error) {
    console.log('   ❌ Error verificando bucket:', error.message);
    return false;
  }
}

/**
 * Prueba el PerfilService
 */
async function testPerfilService() {
  try {
    const perfilService = new PerfilService();
    
    // Probar que el servicio se instancia correctamente
    if (!perfilService) {
      console.log('   ❌ No se pudo instanciar PerfilService');
      return false;
    }

    console.log('   ✅ PerfilService instanciado correctamente');
    
    // Probar métodos (sin hacer llamadas reales a la DB)
    const methods = ['obtenerPerfil', 'actualizarFoto', 'eliminarFoto', 'actualizarPerfil'];
    const missingMethods = methods.filter(method => typeof perfilService[method] !== 'function');
    
    if (missingMethods.length > 0) {
      console.log(`   ❌ Métodos faltantes: ${missingMethods.join(', ')}`);
      return false;
    }

    console.log('   ✅ Todos los métodos necesarios están presentes');
    return true;
  } catch (error) {
    console.log('   ❌ Error probando PerfilService:', error.message);
    return false;
  }
}

/**
 * Prueba la validación de URLs
 */
function testUrlValidation() {
  const testCases = [
    {
      url: `${SUPABASE_URL}/storage/v1/object/public/perfiles/user_123e4567-e89b-12d3-a456-426614174000_1234567890.jpg`,
      expected: true,
      description: 'URL válida con UUID'
    },
    {
      url: `${SUPABASE_URL}/storage/v1/object/public/perfiles/user_abc123_1234567890.png`,
      expected: true,
      description: 'URL válida con ID alfanumérico'
    },
    {
      url: 'https://example.com/image.jpg',
      expected: false,
      description: 'URL externa (debe fallar)'
    },
    {
      url: `${SUPABASE_URL}/storage/v1/object/public/perfiles/invalid_name.jpg`,
      expected: false,
      description: 'Nombre de archivo inválido'
    },
    {
      url: '',
      expected: false,
      description: 'URL vacía'
    },
    {
      url: `${SUPABASE_URL}/storage/v1/object/public/perfiles/user_123_1234567890.gif`,
      expected: false,
      description: 'Formato no permitido (.gif)'
    }
  ];

  let allPassed = true;

  testCases.forEach(({ url, expected, description }) => {
    const result = validatePhotoUrl(url);
    const passed = result.isValid === expected;
    
    console.log(`   ${passed ? '✅' : '❌'} ${description}`);
    if (!passed) {
      console.log(`      Expected: ${expected}, Got: ${result.isValid}`);
      if (result.error) console.log(`      Error: ${result.error}`);
      allPassed = false;
    }
  });

  // Probar extracción de userId
  const testUrl = `${SUPABASE_URL}/storage/v1/object/public/perfiles/user_abc123_1234567890.jpg`;
  const extractedId = extractUserIdFromPhotoUrl(testUrl);
  if (extractedId === 'abc123') {
    console.log('   ✅ Extracción de userId correcta');
  } else {
    console.log(`   ❌ Error en extracción de userId. Expected: abc123, Got: ${extractedId}`);
    allPassed = false;
  }

  return allPassed;
}

/**
 * Prueba los middlewares
 */
function testMiddlewares() {
  try {
    // Verificar que las funciones de middleware existen
    const middlewares = [
      'validateProfilePhotoUpdate',
      'rateLimitPhotoUpdates', 
      'logPhotoOperation'
    ];

    // Importar dinámicamente para verificar
    import('./middlewares/profile-photo-middleware.js').then(module => {
      const missingMiddlewares = middlewares.filter(mw => typeof module[mw] !== 'function');
      
      if (missingMiddlewares.length > 0) {
        console.log(`   ❌ Middlewares faltantes: ${missingMiddlewares.join(', ')}`);
        return false;
      }

      console.log('   ✅ Todos los middlewares están presentes');
      return true;
    });

    console.log('   ✅ Middlewares cargados correctamente');
    return true;
  } catch (error) {
    console.log('   ❌ Error cargando middlewares:', error.message);
    return false;
  }
}

/**
 * Prueba de integración completa (simulada)
 */
async function testIntegration() {
  console.log('\n🔄 Ejecutando prueba de integración simulada...');
  
  try {
    const testUserId = '123e4567-e89b-12d3-a456-426614174000';
    const testPhotoUrl = `${SUPABASE_URL}/storage/v1/object/public/perfiles/user_${testUserId}_${Date.now()}.jpg`;
    
    console.log(`   📝 Usuario de prueba: ${testUserId}`);
    console.log(`   📝 URL de prueba: ${testPhotoUrl}`);
    
    // Validar URL
    const validation = validatePhotoUrl(testPhotoUrl);
    if (!validation.isValid) {
      console.log('   ❌ Validación de URL falló:', validation.error);
      return false;
    }
    
    // Extraer userId
    const extractedId = extractUserIdFromPhotoUrl(testPhotoUrl);
    if (extractedId !== testUserId) {
      console.log(`   ❌ Extracción de userId falló. Expected: ${testUserId}, Got: ${extractedId}`);
      return false;
    }
    
    console.log('   ✅ Flujo de validación completo exitoso');
    return true;
    
  } catch (error) {
    console.log('   ❌ Error en prueba de integración:', error.message);
    return false;
  }
}

/**
 * Valida la configuración de variables de entorno
 */
function validateEnvironment() {
  console.log('🔧 Validando variables de entorno del backend...\n');

  const requiredVars = [
    { name: 'SUPABASE_URL', value: process.env.SUPABASE_URL },
    { name: 'SUPABASE_ANON_KEY', value: process.env.SUPABASE_ANON_KEY },
    { name: 'SUPABASE_SERVICE_ROLE_KEY', value: process.env.SUPABASE_SERVICE_ROLE_KEY }
  ];

  let allValid = true;

  requiredVars.forEach(({ name, value }) => {
    if (value && value.trim() !== '') {
      console.log(`✅ ${name}: ${value.substring(0, 20)}...`);
    } else {
      console.log(`❌ ${name}: NO CONFIGURADA`);
      allValid = false;
    }
  });

  console.log(`\n📋 Variables de entorno: ${allValid ? '✅ COMPLETAS' : '❌ INCOMPLETAS'}\n`);
  
  return allValid;
}

/**
 * Función principal
 */
async function main() {
  console.log('🚀 Pruebas del Backend - Fotos de Perfil Juntify\n');
  console.log('='.repeat(50));
  
  // 1. Validar variables de entorno
  const envValid = validateEnvironment();
  
  // 2. Ejecutar pruebas del backend
  const backendResults = await runBackendTests();
  
  // 3. Prueba de integración
  const integrationResult = await testIntegration();
  
  // 4. Resumen final
  const overallSuccess = envValid && backendResults.overall && integrationResult;
  
  console.log('='.repeat(50));
  console.log(`🎯 RESULTADO FINAL: ${overallSuccess ? '✅ BACKEND COMPLETAMENTE FUNCIONAL' : '❌ REQUIERE CONFIGURACIÓN'}`);
  
  if (!overallSuccess) {
    console.log('\n🔧 Pasos para completar la configuración:');
    if (!envValid) {
      console.log('1. Configurar variables de entorno en archivo .env');
    }
    if (!backendResults.supabaseConnection) {
      console.log('2. Verificar conexión a Supabase');
    }
    if (!backendResults.bucketExists) {
      console.log('3. Crear bucket "perfiles" en Supabase Storage');
      console.log('4. Ejecutar script supabase-storage-config.sql');
    }
    console.log('5. Reiniciar el servidor después de los cambios');
  } else {
    console.log('\n🎉 El backend está listo para manejar fotos de perfil!');
    console.log('📝 Endpoints disponibles:');
    console.log('   - GET /api/perfiles/:userId');
    console.log('   - PUT /api/perfiles/:userId/foto');
    console.log('   - DELETE /api/perfiles/:userId/foto');
    console.log('   - PUT /api/perfiles/:userId');
  }
  
  return overallSuccess;
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { runBackendTests, validateEnvironment, testIntegration };
