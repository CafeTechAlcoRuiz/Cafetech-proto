import { ZBClient } from 'zeebe-node';
import { RabbitMQClient } from '../shared/rabbit';
import dotenv from 'dotenv';

dotenv.config();

const gatewayAddress = process.env.ZEEBE_CLUSTER_ID! + '.cdg-1.zeebe.camunda.cloud:443';
const zbc = new ZBClient(gatewayAddress, {
  useTLS: true,
  oAuth: {
    url: 'https://login.cloud.camunda.io/oauth/token',
    audience: 'zeebe.camunda.io',
    clientId: process.env.ZEEBE_CLIENT_ID!,
    clientSecret: process.env.ZEEBE_CLIENT_SECRET!
  }
});

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