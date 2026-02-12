import { Order, OrderRepository } from '../domain/order.entity';

export class ValidateOrderUseCase {
  constructor(private repo: OrderRepository) {}

  async execute(orderId: string, items: any[]): Promise<boolean> {
    const tieneStock = !items.some((i: any) => i.product === 'sin_stock');
    // Simular cálculo de precio
    const total = items.length * 10; 
    const order = new Order(orderId, items, 'CREADA', total);
    
    const isValid = order.validar() && tieneStock; // Lógica de dominio

    if (isValid) {
      order.status = 'VALIDADA';
      await this.repo.save(order);
      console.log(`🔍︎.✦ Revisando stock: Orden VALIDADA.`);
    } else {
      order.status = 'RECHAZADA';
      await this.repo.save(order);
      console.log('🔍︎.✦ Revisando stock: Orden RECHAZADA (Sin Stock).');
    }

    return isValid;
  }
}