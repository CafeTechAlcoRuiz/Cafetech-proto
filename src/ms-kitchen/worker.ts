import { ZBClient } from 'zeebe-node';
import { PrepareOrderUseCase } from './application/prepare-order.usecase';
import { PostgresTicketRepo } from './infraestructure/postgres.repo';
import { RabbitMQClient } from '../shared/rabbit';
import dotenv from 'dotenv';
import express from 'express';

dotenv.config();

// Health check server para Render
const app = express();
const PORT = process.env.PORT || 3002;

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'ms-kitchen' });
});

app.listen(PORT, () => {
  console.log(`🏥 Health check server escuchando en puerto ${PORT}`);
});

// Configurar cliente Zeebe para Camunda Cloud
const clusterId = process.env.ZEEBE_CLUSTER_ID!;
const gatewayAddress = clusterId + '.cdg-1.zeebe.camunda.io:26500';
console.log(`🔗 Conectando a Camunda Cloud: ${gatewayAddress}`);
const zbc = new ZBClient(gatewayAddress, {
  useTLS: true,
  channelOptions: {
    'grpc.ipv6_loopback_only': 0,  // Deshabilitar IPv6
    'grpc.max_connection_idle_ms': 60000,
    'grpc.max_connection_age_ms': 300000,
  },
  oAuth: {
    url: 'https://login.cloud.camunda.io/oauth/token',
    audience: 'zeebe.camunda.io',
    clientId: process.env.ZEEBE_CLIENT_ID!,
    clientSecret: process.env.ZEEBE_CLIENT_SECRET!
  }
});

// Inyección de Dependencias
const repo = new PostgresTicketRepo(); 
const useCase = new PrepareOrderUseCase(repo);

console.log('🍳 MS Cocina (Worker) conectado a Postgres y escuchando tareas...');

// Worker Principal
zbc.createWorker({
  taskType: 'preparar-orden',
  taskHandler: async (job: any) => {
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
  taskHandler: async (job: any) => {
    const { orderId } = job.variables;
    console.log(`ʚ$ɞ  COMPENSACIÓN: Iniciando reembolso para Orden ${orderId}...`);
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(`¡$! Reembolso completado.`);
    return job.complete();
  }
});

// Conectar con reintentos (en background, no bloqueante)
const connectWithRetries = async (maxAttempts = 10) => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await zbc.topology();
      console.log('✓✓ MS Cocina conectado a Camunda Cloud exitosamente');
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

connectWithRetries().catch((err) => {
  console.error('⚠︎ Error en background de conexión:', err);
});