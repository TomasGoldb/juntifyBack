import express from 'express';
import { BlintService } from '../services/blint-service.js';

const router = express.Router();
const blintService = new BlintService();

router.post('/extract-ideas', (req, res) => blintService.extractIdeas(req, res));
router.post('/find-places', (req, res) => blintService.findPlaces(req, res));
router.post('/place-details', (req, res) => blintService.placeDetails(req, res));

export default router; 