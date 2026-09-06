import "reflect-metadata";
import dotenv from "dotenv";
import { createApp } from "./app";
import { AppDataSource } from "./database/data-source";

dotenv.config();

const PORT = process.env.PORT || 3000;

async function bootstrap(): Promise<void> {
  try {
    await AppDataSource.initialize();
    console.log("Conexão com o banco de dados PostgreSQL estabelecida.");

    const app = createApp();

    app.listen(PORT, () => {
      console.log(`MedClinic API rodando em http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Erro ao iniciar a aplicação:", error);
    process.exit(1);
  }
}

bootstrap();
