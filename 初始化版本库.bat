@echo off
chcp 936 >nul
cd /d "%~dp0"
set "GIT=git"
if exist "D:\Git\cmd\git.exe" set "GIT=D:\Git\cmd\git.exe"

"%GIT%" --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到 Git。请先双击 D:\QLDownload\安装Git到D盘.bat 安装 Git。
    pause
    exit /b 1
)

if not exist ".git" (
    "%GIT%" init -b main
)

"%GIT%" config user.name "delta_app"
"%GIT%" config user.email "delta_app@local"
"%GIT%" add -A
"%GIT%" commit -m "初始版本：陪玩点单系统 v1.0（用户端+管理端+API+SQLite）"

echo.
echo [完成] 版本库已初始化，日常命令：
echo   git status            查看改动了哪些文件
echo   git add -A            把所有改动放入暂存区
echo   git commit -m "说明"   提交一个新版本
echo   git log --oneline     查看版本历史
echo   git restore 文件名     撤销某个文件的修改
echo   git reset --hard HEAD~1   回滚到上一个版本（慎用，会丢弃之后改动）
echo.
pause