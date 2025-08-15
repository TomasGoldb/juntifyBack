import { supabase } from './configs/db-config.js';

// Script de prueba para verificar la funcionalidad de iniciar plan
async function testPlan() {
  try {
    console.log('=== PRUEBA DE PLAN ===');
    
    // 1. Obtener un plan de ejemplo
    const { data: planes, error: planesError } = await supabase
      .from('Planes')
      .select('idPlan, idAnfitrion, estado, nombrePlan')
      .limit(1);
    
    if (planesError) {
      console.error('Error obteniendo planes:', planesError);
      return;
    }
    
    if (!planes || planes.length === 0) {
      console.log('No hay planes en la base de datos');
      return;
    }
    
    const plan = planes[0];
    console.log('Plan encontrado:', plan);
    console.log('Tipo de idAnfitrion:', typeof plan.idAnfitrion);
    
    // 2. Obtener perfiles para ver la estructura
    const { data: perfiles, error: perfilesError } = await supabase
      .from('perfiles')
      .select('id, nombre, username')
      .limit(3);
    
    if (perfilesError) {
      console.error('Error obteniendo perfiles:', perfilesError);
      return;
    }
    
    console.log('Perfiles encontrados:', perfiles);
    console.log('Tipos de ID de perfiles:', perfiles.map(p => typeof p.id));
    
    // 3. Verificar si hay participantes en el plan
    const { data: participantes, error: partError } = await supabase
      .from('ParticipantePlan')
      .select('idPlan, idPerfil, estadoParticipante')
      .eq('idPlan', plan.idPlan);
    
    if (partError) {
      console.error('Error obteniendo participantes:', partError);
      return;
    }
    
    console.log('Participantes del plan:', participantes);
    
  } catch (error) {
    console.error('Error en prueba:', error);
  }
}

testPlan(); 