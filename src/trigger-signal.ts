import { ZBClient } from 'zeebe-node';
import dotenv from 'dotenv';

dotenv.config();

const zbc = new ZBClient();

async function enviarSenal() {
  console.log('🚨 [PANIC BUTTON] PREPARANDO SEÑAL DE CANCELACIÓN GLOBAL...');
  
  try {
    // CORRECCIÓN: Usamos 'broadcastSignal'
    // Esto envía la señal a TODOS los procesos activos que estén escuchando "CANCELAR_TODO"
    await zbc.broadcastSignal({
      signalName: 'CANCELAR_TODO',
      variables: {
        motivo: "Emergencia en el restaurante",
        adminUser: "Admin1"
      }
    });

    console.log('✓✓ SEÑAL ENVIADA CON ÉXITO.');
    console.log('   El sistema de cocina debería detenerse y activar el reembolso.');
    
    await zbc.close(); 
    
  } catch (error) {
    console.error('⚠︎ Error enviando señal ⚠︎:', error);
  }
}

enviarSenal();