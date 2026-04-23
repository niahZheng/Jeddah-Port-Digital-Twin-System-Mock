#!/bin/bash

# 吉达港口数字孪生系统 - 停止脚本
# Jeddah Port Digital Twin System - Stop Script

echo "======================================"
echo "停止吉达港口数字孪生系统"
echo "Stopping Jeddah Port Digital Twin System"
echo "======================================"

# 检查 PID 文件目录是否存在
if [ ! -d ".pids" ]; then
    echo "⚠️  未找到运行中的服务"
    exit 0
fi

# 停止后端
if [ -f ".pids/backend.pid" ]; then
    BACKEND_PID=$(cat .pids/backend.pid)
    if ps -p $BACKEND_PID > /dev/null 2>&1; then
        echo "停止后端服务 (PID: $BACKEND_PID)..."
        kill $BACKEND_PID
        # 等待进程结束
        sleep 2
        # 如果进程仍在运行，强制终止
        if ps -p $BACKEND_PID > /dev/null 2>&1; then
            echo "强制终止后端服务..."
            kill -9 $BACKEND_PID
        fi
        echo "✅ 后端服务已停止"
    else
        echo "⚠️  后端服务未运行"
    fi
    rm .pids/backend.pid
else
    echo "⚠️  未找到后端 PID 文件"
fi

# 停止前端
if [ -f ".pids/frontend.pid" ]; then
    FRONTEND_PID=$(cat .pids/frontend.pid)
    if ps -p $FRONTEND_PID > /dev/null 2>&1; then
        echo "停止前端服务 (PID: $FRONTEND_PID)..."
        kill $FRONTEND_PID
        # 等待进程结束
        sleep 2
        # 如果进程仍在运行，强制终止
        if ps -p $FRONTEND_PID > /dev/null 2>&1; then
            echo "强制终止前端服务..."
            kill -9 $FRONTEND_PID
        fi
        echo "✅ 前端服务已停止"
    else
        echo "⚠️  前端服务未运行"
    fi
    rm .pids/frontend.pid
else
    echo "⚠️  未找到前端 PID 文件"
fi

# 额外清理：查找并终止可能残留的 node 进程
echo ""
echo "检查残留进程..."
BACKEND_PROCESSES=$(ps aux | grep "tsx watch src/index.ts" | grep -v grep | awk '{print $2}')
FRONTEND_PROCESSES=$(ps aux | grep "vite" | grep -v grep | awk '{print $2}')

if [ ! -z "$BACKEND_PROCESSES" ]; then
    echo "发现残留的后端进程，正在清理..."
    echo $BACKEND_PROCESSES | xargs kill -9 2>/dev/null
fi

if [ ! -z "$FRONTEND_PROCESSES" ]; then
    echo "发现残留的前端进程，正在清理..."
    echo $FRONTEND_PROCESSES | xargs kill -9 2>/dev/null
fi

echo ""
echo "======================================"
echo "✅ 系统已完全停止"
echo "======================================"

# Made with Bob
