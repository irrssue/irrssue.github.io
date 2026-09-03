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
    }

    function playPrev() {
        if (!myPlaylist.length) return;
        myIndex--;
        if (myIndex < 0) myIndex = myPlaylist.length - 1;
        updateDisplay();
        player.loadVideoById(myPlaylist[myIndex].id);
    }

    // The YouTube embed pulls in ~20 requests, including doubleclick and
    // googleads, so it stays off the page until someone actually presses play.
    // The track name comes from SONGS, not the API, so nothing waits on it.
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
                    // The click that loaded the API leaves the document with
                    // sticky activation, so this still counts as user-initiated.
                    if (userWantsPlay) player.playVideo();
                },
                onStateChange: function (e) {
                    if (e.data === YT.PlayerState.PLAYING) {
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
                    }
                },
                onError: function () {
                    playNext();
                }
            }
        });
    };

    function start() {
        myPlaylist = shuffle(SONGS);
        myIndex = 0;
        updateDisplay();

        var btn = document.getElementById('npPlayBtn');
        if (btn) {
            btn.addEventListener('click', function () {
                if (playing) {
                    userWantsPlay = false;
                    setPlaying(false);
                    if (player) player.pauseVideo();
                    return;
                }
                userWantsPlay = true;
                // Switch the control immediately; the embed can take a moment
                // to initialise on mobile networks.
                setPlaying(true);
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
