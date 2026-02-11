import mongoose, { Schema, Document } from 'mongoose';
import { RegistroNotificacion, INotifRepository } from '../domain/notification.entity';
import dotenv from 'dotenv';

dotenv.config();

// Definición del Esquema
interface INotificationDoc extends Document {
  idLog: string;
  idOrden: string;
  mensaje: string;
  fechaEnvio: Date;
}

const NotificationSchema = new Schema({
  idLog: { type: String, required: true, unique: true },
  idOrden: { type: String, required: true },
  mensaje: { type: String, required: true },
  fechaEnvio: { type: Date, required: true }
});

const NotificationModel = mongoose.model<INotificationDoc>('RegistroNotificacion', NotificationSchema);

export class MongoNotificationRepo implements INotifRepository {
  
  constructor() {
    this.conectarMongo();
  }

  private async conectarMongo() {
    try {
      if (mongoose.connection.readyState === 0) {
        await mongoose.connect(process.env.MONGO_URI!, {
          dbName: 'cafetech_logs' 
        });
        console.log('✓✓ MS Notificaciones: Conectado a MongoDB (cafetech_logs)');
      }
    } catch (error) {
      console.error('⚠︎ Error conectando a Mongo: ⚠︎', error);
    }
  }

  async log(notif: RegistroNotificacion): Promise<void> {
    try {
      await NotificationModel.create({
        idLog: notif.idLog,
        idOrden: notif.idOrden,
        mensaje: notif.mensaje,
        fechaEnvio: notif.fechaEnvio
      });
      // console.log(`[MONGO] Log guardado`);
    } catch (error) {
      console.error('⚠︎ Error guardando log en Mongo: ⚠︎', error);
      throw new Error('Fallo de persistencia en Mongo');
    }
  }
}