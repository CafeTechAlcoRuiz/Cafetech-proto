import { ZBClient } from 'zeebe-node';
import { PostgresOrderRepo } from './infrastructure/postgres.repo';
import { ValidateOrderUseCase } from './application/validate-order.usecase';
import dotenv from 'dotenv';

dotenv.config();

const zbc = new ZBClient();
const repo = new PostgresOrderRepo();
const useCase = new ValidateOrderUseCase(repo);

console.log('📦 MS Órdenes (Worker) escuchando tareas...');

// 1. Worker de Validación
zbc.createWorker({
  taskType: 'validar-stock',
  taskHandler: async (job) => {
    const { orderId, items } = job.variables;
    console.log(`🕵️ Validando Orden: ${orderId}`);
    try {
      const esValido = await useCase.execute(orderId, items);
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
    console.log(`💲 Procesando pago para Orden: ${orderId}`);
    
    // Aquí iría la lógica de Stripe/PayPal. Simulamos éxito.
    await new Promise(r => setTimeout(r, 500));
    
    console.log(`✅ Pago exitoso.`);
    return job.complete();
  }
});

// 3. Worker de Delivery (Para finalizar el flujo después de notificar)
zbc.createWorker({
  taskType: 'asignar-delivery',
  taskHandler: async (job) => {
    const { orderId } = job.variables;
    console.log(`🛵 Buscando repartidor para Orden: ${orderId}...`);
    // Simulamos asignación
    console.log(`✅ Repartidor asignado.`);
    return job.complete();
  }
});