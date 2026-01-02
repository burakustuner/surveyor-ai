"""
FastAPI Backend - Google OAuth Authentication & Rate Limiting
"""
from fastapi import FastAPI, Request, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import httpx
import time
import sqlite3
import os
from datetime import datetime, timedelta
from typing import Optional
import logging
from contextlib import contextmanager

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Surveyor AI API Gateway")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Production'da domain'e kısıtla
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer(auto_error=False)

# Config
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://ollama:11434")
DB_PATH = os.getenv("DB_PATH", "/data/db/app.db")
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
RATE_LIMIT_REQUESTS = int(os.getenv("RATE_LIMIT_REQUESTS", "100"))  # İstek sayısı
RATE_LIMIT_WINDOW = int(os.getenv("RATE_LIMIT_WINDOW", "3600"))  # Saniye (1 saat)

# Database setup
def init_db():
    """Veritabanını başlat"""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Rate limiting tablosu
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS rate_limits (
            user_id TEXT PRIMARY KEY,
            requests INTEGER DEFAULT 0,
            window_start INTEGER,
            last_request INTEGER
        )
    """)
    
    # API logları tablosu
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS api_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            endpoint TEXT,
            method TEXT,
            status_code INTEGER,
            response_time REAL,
            ip_address TEXT,
            user_agent TEXT,
            timestamp INTEGER,
            error_message TEXT
        )
    """)
    
    # Kullanıcılar tablosu (Google OAuth için)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            google_id TEXT PRIMARY KEY,
            email TEXT UNIQUE,
            name TEXT,
            picture TEXT,
            first_seen INTEGER,
            last_seen INTEGER
        )
    """)
    
    conn.commit()
    conn.close()
    logger.info(f"Database initialized at {DB_PATH}")

@contextmanager
def get_db():
    """Database connection context manager"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

# Google OAuth token verification
async def verify_google_token(token: str) -> Optional[dict]:
    """Google OAuth token'ı doğrula"""
    if not GOOGLE_CLIENT_ID:
        logger.warning("GOOGLE_CLIENT_ID not set, skipping token verification")
        return {"sub": "anonymous", "email": "anonymous@local"}
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://www.googleapis.com/oauth2/v3/tokeninfo?id_token={token}",
                timeout=5.0
            )
            if response.status_code == 200:
                data = response.json()
                # Client ID kontrolü
                if data.get("aud") == GOOGLE_CLIENT_ID:
                    return data
                else:
                    logger.warning(f"Token client ID mismatch: {data.get('aud')} != {GOOGLE_CLIENT_ID}")
                    return None
            else:
                logger.warning(f"Google token verification failed: {response.status_code}")
                return None
    except Exception as e:
        logger.error(f"Error verifying Google token: {e}")
        return None

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> dict:
    """Mevcut kullanıcıyı al (Google OAuth token'dan)"""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    token = credentials.credentials
    user_info = await verify_google_token(token)
    
    if not user_info:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    
    # Kullanıcıyı veritabanına kaydet/güncelle
    google_id = user_info.get("sub")
    email = user_info.get("email", "")
    name = user_info.get("name", "")
    picture = user_info.get("picture", "")
    now = int(time.time())
    
    with get_db() as db:
        cursor = db.cursor()
        cursor.execute("""
            INSERT OR REPLACE INTO users (google_id, email, name, picture, first_seen, last_seen)
            VALUES (?, ?, ?, ?, 
                COALESCE((SELECT first_seen FROM users WHERE google_id = ?), ?),
                ?)
        """, (google_id, email, name, picture, google_id, now, now))
    
    return {
        "google_id": google_id,
        "email": email,
        "name": name,
        "picture": picture
    }

# Rate limiting
def check_rate_limit(user_id: str) -> tuple[bool, Optional[int]]:
    """Rate limit kontrolü yap"""
    now = int(time.time())
    window_start = now - (now % RATE_LIMIT_WINDOW)
    
    with get_db() as db:
        cursor = db.cursor()
        cursor.execute("""
            SELECT requests, window_start FROM rate_limits WHERE user_id = ?
        """, (user_id,))
        row = cursor.fetchone()
        
        if row:
            stored_requests, stored_window = row["requests"], row["window_start"]
            
            # Yeni pencere başladıysa sıfırla
            if stored_window < window_start:
                cursor.execute("""
                    UPDATE rate_limits 
                    SET requests = 1, window_start = ?, last_request = ?
                    WHERE user_id = ?
                """, (window_start, now, user_id))
                return True, None
            else:
                # Aynı pencerede, limit kontrolü
                if stored_requests >= RATE_LIMIT_REQUESTS:
                    reset_time = stored_window + RATE_LIMIT_WINDOW
                    return False, reset_time
                else:
                    cursor.execute("""
                        UPDATE rate_limits 
                        SET requests = requests + 1, last_request = ?
                        WHERE user_id = ?
                    """, (now, user_id))
                    return True, None
        else:
            # İlk istek
            cursor.execute("""
                INSERT INTO rate_limits (user_id, requests, window_start, last_request)
                VALUES (?, 1, ?, ?)
            """, (user_id, window_start, now))
            return True, None

# Logging middleware
async def log_request(request: Request, user: dict, status_code: int, 
                     response_time: float, error: Optional[str] = None):
    """API isteğini logla"""
    try:
        with get_db() as db:
            cursor = db.cursor()
            cursor.execute("""
                INSERT INTO api_logs 
                (user_id, endpoint, method, status_code, response_time, 
                 ip_address, user_agent, timestamp, error_message)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                user.get("google_id", "anonymous"),
                str(request.url.path),
                request.method,
                status_code,
                response_time,
                request.client.host if request.client else None,
                request.headers.get("user-agent"),
                int(time.time()),
                error
            ))
    except Exception as e:
        logger.error(f"Error logging request: {e}")

# Rate limiting middleware
@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    """Rate limiting middleware"""
    # Auth gerektirmeyen endpoint'ler
    public_endpoints = ["/health", "/docs", "/openapi.json", "/api/user/config"]
    if request.url.path in public_endpoints:
        return await call_next(request)
    
    # Token kontrolü
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return JSONResponse(
            status_code=401,
            content={"detail": "Authentication required"}
        )
    
    token = auth_header.split(" ")[1]
    user_info = await verify_google_token(token)
    
    if not user_info:
        return JSONResponse(
            status_code=401,
            content={"detail": "Invalid or expired token"}
        )
    
    user_id = user_info.get("sub", "anonymous")
    
    # Rate limit kontrolü
    allowed, reset_time = check_rate_limit(user_id)
    
    if not allowed:
        return JSONResponse(
            status_code=429,
            content={
                "detail": "Rate limit exceeded",
                "reset_at": reset_time
            },
            headers={
                "X-RateLimit-Limit": str(RATE_LIMIT_REQUESTS),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": str(reset_time)
            }
        )
    
    # İsteği işle
    start_time = time.time()
    try:
        response = await call_next(request)
        response_time = time.time() - start_time
        
        # Log
        await log_request(
            request,
            {"google_id": user_id},
            response.status_code,
            response_time
        )
        
        # Rate limit headers ekle
        with get_db() as db:
            cursor = db.cursor()
            cursor.execute("""
                SELECT requests FROM rate_limits WHERE user_id = ?
            """, (user_id,))
            row = cursor.fetchone()
            remaining = max(0, RATE_LIMIT_REQUESTS - (row["requests"] if row else 0))
        
        response.headers["X-RateLimit-Limit"] = str(RATE_LIMIT_REQUESTS)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        
        return response
    except Exception as e:
        response_time = time.time() - start_time
        await log_request(
            request,
            {"google_id": user_id},
            500,
            response_time,
            str(e)
        )
        raise

# Health check
@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "ok", "timestamp": int(time.time())}

# Config endpoint (Google Client ID için)
@app.get("/api/user/config")
async def get_config():
    """Frontend config bilgilerini döndür"""
    return {
        "client_id": GOOGLE_CLIENT_ID,
        "rate_limit_requests": RATE_LIMIT_REQUESTS,
        "rate_limit_window": RATE_LIMIT_WINDOW
    }

# User info endpoint (genel proxy route'undan ÖNCE tanımlanmalı)
@app.get("/api/user/me")
async def get_user_info(user: dict = Depends(get_current_user)):
    """Kullanıcı bilgilerini döndür"""
    return user

# Rate limit info endpoint (genel proxy route'undan ÖNCE tanımlanmalı)
@app.get("/api/user/rate-limit")
async def get_rate_limit_info(user: dict = Depends(get_current_user)):
    """Rate limit bilgilerini döndür"""
    user_id = user["google_id"]
    now = int(time.time())
    window_start = now - (now % RATE_LIMIT_WINDOW)
    
    with get_db() as db:
        cursor = db.cursor()
        cursor.execute("""
            SELECT requests, window_start FROM rate_limits WHERE user_id = ?
        """, (user_id,))
        row = cursor.fetchone()
        
        if row and row["window_start"] == window_start:
            remaining = max(0, RATE_LIMIT_REQUESTS - row["requests"])
            reset_time = window_start + RATE_LIMIT_WINDOW
        else:
            remaining = RATE_LIMIT_REQUESTS
            reset_time = window_start + RATE_LIMIT_WINDOW
    
    return {
        "limit": RATE_LIMIT_REQUESTS,
        "remaining": remaining,
        "reset_at": reset_time,
        "window_seconds": RATE_LIMIT_WINDOW
    }

# Ollama proxy endpoints (özel endpoint'lerden SONRA tanımlanmalı)
@app.api_route("/api/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])
async def proxy_to_ollama(path: str, request: Request, user: dict = Depends(get_current_user)):
    """Ollama API'sine proxy"""
    url = f"{OLLAMA_URL}/api/{path}"
    
    # Request body
    body = None
    if request.method in ["POST", "PUT"]:
        body = await request.body()
    
    # Headers
    headers = {
        "Content-Type": request.headers.get("Content-Type", "application/json")
    }
    
    # Ollama'ya istek gönder
    async with httpx.AsyncClient(timeout=3600.0) as client:
        try:
            if request.method == "GET":
                response = await client.get(url, params=dict(request.query_params))
            elif request.method == "POST":
                response = await client.post(url, content=body, headers=headers)
            elif request.method == "PUT":
                response = await client.put(url, content=body, headers=headers)
            elif request.method == "DELETE":
                response = await client.delete(url)
            else:
                return JSONResponse(status_code=405, content={"detail": "Method not allowed"})
            
            # Streaming response
            if "stream" in path or "chat" in path:
                async def generate():
                    async for chunk in response.aiter_bytes():
                        yield chunk
                
                return StreamingResponse(
                    generate(),
                    status_code=response.status_code,
                    media_type=response.headers.get("content-type", "application/json")
                )
            else:
                return JSONResponse(
                    content=response.json() if response.headers.get("content-type", "").startswith("application/json") else {"data": response.text},
                    status_code=response.status_code
                )
        except httpx.TimeoutException:
            return JSONResponse(
                status_code=504,
                content={"detail": "Ollama timeout"}
            )
        except Exception as e:
            logger.error(f"Error proxying to Ollama: {e}")
            return JSONResponse(
                status_code=502,
                content={"detail": f"Ollama error: {str(e)}"}
            )

# Startup
@app.on_event("startup")
async def startup():
    """Uygulama başlatıldığında"""
    init_db()
    logger.info("Backend API started")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

