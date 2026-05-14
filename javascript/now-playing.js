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
        { id: 'FPNmQmpqpI8', title: 'Paragraphs',                 artist: 'Luke Chiang'           }
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

    var SVG_NS = 'http://www.w3.org/2000/svg';

    function setSvgIcon(btn, isPaused) {
        var svg = btn.querySelector('svg');
        while (svg.firstChild) svg.removeChild(svg.firstChild);
        if (isPaused) {
            var r1 = document.createElementNS(SVG_NS, 'rect');
            r1.setAttribute('x', '1.5'); r1.setAttribute('y', '1');
            r1.setAttribute('width', '2.5'); r1.setAttribute('height', '8');
            r1.setAttribute('fill', 'currentColor');
            var r2 = document.createElementNS(SVG_NS, 'rect');
            r2.setAttribute('x', '5.5'); r2.setAttribute('y', '1');
            r2.setAttribute('width', '2.5'); r2.setAttribute('height', '8');
            r2.setAttribute('fill', 'currentColor');
            svg.appendChild(r1);
            svg.appendChild(r2);
        } else {
            var poly = document.createElementNS(SVG_NS, 'polygon');
            poly.setAttribute('points', '2,1 2,9 9,5');
            poly.setAttribute('fill', 'currentColor');
            svg.appendChild(poly);
        }
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
            setSvgIcon(btn, state);
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
        updateDisplay();
        player.loadVideoById(myPlaylist[myIndex].id);
    }

    window.onYouTubeIframeAPIReady = function () {
        myPlaylist = shuffle(SONGS);
        myIndex = 0;
        updateDisplay();

        player = new YT.Player('yt-player', {
            height: '1',
            width:  '1',
            videoId: myPlaylist[0].id,
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
                    player.cueVideoById(myPlaylist[0].id);
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
