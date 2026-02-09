import { TicketCocina, ITicketRepository } from '../domain/ticket.entity';

export class PrepareOrderUseCase {
  constructor(private repo: ITicketRepository) {}

  async execute(idOrden: string, items: any[]): Promise<string> {
    
    // 1. Usamos el método estático del diagrama para crear la instancia
    const ticket = TicketCocina.crearTicket(idOrden);
    
    // Persistimos el estado inicial (PENDIENTE)
    await this.repo.save(ticket);
    console.log(`👨‍🍳 Cocina: Ticket ${ticket.idTicket} creado a las ${ticket.horaEntrada.toISOString()}`);

    // SIMULACIÓN DE PROCESO (2 segundos)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // --- LÓGICA DE EXCEPCIÓN (Escenario "Oops") ---
    const debeFallar = items.some((i: any) => i.product === 'error_cocina');

    if (debeFallar) {
      ticket.cancelarTicket(); // Método de dominio
      await this.repo.save(ticket);
      throw new Error('La máquina de café explotó'); 
    }

    // 2. Usamos el método del diagrama para finalizar
    ticket.finalizarTicket();
    
    // Persistimos el cambio de estado
    await this.repo.save(ticket);
    
    console.log(`✅ Cocina: Orden ${idOrden} FINALIZADA.`);
    return ticket.idTicket;
  }
}