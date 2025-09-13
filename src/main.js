const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const ytdl = require('@distube/ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const NodeID3 = require('node-id3');
const Store = require('electron-store');
const { exec } = require('child_process');
const os = require('os');

// Set FFmpeg path dynamically based on platform
function setFFmpegPaths() {
  try {
    if (process.platform === 'win32') {
      // Try common Windows installation paths
      const possiblePaths = [
        'C:\\ProgramData\\chocolatey\\bin\\ffmpeg.exe',
        'C:\\ffmpeg\\bin\\ffmpeg.exe',
        'ffmpeg.exe' // If in PATH
      ];
      
      const possibleProbePaths = [
        'C:\\ProgramData\\chocolatey\\bin\\ffprobe.exe',
        'C:\\ffmpeg\\bin\\ffprobe.exe',
        'ffprobe.exe' // If in PATH
      ];
      
      // Use the first available path or default to assuming it's in PATH
      ffmpeg.setFfmpegPath(possiblePaths.find(path => {
        try {
          require('fs').accessSync(path, require('fs').constants.F_OK);
          return true;
        } catch { return false; }
      }) || 'ffmpeg');
      
      ffmpeg.setFfprobePath(possibleProbePaths.find(path => {
        try {
          require('fs').accessSync(path, require('fs').constants.F_OK);
          return true;
        } catch { return false; }
      }) || 'ffprobe');
    } else {
      // macOS and Linux - assume ffmpeg is in PATH
      ffmpeg.setFfmpegPath('ffmpeg');
      ffmpeg.setFfprobePath('ffprobe');
    }
  } catch (error) {
    console.log('FFmpeg path detection failed, using default paths');
    ffmpeg.setFfmpegPath('ffmpeg');
    ffmpeg.setFfprobePath('ffprobe');
  }
}

// Set FFmpeg paths
setFFmpegPaths();

// Initialize electron store for settings and playlist
const store = new Store();

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    icon: path.join(__dirname, '../assets/icon.png'),
    titleBarStyle: 'default',
    show: false
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Check FFmpeg availability
function checkFFmpegAvailability() {
  return new Promise((resolve) => {
    exec('ffmpeg -version', (error) => {
      resolve(!error);
    });
  });
}

// IPC Handlers for renderer communication

// Download and convert video to MP3
ipcMain.handle('download-video', async (event, url, outputPath, options = {}) => {
  try {
    // Check FFmpeg availability first
    const ffmpegAvailable = await checkFFmpegAvailability();
    if (!ffmpegAvailable) {
      throw new Error('FFmpeg is not installed or not found in PATH. Please install FFmpeg using the provided installation script (install_ffmpeg.bat or install_ffmpeg.ps1) and restart the application.');
    }

    // Validate URL
    if (!ytdl.validateURL(url)) {
      throw new Error('Invalid YouTube URL');
    }
    
  const info = await ytdl.getInfo(url);
  const title = info.videoDetails.title.replace(/[<>:"/\\|?*]/g, '');
    const filename = `${title}.mp3`;
    const fullPath = path.join(outputPath, filename);
  const totalDurationSec = parseInt(info.videoDetails.lengthSeconds) || 0;
  const thumbs = info.videoDetails.thumbnails || [];
  const bestThumb = thumbs.length ? thumbs[thumbs.length - 1].url : null;

    return new Promise((resolve, reject) => {
      try {
        const stream = ytdl(url, { 
          quality: 'highestaudio',
          filter: 'audioonly'
        });

        // Throttle IPC updates to avoid spamming renderer
        let lastEmit = 0;
        const emitProgress = (payload) => {
          const now = Date.now();
          if (now - lastEmit > 150) {
            try { event.sender.send('download-progress', payload); } catch {}
            lastEmit = now;
          }
        };

        // Report download phase using ytdl byte progress
        stream.on('progress', (chunkLen, downloaded, total) => {
          const percent = total ? (downloaded / total) * 100 : 0;
          emitProgress({ percent, downloaded, total, stage: 'downloading' });
        });

        ffmpeg(stream)
          .audioBitrate(options.bitrate || 320)
          .audioFrequency(options.frequency || 44100)
          .audioChannels(options.channels || 2)
          .audioCodec('libmp3lame')
          .audioFilters([
            'dynaudnorm=f=75:g=25:p=0.95',  // Dynamic audio normalization
            'equalizer=f=1000:width_type=h:width=200:g=2',  // Bass enhancement
            'equalizer=f=3000:width_type=h:width=500:g=1',  // Mid enhancement
            'equalizer=f=8000:width_type=h:width=1000:g=1.5'  // Treble enhancement
          ])
          .format('mp3')
          .on('progress', (progress) => {
            // Some inputs (streams) don't provide percent; compute from timemark vs duration
            let percent = typeof progress.percent === 'number' ? progress.percent : 0;
            if ((!percent || Number.isNaN(percent)) && progress.timemark && totalDurationSec > 0) {
              const hms = progress.timemark.split(':');
              const secs = (parseInt(hms[0]) * 3600) + (parseInt(hms[1]) * 60) + parseFloat(hms[2]);
              percent = Math.max(0, Math.min(99, (secs / totalDurationSec) * 100));
            }
            emitProgress({ percent, timemark: progress.timemark, stage: 'converting' });
          })
          .on('end', () => {
            // Ensure UI reaches 100%
            try { event.sender.send('download-progress', { percent: 100, stage: 'completed' }); } catch {}
            try {
              // Add ID3 tags
              const tags = {
                title: info.videoDetails.title,
                artist: info.videoDetails.author.name,
                album: 'Downloaded from YouTube',
                year: new Date().getFullYear().toString(),
                comment: {
                  language: 'eng',
                  text: `Downloaded from: ${url}`
                }
              };

              NodeID3.write(tags, fullPath);
              
              resolve({
                success: true,
                path: fullPath,
                title: info.videoDetails.title,
                artist: info.videoDetails.author.name,
                duration: parseInt(info.videoDetails.lengthSeconds),
                thumbnail: bestThumb
              });
            } catch (tagError) {
              console.warn('Error writing ID3 tags:', tagError);
              // Still resolve successfully even if tags fail
              resolve({
                success: true,
                path: fullPath,
                title: info.videoDetails.title,
                artist: info.videoDetails.author.name,
                duration: parseInt(info.videoDetails.lengthSeconds),
                thumbnail: bestThumb
              });
            }
          })
          .on('error', (err) => {
            console.error('FFmpeg error:', err);
            reject(new Error(`Conversion failed: ${err.message}`));
          })
          .save(fullPath);
      } catch (streamError) {
        console.error('Stream error:', streamError);
        reject(new Error(`Failed to create download stream: ${streamError.message}`));
      }
    });
  } catch (error) {
    console.error('Download error:', error);
    throw new Error(`Download failed: ${error.message}`);
  }
});

// Convert local MP4 to MP3
ipcMain.handle('convert-mp4-to-mp3', async (event, inputPath, outputPath, options = {}) => {
  // Check FFmpeg availability first
  const ffmpegAvailable = await checkFFmpegAvailability();
  if (!ffmpegAvailable) {
    throw new Error('FFmpeg is not installed or not found in PATH. Please install FFmpeg using the provided installation script and restart the application.');
  }

  return new Promise((resolve, reject) => {
    const filename = path.basename(inputPath, path.extname(inputPath)) + '.mp3';
    const fullOutputPath = path.join(outputPath, filename);

    ffmpeg(inputPath)
      .audioBitrate(options.bitrate || 320)
      .audioFrequency(options.frequency || 44100)
      .audioChannels(options.channels || 2)
      .audioCodec('libmp3lame')
      .audioFilters([
        'dynaudnorm=f=75:g=25:p=0.95',
        'equalizer=f=1000:width_type=h:width=200:g=2',
        'equalizer=f=3000:width_type=h:width=500:g=1',
        'equalizer=f=8000:width_type=h:width=1000:g=1.5'
      ])
      .format('mp3')
      .on('progress', (progress) => {
        event.sender.send('conversion-progress', {
          percent: progress.percent || 0,
          timemark: progress.timemark
        });
      })
      .on('end', () => {
        resolve({
          success: true,
          path: fullOutputPath,
          title: path.basename(inputPath, path.extname(inputPath))
        });
      })
      .on('error', (err) => {
        reject(err);
      })
      .save(fullOutputPath);
  });
});

// Select folder dialog
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  
  return result.canceled ? null : result.filePaths[0];
});

// Select MP4 files dialog
ipcMain.handle('select-mp4-files', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Video Files', extensions: ['mp4', 'avi', 'mov', 'mkv', 'wmv'] }
    ]
  });
  
  return result.canceled ? [] : result.filePaths;
});

// Playlist management
ipcMain.handle('save-playlist', async (event, playlist) => {
  store.set('playlist', playlist);
  return true;
});

ipcMain.handle('load-playlist', async () => {
  return store.get('playlist', []);
});

ipcMain.handle('get-settings', async () => {
  return store.get('settings', {
    outputFolder: '',
    audioQuality: {
      bitrate: 320,
      frequency: 44100,
      channels: 2
    },
    enhancement: {
      normalize: true,
      bassBoost: true,
      trebleBoost: true
    }
  });
});

ipcMain.handle('save-settings', async (event, settings) => {
  store.set('settings', settings);
  return true;
});

// Get video info without downloading
ipcMain.handle('get-video-info', async (event, url) => {
  try {
    // Validate URL
    if (!ytdl.validateURL(url)) {
      throw new Error('Invalid YouTube URL. Please make sure you entered a valid YouTube URL (e.g., https://www.youtube.com/watch?v=...)');
    }
    
    const info = await ytdl.getInfo(url);
    return {
      title: info.videoDetails.title,
      author: info.videoDetails.author.name,
      duration: parseInt(info.videoDetails.lengthSeconds),
      thumbnail: info.videoDetails.thumbnails && info.videoDetails.thumbnails.length > 0 
        ? info.videoDetails.thumbnails[0].url 
        : null
    };
  } catch (error) {
    console.error('Error getting video info:', error);
    
    // Provide more specific error messages
    if (error.message.includes('Video unavailable')) {
      throw new Error('This video is unavailable or may be private/restricted.');
    } else if (error.message.includes('Sign in to confirm your age')) {
      throw new Error('This video is age-restricted and cannot be accessed.');
    } else if (error.message.includes('Private video')) {
      throw new Error('This video is private and cannot be accessed.');
    } else if (error.message.includes('Invalid YouTube URL')) {
      throw new Error('Invalid YouTube URL. Please enter a valid YouTube URL.');
    } else {
      throw new Error(`Failed to get video info: ${error.message}`);
    }
  }
});

// Check FFmpeg status
ipcMain.handle('check-ffmpeg', async () => {
  return await checkFFmpegAvailability();
});

// Open file location
ipcMain.handle('open-file-location', async (event, filePath) => {
  try {
    shell.showItemInFolder(filePath);
    return true;
  } catch (error) {
    console.error('Error opening file location:', error);
    return false;
  }
});

// Copy to OneDrive/Dropbox folder
ipcMain.handle('copy-to-cloud', async (event, filePath, cloudService) => {
  try {
    const userHome = os.homedir();
    let cloudPath;
    
    switch (cloudService) {
      case 'onedrive':
        cloudPath = path.join(userHome, 'OneDrive', 'Music');
        break;
      case 'dropbox':
        cloudPath = path.join(userHome, 'Dropbox', 'Music');
        break;
      case 'googledrive':
        cloudPath = path.join(userHome, 'Google Drive', 'Music');
        break;
      default:
        throw new Error('Unsupported cloud service');
    }

    // Create cloud music folder if it doesn't exist
    if (!fs.existsSync(cloudPath)) {
      fs.mkdirSync(cloudPath, { recursive: true });
    }

    const fileName = path.basename(filePath);
    const destination = path.join(cloudPath, fileName);
    
    // Copy file to cloud folder
    fs.copyFileSync(filePath, destination);
    
    return {
      success: true,
      cloudPath: destination,
      message: `File copied to ${cloudService} Music folder`
    };
  } catch (error) {
    console.error('Error copying to cloud:', error);
    throw new Error(`Failed to copy to ${cloudService}: ${error.message}`);
  }
});

// Get common cloud folders
ipcMain.handle('get-cloud-folders', async () => {
  const userHome = os.homedir();
  const cloudFolders = [];
  
  // Check for OneDrive
  const oneDrivePath = path.join(userHome, 'OneDrive');
  if (fs.existsSync(oneDrivePath)) {
    cloudFolders.push({
      name: 'OneDrive',
      path: path.join(oneDrivePath, 'Music'),
      service: 'onedrive'
    });
  }
  
  // Check for Dropbox
  const dropboxPath = path.join(userHome, 'Dropbox');
  if (fs.existsSync(dropboxPath)) {
    cloudFolders.push({
      name: 'Dropbox',
      path: path.join(dropboxPath, 'Music'),
      service: 'dropbox'
    });
  }
  
  // Check for Google Drive
  const googleDrivePath = path.join(userHome, 'Google Drive');
  if (fs.existsSync(googleDrivePath)) {
    cloudFolders.push({
      name: 'Google Drive',
      path: path.join(googleDrivePath, 'Music'),
      service: 'googledrive'
    });
  }
  
  return cloudFolders;
});
