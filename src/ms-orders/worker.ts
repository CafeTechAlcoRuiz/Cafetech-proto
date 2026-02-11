import { Camunda8 } from '@camunda8/sdk';
import { PostgresOrderRepo } from './infrastructure/postgres.repo';
import { ValidateOrderUseCase } from './application/validate-order.usecase';
import { RabbitMQClient } from '../shared/rabbit';
import dotenv from 'dotenv';

dotenv.config();

// Configurar Camunda Cloud
const camunda8 = new Camunda8({
  ZEEBE_CLIENT_ID: process.env.ZEEBE_CLIENT_ID,
  ZEEBE_CLIENT_SECRET: process.env.ZEEBE_CLIENT_SECRET,
  ZEEBE_ADDRESS: process.env.ZEEBE_ADDRESS
});

const zbc = camunda8.getZeebeClient();
const repo = new PostgresOrderRepo();
const useCase = new ValidateOrderUseCase(repo);

console.log('📦 MS Órdenes (Worker) escuchando tareas...');

// 1. Worker de Validación
zbc.createWorker({
  taskType: 'validar-stock',
  taskHandler: async (job) => {
    const { orderId, items } = job.variables;
    console.log(`\nVALIDACIÓN: Validando Orden: ${orderId}`);
    try {
      const esValido = await useCase.execute(orderId, items);

      if (esValido) {
        const rabbit = RabbitMQClient.getInstance();
        await rabbit.connect(process.env.RABBITMQ_URL!); // Asegurar conexión
        await rabbit.publish('app_notifications', {
          orderId,
          estado: 'VALIDADA',
          detalle: 'Stock verificado y reservado.'
        });
      }

      return job.complete({ esValido });
    } catch (e) {
      return job.fail('Error en validación');
    }
  }
});

// 2. Worker de Cobro
zbc.createWorker({
  taskType: 'cobrar-orden',
  taskHandler: async (job) => {
    const { orderId, total } = job.variables;
    console.log(`$$$ Procesando pago para Orden: ${orderId}`);
    
    // Aquí iría la lógica de Stripe/PayPal. Simulamos éxito.
    await new Promise(r => setTimeout(r, 500));
    
    console.log(`✓✓ ÉXITO: Pago exitoso.`);
    return job.complete();
  }
});

// 3. Worker de Delivery (Para finalizar el flujo después de notificar)
zbc.createWorker({
  taskType: 'asignar-delivery',
  taskHandler: async (job) => {
    const { orderId } = job.variables;
    console.log(`\nPOSTERIOR A NOTIFICAR QUE LA ORDEN ESTÁ LISTA:`);
    console.log(`BÚSQUEDA: Buscando repartidor para Orden: ${orderId}...`);
    // Simulamos asignación
    console.log(`FIN BÚSQUEDA: Repartidor asignado.`);
    return job.complete();
  }
});

// Conectar con reintentos
const connectWithRetries = async (maxAttempts = 10) => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await zbc.topology();
      console.log('✓✓ MS Órdenes conectado a Camunda Cloud exitosamente');
      return;
    } catch (err) {
      console.error(`⚠︎ Intento ${attempt} - No se pudo conectar a Camunda:`, (err as any).message);
      if (attempt === maxAttempts) throw err;
      await new Promise(r => setTimeout(r, 2000 * attempt));
    }
  }
};

connectWithRetries().catch((err) => {
  console.error('⚠︎ Fatal: No se pudo conectar a Camunda Cloud tras varios intentos:', err);
  process.exit(1);
});