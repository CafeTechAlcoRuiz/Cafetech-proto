import express from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { RabbitMQClient } from '../shared/rabbit';
import { v4 as uuidv4 } from 'uuid';

import { Request } from 'express';

interface CustomRequest extends Request {
  user?: any;
}

dotenv.config();
const app = express();
app.use(express.json());

// Middleware de Autenticación JWT
const verifyToken = (req: any, res: any, next: any) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(403).send({ message: 'Token requerido' });
  
  try {
    const decoded = jwt.verify(token.split(" ")[1], process.env.JWT_SECRET!);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).send({ message: 'Token inválido' });
  }
};

// Endpoint Simulado de Login (Identity Provider)
app.post('/login', (req, res) => {
  // Aquí se validaría usuario/pass real
  const user = { id: 1, role: 'cliente' };
  const token = jwt.sign(user, process.env.JWT_SECRET!, { expiresIn: '1h' });
  res.json({ token });
});

// Endpoint Crear Orden
app.post('/orders', verifyToken, async (req: Request, res) => {
  const customReq = req as CustomRequest;

  const orderId = uuidv4();
  const orderData = { 
    orderId, 
    cliente: customReq.user, 
    items: req.body.items,
    timestamp: new Date()
  };

  try {
    // PUBLICAR AL BROKER (Ingesta Asíncrona) [cite: 50]
    const rabbit = RabbitMQClient.getInstance();
    await rabbit.publish('incoming_orders', orderData);

    console.log(`Gateway publica mensaje a RabbitMQ: Orden recibida y enviada al Broker. ID: ${orderId}`);

    res.status(202).json({ 
      message: 'Orden recibida y en procesamiento', 
      traceId: orderId 
    });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del Gateway' });
  }
});

const start = async () => {
  await RabbitMQClient.getInstance().connect(process.env.RABBITMQ_URL!);
  app.listen(3000, () => console.log('CORRIENDO: API Gateway corriendo en puerto 3000'));
};

start();