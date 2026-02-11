import { ZBClient } from 'zeebe-node';
import { MongoNotificationRepo } from './infraestructura/mongo.repo';
import { SendNotificationUseCase } from './application/send-notification.usecase';
import { RabbitMQClient } from '../shared/rabbit';
import dotenv from 'dotenv';
import express from 'express';

dotenv.config();

// Health check server para Render
const app = express();
const PORT = process.env.PORT || 3003;

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'ms-notifications' });
});

app.listen(PORT, () => {
  console.log(`🏥 Health check server escuchando en puerto ${PORT}`);
});

// Configurar cliente Zeebe para Camunda Cloud
const gatewayAddress = process.env.ZEEBE_CLUSTER_ID! + '.cdg-1.zeebe.camunda.io:443';
const zbc = new ZBClient(gatewayAddress, {
  useTLS: true,
  oAuth: {
    url: 'https://login.cloud.camunda.io/oauth/token',
    audience: 'zeebe.camunda.io',
    clientId: process.env.ZEEBE_CLIENT_ID!,
    clientSecret: process.env.ZEEBE_CLIENT_SECRET!
  }
});
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
    taskHandler: async (job: any) => {
      const { orderId } = job.variables;
      // Notificación genérica de fin de proceso
      await useCase.execute(orderId, "Proceso finalizado correctamente", 'EMAIL');
      return job.complete();
    }
  });

  zbc.createWorker({
    taskType: 'log-error',
    taskHandler: async (job: any) => {
      const { orderId } = job.variables;
      await useCase.execute(orderId, "CANCELACIÓN FORZADA DEL SISTEMA", 'SMS');
      return job.complete();
    }
  });

  // Conectar con reintentos (en background, no bloqueante)
  const connectWithRetries = async (maxAttempts = 10) => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await zbc.topology();
        console.log('✓✓ MS Notificaciones conectado a Camunda Cloud exitosamente');
        return;
      } catch (err) {
        console.error(`⚠︎ Intento ${attempt} - No se pudo conectar a Camunda:`, (err as any).message);
        if (attempt === maxAttempts) {
          console.error('⚠︎ Se alcanzó el máximo de intentos, continuando sin conexión...');
          return;
        }
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    }
  };

  // Iniciar conexión en background sin bloquear
  connectWithRetries().catch((err) => {
    console.error('⚠︎ Error en background de conexión:', err);
  });
};

iniciarNotificaciones();