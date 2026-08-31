@echo off
title Delta Club - 三角洲俱乐部点单平台

echo ========================================
echo   三角洲俱乐部 · 陪玩点单平台 - 便携版
echo ========================================
echo.

cd /d "%~dp0app"

if not exist "..\node\node.exe" (
    echo [错误] 未找到内置 Node.js，请确认完整解压
    pause
    exit /b 1
)

if not exist ".next\BUILD_ID" (
    echo [提示] 未检测到编译产物，请先运行 npm run build
    pause
    exit /b 1
)

echo   正在启动服务...
echo.
echo ========================================
echo   启动成功后请在浏览器打开:
echo.
echo   http://localhost:3000
echo.
echo   管理后台: http://localhost:3000/admin
echo.
echo   关闭此窗口即可停止服务
echo ========================================
echo.

"..\node\node.exe" --experimental-sqlite server.js

echo.
echo ========================================
echo   服务已停止。如出现错误请截图反馈。
echo ========================================
pause