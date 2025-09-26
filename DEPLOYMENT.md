# 3D模型生成器 - 部署说明

## 项目概述

这是一个AI驱动的3D模型生成Web应用，采用前后端分离架构：
- **前端**: React + TypeScript + Three.js
- **后端**: Python FastAPI
- **中间件**: Redis (缓存)

## 部署架构

本项目采用混合部署方式：
- 前端和后端直接在本地运行（便于调试）
- 中间件（Redis）通过Docker Compose管理

## 环境要求

### 系统要求
- Windows 10/11 或 Linux/macOS
- Docker 和 Docker Compose
- Python 3.11+
- Node.js 18+

### 开发工具
- Git
- 代码编辑器（推荐 VS Code）

## 快速开始

### 1. 克隆项目
```bash
git clone <repository-url>
cd 3d-model-studio
```

### 2. 启动中间件服务
```bash
# 启动Redis服务
docker-compose up -d

# 检查服务状态
docker-compose ps
```

### 3. 配置环境变量
```bash
# 复制环境变量模板
cp .env.example backend/.env

# 根据需要修改配置
# 编辑 backend/.env 文件
```

### 4. 启动后端服务
```bash
cd backend

# 安装Python依赖
pip install -r requirements.txt

# 启动后端服务
python main.py
```

后端服务将在 `http://localhost:8000` 启动

### 5. 启动前端服务
```bash
cd frontend

# 安装Node.js依赖
npm install

# 启动开发服务器
npm run dev
```

前端服务将在 `http://localhost:5173` 启动

## 详细配置

### Redis配置

Redis服务通过Docker Compose管理，配置文件：`docker-compose.yml`

```yaml
services:
  redis:
    image: redis:7-alpine
    container_name: 3d-studio-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
```

### 后端配置

后端配置通过环境变量管理，主要配置项：

#### Redis连接
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=
```

#### API服务
```env
API_HOST=0.0.0.0
API_PORT=8000
API_RELOAD=true
```

#### 缓存设置
```env
CACHE_TTL=3600
MAX_CACHE_SIZE=1000
```

### 前端配置

前端配置在 `frontend/package.json` 中：

```json
{
  "scripts": {
    "dev": "vite --host 0.0.0.0",
    "build": "tsc && vite build",
    "preview": "vite preview"
  }
}
```

## 服务管理

### 启动所有服务
```bash
# 1. 启动Redis
docker-compose up -d

# 2. 启动后端（新终端）
cd backend && python main.py

# 3. 启动前端（新终端）
cd frontend && npm run dev
```

### 停止服务
```bash
# 停止前端和后端（Ctrl+C）

# 停止Redis
docker-compose down
```

### 重启服务
```bash
# 重启Redis
docker-compose restart

# 重启后端和前端（重新运行启动命令）
```

## 开发调试

### 后端调试
- 后端支持热重载，修改代码后自动重启
- 日志输出到控制台
- API文档：`http://localhost:8000/docs`

### 前端调试
- 前端支持热重载
- 浏览器开发者工具
- React DevTools

### Redis调试
```bash
# 连接Redis CLI
docker exec -it 3d-studio-redis redis-cli

# 查看缓存数据
KEYS *
GET <key>
```

## 生产部署

### 环境变量配置
```env
# 生产环境配置
DEBUG=false
API_RELOAD=false
LOG_LEVEL=WARNING
```

### 前端构建
```bash
cd frontend
npm run build
```

### 性能优化
- 启用Redis持久化
- 配置适当的缓存TTL
- 使用生产级Web服务器（如Nginx）

## 故障排除

### 常见问题

#### Redis连接失败
```bash
# 检查Redis服务状态
docker-compose ps

# 查看Redis日志
docker-compose logs redis

# 重启Redis
docker-compose restart redis
```

#### 后端启动失败
```bash
# 检查Python依赖
pip install -r requirements.txt

# 检查端口占用
netstat -an | findstr :8000

# 查看详细错误信息
python main.py
```

#### 前端启动失败
```bash
# 清理依赖重新安装
rm -rf node_modules package-lock.json
npm install

# 检查Node.js版本
node --version
```

### 日志查看
```bash
# Redis日志
docker-compose logs -f redis

# 后端日志（控制台输出）
# 前端日志（浏览器控制台）
```

## API接口

### 主要端点
- `GET /` - 健康检查
- `POST /api/generate/text` - 文本生成3D模型
- `POST /api/generate/image` - 图片生成3D模型
- `GET /api/history` - 获取生成历史
- `GET /api/stats` - 获取统计信息

### API文档
访问 `http://localhost:8000/docs` 查看完整的API文档

## 安全注意事项

1. 不要在生产环境中使用默认密码
2. 配置适当的CORS策略
3. 使用HTTPS（生产环境）
4. 定期更新依赖包
5. 不要提交敏感信息到版本控制

## 技术支持

如遇到问题，请检查：
1. 环境变量配置是否正确
2. 所有服务是否正常启动
3. 网络连接是否正常
4. 依赖包是否完整安装