# Generative Imagining - Quick Setup Guide

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- Gemini API key with billing enabled

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

   Edit `.env` and add your Gemini API key and unique passwords:

   ```
   GEMINI_API_KEY=your_gemini_api_key
   GEMINI_IMAGE_MODEL=gemini-3.1-flash-image
   MONGO_USERNAME=generative_imagining
   MONGO_PASSWORD=your_database_password
   ADMIN_PASSWORD=your_admin_password
   ```

3. **Start all services**

   ```bash
   docker compose up --build
   ```

4. **Access the application**
   - **Frontend**: http://localhost:3337
   - **Backend API**: http://localhost:3338
   - **API Documentation**: http://localhost:3338/docs
   - **MongoDB**: localhost:27017

### Default Admin Credentials

- Password: `admin123` (or whatever you set in `.env`)

## 📱 Application Features

### User Features

- **Create Images**: Generate images from text prompts using Gemini 3.1 Flash Image
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
python -m pip install --require-hashes -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Development

```bash
cd frontend
npm ci
npm run dev
```

## 🐛 Troubleshooting

1. **Images not generating**: Check that `GEMINI_API_KEY` is valid and that Gemini API billing and quota are available
2. **Database connection issues**: Ensure MongoDB is running via Docker Compose
3. **Frontend build issues**: Make sure all npm dependencies are installed

## 📝 Architecture

- **Backend**: Python FastAPI with Gemini Developer API integration
- **Frontend**: Next.js 16 with React 19 and Tailwind CSS
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
