import { ZBClient } from 'zeebe-node';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

async function deploy() {
  console.log('Iniciando despliegue de flujo BPMN...');

  // Se conecta usando las variables de entorno (ZEEBE_ADDRESS)
  const zbc = new ZBClient(); 

  try {
    const filepath = path.join(__dirname, 'bpmn', 'diagrama_cafetech.bpmn');
    
    // El comando mágico que sube el archivo
    const res = await zbc.deployResource({
      processFilename: filepath,
    });

    console.log(` Despliegue exitoso!`);
    console.log(`   Nombre del proceso: ${res.deployments[0].process.bpmnProcessId}`);
    console.log(`   Versión: ${res.deployments[0].process.version}`);
    console.log(`   Llave (Key): ${res.deployments[0].process.processDefinitionKey}`);
    
  } catch (e) {
    console.error('⚠︎ Error al desplegar: ⚠︎', e);
  }
}

deploy();