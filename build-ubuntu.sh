#!/bin/bash
# 学霸帝AI Ubuntu 构建脚本

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

echo "=========================================="
echo " 学霸帝AI Ubuntu 构建脚本"
echo "=========================================="
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "安装 Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

echo "Node.js 版本: $(node --version)"
echo "npm 版本: $(npm --version)"

# 检查并安装 Tesseract OCR
if ! command -v tesseract &> /dev/null; then
    echo "安装 Tesseract OCR..."
    sudo apt update
    sudo apt install -y tesseract-ocr tesseract-ocr-chi-sim tesseract-ocr-chi-tra
fi

echo "Tesseract 版本: $(tesseract --version 2>&1 | head -1)"

# 检查并安装 llama.cpp
if ! command -v llama-server &> /dev/null; then
    echo ""
    echo "警告: llama-server 未找到"
    echo "请安装 llama.cpp 或确保 llama-server 在 PATH 中"
    echo ""
    echo "安装方法:"
    echo "  1. 从源码编译: git clone https://github.com/ggml-org/llama.cpp && cd llama.cpp && make"
    echo "  2. 或下载预编译版本"
    echo ""
fi

# 安装项目依赖
echo "安装项目依赖..."
npm install

# 设置 Electron 镜像（如果需要）
export ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"

# 构建 Linux 版本
echo ""
echo "开始构建 Linux 版本..."
npm run build:linux

echo ""
echo "=========================================="
echo " 构建完成！"
echo "=========================================="
echo ""
echo "输出文件:"
ls -lh "$PROJECT_DIR/dist/"*.AppImage 2>/dev/null || true
ls -lh "$PROJECT_DIR/dist/"*.deb 2>/dev/null || true

echo ""
echo "使用方法:"
echo "  AppImage: chmod +x dist/xunba-*.AppImage && ./dist/xunba-*.AppImage"
echo "  deb: sudo dpkg -i dist/xunba_*.deb && xunba"
