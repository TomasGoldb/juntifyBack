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

  async obtenerCoordenadasParticipantes(idPlan) {
    const { data, error } = await supabase
      .from('UbicacionParticipante')
      .select('latitud, longitud')
      .eq('idPlan', idPlan);
    return { data, error };
  }

  async buscarLugares(ideas, lat, lng) {
    // Simula búsqueda de lugares usando ideas y coordenadas (puedes mejorar con Google Places)
    // Aquí deberías llamar a la API real, pero para ejemplo:
    return [
      { place_id: '1', name: 'Lugar 1', rating: 4.5, vicinity: 'Calle 1' },
      { place_id: '2', name: 'Lugar 2', rating: 4.2, vicinity: 'Calle 2' },
      { place_id: '3', name: 'Lugar 3', rating: 4.0, vicinity: 'Calle 3' },
      { place_id: '4', name: 'Lugar 4', rating: 3.8, vicinity: 'Calle 4' }
    ];
  }
}