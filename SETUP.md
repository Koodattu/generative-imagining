# Generative Imagining - Quick Setup Guide

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- Google Gemini API key

### Setup Steps

1. **Clone and navigate to the project**

   ```bash
   cd generative-imagining
   ```

2. **Set environment variables**
   Copy the example environment file:

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your Google Gemini API key:

   ```
   GOOGLE_API_KEY=your_actual_gemini_api_key_here
   GEMINI_IMAGE_MODEL=gemini-2.5-flash-image
   IMAGEN_IMAGE_MODEL=imagen-4.0-fast-generate-001
   ADMIN_PASSWORD=your_admin_password
   ```

3. **Start all services**

   ```bash
   docker-compose up --build
   ```

4. **Access the application**
   - **Frontend**: http://localhost:3000
   - **Backend API**: http://localhost:8000
   - **API Documentation**: http://localhost:8000/docs
   - **MongoDB**: localhost:27017

### Default Admin Credentials

- Password: `admin123` (or whatever you set in `.env`)

## 📱 Application Features

### User Features

- **Create Images**: Generate images from text prompts using Google Gemini AI
- **Edit Images**: AI-powered image editing with suggestions
- **Gallery**: View and manage your generated images
- **Mobile-First**: Optimized for mobile devices

### Admin Features

- **Dashboard**: View all images and user statistics
- **Image Management**: Browse all generated images
- **Statistics**: Platform usage metrics

## 🔧 Development

### Backend Development

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Development

```bash
cd frontend/imaging-web
npm install
npm run dev
```

## 🐛 Troubleshooting

1. **Images not generating**: Check your Google Gemini API key in `.env`
2. **Database connection issues**: Ensure MongoDB is running via Docker Compose
3. **Frontend build issues**: Make sure all npm dependencies are installed

## 📝 Architecture

- **Backend**: Python FastAPI with Google Gemini AI integration
- **Frontend**: Next.js 15 with React 19 and Tailwind CSS
- **Database**: MongoDB for user and image metadata
- **Storage**: Local filesystem for image files
- **Authentication**: IP + GUID based user identification, simple admin auth

## 🎯 MVP Features Implemented

✅ Image generation from prompts
✅ AI-powered image editing
✅ Personal image gallery
✅ Admin dashboard
✅ Mobile-responsive design
✅ Docker deployment
✅ Simple user identification

Ready to generate amazing images! 🎨✨
