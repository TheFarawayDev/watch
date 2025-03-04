document.addEventListener("DOMContentLoaded", function () {
    const urlParams = new URLSearchParams(window.location.search);
    let seriesTitle = urlParams.get('series') || 'default_series';  // default if no query parameter
    let jsonFile = `./series/${seriesTitle}.json`;

    fetch(jsonFile)
        .then(response => {
            if (!response.ok) throw new Error(`Failed to load ${jsonFile}`);
            return response.json();
            console.log(data[title]);
        })
        .then(data => {
            let episodes = {
                sub: data.sub,
                dub: data.dub
            };

            // Update page title
            if (data.title) document.title = data.title;

            // Update video poster
            if (data.poster) {
                document.getElementById('my-video').setAttribute('poster', data.poster);
            }

            // Initialize player and load the episodes
            loadEpisodes();
        })
        .catch(error => console.error("Error loading episodes:", error));
});

let currentLanguage = localStorage.getItem('preferredLanguage') || 'sub';
let currentSeason = localStorage.getItem('currentSeason') || 'season1';
let currentEpisodeButton = null;
let autoNext = JSON.parse(localStorage.getItem('autoNext')) || false;
let skipIntroEnabled = JSON.parse(localStorage.getItem('skipIntroEnabled')) || false;
let isIntroPlaying = false;

function getVideoType(url) {
    return url.endsWith('.m3u8') ? 'application/x-mpegURL' : 'video/mp4';
}

function toggleLanguage(lang) {
    if (episodes[lang] && episodes[lang][currentSeason]) {
        currentLanguage = lang;
        localStorage.setItem('preferredLanguage', lang);
    } else {
        currentLanguage = lang === 'sub' ? 'dub' : 'sub';
        localStorage.setItem('preferredLanguage', currentLanguage);
    }
    updateButtonStyles('toggle-options', currentLanguage);
    loadEpisodes();
}

function populateSeasons() {
    const seasonsContainer = document.querySelector('.season-selector');
    const availableSeasons = Object.keys(episodes[sub]);

    availableSeasons.forEach(season => {
        const button = document.createElement('button');
        button.textContent = `Season ${season.replace('season', '')}`;
        button.onclick = () => selectSeason(season);
        seasonsContainer.appendChild(button);
    });
}

function selectSeason(seasonNumber) {
    currentSeason = 'season' + seasonNumber;
    localStorage.setItem('currentSeason', currentSeason);
    updateButtonStyles('season-selector', currentSeason);
    loadEpisodes();
}

function loadEpisodes() {
    const episodeContainer = document.getElementById('episode-list');
    episodeContainer.innerHTML = ''; // Clear the episode list
    const currentEpisodes = episodes[currentLanguage] && episodes[currentLanguage][currentSeason];

    if (!currentEpisodes) {
        console.error("No episodes found for the current language and season.");
        return;
    }

    currentEpisodes.forEach(ep => {
        const button = document.createElement('button');
        button.textContent = ep.title;
        button.dataset.url = ep.url;
        button.onclick = () => changeVideo(ep.url, button);
        episodeContainer.appendChild(button);

        // Set active button if it matches the saved episode
        if (ep.url === localStorage.getItem('currentEpisodeUrl')) {
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
    isIntroPlaying = true;
    player.src({ type: 'video/mp4', src: 'https://thefarawaydev.github.io/watch/BA.mp4' });
    player.currentTime(0);
    player.play();
    player.off('ended');
    player.on('ended', function () {
        isIntroPlaying = false;
        player.src({ type: getVideoType(videoUrl), src: videoUrl });
        player.currentTime(savedTime); // Set the saved time here
        player.play();
        setupVideoListeners(player, videoUrl);
    });
}

function setupVideoListeners(player, videoUrl) {
    player.off('timeupdate');
    player.off('error');
    player.off('ended');
    
    player.on('timeupdate', function () {
        if (!isIntroPlaying) {
            saveProgress(videoUrl, player.currentTime());
        }
        const currentEpisodes = episodes[currentLanguage][currentSeason];
        const currentEpisode = currentEpisodes.find(ep => ep.url === videoUrl);
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

function saveProgress(videoUrl, currentTime) {
    let progressData = JSON.parse(localStorage.getItem('progressData')) || {};
    if (!progressData[currentLanguage]) {
        progressData[currentLanguage] = {};
    }
    if (!progressData[currentLanguage][currentSeason]) {
        progressData[currentLanguage][currentSeason] = {};
    }
    progressData[currentLanguage][currentSeason][videoUrl] = currentTime;
    localStorage.setItem('progressData', JSON.stringify(progressData));
}

function loadProgress(videoUrl) {
    let progressData = JSON.parse(localStorage.getItem('progressData')) || {};
    return progressData[currentLanguage]?.[currentSeason]?.[videoUrl] || 0;
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
let seasonNumber = currentSeason.replace('season', '') || '1';
if (!episodes[currentLanguage]['season' + seasonNumber]) {
    seasonNumber = '1';
    currentSeason = 'season1';
    localStorage.setItem('currentSeason', currentSeason);
}
selectSeason(seasonNumber);
toggleLanguage(currentLanguage); // Ensure the preferred language is set and buttons are updated
if (localStorage.getItem('currentEpisodeUrl')) {
    const currentEpisodeUrl = localStorage.getItem('currentEpisodeUrl');
    const button = document.querySelector(`button[data-url="${currentEpisodeUrl}"]`);
    if (button) changeVideo(currentEpisodeUrl, button);
}
document.getElementById('autonextButton').classList.toggle('active', autoNext);
