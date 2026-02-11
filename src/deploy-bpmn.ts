import { ZBClient } from '@camunda8/sdk';
import path from 'path';
import dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

async function deploy() {
  console.log('Iniciando despliegue de flujo BPMN...');

  try {
    const zbc = new ZBClient({
      clientId: process.env.ZEEBE_CLIENT_ID,
      clientSecret: process.env.ZEEBE_CLIENT_SECRET,
      camundaCloud: {
        clusterId: process.env.ZEEBE_ADDRESS?.split('.')[0] || '',
        region: 'cdg-1'
      }
    });

    const filepath = path.join(__dirname, 'bpmn', 'diagrama_cafetech.bpmn');
    
    if (!fs.existsSync(filepath)) {
      console.error(`⚠︎ Archivo BPMN no encontrado: ${filepath}`);
      return;
    }

    // El comando que sube el archivo a Camunda Cloud
    const res = await zbc.deployResource({
      processFilename: filepath,
    });

    console.log(` Despliegue exitoso!`);
    console.log(`   Nombre del proceso: ${res.deployments[0].process.bpmnProcessId}`);
    console.log(`   Versión: ${res.deployments[0].process.version}`);
    console.log(`   Llave (Key): ${res.deployments[0].process.processDefinitionKey}`);
    
  } catch (e) {
    console.error('⚠︎ Error al desplegar: ⚠︎', (e as any).message || e);
  }
}

deploy();