# Generative Imagining Backend

FastAPI backend service for AI-powered image generation and management.

## Features

- **User Management**: IP + GUID based user identification
- **Image Generation**: Google Gemini 2.5 Flash integration
- **Image Editing**: AI-powered image editing suggestions
- **Gallery Management**: Personal image galleries
- **Admin Dashboard**: Administrative access to all images
- **MongoDB Integration**: Persistent data storage

## API Endpoints

### User Management

- `GET /api/user/identify` - Get or create user by IP
- `POST /api/user/verify` - Verify GUID for existing user

### Image Operations

- `POST /api/images/generate` - Generate new image from prompt
- `POST /api/images/edit` - Edit existing image
- `GET /api/images/gallery` - Get user's images
- `GET /api/images/{id}` - Get specific image
- `DELETE /api/images/{id}` - Delete image

### AI Assistance

- `POST /api/ai/suggest-prompts` - Get prompt suggestions
- `POST /api/ai/describe-image` - Get image description
- `POST /api/ai/suggest-edits` - Get edit suggestions for image

### Admin

- `POST /api/admin/login` - Admin authentication
- `GET /api/admin/images` - Get all images (admin only)
- `GET /api/admin/stats` - Get platform statistics

## Environment Variables

Copy `.env.example` to `.env` and set your values:

```bash
GOOGLE_API_KEY=your_gemini_api_key_here
MONGO_URI=mongodb://mongo:27017
ADMIN_PASSWORD=admin123
IMAGES_PATH=/app/data/images
```

## Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run the server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Docker

```bash
# Build image
docker build -t generative-imagining-backend .

# Run container
docker run -p 8000:8000 --env-file .env generative-imagining-backend
```

The API will be available at `http://localhost:8000` with automatic documentation at `http://localhost:8000/docs`.
