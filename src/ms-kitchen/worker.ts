import { Camunda8 } from '@camunda8/sdk';
import { PrepareOrderUseCase } from './application/prepare-order.usecase';
import { PostgresTicketRepo } from './infraestructure/postgres.repo';
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

// Inyección de Dependencias
const repo = new PostgresTicketRepo(); 
const useCase = new PrepareOrderUseCase(repo);

console.log('🍳 MS Cocina (Worker) conectado a Postgres y escuchando tareas...');

// Worker Principal
zbc.createWorker({
  taskType: 'preparar-orden',
  taskHandler: async (job) => {
    const { orderId, items } = job.variables;
    console.log(`\n♨ Preparando Orden: ${orderId}`);

    const rabbit = RabbitMQClient.getInstance();
    await rabbit.connect(process.env.RABBITMQ_URL!);

    try {
      // Notificar EN_PREPARACIÓN (Antes de empezar)
      await rabbit.publish('app_notifications', {
        orderId,
        estado: 'EN_PREPARACION',
        detalle: 'El ticket de cocina se ha generado.'
      });

      // lógica de negocio (aquí ocurre la espera de 2 seg)
      await useCase.execute(orderId, items);
      console.log(`... Preparación de orden.`);

      // Notificar LISTA (Al terminar con éxito)
      await rabbit.publish('app_notifications', {
        orderId,
        estado: 'LISTA',
        detalle: 'Tu pedido está listo para entrega.'
      });

      return job.complete();
    } catch (e: any) {
      console.error(`⚠︎ Error en Cocina ⚠︎: ${e.message}`);

      // Notificar CANCELADA (Si explota la máquina)
      await rabbit.publish('app_notifications', {
        orderId,
        estado: 'CANCELADA',
        detalle: `Fallo crítico en cocina: ${e.message}`
      });

      // se reporta el error a Camunda para que haga el reembolso
      return job.error('ERROR_COCINA', e.message);
    }
  }
});

// Worker de Compensación
zbc.createWorker({
  taskType: 'reembolsar-dinero',
  taskHandler: async (job) => {
    const { orderId } = job.variables;
    console.log(`ʚ$ɞ  COMPENSACIÓN: Iniciando reembolso para Orden ${orderId}...`);
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(`¡$! Reembolso completado.`);
    return job.complete();
  }
});

// Conectar con reintentos
const connectWithRetries = async (maxAttempts = 10) => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await zbc.topology();
      console.log('✓✓ MS Cocina conectado a Camunda Cloud exitosamente');
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