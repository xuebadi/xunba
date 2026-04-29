# 学霸帝AI - Ubuntu/Linux 版本

基于 Qwen2.5-VL-3B 的本地智能助手，支持中文 OCR 识别和图片理解。

## 快速开始

### 方式一：使用构建脚本（一键）

```bash
# 克隆仓库
git clone https://github.com/xuebadi/xunba.git
cd xunba

# 运行构建脚本
chmod +x build-ubuntu.sh
./build-ubuntu.sh
```

### 方式二：手动构建

```bash
# 1. 安装依赖
sudo apt update
sudo apt install -y nodejs npm tesseract-ocr tesseract-ocr-chi-sim tesseract-ocr-chi-tra

# 2. 安装项目依赖
npm install

# 3. 构建
npm run build:linux
```

## 功能

- **本地模型推理**：使用 llama.cpp + Qwen2.5-VL-3B，完全离线运行
- **中文 OCR 识别**：基于 Tesseract，支持简体中文和繁体中文
- **图片理解**：支持上传图片，AI 分析图片内容
- **隐私安全**：所有处理都在本地完成，不上传任何数据

## 系统要求

- Ubuntu 20.04+ 或其他 Linux 发行版
- Node.js 18+
- 内存：建议 8GB+，模型需要约 4GB
- Tesseract OCR（用于图片文字识别）

## OCR 安装

```bash
sudo apt install -y tesseract-ocr tesseract-ocr-chi-sim tesseract-ocr-chi-tra
```

## llama.cpp 安装

```bash
# 从源码编译 (推荐)
git clone https://github.com/ggml-org/llama.cpp
cd llama.cpp
cmake -B build
cmake --build build --config Release -j $(nproc)
sudo cp build/bin/llama-server /usr/local/bin/
```

## 模型下载

首次运行需要下载模型文件到 `~/.xuebadi-ai/models/`：

```bash
mkdir -p ~/.xuebadi-ai/models
cd ~/.xuebadi-ai/models

# 从 ModelScope 下载
wget https://www.modelscope.cn/models/aplux/Qwen2.5-VL-3B-Instruct-q4_k_m/resolve/master/Qwen2.5-VL-3B-Instruct-q4_k_m.gguf
wget https://www.modelscope.cn/models/aplux/Qwen2.5-VL-3B-Instruct-q4_k_m/resolve/master/Qwen2.5-VL-3B-Instruct.mmproj-fp16.gguf
```

## 构建产物

构建完成后，输出文件在 `dist/` 目录：
- `xunba-1.0.0.AppImage` - 便携版，无需安装
- `xunba_1.0.0_amd64.deb` - Debian/Ubuntu 安装包

## 安装和运行

### AppImage 方式
```bash
chmod +x xunba-1.0.0.AppImage
./xunba-1.0.0.AppImage
```

### deb 方式
```bash
sudo dpkg -i xunba_1.0.0_amd64.deb
sudo apt-get install -f  # 修复依赖
xunba  # 启动应用
```

## 常见问题

### Q: OCR 无法识别中文？
确保安装了中文语言包：
```bash
sudo apt install -y tesseract-ocr-chi-sim tesseract-ocr-chi-tra
```

### Q: 模型加载失败？
检查 llama-server 是否在 PATH 中：
```bash
which llama-server
```

### Q: 内存不足？
Qwen2.5-VL-3B 模型需要约 4GB 内存，确保系统有足够内存。

## 开发

```bash
# 开发模式运行
npm start

# 仅构建 deb 包
npx electron-builder --linux deb --x64

# 仅构建 AppImage
npx electron-builder --linux AppImage --x64
```

## 许可证

MIT License
