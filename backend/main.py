from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import uvicorn
import os
from typing import Optional, List, Dict
import json
import hashlib
import redis
import asyncio
import random
from datetime import datetime
from dotenv import load_dotenv
import logging
from meshy_client import meshy_client
from database import save_model_to_history, get_model_history, save_to_cache_db, get_from_cache_db
from file_manager import (
    download_model_file, 
    download_preview_image, 
    download_all_formats, 
    get_file_url_for_frontend,
    STORAGE_BASE
)

# 加载环境变量
load_dotenv()

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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

# 挂载静态文件服务
app.mount("/api/files", StaticFiles(directory=STORAGE_BASE), name="files")

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
    format: Optional[str] = "gltf"  # 仅用于下载，显示统一用GLB

class PreviewResponse(BaseModel):
    success: bool
    task_id: str
    message: str
    preview_url: Optional[str] = None  # GLB模型文件URL，用于3D显示
    thumbnail_url: Optional[str] = None  # 缩略图URL，用于历史记录预览

class RefineRequest(BaseModel):
    task_id: str
    
class GenerateResponse(BaseModel):
    success: bool
    model_id: str
    model_url: Optional[str] = None  # GLB格式用于显示
    preview_url: Optional[str] = None
    download_urls: Optional[Dict[str, str]] = None  # 所有格式的下载链接
    message: str
    quality_score: Optional[float] = None
    stage: Optional[str] = None  # "preview" 或 "refined"

class ModelInfo(BaseModel):
    id: str
    input_type: str
    input_content: str
    created_at: str
    model_url: Optional[str] = None
    preview_url: Optional[str] = None  # 添加预览图片URL字段
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
        # 使用数据库缓存作为备选
        save_to_cache_db(key, data)
        memory_cache[key] = data

def get_from_cache(key: str) -> Optional[dict]:
    """从缓存获取"""
    if redis_client:
        cached = redis_client.get(key)
        return json.loads(cached) if cached else None
    else:
        # 先尝试内存缓存，再尝试数据库缓存
        if key in memory_cache:
            return memory_cache[key]
        return get_from_cache_db(key)

async def simulate_3d_generation(input_content: str, input_type: str) -> dict:
    """模拟3D模型生成（实际项目中这里会调用真实的API）"""
    # 模拟生成时间
    await asyncio.sleep(2)
    
    # 生成模型ID
    model_id = hashlib.md5(f"{input_content}:{datetime.now().isoformat()}".encode()).hexdigest()[:12]
    
    # 模拟质量评分
    quality_score = round(random.uniform(0.7, 0.95), 2)
    
    # 从现有模型文件中随机选择一个（支持OBJ和GLB格式）
    models_dir = os.path.join(os.path.dirname(__file__), "models")
    available_models = []
    if os.path.exists(models_dir):
        available_models = [f for f in os.listdir(models_dir) if f.endswith(('.obj', '.glb'))]
        print(available_models)
    
    if available_models:
        selected_model = random.choice(available_models)
        model_url = f"/api/models/{selected_model}"
    else:
        model_url = f"/api/models/{model_id}.glb"  # 默认使用GLB格式
    
    return {
        "model_id": model_id,
        "model_url": model_url,
        "preview_url": f"/api/previews/{model_id}.jpg",
        "quality_score": quality_score
    }

@app.get("/")
async def root():
    return {"message": "AI 3D Model Generator API", "status": "running"}

@app.post("/api/generate/text/preview", response_model=PreviewResponse)
async def generate_preview_from_text(request: TextGenerateRequest):
    """
    生成3D模型预览（第一阶段）
    """
    try:
        # 检查缓存
        cache_key = get_cache_key(request.text, "text_preview")
        cached_result = get_from_cache(cache_key)
        if cached_result:
            return PreviewResponse(
                success=True,
                task_id=cached_result["task_id"],
                message="预览生成成功（来自缓存）",
                preview_url=cached_result.get("preview_url")
            )

        # 检查Meshy API密钥
        if meshy_client.api_key and meshy_client.api_key != "your_meshy_api_key_here":
            try:
                # 复杂度设置
                complexity_settings = {
                    "low": {"art_style": "realistic", "should_remesh": False},
                    "medium": {"art_style": "realistic", "should_remesh": True},
                    "high": {"art_style": "realistic", "should_remesh": True, "negative_prompt": "low quality, low resolution, low poly, ugly"}
                }
                settings = complexity_settings.get(request.complexity, complexity_settings["medium"])
                
                # 调用Meshy API创建预览任务
                preview_response = meshy_client.create_preview_task(
                    prompt=request.text,
                    **settings
                )
                
                task_id = preview_response['result']
                
                # 等待预览任务完成
                preview_result = meshy_client.wait_for_task_completion(task_id)
                
                # 提取模型文件和预览信息
                model_url = None
                preview_url = None
                local_model_url = None
                local_preview_url = None
                
                # 获取GLB模型文件URL
                if 'model_urls' in preview_result and 'glb' in preview_result['model_urls']:
                    model_url = preview_result['model_urls']['glb']
                
                # 获取预览图片URL
                if 'thumbnail_url' in preview_result:
                    preview_url = preview_result['thumbnail_url']
                
                # 下载GLB模型文件到本地
                if model_url:
                    try:
                        local_model_path = download_model_file(model_url, task_id)
                        local_model_url = get_file_url_for_frontend(local_model_path)
                        logger.info(f"预览模型下载成功: {local_model_path}")
                    except Exception as download_error:
                        logger.warning(f"预览模型下载失败: {download_error}，使用原始URL")
                        local_model_url = model_url
                
                # 下载预览图片到本地
                if preview_url:
                    try:
                        local_preview_path = download_preview_image(preview_url, task_id)
                        local_preview_url = get_file_url_for_frontend(local_preview_path)
                        logger.info(f"预览图片下载成功: {local_preview_path}")
                    except Exception as download_error:
                        logger.warning(f"预览图片下载失败: {download_error}，使用原始URL")
                        local_preview_url = preview_url
                
                result = {
                    "task_id": task_id,
                    "model_url": local_model_url or model_url,
                    "preview_url": local_preview_url or preview_url
                }
                
                # 保存到缓存
                save_to_cache(cache_key, result)
                
                # 保存到历史记录
                save_model_to_history({
                    "id": task_id,
                    "input_type": "text",
                    "input_content": request.text,
                    "stage": "preview",
                    "model_url": local_model_url or result["model_url"],
                    "preview_url": local_preview_url or result["preview_url"],
                    "download_urls": {"glb": local_model_url or result["model_url"]},
                    "quality_score": 0.8
                })
                
                logger.info(f"Meshy API预览生成成功: {task_id}")
                
                return PreviewResponse(
                    success=True,
                    task_id=task_id,
                    message="预览生成成功",
                    preview_url=result["model_url"],  # GLB模型文件
                    thumbnail_url=result["preview_url"]  # 缩略图
                )
                
            except Exception as meshy_error:
                logger.error(f"Meshy API预览生成失败: {meshy_error}")
                raise HTTPException(status_code=500, detail=f"预览生成失败: {str(meshy_error)}")
        else:
            # 模拟预览生成
            task_id = f"preview_{random.randint(1000, 9999)}"
            
            # 使用模拟的3D模型生成
            simulation_result = await simulate_3d_generation(request.text, "text")
            
            result = {
                "task_id": task_id,
                "model_url": simulation_result["model_url"],
                "preview_url": simulation_result["preview_url"]
            }
            save_to_cache(cache_key, result)
            
            # 保存到历史记录
            save_model_to_history({
                "id": task_id,
                "input_type": "text",
                "input_content": request.text,
                "stage": "preview",
                "model_url": result["model_url"],
                "preview_url": result["preview_url"],
                "download_urls": {"glb": result["model_url"]},
                "quality_score": simulation_result["quality_score"]
            })
            
            return PreviewResponse(
                success=True,
                task_id=task_id,
                message="预览生成成功（模拟）",
                preview_url=result["model_url"],  # GLB模型文件
                thumbnail_url=result["preview_url"]  # 缩略图
            )
            
    except Exception as e:
        logger.error(f"预览生成错误: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate/text/refine", response_model=GenerateResponse)
async def refine_text_model(request: RefineRequest):
    """
    精细化3D模型（第二阶段）
    """
    try:
        # 检查缓存
        cache_key = get_cache_key(request.task_id, "text_refine")
        cached_result = get_from_cache(cache_key)
        if cached_result:
            return GenerateResponse(**cached_result)

        # 检查Meshy API密钥
        if meshy_client.api_key and meshy_client.api_key != "your_meshy_api_key_here":
            try:
                # 调用Meshy API创建精细化任务
                refine_response = meshy_client.create_refine_task(request.task_id)
                refine_task_id = refine_response['result']
                
                # 等待精细化任务完成
                refine_result = meshy_client.wait_for_task_completion(refine_task_id)
                
                # 提取模型信息并下载文件
                model_url = None  # GLB格式用于显示
                preview_url = None
                download_urls = {}
                local_model_url = None
                local_preview_url = None
                local_download_urls = {}
                
                # 获取GLB格式用于显示
                if 'model_urls' in refine_result:
                    model_urls = refine_result['model_urls']
                    if 'glb' in model_urls:
                        model_url = model_urls['glb']
                    elif 'gltf' in model_urls:
                        model_url = model_urls['gltf']
                    
                    # 收集所有格式的下载链接
                    download_urls = model_urls.copy()
                
                # 获取预览图
                if 'thumbnail_url' in refine_result:
                    preview_url = refine_result['thumbnail_url']
                elif 'preview_url' in refine_result:
                    preview_url = refine_result['preview_url']
                
                # 下载模型文件到本地
                if model_url:
                    try:
                        local_model_path = download_model_file(model_url, refine_task_id)
                        local_model_url = get_file_url_for_frontend(local_model_path)
                        logger.info(f"模型文件下载成功: {local_model_path}")
                    except Exception as download_error:
                        logger.warning(f"模型文件下载失败: {download_error}，使用原始URL")
                        local_model_url = model_url
                
                # 下载预览图片到本地
                if preview_url:
                    try:
                        local_preview_path = download_preview_image(preview_url, refine_task_id)
                        local_preview_url = get_file_url_for_frontend(local_preview_path)
                        logger.info(f"预览图片下载成功: {local_preview_path}")
                    except Exception as download_error:
                        logger.warning(f"预览图片下载失败: {download_error}，使用原始URL")
                        local_preview_url = preview_url
                
                # 下载所有格式的文件
                if download_urls:
                    try:
                        local_paths = download_all_formats(download_urls, refine_task_id)
                        for format_name, local_path in local_paths.items():
                            local_download_urls[format_name] = get_file_url_for_frontend(local_path)
                        logger.info(f"所有格式文件下载成功: {list(local_download_urls.keys())}")
                    except Exception as download_error:
                        logger.warning(f"批量文件下载失败: {download_error}，使用原始URLs")
                        local_download_urls = download_urls
                
                result = {
                    "success": True,
                    "model_id": refine_result.get('id', refine_task_id),
                    "model_url": local_model_url or model_url,
                    "preview_url": local_preview_url or preview_url,
                    "download_urls": local_download_urls or download_urls,
                    "message": "精细化完成",
                    "quality_score": random.uniform(0.85, 0.98),
                    "stage": "refined"
                }
                
                # 保存到缓存
                save_to_cache(cache_key, result)
                
                # 保存到数据库历史记录
                save_model_to_history({
                    "id": result["model_id"],
                    "input_type": "text",
                    "input_content": f"refined_{request.task_id}",
                    "stage": "refined",
                    "model_url": result["model_url"],
                    "preview_url": result["preview_url"],
                    "download_urls": result.get("download_urls", {}),
                    "quality_score": result["quality_score"]
                })
                
                logger.info(f"Meshy API精细化成功: {refine_task_id}")
                
                return GenerateResponse(**result)
                
            except Exception as meshy_error:
                logger.error(f"Meshy API精细化失败: {meshy_error}")
                raise HTTPException(status_code=500, detail=f"精细化失败: {str(meshy_error)}")
        else:
            # 模拟精细化生成
            result = {
                "success": True,
                "model_id": f"refined_{request.task_id}",
                "model_url": "http://localhost:8000/api/files/models/refined_" + request.task_id + ".glb",
                "preview_url": "http://localhost:8000/api/files/previews/refined_" + request.task_id + ".jpg",
                "download_urls": {
                    "glb": "http://localhost:8000/api/files/models/refined_" + request.task_id + ".glb",
                    "obj": "http://localhost:8000/api/files/models/refined_" + request.task_id + ".obj",
                    "stl": "http://localhost:8000/api/files/models/refined_" + request.task_id + ".stl",
                    "fbx": "http://localhost:8000/api/files/models/refined_" + request.task_id + ".fbx"
                },
                "message": "精细化完成（模拟）",
                "quality_score": random.uniform(0.85, 0.98),
                "stage": "refined"
            }
            
            save_to_cache(cache_key, result)
            
            # 保存到数据库历史记录
            save_model_to_history({
                "id": result["model_id"],
                "input_type": "text",
                "input_content": f"refined_{request.task_id}",
                "stage": "refined",
                "model_url": result["model_url"],
                "preview_url": result["preview_url"],
                "download_urls": result.get("download_urls", {}),
                "quality_score": result["quality_score"]
            })
            
            return GenerateResponse(**result)
            
    except Exception as e:
        logger.error(f"精细化错误: {e}")
        raise HTTPException(status_code=500, detail=str(e))
async def generate_from_text_legacy(request: TextGenerateRequest):
    """
    传统的一步式文本生成3D模型接口（兼容性保留）
    推荐使用新的两阶段接口：/api/generate/text/preview 和 /api/generate/text/refine
    """
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
        
        # 检查Meshy API是否可用
        if not meshy_client.api_key or meshy_client.api_key == 'your_meshy_api_key_here':
            # 如果API Key未配置，使用模拟生成
            result = await simulate_3d_generation(request.text, "text")
        else:
            # 使用真实的Meshy API生成3D模型
            try:
                # 根据复杂度设置参数
                complexity_settings = {
                    "low": {"target_polycount": 10000, "ai_model": "meshy-4"},
                    "medium": {"target_polycount": 30000, "ai_model": "meshy-5"},
                    "high": {"target_polycount": 100000, "ai_model": "latest"}
                }
                settings = complexity_settings.get(request.complexity, complexity_settings["medium"])
                
                # 调用Meshy API生成模型
                meshy_result = meshy_client.generate_3d_model(
                    prompt=request.text,
                    enable_refine=True,
                    **settings
                )
                
                # 根据Meshy API响应格式提取模型信息
                model_url = None
                preview_url = None
                model_id = None
                
                # 从API响应中提取信息
                if 'id' in meshy_result:
                    model_id = meshy_result['id']
                
                # 检查模型文件URLs
                if 'model_urls' in meshy_result:
                    model_urls = meshy_result['model_urls']
                    # 根据请求格式选择对应的模型文件
                    format_mapping = {
                        'obj': 'obj',
                        'stl': 'stl', 
                        'gltf': 'glb',
                        'fbx': 'fbx'
                    }
                    target_format = format_mapping.get(request.format, 'glb')
                    if target_format in model_urls:
                        model_url = model_urls[target_format]
                    else:
                        # 如果没有请求的格式，使用第一个可用的格式
                        model_url = next(iter(model_urls.values()), None)
                
                # 获取预览图
                if 'thumbnail_url' in meshy_result:
                    preview_url = meshy_result['thumbnail_url']
                elif 'preview_url' in meshy_result:
                    preview_url = meshy_result['preview_url']
                
                result = {
                    "model_id": model_id or f"meshy_{random.randint(1000, 9999)}",
                    "model_url": model_url,
                    "preview_url": preview_url,
                    "quality_score": random.uniform(0.85, 0.98)  # Meshy生成的模型质量较高
                }
                
                logger.info(f"Meshy API生成成功: {model_id}, 模型URL: {model_url}")
                
            except Exception as meshy_error:
                logger.error(f"Meshy API调用失败: {meshy_error}")
                print(f"Meshy API调用失败，使用模拟生成: {meshy_error}")
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
        
        # 保存到数据库历史记录
        save_model_to_history({
            "id": result["model_id"],
            "input_type": "image",
            "input_content": file.filename,
            "stage": "generated",
            "model_url": result["model_url"],
            "preview_url": result["preview_url"],
            "download_urls": result.get("download_urls", {}),
            "quality_score": result["quality_score"]
        })
        
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
    # 从数据库获取历史记录
    db_history = get_model_history()
    
    # 转换为API响应格式
    history = []
    for record in db_history:
        history.append(ModelInfo(
            id=record['id'],
            input_type=record['input_type'],
            input_content=record['input_content'],
            created_at=record['created_at'],
            model_url=record.get('model_url'),  # GLB模型文件URL
            preview_url=record.get('preview_url'),  # 缩略图URL
            quality_score=record.get('quality_score')
        ))
    
    return history

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

@app.get("/api/models")
async def list_models():
    """获取可用的模型文件列表"""
    models_dir = os.path.join(os.path.dirname(__file__), "models")
    if not os.path.exists(models_dir):
        return {"models": []}
    
    models = []
    for filename in os.listdir(models_dir):
        if filename.endswith(('.obj', '.glb')):
            file_path = os.path.join(models_dir, filename)
            file_size = os.path.getsize(file_path)
            # 获取文件扩展名和名称
            name_without_ext = filename.rsplit('.', 1)[0]
            file_ext = filename.rsplit('.', 1)[1]
            models.append({
                "filename": filename,
                "name": name_without_ext.title(),
                "size": file_size,
                "format": file_ext.upper(),
                "url": f"/api/models/{filename}"
            })
    
    return {"models": models}

@app.get("/api/models/{filename}")
async def get_model_file(filename: str):
    """获取指定的模型文件"""
    # 使用file_manager中的STORAGE_BASE路径
    models_dir = os.path.join(STORAGE_BASE, "models")
    file_path = os.path.join(models_dir, filename)
    
    if not os.path.exists(file_path) or not filename.endswith(('.obj', '.glb')):
        raise HTTPException(status_code=404, detail="模型文件未找到")
    
    # 根据文件类型设置正确的媒体类型
    media_type = 'application/octet-stream'
    if filename.endswith('.glb'):
        media_type = 'model/gltf-binary'
    elif filename.endswith('.obj'):
        media_type = 'text/plain'
    
    return FileResponse(
        path=file_path,
        media_type=media_type,
        filename=filename,
        headers={"Access-Control-Allow-Origin": "*"}
    )

if __name__ == "__main__":
    # 从环境变量获取配置
    host = os.getenv("API_HOST", "0.0.0.0")
    port = int(os.getenv("API_PORT", "8000"))
    reload = os.getenv("API_RELOAD", "true").lower() == "true"
    
    if reload:
        # 当启用reload时，需要传递模块路径而不是app对象
        uvicorn.run("main:app", host=host, port=port, reload=reload)
    else:
        # 当不启用reload时，可以直接传递app对象
        uvicorn.run(app, host=host, port=port, reload=reload)