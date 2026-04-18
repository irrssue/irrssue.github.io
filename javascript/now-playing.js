(function () {
    var PLAYLIST_ID = 'PLacymMC6SebhlQ5lT26FS6b4nS5c5NIqR';

    var player = null;
    var playing = false;
    var userWantsPlay = false;
    var shuffled = false;

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
                    // Load the full playlist metadata; YT returns every video ID
                    // via getPlaylist() once it's cued, so we can shuffle ourselves.
                    player.cuePlaylist({ list: PLAYLIST_ID, listType: 'playlist' });
                },
                onStateChange: function (e) {
                    // First CUED event: playlist is loaded. Grab all IDs, shuffle,
                    // re-cue as an explicit video-ID array so YT plays in our order.
                    if (e.data === YT.PlayerState.CUED && !shuffled) {
                        var ids = player.getPlaylist();
                        if (ids && ids.length) {
                            shuffled = true;
                            player.cuePlaylist(shuffle(ids), 0, 0);
                        }
                        updateDisplay();
                        return;
                    }

                    if (e.data === YT.PlayerState.PLAYING) {
                        updateDisplay();
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
                        // Last track finished — reshuffle the whole playlist
                        // and keep playing so the loop never replays in order.
                        var curr = player.getPlaylist();
                        if (curr && curr.length) {
                            var last = curr[curr.length - 1];
                            var next = shuffle(curr);
                            if (next.length > 1 && next[0] === last) {
                                var tmp = next[0]; next[0] = next[1]; next[1] = tmp;
                            }
                            player.loadPlaylist(next, 0, 0);
                        }
                    } else if (e.data === YT.PlayerState.CUED) {
                        updateDisplay();
                    }
                },
                onError: function () {
                    // Skip unplayable/region-blocked tracks.
                    if (player && player.nextVideo) player.nextVideo();
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

        var tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
    });
})();
