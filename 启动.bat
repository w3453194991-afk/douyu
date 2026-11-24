@echo off
chcp 65001 >nul
cd /d "%~dp0"

if not exist "node_modules\express" (
  echo 正在安装依赖，请稍候...
  call npm install
)

if not exist "dist\index.html" (
  echo 正在构建豆屿...
  call npm run build
)

echo.
echo   豆屿 BEAD ISLE
echo   浏览器地址：http://127.0.0.1:8787
echo   关闭这个窗口即可停止服务。
echo.
start "" /b powershell -NoProfile -Command "Start-Sleep -Seconds 2; Start-Process 'http://127.0.0.1:8787'"
call npm start
pause
