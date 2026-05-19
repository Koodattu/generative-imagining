# Generative Imagining - Quick Setup Guide

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- Google Cloud project with billing and Vertex AI API enabled
- Google Cloud Application Default Credentials or a service account

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

   Edit `.env` and add your Google Cloud project for Vertex AI:

   ```
   GOOGLE_GENAI_USE_VERTEXAI=true
   GOOGLE_CLOUD_PROJECT=your_gcp_project_id
   GOOGLE_CLOUD_LOCATION=us-central1
   ADMIN_PASSWORD=your_admin_password
   ```

3. **Authenticate with Google Cloud**

   For local development:

   ```bash
   gcloud auth application-default login
   gcloud config set project your_gcp_project_id
   ```

   For Docker or server deployments, provide a service account with Vertex AI permissions through `GOOGLE_APPLICATION_CREDENTIALS`.

   This Docker Compose setup mounts `./secrets` into the backend container. Put your ADC or service account JSON here:

   ```bash
   mkdir -p secrets
   cp ~/.config/gcloud/application_default_credentials.json secrets/application_default_credentials.json
   chmod 600 secrets/application_default_credentials.json
   ```

4. **Start all services**

   ```bash
   docker-compose up --build
   ```

5. **Access the application**
   - **Frontend**: http://localhost:3000
   - **Backend API**: http://localhost:8000
   - **API Documentation**: http://localhost:8000/docs
   - **MongoDB**: localhost:27017

### Default Admin Credentials

- Password: `admin123` (or whatever you set in `.env`)

## 📱 Application Features

### User Features

- **Create Images**: Generate images from text prompts using Gemini 2.5 Flash Image on Vertex AI
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

1. **Images not generating**: Check `GOOGLE_CLOUD_PROJECT`, Vertex AI API enablement, billing, and Google Cloud authentication
2. **Database connection issues**: Ensure MongoDB is running via Docker Compose
3. **Frontend build issues**: Make sure all npm dependencies are installed

## 📝 Architecture

- **Backend**: Python FastAPI with Gemini on Vertex AI integration
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
