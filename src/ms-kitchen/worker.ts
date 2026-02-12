import { ZBClient } from 'zeebe-node';
import { PrepareOrderUseCase } from './application/prepare-order.usecase';
import { PostgresTicketRepo } from './infraestructure/postgres.repo';
import { RabbitMQClient } from '../shared/rabbit';
import dotenv from 'dotenv';

dotenv.config();

// Configuración
const zbc = new ZBClient();

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

      // Notificar LISTA (Al terminar con éxito)
      await rabbit.publish('app_notifications', {
        orderId,
        estado: 'LISTA',
        detalle: 'Tu pedido está listo para entrega.'
      });

      await new Promise(resolve => setTimeout(resolve, 5000)); // Simular tiempo de notificación

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