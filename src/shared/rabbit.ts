import amqp from "amqplib";
import type { Connection, Channel } from "amqplib";

export class RabbitMQClient {
  private static instance: RabbitMQClient;
  private connection!: Connection;
  private channel!: Channel;

  private constructor() {}

  public static getInstance(): RabbitMQClient {
    if (!RabbitMQClient.instance) {
      RabbitMQClient.instance = new RabbitMQClient();
    }
    return RabbitMQClient.instance;
  }

  async connect(url: string): Promise<void> {
    try {
      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createChannel();

      await this.channel.assertQueue("incoming_orders", {
        durable: true,
      });

      console.log("CONEXIÓN EXITOSA A BROKER: Conectado a RabbitMQ exitosamente");
    } catch (error) {
      console.error("Error conectando a RabbitMQ:", error);
      throw error;
    }
  }

  async publish(queue: string, message: unknown): Promise<void> {
    if (!this.channel) {
      throw new Error("Canal no inicializado. Llama a connect() primero.");
    }

    this.channel.sendToQueue(
      queue,
      Buffer.from(JSON.stringify(message)),
      { persistent: true }
    );
  }

  async consume(
    queue: string,
    callback: (msg: any) => Promise<void>
  ): Promise<void> {
    if (!this.channel) {
      throw new Error("Canal no inicializado.");
    }

    await this.channel.consume(queue, async (msg) => {
      if (!msg) return;

      try {
        const content = JSON.parse(msg.content.toString());
        await callback(content);
        this.channel.ack(msg);
      } catch (err) {
        console.error("¡ERROR!: Error procesando mensaje:", err);
        this.channel.nack(msg, false, false); // DLQ friendly
      }
    });
  }
}
