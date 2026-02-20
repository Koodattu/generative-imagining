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
MONGO_USERNAME = os.getenv("MONGO_USERNAME", "admin")
MONGO_PASSWORD = os.getenv("MONGO_PASSWORD", "securepassword")
MONGO_URI = os.getenv("MONGO_URI", f"mongodb://{MONGO_USERNAME}:{MONGO_PASSWORD}@localhost:27017/?authSource=admin")
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
moderation_guidelines_collection = db.moderation_guidelines
moderation_failures_collection = db.moderation_failures
token_usage_collection = db.token_usage

# Initialize Gemini AI
genai_client = genai.Client(api_key=GOOGLE_API_KEY)

# Gemini Pricing (as of January 2024) - per 1M tokens in USD
# gemini-2.5-flash: $0.15/1M input, $0.60/1M output (text), $3.50/1M for thinking tokens
# gemini-2.5-flash with images: $0.15/1M input, $0.60/1M output
# gemini-2.5-flash-image (image generation): $0.039 per image generated
GEMINI_PRICING = {
    "gemini-2.5-flash": {
        "input_per_million": 0.15,
        "output_per_million": 0.60,
        "thinking_per_million": 3.50,
    },
    "gemini-2.5-flash-image": {
        "per_image": 0.039,  # Cost per image generated
        "input_per_million": 0.15,  # For input tokens if any
        "output_per_million": 0.60,
    },
    "imagen-4.0-fast-generate-001": {
        "per_image": 0.020,  # Cost per image generated
        "input_per_million": 0,
        "output_per_million": 0,
    },
}

# Default moderation guidelines
DEFAULT_MODERATION_GUIDELINES = """- Reject any content with violence, horror, mature themes, or anything rated 18+
- Reject requests for weapons, gore, scary/disturbing imagery
- Reject sexual, suggestive, or inappropriate content
- Reject hate speech, discrimination, or offensive content
- Accept positive, fun content suitable for all audiences
- Accept real-world subjects, nature, animals, activities, objects, everyday scenes
- Slightly abstract or artistic content is OK if family-friendly
- Lean into the cool factor
- Teens play games, watch movies, use social media, follow trends
- We don't want to be super strict but we want to keep it safe and fun, so no drugs, alcohol, sex, bullying or anything illegal"""

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
    bypass_watchdog: Optional[bool] = False
    image_model: Optional[str] = "gemini"

class PasswordUpdate(BaseModel):
    image_limit: Optional[int] = None
    suggestion_limit: Optional[int] = None
    valid_hours: Optional[int] = None
    image_model: Optional[str] = None

class PasswordValidate(BaseModel):
    password: str

class ModerationGuidelinesUpdate(BaseModel):
    guidelines: str

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

MODERATION_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "is_appropriate": {"type": "BOOLEAN"},
        "rejection_reason": {"type": "STRING"}
    },
    "required": ["is_appropriate", "rejection_reason"]
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

async def validate_password(password: str, user_guid: str, usage_type: str = "image") -> tuple[bool, bool, Optional[dict]]:
    """
    Validate password and check usage limits
    usage_type can be 'image' (for generation/editing) or 'suggestion'
    Returns tuple: (is_valid, bypass_watchdog, password_doc)
    """
    # Admin password always works (case-sensitive)
    if password == ADMIN_PASSWORD:
        return (True, False, None)

    # Check if password exists and is not expired (case-insensitive for user passwords)
    password_lower = password.lower()
    password_doc = await passwords_collection.find_one({
        "password": password_lower,
        "expires_at": {"$gt": datetime.utcnow()}
    })

    if not password_doc:
        return (False, False, None)

    bypass_watchdog = password_doc.get("bypass_watchdog", False)

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
            return (False, False, None)
    elif usage_type == "suggestion":
        if usage_doc["suggestion_count"] >= password_doc["suggestion_limit"]:
            return (False, False, None)

    return (True, bypass_watchdog, password_doc)

async def increment_usage(password: str, user_guid: str, usage_type: str = "image"):
    """Increment usage counter for user+password combination"""
    if password == ADMIN_PASSWORD:
        return  # Don't track admin usage

    password_lower = password.lower()
    usage_key = f"{user_guid}:{password_lower}"

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

async def get_moderation_guidelines() -> str:
    """Get current moderation guidelines from database, or return default if not set"""
    guidelines_doc = await moderation_guidelines_collection.find_one({"_id": "current"})
    if guidelines_doc and "guidelines" in guidelines_doc:
        return guidelines_doc["guidelines"]
    return DEFAULT_MODERATION_GUIDELINES

async def update_moderation_guidelines(guidelines: str) -> None:
    """Update moderation guidelines in database"""
    await moderation_guidelines_collection.update_one(
        {"_id": "current"},
        {"$set": {"guidelines": guidelines, "updated_at": datetime.utcnow()}},
        upsert=True
    )

async def reset_moderation_guidelines() -> None:
    """Reset moderation guidelines to default"""
    await moderation_guidelines_collection.update_one(
        {"_id": "current"},
        {"$set": {"guidelines": DEFAULT_MODERATION_GUIDELINES, "updated_at": datetime.utcnow()}},
        upsert=True
    )

async def track_token_usage(
    operation_type: str,
    model: str,
    prompt_tokens: int = 0,
    completion_tokens: int = 0,
    thinking_tokens: int = 0,
    total_tokens: int = 0,
    images_generated: int = 0,
    password: str = None
) -> None:
    """
    Track token usage and calculate costs for API calls.

    operation_type: 'moderation', 'image_generation', 'image_edit', 'describe', 'suggest_edits', 'suggest_prompts'
    model: 'gemini-2.5-flash' or 'gemini-2.5-flash-image'
    """
    try:
        # Calculate cost based on model and token counts
        pricing = GEMINI_PRICING.get(model, GEMINI_PRICING["gemini-2.5-flash"])

        cost = 0.0
        if images_generated > 0:
            cost += images_generated * pricing.get("per_image", 0.039)

        if prompt_tokens > 0:
            cost += (prompt_tokens / 1_000_000) * pricing.get("input_per_million", 0.15)

        if completion_tokens > 0:
            cost += (completion_tokens / 1_000_000) * pricing.get("output_per_million", 0.60)

        if thinking_tokens > 0:
            cost += (thinking_tokens / 1_000_000) * pricing.get("thinking_per_million", 3.50)

        # Normalize password for tracking
        password_normalized = None
        if password:
            if password == ADMIN_PASSWORD:
                password_normalized = "admin"
            else:
                password_normalized = password.lower()

        usage_doc = {
            "operation_type": operation_type,
            "model": model,
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "thinking_tokens": thinking_tokens,
            "total_tokens": total_tokens,
            "images_generated": images_generated,
            "cost_usd": cost,
            "password": password_normalized,
            "created_at": datetime.utcnow()
        }

        await token_usage_collection.insert_one(usage_doc)
    except Exception as e:
        print(f"Error tracking token usage: {e}")

async def moderate_content(prompt: str, is_edit: bool = False, password: str = None) -> bool:
    """Screen content request for appropriateness using Gemini AI"""
    try:
        # Check rate limit before making API call
        if not await check_rate_limit():
            raise Exception("Rate limit exceeded. Please try again in a moment.")

        # Get current guidelines from database
        guidelines = await get_moderation_guidelines()

        moderation_prompt = f"""You are a content moderator for a image generation and editing application.

Evaluate if this prompt is appropriate:
"{prompt}"

GUIDELINES:
{guidelines}

Return a JSON object with:
- is_appropriate: true if the prompt follows the guidelines, false otherwise
- rejection_reason: if is_appropriate is false, provide a brief explanation (one sentence) why it was rejected. If is_appropriate is true, set this to an empty string."""

        response = await genai_client.aio.models.generate_content(
            model='gemini-2.5-flash',
            contents=moderation_prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=MODERATION_SCHEMA,
                thinking_config=types.ThinkingConfig(thinking_budget=0),
            ),
        )

        # Track token usage
        if hasattr(response, 'usage_metadata') and response.usage_metadata:
            await track_token_usage(
                operation_type="moderation",
                model="gemini-2.5-flash",
                prompt_tokens=getattr(response.usage_metadata, 'prompt_token_count', 0) or 0,
                completion_tokens=getattr(response.usage_metadata, 'candidates_token_count', 0) or 0,
                thinking_tokens=getattr(response.usage_metadata, 'thoughts_token_count', 0) or 0,
                total_tokens=getattr(response.usage_metadata, 'total_token_count', 0) or 0,
                password=password
            )

        result = json.loads(response.text)
        is_appropriate = result["is_appropriate"]

        # If not appropriate, save to database for admin review
        if not is_appropriate:
            rejection_reason = result.get("rejection_reason", "No reason provided")
            await moderation_failures_collection.insert_one({
                "prompt": prompt,
                "rejection_reason": rejection_reason,
                "is_edit": is_edit,
                "created_at": datetime.utcnow()
            })

        return is_appropriate
    except Exception as e:
        print(f"Error moderating content: {e}")
        # On error, be conservative and reject
        return False

async def generate_image_with_gemini(prompt: str, password: str = None) -> bytes:
    """Generate image using Gemini AI"""
    try:
        # Check rate limit before making API call
        if not await check_rate_limit():
            raise Exception("Rate limit exceeded. Please try again in a moment.")

        # Using Gemini's native image generation with chat API
        chat = genai_client.aio.chats.create(
            model="gemini-2.5-flash-image",
            config=types.GenerateContentConfig(
                response_modalities=['IMAGE'],
            )
        )

        # Send the prompt to generate the image
        instruction = f"Generate a high-quality image based on this prompt: {prompt}"

        response = await chat.send_message(instruction)

        # Track token usage for image generation
        if hasattr(response, 'usage_metadata') and response.usage_metadata:
            await track_token_usage(
                operation_type="image_generation",
                model="gemini-2.5-flash-image",
                prompt_tokens=getattr(response.usage_metadata, 'prompt_token_count', 0) or 0,
                completion_tokens=getattr(response.usage_metadata, 'candidates_token_count', 0) or 0,
                thinking_tokens=getattr(response.usage_metadata, 'thoughts_token_count', 0) or 0,
                total_tokens=getattr(response.usage_metadata, 'total_token_count', 0) or 0,
                images_generated=1,
                password=password
            )

        print(f"Gemini response: {response}")

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

async def generate_image_with_imagen(prompt: str, password: str = None) -> bytes:
    """Generate image using Imagen 4.0 Fast"""
    try:
        # Check rate limit before making API call
        if not await check_rate_limit():
            raise Exception("Rate limit exceeded. Please try again in a moment.")

        response = await genai_client.aio.models.generate_images(
            model='imagen-4.0-fast-generate-001',
            prompt=prompt,
            config=types.GenerateImagesConfig(
                number_of_images=1,
                aspect_ratio="1:1",
                person_generation="allow_all",
            ),
        )

        # Track token usage for imagen generation
        await track_token_usage(
            operation_type="image_generation",
            model="imagen-4.0-fast-generate-001",
            images_generated=1,
            password=password
        )

        if response.generated_images and len(response.generated_images) > 0:
            image = response.generated_images[0].image
            # Convert to bytes - the image object has image_bytes attribute
            if hasattr(image, '_image_bytes'):
                return image._image_bytes
            # Fallback: save to BytesIO via PIL
            img_bytes = io.BytesIO()
            image.save(img_bytes, format='PNG')
            return img_bytes.getvalue()

        raise Exception("No image generated in response")

    except Exception as e:
        print(f"Error generating image with Imagen: {e}")
        raise Exception(f"Failed to generate image: {str(e)}")

async def describe_image_with_gemini(image_path: str, password: str = None) -> str:
    """Generate description for image using Gemini AI"""
    try:
        # Check rate limit before making API call
        if not await check_rate_limit():
            raise Exception("Rate limit exceeded. Please try again in a moment.")

        # Load image
        img = Image.open(image_path)

        # Generate description using Gemini
        response = await genai_client.aio.models.generate_content(
            model='gemini-2.5-flash',
            contents=[
                img,
                "Describe this image in 5-7 words maximum. Focus on the main physical subjects and objects. Be very brief and simple."
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=DESCRIPTION_SCHEMA,
                thinking_config=types.ThinkingConfig(thinking_budget=0),
            ),
        )

        # Track token usage
        if hasattr(response, 'usage_metadata') and response.usage_metadata:
            await track_token_usage(
                operation_type="describe",
                model="gemini-2.5-flash",
                prompt_tokens=getattr(response.usage_metadata, 'prompt_token_count', 0) or 0,
                completion_tokens=getattr(response.usage_metadata, 'candidates_token_count', 0) or 0,
                thinking_tokens=getattr(response.usage_metadata, 'thoughts_token_count', 0) or 0,
                total_tokens=getattr(response.usage_metadata, 'total_token_count', 0) or 0,
                password=password
            )

        result = json.loads(response.text)
        return result["description"]
    except Exception as e:
        print(f"Error describing image: {e}")
        return "AI-generated image"

async def suggest_edits_with_gemini(image_path: str, current_description: str, keyword: Optional[str] = None, language: Optional[str] = None, password: str = None) -> List[str]:
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
- Each suggestion: 10 words, clear and actionable{lang_instruction}
- The suggestions should be suitable for image generation prompts
- Lean into the cool factor

EXAMPLES:
- "Add sunglasses to the cat"
- "Change the season to winter"
- "Make it a night scene"

REMEMBER: These are just examples, try to be creative and original with your suggestions!

Return as a JSON object with a 'suggestions' array containing exactly 3 strings."""
        else:
            query = f"""This image shows: {current_description}. Generate exactly 3 simple, practical edit suggestions.

GUIDELINES:
- Suggest concrete, physical changes (colors, lighting, weather, time of day, adding real objects/animals, hats, glasses)
- Keep it family-friendly and appropriate for ages 12-15
- Make suggestions grounded and realistic, not abstract or surreal
- Each suggestion: 10 words, clear and actionable{lang_instruction}
- The suggestions should be suitable for image editing prompts
- Lean into the cool factor

EXAMPLES:
- "Add sunglasses to the cat"
- "Change the season to winter"
- "Make it a night scene"

REMEMBER: These are just examples, try to be creative and original with your suggestions!

Return as a JSON object with a 'suggestions' array containing exactly 3 strings."""

        response = await genai_client.aio.models.generate_content(
            model='gemini-2.5-flash',
            contents=[
                img,
                query
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=SUGGESTIONS_SCHEMA,
                thinking_config=types.ThinkingConfig(thinking_budget=0),
            ),
        )

        # Track token usage
        if hasattr(response, 'usage_metadata') and response.usage_metadata:
            await track_token_usage(
                operation_type="suggest_edits",
                model="gemini-2.5-flash",
                prompt_tokens=getattr(response.usage_metadata, 'prompt_token_count', 0) or 0,
                completion_tokens=getattr(response.usage_metadata, 'candidates_token_count', 0) or 0,
                thinking_tokens=getattr(response.usage_metadata, 'thoughts_token_count', 0) or 0,
                total_tokens=getattr(response.usage_metadata, 'total_token_count', 0) or 0,
                password=password
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

async def edit_image_with_gemini(original_image_path: str, edit_prompt: str, password: str = None) -> bytes:
    """Edit an existing image using Gemini AI"""
    try:
        # Check rate limit before making API call
        if not await check_rate_limit():
            raise Exception("Rate limit exceeded. Please try again in a moment.")

        # Load the original image
        img = Image.open(original_image_path)

        # Using Gemini's native image editing with chat API
        chat = genai_client.aio.chats.create(
            model="gemini-2.5-flash-image",
            config=types.GenerateContentConfig(
                response_modalities=['IMAGE'],
            )
        )

        # Send the image and edit instruction
        instruction = f"Edit this image according to the following instruction: {edit_prompt}"

        response = await chat.send_message([instruction, img])

        # Track token usage for image editing
        if hasattr(response, 'usage_metadata') and response.usage_metadata:
            await track_token_usage(
                operation_type="image_edit",
                model="gemini-2.5-flash-image",
                prompt_tokens=getattr(response.usage_metadata, 'prompt_token_count', 0) or 0,
                completion_tokens=getattr(response.usage_metadata, 'candidates_token_count', 0) or 0,
                thinking_tokens=getattr(response.usage_metadata, 'thoughts_token_count', 0) or 0,
                total_tokens=getattr(response.usage_metadata, 'total_token_count', 0) or 0,
                images_generated=1,
                password=password
            )

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
        is_valid, bypass_watchdog, password_doc = await validate_password(data.password, data.user_guid, "image")
        if not is_valid:
            raise HTTPException(status_code=403, detail="Invalid or expired password")

        # Determine which image generation model to use
        image_model = "gemini"  # default
        if password_doc and password_doc.get("image_model"):
            image_model = password_doc["image_model"]

        # Moderate content before generation (skip if bypass_watchdog is enabled)
        if not bypass_watchdog:
            is_appropriate = await moderate_content(data.prompt, is_edit=False, password=data.password)
            if not is_appropriate:
                raise HTTPException(status_code=500, detail="Failed to generate image. Please try again with a different prompt.")

        # Generate image using the configured model
        if image_model == "imagen":
            image_data = await generate_image_with_imagen(data.prompt, password=data.password)
        else:
            image_data = await generate_image_with_gemini(data.prompt, password=data.password)

        # Save image
        image_id = str(uuid.uuid4())
        image_filename = f"{image_id}.png"
        image_path = os.path.join(IMAGES_PATH, image_filename)

        async with aiofiles.open(image_path, 'wb') as f:
            await f.write(image_data)

        # Generate description
        description = await describe_image_with_gemini(image_path, password=data.password)

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
            "created_with_password": data.password.lower() if data.password != ADMIN_PASSWORD else "admin"
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
        is_valid, bypass_watchdog, _ = await validate_password(data.password, data.user_guid, "image")
        if not is_valid:
            raise HTTPException(status_code=403, detail="Invalid or expired password")

        # Get original image
        original_image = await images_collection.find_one({"id": data.image_id, "user_guid": data.user_guid})
        if not original_image:
            raise HTTPException(status_code=404, detail="Image not found")

        # Moderate content before editing (skip if bypass_watchdog is enabled)
        if not bypass_watchdog:
            is_appropriate = await moderate_content(data.edit_prompt, is_edit=True, password=data.password)
            if not is_appropriate:
                raise HTTPException(status_code=500, detail="Failed to generate image. Please try again with a different prompt.")

        # Create combined prompt for context
        combined_prompt = f"'{original_image['prompt']}' + '{data.edit_prompt}'"

        # Edit the image using the chat-based editing function
        image_data = await edit_image_with_gemini(original_image['file_path'], data.edit_prompt, password=data.password)

        # Save new image
        new_image_id = str(uuid.uuid4())
        new_image_filename = f"{new_image_id}.png"
        new_image_path = os.path.join(IMAGES_PATH, new_image_filename)

        async with aiofiles.open(new_image_path, 'wb') as f:
            await f.write(image_data)

        # Generate description
        description = await describe_image_with_gemini(new_image_path, password=data.password)

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
            "created_with_password": data.password.lower() if data.password != ADMIN_PASSWORD else "admin"
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

@app.get("/api/images/{image_id}/public")
async def get_image_public(image_id: str):
    """Get image metadata for public sharing (no password required)"""
    try:
        image = await images_collection.find_one({"id": image_id})
        if not image:
            raise HTTPException(status_code=404, detail="Image not found")

        return ImageResponse(**image)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching image: {str(e)}")

# AI Assistance Endpoints
@app.post("/api/ai/suggest-prompts")
async def suggest_prompts(data: SuggestPrompts):
    """Get prompt suggestions"""
    try:
        # Validate password and check limits
        is_valid, _, _ = await validate_password(data.password, data.user_guid, "suggestion")
        if not is_valid:
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
            query = f"""Generate exactly 3 high-quality image prompts based on '{data.keyword}'.

PROMPT STRUCTURE (required for every prompt):
- Subject: clearly name the main person, animal, object, or scene
- Context/background: describe where it is and what surrounds it
- Style: include a visual style (for example: photograph, sketch, pastel painting, charcoal drawing, isometric 3D)

QUALITY RULES:
- Naturally include '{data.keyword}' in each prompt
- Family-friendly content suitable for ages below 16
- Grounded, physical, real-world subjects and settings
- Clear, descriptive language with meaningful modifiers
- One sentence per prompt, 12-22 words each{lang_instruction}

FORMAT:
- Return as JSON with a 'suggestions' array containing exactly 3 strings
- Do not include numbering, labels, or extra text outside the JSON
"""
        else:
            query = f"""Generate exactly 3 high-quality and creative image prompts.

PROMPT STRUCTURE (required for every prompt):
- Subject: clearly name the main person, animal, object, or scene
- Context/background: describe where it is and what surrounds it
- Style: include a visual style (for example: photograph, sketch, pastel painting, charcoal drawing, isometric 3D)

QUALITY RULES:
- Family-friendly content suitable for ages below 16
- Grounded, physical, real-world subjects and settings
- Clear, descriptive language with meaningful modifiers
- One sentence per prompt, 12-22 words each{lang_instruction}

FORMAT:
- Return as JSON with a 'suggestions' array containing exactly 3 strings
- Do not include numbering, labels, or extra text outside the JSON
"""

        response = await genai_client.aio.models.generate_content(
            model='gemini-2.5-flash',
            contents=query,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=SUGGESTIONS_SCHEMA,
                thinking_config=types.ThinkingConfig(thinking_budget=0),
            ),
        )

        # Track token usage
        if hasattr(response, 'usage_metadata') and response.usage_metadata:
            await track_token_usage(
                operation_type="suggest_prompts",
                model="gemini-2.5-flash",
                prompt_tokens=getattr(response.usage_metadata, 'prompt_token_count', 0) or 0,
                completion_tokens=getattr(response.usage_metadata, 'candidates_token_count', 0) or 0,
                thinking_tokens=getattr(response.usage_metadata, 'thoughts_token_count', 0) or 0,
                total_tokens=getattr(response.usage_metadata, 'total_token_count', 0) or 0,
                password=data.password
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
        is_valid, _, _ = await validate_password(data.password, data.user_guid, "suggestion")
        if not is_valid:
            raise HTTPException(status_code=403, detail="Invalid or expired password")

        image = await images_collection.find_one({"id": image_id})
        if not image:
            raise HTTPException(status_code=404, detail="Image not found")

        # Generate description if not present
        description = image.get("description")
        if not description:
            description = await describe_image_with_gemini(image["file_path"], password=data.password)
            # Update the image document with the new description
            await images_collection.update_one(
                {"id": image_id},
                {"$set": {"description": description}}
            )

        suggestions = await suggest_edits_with_gemini(image["file_path"], description, data.keyword, data.language, password=data.password)

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

        # Store password in lowercase for case-insensitive comparison
        password_lower = data.password.lower()

        password_doc = {
            "password": password_lower,
            "valid_hours": data.valid_hours,
            "image_limit": data.image_limit,
            "suggestion_limit": data.suggestion_limit,
            "bypass_watchdog": data.bypass_watchdog,
            "image_model": data.image_model if data.image_model in ("gemini", "imagen") else "gemini",
            "created_at": datetime.utcnow(),
            "expires_at": expires_at
        }

        # Use update_one with upsert to overwrite existing password
        await passwords_collection.update_one(
            {"password": password_lower},
            {"$set": password_doc},
            upsert=True
        )

        return {
            "message": "Password created successfully",
            "password": password_lower,
            "expires_at": expires_at,
            "image_limit": data.image_limit,
            "suggestion_limit": data.suggestion_limit,
            "bypass_watchdog": data.bypass_watchdog,
            "image_model": password_doc["image_model"]
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
                "is_expired": pwd["expires_at"] < datetime.utcnow(),
                "bypass_watchdog": pwd.get("bypass_watchdog", False),
                "image_model": pwd.get("image_model", "gemini")
            })

        return {"passwords": passwords}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching passwords: {str(e)}")

@app.delete("/api/admin/passwords/{password}")
async def delete_password(password: str, credentials: HTTPAuthorizationCredentials = Depends(verify_admin_token)):
    """Delete a password (admin only)"""
    try:
        # Delete the password (convert to lowercase for case-insensitive deletion)
        password_lower = password.lower()
        result = await passwords_collection.delete_one({"password": password_lower})

        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Password not found")

        # Also delete associated usage tracking
        await usage_tracking_collection.delete_many({"password": password_lower})

        return {"message": "Password deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting password: {str(e)}")

@app.put("/api/admin/passwords/{password}")
async def update_password(password: str, data: PasswordUpdate, credentials: HTTPAuthorizationCredentials = Depends(verify_admin_token)):
    """Update an existing password's settings (admin only)"""
    try:
        password_lower = password.lower()

        # Check password exists
        existing = await passwords_collection.find_one({"password": password_lower})
        if not existing:
            raise HTTPException(status_code=404, detail="Password not found")

        # Build update dict with only provided fields
        update_fields = {}
        if data.image_limit is not None:
            update_fields["image_limit"] = data.image_limit
        if data.suggestion_limit is not None:
            update_fields["suggestion_limit"] = data.suggestion_limit
        if data.image_model is not None and data.image_model in ("gemini", "imagen"):
            update_fields["image_model"] = data.image_model
        if data.valid_hours is not None:
            from datetime import timedelta
            update_fields["valid_hours"] = data.valid_hours
            update_fields["expires_at"] = datetime.utcnow() + timedelta(hours=data.valid_hours)

        if not update_fields:
            raise HTTPException(status_code=400, detail="No valid fields to update")

        await passwords_collection.update_one(
            {"password": password_lower},
            {"$set": update_fields}
        )

        # Fetch and return updated document
        updated = await passwords_collection.find_one({"password": password_lower})
        return {
            "message": "Password updated successfully",
            "password": updated["password"],
            "image_limit": updated["image_limit"],
            "suggestion_limit": updated["suggestion_limit"],
            "valid_hours": updated["valid_hours"],
            "expires_at": updated["expires_at"],
            "bypass_watchdog": updated.get("bypass_watchdog", False),
            "image_model": updated.get("image_model", "gemini")
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating password: {str(e)}")

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

@app.get("/api/admin/moderation-guidelines")
async def get_guidelines(credentials: HTTPAuthorizationCredentials = Depends(verify_admin_token)):
    """Get current moderation guidelines (admin only)"""
    try:
        guidelines = await get_moderation_guidelines()
        return {
            "guidelines": guidelines,
            "is_default": guidelines == DEFAULT_MODERATION_GUIDELINES
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching guidelines: {str(e)}")

@app.put("/api/admin/moderation-guidelines")
async def update_guidelines(
    data: ModerationGuidelinesUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(verify_admin_token)
):
    """Update moderation guidelines (admin only)"""
    try:
        if not data.guidelines.strip():
            raise HTTPException(status_code=400, detail="Guidelines cannot be empty")

        await update_moderation_guidelines(data.guidelines)
        return {
            "message": "Guidelines updated successfully",
            "guidelines": data.guidelines
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating guidelines: {str(e)}")

@app.post("/api/admin/moderation-guidelines/reset")
async def reset_guidelines(credentials: HTTPAuthorizationCredentials = Depends(verify_admin_token)):
    """Reset moderation guidelines to default (admin only)"""
    try:
        await reset_moderation_guidelines()
        return {
            "message": "Guidelines reset to default successfully",
            "guidelines": DEFAULT_MODERATION_GUIDELINES
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error resetting guidelines: {str(e)}")

@app.get("/api/admin/moderation-failures")
async def get_moderation_failures(credentials: HTTPAuthorizationCredentials = Depends(verify_admin_token)):
    """Get all moderation failures (admin only)"""
    try:
        # Get all failures, sorted by most recent first
        failures_cursor = moderation_failures_collection.find().sort("created_at", -1).limit(500)
        failures = await failures_cursor.to_list(length=500)

        # Convert ObjectId to string for JSON serialization
        for failure in failures:
            failure["_id"] = str(failure["_id"])

        return {"failures": failures}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching moderation failures: {str(e)}")

@app.get("/api/admin/token-usage")
async def get_token_usage(credentials: HTTPAuthorizationCredentials = Depends(verify_admin_token)):
    """Get token usage and cost statistics (admin only)"""
    try:
        # Get total stats
        pipeline_total = [
            {
                "$group": {
                    "_id": None,
                    "total_prompt_tokens": {"$sum": "$prompt_tokens"},
                    "total_completion_tokens": {"$sum": "$completion_tokens"},
                    "total_thinking_tokens": {"$sum": "$thinking_tokens"},
                    "total_tokens": {"$sum": "$total_tokens"},
                    "total_images_generated": {"$sum": "$images_generated"},
                    "total_cost_usd": {"$sum": "$cost_usd"},
                    "total_requests": {"$sum": 1}
                }
            }
        ]

        total_stats_cursor = token_usage_collection.aggregate(pipeline_total)
        total_stats_list = await total_stats_cursor.to_list(length=1)
        total_stats = total_stats_list[0] if total_stats_list else {
            "total_prompt_tokens": 0,
            "total_completion_tokens": 0,
            "total_thinking_tokens": 0,
            "total_tokens": 0,
            "total_images_generated": 0,
            "total_cost_usd": 0,
            "total_requests": 0
        }

        # Get stats by operation type
        pipeline_by_operation = [
            {
                "$group": {
                    "_id": "$operation_type",
                    "prompt_tokens": {"$sum": "$prompt_tokens"},
                    "completion_tokens": {"$sum": "$completion_tokens"},
                    "thinking_tokens": {"$sum": "$thinking_tokens"},
                    "total_tokens": {"$sum": "$total_tokens"},
                    "images_generated": {"$sum": "$images_generated"},
                    "cost_usd": {"$sum": "$cost_usd"},
                    "request_count": {"$sum": 1}
                }
            },
            {"$sort": {"cost_usd": -1}}
        ]

        by_operation_cursor = token_usage_collection.aggregate(pipeline_by_operation)
        by_operation = await by_operation_cursor.to_list(length=100)

        # Get stats by password
        pipeline_by_password = [
            {
                "$match": {"password": {"$ne": None}}
            },
            {
                "$group": {
                    "_id": "$password",
                    "prompt_tokens": {"$sum": "$prompt_tokens"},
                    "completion_tokens": {"$sum": "$completion_tokens"},
                    "thinking_tokens": {"$sum": "$thinking_tokens"},
                    "total_tokens": {"$sum": "$total_tokens"},
                    "images_generated": {"$sum": "$images_generated"},
                    "cost_usd": {"$sum": "$cost_usd"},
                    "request_count": {"$sum": 1}
                }
            },
            {"$sort": {"cost_usd": -1}}
        ]

        by_password_cursor = token_usage_collection.aggregate(pipeline_by_password)
        by_password = await by_password_cursor.to_list(length=100)

        # Get stats by model
        pipeline_by_model = [
            {
                "$group": {
                    "_id": "$model",
                    "prompt_tokens": {"$sum": "$prompt_tokens"},
                    "completion_tokens": {"$sum": "$completion_tokens"},
                    "thinking_tokens": {"$sum": "$thinking_tokens"},
                    "total_tokens": {"$sum": "$total_tokens"},
                    "images_generated": {"$sum": "$images_generated"},
                    "cost_usd": {"$sum": "$cost_usd"},
                    "request_count": {"$sum": 1}
                }
            },
            {"$sort": {"cost_usd": -1}}
        ]

        by_model_cursor = token_usage_collection.aggregate(pipeline_by_model)
        by_model = await by_model_cursor.to_list(length=100)

        return {
            "total": {
                "prompt_tokens": total_stats.get("total_prompt_tokens", 0),
                "completion_tokens": total_stats.get("total_completion_tokens", 0),
                "thinking_tokens": total_stats.get("total_thinking_tokens", 0),
                "total_tokens": total_stats.get("total_tokens", 0),
                "images_generated": total_stats.get("total_images_generated", 0),
                "cost_usd": round(total_stats.get("total_cost_usd", 0), 6),
                "request_count": total_stats.get("total_requests", 0)
            },
            "by_operation": [
                {
                    "operation": item["_id"],
                    "prompt_tokens": item["prompt_tokens"],
                    "completion_tokens": item["completion_tokens"],
                    "thinking_tokens": item["thinking_tokens"],
                    "total_tokens": item["total_tokens"],
                    "images_generated": item["images_generated"],
                    "cost_usd": round(item["cost_usd"], 6),
                    "request_count": item["request_count"]
                }
                for item in by_operation
            ],
            "by_password": [
                {
                    "password": item["_id"],
                    "prompt_tokens": item["prompt_tokens"],
                    "completion_tokens": item["completion_tokens"],
                    "thinking_tokens": item["thinking_tokens"],
                    "total_tokens": item["total_tokens"],
                    "images_generated": item["images_generated"],
                    "cost_usd": round(item["cost_usd"], 6),
                    "request_count": item["request_count"]
                }
                for item in by_password
            ],
            "by_model": [
                {
                    "model": item["_id"],
                    "prompt_tokens": item["prompt_tokens"],
                    "completion_tokens": item["completion_tokens"],
                    "thinking_tokens": item["thinking_tokens"],
                    "total_tokens": item["total_tokens"],
                    "images_generated": item["images_generated"],
                    "cost_usd": round(item["cost_usd"], 6),
                    "request_count": item["request_count"]
                }
                for item in by_model
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching token usage: {str(e)}")

@app.post("/api/password/validate")
async def validate_password_endpoint(data: PasswordValidate):
    """Validate a password without using it"""
    try:
        # Check if it's admin password (case-sensitive)
        if data.password == ADMIN_PASSWORD:
            return {
                "valid": True,
                "is_admin": True,
                "message": "Admin password - unlimited access"
            }

        # Check if password exists and is not expired (case-insensitive for user passwords)
        password_lower = data.password.lower()
        password_doc = await passwords_collection.find_one({
            "password": password_lower,
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