(function () {
    var VIDEO_IDS = [
        'tGv7CUutzqU',
        '6DcUnqZqTvI',
        'WH_xXYYuBEc',
        'uvVrLESLHu0',
        '4x-ke1riAg0',
        '5tpQaCAq6Qc',
        'uFz30ro-vk4',
        'Ro0vTEuSUuo',
        'K1iwuJQ2E0E',
        'EM1t8H_PE78',
        '4acBBO7jDjA',
        'IYFqc9gk4qI',
        '6KJtcZ803W4',
        'zoae8_0HG1Y',
        'lAvWldoOmKs',
        '4De_ERjvuUI'
    ];

    var player = null;
    var playing = false;
    var userWantsPlay = false;
    var myPlaylist = [];
    var myIndex = 0;

    function shuffle(arr) {
        var a = arr.slice();
        for (var i = a.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
        }
        return a;
    }

    var PLAY_SVG  = '<polygon points="2,1 2,9 9,5" fill="currentColor"/>';
    var PAUSE_SVG = '<rect x="1.5" y="1" width="2.5" height="8" fill="currentColor"/>'
                  + '<rect x="5.5" y="1" width="2.5" height="8" fill="currentColor"/>';

    function updateDisplay() {
        if (!player || !player.getVideoData) return;
        var data = player.getVideoData();
        if (!data) return;
        var titleEl  = document.getElementById('npTitle');
        var artistEl = document.getElementById('npArtist');
        if (titleEl)  titleEl.textContent  = data.title  || '—';
        if (artistEl) artistEl.textContent = data.author || '';
    }

    function setPlaying(state) {
        playing = state;
        var btn = document.getElementById('npPlayBtn');
        if (btn) {
            btn.querySelector('svg').innerHTML = state ? PAUSE_SVG : PLAY_SVG;
            btn.setAttribute('aria-label', state ? 'Pause' : 'Play');
        }
        var dot = document.querySelector('.np-dot');
        if (dot) dot.classList.toggle('np-dot--active', state);
        var label = document.getElementById('npLabelBtn');
        if (label) {
            label.textContent = state ? 'Skip' : 'Play';
            label.setAttribute('aria-label', state ? 'Skip to next track' : 'Play');
            label.classList.toggle('np-label--active', state);
        }
    }

    function playNext() {
        if (!myPlaylist.length) return;
        myIndex++;
        if (myIndex >= myPlaylist.length) {
            var last = myPlaylist[myPlaylist.length - 1];
            myPlaylist = shuffle(myPlaylist);
            if (myPlaylist.length > 1 && myPlaylist[0] === last) {
                var tmp = myPlaylist[0]; myPlaylist[0] = myPlaylist[1]; myPlaylist[1] = tmp;
            }
            myIndex = 0;
        }
        player.loadVideoById(myPlaylist[myIndex]);
    }

    window.onYouTubeIframeAPIReady = function () {
        myPlaylist = shuffle(VIDEO_IDS);
        myIndex = 0;

        player = new YT.Player('yt-player', {
            height: '1',
            width:  '1',
            videoId: myPlaylist[0],
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
                onReady: function () {
                    player.cueVideoById(myPlaylist[0]);
                },
                onStateChange: function (e) {
                    if (e.data === YT.PlayerState.PLAYING) {
                        updateDisplay();
                        setPlaying(true);
                    } else if (e.data === YT.PlayerState.PAUSED) {
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
                        playNext();
                    } else if (e.data === YT.PlayerState.CUED) {
                        updateDisplay();
                    }
                },
                onError: function () {
                    playNext();
                }
            }
        });
    };

    document.addEventListener('DOMContentLoaded', function () {
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

        var label = document.getElementById('npLabelBtn');
        if (label) {
            label.addEventListener('click', function () {
                if (!player || !playing) return;
                playNext();
            });
        }

        var tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
    });
})();
