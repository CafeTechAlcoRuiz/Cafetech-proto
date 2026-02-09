import { Order, OrderRepository } from '../domain/order.entity';

export class ValidateOrderUseCase {
  constructor(private repo: OrderRepository) {}

  async execute(orderId: string, items: any[]): Promise<boolean> {
    // Simular cálculo de precio
    const total = items.length * 10; 
    const order = new Order(orderId, items, 'CREADA', total);
    
    const isValid = order.validar(); // Lógica de dominio

    if (isValid) {
      order.status = 'VALIDADA';
      await this.repo.save(order); // Persistencia
      console.log(`Business Logic: Orden ${orderId} validada.`);
    } else {
      console.log(`Business Logic: Orden ${orderId} rechazada.`);
    }

    return isValid;
  }
}