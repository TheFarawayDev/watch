let currentLanguage = localStorage.getItem('preferredLanguage') || 'sub';
let currentSeason = localStorage.getItem('currentSeason') || 'season1';
let currentEpisodeButton = null;
let autoNext = JSON.parse(localStorage.getItem('autoNext')) || false;
let skipIntroEnabled = JSON.parse(localStorage.getItem('skipIntroEnabled')) || false;

// Use the current URL (or a part of it) to uniquely identify the series.
const currentPageUrl = window.location.pathname; // This ensures the progress is unique for each series.

function getVideoType(url) {
    return url.endsWith('.m3u8') ? 'application/x-mpegURL' : 'video/mp4';
}

function toggleLanguage(lang) {
    currentLanguage = lang;
    localStorage.setItem('preferredLanguage', lang);
    updateButtonStyles('toggle-options', currentLanguage);
    loadEpisodes();
}

function selectSeason(seasonNumber) {
    const seasonKey = 'season' + seasonNumber;

    // Check if the selected season exists for the current language and series
    if (episodes[currentLanguage] && episodes[currentLanguage][seasonKey]) {
        currentSeason = seasonKey;
        localStorage.setItem('currentSeason', currentSeason);
        loadEpisodes();
    } else {
        // If the season doesn't exist, reset the season to the first one
        currentSeason = 'season1';
        localStorage.setItem('currentSeason', currentSeason);
        loadEpisodes();
        console.warn(`Season ${seasonNumber} doesn't exist for the current series. Resetting to Season 1.`);
    }
}

function loadEpisodes() {
    const episodeContainer = document.getElementById('episode-list');
    episodeContainer.innerHTML = '';
    const currentEpisodes = episodes[currentLanguage][currentSeason];

    // Add the episodes buttons
    currentEpisodes.forEach(ep => {
        const button = document.createElement('button');
        button.textContent = ep.title;
        button.dataset.url = ep.url;
        button.onclick = () => changeVideo(ep.url, button);
        episodeContainer.appendChild(button);

        // Set active button if it matches the saved episode
        if (ep.url === loadProgress(ep.url)) {
            button.classList.add('active');
            currentEpisodeButton = button;
        }
    });

    updateNavigationButtons();
}

function changeVideo(videoUrl, button) {
    const player = videojs('my-video');
    const savedTime = loadProgress(videoUrl);
    
    if (currentEpisodeButton) {
        currentEpisodeButton.classList.remove('active');
    }
    button.classList.add('active');
    currentEpisodeButton = button;
    
    // Save current season and episode
    localStorage.setItem('currentSeason', currentSeason);
    localStorage.setItem('currentEpisodeUrl', videoUrl);
    
    // Play the site intro first
    player.src({ type: 'video/mp4', src: 'https://better-anime.github.io/watch/BA.mp4' });
    player.currentTime(0);
    player.play();
    
    player.off('ended');
    player.on('ended', function () {
        player.src({ type: getVideoType(videoUrl), src: videoUrl });
        player.currentTime(savedTime);
        player.play();
        setupVideoListeners(player, videoUrl);
    });
}

function setupVideoListeners(player, videoUrl) {
    player.off('timeupdate');
    player.off('error');
    player.off('ended');
    
    player.on('timeupdate', function () {
        saveProgress(videoUrl, player.currentTime());
        if (skipIntroEnabled && currentEpisode) {
            const currentTime = player.currentTime();
            const { introBeginning, introEnd, outroBeginning, outroEnd } = currentEpisode;
            if (typeof introBeginning === 'number' && typeof introEnd === 'number' && currentTime >= introBeginning && currentTime < introEnd) {
                player.currentTime(introEnd);
            }
            if (typeof outroBeginning === 'number' && typeof outroEnd === 'number' && currentTime >= outroBeginning && currentTime < outroEnd) {
                player.currentTime(outroEnd);
            }
        }
    });
    
    player.on('error', function() {
        player.src({ type: 'application/x-mpegURL', src: videoUrl });
        player.play();
    });
    
    player.on('ended', function() {
        if (autoNext) {
            playNextEpisode();
        }
    });

    updateNavigationButtons();
}

function playNextEpisode() {
    const currentEpisodes = episodes[currentLanguage][currentSeason];
    const currentIndex = currentEpisodes.findIndex(ep => ep.url === currentEpisodeButton.dataset.url);
    const nextIndex = currentIndex + 1;

    if (nextIndex < currentEpisodes.length) {
        const nextEpisode = currentEpisodes[nextIndex];
        const nextButton = document.querySelector(`button[data-url="${nextEpisode.url}"]`);
        changeVideo(nextEpisode.url, nextButton);
    }
}

function playPreviousEpisode() {
    const currentEpisodes = episodes[currentLanguage][currentSeason];
    const currentIndex = currentEpisodes.findIndex(ep => ep.url === currentEpisodeButton.dataset.url);
    const prevIndex = currentIndex - 1;

    if (prevIndex >= 0) {
        const prevEpisode = currentEpisodes[prevIndex];
        const prevButton = document.querySelector(`button[data-url="${prevEpisode.url}"]`);
        changeVideo(prevEpisode.url, prevButton);
    }
}

function updateButtonStyles(containerClass, activeId) {
    document.querySelectorAll(`.${containerClass} button`).forEach(button => {
        button.classList.remove('active');
    });
    const activeButton = document.getElementById(activeId + 'Button');
    if (activeButton) activeButton.classList.add('active');
}

// Save progress based on the current page's URL and series
function saveProgress(videoUrl, currentTime) {
    let progressData = JSON.parse(localStorage.getItem('progressData')) || {};

    // Ensure progress data is separated by the page's URL, season, and episode
    if (!progressData[currentPageUrl]) {
        progressData[currentPageUrl] = {};
    }

    if (!progressData[currentPageUrl][currentSeason]) {
        progressData[currentPageUrl][currentSeason] = {};
    }

    // Save progress for the specific episode URL
    progressData[currentPageUrl][currentSeason][videoUrl] = currentTime;
    localStorage.setItem('progressData', JSON.stringify(progressData));
}

// Load progress based on the current page's URL
function loadProgress(videoUrl) {
    let progressData = JSON.parse(localStorage.getItem('progressData')) || {};

    // Load the specific progress for the current page's URL and season
    return progressData[currentPageUrl]?.[currentSeason]?.[videoUrl] || 0;
}

function toggleAutoNext() {
    autoNext = !autoNext;
    localStorage.setItem('autoNext', JSON.stringify(autoNext));
    document.getElementById('autonextButton').classList.toggle('active', autoNext);
}

function updateNavigationButtons() {
    const currentEpisodes = episodes[currentLanguage][currentSeason];
    const currentIndex = currentEpisodes.findIndex(ep => ep.url === currentEpisodeButton?.dataset.url);

    document.getElementById('previousButton').disabled = currentIndex <= 0;
    document.getElementById('nextButton').disabled = currentIndex >= currentEpisodes.length - 1;
}

// Load episodes initially
selectSeason(currentSeason.replace('season', '') || '1');
toggleLanguage(currentLanguage); // Ensure the preferred language is set and buttons are updated
if (localStorage.getItem('currentEpisodeUrl')) {
    const currentEpisodeUrl = localStorage.getItem('currentEpisodeUrl');
    const button = document.querySelector(`button[data-url="${currentEpisodeUrl}"]`);
    if (button) changeVideo(currentEpisodeUrl, button);
}
document.getElementById('autonextButton').classList.toggle('active', autoNext);
document.getElementById('skipintroButton').classList.toggle('active', skipIntroEnabled);