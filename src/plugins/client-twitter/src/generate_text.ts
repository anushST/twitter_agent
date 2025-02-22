import { openai } from "./openai.ts";

export async function generateTweet(prompt: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: "Ты — SMM-менеджер. Напиши короткий и интересный твит." },
        { role: "user", content: `Создай твит на основе: "${prompt}"` },
      ],
      max_tokens: 280,
    });

    return response.choices[0]?.message?.content || "Ошибка генерации твита";
  } catch (error) {
    console.error("Ошибка при генерации твита:", error);
    return "Ошибка генерации твита";
  }
}

export async function generateReply(tweet: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: "Ты — умный бот, который отвечает на твиты. Будь кратким и остроумным." },
        { role: "user", content: `Ответь на этот твит: "${tweet}"` },
      ],
      max_tokens: 200,
    });

    return response.choices[0]?.message?.content || "Ошибка генерации ответа";
  } catch (error) {
    console.error("Ошибка при генерации ответа:", error);
    return "Ошибка генерации ответа";
  }
}
