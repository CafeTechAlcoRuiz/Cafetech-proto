import { TicketCocina, ITicketRepository } from '../domain/ticket.entity';

export class PrepareOrderUseCase {
  constructor(private repo: ITicketRepository) {}

  async execute(idOrden: string, items: any[]): Promise<string> {
    
    // se usa el método estático del diagrama para crear la instancia
    const ticket = TicketCocina.crearTicket(idOrden);
    
    // se persiste el estado inicial (PENDIENTE)
    await this.repo.save(ticket);
    console.log(`𐂐◯🗡 Nuevo ticket en Cocina: Ticket ${ticket.idTicket} creado a las ${ticket.horaEntrada.toISOString()}`);

    // SIMULACIÓN DE PROCESO (2 segundos)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // --- LÓGICA DE EXCEPCIÓN (Escenario de excepción) ---
    const debeFallar = items.some((i: any) => i.product === 'error_cocina');

    if (debeFallar) {
      ticket.cancelarTicket(); // Método de dominio
      await this.repo.save(ticket);
      throw new Error('La máquina de café explotó'); 
    }

    // se usa el método del diagrama para finalizar
    ticket.finalizarTicket();
    
    // persiste el cambio de estado
    await this.repo.save(ticket);
    
    console.log(`✓✓ Fin de Preparación en Cocina: Orden ${idOrden} FINALIZADA.`);
    return ticket.idTicket;
  }
}