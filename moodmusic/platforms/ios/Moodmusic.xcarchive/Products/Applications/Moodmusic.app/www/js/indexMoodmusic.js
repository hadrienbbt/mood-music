/**
 * Created by hadrien1 on 23/12/16.
 */

(function() {

    /**
     * Obtains parameters from the hash of the URL
     * @return Object
     */

    var userProfileSource = document.getElementById('user-profile-template').innerHTML,
        userProfileTemplate = Handlebars.compile(userProfileSource),
        userProfilePlaceholder = document.getElementById('user-profile');

    var oauthSource = document.getElementById('oauth-template').innerHTML,
        oauthTemplate = Handlebars.compile(oauthSource),
        oauthPlaceholder = document.getElementById('oauth');

    var cameraSource = document.getElementById('camera-template').innerHTML,
        cameraTemplate = Handlebars.compile(cameraSource),
        cameraPlaceholder = document.getElementById('camera');

    var rechercheSpotifySource = document.getElementById('rechercheSpotify-template').innerHTML,
        rechercheSpotifyTemplate = Handlebars.compile(rechercheSpotifySource),
        rechercheSpotifyPlaceholder = document.getElementById('rechercheSpotify');

    var meteoSource = document.getElementById('meteo-template').innerHTML,
        meteoTemplate = Handlebars.compile(meteoSource),
        meteoPlaceholder = document.getElementById('meteo');

    var lyricsSource = document.getElementById('lyrics-template').innerHTML,
        lyricsTemplate = Handlebars.compile(lyricsSource),
        lyricsPlaceholder = document.getElementById('lyrics');

    var params = getHashParams();

    var access_token = params.access_token,
        refresh_token = params.refresh_token,
        error = params.error;

    var current_user;

    // Chargement des composants
    meteoPlaceholder.innerHTML = meteoTemplate();
    lyricsPlaceholder.innerHTML = lyricsTemplate();
    //view_connexion();
    if (error) {
        alert('There was an error during the authentication');
    } else {
        if (access_token) {
            view_accueil();
            // render oauth info
            oauthPlaceholder.innerHTML = oauthTemplate({
                access_token: access_token,
                refresh_token: refresh_token
            });
            rechercheSpotifyPlaceholder.innerHTML = rechercheSpotifyTemplate();
            cameraPlaceholder.innerHTML = cameraTemplate();

            $.ajax({
                url: 'https://api.spotify.com/v1/me',
                headers: {
                    'Authorization': 'Bearer ' + access_token
                },
                success: function(response) {
                    //console.log(response);
                    userProfilePlaceholder.innerHTML = userProfileTemplate(response);
                    current_user = response.id;
                    $('#login').hide();
                    $('#loggedin').show();
                    view_artistsEvaluation();
                    //view_moodEvaluation();

                    // TODO Mettre tout ça dans une fonction et l'appeler à chaque fois...
                    afficherArtistesPrefs(current_user);
                }
            });

            var tabGenreAvailable = chargerGenres(access_token);

        } else {
            // render initial screen
            $('#login').show();
            $('#loggedin').hide();
            //window.location.href = "/login";
        }

        document.getElementById('obtain-new-token').addEventListener('click', function() {
            $.ajax({
                url: '/refresh_token',
                data: {
                    'refresh_token': refresh_token
                }
            }).done(function(data) {
                access_token = data.access_token;
                oauthPlaceholder.innerHTML = oauthTemplate({
                    access_token: access_token,
                    refresh_token: refresh_token
                });
            });
        }, false);

        document.getElementById('validerLimitTrack').addEventListener('click', function() {
            var limitTrack = document.getElementById('limitTrack').value;
            var tunetables ={valence: 0.8, activation: 0.3};
            $.ajax({
                url: '/MoodMusicRecommendation',
                data: {
                    'limitTrack': limitTrack,
                    'tunetables' : tunetables
                }
            }).done(function(data) {
                successSearch(JSON.parse(data.moodmusicRecommendation));
            });
        }, false);

        document.getElementById('get-id-artists').addEventListener('click', function() {
            $.ajax({
                url: '/IdArtist'
            }).done(function(data) {
                console.log(data.idArtist);
            });
        }, false);

        document.getElementById('getLyrics').addEventListener('click', function() {
            var artist = document.getElementById('textLyricsArtist').value;
            var track = document.getElementById('textLyricsTrack').value;
            console.log(artist + " " + track);
            $.ajax({
                url: '/getLyrics',
                data: {
                    'artist' : artist,
                    'track' : track
                }
            }).done(function(data) {
                console.log("coucou" + data.lyrics);
            });
        });

        document.getElementById('validerRecommendation').addEventListener('click', function() {
            var limitTrack = document.getElementById('nbRecommendation').value;
            var tunetables = {valence: 0.5};
            var artists = document.getElementById('artistsRecommendation').value.split(",");
            var genre = document.getElementById('listGenres').value;
            $.ajax({
                url: '/MoodMusicRecommendation',
                data: {
                    'limitTrack': limitTrack,
                    'tunetables': tunetables,
                    'artists': artists,
                    'genre': genre
                }
            }).done(function(data) {
                successSearch(JSON.parse(data.moodmusicRecommendation));
            });
        }, false);

    }
})();