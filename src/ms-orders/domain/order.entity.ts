export class Order {
  constructor(
    public readonly id: string,
    public readonly items: any[],
    public status: 'CREADA' | 'VALIDADA' | 'RECHAZADA',
    public total: number
  ) {}

  public validar(): boolean {
    // Lógica de dominio puro: Validar reglas de negocio
    return this.items.length > 0 && this.total > 0;
  }
}

export interface OrderRepository {
  save(order: Order): Promise<void>;
}