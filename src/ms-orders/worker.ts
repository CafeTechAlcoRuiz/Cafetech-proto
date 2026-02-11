import { ZBClient } from 'zeebe-node';
import { PostgresOrderRepo } from './infrastructure/postgres.repo';
import { ValidateOrderUseCase } from './application/validate-order.usecase';
import { RabbitMQClient } from '../shared/rabbit';
import dotenv from 'dotenv';
import express from 'express';

dotenv.config();

// Health check server para Render
const app = express();
const PORT = process.env.PORT || 3001;

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'ms-orders' });
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
const repo = new PostgresOrderRepo();
const useCase = new ValidateOrderUseCase(repo);

console.log('📦 MS Órdenes (Worker) escuchando tareas...');

// 1. Worker de Validación
zbc.createWorker({
  taskType: 'validar-stock',
  taskHandler: async (job: any) => {
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
  taskHandler: async (job: any) => {
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
  taskHandler: async (job: any) => {
    const { orderId } = job.variables;
    console.log(`\nPOSTERIOR A NOTIFICAR QUE LA ORDEN ESTÁ LISTA:`);
    console.log(`BÚSQUEDA: Buscando repartidor para Orden: ${orderId}...`);
    // Simulamos asignación
    console.log(`FIN BÚSQUEDA: Repartidor asignado.`);
    return job.complete();
  }
});

// Conectar con reintentos (en background, no bloqueante)
const connectWithRetries = async (maxAttempts = 10) => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await zbc.topology();
      console.log('✓✓ MS Órdenes conectado a Camunda Cloud exitosamente');
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