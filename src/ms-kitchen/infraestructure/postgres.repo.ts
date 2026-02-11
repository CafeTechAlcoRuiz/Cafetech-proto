import { Pool } from 'pg';
import { ITicketRepository, TicketCocina } from '../domain/ticket.entity';
import dotenv from 'dotenv';

dotenv.config();

export class PostgresTicketRepo implements ITicketRepository {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.PG_CONNECTION,
    });
    this.inicializarTabla();
  }

  private async inicializarTabla() {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS tickets_cocina (
          id_ticket TEXT PRIMARY KEY,
          id_orden TEXT NOT NULL,
          hora_entrada TIMESTAMP,
          estado TEXT
        );
      `);
      console.log('✓✓ Tabla tickets_cocina verificada en Postgres');
    } catch (err) {
      console.error('⚠︎ Error creando tabla tickets ⚠︎:', err);
    } finally {
      client.release();
    }
  }

  async save(ticket: TicketCocina): Promise<void> {
    const client = await this.pool.connect();
    try {
      // Usamos UPSERT (Insert o Update si ya existe)
      const query = `
        INSERT INTO tickets_cocina (id_ticket, id_orden, hora_entrada, estado)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id_ticket) 
        DO UPDATE SET estado = EXCLUDED.estado;
      `;
      const values = [
        ticket.idTicket,
        ticket.idOrden,
        ticket.horaEntrada,
        ticket.estado
      ];
      await client.query(query, values);
    } finally {
      client.release();
    }
  }

  async findById(idTicket: string): Promise<TicketCocina | null> {
    const client = await this.pool.connect();
    try {
      const res = await client.query('SELECT * FROM tickets_cocina WHERE id_ticket = $1', [idTicket]);
      if (res.rows.length === 0) return null;
      
      // Usamos el método estático para reconstruir el objeto
      return TicketCocina.restaurar(res.rows[0]);
    } finally {
      client.release();
    }
  }
}