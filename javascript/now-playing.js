(function () {
    var PLAYLIST_ID = 'PLacymMC6SebhlQ5lT26FS6b4nS5c5NIqR';

    var player = null;
    var playing = false;
    var userWantsPlay = false;
    var shuffled = false;
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
        if (!btn) return;
        btn.querySelector('svg').innerHTML = state ? PAUSE_SVG : PLAY_SVG;
        btn.setAttribute('aria-label', state ? 'Pause' : 'Play');
        var dot = document.querySelector('.np-dot');
        if (dot) dot.classList.toggle('np-dot--active', state);
    }

    // Try to grab playlist IDs and build our shuffled queue.
    // Returns true on success, false if getPlaylist() not ready yet.
    function tryBuildPlaylist() {
        var ids = player.getPlaylist();
        if (!ids || !ids.length) return false;
        shuffled = true;
        myPlaylist = shuffle(ids);
        myIndex = 0;
        return true;
    }

    // Advance to the next track using our own queue so we never
    // depend on getPlaylist() succeeding at playback time.
    function playNext() {
        if (!myPlaylist.length) return;
        myIndex++;
        if (myIndex >= myPlaylist.length) {
            var last = myPlaylist[myPlaylist.length - 1];
            myPlaylist = shuffle(myPlaylist);
            // avoid repeating the last-played song at the start of the new loop
            if (myPlaylist.length > 1 && myPlaylist[0] === last) {
                var tmp = myPlaylist[0]; myPlaylist[0] = myPlaylist[1]; myPlaylist[1] = tmp;
            }
            myIndex = 0;
        }
        player.loadVideoById(myPlaylist[myIndex]);
    }

    // Poll until getPlaylist() is populated, then build our queue and re-cue.
    function waitAndBuild(attempts) {
        if (shuffled) return;
        attempts = attempts || 0;
        if (attempts > 20) return; // give up after ~10 s
        if (tryBuildPlaylist()) {
            player.cuePlaylist(myPlaylist, 0, 0);
        } else {
            setTimeout(function () { waitAndBuild(attempts + 1); }, 500);
        }
    }

    window.onYouTubeIframeAPIReady = function () {
        player = new YT.Player('yt-player', {
            height: '1',
            width:  '1',
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
                    player.cuePlaylist({ list: PLAYLIST_ID, listType: 'playlist' });
                },
                onStateChange: function (e) {
                    if (e.data === YT.PlayerState.CUED && !shuffled) {
                        // getPlaylist() is sometimes null right after cuePlaylist fires CUED;
                        // fall back to polling if so.
                        if (tryBuildPlaylist()) {
                            player.cuePlaylist(myPlaylist, 0, 0);
                        } else {
                            waitAndBuild();
                        }
                        updateDisplay();
                        return;
                    }

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
                    // Skip unplayable / region-blocked tracks using our own queue.
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
                    // If shuffle hasn't happened yet (getPlaylist was null earlier),
                    // try once more before falling back to plain playVideo.
                    if (!shuffled && tryBuildPlaylist()) {
                        player.loadPlaylist(myPlaylist, 0, 0);
                    } else {
                        player.playVideo();
                    }
                }
            });
        }

        var tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
    });
})();
