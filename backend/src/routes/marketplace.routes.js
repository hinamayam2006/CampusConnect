import express from 'express';
import {
  listListings,
  getListingById,
  createListing,
  updateListing,
  deleteListing,
  expressInterest,
  logMarketplaceSearch,
  getMarketplaceRecommendations,
  getMyListings,
  markListingCompleted,
} from '../controllers/marketplace.controller.js';
import protect, { optionalAuth } from '../middleware/auth.middleware.js';
import validate from '../middleware/validate.middleware.js';
import {
  createListingSchema,
  updateListingSchema,
  marketplaceSearchLogSchema,
} from '../utils/validators.js';

const router = express.Router();

router.get('/listings', optionalAuth, listListings);
router.get('/listings/mine', protect, getMyListings);
router.get('/recommendations', protect, getMarketplaceRecommendations);
router.get('/listings/:id', optionalAuth, getListingById);
router.post('/listings', protect, validate(createListingSchema), createListing);
router.patch('/listings/:id', protect, validate(updateListingSchema), updateListing);
router.delete('/listings/:id', protect, deleteListing);
router.post('/listings/:id/interest', protect, expressInterest);
router.post('/listings/:id/completed', protect, markListingCompleted);
router.post('/search-log', protect, validate(marketplaceSearchLogSchema), logMarketplaceSearch);

export default router;
