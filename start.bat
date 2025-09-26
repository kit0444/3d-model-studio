@echo off
echo ========================================
echo    3D模型生成器 - 启动脚本
echo ========================================
echo.

echo [1/3] 启动Redis服务...
docker-compose up -d
if %errorlevel% neq 0 (
    echo 错误: Redis启动失败
    pause
    exit /b 1
)
echo ✅ Redis服务启动成功

echo.
echo [2/3] 启动后端服务...
echo 请在新的终端窗口中运行以下命令:
echo cd backend ^&^& python main.py
echo.

echo [3/3] 启动前端服务...
echo 请在另一个新的终端窗口中运行以下命令:
echo cd frontend ^&^& npm run dev
echo.

echo ========================================
echo 服务启动完成！
echo ========================================
echo 前端地址: http://localhost:5173
echo 后端地址: http://localhost:8000
echo API文档: http://localhost:8000/docs
echo ========================================
echo.
echo 按任意键退出...
pause > nul