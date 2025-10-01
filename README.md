# Generative Imagining - AI-Powered Image Creation Platform

A simple MVP web application for AI-powered image generation and editing using Google Gemini 2.5 Flash, built with Python FastAPI backend and React Next.js frontend.

## 🎯 Project Overview

This project provides a streamlined platform where users can:

- Generate images from text prompts using Google Gemini AI
- Edit existing generated images with AI assistance
- Browse their personal image gallery
- Get AI-powered suggestions for image creation and editing

The system uses a naive but effective user identification method combining IP addresses and GUIDs, eliminating the need for traditional user registration.

## 🏗️ System Architecture

### Backend (Python FastAPI)

- **Framework**: FastAPI
- **AI Integration**: Google Gemini 2.5 Flash with experimental image generation
- **Database**: MongoDB
- **Authentication**: Simple admin login
- **Storage**: Local file system for images

### Frontend (React Next.js)

- **Framework**: Next.js with React
- **Target**: Mobile-first, desktop compatible
- **Views**: Create Image, Edit Image, Gallery, Admin
- **Styling**: Simple, responsive design

### Database Schema

```
Collections:
1. users: { guid: string, ip: string, created_at: datetime }
2. images: {
   id: string,
   user_guid: string,
   file_path: string,
   prompt: string,
   description: string,
   created_at: datetime,
   updated_at: datetime
}
```

## 🔧 Core Features

### User Management

- **IP + GUID Tracking**: Users identified by IP address and server-generated GUID
- **Cookie Persistence**: GUID stored in browser cookies
- **IP Recovery**: If cookies cleared, user identified by IP to retrieve existing GUID

### Image Generation

- **Text-to-Image**: Users provide prompts for image generation via Gemini AI
- **AI Suggestions**: Gemini provides creative prompt suggestions (blank slate or keyword-based)
- **Image Description**: Auto-generated descriptions for all images using Gemini

### Image Editing

- **AI-Powered Editing**: Gemini analyzes existing images and suggests modifications
- **Context-Aware**: Editing suggestions based on image content analysis
- **Generated Images Only**: No user uploads, only AI-generated content

### Gallery & Admin

- **Personal Gallery**: Users view their generated images
- **Admin Dashboard**: Simple authenticated view of all images and prompts
- **Minimal UI**: Clean, functional interface focused on core functionality

## 📡 API Endpoints

### User Management

```
GET  /api/user/identify     # Get or create user by IP
POST /api/user/verify       # Verify GUID for existing user
```

### Image Operations

```
POST /api/images/generate   # Generate new image from prompt
POST /api/images/edit       # Edit existing image
GET  /api/images/gallery    # Get user's images
GET  /api/images/{id}       # Get specific image
DELETE /api/images/{id}     # Delete image
```

### AI Assistance

```
POST /api/ai/suggest-prompts    # Get prompt suggestions
POST /api/ai/describe-image     # Get image description
POST /api/ai/suggest-edits      # Get edit suggestions for image
```

### Admin

```
POST /api/admin/login       # Admin authentication
GET  /api/admin/images      # Get all images (admin only)
GET  /api/admin/stats       # Get platform statistics
```

## 🚀 Deployment

### Docker Setup

```bash
# Build and run all services
docker-compose up --build

# Run in background
docker-compose up -d

# Stop services
docker-compose down
```

### Services

- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:8000
- **MongoDB**: localhost:27017

## 📁 Project Structure

```
generative-imagining/
├── README.md
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── main.py
│   ├── models/
│   ├── routers/
│   ├── services/
│   └── utils/
├── frontend/
│   └── imaging-web/
│       ├── Dockerfile
│       ├── package.json
│       ├── src/
│       │   ├── app/
│       │   ├── components/
│       │   └── utils/
│       └── public/
└── data/
    └── images/     # Generated images storage
```

## 🛠️ Development Setup

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local frontend development)
- Python 3.9+ (for local backend development)

### Environment Variables

```bash
# Backend
GOOGLE_API_KEY=your_gemini_api_key
MONGO_URI=mongodb://mongo:27017
ADMIN_PASSWORD=your_admin_password
IMAGES_PATH=/app/data/images

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Local Development

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Frontend
cd frontend/imaging-web
npm install
npm run dev
```

## 🎨 UI/UX Design Principles

- **Mobile-First**: Optimized for mobile experience
- **Minimal Interface**: Clean, distraction-free design
- **Fast Loading**: Optimized for quick image generation and viewing
- **Intuitive Navigation**: Simple 3-view structure
- **Responsive**: Works seamlessly on desktop and mobile

## 🔒 Security Considerations

- **IP-Based Auth**: Simple but effective for MVP
- **Admin Protection**: Basic authentication for admin endpoints
- **File Validation**: Server-side validation for generated images
- **Rate Limiting**: Prevent API abuse (future enhancement)

## 📈 Future Enhancements

- Real user authentication system
- Image sharing capabilities
- Advanced editing tools
- Batch image generation
- Image categories and tags
- API rate limiting
- Enhanced admin analytics

## 🧪 MVP Approach

This project follows a strict MVP methodology:

- **No over-engineering**: Simple, working solutions
- **Core functionality first**: Focus on image generation and viewing
- **Minimal viable features**: Essential features only
- **Quick deployment**: Docker-based setup for easy deployment
- **Scalable foundation**: Architecture allows for future enhancements

## 📝 License

MIT License - see LICENSE file for details

---

**Built with simplicity and functionality in mind. Ready to generate amazing images! 🎨✨**
