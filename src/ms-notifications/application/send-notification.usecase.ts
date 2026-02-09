import { RegistroNotificacion, INotifRepository } from '../domain/notification.entity';

export class SendNotificationUseCase {
  constructor(private repo: INotifRepository) {}

  async execute(idOrden: string, mensajeBase: string, tipo: 'EMAIL' | 'SMS'): Promise<void> {
    
    // 1. Crear la entidad de dominio
    const notificacion = RegistroNotificacion.crear(idOrden, mensajeBase, tipo);

    // 2. Simular el servicio externo (Email/SMS) 
    console.log(`📧 ENVIANDO ${tipo} PARA ORDEN [${idOrden}]: "${notificacion.mensaje}"`);
    
    // Simulación de latencia de red
    await new Promise(resolve => setTimeout(resolve, 500));

    // 3. Persistir el Log (Requisito de Trazabilidad) [cite: 177]
    await this.repo.log(notificacion);
    
    console.log(`📝 Notificación registrada en MongoDB (ID: ${notificacion.idLog})`);
  }
}