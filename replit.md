# LanChat - Replit Configuration

## Overview

LanChat is a language learning social mobile application built with Expo/React Native and Express. The app connects language learners with native speakers through a community-based chat platform. Users can discover language partners, engage in real-time messaging, and build profiles showcasing their native and learning languages.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: Expo SDK 54 with React Native 0.81
- **Navigation**: React Navigation v7 with native stack and bottom tabs
- **State Management**: TanStack React Query for server state, React Context for auth state
- **UI Components**: Custom themed components (ThemedText, ThemedView, Button, Card) with Reanimated animations
- **Styling**: Platform-aware design with blur effects on iOS, adaptive theming for light/dark modes
- **Path Aliases**: `@/` maps to `client/`, `@shared/` maps to `shared/`

### Backend Architecture
- **Runtime**: Node.js with Express
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT-based with scrypt password hashing (custom implementation, not a third-party auth provider)
- **File Storage**: Google Cloud Storage integration for user photos
- **API Pattern**: RESTful endpoints under `/api/` prefix

### Database Schema
Located in `shared/schema.ts`:
- **users**: Profile data including languages, photos, online status
- **messages**: Chat messages between users with reporting capability
- **blockedUsers**: User blocking relationships
- **reports**: Content and user reporting system

### Authentication Flow
1. Email/password registration creates user and returns JWT
2. Token stored in AsyncStorage on client
3. AuthContext manages session state and token refresh
4. Protected routes require Bearer token in Authorization header

### Key Screens
- **AuthScreen**: Login/registration with email and password
- **OnboardingScreen**: Language selection after registration
- **CommunityScreen**: User discovery with filtering
- **ChatsScreen**: Conversation list
- **ChatScreen**: Real-time messaging with translation support
- **ProfileScreen/EditProfileScreen**: User profile management

## External Dependencies

### Database
- PostgreSQL via `DATABASE_URL` environment variable
- Drizzle ORM for type-safe queries and migrations
- Migrations stored in `/migrations` directory

### Cloud Storage
- Google Cloud Storage for user photo uploads
- Replit sidecar endpoint at `http://127.0.0.1:1106` for credential management
- Object ACL system for access control

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: JWT signing secret (defaults to development value)
- `EXPO_PUBLIC_DOMAIN`: API domain for client requests
- `REPLIT_DEV_DOMAIN`: Development domain for CORS
- `PUBLIC_OBJECT_SEARCH_PATHS`: Optional paths for public file access

### NPM Scripts
- `npm run expo:dev`: Start Expo development server
- `npm run server:dev`: Start Express backend in development
- `npm run all:dev`: Run both Expo and server concurrently
- `npm run db:push`: Push schema changes to database

## Web Deployment

### Static Build for Production
The app supports direct browser access without requiring Expo Go:
- **Build Script**: `scripts/build.js` generates static bundles for iOS, Android, and Web platforms
- **Web Bundle**: Stored in `static-build/web/` with auto-generated `index.html`
- **SPA Routing**: Server serves web index.html for all non-API routes (SPA history fallback)

### Server Routing
- Browser requests without `expo-platform` header receive the web SPA
- Expo Go requests with `expo-platform: ios/android` receive platform-specific manifests
- API routes (`/api/*`) and WebSocket routes (`/ws/*`) bypass static file serving

### Deployment URL
- Production: `https://lan-chat.replit.app` (direct browser access)