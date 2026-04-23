#!/bin/bash

# 吉达港口数字孪生系统 - 启动脚本
# Jeddah Port Digital Twin System - Start Script

echo "======================================"
echo "启动吉达港口数字孪生系统"
echo "Starting Jeddah Port Digital Twin System"
echo "======================================"

# 加载 NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# 使用项目指定的 Node 版本
if [ -f ".nvmrc" ]; then
    echo "使用 .nvmrc 指定的 Node 版本..."
    nvm use
fi

# 检查 node_modules 是否存在
if [ ! -d "node_modules" ]; then
    echo "首次运行，正在安装依赖..."
    npm install
fi

# 创建 PID 文件目录
mkdir -p .pids

# 启动后端
echo ""
echo "启动后端服务..."
cd backend
nohup npm run dev > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > ../.pids/backend.pid
cd ..
echo "后端服务已启动 (PID: $BACKEND_PID)"

# 等待后端启动
sleep 3

# 启动前端
echo ""
echo "启动前端服务..."
cd frontend
nohup npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > ../.pids/frontend.pid
cd ..
echo "前端服务已启动 (PID: $FRONTEND_PID)"

# 等待服务完全启动
sleep 5

echo ""
echo "======================================"
echo "✅ 系统启动完成！"
echo "======================================"
echo "前端地址: http://localhost:5173"
echo "后端地址: http://localhost:3000"
echo ""
echo "查看日志:"
echo "  后端日志: tail -f logs/backend.log"
echo "  前端日志: tail -f logs/frontend.log"
echo ""
echo "停止服务: ./stop.sh"
echo "======================================"

# Made with Bob
