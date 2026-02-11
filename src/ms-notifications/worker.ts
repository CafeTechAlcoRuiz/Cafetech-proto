import { ZBClient } from 'zeebe-node';
import { MongoNotificationRepo } from './infraestructura/mongo.repo';
import { SendNotificationUseCase } from './application/send-notification.usecase';
import { RabbitMQClient } from '../shared/rabbit';
import dotenv from 'dotenv';

dotenv.config();

const zbc = new ZBClient();
const repo = new MongoNotificationRepo();
const useCase = new SendNotificationUseCase(repo);

console.log('📯 MS Notificaciones (Worker) escuchando tareas...');

const iniciarNotificaciones = async () => {
  const rabbit = RabbitMQClient.getInstance();
  
  // 1. Conectar a RabbitMQ
  try {
    await rabbit.connect(process.env.RABBITMQ_URL!);
  } catch(e) {
    console.error('⚠︎ Error conectando a RabbitMQ: ⚠︎', e);
    process.exit(1);
  }

  // 2. Escuchar la cola de eventos de estado
  await rabbit.consume('app_notifications', async (msg) => {
    const { orderId, estado, detalle } = msg;
    console.log(`\n🔥Evento recibido: Orden ${estado}`);
    
    await useCase.execute(orderId, `Estado cambiado a: ${estado}. ${detalle || ''}`, 'EMAIL');
  });

  // 3. Worker de Camunda para Notificaciones Generales (Éxito o Fallo controlado)
  zbc.createWorker({
    taskType: 'notificar-usuario',
    taskHandler: async (job) => {
      const { orderId } = job.variables;
      // Notificación genérica de fin de proceso
      await useCase.execute(orderId, "Proceso finalizado correctamente", 'EMAIL');
      return job.complete();
    }
  });

  zbc.createWorker({
    taskType: 'log-error',
    taskHandler: async (job) => {
      const { orderId } = job.variables;
      await useCase.execute(orderId, "CANCELACIÓN FORZADA DEL SISTEMA", 'SMS');
      return job.complete();
    }
  });
};

iniciarNotificaciones();