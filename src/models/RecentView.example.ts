// MongoDB Schema for Recent Views
// Place this in your models directory when ready to implement

/*
Example Mongoose Schema:

import mongoose from 'mongoose';

const recentViewSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  views: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    viewedAt: {
      type: Date,
      default: Date.now
    }
  }],
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient queries
recentViewSchema.index({ userId: 1, 'views.viewedAt': -1 });

// Limit to 20 most recent views per user
recentViewSchema.pre('save', function(next) {
  if (this.views.length > 20) {
    this.views = this.views.slice(-20);
  }
  next();
});

export const RecentView = mongoose.models.RecentView || 
  mongoose.model('RecentView', recentViewSchema);
*/

/*
Example SQL Schema (PostgreSQL/MySQL):

CREATE TABLE recent_views (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  product_id VARCHAR(255) NOT NULL,
  viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_user_id (user_id),
  INDEX idx_viewed_at (viewed_at DESC),
  UNIQUE KEY unique_user_product (user_id, product_id)
);

-- Or with a JSON column for flexibility:

CREATE TABLE user_activity (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL UNIQUE,
  recent_views JSON,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_user_id (user_id)
);
*/

// Example activity tracking events to store:
export const ActivityTypes = {
  PRODUCT_VIEW: 'product_view',
  ADD_TO_CART: 'add_to_cart',
  REMOVE_FROM_CART: 'remove_from_cart',
  PURCHASE: 'purchase',
  SEARCH: 'search',
  WISHLIST_ADD: 'wishlist_add',
  REVIEW_SUBMIT: 'review_submit'
} as const;

// Example activity log entry structure:
export interface UserActivity {
  userId: string;
  activityType: typeof ActivityTypes[keyof typeof ActivityTypes];
  productId?: string;
  metadata?: {
    searchQuery?: string;
    quantity?: number;
    price?: number;
    [key: string]: any;
  };
  timestamp: Date;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
}

// Example Analytics Schema for comprehensive tracking:
/*
CREATE TABLE user_activities (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255),
  session_id VARCHAR(255),
  activity_type VARCHAR(50) NOT NULL,
  product_id VARCHAR(255),
  metadata JSON,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_user_id (user_id),
  INDEX idx_activity_type (activity_type),
  INDEX idx_created_at (created_at DESC),
  INDEX idx_product_id (product_id)
);
*/
