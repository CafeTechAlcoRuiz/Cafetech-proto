import { Pool } from 'pg';
import { Order, OrderRepository } from '../domain/order.entity';
import dotenv from 'dotenv';

dotenv.config();

export class PostgresOrderRepo implements OrderRepository {
  private pool = new Pool({ connectionString: process.env.PG_CONNECTION });

  constructor() {
    // iniciar la verificación/creación de tabla de forma resiliente
    // (no bloqueante en el constructor)
    this.ensureConnectedAndInit().catch((err) => {
      console.error('⚠︎ ERROR: Postgres no disponible tras varios intentos:', err);
      // lanzar para que el proceso falle si lo deseas, o mantener en retry indefinido
      process.exit(1);
    });
  }

  private async inicializarTabla() {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS orders (
          id TEXT PRIMARY KEY,
          status TEXT,
          total NUMERIC,
          items JSONB 
        );
      `);
      console.log('✓✓ Tabla orders verificada en Postgres (con items)');
    } catch (err) {
      console.error('⚠︎ ERROR: Error inicializando tabla orders:', err);
    } finally {
      client.release();
    }
  }

  private async ensureConnectedAndInit() {
    const maxAttempts = Number(process.env.PG_CONNECT_RETRIES || 10);
    const baseDelayMs = Number(process.env.PG_CONNECT_DELAY_MS || 2000);

    const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const client = await this.pool.connect();
        client.release();
        console.log(`✓ Conectado a Postgres (intento ${attempt})`);
        await this.inicializarTabla();
        return;
      } catch (err) {
          // err tiene tipo desconocido; obtener mensaje de forma segura
          const errMessage = err && typeof (err as any).message === 'string' ? (err as any).message : String(err);
          console.error(`⚠︎ Intento ${attempt} - no se pudo conectar a Postgres:`, errMessage);
        if (attempt === maxAttempts) throw err;
        await delay(baseDelayMs * attempt);
      }
    }
  }

  async save(order: Order): Promise<void> {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO orders (id, status, total, items) 
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO UPDATE 
        SET status = EXCLUDED.status, items = EXCLUDED.items;
      `;
      
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