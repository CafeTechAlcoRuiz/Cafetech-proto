import { ZBClient } from 'zeebe-node';
import { MongoNotificationRepo } from './infraestructura/mongo.repo';
import { SendNotificationUseCase } from './application/send-notification.usecase';
import dotenv from 'dotenv';

dotenv.config();

const zbc = new ZBClient();
const repo = new MongoNotificationRepo();
const useCase = new SendNotificationUseCase(repo);

console.log('📯 MS Notificaciones (Worker) escuchando tareas...');

// 1. Worker para Notificaciones Generales (Éxito o Fallo controlado)
zbc.createWorker({
  taskType: 'notificar-usuario',
  taskHandler: async (job) => {
    const { orderId } = job.variables;
    
    // Determinamos el mensaje según en qué parte del flujo estemos
    // (Podemos inferirlo o pasarlo como variable desde Camunda si configuras headers)
    const mensaje = "Actualización de estado de su pedido"; 

    try {
      await useCase.execute(orderId, mensaje, 'EMAIL');
      return job.complete();
    } catch (e: any) {
      console.error('Fallo al notificar:', e);
      return job.fail(e.message);
    }
  }
});

// 2. Worker para Log de Errores Críticos (Cancelación Global)
zbc.createWorker({
  taskType: 'log-error',
  taskHandler: async (job) => {
    const { orderId } = job.variables;
    console.log(`🚨 ALERTA: Procesando Log de Cancelación Global para ${orderId}`);

    try {
      await useCase.execute(orderId, "CANCELACIÓN FORZADA DEL SISTEMA", 'SMS');
      return job.complete();
    } catch (e) {
      return job.complete(); // No fallamos el proceso de error
    }
  }
});