import sqlite3
import os
from datetime import datetime
from typing import List, Dict, Optional
import json

DATABASE_PATH = os.path.join(os.path.dirname(__file__), 'storage', 'models.db')

def init_database():
    """初始化数据库"""
    # 确保storage目录存在
    os.makedirs(os.path.dirname(DATABASE_PATH), exist_ok=True)
    
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    # 创建模型历史表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS model_history (
            id TEXT PRIMARY KEY,
            input_type TEXT NOT NULL,
            input_content TEXT NOT NULL,
            complexity TEXT,
            format TEXT,
            stage TEXT,
            model_url TEXT,
            preview_url TEXT,
            download_urls TEXT,
            quality_score REAL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            local_model_path TEXT,
            local_preview_path TEXT
        )
    ''')
    
    # 创建缓存表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS model_cache (
            cache_key TEXT PRIMARY KEY,
            model_data TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    conn.close()

def save_model_to_history(model_data: Dict) -> bool:
    """保存模型到历史记录"""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT OR REPLACE INTO model_history 
            (id, input_type, input_content, complexity, format, stage, 
             model_url, preview_url, download_urls, quality_score, 
             created_at, local_model_path, local_preview_path)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            model_data.get('id'),
            model_data.get('input_type'),
            model_data.get('input_content'),
            model_data.get('complexity'),
            model_data.get('format'),
            model_data.get('stage'),
            model_data.get('model_url'),
            model_data.get('preview_url'),
            json.dumps(model_data.get('download_urls', {})),
            model_data.get('quality_score'),
            model_data.get('created_at', datetime.now().isoformat()),
            model_data.get('local_model_path'),
            model_data.get('local_preview_path')
        ))
        
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"保存模型历史失败: {e}")
        return False

def get_model_history(limit: int = 50) -> List[Dict]:
    """获取模型历史记录"""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, input_type, input_content, complexity, format, stage,
                   model_url, preview_url, download_urls, quality_score,
                   created_at, local_model_path, local_preview_path
            FROM model_history 
            ORDER BY created_at DESC 
            LIMIT ?
        ''', (limit,))
        
        rows = cursor.fetchall()
        conn.close()
        
        history = []
        for row in rows:
            download_urls = {}
            try:
                if row[8]:  # download_urls
                    download_urls = json.loads(row[8])
            except:
                pass
                
            history.append({
                'id': row[0],
                'input_type': row[1],
                'input_content': row[2],
                'complexity': row[3],
                'format': row[4],
                'stage': row[5],
                'model_url': row[6],
                'preview_url': row[7],
                'download_urls': download_urls,
                'quality_score': row[9],
                'created_at': row[10],
                'local_model_path': row[11],
                'local_preview_path': row[12]
            })
        
        return history
    except Exception as e:
        print(f"获取模型历史失败: {e}")
        return []

def save_to_cache_db(cache_key: str, data: Dict) -> bool:
    """保存到数据库缓存"""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT OR REPLACE INTO model_cache (cache_key, model_data, created_at)
            VALUES (?, ?, ?)
        ''', (cache_key, json.dumps(data), datetime.now().isoformat()))
        
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"保存缓存失败: {e}")
        return False

def get_from_cache_db(cache_key: str) -> Optional[Dict]:
    """从数据库缓存获取"""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT model_data FROM model_cache 
            WHERE cache_key = ?
        ''', (cache_key,))
        
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return json.loads(row[0])
        return None
    except Exception as e:
        print(f"获取缓存失败: {e}")
        return None

# 初始化数据库
init_database()