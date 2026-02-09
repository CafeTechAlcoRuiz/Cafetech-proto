import { ZBClient } from 'zeebe-node';
import { RabbitMQClient } from '../shared/rabbit';
import dotenv from 'dotenv';

dotenv.config();

const zbc = new ZBClient({
  
});

const startBridge = async () => {
  const rabbit = RabbitMQClient.getInstance();
  await rabbit.connect(process.env.RABBITMQ_URL!);

  console.log('PUENTE LEVANTADO: Bridge Broker-Camunda iniciado...');

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

startBridge();