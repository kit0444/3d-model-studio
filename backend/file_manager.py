import os
import requests
import hashlib
from typing import Optional, Dict
from urllib.parse import urlparse
import uuid

# 存储目录配置
STORAGE_BASE = os.path.join(os.path.dirname(__file__), 'storage')
MODELS_DIR = os.path.join(STORAGE_BASE, 'models')
PREVIEWS_DIR = os.path.join(STORAGE_BASE, 'previews')

def init_storage():
    """初始化存储目录"""
    os.makedirs(MODELS_DIR, exist_ok=True)
    os.makedirs(PREVIEWS_DIR, exist_ok=True)

def get_file_extension(url: str) -> str:
    """从URL获取文件扩展名"""
    parsed = urlparse(url)
    path = parsed.path
    if '.' in path:
        return path.split('.')[-1].lower()
    return 'glb'  # 默认扩展名

def generate_filename(original_url: str, prefix: str = '') -> str:
    """生成唯一的文件名"""
    # 使用URL的哈希值生成唯一文件名
    url_hash = hashlib.md5(original_url.encode()).hexdigest()[:12]
    extension = get_file_extension(original_url)
    
    if prefix:
        return f"{prefix}_{url_hash}.{extension}"
    return f"{url_hash}.{extension}"

def download_file(url: str, local_path: str) -> bool:
    """下载文件到本地"""
    try:
        response = requests.get(url, stream=True, timeout=30)
        response.raise_for_status()
        
        # 确保目录存在
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        
        with open(local_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        
        return True
    except Exception as e:
        print(f"下载文件失败 {url}: {e}")
        return False

def download_model_file(model_url: str, model_id: str) -> Optional[str]:
    """下载模型文件"""
    if not model_url:
        return None
    
    filename = generate_filename(model_url, f"model_{model_id}")
    local_path = os.path.join(MODELS_DIR, filename)
    
    # 如果文件已存在，直接返回路径
    if os.path.exists(local_path):
        return local_path
    
    if download_file(model_url, local_path):
        return local_path
    
    return None

def download_preview_image(preview_url: str, model_id: str) -> Optional[str]:
    """下载预览图片"""
    if not preview_url:
        return None
    
    filename = generate_filename(preview_url, f"preview_{model_id}")
    local_path = os.path.join(PREVIEWS_DIR, filename)
    
    # 如果文件已存在，直接返回路径
    if os.path.exists(local_path):
        return local_path
    
    if download_file(preview_url, local_path):
        return local_path
    
    return None

def download_all_formats(download_urls: Dict[str, str], model_id: str) -> Dict[str, str]:
    """下载所有格式的模型文件"""
    local_paths = {}
    
    for format_name, url in download_urls.items():
        if not url:
            continue
            
        filename = generate_filename(url, f"{format_name}_{model_id}")
        local_path = os.path.join(MODELS_DIR, filename)
        
        # 如果文件已存在，直接使用
        if os.path.exists(local_path):
            local_paths[format_name] = local_path
            continue
        
        if download_file(url, local_path):
            local_paths[format_name] = local_path
    
    return local_paths

def get_file_url_for_frontend(local_path: str) -> str:
    """将本地文件路径转换为前端可访问的URL"""
    if not local_path or not os.path.exists(local_path):
        return ""
    
    # 获取相对于storage目录的路径
    rel_path = os.path.relpath(local_path, STORAGE_BASE)
    # 转换为URL格式（使用正斜杠）
    url_path = rel_path.replace('\\', '/')
    return f"/api/files/{url_path}"

def cleanup_old_files(days: int = 7):
    """清理旧文件（可选功能）"""
    import time
    current_time = time.time()
    cutoff_time = current_time - (days * 24 * 60 * 60)
    
    for directory in [MODELS_DIR, PREVIEWS_DIR]:
        for filename in os.listdir(directory):
            file_path = os.path.join(directory, filename)
            if os.path.isfile(file_path):
                file_time = os.path.getmtime(file_path)
                if file_time < cutoff_time:
                    try:
                        os.remove(file_path)
                        print(f"清理旧文件: {filename}")
                    except Exception as e:
                        print(f"清理文件失败 {filename}: {e}")

# 初始化存储目录
init_storage()