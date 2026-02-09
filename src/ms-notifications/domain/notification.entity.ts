import { v4 as uuidv4 } from 'uuid';

export class RegistroNotificacion {
  private _idLog: string;
  private _idOrden: string;
  private _mensaje: string;
  private _fechaEnvio: Date;

  // Constructor privado para control de creación
  private constructor(idLog: string, idOrden: string, mensaje: string, fechaEnvio: Date) {
    this._idLog = idLog;
    this._idOrden = idOrden;
    this._mensaje = mensaje;
    this._fechaEnvio = fechaEnvio;
  }

  // Getters
  get idLog(): string { return this._idLog; }
  get idOrden(): string { return this._idOrden; }
  get mensaje(): string { return this._mensaje; }
  get fechaEnvio(): Date { return this._fechaEnvio; }

  // --- MÉTODOS DE FÁBRICA Y COMPORTAMIENTO ---

  // + procesarNotificacion(): Crea la instancia lista para enviar
  public static crear(idOrden: string, plantilla: string, estado: string): RegistroNotificacion {
    if (!idOrden) throw new Error("ID de Orden requerido para notificar");
    
    // Simulación de "Plantillas de Mensaje"
    const mensajeFinal = `Hola, tu orden ${idOrden} está en estado: ${estado}. Detalle: ${plantilla}`;
    
    return new RegistroNotificacion(
      uuidv4(),
      idOrden,
      mensajeFinal,
      new Date()
    );
  }

  // Mapper para reconstruir desde Mongo (Infraestructura -> Dominio)
  public static restaurar(datos: any): RegistroNotificacion {
    return new RegistroNotificacion(
      datos.idLog,
      datos.idOrden,
      datos.mensaje,
      new Date(datos.fechaEnvio)
    );
  }
}

// Interfaz del Repositorio [cite: 176]
export interface INotifRepository {
  log(notif: RegistroNotificacion): Promise<void>;
}