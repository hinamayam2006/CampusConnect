import express from 'express';
import {
  listRides,
  getRideById,
  createRide,
  updateRide,
  deleteRide,
  joinRide,
  leaveRide,
  hidePassengerRide,
  logRideSearch,
  getRideSuggestions,
  getMyRides,
  markRideCompleted,
} from '../controllers/rides.controller.js';
import protect, { optionalAuth } from '../middleware/auth.middleware.js';
import validate from '../middleware/validate.middleware.js';
import { createRideSchema, rideSearchLogSchema, updateRideSchema } from '../utils/validators.js';

const router = express.Router();

router.get('/', optionalAuth, listRides);
router.get('/mine', protect, getMyRides);
router.get('/matches/suggested', protect, getRideSuggestions);
router.post('/search-log', protect, validate(rideSearchLogSchema), logRideSearch);
router.get('/:id', optionalAuth, getRideById);
router.post('/', protect, validate(createRideSchema), createRide);
router.patch('/:id', protect, validate(updateRideSchema), updateRide);
router.delete('/:id', protect, deleteRide);
router.post('/:id/join', protect, joinRide);
router.post('/:id/leave', protect, leaveRide);
router.post('/:id/hide', protect, hidePassengerRide);
router.post('/:id/completed', protect, markRideCompleted);

export default router;
