from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import uvicorn
import os
from typing import Optional, List
import json
import hashlib
import redis
import asyncio
from datetime import datetime
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# 创建FastAPI应用
app = FastAPI(
    title="AI 3D Model Generator API",
    description="AI驱动的3D模型生成服务",
    version="1.0.0"
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Redis连接配置
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
REDIS_DB = int(os.getenv("REDIS_DB", "0"))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", "")

# Redis连接
try:
    redis_client = redis.Redis(
        host=REDIS_HOST, 
        port=REDIS_PORT, 
        db=REDIS_DB, 
        password=REDIS_PASSWORD if REDIS_PASSWORD else None,
        decode_responses=True
    )
    redis_client.ping()
    print(f"✅ Redis连接成功 ({REDIS_HOST}:{REDIS_PORT})")
except Exception as e:
    redis_client = None
    print(f"⚠️ Redis连接失败: {e}，将使用内存缓存")

# 数据模型
class TextGenerateRequest(BaseModel):
    text: str
    complexity: Optional[str] = "medium"
    format: Optional[str] = "obj"

class GenerateResponse(BaseModel):
    success: bool
    model_id: str
    model_url: Optional[str] = None
    preview_url: Optional[str] = None
    message: str
    quality_score: Optional[float] = None

class ModelInfo(BaseModel):
    id: str
    input_type: str
    input_content: str
    created_at: str
    model_url: Optional[str] = None
    quality_score: Optional[float] = None

# 内存缓存（Redis不可用时使用）
memory_cache = {}
model_history = []

def get_cache_key(content: str, input_type: str) -> str:
    """生成缓存键"""
    content_hash = hashlib.md5(f"{input_type}:{content}".encode()).hexdigest()
    return f"model_cache:{content_hash}"

def save_to_cache(key: str, data: dict):
    """保存到缓存"""
    if redis_client:
        redis_client.setex(key, 3600, json.dumps(data))  # 1小时过期
    else:
        memory_cache[key] = data

def get_from_cache(key: str) -> Optional[dict]:
    """从缓存获取"""
    if redis_client:
        cached = redis_client.get(key)
        return json.loads(cached) if cached else None
    else:
        return memory_cache.get(key)

async def simulate_3d_generation(input_content: str, input_type: str) -> dict:
    """模拟3D模型生成（实际项目中这里会调用真实的API）"""
    # 模拟生成时间
    await asyncio.sleep(2)
    
    # 生成模型ID
    model_id = hashlib.md5(f"{input_content}:{datetime.now().isoformat()}".encode()).hexdigest()[:12]
    
    # 模拟质量评分
    import random
    quality_score = round(random.uniform(0.7, 0.95), 2)
    
    return {
        "model_id": model_id,
        "model_url": f"/api/models/{model_id}.obj",
        "preview_url": f"/api/previews/{model_id}.jpg",
        "quality_score": quality_score
    }

@app.get("/")
async def root():
    return {"message": "AI 3D Model Generator API", "status": "running"}

@app.post("/api/generate/text", response_model=GenerateResponse)
async def generate_from_text(request: TextGenerateRequest):
    """根据文本生成3D模型"""
    try:
        # 检查缓存
        cache_key = get_cache_key(request.text, "text")
        cached_result = get_from_cache(cache_key)
        
        if cached_result:
            return GenerateResponse(
                success=True,
                model_id=cached_result["model_id"],
                model_url=cached_result["model_url"],
                preview_url=cached_result["preview_url"],
                message="从缓存获取模型",
                quality_score=cached_result["quality_score"]
            )
        
        # 生成新模型
        result = await simulate_3d_generation(request.text, "text")
        
        # 保存到缓存
        save_to_cache(cache_key, result)
        
        # 保存到历史记录
        model_info = ModelInfo(
            id=result["model_id"],
            input_type="text",
            input_content=request.text,
            created_at=datetime.now().isoformat(),
            model_url=result["model_url"],
            quality_score=result["quality_score"]
        )
        model_history.append(model_info.dict())
        
        return GenerateResponse(
            success=True,
            model_id=result["model_id"],
            model_url=result["model_url"],
            preview_url=result["preview_url"],
            message="3D模型生成成功",
            quality_score=result["quality_score"]
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"生成失败: {str(e)}")

@app.post("/api/generate/image", response_model=GenerateResponse)
async def generate_from_image(file: UploadFile = File(...)):
    """根据图片生成3D模型"""
    try:
        # 验证文件类型
        if not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="请上传图片文件")
        
        # 读取文件内容
        content = await file.read()
        content_hash = hashlib.md5(content).hexdigest()
        
        # 检查缓存
        cache_key = get_cache_key(content_hash, "image")
        cached_result = get_from_cache(cache_key)
        
        if cached_result:
            return GenerateResponse(
                success=True,
                model_id=cached_result["model_id"],
                model_url=cached_result["model_url"],
                preview_url=cached_result["preview_url"],
                message="从缓存获取模型",
                quality_score=cached_result["quality_score"]
            )
        
        # 生成新模型
        result = await simulate_3d_generation(file.filename, "image")
        
        # 保存到缓存
        save_to_cache(cache_key, result)
        
        # 保存到历史记录
        model_info = ModelInfo(
            id=result["model_id"],
            input_type="image",
            input_content=file.filename,
            created_at=datetime.now().isoformat(),
            model_url=result["model_url"],
            quality_score=result["quality_score"]
        )
        model_history.append(model_info.dict())
        
        return GenerateResponse(
            success=True,
            model_id=result["model_id"],
            model_url=result["model_url"],
            preview_url=result["preview_url"],
            message="3D模型生成成功",
            quality_score=result["quality_score"]
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"生成失败: {str(e)}")

@app.get("/api/history", response_model=List[ModelInfo])
async def get_history():
    """获取生成历史"""
    return model_history

@app.get("/api/stats")
async def get_stats():
    """获取统计信息"""
    total_models = len(model_history)
    avg_quality = sum(m.get("quality_score", 0) for m in model_history) / max(total_models, 1)
    
    return {
        "total_models": total_models,
        "average_quality": round(avg_quality, 2),
        "cache_hits": len(memory_cache) if not redis_client else "Redis缓存",
        "api_calls_saved": sum(1 for m in model_history if "缓存" in m.get("message", ""))
    }

if __name__ == "__main__":
    # 从环境变量获取配置
    host = os.getenv("API_HOST", "0.0.0.0")
    port = int(os.getenv("API_PORT", "8000"))
    reload = os.getenv("API_RELOAD", "true").lower() == "true"
    
    uvicorn.run(app, host=host, port=port, reload=reload)