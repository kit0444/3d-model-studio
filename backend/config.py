"""
配置管理模块
集中管理所有环境变量和应用配置
"""
import os
from typing import Optional
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

class Settings:
    """应用配置类"""
    
    # Redis配置
    REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))
    REDIS_DB: int = int(os.getenv("REDIS_DB", "0"))
    REDIS_PASSWORD: Optional[str] = os.getenv("REDIS_PASSWORD", "") or None
    
    # API配置
    API_HOST: str = os.getenv("API_HOST", "0.0.0.0")
    API_PORT: int = int(os.getenv("API_PORT", "8000"))
    API_RELOAD: bool = os.getenv("API_RELOAD", "true").lower() == "true"
    
    # 3D模型生成API配置
    MESHY_API_KEY: Optional[str] = os.getenv("MESHY_API_KEY")
    MESHY_BASE_URL: str = os.getenv("MESHY_BASE_URL", "https://api.meshy.ai")
    
    # 文件存储配置
    MODEL_STORAGE_PATH: str = os.getenv("MODEL_STORAGE_PATH", "./storage/models")
    PREVIEW_STORAGE_PATH: str = os.getenv("PREVIEW_STORAGE_PATH", "./storage/previews")
    
    # 缓存配置
    CACHE_TTL: int = int(os.getenv("CACHE_TTL", "3600"))  # 1小时
    MAX_CACHE_SIZE: int = int(os.getenv("MAX_CACHE_SIZE", "1000"))
    
    # 开发环境配置
    DEBUG: bool = os.getenv("DEBUG", "true").lower() == "true"
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    
    def __init__(self):
        """初始化时创建必要的目录"""
        os.makedirs(self.MODEL_STORAGE_PATH, exist_ok=True)
        os.makedirs(self.PREVIEW_STORAGE_PATH, exist_ok=True)

# 创建全局配置实例
settings = Settings()