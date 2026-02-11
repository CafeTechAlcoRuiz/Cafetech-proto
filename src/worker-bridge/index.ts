import { Camunda8 } from '@camunda8/sdk';
import { RabbitMQClient } from '../shared/rabbit';
import dotenv from 'dotenv';

dotenv.config();

const camunda8 = new Camunda8({
  ZEEBE_CLIENT_ID: process.env.ZEEBE_CLIENT_ID,
  ZEEBE_CLIENT_SECRET: process.env.ZEEBE_CLIENT_SECRET,
  ZEEBE_ADDRESS: process.env.ZEEBE_ADDRESS
});

const zbc = camunda8.getZeebeClient();

const startBridge = async () => {
  const rabbit = RabbitMQClient.getInstance();
  await rabbit.connect(process.env.RABBITMQ_URL!);

  console.log('⛩ PUENTE LEVANTADO: Bridge Broker-Camunda iniciado...');

  // Conectar a Camunda Cloud con reintentos
  const connectWithRetries = async (maxAttempts = 10) => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await zbc.topology();
        console.log('✓✓ Bridge conectado a Camunda Cloud exitosamente');
        return;
      } catch (err) {
        console.error(`⚠︎ Intento ${attempt} - No se pudo conectar a Camunda:`, (err as any).message);
        if (attempt === maxAttempts) throw err;
        await new Promise(r => setTimeout(r, 2000 * attempt));
      }
    }
  };

  await connectWithRetries();

  // Consumir de RabbitMQ
  await rabbit.consume('incoming_orders', async (orderData) => {
    console.log(`¡Camunda consume de RabbitMQ! Recibido del Broker: Orden ${orderData.orderId}`);

    // Iniciar Instancia de Proceso en Camunda 
    const result = await zbc.createProcessInstance({
      bpmnProcessId: 'Process_CafeTech',
      variables: {
        orderId: orderData.orderId,
        items: orderData.items,
        esValido: '' // Variable inicial
      }
    });

    console.log(`Proceso iniciado en Camunda: ${result.processInstanceKey}`);
  });
};

startBridge().catch((err) => {
  console.error('⚠︎ Fatal: No se pudo iniciar el Bridge:', err);
  process.exit(1);
});