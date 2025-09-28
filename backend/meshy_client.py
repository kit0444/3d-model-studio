"""
Meshy API客户端
用于与Meshy.ai API进行交互，实现文本生成3D模型功能
基于官方文档: https://docs.meshy.ai/zh/api/text-to-3d
"""

import os
import time
import requests
from typing import Dict, Any, Optional
from config import settings
import logging

logger = logging.getLogger(__name__)

class MeshyClient:
    """Meshy API客户端类"""
    
    def __init__(self):
        self.api_key = settings.MESHY_API_KEY
        self.base_url = settings.MESHY_BASE_URL.rstrip('/')  # 确保没有尾部斜杠
        self.headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json'
        }
        
        if not self.api_key or self.api_key == 'your_meshy_api_key_here':
            logger.warning("Meshy API key not configured properly")
        else:
            logger.info("Meshy API client initialized successfully")
    
    def create_preview_task(self, prompt: str, **kwargs) -> Dict[str, Any]:
        """
        创建文本生成3D预览任务
        
        Args:
            prompt: 描述3D模型的文本提示
            **kwargs: 其他可选参数
                - art_style: 艺术风格 ('realistic' 或 'sculpture')
                - seed: 随机种子
                - ai_model: AI模型 ('meshy-4', 'meshy-5', 'latest')
                - topology: 拓扑结构 ('quad' 或 'triangle')
                - target_polycount: 目标面数
                - should_remesh: 是否重建网格
                - symmetry_mode: 对称模式 ('off', 'auto', 'on')
                - is_a_t_pose: 是否生成A/T Pose
                - moderation: 是否启用内容审核
        
        Returns:
            包含任务ID的响应字典
        """
        url = f"{self.base_url}/openapi/v2/text-to-3d"
        
        # 构建请求数据
        data = {
            'mode': 'preview',
            'prompt': prompt,
            'art_style': kwargs.get('art_style', 'realistic'),
            'ai_model': kwargs.get('ai_model', 'meshy-5'),
            'topology': kwargs.get('topology', 'triangle'),
            'target_polycount': kwargs.get('target_polycount', 30000),
            'should_remesh': kwargs.get('should_remesh', True),
            'symmetry_mode': kwargs.get('symmetry_mode', 'auto'),
            'is_a_t_pose': kwargs.get('is_a_t_pose', False),
            'moderation': kwargs.get('moderation', False)
        }
        
        # 添加可选参数
        if 'seed' in kwargs:
            data['seed'] = kwargs['seed']
        
        try:
            response = requests.post(url, json=data, headers=self.headers)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to create preview task: {e}")
            raise Exception(f"创建预览任务失败: {str(e)}")
    
    def create_refine_task(self, preview_task_id: str, **kwargs) -> Dict[str, Any]:
        """
        创建文本生成3D精细化任务
        
        Args:
            preview_task_id: 预览任务ID
            **kwargs: 其他可选参数
                - enable_pbr: 是否生成PBR贴图
                - texture_prompt: 贴图文本提示
                - texture_image_url: 贴图图片URL
                - ai_model: AI模型
                - moderation: 是否启用内容审核
        
        Returns:
            包含任务ID的响应字典
        """
        url = f"{self.base_url}/openapi/v2/text-to-3d"
        
        data = {
            'mode': 'refine',
            'preview_task_id': preview_task_id,
            'enable_pbr': kwargs.get('enable_pbr', False),
            'ai_model': kwargs.get('ai_model', 'meshy-5'),
            'moderation': kwargs.get('moderation', False)
        }
        
        # 添加可选的贴图参数
        if 'texture_prompt' in kwargs:
            data['texture_prompt'] = kwargs['texture_prompt']
        elif 'texture_image_url' in kwargs:
            data['texture_image_url'] = kwargs['texture_image_url']
        
        try:
            response = requests.post(url, json=data, headers=self.headers)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to create refine task: {e}")
            raise Exception(f"创建精细化任务失败: {str(e)}")
    
    def get_task_status(self, task_id: str) -> Dict[str, Any]:
        """
        获取任务状态
        
        Args:
            task_id: 任务ID
        
        Returns:
            任务状态信息
        """
        url = f"{self.base_url}/openapi/v2/text-to-3d/{task_id}"
        
        try:
            response = requests.get(url, headers=self.headers)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to get task status: {e}")
            raise Exception(f"获取任务状态失败: {str(e)}")
    
    def wait_for_task_completion(self, task_id: str, max_wait_time: int = 300, 
                               check_interval: int = 10) -> Dict[str, Any]:
        """
        等待任务完成
        
        Args:
            task_id: 任务ID
            max_wait_time: 最大等待时间（秒）
            check_interval: 检查间隔（秒）
        
        Returns:
            完成的任务信息
        """
        start_time = time.time()
        
        while time.time() - start_time < max_wait_time:
            try:
                task_info = self.get_task_status(task_id)
                status = task_info.get('status')
                
                logger.info(f"任务 {task_id} 状态: {status}")
                
                if status == 'SUCCEEDED':
                    logger.info(f"任务 {task_id} 完成成功")
                    return task_info
                elif status == 'FAILED':
                    error_msg = task_info.get('error', '未知错误')
                    logger.error(f"任务 {task_id} 失败: {error_msg}")
                    raise Exception(f"任务失败: {error_msg}")
                elif status in ['PENDING', 'IN_PROGRESS']:
                    # 任务仍在进行中，继续等待
                    time.sleep(check_interval)
                else:
                    logger.warning(f"任务 {task_id} 状态未知: {status}")
                    time.sleep(check_interval)
                    
            except Exception as e:
                if "任务失败" in str(e):
                    raise  # 重新抛出任务失败异常
                logger.error(f"检查任务状态时出错: {e}")
                time.sleep(check_interval)
        
        raise Exception(f"任务超时: {task_id}")
    
    def generate_3d_model(self, prompt: str, enable_refine: bool = True, 
                         **kwargs) -> Dict[str, Any]:
        """
        完整的3D模型生成流程
        
        Args:
            prompt: 文本提示
            enable_refine: 是否启用精细化
            **kwargs: 其他参数
        
        Returns:
            生成的模型信息
        """
        try:
            # 第一阶段：创建预览任务
            logger.info(f"开始创建预览任务: {prompt}")
            preview_response = self.create_preview_task(prompt, **kwargs)
            preview_task_id = preview_response['result']
            
            # 等待预览任务完成
            logger.info(f"等待预览任务完成: {preview_task_id}")
            preview_result = self.wait_for_task_completion(preview_task_id)
            
            if not enable_refine:
                return preview_result
            
            # 第二阶段：创建精细化任务
            logger.info(f"开始创建精细化任务: {preview_task_id}")
            refine_response = self.create_refine_task(preview_task_id, **kwargs)
            refine_task_id = refine_response['result']
            
            # 等待精细化任务完成
            logger.info(f"等待精细化任务完成: {refine_task_id}")
            refine_result = self.wait_for_task_completion(refine_task_id)
            
            return refine_result
            
        except Exception as e:
            logger.error(f"3D模型生成失败: {e}")
            raise

# 创建全局客户端实例
meshy_client = MeshyClient()