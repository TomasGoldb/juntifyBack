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
  
    const systemPrompt = `Eres un extractor de ideas clave. Tu única tarea es extraer ideas del texto y devolverlas en una lista simple.

REGLAS ESTRICTAS:
- Devuelve SOLO una lista de ideas, una por línea
- NO incluyas explicaciones, comentarios, notas o texto adicional
- NO uses frases como "Nota:", "La palabra", "es válida", etc.
- Cada idea debe ser de 1 a 4 palabras máximo
- NO agregues numeración, guiones o símbolos
- NO expliques por qué una idea es válida o no

FORMATO DE RESPUESTA:
idea1
idea2
idea3

Ejemplos de formato correcto:
restaurante italiano
museo de arte
cafetería
cine
parque`;

    const userPrompt = `Analiza el siguiente texto y extrae las ideas más relevantes que podrían servir para buscar lugares o actividades:

${text}`;
  
    try {
      const salida = await this.blintRepository.llamarModeloChat(systemPrompt, userPrompt);
  
      const ideas = salida
        .split("\n")
        .map(l => l.replace(/^[-*•\d.\s]+/, "").trim())
        .filter(l => {
          if (!l || l.length === 0) return false;
          
          const lowerL = l.toLowerCase();
          
          // Filtrar explicaciones y comentarios
          const exclusionPatterns = [
            /^nota:/i,
            /^la palabra/i,
            /^es válida/i,
            /^según las reglas/i,
            /^no es necesario/i,
            /^a menos que/i,
            /^mencione específicamente/i,
            /^aquí tienes/i,
            /^lista de/i,
            /^principales/i,
            /^ideas/i,
            /^sugerencias/i,
            /^ejemplos/i,
            /^formato/i,
            /^reglas/i,
            /^importante/i
          ];
          
          return !exclusionPatterns.some(pattern => pattern.test(lowerL));
        });
  
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
        if (foundPlaceIds.size >= 8) break;
  
        // Buscar primero en radio muy pequeño (200m) para lugares muy cercanos
        const paramsMuyCercanos = new URLSearchParams({
          key: GOOGLE_MAPS_API_KEY,
          location: `${lat},${lng}`,
          radius: "200", // Radio muy pequeño para lugares muy cercanos
          keyword: idea,
          language: "es",
          type: "establishment"
        });

        const urlMuyCercanos = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${paramsMuyCercanos.toString()}`;
        console.log(`🔍 Buscando muy cercanos: ${idea} (200m)`);
        
        const mapsResMuyCercanos = await axios.get(urlMuyCercanos);
        const resultsMuyCercanos = mapsResMuyCercanos.data?.results || [];

        // Agregar lugares muy cercanos primero
        for (const place of resultsMuyCercanos) {
          if (foundPlaceIds.size >= 8) break;
          if (place.place_id && !foundPlaceIds.has(place.place_id)) {
            foundPlaceIds.add(place.place_id);
            foundPlaces.push({
              place_id: place.place_id,
              name: place.name,
              rating: place.rating,
              vicinity: place.vicinity,
              types: place.types,
              distance: "muy cercano"
            });
          }
        }

        // Si no encontramos suficientes lugares muy cercanos, buscar en radio pequeño
        if (foundPlaceIds.size < 8) {
          const paramsCercanos = new URLSearchParams({
            key: GOOGLE_MAPS_API_KEY,
            location: `${lat},${lng}`,
            radius: "500", // Radio pequeño para lugares cercanos
            keyword: idea,
            language: "es",
            type: "establishment"
          });
  
          const urlCercanos = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${paramsCercanos.toString()}`;
          console.log(`🔍 Buscando cercanos: ${idea} (500m)`);
          
          const mapsResCercanos = await axios.get(urlCercanos);
          const resultsCercanos = mapsResCercanos.data?.results || [];
  
          // Agregar lugares cercanos
          for (const place of resultsCercanos) {
            if (foundPlaceIds.size >= 8) break;
            if (place.place_id && !foundPlaceIds.has(place.place_id)) {
              foundPlaceIds.add(place.place_id);
              foundPlaces.push({
                place_id: place.place_id,
                name: place.name,
                rating: place.rating,
                vicinity: place.vicinity,
                types: place.types,
                distance: "cercano"
              });
            }
          }
  
          // Si no encontramos suficientes lugares cercanos, buscar en radio mayor
          if (foundPlaceIds.size < 8) {
            const paramsLejanos = new URLSearchParams({
              key: GOOGLE_MAPS_API_KEY,
              location: `${lat},${lng}`,
              radius: "1500", // Radio mayor solo si es necesario
              keyword: idea,
              language: "es",
              type: "establishment"
            });
  
            const urlLejanos = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${paramsLejanos.toString()}`;
            console.log(`🔍 Buscando adicionales: ${idea} (1500m)`);
            
            const mapsResLejanos = await axios.get(urlLejanos);
            const resultsLejanos = mapsResLejanos.data?.results || [];
  
            for (const place of resultsLejanos) {
              if (foundPlaceIds.size >= 8) break;
              if (place.place_id && !foundPlaceIds.has(place.place_id)) {
                foundPlaceIds.add(place.place_id);
                foundPlaces.push({
                  place_id: place.place_id,
                  name: place.name,
                  rating: place.rating,
                  vicinity: place.vicinity,
                  types: place.types,
                  distance: "lejano"
                });
              }
            }
          }
        }
      }
  
      console.log(`✅ Encontrados ${foundPlaces.length} lugares únicos`);
      
      // Separar lugares por distancia
      const lugaresMuyCercanos = foundPlaces.filter(p => p.distance === "muy cercano");
      const lugaresCercanos = foundPlaces.filter(p => p.distance === "cercano");
      const lugaresLejanos = foundPlaces.filter(p => p.distance === "lejano");
      
      res.json({ 
        place_ids: Array.from(foundPlaceIds),
        places: foundPlaces,
        total_found: foundPlaces.length,
        muy_cercanos: lugaresMuyCercanos.length,
        cercanos: lugaresCercanos.length,
        lejanos: lugaresLejanos.length,
        search_radius: {
          muy_cercanos: "200m",
          cercanos: "500m",
          lejanos: "1500m"
        }
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