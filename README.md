# MP3 Downloader & Converter

[![Latest release](https://img.shields.io/github/v/release/MK-Dev-Coder/MP3-Converter?display_name=tag&sort=semver)](https://github.com/MK-Dev-Coder/MP3-Converter/releases/latest)


A powerful Electron-based application for downloading videos from URLs, converting MP4 files to MP3, and playing your music collection with audio enhancement features.

## Features

### 🎵 Download & Convert
- Download videos from YouTube and other platforms
- Convert local MP4 files to high-quality MP3
- Batch conversion support
- Audio quality customization (bitrate, sample rate, channels)

### 🎚️ Audio Enhancement
- Dynamic audio normalization
- Bass enhancement
- Treble boost
- Multiple quality presets (128-320 kbps)

### 🎶 Built-in Music Player
- Playlist management
- Audio player controls (play, pause, next, previous)
- Progress tracking and seeking
- Volume control
- Automatic ID3 tag writing

### ⚙️ Customizable Settings
- Default output folder configuration
- Audio quality presets
- Enhancement options
- Persistent settings storage

## Installation

### Prerequisites
- Node.js (v16 or higher)
- FFmpeg (required for audio conversion)

### Setup FFmpeg

**IMPORTANT**: FFmpeg is required for all audio conversion features.

#### Windows (Easy Installation)
Use the provided installation scripts:

**Option 1: Batch Script**
1. Right-click on `install_ffmpeg.bat`
2. Select "Run as administrator"
3. Wait for installation to complete
4. Restart the application

**Option 2: PowerShell Script**
1. Open PowerShell as Administrator
2. Run: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`
3. Run: `.\install_ffmpeg.ps1`
4. Restart the application

**Option 3: Manual Installation**
1. Download FFmpeg from https://ffmpeg.org/download.html
2. Extract to a folder (e.g., `C:\ffmpeg`)
3. Add the `bin` folder to your system PATH

#### macOS
```bash
brew install ffmpeg
```

#### Linux
```bash
sudo apt update
sudo apt install ffmpeg
```

### Install Dependencies
```bash
npm install
```

## Download

- Windows installer and zipped builds are published on the GitHub Releases page:
    https://github.com/MK-Dev-Coder/MP3-Converter/releases

Download the latest `.exe` (NSIS installer) for Windows, or the `.zip` if you prefer a portable copy.

## Development

### Run in Development Mode
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

### Create Distribution Package
```bash
npm run dist
```

### Publish a Release from Git tags (CI)

This repo includes a GitHub Actions workflow that builds installers when you push a version tag.

1. Update `package.json` version (optional)
2. Commit your changes
3. Create and push a tag from PowerShell:

```powershell
git tag v1.0.0
git push origin v1.0.0
```

GitHub Actions will build the Windows installer and attach artifacts to the Release. You can also run the workflow manually from the Actions tab.

## Usage

### Download from URL
1. Switch to the "Download from URL" tab
2. Enter a video URL (YouTube, etc.)
3. Click "Get Info" to preview the video
4. Select an output folder
5. Configure audio quality settings
6. Click "Download & Convert"

### Convert Local Files
1. Switch to the "Convert MP4 to MP3" tab
2. Click "Select MP4 Files" to choose files
3. Select an output folder
4. Click "Convert to MP3"

### Play Music
1. Switch to the "Playlist" tab
2. Use the audio player controls
3. Click on any track in the playlist to play
4. Manage your playlist with the provided controls

## Audio Enhancement

The app includes several audio enhancement features:

- **Dynamic Normalization**: Automatically adjusts volume levels for consistent playback
- **Bass Enhancement**: Boosts lower frequencies for richer sound
- **Treble Enhancement**: Enhances higher frequencies for clearer audio

## File Structure

```
src/
├── main.js              # Main Electron process
└── renderer/
    ├── index.html       # Main UI
    ├── styles.css       # Styling
    └── renderer.js      # Renderer process logic
assets/                  # Application icons
package.json            # Dependencies and scripts
```

## Technologies Used

- **Electron**: Cross-platform desktop application framework
- **FFmpeg**: Audio/video processing
- **ytdl-core**: YouTube video downloading
- **node-id3**: ID3 tag manipulation
- **electron-store**: Settings persistence

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Disclaimer

**IMPORTANT: This project is for educational, research, and portfolio demonstration purposes only.**

This application was created as a programming portfolio project to demonstrate technical skills in:
- Electron desktop application development
- Audio processing with FFmpeg
- Cross-platform software design
- User interface development
- API integration

### Legal and Ethical Use
- This application is for **personal use and learning purposes only**
- Please respect copyright laws and the terms of service of video platforms
- Only download content you have explicit permission to download
- The developer does not encourage or endorse copyright infringement
- Users are solely responsible for ensuring their use complies with applicable laws
- This tool should not be used for commercial purposes or mass downloading

### Educational Purpose
This project serves as a demonstration of modern desktop application development techniques and is intended for:
- Code review and technical assessment
- Learning Electron framework capabilities
- Understanding audio processing workflows
- Showcasing cross-platform development skills

## Support

If you encounter any issues or have questions:

1. Check that FFmpeg is properly installed
2. Ensure you have the latest version of Node.js
3. Verify that the video URL is accessible
4. Check the console for error messages

## Troubleshooting

### Common Issues

**FFmpeg not found**
- Ensure FFmpeg is installed and added to your system PATH
- Restart the application after installing FFmpeg

**Download fails**
- Check your internet connection
- Verify the video URL is valid and accessible
- Some videos may be geo-restricted or require authentication

**Audio quality issues**
- Try different bitrate settings
- Ensure the source audio quality is sufficient
- Check that audio enhancement options are configured correctly
