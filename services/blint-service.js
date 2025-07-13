import { BlintRepository } from '../repositories/blint-repository.js';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

export class BlintService {
  constructor() {
    this.blintRepository = new BlintRepository();
  }

  async extractIdeas (req, res) {
    const { text } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Se requiere un campo 'text' (string) en el body." });
    }
  
    const systemPrompt = `Eres un asistente experto en análisis de texto y extracción de ideas clave. Tu tarea es extraer ideas concretas y específicas del texto proporcionado.

REGLAS IMPORTANTES:
- Extrae ideas que puedan servir para buscar lugares, actividades, servicios o experiencias
- Cada idea debe ser una etiqueta breve de 1 a 4 palabras máximo
- No incluyas explicaciones, comentarios o frases genéricas
- No uses frases como "posiblemente", "tal vez", "podría ser"
- Devuelve SOLO la lista de ideas, una por línea
- Las ideas pueden ser de cualquier tipo: gastronomía, entretenimiento, cultura, deportes, etc.

Ejemplos de ideas válidas:
- "restaurante italiano"
- "museo de arte"
- "parque temático"
- "teatro independiente"
- "café de especialidad"
- "club nocturno"
- "gimnasio 24h"
- "biblioteca pública"`;

    const userPrompt = `Analiza el siguiente texto y extrae las ideas más relevantes que podrían servir para buscar lugares o actividades:

${text}`;
  
    try {
      const salida = await this.blintRepository.llamarModeloChat(systemPrompt, userPrompt);
  
      const ideas = salida
        .split("\n")
        .map(l => l.replace(/^[-*•\d.\s]+/, "").trim())
        .filter(l => l && l.length > 0 && !/^aquí tienes|lista de|principales|ideas|sugerencias/i.test(l.toLowerCase()));
  
      res.json({ ideas });
    } catch (err) {
      console.error("❌ Error en extractIdeas:", err);
      res.status(500).json({ error: err.message });
    }
  }

  async findPlaces(req, res){
    const { ideas, lat, lng } = req.body;
  
    if (!GOOGLE_MAPS_API_KEY) {
      console.error("❌ GOOGLE_MAPS_API_KEY no configurada");
      return res.status(500).json({ 
        error: "GOOGLE_MAPS_API_KEY no configurada en variables de entorno.",
        details: "Configura la variable de entorno GOOGLE_MAPS_API_KEY en Railway"
      });
    }
    if (!ideas || !Array.isArray(ideas) || ideas.length === 0) {
      return res.status(400).json({ error: "Se requiere un array 'ideas' en el body." });
    }
    if (typeof lat !== "number" || typeof lng !== "number") {
      return res.status(400).json({ error: "Se requieren 'lat' y 'lng' numéricos en el body." });
    }
  
    try {
      const foundPlaceIds = new Set();
      const foundPlaces = [];
  
      for (const idea of ideas) {
        if (foundPlaceIds.size >= 8) break; // Aumentamos el límite
  
        const params = new URLSearchParams({
          key: GOOGLE_MAPS_API_KEY,
          location: `${lat},${lng}`,
          radius: "2000", // Aumentamos el radio para más opciones
          keyword: idea,
          language: "es",
          type: "establishment" // Buscar establecimientos
        });
  
        const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params.toString()}`;
        console.log(`🔍 Buscando: ${idea}`);
        
        const mapsRes = await axios.get(url);
        const results = mapsRes.data?.results || [];
  
        for (const place of results) {
          if (foundPlaceIds.size >= 8) break;
          if (place.place_id && !foundPlaceIds.has(place.place_id)) {
            foundPlaceIds.add(place.place_id);
            foundPlaces.push({
              place_id: place.place_id,
              name: place.name,
              rating: place.rating,
              vicinity: place.vicinity,
              types: place.types
            });
          }
        }
      }
  
      console.log(`✅ Encontrados ${foundPlaces.length} lugares únicos`);
      res.json({ 
        place_ids: Array.from(foundPlaceIds),
        places: foundPlaces,
        total_found: foundPlaces.length
      });
    } catch (err) {
      console.error("⚠️ Error al buscar lugares en Google Maps:", err?.response?.data || err.message || err);
      res.status(500).json({ 
        error: "Error al buscar lugares en Google Maps.",
        details: err.message 
      });
    }
  }
  
  // --- ENDPOINT 3: Obtener detalles de un lugar ---
  async placeDetails (req, res){
    const { place_id } = req.query;
    const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
    if (!place_id) return res.status(400).json({ error: "Falta place_id" });
    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=name,rating,photos,formatted_address,url&language=es&key=${GOOGLE_API_KEY}`;
      const response = await axios.get(url);
      res.json(response.data.result);
    } catch (err) {
      res.status(500).json({ error: "Error al consultar Google Places" });
    }
  }
  

} 