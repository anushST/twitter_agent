import "reflect-metadata";
import { DataSource } from "typeorm";
import { Post } from "./entities/table.ts";

export const AppDataSource = new DataSource({
    type: "postgres",
    host: "localhost",   // Хост базы данных
    port: 5400,          // Порт PostgreSQL
    username: "postgres",    // Имя пользователя
    password: "postgres",// Пароль
    database: "agent",    // Имя базы данных
    synchronize: true,   // Автоматически создавать таблицы (только для разработки!)
    logging: false,
    entities: [Post],    // Указываем модели
});
