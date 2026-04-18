(function () {
    var playlist = [
        { title: "I'll Come Back For You", artist: "Malcolm Todd",    id: "uvVrLESLHu0" },
        { title: "You Owe Me",             artist: "Malcolm Todd",    id: "CTZbs0GHoFg" },
        { title: "Cico Buff",              artist: "Cocteau Twins",   id: "4x-ke1riAg0" },
        { title: "Purpose Is Glorious",    artist: "Natalie Holt",    id: "Ud9UxjqdqhA" },
        { title: "Last of a Dying Breed",  artist: "Joji",            id: "bU9kTNlGk0g" },
        { title: "like i want you",        artist: "giveon",          id: "d4HmHqp1Mxg" },
        { title: "if i ain't got you",     artist: "giveon",          id: "-9DDpOaMlbU" },
        { title: "Thinkin Bout You",       artist: "Frank Ocean",     id: "6JHu3b-pbh8" },
        { title: "Over & Over",            artist: "Adrian Milanio",  id: "64WTl2pxo3g" },
        { title: "내 기타",                artist: "CHAEYOUNG",       id: "dtaXzli1aHQ" },
        { title: "Earrings",               artist: "Malcolm Todd",    id: "BI9HQCzpDgQ" },
        { title: "Sunday",                 artist: "54 Ultra",        id: "fZQFKkggETI" },
        { title: "can i get a hi?",        artist: "Paw's Letter",    id: "OCSvRdgTSOQ" },
        { title: "arne",                   artist: "haruka nakamura", id: "HXIAWmBYOGM" },
        { title: "A Night To Remember",    artist: "Beabadoobee",     id: "vpX67n9zJVk" }
    ];

    function shuffle(arr) {
        var a = arr.slice();
        for (var i = a.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
        }
        return a;
    }

    var queue = shuffle(playlist);
    var queueIndex = 0;
    var current = playlist.indexOf(queue[queueIndex]);
    var player = null;
    var playing = false;
    var userWantsPlay = false;

    function advance() {
        queueIndex++;
        if (queueIndex >= queue.length) {
            // Reshuffle; avoid repeating the last-played track back-to-back
            var last = queue[queue.length - 1];
            do {
                queue = shuffle(playlist);
            } while (playlist.length > 1 && queue[0] === last);
            queueIndex = 0;
        }
        current = playlist.indexOf(queue[queueIndex]);
    }

    var PLAY_SVG  = '<polygon points="2,1 2,9 9,5" fill="currentColor"/>';
    var PAUSE_SVG = '<rect x="1.5" y="1" width="2.5" height="8" fill="currentColor"/>'
                  + '<rect x="5.5" y="1" width="2.5" height="8" fill="currentColor"/>';

    function updateDisplay() {
        var t = playlist[current];
        var titleEl  = document.getElementById('npTitle');
        var artistEl = document.getElementById('npArtist');
        if (titleEl)  titleEl.textContent  = t.title;
        if (artistEl) artistEl.textContent = t.artist;
    }

    function setPlaying(state) {
        playing = state;
        var btn = document.getElementById('npPlayBtn');
        if (!btn) return;
        btn.querySelector('svg').innerHTML = state ? PAUSE_SVG : PLAY_SVG;
        btn.setAttribute('aria-label', state ? 'Pause' : 'Play');
        var dot = document.querySelector('.np-dot');
        if (dot) dot.classList.toggle('np-dot--active', state);
    }

    window.onYouTubeIframeAPIReady = function () {
        player = new YT.Player('yt-player', {
            height: '1',
            width:  '1',
            videoId: playlist[current].id,
            playerVars: {
                autoplay:        0,
                controls:        0,
                disablekb:       1,
                fs:              0,
                iv_load_policy:  3,
                modestbranding:  1,
                rel:             0
            },
            events: {
                onStateChange: function (e) {
                    if (e.data === YT.PlayerState.PLAYING) {
                        setPlaying(true);
                    } else if (e.data === YT.PlayerState.PAUSED) {
                        // If YT paused us but the user still wants playback
                        // (e.g. browser throttling a hidden iframe), resume.
                        if (userWantsPlay) {
                            setTimeout(function () {
                                if (userWantsPlay && player && player.playVideo) {
                                    player.playVideo();
                                }
                            }, 150);
                        } else {
                            setPlaying(false);
                        }
                    } else if (e.data === YT.PlayerState.ENDED) {
                        advance();
                        updateDisplay();
                        player.loadVideoById(playlist[current].id);
                    }
                },
                onError: function () {
                    advance();
                    updateDisplay();
                    if (player && player.loadVideoById) {
                        player.loadVideoById(playlist[current].id);
                    }
                }
            }
        });
    };

    document.addEventListener('DOMContentLoaded', function () {
        updateDisplay();

        var btn = document.getElementById('npPlayBtn');
        if (btn) {
            btn.addEventListener('click', function () {
                if (!player) return;
                if (playing) {
                    userWantsPlay = false;
                    player.pauseVideo();
                } else {
                    userWantsPlay = true;
                    player.playVideo();
                }
            });
        }

        var tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
    });
})();
