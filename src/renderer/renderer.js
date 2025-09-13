const { ipcRenderer } = require('electron');

// DOM Elements
const tabs = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// Download tab elements
const videoUrlInput = document.getElementById('videoUrl');
const getInfoBtn = document.getElementById('getInfoBtn');
const videoInfo = document.getElementById('videoInfo');
const videoThumbnail = document.getElementById('videoThumbnail');
const videoTitle = document.getElementById('videoTitle');
const videoAuthor = document.getElementById('videoAuthor');
const videoDuration = document.getElementById('videoDuration');
const outputFolderInput = document.getElementById('outputFolder');
const selectFolderBtn = document.getElementById('selectFolderBtn');
const bitrateSelect = document.getElementById('bitrateSelect');
const frequencySelect = document.getElementById('frequencySelect');
const channelsSelect = document.getElementById('channelsSelect');
const downloadBtn = document.getElementById('downloadBtn');
const downloadProgress = document.getElementById('downloadProgress');
const downloadProgressBar = document.getElementById('downloadProgressBar');
const downloadStatus = document.getElementById('downloadStatus');

// Convert tab elements
const selectFilesBtn = document.getElementById('selectFilesBtn');
const selectedFiles = document.getElementById('selectedFiles');
const convertOutputFolderInput = document.getElementById('convertOutputFolder');
const selectConvertFolderBtn = document.getElementById('selectConvertFolderBtn');
const convertBtn = document.getElementById('convertBtn');
const conversionProgress = document.getElementById('conversionProgress');
const conversionProgressBar = document.getElementById('conversionProgressBar');
const conversionStatus = document.getElementById('conversionStatus');

// Playlist elements
const audioPlayer = document.getElementById('audioPlayer');
const playPauseBtn = document.getElementById('playPauseBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const progressSlider = document.getElementById('progressSlider');
const progressFill = document.getElementById('progressFill');
const currentTimeSpan = document.getElementById('currentTime');
const totalTimeSpan = document.getElementById('totalTime');
const volumeSlider = document.getElementById('volumeSlider');
const muteBtn = document.getElementById('muteBtn');
const currentTrackSpan = document.getElementById('currentTrack');
const playlistItems = document.getElementById('playlistItems');
const clearPlaylistBtn = document.getElementById('clearPlaylistBtn');
const shuffleBtn = document.getElementById('shuffleBtn');

// Transfer elements
const openFolderBtn = document.getElementById('openFolderBtn');
const cloudServiceSelect = document.getElementById('cloudServiceSelect');
const copyToCloudBtn = document.getElementById('copyToCloudBtn');
const selectAllTracks = document.getElementById('selectAllTracks');
const transferSongsList = document.getElementById('transferSongsList');
const selectedCount = document.getElementById('selectedCount');

// Settings elements
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeModal = document.querySelector('.close');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');

// Global variables
let currentPlaylist = [];
let currentTrackIndex = -1;
let selectedFilesToConvert = [];
let settings = {};

// Initialize the app
async function init() {
    await loadSettings();
    await loadPlaylist();
    renderTransferSongs();
    setupEventListeners();
}

// Load settings from storage
async function loadSettings() {
    try {
        settings = await ipcRenderer.invoke('get-settings');
        
        // Apply settings to UI
        if (settings.outputFolder) {
            outputFolderInput.value = settings.outputFolder;
            convertOutputFolderInput.value = settings.outputFolder;
            document.getElementById('defaultOutputFolder').value = settings.outputFolder;
        }
        
        if (settings.audioQuality) {
            bitrateSelect.value = settings.audioQuality.bitrate;
            frequencySelect.value = settings.audioQuality.frequency;
            channelsSelect.value = settings.audioQuality.channels;
            document.getElementById('defaultBitrate').value = settings.audioQuality.bitrate;
            document.getElementById('defaultFrequency').value = settings.audioQuality.frequency;
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

// Load playlist from storage
async function loadPlaylist() {
    try {
        currentPlaylist = await ipcRenderer.invoke('load-playlist');
        renderPlaylist();
    } catch (error) {
        console.error('Error loading playlist:', error);
    }
}

// Save playlist to storage
async function savePlaylist() {
    try {
        await ipcRenderer.invoke('save-playlist', currentPlaylist);
    } catch (error) {
        console.error('Error saving playlist:', error);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Tab switching
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;
            switchTab(targetTab);
        });
    });

    // Download tab events
    getInfoBtn.addEventListener('click', getVideoInfo);
    selectFolderBtn.addEventListener('click', selectOutputFolder);
    downloadBtn.addEventListener('click', downloadVideo);
    videoUrlInput.addEventListener('input', validateDownloadForm);

    // Convert tab events
    selectFilesBtn.addEventListener('click', selectFilesToConvert);
    selectConvertFolderBtn.addEventListener('click', selectConvertOutputFolder);
    convertBtn.addEventListener('click', convertFiles);

    // Audio player events
    playPauseBtn.addEventListener('click', togglePlayPause);
    prevBtn.addEventListener('click', playPrevious);
    nextBtn.addEventListener('click', playNext);
    progressSlider.addEventListener('input', seekAudio);
    volumeSlider.addEventListener('input', adjustVolume);
    if (muteBtn) muteBtn.addEventListener('click', toggleMute);
    audioPlayer.addEventListener('loadedmetadata', updateAudioMetadata);
    audioPlayer.addEventListener('timeupdate', updateProgress);
    audioPlayer.addEventListener('ended', playNext);

    // Playlist events
    clearPlaylistBtn.addEventListener('click', clearPlaylist);
    if (shuffleBtn) shuffleBtn.addEventListener('click', shufflePlaylist);

    // Transfer events
    if (openFolderBtn) openFolderBtn.addEventListener('click', openMusicFolder);
    if (cloudServiceSelect) cloudServiceSelect.addEventListener('change', updateCloudTransferButton);
    if (copyToCloudBtn) copyToCloudBtn.addEventListener('click', copySelectedToCloud);
    if (selectAllTracks) selectAllTracks.addEventListener('change', toggleSelectAllTracks);

    // Settings events
    settingsBtn.addEventListener('click', openSettings);
    closeModal.addEventListener('click', closeSettings);
    saveSettingsBtn.addEventListener('click', saveSettings);
    document.getElementById('selectDefaultFolderBtn').addEventListener('click', selectDefaultFolder);

    // Window click event for modal
    window.addEventListener('click', (event) => {
        if (event.target === settingsModal) {
            closeSettings();
        }
    });

    // IPC events for progress updates
    ipcRenderer.on('download-progress', updateDownloadProgress);
    ipcRenderer.on('conversion-progress', updateConversionProgress);
}

// Tab switching
function switchTab(tabName) {
    tabs.forEach(tab => tab.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));
    
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(tabName).classList.add('active');
}

// Video info retrieval
async function getVideoInfo() {
    const url = videoUrlInput.value.trim();
    if (!url) {
        alert('Please enter a video URL');
        return;
    }

    getInfoBtn.disabled = true;
    getInfoBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Getting Info...';

    try {
        const info = await ipcRenderer.invoke('get-video-info', url);
        
        videoThumbnail.src = info.thumbnail || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjkwIiB2aWV3Qm94PSIwIDAgMTIwIDkwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==';
        videoTitle.textContent = info.title;
        videoAuthor.textContent = `By: ${info.author}`;
        videoDuration.textContent = `Duration: ${formatDuration(info.duration)}`;
        
        videoInfo.style.display = 'block';
        validateDownloadForm();
    } catch (error) {
        console.error('Error getting video info:', error);
        
        // Show a more user-friendly error message
        const errorMsg = error.message.includes('Invalid YouTube URL') 
            ? 'Please enter a valid YouTube URL'
            : error.message.includes('Failed to get video info')
            ? 'Unable to retrieve video information. Please check the URL and try again.'
            : `Error: ${error.message}`;
            
        alert(errorMsg);
        videoInfo.style.display = 'none';
    } finally {
        getInfoBtn.disabled = false;
        getInfoBtn.innerHTML = '<i class="fas fa-info-circle"></i> Get Info';
    }
}

// Format duration from seconds to mm:ss
function formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Select output folder
async function selectOutputFolder() {
    try {
        const folder = await ipcRenderer.invoke('select-folder');
        if (folder) {
            outputFolderInput.value = folder;
            validateDownloadForm();
        }
    } catch (error) {
        console.error('Error selecting folder:', error);
    }
}

// Select convert output folder
async function selectConvertOutputFolder() {
    try {
        const folder = await ipcRenderer.invoke('select-folder');
        if (folder) {
            convertOutputFolderInput.value = folder;
            validateConvertForm();
        }
    } catch (error) {
        console.error('Error selecting folder:', error);
    }
}

// Select files to convert
async function selectFilesToConvert() {
    try {
        const files = await ipcRenderer.invoke('select-mp4-files');
        selectedFilesToConvert = files;
        renderSelectedFiles();
        validateConvertForm();
    } catch (error) {
        console.error('Error selecting files:', error);
    }
}

// Render selected files
function renderSelectedFiles() {
    selectedFiles.innerHTML = '';
    
    selectedFilesToConvert.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <span class="file-name">${file.split('\\').pop()}</span>
            <button class="remove-file" onclick="removeFile(${index})">
                <i class="fas fa-times"></i>
            </button>
        `;
        selectedFiles.appendChild(fileItem);
    });
}

// Remove file from selection
function removeFile(index) {
    selectedFilesToConvert.splice(index, 1);
    renderSelectedFiles();
    validateConvertForm();
}

// Validate download form
function validateDownloadForm() {
    const url = videoUrlInput.value.trim();
    const folder = outputFolderInput.value.trim();
    const hasInfo = videoInfo.style.display !== 'none';
    
    downloadBtn.disabled = !(url && folder && hasInfo);
}

// Validate convert form
function validateConvertForm() {
    const hasFiles = selectedFilesToConvert.length > 0;
    const hasFolder = convertOutputFolderInput.value.trim() !== '';
    
    convertBtn.disabled = !(hasFiles && hasFolder);
}

// Download video
async function downloadVideo() {
    const url = videoUrlInput.value.trim();
    const outputPath = outputFolderInput.value.trim();
    
    const options = {
        bitrate: parseInt(bitrateSelect.value),
        frequency: parseInt(frequencySelect.value),
        channels: parseInt(channelsSelect.value)
    };

    downloadBtn.disabled = true;
    downloadProgress.style.display = 'block';
    downloadStatus.textContent = 'Starting download...';
    downloadProgressBar.style.width = '0%';

    try {
        const result = await ipcRenderer.invoke('download-video', url, outputPath, options);
        
        if (result.success) {
            // Add to playlist
            const track = {
                id: Date.now(),
                title: result.title,
                artist: result.artist,
                path: result.path,
                duration: result.duration
            };
            
            currentPlaylist.push(track);
            await savePlaylist();
            renderPlaylist();
            
            downloadStatus.textContent = 'Download completed successfully!';
            setTimeout(() => {
                downloadProgress.style.display = 'none';
                switchTab('playlist');
            }, 2000);
        }
    } catch (error) {
        console.error('Download error:', error);
        
        let errorMsg = 'Download failed. ';
        if (error.message.includes('Invalid YouTube URL')) {
            errorMsg += 'Please check the URL and try again.';
        } else if (error.message.includes('FFmpeg')) {
            errorMsg += 'Audio conversion failed. Please ensure FFmpeg is installed.';
        } else if (error.message.includes('ENOENT')) {
            errorMsg += 'FFmpeg not found. Please install FFmpeg and restart the application.';
        } else {
            errorMsg += error.message;
        }
        
        downloadStatus.textContent = errorMsg;
        
        // Hide progress after 5 seconds on error
        setTimeout(() => {
            downloadProgress.style.display = 'none';
        }, 5000);
    } finally {
        downloadBtn.disabled = false;
    }
}

// Convert files
async function convertFiles() {
    const outputPath = convertOutputFolderInput.value.trim();
    
    convertBtn.disabled = true;
    conversionProgress.style.display = 'block';
    conversionStatus.textContent = 'Starting conversion...';
    conversionProgressBar.style.width = '0%';

    try {
        for (let i = 0; i < selectedFilesToConvert.length; i++) {
            const inputFile = selectedFilesToConvert[i];
            conversionStatus.textContent = `Converting ${i + 1} of ${selectedFilesToConvert.length}: ${inputFile.split('\\').pop()}`;
            
            const result = await ipcRenderer.invoke('convert-mp4-to-mp3', inputFile, outputPath);
            
            if (result.success) {
                // Add to playlist
                const track = {
                    id: Date.now() + i,
                    title: result.title,
                    artist: 'Unknown Artist',
                    path: result.path,
                    duration: 0
                };
                
                currentPlaylist.push(track);
            }
        }
        
        await savePlaylist();
        renderPlaylist();
        
        conversionStatus.textContent = 'All conversions completed successfully!';
        setTimeout(() => {
            conversionProgress.style.display = 'none';
            switchTab('playlist');
        }, 2000);
        
    } catch (error) {
        conversionStatus.textContent = `Conversion failed: ${error.message}`;
        console.error('Conversion error:', error);
    } finally {
        convertBtn.disabled = false;
    }
}

// Update download progress
function updateDownloadProgress(event, progress) {
    const pct = Math.max(0, Math.min(100, Math.round(progress?.percent ?? 0)));
    const stage = progress?.stage || 'processing';
    downloadProgressBar.style.width = `${pct}%`;
    const label = stage === 'downloading' ? 'Downloading' : stage === 'converting' ? 'Converting' : stage === 'completed' ? 'Completed' : 'Processing';
    downloadStatus.textContent = `${label}... ${pct}%`;
}

// Update conversion progress
function updateConversionProgress(event, progress) {
    conversionProgressBar.style.width = `${progress.percent || 0}%`;
}

// Audio player functions
function togglePlayPause() {
    if (audioPlayer.paused) {
        audioPlayer.play();
        playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
    } else {
        audioPlayer.pause();
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    }
}

function playTrack(index) {
    if (index >= 0 && index < currentPlaylist.length) {
        currentTrackIndex = index;
        const track = currentPlaylist[index];
        
        audioPlayer.src = `file://${track.path}`;
        currentTrackSpan.textContent = `${track.title} - ${track.artist}`;
        
        // Update playlist UI
        document.querySelectorAll('.playlist-item').forEach((item, i) => {
            item.classList.toggle('playing', i === index);
        });
        
        audioPlayer.play();
        playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
    }
}

function playNext() {
    if (currentTrackIndex < currentPlaylist.length - 1) {
        playTrack(currentTrackIndex + 1);
    }
}

function playPrevious() {
    if (currentTrackIndex > 0) {
        playTrack(currentTrackIndex - 1);
    }
}

function seekAudio() {
    const seekTime = (progressSlider.value / 100) * audioPlayer.duration;
    audioPlayer.currentTime = seekTime;
    updateProgressFill();
}

function adjustVolume() {
    audioPlayer.volume = volumeSlider.value / 100;
    updateVolumeIcon();
}

function updateAudioMetadata() {
    totalTimeSpan.textContent = formatDuration(audioPlayer.duration);
    progressSlider.max = 100;
}

function updateProgress() {
    if (audioPlayer.duration) {
        const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        progressSlider.value = progress;
        currentTimeSpan.textContent = formatDuration(audioPlayer.currentTime);
        updateProgressFill();
    }
}

function updateProgressFill() {
    if (progressFill) {
        progressFill.style.width = progressSlider.value + '%';
    }
}

function updateVolumeIcon() {
    if (!muteBtn) return;
    
    const volume = volumeSlider.value;
    const icon = muteBtn.querySelector('i');
    
    if (volume == 0) {
        icon.className = 'fas fa-volume-mute';
    } else if (volume < 50) {
        icon.className = 'fas fa-volume-down';
    } else {
        icon.className = 'fas fa-volume-up';
    }
}

function toggleMute() {
    if (audioPlayer.volume > 0) {
        audioPlayer.previousVolume = audioPlayer.volume;
        audioPlayer.volume = 0;
        volumeSlider.value = 0;
    } else {
        audioPlayer.volume = audioPlayer.previousVolume || 0.5;
        volumeSlider.value = (audioPlayer.previousVolume || 0.5) * 100;
    }
    updateVolumeIcon();
}

// Render playlist
function renderPlaylist() {
    const emptyPlaylist = document.getElementById('emptyPlaylist');
    const playlistCount = document.getElementById('playlistCount');
    const playlistDuration = document.getElementById('playlistDuration');
    
    // Update playlist stats
    const totalDuration = currentPlaylist.reduce((total, track) => total + (track.duration || 0), 0);
    playlistCount.textContent = `${currentPlaylist.length} track${currentPlaylist.length !== 1 ? 's' : ''}`;
    playlistDuration.textContent = `${formatDuration(totalDuration)} total`;
    
    playlistItems.innerHTML = '';
    
    if (currentPlaylist.length === 0) {
        emptyPlaylist.classList.add('show');
        return;
    }
    
    emptyPlaylist.classList.remove('show');
    
    currentPlaylist.forEach((track, index) => {
        const item = document.createElement('div');
        item.className = `playlist-item ${index === currentTrackIndex ? 'playing' : ''}`;
        item.innerHTML = `
            <div class="playlist-item-number">${index + 1}</div>
            <div class="playlist-item-info">
                <div class="playlist-item-title">${escapeHtml(track.title)}</div>
                <div class="playlist-item-artist">${escapeHtml(track.artist)}</div>
            </div>
            <div class="playlist-item-artist">${escapeHtml(track.artist)}</div>
            <div class="playlist-item-duration">${formatDuration(track.duration || 0)}</div>
            <div class="playlist-item-controls">
                <button onclick="playTrack(${index})" title="Play" class="play-btn">
                    <i class="fas fa-play"></i>
                </button>
                <button onclick="removeFromPlaylist(${index})" title="Remove" class="remove-btn">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        // Add click handler for the entire item
        item.addEventListener('click', (e) => {
            if (!e.target.closest('.playlist-item-controls')) {
                playTrack(index);
            }
        });
        
        playlistItems.appendChild(item);
    });
    
    // Also update transfer songs list
    renderTransferSongs();
    
    // Update equalizer animation
    const equalizerBars = document.getElementById('equalizerBars');
    if (audioPlayer && !audioPlayer.paused && currentTrackIndex >= 0) {
        equalizerBars.classList.add('playing');
    } else {
        equalizerBars.classList.remove('playing');
    }
}

// Enhanced play track function
function playTrack(index) {
    if (index < 0 || index >= currentPlaylist.length) return;
    
    const track = currentPlaylist[index];
    const wasPlaying = !audioPlayer.paused && currentTrackIndex === index;
    
    if (wasPlaying) {
        // If same track is playing, just pause/play
        togglePlayPause();
        return;
    }
    
    currentTrackIndex = index;
    audioPlayer.src = track.path;
    
    // Update track info
    const currentTrackSpan = document.getElementById('currentTrack');
    const currentArtistSpan = document.getElementById('currentArtist');
    currentTrackSpan.textContent = track.title;
    currentArtistSpan.textContent = track.artist;
    
    // Update play button
    playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
    
    // Play the track
    audioPlayer.play().catch(error => {
        console.error('Error playing audio:', error);
        alert('Error playing audio file. The file might be corrupted or in an unsupported format.');
    });
    
    // Update playlist display
    renderPlaylist();
}

// Enhanced toggle play/pause
function togglePlayPause() {
    if (currentTrackIndex === -1 && currentPlaylist.length > 0) {
        playTrack(0);
        return;
    }
    
    if (audioPlayer.paused) {
        audioPlayer.play().then(() => {
            playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
            document.getElementById('equalizerBars').classList.add('playing');
        }).catch(error => {
            console.error('Error playing audio:', error);
        });
    } else {
        audioPlayer.pause();
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        document.getElementById('equalizerBars').classList.remove('playing');
    }
}

// Enhanced previous track function
function playPrevious() {
    if (currentTrackIndex > 0) {
        playTrack(currentTrackIndex - 1);
    } else if (currentPlaylist.length > 0) {
        // Loop to last track
        playTrack(currentPlaylist.length - 1);
    }
}

// Enhanced next track function
function playNext() {
    if (currentTrackIndex < currentPlaylist.length - 1) {
        playTrack(currentTrackIndex + 1);
    } else if (currentPlaylist.length > 0) {
        // Loop to first track
        playTrack(0);
    }
}

// Add shuffle functionality
function shufflePlaylist() {
    if (currentPlaylist.length <= 1) return;
    
    const currentTrack = currentTrackIndex >= 0 ? currentPlaylist[currentTrackIndex] : null;
    
    // Fisher-Yates shuffle algorithm
    for (let i = currentPlaylist.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [currentPlaylist[i], currentPlaylist[j]] = [currentPlaylist[j], currentPlaylist[i]];
    }
    
    // Update current track index
    if (currentTrack) {
        currentTrackIndex = currentPlaylist.findIndex(track => track.path === currentTrack.path);
    }
    
    savePlaylist();
    renderPlaylist();
}

// Utility function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Remove track from playlist
async function removeFromPlaylist(index) {
    if (index === currentTrackIndex) {
        audioPlayer.pause();
        currentTrackSpan.textContent = 'No track selected';
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        currentTrackIndex = -1;
    } else if (index < currentTrackIndex) {
        currentTrackIndex--;
    }
    
    currentPlaylist.splice(index, 1);
    await savePlaylist();
    renderPlaylist();
}

// Clear playlist
async function clearPlaylist() {
    if (confirm('Are you sure you want to clear the entire playlist?')) {
        currentPlaylist = [];
        currentTrackIndex = -1;
        audioPlayer.pause();
        currentTrackSpan.textContent = 'No track selected';
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        await savePlaylist();
        renderPlaylist();
    }
}

// Settings functions
function openSettings() {
    settingsModal.style.display = 'block';
}

function closeSettings() {
    settingsModal.style.display = 'none';
}

async function selectDefaultFolder() {
    try {
        const folder = await ipcRenderer.invoke('select-folder');
        if (folder) {
            document.getElementById('defaultOutputFolder').value = folder;
        }
    } catch (error) {
        console.error('Error selecting default folder:', error);
    }
}

async function saveSettings() {
    const newSettings = {
        outputFolder: document.getElementById('defaultOutputFolder').value,
        audioQuality: {
            bitrate: parseInt(document.getElementById('defaultBitrate').value),
            frequency: parseInt(document.getElementById('defaultFrequency').value),
            channels: 2
        },
        enhancement: {
            normalize: true,
            bassBoost: true,
            trebleBoost: true
        }
    };

    try {
        await ipcRenderer.invoke('save-settings', newSettings);
        settings = newSettings;
        
        // Apply settings to UI
        outputFolderInput.value = settings.outputFolder;
        convertOutputFolderInput.value = settings.outputFolder;
        bitrateSelect.value = settings.audioQuality.bitrate;
        frequencySelect.value = settings.audioQuality.frequency;
        
        closeSettings();
        alert('Settings saved successfully!');
    } catch (error) {
        console.error('Error saving settings:', error);
        alert('Error saving settings');
    }
}

// Make functions globally available for onclick handlers
window.removeFile = removeFile;
window.playTrack = playTrack;
window.removeFromPlaylist = removeFromPlaylist;
window.openFFmpegHelp = function() {
    const helpText = `FFmpeg Installation Guide:

Windows:
1. Download FFmpeg from https://ffmpeg.org/download.html
2. Extract to C:\\ffmpeg
3. Add C:\\ffmpeg\\bin to your system PATH
4. Restart this application

OR use the provided installation scripts:
- Run install_ffmpeg.bat as Administrator
- Or run install_ffmpeg.ps1 in PowerShell as Administrator

macOS:
1. Install Homebrew if you haven't already
2. Run: brew install ffmpeg

Linux (Ubuntu/Debian):
1. Run: sudo apt update && sudo apt install ffmpeg

After installation, restart the application to use download/conversion features.`;
    
    alert(helpText);
};

// Check FFmpeg status
window.checkFFmpegStatus = async function() {
    try {
        const isAvailable = await ipcRenderer.invoke('check-ffmpeg');
        if (isAvailable) {
            alert('✅ FFmpeg is installed and available!\n\nYou can now download and convert videos.');
        } else {
            alert('❌ FFmpeg is not installed or not found in PATH.\n\nPlease install FFmpeg using one of the provided installation scripts:\n- install_ffmpeg.bat (run as Administrator)\n- install_ffmpeg.ps1 (run in PowerShell as Administrator)\n\nAfter installation, restart the application.');
        }
    } catch (error) {
        alert(`Error checking FFmpeg status: ${error.message}`);
    }
};

// Global function declarations for inline event handlers
window.playTrack = playTrack;
window.removeFromPlaylist = removeFromPlaylist;
window.openFFmpegHelp = openFFmpegHelp;
window.updateTransferSelection = updateTransferSelection;

// Transfer Functions

// Render transfer songs list
function renderTransferSongs() {
    if (!transferSongsList) return;
    
    transferSongsList.innerHTML = '';
    
    if (currentPlaylist.length === 0) {
        transferSongsList.innerHTML = `
            <div class="no-songs-message">
                <i class="fas fa-music"></i>
                <p>No songs available. Download some music first!</p>
                <button class="btn btn-primary" onclick="document.querySelector('[data-tab=download]').click()">
                    <i class="fas fa-download"></i> Download Music
                </button>
            </div>
        `;
        return;
    }
    
    currentPlaylist.forEach((track, index) => {
        const songItem = document.createElement('div');
        songItem.className = 'song-item';
        songItem.innerHTML = `
            <div class="song-col-checkbox">
                <input type="checkbox" class="song-checkbox" data-index="${index}" onchange="updateTransferSelection()">
            </div>
            <div class="song-info">
                <h4>${escapeHtml(track.title)}</h4>
                <p>${escapeHtml(track.artist)}</p>
            </div>
            <div class="song-col-artist">${escapeHtml(track.artist)}</div>
            <div class="song-col-duration">${formatDuration(track.duration || 0)}</div>
            <div class="song-col-actions">
                <button onclick="playTrack(${index})" title="Play" class="btn btn-sm btn-secondary">
                    <i class="fas fa-play"></i>
                </button>
            </div>
        `;
        
        transferSongsList.appendChild(songItem);
    });
    
    updateTransferSelection();
}

// Update transfer selection count and button state
function updateTransferSelection() {
    const selectedCheckboxes = document.querySelectorAll('.song-checkbox:checked');
    const count = selectedCheckboxes.length;
    
    if (selectedCount) {
        selectedCount.textContent = `${count} selected`;
    }
    
    if (copyToCloudBtn) {
        const selectedService = cloudServiceSelect ? cloudServiceSelect.value : '';
        copyToCloudBtn.disabled = !selectedService || count === 0;
    }
    
    // Update select all checkbox state
    if (selectAllTracks) {
        const allCheckboxes = document.querySelectorAll('.song-checkbox');
        selectAllTracks.indeterminate = count > 0 && count < allCheckboxes.length;
        selectAllTracks.checked = count > 0 && count === allCheckboxes.length;
    }
}

// Open the music folder in file explorer
async function openMusicFolder() {
    try {
        if (!settings.outputFolder) {
            alert('No output folder set. Please configure an output folder in settings first.');
            return;
        }
        
        const success = await ipcRenderer.invoke('open-file-location', settings.outputFolder);
        if (!success) {
            alert('Failed to open folder. Please check if the folder exists.');
        }
    } catch (error) {
        console.error('Error opening folder:', error);
        alert(`Error opening folder: ${error.message}`);
    }
}

// Update cloud transfer button state
function updateCloudTransferButton() {
    updateTransferSelection();
}

// Get selected tracks from transfer list
function getSelectedTracks() {
    const checkboxes = document.querySelectorAll('.song-checkbox:checked');
    return Array.from(checkboxes).map(checkbox => {
        const index = parseInt(checkbox.dataset.index);
        return currentPlaylist[index];
    }).filter(track => track && track.path);
}

// Copy selected tracks to cloud storage
async function copySelectedToCloud() {
    try {
        const selectedService = cloudServiceSelect.value;
        const selectedTracks = getSelectedTracks();
        
        if (!selectedService) {
            alert('Please select a cloud service first.');
            return;
        }
        
        if (selectedTracks.length === 0) {
            alert('Please select tracks to copy.');
            return;
        }
        
        copyToCloudBtn.disabled = true;
        copyToCloudBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Copying...';
        
        let successCount = 0;
        let errors = [];
        
        for (const track of selectedTracks) {
            try {
                const result = await ipcRenderer.invoke('copy-to-cloud', track.path, selectedService);
                if (result.success) {
                    successCount++;
                }
            } catch (error) {
                errors.push(`${track.title}: ${error.message}`);
            }
        }
        
        // Show results
        let message = `Successfully copied ${successCount} of ${selectedTracks.length} tracks to ${selectedService}.`;
        if (errors.length > 0) {
            message += `\n\nErrors:\n${errors.join('\n')}`;
        }
        message += `\n\nYou can now access these files from your ${selectedService} mobile app.`;
        
        alert(message);
        
        // Clear selection
        selectAllTracks.checked = false;
        toggleSelectAllTracks();
        
    } catch (error) {
        console.error('Error copying to cloud:', error);
        alert(`Error copying to cloud: ${error.message}`);
    } finally {
        copyToCloudBtn.disabled = false;
        copyToCloudBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Copy Selected Songs';
        updateTransferSelection();
    }
}

// Toggle select all tracks
function toggleSelectAllTracks() {
    const checkboxes = document.querySelectorAll('.song-checkbox');
    const isChecked = selectAllTracks.checked;
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = isChecked;
    });
    
    updateTransferSelection();
}
window.checkFFmpegStatus = checkFFmpegStatus;
window.shufflePlaylist = shufflePlaylist;

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
