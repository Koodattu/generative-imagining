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
from google.genai import types
from PIL import Image
import io
import aiofiles
from pathlib import Path
import hashlib
import json
from dotenv import load_dotenv
from collections import deque
from asyncio import Lock

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(title="Generative Imagining API", version="1.0.0")

# Rate limiting configuration
GEMINI_RPM_LIMIT = 400  # Requests per minute
rate_limit_lock = Lock()
request_timestamps = deque()  # Store timestamps of requests

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
passwords_collection = db.passwords
usage_tracking_collection = db.usage_tracking

# Initialize Gemini AI
genai_client = genai.Client(api_key=GOOGLE_API_KEY)

# Security
security = HTTPBearer()

# Pydantic models
class UserIdentify(BaseModel):
    guid: Optional[str] = None

class UserResponse(BaseModel):
    guid: str

class ImageGenerate(BaseModel):
    prompt: str
    user_guid: str
    password: str

class ImageEdit(BaseModel):
    image_id: str
    edit_prompt: str
    user_guid: str
    password: str

class SuggestPrompts(BaseModel):
    keyword: Optional[str] = None
    language: Optional[str] = None
    password: str
    user_guid: str

class SuggestEdits(BaseModel):
    keyword: Optional[str] = None
    language: Optional[str] = None
    password: str
    user_guid: str

class AdminLogin(BaseModel):
    password: str

class PasswordCreate(BaseModel):
    password: str
    valid_hours: Optional[int] = 1
    image_limit: Optional[int] = 5
    suggestion_limit: Optional[int] = 50

class PasswordValidate(BaseModel):
    password: str

class ImageResponse(BaseModel):
    id: str
    user_guid: str
    file_path: str
    prompt: str
    description: str
    created_at: datetime
    updated_at: datetime
    created_with_password: str = "N/A"  # Default to N/A for older images without this field

# Response schemas for structured AI outputs
SUGGESTIONS_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "suggestions": {
            "type": "ARRAY",
            "items": {"type": "STRING"}
        }
    },
    "required": ["suggestions"]
}

DESCRIPTION_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "description": {"type": "STRING"}
    },
    "required": ["description"]
}

# Helper functions
async def check_rate_limit():
    """Check if we're within the Gemini API rate limit (400 RPM)"""
    async with rate_limit_lock:
        current_time = datetime.utcnow()
        one_minute_ago = current_time.timestamp() - 60

        # Remove timestamps older than 1 minute
        while request_timestamps and request_timestamps[0] < one_minute_ago:
            request_timestamps.popleft()

        # Check if we're at the limit
        if len(request_timestamps) >= GEMINI_RPM_LIMIT:
            return False

        # Add current request timestamp
        request_timestamps.append(current_time.timestamp())
        return True

async def verify_admin_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify admin authentication"""
    if credentials.credentials != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid admin credentials")
    return credentials

async def validate_password(password: str, user_guid: str, usage_type: str = "image") -> bool:
    """
    Validate password and check usage limits
    usage_type can be 'image' (for generation/editing) or 'suggestion'
    Returns True if password is valid and user has remaining quota
    """
    # Admin password always works
    if password == ADMIN_PASSWORD:
        return True

    # Check if password exists and is not expired
    password_doc = await passwords_collection.find_one({
        "password": password,
        "expires_at": {"$gt": datetime.utcnow()}
    })

    if not password_doc:
        return False

    # Check usage for this user+password combination
    usage_key = f"{user_guid}:{password}"
    usage_doc = await usage_tracking_collection.find_one({"usage_key": usage_key})

    if not usage_doc:
        # First time use - create tracking document
        await usage_tracking_collection.insert_one({
            "usage_key": usage_key,
            "user_guid": user_guid,
            "password": password,
            "image_count": 0,
            "suggestion_count": 0,
            "created_at": datetime.utcnow()
        })
        usage_doc = {"image_count": 0, "suggestion_count": 0}

    # Check limits
    if usage_type == "image":
        if usage_doc["image_count"] >= password_doc["image_limit"]:
            return False
    elif usage_type == "suggestion":
        if usage_doc["suggestion_count"] >= password_doc["suggestion_limit"]:
            return False

    return True

async def increment_usage(password: str, user_guid: str, usage_type: str = "image"):
    """Increment usage counter for user+password combination"""
    if password == ADMIN_PASSWORD:
        return  # Don't track admin usage

    usage_key = f"{user_guid}:{password}"

    if usage_type == "image":
        await usage_tracking_collection.update_one(
            {"usage_key": usage_key},
            {"$inc": {"image_count": 1}},
            upsert=True
        )
    elif usage_type == "suggestion":
        await usage_tracking_collection.update_one(
            {"usage_key": usage_key},
            {"$inc": {"suggestion_count": 1}},
            upsert=True
        )

async def generate_image_with_gemini(prompt: str) -> bytes:
    """Generate image using Gemini AI"""
    try:
        # Check rate limit before making API call
        if not await check_rate_limit():
            raise Exception("Rate limit exceeded. Please try again in a moment.")

        # Using Gemini's native image generation with chat API
        chat = genai_client.chats.create(model="gemini-2.5-flash-image-preview")

        # Send the prompt with explicit instruction to generate an image
        instruction = f"""Generate a high-quality, family-friendly image based on this prompt: {prompt}

IMPORTANT GUIDELINES:
- Content must be appropriate for ages 12-15 (no violence, horror, mature themes, or anything rated 18+)
- Keep it positive, fun, and suitable for all audiences
- Focus on real-world subjects, nature, animals, activities, objects, and everyday scenes
- Avoid abstract or overly surreal content

If the prompt requests inappropriate content, politely decline and do not generate an image.
Return the generated image."""

        response = chat.send_message(instruction)

        # Extract the image from response parts
        for part in response.candidates[0].content.parts:
            if part.inline_data is not None:
                # Return the image bytes directly
                return part.inline_data.data

        # If no image found in response, raise error
        raise Exception("No image generated in response")

    except Exception as e:
        print(f"Error generating image: {e}")
        raise Exception(f"Failed to generate image: {str(e)}")

async def describe_image_with_gemini(image_path: str) -> str:
    """Generate description for image using Gemini AI"""
    try:
        # Check rate limit before making API call
        if not await check_rate_limit():
            raise Exception("Rate limit exceeded. Please try again in a moment.")

        # Load image
        img = Image.open(image_path)

        # Generate description using Gemini
        response = genai_client.models.generate_content(
            model='gemini-2.5-flash-lite',
            contents=[
                img,
                "Describe this image in 5-7 words maximum. Focus on the main physical subjects and objects. Be very brief and simple."
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=DESCRIPTION_SCHEMA,
            ),
        )

        result = json.loads(response.text)
        return result["description"]
    except Exception as e:
        print(f"Error describing image: {e}")
        return "AI-generated image"

async def suggest_edits_with_gemini(image_path: str, current_description: str, keyword: Optional[str] = None, language: Optional[str] = None) -> List[str]:
    """Suggest edits for an image using Gemini AI"""
    try:
        # Check rate limit before making API call
        if not await check_rate_limit():
            raise Exception("Rate limit exceeded. Please try again in a moment.")

        img = Image.open(image_path)

        # Determine language instruction
        lang_instruction = ""
        if language:
            if language.lower() == "fi":
                lang_instruction = " Respond in Finnish."
            elif language.lower() == "en":
                lang_instruction = " Respond in English."

        if keyword:
            query = f"""This image shows: {current_description}. Generate exactly 3 simple, practical edit suggestions based on '{keyword}'.

GUIDELINES:
- Suggest concrete, physical changes (colors, lighting, weather, time of day, adding real objects/animals)
- Keep it family-friendly and appropriate for ages 12-15
- Make suggestions grounded and realistic, not abstract or surreal
- Each suggestion: 5-10 words, clear and actionable{lang_instruction}

Return as a JSON object with a 'suggestions' array containing exactly 3 strings."""
        else:
            query = f"""This image shows: {current_description}. Generate exactly 3 simple, practical edit suggestions.

GUIDELINES:
- Suggest concrete, physical changes (colors, lighting, weather, time of day, adding real objects/animals)
- Keep it family-friendly and appropriate for ages 12-15
- Make suggestions grounded and realistic, not abstract or surreal
- Each suggestion: 5-10 words, clear and actionable{lang_instruction}

Return as a JSON object with a 'suggestions' array containing exactly 3 strings."""

        response = genai_client.models.generate_content(
            model='gemini-2.5-flash-lite',
            contents=[
                img,
                query
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=SUGGESTIONS_SCHEMA,
            ),
        )

        # Parse suggestions from structured JSON response
        result = json.loads(response.text)
        return result["suggestions"][:3]
    except Exception as e:
        print(f"Error suggesting edits: {e}")
        return [
            "Add golden sunset lighting",
            "Change to daytime scene",
            "Add colorful flowers"
        ]

async def edit_image_with_gemini(original_image_path: str, edit_prompt: str) -> bytes:
    """Edit an existing image using Gemini AI"""
    try:
        # Check rate limit before making API call
        if not await check_rate_limit():
            raise Exception("Rate limit exceeded. Please try again in a moment.")

        # Load the original image
        img = Image.open(original_image_path)

        # Using Gemini's native image editing with chat API
        chat = genai_client.chats.create(model="gemini-2.5-flash-image-preview")

        # Send the image and edit instruction
        instruction = f"""Edit this image according to the following instruction: {edit_prompt}

IMPORTANT GUIDELINES:
- Keep all content family-friendly and appropriate for ages 12-15
- Focus on realistic, physical changes (lighting, colors, objects, weather, etc.)
- Avoid creating anything violent, scary, or inappropriate

If the edit request is inappropriate, politely decline and do not modify the image.
Return the edited image."""

        response = chat.send_message([instruction, img])

        # Extract the edited image from response parts
        for part in response.candidates[0].content.parts:
            if part.inline_data is not None:
                # Return the edited image bytes
                return part.inline_data.data

        # If no image found in response, raise error
        raise Exception("No edited image in response")

    except Exception as e:
        print(f"Error editing image: {e}")
        raise Exception(f"Failed to edit image: {str(e)}")

# API Routes

@app.get("/")
async def root():
    return {"message": "Generative Imagining API is running!"}

# User Management Endpoints
@app.post("/api/user/identify")
async def identify_user(data: UserIdentify):
    """Get or create user by GUID"""
    # If GUID provided, verify it exists
    if data.guid:
        user = await users_collection.find_one({"guid": data.guid})
        if user:
            return UserResponse(guid=user["guid"])

    # Create new user with new GUID
    new_guid = str(uuid.uuid4())
    new_user = {
        "guid": new_guid,
        "created_at": datetime.utcnow()
    }

    await users_collection.insert_one(new_user)
    return UserResponse(guid=new_guid)

@app.post("/api/user/verify")
async def verify_user(data: UserIdentify):
    """Verify GUID for existing user"""
    user = await users_collection.find_one({"guid": data.guid})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return UserResponse(guid=user["guid"])

# Image Operations Endpoints
@app.post("/api/images/generate")
async def generate_image(data: ImageGenerate):
    """Generate new image from prompt"""
    try:
        # Verify user exists
        user = await users_collection.find_one({"guid": data.user_guid})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Validate password and check limits
        if not await validate_password(data.password, data.user_guid, "image"):
            raise HTTPException(status_code=403, detail="Invalid or expired password")

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
            "updated_at": datetime.utcnow(),
            "created_with_password": data.password if data.password != ADMIN_PASSWORD else "admin"
        }

        await images_collection.insert_one(image_doc)

        # Increment usage counter
        await increment_usage(data.password, data.user_guid, "image")

        return ImageResponse(**image_doc)

    except HTTPException:
        raise
    except Exception as e:
        error_message = str(e)
        if "Rate limit exceeded" in error_message:
            raise HTTPException(status_code=429, detail="Too many requests. Please try again in a moment.")
        print(f"Failed to generate image: {error_message}")
        raise HTTPException(status_code=500, detail="Failed to generate image. Please try again with a different prompt.")

@app.post("/api/images/edit")
async def edit_image(data: ImageEdit):
    """Edit existing image"""
    try:
        # Validate password and check limits
        if not await validate_password(data.password, data.user_guid, "image"):
            raise HTTPException(status_code=403, detail="Invalid or expired password")

        # Get original image
        original_image = await images_collection.find_one({"id": data.image_id, "user_guid": data.user_guid})
        if not original_image:
            raise HTTPException(status_code=404, detail="Image not found")

        # Create combined prompt for context
        combined_prompt = f"'{original_image['prompt']}' + '{data.edit_prompt}'"

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
            "original_image_id": data.image_id,
            "created_with_password": data.password if data.password != ADMIN_PASSWORD else "admin"
        }

        await images_collection.insert_one(new_image_doc)

        # Increment usage counter
        await increment_usage(data.password, data.user_guid, "image")

        return ImageResponse(**new_image_doc)

    except HTTPException:
        raise
    except Exception as e:
        error_message = str(e)
        if "Rate limit exceeded" in error_message:
            raise HTTPException(status_code=429, detail="Too many requests. Please try again in a moment.")
        print(f"Failed to edit image: {error_message}")
        raise HTTPException(status_code=500, detail="Failed to edit image. Please try again with a different prompt.")

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
        # Validate password and check limits
        if not await validate_password(data.password, data.user_guid, "suggestion"):
            raise HTTPException(status_code=403, detail="Invalid or expired password")

        # Check rate limit before making API call
        if not await check_rate_limit():
            raise HTTPException(status_code=429, detail="Rate limit exceeded. Please try again in a moment.")

        # Determine language instruction
        lang_instruction = ""
        if data.language:
            if data.language.lower() == "fi":
                lang_instruction = " Respond in Finnish."
            elif data.language.lower() == "en":
                lang_instruction = " Respond in English."

        if data.keyword:
            query = f"""Generate exactly 3 fun image prompts based on '{data.keyword}'.

GUIDELINES:
- Family-friendly content suitable for ages 12-15
- Focus on real, physical subjects: animals, nature, sports, hobbies, everyday activities, objects, places
- Keep prompts grounded and realistic, not abstract or overly fantastical
- Each prompt: 5-10 words, clear and descriptive{lang_instruction}

Return as a JSON object with a 'suggestions' array containing exactly 3 strings."""
        else:
            query = f"""Generate exactly 3 fun, random image prompts.

GUIDELINES:
- Family-friendly content suitable for ages 12-15
- Focus on real, physical subjects: animals, nature, sports, hobbies, everyday activities, objects, places
- Keep prompts grounded and realistic, not abstract or overly fantastical
- Each prompt: 5-10 words, clear and descriptive{lang_instruction}

Return as a JSON object with a 'suggestions' array containing exactly 3 strings."""

        response = genai_client.models.generate_content(
            model='gemini-2.5-flash-lite',
            contents=query,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=SUGGESTIONS_SCHEMA,
            ),
        )

        # Parse suggestions from structured JSON response
        result = json.loads(response.text)

        # Increment usage counter
        await increment_usage(data.password, data.user_guid, "suggestion")

        return {"suggestions": result["suggestions"][:3]}

    except Exception as e:
        return {"suggestions": [
            "A dog playing in a park",
            "Beach scene with colorful umbrellas",
            "Sports car on a mountain road"
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
async def suggest_edits(image_id: str, data: SuggestEdits):
    """Get edit suggestions for image"""
    try:
        # Validate password and check limits
        if not await validate_password(data.password, data.user_guid, "suggestion"):
            raise HTTPException(status_code=403, detail="Invalid or expired password")

        image = await images_collection.find_one({"id": image_id})
        if not image:
            raise HTTPException(status_code=404, detail="Image not found")

        # Generate description if not present
        description = image.get("description")
        if not description:
            description = await describe_image_with_gemini(image["file_path"])
            # Update the image document with the new description
            await images_collection.update_one(
                {"id": image_id},
                {"$set": {"description": description}}
            )

        suggestions = await suggest_edits_with_gemini(image["file_path"], description, data.keyword, data.language)

        # Increment usage counter
        await increment_usage(data.password, data.user_guid, "suggestion")

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

        # Get images by password statistics
        password_stats = []
        async for pwd in passwords_collection.find({}):
            image_count = await images_collection.count_documents({"created_with_password": pwd["password"]})
            password_stats.append({
                "password": pwd["password"],
                "image_count": image_count,
                "is_expired": pwd["expires_at"] < datetime.utcnow()
            })

        # Add admin stats
        admin_count = await images_collection.count_documents({"created_with_password": "admin"})
        password_stats.append({
            "password": "admin",
            "image_count": admin_count,
            "is_expired": False
        })

        return {
            "total_users": total_users,
            "total_images": total_images,
            "recent_images": recent_images,
            "recent_users": recent_users,
            "password_stats": password_stats
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching stats: {str(e)}")

@app.post("/api/admin/passwords/create")
async def create_password(data: PasswordCreate, credentials: HTTPAuthorizationCredentials = Depends(verify_admin_token)):
    """Create a new access password"""
    try:
        from datetime import timedelta
        expires_at = datetime.utcnow() + timedelta(hours=data.valid_hours)

        password_doc = {
            "password": data.password,
            "valid_hours": data.valid_hours,
            "image_limit": data.image_limit,
            "suggestion_limit": data.suggestion_limit,
            "created_at": datetime.utcnow(),
            "expires_at": expires_at
        }

        await passwords_collection.insert_one(password_doc)

        return {
            "message": "Password created successfully",
            "password": data.password,
            "expires_at": expires_at,
            "image_limit": data.image_limit,
            "suggestion_limit": data.suggestion_limit
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating password: {str(e)}")

@app.get("/api/admin/passwords")
async def get_passwords(credentials: HTTPAuthorizationCredentials = Depends(verify_admin_token)):
    """Get all passwords"""
    try:
        passwords = []
        async for pwd in passwords_collection.find({}).sort("created_at", -1):
            passwords.append({
                "password": pwd["password"],
                "valid_hours": pwd["valid_hours"],
                "image_limit": pwd["image_limit"],
                "suggestion_limit": pwd["suggestion_limit"],
                "created_at": pwd["created_at"],
                "expires_at": pwd["expires_at"],
                "is_expired": pwd["expires_at"] < datetime.utcnow()
            })

        return {"passwords": passwords}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching passwords: {str(e)}")

@app.delete("/api/admin/images/{image_id}")
async def delete_image(image_id: str, credentials: HTTPAuthorizationCredentials = Depends(verify_admin_token)):
    """Delete an image (admin only)"""
    try:
        # Find the image
        image = await images_collection.find_one({"id": image_id})
        if not image:
            raise HTTPException(status_code=404, detail="Image not found")

        # Delete the file
        import os
        file_path = image["file_path"]
        if os.path.exists(file_path):
            os.remove(file_path)

        # Delete from database
        await images_collection.delete_one({"id": image_id})

        return {"message": "Image deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting image: {str(e)}")

@app.post("/api/password/validate")
async def validate_password_endpoint(data: PasswordValidate):
    """Validate a password without using it"""
    try:
        # Check if it's admin password
        if data.password == ADMIN_PASSWORD:
            return {
                "valid": True,
                "is_admin": True,
                "message": "Admin password - unlimited access"
            }

        # Check if password exists and is not expired
        password_doc = await passwords_collection.find_one({
            "password": data.password,
            "expires_at": {"$gt": datetime.utcnow()}
        })

        if not password_doc:
            return {
                "valid": False,
                "message": "Invalid or expired password"
            }

        return {
            "valid": True,
            "is_admin": False,
            "image_limit": password_doc["image_limit"],
            "suggestion_limit": password_doc["suggestion_limit"],
            "expires_at": password_doc["expires_at"],
            "message": "Password valid"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error validating password: {str(e)}")

# Mount static files
app.mount("/images", StaticFiles(directory=IMAGES_PATH), name="images")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)