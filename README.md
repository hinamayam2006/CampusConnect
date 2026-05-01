# CampusConnect

A comprehensive campus management platform that connects students, faculty, and administrators through a unified digital ecosystem. Built with modern web technologies to facilitate seamless collaboration, resource sharing, and campus life management.

##  Features

###  Student Services
- **Marketplace**: Buy, sell, and trade campus items with secure transactions
- **Ride Sharing**: Find and offer rides for campus commutes and trips
- **Lost & Found**: Report and recover lost items with community support
- **Notes & Papers**: Share and access academic resources and study materials
- **Borrowing System**: Lend and borrow items within the campus community
- **Tutoring Services**: Connect with tutors and offer academic assistance
- **Real-time Chat**: Instant messaging for campus communication

###  Analytics & Insights
- **Activity Tracking**: Monitor platform engagement and user interactions
- **Department Analytics**: Insights into department-specific activities
- **Content Analytics**: Track marketplace, tutoring, and borrowing trends
- **User Growth Metrics**: Monitor platform adoption and usage patterns

###  Admin Panel
- **Command Center**: Comprehensive dashboard with real-time analytics
- **User Management**: Advanced user administration with role-based access
- **User Suspension & Content Purge**: Nuclear options for platform moderation
- **Ticket Center**: Support ticket management with resolution workflows
- **Content Moderation**: Review and manage platform content
- **Audit Logging**: Complete activity tracking for compliance
- **Advanced Filtering**: Filter users, tickets, and activities by multiple criteria

###  Security & Performance
- **JWT Authentication**: Secure token-based authentication system
- **Role-Based Access Control**: Granular permissions for users, moderators, and admins
- **Rate Limiting**: Protection against abuse and DDoS attacks
- **Data Validation**: Comprehensive input validation with Zod schemas
- **File Upload Security**: Secure file handling with Cloudinary integration
- **SMTP-based Email Verification Flow**: Secure email verification with Nodemailer
- **Real-time Updates**: WebSocket integration for live features

##  Architecture

### Frontend (Next.js 16)
- **Framework**: Next.js 16 with App Router
- **UI Library**: React Bootstrap 5 with custom styling
- **State Management**: Zustand for data state + Context API for component tree logic
- **Real-time Communication**: Socket.IO client
- **Icons**: Lucide React for modern iconography
- **Notifications**: React Hot Toast for user feedback

### Backend (Node.js & Express)
- **Framework**: Express.js with ES modules
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT with bcrypt password hashing
- **File Storage**: Cloudinary for media management
- **Email Service**: Nodemailer for communications
- **Real-time**: Socket.IO for live features
- **Validation**: Zod for schema validation

### Database Schema
- **Users**: Authentication, profiles, roles, and preferences
- **Listings**: Marketplace items with categories and status tracking
- **Rides**: Carpooling with routes, schedules, and bookings
- **Notes**: Academic resources with sharing controls
- **Messages**: Real-time chat system
- **Tickets**: Support system with admin workflows
- **Activity Events**: Comprehensive audit logging
- **MongoDB Aggregation Pipelines**: Real-time admin insights with $facet, $group, and $lookup operations

##  Quick Start

### Prerequisites
- Node.js 18+ 
- MongoDB 6.0+
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/your-username/campusconnect.git
cd campusconnect
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment Setup**
Create a `.env` file in the `backend` directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/campusconnect

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key

# Cloudinary (for file uploads)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Email (Nodemailer)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

4. **Start MongoDB**
```bash
# Using MongoDB Community Server
mongod

# Or using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

5. **Seed the database** (optional)
```bash
npm run dev:backend
# In another terminal
npm --prefix backend run seed
```

6. **Start the development servers**
```bash
# Start both frontend and backend simultaneously
npm run dev

# Or start individually
npm run dev:frontend  # Frontend on http://localhost:3000
npm run dev:backend   # Backend on http://localhost:5000
```

##  Project Structure

```
campusconnect/
├── frontend/                 # Next.js frontend application
│   ├── app/                  # App Router pages
│   │   ├── admin/           # Admin panel routes
│   │   ├── marketplace/     # Marketplace features
│   │   ├── rides/           # Ride sharing
│   │   └── ...
│   ├── components/          # Reusable React components
│   │   ├── admin/          # Admin-specific components
│   │   ├── layout/         # Layout components
│   │   └── ...
│   ├── lib/                # Utility functions and API clients
│   ├── store/              # Zustand state management
│   └── public/             # Static assets
├── backend/                 # Node.js backend API
│   ├── src/
│   │   ├── controllers/    # Route handlers
│   │   ├── models/         # Mongoose models
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Express middleware
│   │   ├── services/       # Business logic
│   │   ├── utils/          # Helper functions
│   │   └── scripts/        # Database scripts
│   └── uploads/            # Local file uploads (temporary)
├── package.json             # Root package configuration
└── README.md               # This file
```

## 🔧 Development

### Available Scripts

```bash
# Development
npm run dev              # Start both frontend and backend
npm run dev:frontend     # Frontend only
npm run dev:backend      # Backend only

# Backend
npm --prefix backend start    # Production server
npm --prefix backend dev      # Development with nodemon
npm --prefix backend seed     # Seed database with sample data
npm --prefix backend lint     # Lint backend code

# Frontend
npm --prefix frontend dev     # Development server
npm --prefix frontend build   # Production build
npm --prefix frontend start   # Production server
npm --prefix frontend lint    # Lint frontend code
```

### API Documentation

#### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - User logout

#### Core Features
- `GET /api/marketplace` - Browse marketplace listings
- `POST /api/marketplace` - Create new listing
- `GET /api/rides` - Find available rides
- `POST /api/rides` - Offer a ride
- `GET /api/notes` - Access study materials
- `POST /api/notes` - Share notes

#### Admin Panel
- `GET /api/admin/analytics` - Platform analytics
- `GET /api/admin/users` - User management
- `PATCH /api/admin/users/:id/suspend` - Suspend user
- `GET /api/admin/tickets` - Support tickets
- `GET /api/admin/audit-log` - Activity logs

### Database Models

#### User Model
```javascript
{
  name: String,
  email: String,
  password: String, // Hashed
  department: String,
  year: Number,
  role: ['student', 'moderator', 'admin'],
  isSuspended: Boolean,
  profilePublic: Boolean,
  // ... additional fields
}
```

#### Listing Model
```javascript
{
  title: String,
  description: String,
  price: Number,
  category: String,
  condition: ['new', 'like-new', 'good', 'fair'],
  images: [String],
  status: ['active', 'reserved', 'sold'],
  owner: ObjectId,
  // ... additional fields
}
```

### User Roles & Permissions

| Role | Permissions |
| :--- | :--- |
| **Student** | Create listings, book rides, borrow items, report issues, access marketplace and notes. |
| **Moderator** | All student permissions + moderate content, manage lost & found, assist with tutoring. |
| **Admin** | All permissions + access to Command Center, suspend users, resolve tickets, view audit logs, manage platform analytics. |

##  State Management Architecture

### Hybrid State Management Approach
CampusConnect uses a sophisticated dual-state management strategy:

#### Zustand (Data State)
- **User Authentication**: Stores user object, tokens, and auth state
- **Global Data**: Marketplace items, rides, notifications, chat messages
- **Performance Optimized**: Prevents unnecessary re-renders across component tree
- **Persistent Storage**: Automatic localStorage persistence with hydration

#### Context API (Component Tree Logic)
- **UserRoleContext**: Role-based UI capabilities and permissions
- **SessionActivityGuard**: Global session validation and inactivity handling
- **AppShell**: Layout providers and Bootstrap integration
- **Toast Notifications**: Global toast system via React Hot Toast

### Why This Architecture?
- **Zustand**: Fast, lightweight data state without provider boilerplate
- **Context API**: Perfect for cross-cutting concerns like authentication guards
- **Separation of Concerns**: Data vs. UI logic clearly separated
- **Performance**: Minimal re-renders while maintaining global access

##  UI/UX Features

### Responsive Design
- Mobile-first approach with Bootstrap 5
- Adaptive layouts for tablets and desktops
- Touch-friendly interfaces for mobile devices

### Accessibility
- Semantic HTML5 structure
- ARIA labels and landmarks
- Keyboard navigation support
- Screen reader compatibility

### Performance
- Code splitting with Next.js
- Image optimization with Next.js Image component
- Lazy loading for heavy components
- Optimized bundle sizes

##  Security Features

### Authentication & Authorization
- JWT-based authentication with refresh tokens
- Role-based access control (RBAC)
- Secure password hashing with bcrypt
- Session management with automatic cleanup

### Data Protection
- Input validation and sanitization
- SQL injection prevention with Mongoose
- XSS protection with content security policy
- CSRF protection with same-site cookies

### Rate Limiting
- API endpoint rate limiting
- Login attempt throttling
- File upload restrictions
- Request size limitations

##  Real-time Features

### WebSocket Integration
- Live chat messaging
- Real-time notifications
- Instant ride booking updates
- Live marketplace status changes

### Notification System
- In-app notifications
- Email notifications for important events
- Push notification ready architecture
- Customizable notification preferences

##  Deployment

### Production Setup

1. **Environment Variables**
Set production environment variables in your hosting platform:
```env
NODE_ENV=production
MONGODB_URI=your-production-mongodb-uri
JWT_SECRET=your-production-jwt-secret
# ... other production variables
```

2. **Database Setup**
- Configure MongoDB Atlas or self-hosted MongoDB
- Set up proper indexes for performance
- Configure backup strategies

3. **Frontend Deployment**
```bash
cd frontend
npm run build
npm run start
```

4. **Backend Deployment**
```bash
cd backend
npm start
```

## 📈 Monitoring & Analytics

### Application Monitoring
- Error tracking and logging
- Performance metrics
- User behavior analytics
- System health monitoring

### Database Analytics
- Query performance optimization
- Index usage statistics
- Connection pool monitoring
- Data growth tracking

### Code Style
- Use ESLint and Prettier for code formatting
- Follow conventional commit messages
- Write meaningful commit messages
- Include tests for new features

## 📝 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.
