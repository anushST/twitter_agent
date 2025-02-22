import fs from "fs";
import path from "path";

const logDir = "logs";
const logFile = path.join(logDir, "app.log");

// Создаём папку logs, если её нет
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Функция записи лога в файл
function logToFile(level: string, message: string) {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} [${level.toUpperCase()}]: ${message}\n`;
  
  // Вывод в консоль
  console.log(logMessage.trim());
  
  // Запись в файл
  fs.appendFileSync(logFile, logMessage);
}

// Логгер с разными уровнями логов
export const logger = {
  info: (msg: string) => logToFile("info", msg),
  warn: (msg: string) => logToFile("warn", msg),
  error: (msg: string) => logToFile("error", msg)
};
