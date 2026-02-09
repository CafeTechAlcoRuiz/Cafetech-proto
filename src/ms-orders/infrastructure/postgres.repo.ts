import { Pool } from 'pg';
import { Order, OrderRepository } from '../domain/order.entity';
import dotenv from 'dotenv';

dotenv.config();

export class PostgresOrderRepo implements OrderRepository {
  private pool = new Pool({ connectionString: process.env.PG_CONNECTION });

  constructor() {
    this.inicializarTabla();
  }

  private async inicializarTabla() {
    const client = await this.pool.connect();
    try {
      // MODIFICACIÓN: Agregamos la columna 'items' de tipo JSONB
      await client.query(`
        CREATE TABLE IF NOT EXISTS orders (
          id TEXT PRIMARY KEY,
          status TEXT,
          total NUMERIC,
          items JSONB 
        );
      `);
      console.log('✅ Tabla orders verificada en Postgres (con items)');
    } catch (err) {
      console.error('❌ Error inicializando tabla orders:', err);
    } finally {
      client.release();
    }
  }

  async save(order: Order): Promise<void> {
    const client = await this.pool.connect();
    try {
      // MODIFICACIÓN: Guardamos también el array de items
      const query = `
        INSERT INTO orders (id, status, total, items) 
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO UPDATE 
        SET status = EXCLUDED.status, items = EXCLUDED.items;
      `;
      
      // Convertimos el array de objetos a JSON stringify para asegurar compatibilidad
      const values = [
        order.id, 
        order.status, 
        order.total, 
        JSON.stringify(order.items) 
      ];
      
      await client.query(query, values);
    } finally {
      client.release();
    }
  }
}