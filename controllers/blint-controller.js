import express from 'express';
import { BlintService } from '../services/blint-service.js';

const router = express.Router();
const blintService = new BlintService();

router.post('/extract-ideas', (req, res) => blintService.extractIdeas(req, res));
router.post('/find-places', (req, res) => blintService.findPlaces(req, res));
router.get('/place-details', (req, res) => blintService.placeDetails(req, res));
router.post('/refresh-place', (req, res) => blintService.refreshPlace(req, res));
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Blint API funcionando correctamente',
    timestamp: new Date().toISOString(),
    env: {
      hasGoogleKey: !!process.env.GOOGLE_MAPS_API_KEY,
      hasHfToken: !!process.env.HF_TOKEN
    }
  });
});

export default router; 