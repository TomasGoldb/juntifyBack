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
  
    const prompt = `
  Extraé de forma concisa ideas concretas del siguiente texto, especialmente aquellas que sirvan para describir lugares gastronómicos. 
  Cada idea debe ser una etiqueta breve de 1 a 3 palabras máximo, sin explicaciones ni frases genéricas. 
  No incluyas frases como "posiblemente se refiera a..." o comentarios adicionales. 
  Devolvé solo una lista con una idea por línea. 
  Ejemplos: "pasta casera", "bar vegano", "comida mexicana", "ambiente familiar", "café de especialidad".
  
  Texto:
  ${text}
  `.trim();
  
    try {
      const salida = await this.blintRepository.llamarModeloChat(prompt);
  
      const ideas = salida
        .split("\n")
        .map(l => l.replace(/^[-*•\d.\s]+/, "").trim())
        .filter(l => l && !/^aquí tienes|lista de|principales/i.test(l));
  
      res.json({ ideas });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async findPlaces(req, res){
    const { ideas, lat, lng } = req.body;
  
    if (!GOOGLE_MAPS_API_KEY) {
      return res.status(500).json({ error: "GOOGLE_MAPS_API_KEY no configurada en variables de entorno." });
    }
    if (!ideas || !Array.isArray(ideas) || ideas.length === 0) {
      return res.status(400).json({ error: "Se requiere un array 'ideas' en el body." });
    }
    if (typeof lat !== "number" || typeof lng !== "number") {
      return res.status(400).json({ error: "Se requieren 'lat' y 'lng' numéricos en el body." });
    }
  
    try {
      const foundPlaceIds = new Set();
  
      for (const idea of ideas) {
        if (foundPlaceIds.size >= 5) break;
  
        const params = new URLSearchParams({
          key: GOOGLE_MAPS_API_KEY,
          location: `${lat},${lng}`,
          radius: "500",
          keyword: idea,
          language: "es",
        });
  
        const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params.toString()}`;
        const mapsRes = await axios.get(url);
        const results = mapsRes.data?.results || [];
  
        for (const place of results) {
          if (foundPlaceIds.size >= 5) break;
          if (place.place_id) foundPlaceIds.add(place.place_id);
        }
      }
  
      res.json({ place_ids: Array.from(foundPlaceIds) });
    } catch (err) {
      console.error("⚠️ Error al buscar lugares en Google Maps:", err?.response?.data || err.message || err);
      res.status(500).json({ error: "Error al buscar lugares en Google Maps." });
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