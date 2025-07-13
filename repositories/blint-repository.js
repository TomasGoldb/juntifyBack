import { InferenceClient } from '@huggingface/inference';
import dotenv from 'dotenv';
dotenv.config();
const HF_TOKEN = process.env.HF_TOKEN;
const client = new InferenceClient(HF_TOKEN);
export class BlintRepository {

    
async llamarModeloChat(systemPrompt, userPrompt) {
    try {
      const respuesta = await client.chatCompletion({
        provider: "together",
        model: "mistralai/Mixtral-8x7B-Instruct-v0.1",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 300,
      });
  
      return respuesta.choices?.[0]?.message?.content || '';
    } catch (err) {
      console.error("❌ Error al llamar Hugging Face:", err?.response?.data || err.message || err);
      throw new Error("Error al llamar al modelo");
    }
  }
}