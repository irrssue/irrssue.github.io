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
    // Whether the player has actually started since the last play attempt.
    // `playing` can't answer that: it drives the button, and is set the
    // moment Play is tapped.
    var playbackStarted = false;
    // Where the current track should start from: a position carried over
    // from the previous page, or 0. The player reports 0 for a cued track
    // until it has actually played, so until then this is the real position.
    var resumeAt = 0;
    var trackStarted = false;
    var playingSince = 0;
    var earlyPauseRetried = false;
    // Consecutive tracks the player has refused; see skipBroken().
    var errorStreak = 0;
    // A track change that arrived before the player could take it.
    var trackPending = false;
    // A track change under way. YouTube reports the outgoing video as PAUSED
    // on its way to loading the next one, which is not the visitor pausing.
    var switchingTrack = false;

    // Soft navigation (javascript/pjax.js) keeps the player alive between
    // home, writing, posts and bookmarks, but a full page load -- a reload,
    // or arriving from anywhere else -- starts this file from scratch. This
    // is the seam that lets a play started before it pick back up after
    // it: whichever track/position/paused
    // state the visitor left, saved to sessionStorage so it's scoped to this
    // browsing session and not shared across tabs. It cannot make playback
    // itself survive the navigation -- audio always stops when the page
    // unloads -- so what actually resumes on load is a *request* to keep
    // going, subject to the same autoplay-gesture rules as a fresh tap (see
    // requestApi below): the browser may honour it immediately, or may
    // silently block it, in which case armPlayWatchdog() leaves the button on
    // "Play" at the right track and position rather than stuck pretending.
    var STORAGE_KEY = 'irrssue-now-playing';

    function currentTime() {
        if (playerReady && trackStarted && player.getCurrentTime) return player.getCurrentTime();
        return resumeAt;
    }

    function saveState() {
        if (!myPlaylist.length) return;
        try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
                ids: myPlaylist.map(function (song) { return song.id; }),
                index: myIndex,
                playing: userWantsPlay,
                time: currentTime()
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
    //
    // It used to test `!playing`, which the tap had just set to true, so it
    // never fired and a blocked tap left the button on Pause in silence. It
    // is also only armed when playVideo() really runs: armed at the tap while
    // the player was still being built, it would give up on a start that is
    // merely waiting for YouTube to load.
    function armPlayWatchdog() {
        playbackStarted = false;
        clearTimeout(playAttemptTimer);
        playAttemptTimer = setTimeout(function () {
            if (userWantsPlay && !playbackStarted) {
                userWantsPlay = false;
                setPlaying(false);
            }
        }, 1500);
    }

    function attemptPlay() {
        armPlayWatchdog();
        player.playVideo();
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
        loadCurrent();
    }

    function playPrev() {
        if (!myPlaylist.length) return;
        myIndex--;
        if (myIndex < 0) myIndex = myPlaylist.length - 1;
        loadCurrent();
    }

    // Puts the track at myIndex into the player from its beginning: playing
    // if the visitor has asked for music, otherwise only cued -- so stepping
    // past a broken track can never start playback by itself.
    function loadCurrent() {
        resumeAt = 0;
        trackStarted = false;
        earlyPauseRetried = false;
        updateDisplay();
        if (playerReady) putTrack();
        else trackPending = true;
        saveState();
    }

    function putTrack() {
        var id = myPlaylist[myIndex].id;
        if (userWantsPlay) {
            switchingTrack = true;
            player.loadVideoById(id);
        } else {
            player.cueVideoById(id);
        }
    }

    // YouTube's codes for a video that can never play here: removed or
    // private (100), or its owner doesn't allow embedded playback (101, 150).
    var DEAD_VIDEO_ERRORS = [100, 101, 150];

    // A track the player refused. It is skipped -- and, if it can never
    // play here, dropped for the rest of the visit so Back/Next and the next
    // reshuffle don't land on it again. If every track in a row has failed
    // (offline, say, or YouTube refusing the embed outright) it stops there
    // instead of cycling through the list forever.
    function skipBroken(code) {
        errorStreak++;
        if (errorStreak > myPlaylist.length) {
            errorStreak = 0;
            userWantsPlay = false;
            clearTimeout(playAttemptTimer);
            setPlaying(false);
            return;
        }
        if (DEAD_VIDEO_ERRORS.indexOf(code) !== -1 && myPlaylist.length > 1) {
            myPlaylist.splice(myIndex, 1);
            if (myIndex >= myPlaylist.length) myIndex = 0;
            loadCurrent();
            return;
        }
        playNext();
    }

    // The YouTube embed pulls in ~20 requests, including doubleclick and
    // googleads, so it is never part of loading a page: the site makes no
    // third-party requests on load. The track name comes from SONGS, not the
    // API, so nothing waits on it.
    //
    // It can't simply wait for the Play tap either: mobile Safari/Chrome only
    // let player.playVideo() start sound when it runs synchronously inside
    // the tap that asked for it, and a player requested by that tap isn't
    // built until a network round trip later, outside the gesture, where the
    // call is silently blocked (desktop is lenient about the gap). So it is
    // requested at the visitor's first touch, click, key or wheel on a page
    // that shows the player (see warmOnInteraction), which almost always
    // leaves it built before Play is reached -- or straight away when they
    // were already listening before this page load.
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
                // The position carried over from the previous page. It used
                // to be applied with seekTo() once the player was ready, but
                // seeking a cued video starts it playing, so a track the
                // visitor had paused came back on by itself on the next page.
                start:           Math.floor(resumeAt),
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
                    if (trackPending) {
                        trackPending = false;
                        putTrack();
                        return;
                    }
                    // This fires asynchronously, well outside the tap that
                    // asked for music (or the page load resuming it), so
                    // mobile browsers can silently ignore this playVideo()
                    // call. The watchdog attemptPlay() arms catches that and
                    // resets the button so the next tap is a fresh, honored
                    // gesture.
                    if (userWantsPlay) attemptPlay();
                },
                onStateChange: function (e) {
                    if (e.data === YT.PlayerState.PLAYING) {
                        clearTimeout(playAttemptTimer);
                        playbackStarted = true;
                        switchingTrack = false;
                        // Playback only ever starts because the visitor asked
                        // for it -- here, or from their media keys.
                        userWantsPlay = true;
                        if (!trackStarted) playingSince = Date.now();
                        trackStarted = true;
                        errorStreak = 0;
                        setPlaying(true);
                        saveState();
                    } else if (e.data === YT.PlayerState.PAUSED) {
                        if (switchingTrack) return;
                        // The hidden embed used to halt itself a moment after
                        // starting, so a pause right at the start still gets
                        // one retry. Any other pause that didn't come from
                        // this widget -- media keys, headphones, the lock
                        // screen -- is the visitor's call: it used to be
                        // undone 150ms later, so the music couldn't be
                        // stopped from anywhere but this page.
                        if (userWantsPlay && !earlyPauseRetried && Date.now() - playingSince < 2500) {
                            earlyPauseRetried = true;
                            setTimeout(function () {
                                if (userWantsPlay && player && player.playVideo) {
                                    player.playVideo();
                                }
                            }, 150);
                        } else {
                            userWantsPlay = false;
                            clearTimeout(playAttemptTimer);
                            setPlaying(false);
                            saveState();
                        }
                    } else if (e.data === YT.PlayerState.ENDED) {
                        playNext();
                    }
                },
                onError: function (e) {
                    switchingTrack = false;
                    skipBroken(e && e.data);
                }
            }
        });
    };

    // The now-playing widget's markup (#npTitle/#npArtist/#npPlayBtn/etc.)
    // only exists on the homepage, and lives *inside* #pjax-root -- unlike
    // the player itself, which pjax.js deliberately keeps outside it. So a
    // soft navigation away from and back to home throws away the very DOM
    // nodes start() bound to and queried on the one real page load, and
    // replaces them with fresh, inert ones straight from the static HTML
    // (hence the "-"/blank placeholder and dead buttons). This re-binds
    // control listeners to whatever nodes currently exist and repaints them
    // from the in-memory playback state -- safe to call repeatedly, since
    // nodes from a previous swap are already detached and garbage-collected
    // along with their listeners. pjax.js calls this after every swap.
    function syncControls() {
        updateDisplay();
        setPlaying(playing);

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
                earlyPauseRetried = false;
                setPlaying(true);
                if (playerReady) {
                    attemptPlay();
                } else {
                    requestApi();
                }
            });
        }

        var nextBtn = document.getElementById('npNextBtn');
        if (nextBtn) {
            nextBtn.addEventListener('click', function () {
                // Inert until a track is really playing -- including the
                // moment after Play is tapped while the player is still
                // being built, when its methods don't exist yet.
                if (!playerReady || !playing) return;
                playNext();
            });
        }

        var backBtn = document.getElementById('npBackBtn');
        if (backBtn) {
            backBtn.addEventListener('click', function () {
                if (!playerReady || !playing) return;
                playPrev();
            });
        }
    }
    window.npSyncControls = syncControls;

    // The first sign of a visitor actually using a page that shows the
    // player. Scrolling on a phone begins with a touchstart, on a desktop
    // with a wheel, a key or a press on the scrollbar, so those are covered
    // too -- the scroll event itself isn't used, because restoring a reader's
    // place fires it with nobody touching anything. On pages without the
    // player the listeners stay put until the visitor gets to one.
    var WARM_EVENTS = ['pointerdown', 'touchstart', 'keydown', 'wheel'];

    function warmOnInteraction() {
        function warm() {
            if (!document.getElementById('npPlayBtn')) return;
            WARM_EVENTS.forEach(function (type) {
                window.removeEventListener(type, warm, true);
            });
            requestApi();
        }
        WARM_EVENTS.forEach(function (type) {
            window.addEventListener(type, warm, { capture: true, passive: true });
        });
    }

    function start() {
        var saved = loadState();
        var byId = {};
        for (var i = 0; i < SONGS.length; i++) byId[SONGS[i].id] = SONGS[i];

        if (saved) {
            myPlaylist = saved.ids.map(function (id) { return byId[id]; }).filter(Boolean);
        }

        if (myPlaylist.length) {
            myIndex = Math.max(0, Math.min(saved.index || 0, myPlaylist.length - 1));
            // Under a couple of seconds isn't worth resuming into.
            resumeAt = saved.time > 2 ? saved.time : 0;
        } else {
            myPlaylist = shuffle(SONGS);
            myIndex = 0;
        }
        if (saved && saved.playing) {
            // They were listening when the last page went away: keep going.
            requestApi();
            userWantsPlay = true;
            setPlaying(true);
        }

        if (!apiRequested) warmOnInteraction();

        setInterval(function () {
            if (playing) saveState();
        }, 3000);
        window.addEventListener('pagehide', saveState);
        document.addEventListener('visibilitychange', function () {
            if (document.hidden) saveState();
        });

        syncControls();
    }

    /* javascript/capability.js loads this file once the document is parsed, so
       DOMContentLoaded may already have come and gone by the time we get here. */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();
