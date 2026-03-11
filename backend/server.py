from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from pymongo import MongoClient
import bcrypt
import jwt
import os

app = FastAPI(title="Expirex API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB Connection
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "expirex")
client = MongoClient(MONGO_URL)
db = client[DB_NAME]

# JWT Settings
JWT_SECRET = os.environ.get("JWT_SECRET", "expirex-secure-jwt-secret-2024")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_DAYS = 7

security = HTTPBearer()

# Pydantic Models
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserSettings(BaseModel):
    expiryThreshold: Optional[int] = None
    theme: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    settings: dict

class ProductCreate(BaseModel):
    name: str
    quantity: int = Field(ge=0)
    expirationDate: str  # ISO date string
    category: str

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    quantity: Optional[int] = None
    expirationDate: Optional[str] = None
    category: Optional[str] = None

# Helper functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str) -> str:
    payload = {
        "userId": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRATION_DAYS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def get_status(expiration_date: datetime, threshold: int = 7) -> str:
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Ensure expiration_date is timezone-aware
    if expiration_date.tzinfo is None:
        exp_date = expiration_date.replace(tzinfo=timezone.utc)
    else:
        exp_date = expiration_date
    
    exp_date = exp_date.replace(hour=0, minute=0, second=0, microsecond=0)
    
    if exp_date < today:
        return "Expired"
    elif exp_date <= today + timedelta(days=threshold):
        return "Near Expiry"
    else:
        return "Safe"

def serialize_product(product: dict, threshold: int = 7) -> dict:
    exp_date = product.get("expirationDate")
    if isinstance(exp_date, str):
        exp_date = datetime.fromisoformat(exp_date.replace("Z", "+00:00"))
    
    return {
        "id": str(product["_id"]),
        "name": product["name"],
        "quantity": product["quantity"],
        "expirationDate": exp_date.isoformat() if exp_date else None,
        "category": product["category"],
        "status": get_status(exp_date, threshold) if exp_date else "Unknown",
        "createdAt": product.get("createdAt").isoformat() if product.get("createdAt") else None,
        "updatedAt": product.get("updatedAt").isoformat() if product.get("updatedAt") else None
    }

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("userId")
        
        user = db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        return {
            "id": str(user["_id"]),
            "email": user["email"],
            "name": user["name"],
            "settings": user.get("settings", {"expiryThreshold": 7, "theme": "light"})
        }
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid token")

# Health Check
@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "Expirex API is running"}

@app.get("/api")
def root():
    return {"message": "Welcome to Expirex API"}

# Auth Routes
@app.post("/api/auth/signup")
def signup(user_data: UserCreate):
    # Check if user exists
    existing = db.users.find_one({"email": user_data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    hashed_pw = hash_password(user_data.password)
    now = datetime.now(timezone.utc)
    
    user_doc = {
        "email": user_data.email.lower(),
        "password": hashed_pw,
        "name": user_data.name,
        "settings": {"expiryThreshold": 7, "theme": "light"},
        "createdAt": now,
        "updatedAt": now
    }
    
    result = db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    token = create_token(user_id)
    
    return {
        "token": token,
        "user": {
            "id": user_id,
            "email": user_data.email.lower(),
            "name": user_data.name,
            "settings": user_doc["settings"]
        }
    }

@app.post("/api/auth/login")
def login(credentials: UserLogin):
    user = db.users.find_one({"email": credentials.email.lower()})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    user_id = str(user["_id"])
    token = create_token(user_id)
    
    return {
        "token": token,
        "user": {
            "id": user_id,
            "email": user["email"],
            "name": user["name"],
            "settings": user.get("settings", {"expiryThreshold": 7, "theme": "light"})
        }
    }

@app.get("/api/auth/me")
def get_me(current_user: dict = Depends(get_current_user)):
    return {"user": current_user}

@app.patch("/api/auth/settings")
def update_settings(settings: UserSettings, current_user: dict = Depends(get_current_user)):
    updates = {}
    if settings.expiryThreshold is not None:
        updates["settings.expiryThreshold"] = settings.expiryThreshold
    if settings.theme is not None:
        updates["settings.theme"] = settings.theme
    
    if updates:
        updates["updatedAt"] = datetime.now(timezone.utc)
        db.users.update_one(
            {"_id": ObjectId(current_user["id"])},
            {"$set": updates}
        )
    
    user = db.users.find_one({"_id": ObjectId(current_user["id"])})
    return {
        "user": {
            "id": str(user["_id"]),
            "email": user["email"],
            "name": user["name"],
            "settings": user.get("settings", {"expiryThreshold": 7, "theme": "light"})
        }
    }

# Product Routes
@app.get("/api/products/dashboard")
def get_dashboard(current_user: dict = Depends(get_current_user)):
    threshold = current_user["settings"].get("expiryThreshold", 7)
    
    products = list(db.products.find({"userId": current_user["id"]}))
    
    total = len(products)
    expired = 0
    near_expiry = 0
    safe = 0
    
    for p in products:
        exp_date = p.get("expirationDate")
        if isinstance(exp_date, str):
            exp_date = datetime.fromisoformat(exp_date.replace("Z", "+00:00"))
        
        status = get_status(exp_date, threshold) if exp_date else "Unknown"
        if status == "Expired":
            expired += 1
        elif status == "Near Expiry":
            near_expiry += 1
        else:
            safe += 1
    
    # Recent alerts (expired or near expiry)
    recent_alerts = []
    for p in products:
        exp_date = p.get("expirationDate")
        if isinstance(exp_date, str):
            exp_date = datetime.fromisoformat(exp_date.replace("Z", "+00:00"))
        
        status = get_status(exp_date, threshold) if exp_date else "Unknown"
        if status in ["Expired", "Near Expiry"]:
            recent_alerts.append(serialize_product(p, threshold))
    
    recent_alerts.sort(key=lambda x: x["expirationDate"] or "")
    recent_alerts = recent_alerts[:10]
    
    return {
        "summary": {
            "total": total,
            "expired": expired,
            "nearExpiry": near_expiry,
            "safe": safe
        },
        "recentAlerts": recent_alerts,
        "lastUpdated": datetime.now(timezone.utc).isoformat()
    }

@app.get("/api/products/report")
def get_monthly_report(
    month: int,
    year: int,
    current_user: dict = Depends(get_current_user)
):
    start_date = datetime(year, month, 1, tzinfo=timezone.utc)
    if month == 12:
        end_date = datetime(year + 1, 1, 1, tzinfo=timezone.utc) - timedelta(seconds=1)
    else:
        end_date = datetime(year, month + 1, 1, tzinfo=timezone.utc) - timedelta(seconds=1)
    
    products = list(db.products.find({
        "userId": current_user["id"],
        "expirationDate": {"$gte": start_date, "$lte": end_date}
    }))
    
    today = datetime.now(timezone.utc)
    expired_products = []
    
    for p in products:
        exp_date = p.get("expirationDate")
        if isinstance(exp_date, str):
            exp_date = datetime.fromisoformat(exp_date.replace("Z", "+00:00"))
        
        # Ensure timezone awareness
        if exp_date and exp_date.tzinfo is None:
            exp_date = exp_date.replace(tzinfo=timezone.utc)
        
        if exp_date and exp_date < today:
            expired_products.append(p)
    
    # Category breakdown
    category_breakdown = {}
    total_quantity_lost = 0
    
    for p in expired_products:
        cat = p.get("category", "Unknown")
        if cat not in category_breakdown:
            category_breakdown[cat] = {"count": 0, "quantity": 0}
        category_breakdown[cat]["count"] += 1
        category_breakdown[cat]["quantity"] += p.get("quantity", 0)
        total_quantity_lost += p.get("quantity", 0)
    
    return {
        "month": month,
        "year": year,
        "totalExpired": len(expired_products),
        "totalQuantityLost": total_quantity_lost,
        "products": [serialize_product(p) for p in expired_products],
        "categoryBreakdown": category_breakdown
    }

@app.get("/api/products/categories")
def get_categories(current_user: dict = Depends(get_current_user)):
    categories = db.products.distinct("category", {"userId": current_user["id"]})
    return categories

@app.get("/api/products/alerts")
def get_alerts(current_user: dict = Depends(get_current_user)):
    threshold = current_user["settings"].get("expiryThreshold", 7)
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    threshold_date = today + timedelta(days=threshold)
    
    products = list(db.products.find({
        "userId": current_user["id"],
        "expirationDate": {"$gte": today, "$lte": threshold_date}
    }).sort("expirationDate", 1))
    
    return [serialize_product(p, threshold) for p in products]

@app.get("/api/products")
def get_products(
    search: Optional[str] = None,
    category: Optional[str] = None,
    status: Optional[str] = None,
    startDate: Optional[str] = None,
    endDate: Optional[str] = None,
    sortBy: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    threshold = current_user["settings"].get("expiryThreshold", 7)
    
    query = {"userId": current_user["id"]}
    
    if search:
        query["name"] = {"$regex": search, "$options": "i"}
    if category:
        query["category"] = category
    if startDate or endDate:
        query["expirationDate"] = {}
        if startDate:
            query["expirationDate"]["$gte"] = datetime.fromisoformat(startDate.replace("Z", "+00:00"))
        if endDate:
            query["expirationDate"]["$lte"] = datetime.fromisoformat(endDate.replace("Z", "+00:00"))
    
    sort_field = "expirationDate"
    sort_order = 1
    if sortBy == "newest":
        sort_field = "createdAt"
        sort_order = -1
    elif sortBy == "oldest":
        sort_field = "createdAt"
        sort_order = 1
    elif sortBy == "name":
        sort_field = "name"
        sort_order = 1
    
    products = list(db.products.find(query).sort(sort_field, sort_order))
    
    result = [serialize_product(p, threshold) for p in products]
    
    # Filter by status if provided
    if status:
        result = [p for p in result if p["status"] == status]
    
    return result

@app.get("/api/products/{product_id}")
def get_product(product_id: str, current_user: dict = Depends(get_current_user)):
    threshold = current_user["settings"].get("expiryThreshold", 7)
    
    try:
        product = db.products.find_one({
            "_id": ObjectId(product_id),
            "userId": current_user["id"]
        })
    except:
        raise HTTPException(status_code=404, detail="Invalid product ID")
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return serialize_product(product, threshold)

@app.post("/api/products")
def create_product(product_data: ProductCreate, current_user: dict = Depends(get_current_user)):
    threshold = current_user["settings"].get("expiryThreshold", 7)
    now = datetime.now(timezone.utc)
    
    exp_date = datetime.fromisoformat(product_data.expirationDate.replace("Z", "+00:00"))
    
    product_doc = {
        "name": product_data.name,
        "quantity": product_data.quantity,
        "expirationDate": exp_date,
        "category": product_data.category,
        "userId": current_user["id"],
        "createdAt": now,
        "updatedAt": now
    }
    
    result = db.products.insert_one(product_doc)
    product_doc["_id"] = result.inserted_id
    
    return serialize_product(product_doc, threshold)

@app.patch("/api/products/{product_id}")
def update_product(
    product_id: str,
    product_data: ProductUpdate,
    current_user: dict = Depends(get_current_user)
):
    threshold = current_user["settings"].get("expiryThreshold", 7)
    
    try:
        obj_id = ObjectId(product_id)
    except:
        raise HTTPException(status_code=404, detail="Invalid product ID")
    
    updates = {"updatedAt": datetime.now(timezone.utc)}
    
    if product_data.name is not None:
        updates["name"] = product_data.name
    if product_data.quantity is not None:
        updates["quantity"] = product_data.quantity
    if product_data.expirationDate is not None:
        updates["expirationDate"] = datetime.fromisoformat(product_data.expirationDate.replace("Z", "+00:00"))
    if product_data.category is not None:
        updates["category"] = product_data.category
    
    result = db.products.find_one_and_update(
        {"_id": obj_id, "userId": current_user["id"]},
        {"$set": updates},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return serialize_product(result, threshold)

@app.put("/api/products/{product_id}")
def update_product_put(
    product_id: str,
    product_data: ProductUpdate,
    current_user: dict = Depends(get_current_user)
):
    return update_product(product_id, product_data, current_user)

@app.delete("/api/products/{product_id}")
def delete_product(product_id: str, current_user: dict = Depends(get_current_user)):
    try:
        obj_id = ObjectId(product_id)
    except:
        raise HTTPException(status_code=404, detail="Invalid product ID")
    
    result = db.products.find_one_and_delete({
        "_id": obj_id,
        "userId": current_user["id"]
    })
    
    if not result:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return {"message": "Product deleted successfully", "id": product_id}
