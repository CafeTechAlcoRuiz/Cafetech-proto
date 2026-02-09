import { ZBClient } from 'zeebe-node';
import { PrepareOrderUseCase } from './application/prepare-order.usecase';
import { PostgresTicketRepo } from './infraestructure/postgres.repo'; // <-- Importamos el repo real
import dotenv from 'dotenv';

dotenv.config();

// Configuración
const zbc = new ZBClient();

// Inyección de Dependencias: Usamos Postgres en lugar de memoria
const repo = new PostgresTicketRepo(); 
const useCase = new PrepareOrderUseCase(repo);

console.log('🍳 MS Cocina (Worker) conectado a Postgres y escuchando tareas...');

// Worker Principal
zbc.createWorker({
  taskType: 'preparar-orden',
  taskHandler: async (job) => {
    const { orderId, items } = job.variables;
    console.log(`🔥 Cocinando Orden: ${orderId}`);

    try {
      await useCase.execute(orderId, items);
      return job.complete();
    } catch (e: any) {
      console.error(`💥 Error en Cocina: ${e.message}`);
      return job.error('ERROR_COCINA', e.message);
    }
  }
});

// Worker de Compensación
zbc.createWorker({
  taskType: 'reembolsar-dinero',
  taskHandler: async (job) => {
    const { orderId } = job.variables;
    console.log(`💸 COMPENSACIÓN: Iniciando reembolso para Orden ${orderId}...`);
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(`💰 Reembolso completado.`);
    return job.complete();
  }
});