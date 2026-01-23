# Technical Documentation

This document provides detailed technical information about the Generative Imagining platform architecture, API specifications, and implementation details.

## Table of Contents

- [System Architecture](#system-architecture)
- [Backend Architecture](#backend-architecture)
- [Frontend Architecture](#frontend-architecture)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Authentication & Authorization](#authentication--authorization)
- [Content Moderation System](#content-moderation-system)
- [Rate Limiting](#rate-limiting)
- [Deployment](#deployment)
- [Development Guide](#development-guide)

---

## System Architecture

### High-Level Overview

```
┌─────────────┐      HTTP/REST      ┌──────────────┐
│             │ ←──────────────────→ │              │
│  Next.js    │                      │   FastAPI    │
│  Frontend   │                      │   Backend    │
│             │ ←──────────────────→ │              │
└─────────────┘                      └──────┬───────┘
                                            │
                                            │
                          ┌─────────────────┼─────────────────┐
                          │                 │                 │
                          ▼                 ▼                 ▼
                    ┌──────────┐    ┌────────────┐    ┌──────────┐
                    │          │    │  Google    │    │   File   │
                    │ MongoDB  │    │  Gemini    │    │  System  │
                    │          │    │  2.5 Flash │    │          │
                    └──────────┘    └────────────┘    └──────────┘
```

### Technology Stack

#### Backend

- **Runtime**: Python 3.9+
- **Framework**: FastAPI 0.115.6
- **Database**: MongoDB with Motor (async driver)
- **AI Service**: Google Generative AI (Gemini 2.5 Flash)
- **Image Processing**: Pillow (PIL)
- **CORS**: Middleware for cross-origin requests

#### Frontend

- **Framework**: Next.js 16.0.1 (App Router)
- **Language**: TypeScript 5
- **UI Library**: React 19.0.0
- **Styling**: Tailwind CSS 4.0.0
- **HTTP Client**: Axios 1.7.9
- **Icons**: Lucide React

#### Infrastructure

- **Containerization**: Docker & Docker Compose
- **Image Storage**: Local filesystem
- **Database**: MongoDB 5.0+

---

## Backend Architecture

### Project Structure

```
backend/
├── main.py                 # Application entry point
├── requirements.txt        # Python dependencies
├── Dockerfile             # Container configuration
└── data/
    └── images/            # Generated images storage
```

### Core Components

#### FastAPI Application (`main.py`)

The application is structured as a monolithic FastAPI service with the following key sections:

1. **Configuration & Setup**
   - Environment variable loading
   - MongoDB connection setup
   - Google Gemini AI client initialization
   - CORS middleware configuration

2. **Models** (Pydantic schemas)
   - Request/Response validation
   - Data serialization
   - Type safety

3. **API Routes**
   - User management
   - Image operations
   - AI assistance
   - Admin functions
   - Password management

4. **Business Logic**
   - Image generation pipeline
   - Content moderation
   - Rate limiting
   - Usage tracking

### Key Technologies & Libraries

```python
fastapi==0.115.6           # Web framework
motor==3.6.0               # Async MongoDB driver
google-generativeai==0.8.3 # Gemini AI SDK
pillow==11.0.0            # Image processing
python-dotenv==1.0.1      # Environment management
```

### AI Integration

#### Gemini 2.5 Flash Configuration

```python
model_config = {
    "model": "gemini-2.0-flash-exp",
    "temperature": 1.0,
    "top_p": 0.95,
    "top_k": 40,
    "max_output_tokens": 8192,
}
```

#### Image Generation Flow

```
User Prompt
    ↓
[Content Moderation Check]
    ↓ (if approved)
[Rate Limit Check]
    ↓
[Gemini API Call]
    ↓
[Image Data Processing]
    ↓
[Save to Filesystem]
    ↓
[Save Metadata to MongoDB]
    ↓
Return Image ID & URL
```

#### Content Safety Settings

```python
safety_settings = {
    "HARM_CATEGORY_HATE_SPEECH": "BLOCK_NONE",
    "HARM_CATEGORY_HARASSMENT": "BLOCK_NONE",
    "HARM_CATEGORY_SEXUALLY_EXPLICIT": "BLOCK_NONE",
    "HARM_CATEGORY_DANGEROUS_CONTENT": "BLOCK_NONE",
}
```

Note: Custom content moderation is implemented separately to ensure age-appropriate content.

---

## Frontend Architecture

### Project Structure

```
frontend/src/
├── app/
│   ├── layout.tsx          # Root layout with providers
│   ├── page.tsx            # Home/landing page
│   ├── globals.css         # Global styles
│   ├── create/             # Image creation view
│   ├── edit/               # Image editing view
│   ├── gallery/            # Gallery view
│   ├── admin/              # Admin panel
│   └── shared/[imageId]/   # Public image sharing
├── components/
│   ├── CreateImagePage.tsx     # Create UI logic
│   ├── EditImagePage.tsx       # Edit UI logic
│   ├── GalleryPage.tsx         # Gallery UI logic
│   ├── AdminPage.tsx           # Admin dashboard
│   ├── Navigation.tsx          # Navigation bar
│   ├── PasswordDialog.tsx      # Password input
│   └── RootLayoutContent.tsx   # Layout wrapper
├── contexts/
│   ├── UserContext.tsx         # User state management
│   ├── PasswordContext.tsx     # Password state
│   └── LocaleContext.tsx       # Language switching
└── utils/
    └── api.ts                  # API client functions
```

### State Management

#### Context Providers

1. **UserContext** - GUID management, user identification
2. **PasswordContext** - Password validation, usage limits
3. **LocaleContext** - Language selection (fi/en)

#### Context Hierarchy

```tsx
<RootLayout>
  <UserProvider>
    <PasswordProvider>
      <LocaleProvider>{children}</LocaleProvider>
    </PasswordProvider>
  </UserProvider>
</RootLayout>
```

### Component Architecture

Components follow a functional pattern with hooks:

- `useState` for local state
- `useContext` for global state
- `useEffect` for side effects
- `useRouter` for navigation

### API Client (`api.ts`)

Centralized Axios instance with:

- Base URL configuration
- Request/response interceptors
- Error handling
- Type-safe API methods

```typescript
// Example API function
export const generateImage = async (guid: string, password: string, prompt: string, locale: string): Promise<GenerateImageResponse> => {
  const response = await api.post("/generate", {
    guid,
    password,
    prompt,
    locale,
  });
  return response.data;
};
```

---

## Database Schema

### Collections

#### 1. `users`

Tracks anonymous user sessions.

```javascript
{
  "_id": ObjectId,
  "guid": String,           // UUID v4
  "created_at": DateTime,   // ISO 8601
  "last_seen": DateTime     // ISO 8601
}
```

**Indexes:**

- `guid` (unique)

#### 2. `images`

Stores image metadata and relationships.

```javascript
{
  "_id": ObjectId,
  "image_id": String,           // UUID v4
  "user_guid": String,          // Reference to users.guid
  "filename": String,           // e.g., "abc123.png"
  "filepath": String,           // Full path
  "prompt": String,             // Generation prompt
  "original_prompt": String,    // For edits: original image prompt
  "description": String,        // AI-generated description
  "created_at": DateTime,       // ISO 8601
  "locale": String,             // "en" or "fi"
  "is_edit": Boolean,           // true if edited image
  "original_image_id": String   // For edits: source image
}
```

**Indexes:**

- `image_id` (unique)
- `user_guid`
- `created_at` (descending)

#### 3. `passwords`

Admin-managed access control.

```javascript
{
  "_id": ObjectId,
  "password": String,             // Plain text (educational use)
  "image_limit": Number,          // Max images per password
  "suggestion_limit": Number,     // Max AI suggestions
  "expires_at": DateTime,         // ISO 8601
  "created_at": DateTime,         // ISO 8601
  "bypass_watchdog": Boolean,     // Skip content moderation
  "created_by": String            // Admin identifier
}
```

**Indexes:**

- `password` (unique)
- `expires_at`

#### 4. `password_usage`

Tracks usage per GUID+password combination.

```javascript
{
  "_id": ObjectId,
  "guid": String,                  // User GUID
  "password": String,              // Password used
  "images_generated": Number,      // Count
  "suggestions_used": Number,      // Count
  "first_used": DateTime,          // ISO 8601
  "last_used": DateTime            // ISO 8601
}
```

**Indexes:**

- `{guid, password}` (compound, unique)

#### 5. `rejected_prompts`

Content moderation audit log.

```javascript
{
  "_id": ObjectId,
  "guid": String,               // User GUID
  "prompt": String,             // Rejected prompt text
  "reason": String,             // Rejection explanation
  "timestamp": DateTime,        // ISO 8601
  "locale": String              // "en" or "fi"
}
```

**Indexes:**

- `guid`
- `timestamp` (descending)

#### 6. `moderation_guidelines`

Configurable content policies.

```javascript
{
  "_id": ObjectId,
  "guidelines": String,    // Full moderation policy text
  "updated_at": DateTime,  // ISO 8601
  "updated_by": String     // Admin identifier
}
```

Single document collection (guidelines singleton).

---

## API Reference

### Base URL

- **Development**: `http://localhost:8000`
- **Production**: Configure via environment variable

### Authentication

- **User Operations**: Require `guid` and `password` in request body
- **Admin Operations**: Require `password` matching `ADMIN_PASSWORD` env var

### Endpoints

#### User Management

##### `POST /identify`

Identify or create anonymous user.

**Request:**

```json
{
  "guid": "optional-existing-guid"
}
```

**Response:**

```json
{
  "guid": "550e8400-e29b-41d4-a716-446655440000",
  "created_at": "2026-01-23T10:30:00Z"
}
```

---

#### Image Operations

##### `POST /generate`

Generate a new image from text prompt.

**Request:**

```json
{
  "guid": "550e8400-e29b-41d4-a716-446655440000",
  "password": "student2026",
  "prompt": "A serene mountain landscape at sunset",
  "locale": "en"
}
```

**Response:**

```json
{
  "image_id": "abc123...",
  "image_url": "http://localhost:8000/images/abc123.png",
  "description": "A beautiful mountain scene with...",
  "prompt": "A serene mountain landscape at sunset"
}
```

**Error Responses:**

- `403` - Password invalid, expired, or limit reached
- `400` - Content moderation rejection
- `429` - Rate limit exceeded
- `500` - Generation failed

##### `POST /edit`

Edit an existing image with AI.

**Request:**

```json
{
  "guid": "550e8400-e29b-41d4-a716-446655440000",
  "password": "student2026",
  "image_id": "abc123...",
  "edit_prompt": "Add a rainbow in the sky",
  "locale": "en"
}
```

**Response:**

```json
{
  "image_id": "def456...",
  "image_url": "http://localhost:8000/images/def456.png",
  "description": "The mountain landscape now features...",
  "prompt": "A serene mountain landscape at sunset + Add a rainbow in the sky"
}
```

##### `GET /gallery`

Retrieve user's image gallery.

**Query Parameters:**

- `guid` (required)
- `password` (required)

**Response:**

```json
{
  "images": [
    {
      "image_id": "abc123...",
      "image_url": "http://localhost:8000/images/abc123.png",
      "description": "A serene mountain landscape...",
      "prompt": "A serene mountain landscape at sunset",
      "created_at": "2026-01-23T10:30:00Z",
      "is_edit": false
    }
  ],
  "total": 1
}
```

##### `GET /images/{image_id}`

Get specific image details (public endpoint for sharing).

**Response:**

```json
{
  "image_id": "abc123...",
  "image_url": "http://localhost:8000/images/abc123.png",
  "description": "A serene mountain landscape...",
  "prompt": "A serene mountain landscape at sunset",
  "created_at": "2026-01-23T10:30:00Z"
}
```

##### `DELETE /images/{image_id}`

Delete an image.

**Request Body:**

```json
{
  "guid": "550e8400-e29b-41d4-a716-446655440000",
  "password": "student2026"
}
```

**Response:**

```json
{
  "message": "Image deleted successfully"
}
```

---

#### AI Assistance

##### `POST /suggest-prompts`

Get AI-powered prompt suggestions.

**Request:**

```json
{
  "guid": "550e8400-e29b-41d4-a716-446655440000",
  "password": "student2026",
  "base_idea": "nature", // optional
  "locale": "en"
}
```

**Response:**

```json
{
  "suggestions": ["A mystical forest with glowing mushrooms", "Ocean waves crashing against rocky cliffs", "Desert oasis with palm trees at dawn"]
}
```

##### `POST /suggest-edits`

Get AI suggestions for editing an image.

**Request:**

```json
{
  "guid": "550e8400-e29b-41d4-a716-446655440000",
  "password": "student2026",
  "image_id": "abc123...",
  "locale": "en"
}
```

**Response:**

```json
{
  "suggestions": ["Add a flock of birds flying across the sky", "Change the time of day to nighttime with stars", "Include a small cabin in the foreground"],
  "description": "Current image shows: A serene mountain landscape..."
}
```

---

#### Password Management

##### `POST /passwords`

Create a new access password (admin only).

**Request:**

```json
{
  "admin_password": "admin_secret",
  "password": "student2026",
  "image_limit": 10,
  "suggestion_limit": 20,
  "expires_at": "2026-12-31T23:59:59Z",
  "bypass_watchdog": false
}
```

**Response:**

```json
{
  "message": "Password created successfully",
  "password": "student2026"
}
```

##### `GET /passwords`

List all passwords (admin only).

**Query Parameters:**

- `admin_password` (required)

**Response:**

```json
{
  "passwords": [
    {
      "password": "student2026",
      "image_limit": 10,
      "suggestion_limit": 20,
      "expires_at": "2026-12-31T23:59:59Z",
      "bypass_watchdog": false,
      "created_at": "2026-01-15T10:00:00Z"
    }
  ]
}
```

##### `DELETE /passwords/{password}`

Delete a password (admin only).

**Request Body:**

```json
{
  "admin_password": "admin_secret"
}
```

---

#### Admin Functions

##### `GET /admin/stats`

Get platform statistics.

**Query Parameters:**

- `admin_password` (required)

**Response:**

```json
{
  "total_users": 145,
  "total_images": 892,
  "total_passwords": 12,
  "active_passwords": 8,
  "images_today": 67,
  "rejected_prompts_today": 3
}
```

##### `GET /admin/moderation`

Get current moderation guidelines.

**Query Parameters:**

- `admin_password` (required)

**Response:**

```json
{
  "guidelines": "Content must be appropriate for ages 12-15..."
}
```

##### `POST /admin/moderation`

Update moderation guidelines.

**Request:**

```json
{
  "admin_password": "admin_secret",
  "guidelines": "New guidelines text..."
}
```

##### `GET /admin/images`

Get all images (admin only).

**Query Parameters:**

- `admin_password` (required)
- `limit` (optional, default: 50)
- `skip` (optional, default: 0)

**Response:**

```json
{
  "images": [...],
  "total": 892
}
```

---

## Authentication & Authorization

### User Identification

#### GUID System

- Users receive a UUID v4 on first visit
- GUID stored in browser cookies
- No personal information collected
- Cookie name: `user_guid`
- Cookie lifetime: 1 year

#### Flow Diagram

```
First Visit:
Browser → [No GUID Cookie] → POST /identify → Server generates UUID
                                             → Store in MongoDB
                                             → Return to client
                                             → Store in cookie

Returning Visit:
Browser → [Has GUID Cookie] → Include in requests → Server validates
                                                   → Check MongoDB
                                                   → Process request
```

### Password-Based Access Control

#### Password Features

- Time-limited validity
- Image generation limits
- AI suggestion limits
- Optional moderation bypass
- Admin-managed lifecycle

#### Validation Flow

```python
async def validate_password(guid: str, password: str, operation: str):
    # 1. Check password exists in database
    # 2. Verify not expired
    # 3. Get or create usage record for guid+password
    # 4. Check operation-specific limits
    # 5. Return validation result + bypass_watchdog flag
```

### Admin Authentication

Simple password-based authentication:

- Single admin password via environment variable
- No sessions or tokens
- Password sent with each admin request
- Not suitable for production with multiple admins

---

## Content Moderation System

### Architecture

```
User Prompt
    ↓
Check bypass_watchdog flag
    ↓
If false → AI Moderation Check
    ↓
[Gemini analyzes prompt]
    ↓
AI returns: APPROVED or explanation
    ↓
If rejected → Log to rejected_prompts
    ↓
Return 400 error to user
```

### Moderation Guidelines

Stored in MongoDB `moderation_guidelines` collection. Default template targets ages 12-15:

- No violence, weapons, or gore
- No sexual or suggestive content
- No drugs, alcohol, or illegal activities
- No hate speech or discrimination
- No personal information
- Age-appropriate themes only

### AI Moderation Prompt

```python
f"""
You are a content moderator for an image generation platform for ages 12-15.
Review this prompt and respond with ONLY 'APPROVED' or a brief explanation of why it's inappropriate.

Guidelines:
{guidelines_text}

User prompt: "{user_prompt}"

Response:
"""
```

### Bypass Mechanism

Passwords can have `bypass_watchdog: true` to skip moderation:

- Useful for trusted users (teachers)
- Still subject to Gemini's built-in safety filters
- Admin responsibility to use carefully

---

## Rate Limiting

### Gemini API Limits

- **RPM (Requests Per Minute)**: 400
- **TPM (Tokens Per Minute)**: 4,000,000
- **RPD (Requests Per Day)**: 10,000

### Implementation

#### Exponential Backoff

```python
max_retries = 5
base_delay = 2  # seconds

for attempt in range(max_retries):
    try:
        response = await model.generate_content(...)
        break
    except Exception as e:
        if "429" in str(e) or "quota" in str(e).lower():
            if attempt < max_retries - 1:
                wait_time = base_delay ** (attempt + 1)
                await asyncio.sleep(wait_time)
            else:
                raise HTTPException(429, "Rate limit exceeded")
```

### User-Level Limits

Enforced via password configuration:

- `image_limit`: Max images per password
- `suggestion_limit`: Max AI suggestions per password

Tracked in `password_usage` collection per GUID+password pair.

---

## Deployment

### Docker Compose

**Services:**

1. **MongoDB**
   - Image: `mongo:5.0`
   - Port: `27017`
   - Volume: `mongodb_data`

2. **Backend**
   - Build: `./backend`
   - Port: `8000`
   - Depends on: MongoDB
   - Environment: `.env` file

3. **Frontend**
   - Build: `./frontend`
   - Port: `3000`
   - Depends on: Backend
   - Environment: `NEXT_PUBLIC_API_URL`

**docker-compose.yml:**

```yaml
version: "3.8"

services:
  mongodb:
    image: mongo:5.0
    container_name: generative-imagining-db
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db

  backend:
    build: ./backend
    container_name: generative-imagining-backend
    ports:
      - "8000:8000"
    environment:
      - MONGO_URI=mongodb://mongodb:27017
      - GOOGLE_API_KEY=${GOOGLE_API_KEY}
      - ADMIN_PASSWORD=${ADMIN_PASSWORD}
    depends_on:
      - mongodb
    volumes:
      - ./data/images:/app/data/images

  frontend:
    build: ./frontend
    container_name: generative-imagining-frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000
    depends_on:
      - backend

volumes:
  mongodb_data:
```

### Environment Variables

Create `.env` file in root:

```bash
# Google Gemini API
GOOGLE_API_KEY=your_api_key_here

# MongoDB
MONGO_URI=mongodb://mongodb:27017

# Admin
ADMIN_PASSWORD=your_secure_admin_password

# Backend
IMAGES_PATH=/app/data/images

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Production Considerations

⚠️ **This is an MVP - not production-ready as-is**

For production deployment:

1. **Security**
   - Use HTTPS everywhere
   - Implement proper session management
   - Use hashed passwords
   - Add rate limiting middleware
   - Configure CORS properly
   - Use MongoDB authentication

2. **Storage**
   - Use cloud storage (S3, GCS) instead of local filesystem
   - Implement CDN for image delivery
   - Add image compression

3. **Scaling**
   - Add load balancer
   - Use managed MongoDB (Atlas)
   - Implement caching (Redis)
   - Consider message queue for AI operations

4. **Monitoring**
   - Add logging (structured logs)
   - Implement error tracking (Sentry)
   - Monitor API usage and costs
   - Set up alerts

---

## Development Guide

### Prerequisites

- Python 3.9+ with pip
- Node.js 18+ with npm
- MongoDB 5.0+
- Docker & Docker Compose (optional)
- Google Gemini API key

### Local Setup

#### 1. Clone Repository

```bash
git clone https://github.com/yourusername/generative-imagining.git
cd generative-imagining
```

#### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cat > .env << EOF
GOOGLE_API_KEY=your_api_key
MONGO_URI=mongodb://localhost:27017
ADMIN_PASSWORD=admin123
IMAGES_PATH=./data/images
EOF

# Create images directory
mkdir -p data/images

# Run server
python main.py
```

Backend runs at `http://localhost:8000`

#### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

# Run development server
npm run dev
```

Frontend runs at `http://localhost:3000`

#### 4. MongoDB Setup

**Option A: Docker**

```bash
docker run -d -p 27017:27017 --name mongodb mongo:5.0
```

**Option B: Local Install**

- Install MongoDB Community Edition
- Start `mongod` service

### Development Workflow

#### Backend Development

```bash
cd backend

# Run with auto-reload
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Format code
black main.py

# Type checking
mypy main.py
```

#### Frontend Development

```bash
cd frontend

# Run dev server
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Lint
npm run lint
```

### Testing API Endpoints

Use tools like:

- **curl**
- **Postman**
- **HTTPie**
- **Swagger UI** at `http://localhost:8000/docs`

Example:

```bash
# Identify user
curl -X POST http://localhost:8000/identify \
  -H "Content-Type: application/json" \
  -d '{"guid": null}'

# Generate image
curl -X POST http://localhost:8000/generate \
  -H "Content-Type: application/json" \
  -d '{
    "guid": "your-guid-here",
    "password": "test-password",
    "prompt": "A beautiful sunset",
    "locale": "en"
  }'
```

### Database Management

#### MongoDB Shell

```bash
# Connect
mongosh

# Use database
use generative_imagining

# List collections
show collections

# Query users
db.users.find()

# Query images
db.images.find().limit(5)

# Count documents
db.images.countDocuments()
```

#### Common Queries

```javascript
// Find user's images
db.images.find({ user_guid: "550e8400..." });

// Get recent images
db.images.find().sort({ created_at: -1 }).limit(10);

// Check password validity
db.passwords.findOne({ password: "student2026" });

// View rejected prompts
db.rejected_prompts.find().sort({ timestamp: -1 });
```

### Debugging

#### Backend Logs

FastAPI automatically logs:

- Request URLs and methods
- Response status codes
- Error tracebacks

Add custom logging:

```python
import logging
logger = logging.getLogger(__name__)

logger.info(f"Generating image for GUID: {guid}")
logger.error(f"Failed to generate image: {str(e)}")
```

#### Frontend Debugging

- Use React DevTools browser extension
- Check browser console for errors
- Inspect Network tab for API calls
- Use `console.log()` for state debugging

### Performance Optimization

#### Backend

- Use async/await consistently
- Implement response caching
- Optimize MongoDB queries with indexes
- Consider connection pooling

#### Frontend

- Use Next.js Image component
- Implement lazy loading
- Minimize bundle size
- Use React.memo for expensive components

---

## Troubleshooting

### Common Issues

#### 1. MongoDB Connection Failed

**Error:** `ServerSelectionTimeoutError`

**Solution:**

- Ensure MongoDB is running
- Check `MONGO_URI` in `.env`
- Verify network/firewall settings

#### 2. Gemini API Rate Limit

**Error:** `429 Too Many Requests`

**Solution:**

- Wait for rate limit reset
- Implement request queuing
- Consider upgrading API quota

#### 3. Image Not Generating

**Possible Causes:**

- Invalid API key
- Content moderation rejection
- Network issues
- Gemini service outage

**Debugging:**

- Check backend logs
- Verify API key is correct
- Test with simple prompt
- Check Gemini API status

#### 4. CORS Errors

**Error:** `Access-Control-Allow-Origin`

**Solution:**

- Ensure backend CORS middleware is configured
- Check `NEXT_PUBLIC_API_URL` matches backend URL
- Verify ports are correct

#### 5. GUID Not Persisting

**Possible Causes:**

- Cookies disabled
- Browser privacy mode
- Cookie domain mismatch

**Solution:**

- Enable cookies in browser
- Check cookie settings in browser DevTools
- Verify cookie is being set by backend

---

## API Client Examples

### Python Client

```python
import requests

BASE_URL = "http://localhost:8000"

# Identify user
response = requests.post(f"{BASE_URL}/identify", json={"guid": None})
guid = response.json()["guid"]

# Generate image
response = requests.post(
    f"{BASE_URL}/generate",
    json={
        "guid": guid,
        "password": "student2026",
        "prompt": "A futuristic city at night",
        "locale": "en"
    }
)
image_data = response.json()
print(f"Image URL: {image_data['image_url']}")
```

### JavaScript/TypeScript Client

```typescript
const BASE_URL = "http://localhost:8000";

// Identify user
const identifyResponse = await fetch(`${BASE_URL}/identify`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ guid: null }),
});
const { guid } = await identifyResponse.json();

// Generate image
const generateResponse = await fetch(`${BASE_URL}/generate`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    guid,
    password: "student2026",
    prompt: "A futuristic city at night",
    locale: "en",
  }),
});
const imageData = await generateResponse.json();
console.log("Image URL:", imageData.image_url);
```

---

## Architecture Decisions

### Why Monolithic Backend?

For an MVP with limited scope:

- ✅ Simpler deployment
- ✅ Easier development
- ✅ Lower operational complexity
- ❌ Harder to scale specific features
- ❌ Single point of failure

Future: Consider microservices if scaling demands emerge.

### Why GUID Instead of Traditional Auth?

- ✅ Zero friction onboarding
- ✅ No password management
- ✅ Privacy-friendly (no email/name)
- ✅ Suitable for educational context
- ❌ No cross-device sync
- ❌ Easy to lose identity (cleared cookies)

Future: Add optional account linking for persistence.

### Why Local Filesystem for Images?

- ✅ Simple MVP implementation
- ✅ No additional service dependencies
- ✅ No storage costs
- ❌ Not scalable
- ❌ No CDN benefits
- ❌ Backup complexity

Future: Migrate to S3/GCS for production.

### Why Plain Text Passwords?

Educational context with admin-controlled access:

- ✅ Easy to communicate to students
- ✅ Time-limited validity
- ✅ Admin manages lifecycle
- ❌ Not secure for real authentication

Future: Hash passwords even for distribution codes.

---

## Future Roadmap

### Short Term

- [ ] Implement response caching
- [ ] Add batch operations
- [ ] Improve error messages
- [ ] Add request logging
- [ ] Create admin dashboard UI improvements

### Medium Term

- [ ] Migrate to cloud storage (S3/GCS)
- [ ] Add image categories/tags
- [ ] Implement social sharing
- [ ] Add rate limiting middleware
- [ ] Create usage analytics dashboard

### Long Term

- [ ] Optional user accounts
- [ ] Real-time collaboration
- [ ] Advanced editing tools
- [ ] Multi-model support (other AI providers)
- [ ] Mobile native apps

---

## Contributing

### Code Style

**Backend (Python):**

- Follow PEP 8
- Use Black for formatting
- Type hints encouraged
- Docstrings for public functions

**Frontend (TypeScript):**

- Follow ESLint configuration
- Use Prettier for formatting
- Functional components with hooks
- Descriptive prop interfaces

### Pull Request Process

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Development Guidelines

- Write clear commit messages
- Add tests for new features
- Update documentation
- Ensure CI passes
- Request code review

---

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

## Support

- **Documentation**: [README.md](README.md), [SETUP.md](SETUP.md)
- **Issues**: [GitHub Issues](../../issues)
- **Discussions**: [GitHub Discussions](../../discussions)

---

**Last Updated**: January 23, 2026
