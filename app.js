// app.js
// Hadrien Barbat

var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
var lyrics = require('lyric-get');
var MongoClient = require("mongodb").MongoClient;
var RecommendationGenerator = require('./public/js/class/RecommendationRequest');
var IdArtistsGenerator = require('./public/js/class/IdRequest');
var user = require('./public/js/class/User.js');

var client_id = 'a3b5315e6cdd4583acfc54f639aeb020'; // Your client id
var client_secret = '2e9b13f3f48f4cc5b8d637c699cc2bc7'; // Your secret
var redirect_uri = 'http://localhost:8888/callback'; // Your redirect uri
var global_access_token;
var key_weather = 'e6953ed25cc6095a';
var limitTopArtistsPerUser = "30";
var global_user_id;

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

var stateKey = 'spotify_auth_state';

var app = express();
var db;
var idUser;

// Script BDD
MongoClient.connect("mongodb://localhost/moodmusic", function(error, bdd) {
    if (error) return funcCallback(error);

    console.log("Connecté à la base de données 'moodmusic'");
    db = bdd;
    app.use(express.static(__dirname + '/public'))
        .use(cookieParser());

    app.get('/checkSpotifySession', function(req, res) {
        idUser = req.query.id;
        var name = req.query.name;
        console.log(idUser + " " + name);
        // si l'utilisateur n'exste pas dans la bdd on le rajoute
        // s'il existe, on regarde s'il a connecté son compte spotify
        db.collection("user").find({_id: idUser}).count(function(error,userExists) {
            if (error) throw error;
            if (!userExists) {                            // IF NOT EXISTS
                // Register the user
                db.collection("user").insert({            // ADD USER
                    _id: idUser,
                    nom: name
                }, null, function (error, results) {        // WHEN DONE
                    if (error) throw error;
                    console.log(name + " a bien été inséré\n" + results);
                });
            } else {
                db.collection("user").find({_id: idUser},{refresh_token:1, _id: 0}).toArray(function(error,tokenExists) {
                    if (tokenExists[0]) {
                        var refresh_token = tokenExists[0];
                        var reconnectOptions = {
                            url: '/refresh_token',
                            data: {
                                refresh_token: refresh_token
                            }
                        }
                        request.post(reconnectOptions, function(response){
                            console.log(response);
                        });
                    } else {
                        console.log("Pas encore connecté avec spotify");
                    }
                });
            }
        });
    });

    app.get('/login', function(req, res) {
        var state = generateRandomString(16);
        res.cookie(stateKey, state);

        // your application requests authorization
        var scope = 'user-read-private user-read-email user-top-read playlist-modify-public playlist-modify-private';
        res.redirect('https://accounts.spotify.com/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: client_id,
            scope: scope,
            redirect_uri: redirect_uri,
            state: state
        }));
    });

    app.get('/callback', function(req, res) {

        // your application requests refresh and access tokens
        // after checking the state parameter

        var code = req.query.code || null;
        var state = req.query.state || null;
        var storedState = req.cookies ? req.cookies[stateKey] : null;

        if (state === null || state !== storedState) {
            res.redirect('/#' +
            querystring.stringify({
                error: 'state_mismatch'
            }));
        } else {
            res.clearCookie(stateKey);
            var authOptions = {
                url: 'https://accounts.spotify.com/api/token',
                form: {
                    code: code,
                    redirect_uri: redirect_uri,
                    grant_type: 'authorization_code'
                },
                headers: {
                    'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
                },
                json: true
            };

            request.post(authOptions, function(error, response, body) {
                if (!error && response.statusCode === 200) {

                    var access_token = body.access_token,
                        refresh_token = body.refresh_token;
                    global_access_token = body.access_token;
                    var top_artists = 0;

                    var options = {
                        url: 'https://api.spotify.com/v1/me',
                        headers: { 'Authorization': 'Bearer ' + access_token },
                        json: true
                    };

                    // use the access token to access the Spotify Web API
                    request.get(options, function(error, response, body) {
                        // Save id user
                        var user = body;
                        global_user_id = user.id;

                        // Work on the user in database
                        db.collection("user").findAndModify(
                            { _id: user.id },[],
                            { $set: {
                                name: user.name,
                                email: user.email,
                                lien_profil: user.external_urls,
                                _id: user.id,
                                image: body['images']['url'],
                                refresh_token: refresh_token
                            }},
                            {new: true, upsert: true}, function(error,response){
                                if (error)  throw error;
                                var userExixts = response.lastErrorObject.updatedExisting;
                                // if the user didn't exist, we look for his top artists
                                if (!userExixts) {
                                    // use the access token to access user's top artists
                                    options['url'] = "https://api.spotify.com/v1/me/top/artists?limit="+limitTopArtistsPerUser;
                                    request.get(options, function (error, response, body) {
                                        top_artists = body;
                                        console.log(body);
                                        var artist;
                                        for(var i = 0; i<body.items.length; i++){
                                            artist = body.items[i];
                                            db.collection("user").update(
                                                {_id: user.id},
                                                {$push: {tabArtistesPref: {
                                                    name: artist.name,
                                                    id: artist.id,
                                                    images: artist['images'],
                                                    mood_related: []
                                                }}}, null, function (error, results) {        // WHEN DONE
                                                    if (error) throw error;
                                                    console.log("L'artiste préféré a bien été modifié\n" + results);
                                                }
                                            );
                                            // Add artists to moodmusics if they dont exist
                                            db.collection("artist").findAndModify(
                                                { _id: artist.id },     // query
                                                [],               // represents a sort order if multiple matches
                                                { $set: {
                                                    name: artist.name,
                                                    popularity: artist.popularity
                                                } },   // update statement
                                                { new: true, upsert: true },    // options - new to return the modified document
                                                function(err,doc) {
                                                    if (error) throw error;
                                                    console.log("Artiste ajouté ou modifié..." + doc);
                                                }
                                            );
                                        }
                                    });
                                }
                            }
                        );
                    });

                    // we can also pass the token to the browser to make requests from there
                    res.redirect('/#' +
                    querystring.stringify({
                        access_token: access_token,
                        refresh_token: refresh_token,
                        top_artists: top_artists
                    }));
                } else {
                    res.redirect('/#' +
                    querystring.stringify({
                        error: 'invalid_token'
                    }));
                }
            });
        }
    });

    app.get('/getCurrentUserInfos', function(req, res) {
        var user = req.query.user;
        db.collection("user").find({_id: user}, {_id: 0, tabArtistesPref: 1}).toArray(function(error, response) {
            var result = JSON.parse(JSON.stringify(response));
            res.send(result);
        });
    });

    app.get('/refresh_token', function(req, res) {
        // requesting access token from refresh token
        var refresh_token = req.query.refresh_token;
        var authOptions = {
            url: 'https://accounts.spotify.com/api/token',
            headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
            form: {
                grant_type: 'refresh_token',
                refresh_token: refresh_token
            },
            json: true
        };

        request.post(authOptions, function(error, response, body) {
            if (!error && response.statusCode === 200) {
                console.log(body);
                var access_token = body.access_token;
                res.send({
                    'access_token': access_token
                });
            }
        });
    });

    // Exemple de récupération des ids Spotify d'un tableau d'artistes (string)
    app.get('/IdArtist', function(req, res) {
        var tabId = [];
        var i = 0;
        var length = 4;
        IdArtistsGenerator.IdRequest(['M83','Jake Bugg','Caravan Palace','Woodkid'],function(data){
            var json = JSON.parse(data);
            var id = json['artists']['items']['0']['id'];
            var name = json['artists']['items']['0']['name'];
            var test = name+',' + id;
            tabId[i] = test.substr(test.indexOf(",")+1);
            i++;
            console.log('Iteration '+i +test);
            if (tabId.length == length) {
                res.send({
                    'idArtist': tabId
                });
            }
        }).sendRequest(global_access_token);
    });

// Recommandation moodmusic
// Fonctionnalité qui permet d'obtenir n chansons en fonction d'artistes, de styles, de musiques mais aussi d'émotions
// Voir la classe RecommendationGenerator pour plus d'informations
    app.get('/moodmusicRecommendation', function(req, res){
        var tabId = []; // Tableau des id à passer au constructeur de RecommendationRequest
        var i = 0;
        var artists = req.query.artists;
        IdArtistsGenerator.IdRequest(artists,function(data){
            var json = JSON.parse(data);
            var id = json['artists']['items']['0']['id'];
            var name = json['artists']['items']['0']['name'];
            var test = name+',' + id;
            tabId[i] = test.substr(test.indexOf(",")+1);
            i++;
            console.log('Iteration '+i +test);
            if (tabId.length == artists.length) {
                console.log("recherche de recommandation...");
                var limitTrack = req.query.limitTrack;
                var tunetables = req.query.tunetables;
                var genre = [req.query.genre];
                RecommendationGenerator.RecommendationRequest(tabId,[],genre, tunetables,limitTrack,function(data){
                    console.log(data);
                    res.send({
                        'moodmusicRecommendation': data
                    });
                }).sendRequest(global_access_token);
            }
        }).sendRequest(global_access_token);
    });

    app.get('/getMoods', function(req, res){
        db.collection("mood").find().toArray(function(error, moods){
            var moodsJSON = JSON.stringify({moods: moods});
            res.send(moodsJSON);
        });
    });

    // Called when a mood is assigned to an artist by an user
    app.get('/addMoodToArtist', function(req, res){
        var artist = req.query.artist;
        var mood = req.query.mood;
        var ajouterMood = req.query.ajouterMood;
        var user = req.query.user;
        // On regarde si user veut enlever ou ajouter le mood
        if (ajouterMood == "true"){
            db.collection("user").update(
                {_id: user, "tabArtistesPref.id": artist},
                {$push: {"tabArtistesPref.$.mood_related": mood}},
                {upsert: true}, function(error,response) {
                    if (error) throw error;
                    res.send({state: "mood ajouté !"});
                }
            );
        } else {
            db.collection("user").update(
                {_id: user, "tabArtistesPref.id": artist},
                {$pull: {"tabArtistesPref.$.mood_related": mood}},
                {upsert: true}, function(error,response) {
                    if (error) throw error;
                    res.send({state: "mood retiré !"});
                }
            );
        }
    });

    // Return to the client an array of artists ID that match with the given mood(s)
    app.get('/getArtistsFromMood', function(req,res) {
        var mood = req.query.mood.split(",");
        var user = req.query.user;
        var tunetables = JSON.stringify(req.query.tunetables);
        console.log(tunetables);
        var tabIdArtists = new Array();

        db.collection("user").find({_id: user}).toArray(function(error, response) {
            var artistesPrefs = response['0'].tabArtistesPref;
            var moodIsSet;
            for (var i=0; i<artistesPrefs.length; i++) {
                moodIsSet = true;
                for (var j=0; j<mood.length; j++) {
                    if (artistesPrefs[i].mood_related.indexOf(mood[j]) == -1)
                        moodIsSet = false;
                }
                if (moodIsSet)  tabIdArtists.push(artistesPrefs[i].id);
            }
            var artists = encodeURIComponent(tabIdArtists.slice(0,5));
            tunetables = encodeURIComponent(tunetables);
            res.redirect('/moodmusic?artists='+artists+'&tunetables='+tunetables);
        });

    });

    // Utilisation de la classe RecommendationRequest avec directement un tableau d'id d'artistes
    app.get('/moodmusic', function(req,res) {
        var artists = req.query.artists.split(',');
        var limitTrack = 10;
        var tunetables = JSON.parse(req.query.tunetables);
        var genre = [];

        RecommendationGenerator.RecommendationRequest(artists,[],genre, tunetables,limitTrack,function(data){
            var musics = encodeURIComponent(JSON.stringify(data));
            res.redirect('/create_playlist?moodmusicRecommendation='+musics);
        }).sendRequest(global_access_token);
    });

    // Crée une playlist
    app.get('/create_playlist', function(req,res) {
        var musics = JSON.parse(JSON.parse(req.query.moodmusicRecommendation));
        //res.send({moodmusicRecommendation: musics});
        // parameters
        var playlistOptions = {
            url: 'https://api.spotify.com/v1/users/'+global_user_id+'/playlists',
            headers: {'Authorization': 'Bearer ' + global_access_token},
            body: JSON.stringify({name: "hey bitches", public: false}),
            json: true
        }
        request.post(playlistOptions, function(error, response, body) {
            if (error)  throw error;
            // Add tracks to the playlist
            var playlist = encodeURIComponent(JSON.stringify(body));
            musics = encodeURIComponent(JSON.stringify(musics));
            res.redirect('/addTracksToPlaylist?playlist='+playlist+'&moodmusicRecommendation='+musics);
        });
    });

    // Ajouter des titres à une playlist
    app.get('/addTracksToPlaylist', function(req,res) {
        var musics = JSON.parse(req.query.moodmusicRecommendation);
        var JSONplaylistObject = JSON.parse(req.query.playlist);

        // créer le string des uri
        var uriMusics = ""
        for (var i=0; i< musics.tracks.length; i++) // Mettre une ',' sauf si c'est le dernier
            uriMusics += i == musics.tracks.length ? musics.tracks[i].uri : musics.tracks[i].uri+',';
        console.log(uriMusics);

        var tracksToAdd = {
            uris: uriMusics
        }
        var addTracksOptions = {
            url: 'https://api.spotify.com/v1/users/'+global_user_id+'/playlists/'+JSONplaylistObject.id+'/tracks?'+querystring.stringify(tracksToAdd),
            headers: {'Authorization': 'Bearer ' + global_access_token}
        }
        request.post(addTracksOptions, function(error,response,body) {
            console.log(body);
            //res.redirect(JSONplaylistObject.external_urls.spotify);
            res.send({moodmusicRecommendation: JSONplaylistObject});
        });
    });

    app.get('/getLyrics', function(req, res) {
        var artist = req.query.artist;
        var track = req.query.track;
        console.log(artist + " " + track);
        lyrics.get(artist,track, function(err, data) {
            if (err) console.log(err);
            else {
                res.send({
                    'lyrics': data
                });
            }
        });
    });

// Meteo
    app.get('/user', function (req, res) {
        var latitude = req.query.latitude;
        var longitude = req.query.longitude;
        var speed = req.query.speed;
        console.log('Latitude : '+ latitude +' - Longitude : '+ longitude +' Vitesse : '+speed);

        request('http://api.wunderground.com/api/'+key_weather+'/geolookup/conditions/q/'+latitude+','+longitude+'.json', function(error, response, body){
            // On écrit dans la console
            if (!error) {
                console.log(body);
                var json = JSON.parse(body);
                var stringWeather = json['current_observation']['weather'];
                console.log(stringWeather);

                res.send({
                    'latitude': latitude,
                    'longitude': longitude,
                    'speed': speed,
                    'weather': stringWeather
                });
            } else {console.log(error);}
        });
    });

    console.log('Listening on 8888');
    app.listen(8888);
});

