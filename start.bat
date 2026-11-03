@echo off
title TechStore PRO - Multi-DB (SQL Server 2025 + MongoDB)
echo ===================================================================
echo     TECHSTORE PRO - FULLSTACK SYSTEM (SQL SERVER + MONGODB)
echo ===================================================================
echo  SQL Server : localhost\SQLEXPRESS2025 (TechStoreDB)
echo  MongoDB    : mongodb://127.0.0.1:27017 (TechStoreDB)
echo  Client Web : http://localhost:5000
echo  Admin Hub  : http://localhost:5000/admin.html
echo ===================================================================
echo.

:: Kiem tra node_modules
if not exist "node_modules" (
  echo [Info] Dang cai dat thu vien npm...
  call npm install
)

:: Khoi dong server va mo trinh duyet sau 2 giay
start cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:5000"

echo [Running] Dang chay Node.js Server...
node server/server.js
pause

