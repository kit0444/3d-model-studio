@echo off
echo ========================================
echo    3D模型生成器 - 停止脚本
echo ========================================
echo.

echo 正在停止Redis服务...
docker-compose down
if %errorlevel% neq 0 (
    echo 警告: Redis停止时出现错误
) else (
    echo ✅ Redis服务已停止
)

echo.
echo ========================================
echo 服务停止完成！
echo ========================================
echo 注意: 请手动停止前端和后端服务 (Ctrl+C)
echo ========================================
echo.
echo 按任意键退出...
pause > nul