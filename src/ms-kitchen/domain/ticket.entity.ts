import { v4 as uuidv4 } from 'uuid';

export class TicketCocina {
  private _idTicket: string;
  private _idOrden: string;
  private _horaEntrada: Date;
  private _estado: 'PENDIENTE' | 'EN_PREPARACION' | 'LISTO' | 'CANCELADO';

  // Constructor privado
  private constructor(idTicket: string, idOrden: string, estado?: any, fecha?: Date) {
    this._idTicket = idTicket;
    this._idOrden = idOrden;
    this._estado = estado || 'PENDIENTE';
    this._horaEntrada = fecha || new Date();
  }

  // Getters
  get idTicket(): string { return this._idTicket; }
  get idOrden(): string { return this._idOrden; }
  get horaEntrada(): Date { return this._horaEntrada; }
  get estado(): string { return this._estado; }

  // --- MÉTODOS DE FÁBRICA ---

  // 1. Crear nuevo (Logica de Negocio)
  public static crearTicket(idOrden: string): TicketCocina {
    if (!idOrden) throw new Error("El ID de Orden es requerido");
    return new TicketCocina(uuidv4(), idOrden);
  }

  // 2. Restaurar desde BD (Infraestructura) -> NUEVO
  public static restaurar(datos: any): TicketCocina {
    return new TicketCocina(
      datos.id_ticket, 
      datos.id_orden, 
      datos.estado, 
      new Date(datos.hora_entrada)
    );
  }

  // --- COMPORTAMIENTO ---
  public finalizarTicket(): void {
    if (this._estado === 'CANCELADO') throw new Error("Ticket cancelado");
    this._estado = 'LISTO';
  }

  public cancelarTicket(): void {
    this._estado = 'CANCELADO';
  }
}

export interface ITicketRepository {
  save(ticket: TicketCocina): Promise<void>;
  findById(idTicket: string): Promise<TicketCocina | null>;
}