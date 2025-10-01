from fastapi import FastAPI, HTTPException, Depends, Request, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, FileResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os
import uuid
from datetime import datetime
from typing import List, Optional
import motor.motor_asyncio
from pydantic import BaseModel
import google.genai as genai
from PIL import Image
import io
import aiofiles
from pathlib import Path
import hashlib
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(title="Generative Imagining API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Environment variables
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")
IMAGES_PATH = os.getenv("IMAGES_PATH", "./data/images")

# Ensure images directory exists
Path(IMAGES_PATH).mkdir(parents=True, exist_ok=True)

# MongoDB setup
mongo_client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI)
db = mongo_client.generative_imagining
users_collection = db.users
images_collection = db.images

# Initialize Gemini AI
genai_client = genai.Client(api_key=GOOGLE_API_KEY)

# Security
security = HTTPBearer()

# Pydantic models
class UserIdentify(BaseModel):
    guid: Optional[str] = None

class UserResponse(BaseModel):
    guid: str
    ip: str

class ImageGenerate(BaseModel):
    prompt: str
    user_guid: str

class ImageEdit(BaseModel):
    image_id: str
    edit_prompt: str
    user_guid: str

class SuggestPrompts(BaseModel):
    keyword: Optional[str] = None
    context: Optional[str] = None

class AdminLogin(BaseModel):
    password: str

class ImageResponse(BaseModel):
    id: str
    user_guid: str
    file_path: str
    prompt: str
    description: str
    created_at: datetime
    updated_at: datetime

# Helper functions
def get_client_ip(request: Request) -> str:
    """Extract client IP from request"""
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.client.host

async def verify_admin_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify admin authentication"""
    if credentials.credentials != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid admin credentials")
    return credentials

async def generate_image_with_gemini(prompt: str) -> bytes:
    """Generate image using Gemini AI"""
    try:
        # Using Gemini's native image generation with chat API
        chat = genai_client.chats.create(model="gemini-2.5-flash-image-preview")

        # Send the prompt with explicit instruction to generate an image
        instruction = f"""Generate a high-quality image based on this prompt: {prompt}

Please create a visually appealing and detailed image that matches this description.
        Return the generated image."""

        response = chat.send_message(instruction)

        # Extract the image from response parts
        for part in response.candidates[0].content.parts:
            if part.inline_data is not None:
                # Return the image bytes directly
                return part.inline_data.data

        # If no image found in response, return a placeholder
        print("Warning: No image generated in response, returning placeholder")
        img = Image.new('RGB', (512, 512), color='lightblue')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        return img_bytes.getvalue()

    except Exception as e:
        print(f"Error generating image: {e}")
        # Return a placeholder image
        img = Image.new('RGB', (512, 512), color='lightgray')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        return img_bytes.getvalue()

async def describe_image_with_gemini(image_path: str) -> str:
    """Generate description for image using Gemini AI"""
    try:
        # Load image
        img = Image.open(image_path)

        # Generate description using Gemini
        response = genai_client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[
                img,
                "Describe this image in detail. Focus on the main subjects, colors, mood, and artistic style."
            ]
        )

        return response.text
    except Exception as e:
        print(f"Error describing image: {e}")
        return "AI-generated image"

async def suggest_edits_with_gemini(image_path: str, current_description: str) -> List[str]:
    """Suggest edits for an image using Gemini AI"""
    try:
        img = Image.open(image_path)

        response = genai_client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[
                img,
                f"Based on this image (described as: {current_description}), suggest 5 creative ways to edit or modify it. "
                "Make the suggestions specific and actionable for image generation prompts. "
                "Format each suggestion on a new line starting with a number (1., 2., etc.)."
            ]
        )

        # Parse suggestions from response
        suggestions = response.text.split('\n')
        return [s.strip('- ').strip() for s in suggestions if s.strip() and s.strip().startswith(('-', '1.', '2.', '3.', '4.', '5.'))][:5]
    except Exception as e:
        print(f"Error suggesting edits: {e}")
        return [
            "Add warm lighting effects",
            "Change the color palette to cooler tones",
            "Add background elements",
            "Enhance details and textures",
            "Create a different mood or atmosphere"
        ]

async def edit_image_with_gemini(original_image_path: str, edit_prompt: str) -> bytes:
    """Edit an existing image using Gemini AI"""
    try:
        # Load the original image
        img = Image.open(original_image_path)

        # Using Gemini's native image editing with chat API
        chat = genai_client.chats.create(model="gemini-2.5-flash-image-preview")

        # Send the image and edit instruction
        instruction = f"""Edit this image according to the following instruction: {edit_prompt}

Please modify the image as requested and return the edited image."""

        response = chat.send_message([instruction, img])

        # Extract the edited image from response parts
        for part in response.candidates[0].content.parts:
            if part.inline_data is not None:
                # Return the edited image bytes
                return part.inline_data.data

        # If no image found in response, return original
        print("Warning: No edited image in response, returning original")
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        return img_bytes.getvalue()

    except Exception as e:
        print(f"Error editing image: {e}")
        # Return original image as fallback
        img = Image.open(original_image_path)
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        return img_bytes.getvalue()

# API Routes

@app.get("/")
async def root():
    return {"message": "Generative Imagining API is running!"}

# User Management Endpoints
@app.get("/api/user/identify")
async def identify_user(request: Request, data: UserIdentify = None):
    """Get or create user by IP and optional GUID"""
    client_ip = get_client_ip(request)

    # If GUID provided, verify it exists for this IP
    if data and data.guid:
        user = await users_collection.find_one({"guid": data.guid, "ip": client_ip})
        if user:
            return UserResponse(guid=user["guid"], ip=user["ip"])

    # Check for existing user by IP
    existing_user = await users_collection.find_one({"ip": client_ip})
    if existing_user:
        return UserResponse(guid=existing_user["guid"], ip=existing_user["ip"])

    # Create new user
    new_guid = str(uuid.uuid4())
    new_user = {
        "guid": new_guid,
        "ip": client_ip,
        "created_at": datetime.utcnow()
    }

    await users_collection.insert_one(new_user)
    return UserResponse(guid=new_guid, ip=client_ip)

@app.post("/api/user/verify")
async def verify_user(request: Request, data: UserIdentify):
    """Verify GUID for existing user"""
    client_ip = get_client_ip(request)

    user = await users_collection.find_one({"guid": data.guid, "ip": client_ip})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return UserResponse(guid=user["guid"], ip=user["ip"])

# Image Operations Endpoints
@app.post("/api/images/generate")
async def generate_image(data: ImageGenerate):
    """Generate new image from prompt"""
    try:
        # Verify user exists
        user = await users_collection.find_one({"guid": data.user_guid})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Generate image
        image_data = await generate_image_with_gemini(data.prompt)

        # Save image
        image_id = str(uuid.uuid4())
        image_filename = f"{image_id}.png"
        image_path = os.path.join(IMAGES_PATH, image_filename)

        async with aiofiles.open(image_path, 'wb') as f:
            await f.write(image_data)

        # Generate description
        description = await describe_image_with_gemini(image_path)

        # Save to database
        image_doc = {
            "id": image_id,
            "user_guid": data.user_guid,
            "file_path": image_path,
            "filename": image_filename,
            "prompt": data.prompt,
            "description": description,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }

        await images_collection.insert_one(image_doc)

        return ImageResponse(**image_doc)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating image: {str(e)}")

@app.post("/api/images/edit")
async def edit_image(data: ImageEdit):
    """Edit existing image"""
    try:
        # Get original image
        original_image = await images_collection.find_one({"id": data.image_id, "user_guid": data.user_guid})
        if not original_image:
            raise HTTPException(status_code=404, detail="Image not found")

        # Create combined prompt for context
        combined_prompt = f"Based on the original prompt '{original_image['prompt']}': {data.edit_prompt}"

        # Edit the image using the chat-based editing function
        image_data = await edit_image_with_gemini(original_image['file_path'], data.edit_prompt)

        # Save new image
        new_image_id = str(uuid.uuid4())
        new_image_filename = f"{new_image_id}.png"
        new_image_path = os.path.join(IMAGES_PATH, new_image_filename)

        async with aiofiles.open(new_image_path, 'wb') as f:
            await f.write(image_data)

        # Generate description
        description = await describe_image_with_gemini(new_image_path)

        # Save to database
        new_image_doc = {
            "id": new_image_id,
            "user_guid": data.user_guid,
            "file_path": new_image_path,
            "filename": new_image_filename,
            "prompt": combined_prompt,
            "description": description,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "original_image_id": data.image_id
        }

        await images_collection.insert_one(new_image_doc)

        return ImageResponse(**new_image_doc)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error editing image: {str(e)}")

@app.get("/api/images/gallery")
async def get_user_gallery(user_guid: str):
    """Get user's images"""
    try:
        images = []
        async for image in images_collection.find({"user_guid": user_guid}).sort("created_at", -1):
            images.append(ImageResponse(**image))

        return {"images": images}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching gallery: {str(e)}")

@app.get("/api/images/{image_id}")
async def get_image(image_id: str):
    """Get specific image file"""
    try:
        image = await images_collection.find_one({"id": image_id})
        if not image:
            raise HTTPException(status_code=404, detail="Image not found")

        if not os.path.exists(image["file_path"]):
            raise HTTPException(status_code=404, detail="Image file not found")

        return FileResponse(image["file_path"], media_type="image/png")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching image: {str(e)}")

@app.delete("/api/images/{image_id}")
async def delete_image(image_id: str, user_guid: str):
    """Delete image"""
    try:
        image = await images_collection.find_one({"id": image_id, "user_guid": user_guid})
        if not image:
            raise HTTPException(status_code=404, detail="Image not found")

        # Delete file
        if os.path.exists(image["file_path"]):
            os.remove(image["file_path"])

        # Delete from database
        await images_collection.delete_one({"id": image_id})

        return {"message": "Image deleted successfully"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting image: {str(e)}")

# AI Assistance Endpoints
@app.post("/api/ai/suggest-prompts")
async def suggest_prompts(data: SuggestPrompts):
    """Get prompt suggestions"""
    try:
        if data.keyword:
            query = f"Generate 5 creative image generation prompts based on the keyword '{data.keyword}'. Make them diverse and interesting. Format each prompt on a new line starting with a number (1., 2., etc.)."
        else:
            query = "Generate 5 creative and diverse image generation prompts for inspiration. Include different styles, subjects, and moods. Format each prompt on a new line starting with a number (1., 2., etc.)."

        response = genai_client.models.generate_content(
            model='gemini-2.5-flash',
            contents=query
        )

        # Parse suggestions
        suggestions = response.text.split('\n')
        cleaned_suggestions = [s.strip('- ').strip() for s in suggestions if s.strip() and s.strip().startswith(('-', '1.', '2.', '3.', '4.', '5.'))][:5]

        return {"suggestions": cleaned_suggestions}

    except Exception as e:
        return {"suggestions": [
            "A majestic dragon soaring through clouds at sunset",
            "A cozy cabin in a magical forest with glowing mushrooms",
            "A futuristic city with floating cars and neon lights",
            "A peaceful garden with cherry blossoms and a small pond",
            "An abstract painting with vibrant colors and flowing shapes"
        ]}

@app.post("/api/ai/describe-image")
async def describe_image(image_id: str):
    """Get image description"""
    try:
        image = await images_collection.find_one({"id": image_id})
        if not image:
            raise HTTPException(status_code=404, detail="Image not found")

        return {"description": image["description"]}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error describing image: {str(e)}")

@app.post("/api/ai/suggest-edits")
async def suggest_edits(image_id: str):
    """Get edit suggestions for image"""
    try:
        image = await images_collection.find_one({"id": image_id})
        if not image:
            raise HTTPException(status_code=404, detail="Image not found")

        suggestions = await suggest_edits_with_gemini(image["file_path"], image["description"])

        return {"suggestions": suggestions}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error suggesting edits: {str(e)}")

# Admin Endpoints
@app.post("/api/admin/login")
async def admin_login(data: AdminLogin):
    """Admin authentication"""
    if data.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid admin password")

    return {"token": ADMIN_PASSWORD, "message": "Admin authenticated successfully"}

@app.get("/api/admin/images")
async def get_all_images(credentials: HTTPAuthorizationCredentials = Depends(verify_admin_token)):
    """Get all images (admin only)"""
    try:
        images = []
        async for image in images_collection.find({}).sort("created_at", -1):
            images.append(ImageResponse(**image))

        return {"images": images}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching all images: {str(e)}")

@app.get("/api/admin/stats")
async def get_admin_stats(credentials: HTTPAuthorizationCredentials = Depends(verify_admin_token)):
    """Get platform statistics"""
    try:
        total_users = await users_collection.count_documents({})
        total_images = await images_collection.count_documents({})

        # Get recent activity (last 7 days)
        from datetime import timedelta
        week_ago = datetime.utcnow() - timedelta(days=7)
        recent_images = await images_collection.count_documents({"created_at": {"$gte": week_ago}})
        recent_users = await users_collection.count_documents({"created_at": {"$gte": week_ago}})

        return {
            "total_users": total_users,
            "total_images": total_images,
            "recent_images": recent_images,
            "recent_users": recent_users
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching stats: {str(e)}")

# Mount static files
app.mount("/images", StaticFiles(directory=IMAGES_PATH), name="images")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)