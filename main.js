const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn, execFile } = require('child_process');

const isLinux = process.platform === 'linux';
const isMac = process.platform === 'darwin';

let mainWindow = null;
let llamaServer = null;
let serverReady = false;
let pendingRequests = [];

const MODEL_DIR = path.join(app.getPath('home'), '.xuebadi-ai', 'models');
const MODEL_FILE = 'Qwen2.5-VL-3B-Instruct-q4_k_m.gguf';
const MMPROJ_FILE = 'Qwen2.5-VL-3B-Instruct.mmproj-fp16.gguf';

function getBinPath(name) {
  if (isLinux && !app.isPackaged) {
    return name;
  }
  return app.isPackaged
    ? path.join(process.resourcesPath, 'bin', name)
    : name;
}

function getOcrPath() {
  const ocrBin = isLinux ? 'ocr-helper-linux' : 'ocr-helper';
  return app.isPackaged
    ? path.join(process.resourcesPath, 'ocr-helper', ocrBin)
    : path.join(__dirname, 'ocr-helper', ocrBin);
}

function ensureModelDir() {
  if (!fs.existsSync(MODEL_DIR)) {
    fs.mkdirSync(MODEL_DIR, { recursive: true });
  }
}

function checkModels() {
  const modelPath = path.join(MODEL_DIR, MODEL_FILE);
  const mmprojPath = path.join(MODEL_DIR, MMPROJ_FILE);
  
  if (!fs.existsSync(modelPath)) {
    return { ready: false, message: `模型文件未找到: ${modelPath}\n\n请下载模型文件到 ~/.xuebadi-ai/models/\n\n下载地址:\nhttps://www.modelscope.cn/models/aplux/Qwen2.5-VL-3B-Instruct-q4_k_m` };
  }
  if (!fs.existsSync(mmprojPath)) {
    return { ready: false, message: `视觉投影文件未找到: ${mmprojPath}\n\n请下载文件:\nhttps://www.modelscope.cn/models/aplux/Qwen2.5-VL-3B-Instruct-q4_k_m` };
  }
  return { ready: true };
}

function startLlamaServer() {
  if (llamaServer) return;
  const bin = getBinPath('llama-server');
  const args = [
    '-m', path.join(MODEL_DIR, MODEL_FILE),
    '--mmproj', path.join(MODEL_DIR, MMPROJ_FILE),
    '--host', '127.0.0.1', '--port', '8765',
    '-ngl', '0', '-c', '4096', '-t', '4',
  ];
  console.log('[学霸帝] Launching:', bin, args.join(' '));
  
  const env = Object.assign({}, process.env);
  if (isMac) {
    const libDir = app.isPackaged
      ? path.join(process.resourcesPath, 'lib')
      : path.join(app.getPath('home'), '.xuebadi-ai', 'lib');
    env.DYLD_LIBRARY_PATH = libDir + (process.env.DYLD_LIBRARY_PATH ? ':' + process.env.DYLD_LIBRARY_PATH : '');
  }
  
  llamaServer = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'], env });
  
  llamaServer.stdout.on('data', (data) => {
    const line = data.toString();
    console.log('[llama-server]', line.trim());
    if (line.includes('HTTP server listening') || line.includes('serving on')) {
      serverReady = true;
      flushPendingRequests();
    }
  });
  
  llamaServer.stderr.on('data', (data) => {
    console.log('[llama-server:err]', data.toString().trim());
  });
  
  llamaServer.on('error', (err) => {
    console.error('[llama-server:error]', err);
    dialog.showErrorBox('启动错误', `无法启动 llama-server:\n${err.message}`);
  });
  
  llamaServer.on('exit', (code) => {
    console.log('[llama-server:exit]', code);
    llamaServer = null;
    serverReady = false;
  });
}

function flushPendingRequests() {
  pendingRequests.forEach(r => r());
  pendingRequests = [];
}

function chatRequest(messages) {
  return new Promise((resolve, reject) => {
    const doRequest = () => {
      const body = JSON.stringify({ messages, model: 'qwen', stream: false });
      const options = {
        hostname: '127.0.0.1',
        port: 8765,
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        }
      };
      const req = require('http').request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.error) reject(new Error(json.error.message || 'API Error'));
            else resolve(json.choices?.[0]?.message?.content || '');
          } catch (e) {
            reject(e);
          }
        });
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    };
    
    if (serverReady) {
      doRequest();
    } else {
      pendingRequests.push(doRequest);
      setTimeout(() => reject(new Error('Server timeout')), 30000);
    }
  });
}

function runOcr(imagePath) {
  return new Promise((resolve, reject) => {
    const ocrBin = getOcrPath();
    console.log('[学霸帝] Running OCR:', ocrBin, imagePath);
    execFile(ocrBin, [imagePath], (err, stdout, stderr) => {
      if (err) {
        console.error('[OCR error]', stderr);
        reject(err);
      } else {
        resolve(stdout.trim());
      }
    });
  });
}

function saveImageBase64(dataUrl, filename) {
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  const buf = Buffer.from(base64, 'base64');
  const tmpPath = path.join('/tmp', filename);
  fs.writeFileSync(tmpPath, buf);
  return tmpPath;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: { preload: path.join(__dirname, 'src', 'preload.js'), contextIsolation: true, nodeIntegration: false },
    title: '学霸帝AI',
    backgroundColor: '#1a1a2e',
  });
  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));
}

app.whenReady().then(() => {
  ensureModelDir();
  const models = checkModels();
  if (!models.ready) {
    dialog.showMessageBox({ type: 'warning', title: '模型未找到', message: models.message, buttons: ['确定'] });
  }
  startLlamaServer();
  createWindow();
});

app.on('window-all-closed', () => {
  if (llamaServer) llamaServer.kill();
  app.quit();
});

ipcMain.handle('chat', async (_, messages) => {
  try {
    return await chatRequest(messages);
  } catch (e) {
    return `错误: ${e.message}`;
  }
});

ipcMain.handle('ocr', async (_, imagePath) => {
  try {
    return await runOcr(imagePath);
  } catch (e) {
    return `OCR错误: ${e.message}`;
  }
});

ipcMain.handle('saveImageBase64', async (_, dataUrl, filename) => {
  try {
    return saveImageBase64(dataUrl, filename);
  } catch (e) {
    return `保存图片错误: ${e.message}`;
  }
});

ipcMain.handle('openModelFolder', () => {
  shell.openPath(MODEL_DIR);
});
