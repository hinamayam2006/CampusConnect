import mongoose from 'mongoose';

/**
 * Append-only activity log for recommendations, dashboards, and cursor-based reads (ADMS-style streaming).
 */
const activityEventSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: [
        'marketplace_listing_create',
        'marketplace_listing_view',
        'marketplace_activity',
        'marketplace_search',
        'marketplace_interest',
        'marketplace_request_create',
        'marketplace_request_received',
        'marketplace_listing_completed',
        'lostnfound_request_create',
        'lostnfound_request_received',
        'borrow_request_create',
        'borrow_request_received',
        'borrow_item_borrowed',
        'borrow_item_returned',
        'lostnfound_item_resolved',
        'lostnfound_item_reopened',
        'lostnfound_item_closed',
        'ride_create',
        'ride_view',
        'ride_posted',
        'ride_search',
        'ride_join',
        'ride_request_create',
        'ride_request_received',
        'ride_confirmed',
        'ride_completed',
        'request_approved',
        'request_declined',
        'request_withdrawn',
        'request_closed',
        'chat_initialized',
        'message_sent',
        'rating_received',
        'note_uploaded',
        'note_downloaded',
        // Admin audit trail—append-only, never deleted
        'admin_user_suspended',
        'admin_user_unsuspended',
        'admin_role_changed',
        'admin_ticket_updated',
        'admin_content_deleted',
      ],
      required: true,
      index: true,
    },
    refModel: { type: String, enum: ['Listing', 'Ride', 'Request', 'Message', 'Note', 'User', 'Borrowing', 'LostnFound', 'Ticket'], default: undefined },
    refId: { type: mongoose.Schema.Types.ObjectId, default: null },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

activityEventSchema.index({ userId: 1, createdAt: -1 });
activityEventSchema.index({ type: 1, createdAt: -1 });

const ActivityEvent = mongoose.model('ActivityEvent', activityEventSchema);
export default ActivityEvent;
