(function () {
    var SONGS = [
        { id: 'tGv7CUutzqU', title: 'About You',                 artist: 'The 1975'              },
        { id: '6DcUnqZqTvI', title: 'UNDERSTAND',                 artist: 'keshi'                 },
        { id: 'WH_xXYYuBEc', title: 'One Last Time',              artist: 'Summer Salt'           },
        { id: 'uvVrLESLHu0', title: "I'll Come Back For You",     artist: 'Malcolm Todd'          },
        { id: '4x-ke1riAg0', title: 'Cico Buff',                  artist: 'Cocteau Twins'         },
        { id: '5tpQaCAq6Qc', title: 'Loving Machine',             artist: 'TV Girl'               },
        { id: 'uFz30ro-vk4', title: 'Mrs Magic',                  artist: 'Strawberry Guy'        },
        { id: 'Ro0vTEuSUuo', title: 'Beanie',                     artist: 'Chezile'               },
        { id: 'K1iwuJQ2E0E', title: 'hold me, never let go',      artist: 'Rocco'                 },
        { id: 'EM1t8H_PE78', title: 'Scott Street',               artist: 'Phoebe Bridgers'       },
        { id: '4acBBO7jDjA', title: 'Middle Of Nowhere',          artist: 'Vancouver Sleep Clinic' },
        { id: 'IYFqc9gk4qI', title: 'Leave The Door Open',       artist: 'Bruno Mars'            },
        { id: '6KJtcZ803W4', title: 'Dance, Baby!',               artist: 'boy pablo'             },
        { id: 'zoae8_0HG1Y', title: 'Was It Something I Said',    artist: 'Mykey'                 },
        { id: 'lAvWldoOmKs', title: 'Hold On Tight',              artist: 'Jesse Barrera'         },
        { id: '4De_ERjvuUI', title: 'SLOW DANCING IN THE DARK',   artist: 'Joji'                  },
        { id: 'NLphEFOyoqM', title: 'Let You Break My Heart Again', artist: 'Laufey'              },
        { id: '0bZ_TK6Q4bs', title: 'summer nights',              artist: 'The Millennial Club'   },
        { id: 'FPNmQmpqpI8', title: 'Paragraphs',                 artist: 'Luke Chiang'           },
        { id: 'mARPGPmGOT4', title: 'Anything',                   artist: 'Adrianne Lenker'       },
        { id: 'Vj2VHNvkBPA', title: 'Falling Behind',              artist: 'Laufey'                },
        { id: '6uSC5nUn-LM', title: 'Gimme Love',                  artist: 'Joji'                  },
        { id: 'iOYAl37AScY', title: 'One Summer Day',              artist: 'Joe Hisaishi'          },
        { id: 'X-t2we3LL64', title: 'Nièo (Bonus Track)',          artist: 'sonicbrat'             },
        { id: 'W9qGMTNnyfc', title: 'LIMBO',                       artist: 'keshi'                 }
    ];

    var player = null;
    var playerReady = false;
    var apiRequested = false;
    var playing = false;
    var userWantsPlay = false;
    var myPlaylist = [];
    var myIndex = 0;
    var playAttemptTimer = null;
    var resumeAt = 0;
    var pendingResume = false;

    // Every page on this static site is a full navigation, so nothing here
    // survives it on its own. This is the seam that lets a play started on
    // one page pick back up on the next: whichever track/position/paused
    // state the visitor left, saved to sessionStorage so it's scoped to this
    // browsing session and not shared across tabs. It cannot make playback
    // itself survive the navigation -- audio always stops when the page
    // unloads -- so what actually resumes on load is a *request* to keep
    // going, subject to the same autoplay-gesture rules as a fresh tap (see
    // requestApi below): the browser may honour it immediately, or may
    // silently block it, in which case armPlayWatchdog() leaves the button on
    // "Play" at the right track and position rather than stuck pretending.
    var STORAGE_KEY = 'irrssue-now-playing';

    function saveState() {
        if (!myPlaylist.length) return;
        try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
                ids: myPlaylist.map(function (song) { return song.id; }),
                index: myIndex,
                playing: userWantsPlay,
                time: (player && player.getCurrentTime) ? player.getCurrentTime() : 0
            }));
        } catch (error) {
            // Storage unavailable (private mode, disabled, quota) -- resuming
            // on the next page just falls back to a fresh shuffled start.
        }
    }

    function loadState() {
        try {
            var raw = sessionStorage.getItem(STORAGE_KEY);
            if (!raw) return null;
            var state = JSON.parse(raw);
            if (!state || !state.ids || !state.ids.length) return null;
            return state;
        } catch (error) {
            return null;
        }
    }

    function shuffle(arr) {
        var a = arr.slice();
        for (var i = a.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
        }
        return a;
    }

    function updateDisplay() {
        var song = myPlaylist[myIndex];
        if (!song) return;
        var titleEl  = document.getElementById('npTitle');
        var artistEl = document.getElementById('npArtist');
        if (titleEl)  titleEl.textContent  = song.title;
        if (artistEl) artistEl.textContent = song.artist;
    }

    function setPlaying(state) {
        playing = state;
        var btn = document.getElementById('npPlayBtn');
        if (btn) {
            btn.classList.toggle('is-playing', state);
            btn.setAttribute('aria-label', state ? 'Pause' : 'Play');
            btn.setAttribute('aria-pressed', String(state));
        }
    }

    // Guards the optimistic "playing" UI set on tap: if playback hasn't
    // actually started shortly after, the play attempt was silently blocked
    // (see the requestApi comment above) rather than just slow. Snapping the
    // button back to "Play" means the *next* tap is a fresh, real gesture,
    // which mobile browsers always honor -- instead of needing a confusing
    // pause-then-play to get sound.
    function armPlayWatchdog() {
        clearTimeout(playAttemptTimer);
        playAttemptTimer = setTimeout(function () {
            if (userWantsPlay && !playing) {
                userWantsPlay = false;
                setPlaying(false);
            }
        }, 1500);
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
        updateDisplay();
        player.loadVideoById(myPlaylist[myIndex].id);
        saveState();
    }

    function playPrev() {
        if (!myPlaylist.length) return;
        myIndex--;
        if (myIndex < 0) myIndex = myPlaylist.length - 1;
        updateDisplay();
        player.loadVideoById(myPlaylist[myIndex].id);
        saveState();
    }

    // The YouTube embed pulls in ~20 requests, including doubleclick and
    // googleads, so this is a background load rather than part of the
    // initial render -- it's kicked off right after DOMContentLoaded, not
    // blocking anything on the page. The track name comes from SONGS, not
    // the API, so nothing waits on it.
    //
    // It's requested on load rather than lazily on the first tap: mobile
    // Safari/Chrome only allow player.playVideo() to autoplay with sound
    // when it runs synchronously inside the tap that requested it.
    // Requesting the API on click means the player isn't built until onReady
    // fires later (after a network round trip), so the resulting playVideo()
    // call happens outside the gesture and gets silently blocked on mobile
    // (desktop is lenient about this gap). This is also why this can't just
    // warm once and be done -- every page on the site is a full navigation,
    // so this whole file re-runs from scratch and the player has to be
    // rebuilt again on each page. Warming it immediately on load (not on
    // idle/click) gives it the most possible time to finish before someone
    // actually taps play.
    function requestApi() {
        if (apiRequested) return;
        apiRequested = true;
        var tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
    }

    window.onYouTubeIframeAPIReady = function () {
        player = new YT.Player('yt-player', {
            height: '1',
            width:  '1',
            videoId: myPlaylist[myIndex].id,
            playerVars: {
                autoplay:        0,
                controls:        0,
                disablekb:       1,
                fs:              0,
                iv_load_policy:  3,
                modestbranding:  1,
                rel:             0,
                playsinline:     1
            },
            events: {
                onReady: function () {
                    playerReady = true;
                    if (pendingResume) {
                        pendingResume = false;
                        if (resumeAt > 2) player.seekTo(resumeAt, true);
                    }
                    // This fires asynchronously, well outside the click that
                    // triggered it, so mobile browsers can silently ignore
                    // this playVideo() call. armPlayWatchdog() (set when the
                    // tap happened, or when a resume was attempted on load)
                    // catches that and resets the button so the next tap is a
                    // fresh, honored gesture.
                    if (userWantsPlay) player.playVideo();
                },
                onStateChange: function (e) {
                    if (e.data === YT.PlayerState.PLAYING) {
                        clearTimeout(playAttemptTimer);
                        setPlaying(true);
                        saveState();
                    } else if (e.data === YT.PlayerState.PAUSED) {
                        if (userWantsPlay) {
                            setTimeout(function () {
                                if (userWantsPlay && player && player.playVideo) {
                                    player.playVideo();
                                }
                            }, 150);
                        } else {
                            setPlaying(false);
                            saveState();
                        }
                    } else if (e.data === YT.PlayerState.ENDED) {
                        playNext();
                    }
                },
                onError: function () {
                    playNext();
                }
            }
        });
    };

    function start() {
        var saved = loadState();
        var byId = {};
        for (var i = 0; i < SONGS.length; i++) byId[SONGS[i].id] = SONGS[i];

        if (saved) {
            myPlaylist = saved.ids.map(function (id) { return byId[id]; }).filter(Boolean);
        }

        if (myPlaylist.length) {
            myIndex = Math.max(0, Math.min(saved.index || 0, myPlaylist.length - 1));
            resumeAt = saved.time || 0;
            pendingResume = resumeAt > 2;
        } else {
            myPlaylist = shuffle(SONGS);
            myIndex = 0;
        }
        updateDisplay();
        requestApi();

        if (saved && saved.playing) {
            userWantsPlay = true;
            setPlaying(true);
            armPlayWatchdog();
            if (playerReady) player.playVideo();
        }

        setInterval(function () {
            if (playing) saveState();
        }, 3000);
        window.addEventListener('pagehide', saveState);
        document.addEventListener('visibilitychange', function () {
            if (document.hidden) saveState();
        });

        var btn = document.getElementById('npPlayBtn');
        if (btn) {
            btn.addEventListener('click', function () {
                if (playing) {
                    userWantsPlay = false;
                    clearTimeout(playAttemptTimer);
                    setPlaying(false);
                    if (player) player.pauseVideo();
                    return;
                }
                userWantsPlay = true;
                // Switch the control immediately; the embed can take a moment
                // to initialise on mobile networks. armPlayWatchdog() reverts
                // this if playback doesn't actually start in time.
                setPlaying(true);
                armPlayWatchdog();
                if (playerReady) {
                    player.playVideo();
                } else {
                    requestApi(); // onReady picks it up from userWantsPlay
                }
            });
        }

        var nextBtn = document.getElementById('npNextBtn');
        if (nextBtn) {
            nextBtn.addEventListener('click', function () {
                if (!player || !playing) return;
                playNext();
            });
        }

        var backBtn = document.getElementById('npBackBtn');
        if (backBtn) {
            backBtn.addEventListener('click', function () {
                if (!player || !playing) return;
                playPrev();
            });
        }
    }

    /* javascript/capability.js loads this file once the document is parsed, so
       DOMContentLoaded may already have come and gone by the time we get here. */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();
