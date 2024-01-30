// app.js
// Hadrien Barbat
require('dotenv').config()

var fs = require('fs');
var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var lyrics = require('lyric-get');
var session = require('express-session');
var MongoClient = require("mongodb").MongoClient;
var nodemailer = require("nodemailer");
var RecommendationGenerator = require('./public/js/class/RecommendationRequest.js');
var IdArtistsGenerator = require('./public/js/class/IdRequest.js');
var user = require('./public/js/class/User.js');

// Module dependencies
require('./js/response.js');

var client_id = process.env.SPOTIFY_CLIENT_ID || 'CLIENT_ID';
var client_secret = process.env.SPOTIFY_CLIENT_SECRET || 'CLIENT_SECRET';
var key_weather = 'YOUR_KEY_WEATHER';
var limitTopArtistsPerUser = "15";

var redirect_uri = process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:8888/callback'; // Your redirect uri
var port = process.env.PORT || 8888;

var mongo_uri = process.env.MONGO_URI || 'MONGO_URI'

var public_dir = process.env.PUBLIC_DIR || __dirname + '/public'
/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function (length) {
    var text = '';
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (var i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

var stateKey = 'spotify_auth_state';

var app = express();

// create reusable transporter object using the default SMTP transport
var transporter = nodemailer.createTransport({
    /*host: 'ssl0.ovh.net',
    port: 465,
    secureConnection: true,*/
    service: 'gmail',
    auth: {
        user: 'YOUR_EMAIL',
        pass: 'YOUR_PASSWORD'
    }
});

// Script BDD
MongoClient.connect(mongo_uri).then(function (client) {
    const db = client.db()
    console.log("Connecté à la base de données 'moodmusic'");
    app.use(express.static(public_dir))
        .use(cookieParser())
        .use(session({ secret: 'ssshhhhh' }))
        .use(bodyParser.json()) // support json encoded bodies
        .use(bodyParser.urlencoded({ extended: true })) // support encoded bodies
        .use(function (req, res, next) {
            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
            next();
        });

    /* app.get('/checkSpotifySession', function(req,res) {
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
     });*/

    app.get('/login', function (req, res) {
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

    app.get('/callback', function (req, res) {

        // your application requests refresh and access tokens
        // after checking the state parameter

        var code = req.query.code || null;
        var state = req.query.state || null;
        var storedState = req.cookies ? req.cookies[stateKey] : null;

        if (state === null || state !== storedState) {
            res.redirect('/#' +
                querystring.stringify({
                    error: 'tryAgain!'
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

            request.post(authOptions, function (error, response, body) {
                if (!error && response.statusCode === 200) {

                    var access_token = body.access_token,
                        refresh_token = body.refresh_token;
                    req.session.global_access_token = body.access_token;
                    var top_artists = 0;

                    var options = {
                        url: 'https://api.spotify.com/v1/me',
                        headers: { 'Authorization': 'Bearer ' + access_token },
                        json: true
                    };

                    // use the access token to access the Spotify Web API
                    request.get(options, function (error, response, body) {
                        // Save id user
                        var user = body;

                        // Work on the user in database
                        db.collection("user").findAndModify(
                            { _id: user.id }, [],
                            {
                                $set: {
                                    name: user.display_name,
                                    email: user.email,
                                    lien_profil: user.external_urls,
                                    _id: user.id,
                                    //image: body['images']['0']['url'],
                                    refresh_token: refresh_token
                                }
                            },
                            { new: true, upsert: true }, function (error, response) {
                                if (error) throw error;
                                var userExists = response.lastErrorObject.updatedExisting;
                                // if the user didn't exist, we look for his top artists
                                if (!userExists) {
                                    // use the access token to access user's top artists
                                    options['url'] = "https://api.spotify.com/v1/me/top/artists?limit=" + limitTopArtistsPerUser;
                                    request.get(options, function (error, response, body) {
                                        top_artists = body;
                                        console.log("******************************");
                                        console.log("Récupération des artistes préférés de " + user.display_name + "...");
                                        var artist;
                                        for (var i = 0; i < body.items.length; i++) {
                                            artist = body.items[i];
                                            db.collection("user").update(
                                                { _id: user.id },
                                                {
                                                    $push: {
                                                        tabArtistesPref: {
                                                            name: artist.name,
                                                            id: artist.id,
                                                            images: artist['images'],
                                                            mood_related: []
                                                        }
                                                    }
                                                }, null, function (error, results) {        // WHEN DONE
                                                    if (error) throw error;
                                                    console.log("L'artiste préféré de " + user.display_name + " a bien été modifié\n" + results);
                                                }
                                            );
                                            // Add artists to moodmusics if they dont exist
                                            db.collection("artist").findAndModify(
                                                { _id: artist.id },     // query
                                                [],               // represents a sort order if multiple matches
                                                {
                                                    $set: {
                                                        name: artist.name,
                                                        popularity: artist.popularity,
                                                        genres: artist.genres
                                                    }
                                                },   // update statement
                                                { new: true, upsert: true },    // options - new to return the modified document
                                                function (err, doc) {
                                                    if (error) throw error;
                                                    console.log(artist.name + " ajouté à la bdd moodmusic!");
                                                }
                                            );
                                        }
                                        console.log("******************************\n");
                                    });
                                }
                                // we can also pass the token to the browser to make requests from there
                                res.redirect('/#' +
                                    querystring.stringify({
                                        access_token: access_token,
                                        refresh_token: refresh_token,
                                        user_exists: userExists
                                    }));
                            }
                        );
                    });
                } else {
                    res.redirect('/#' +
                        querystring.stringify({
                            error: 'invalid_token'
                        }));
                }
            });
        }
    });

    app.get('/getCurrentUserInfos', function (req, res) {
        var user = req.query.user;
        db.collection("user").find({ _id: user }, { _id: 0, tabArtistesPref: 1 }).toArray(function (error, response) {
            var result = JSON.parse(JSON.stringify(response));
            res.send(result);
        });
    });

    app.get('/refresh_token', function (req, res) {
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

        request.post(authOptions, function (error, response, body) {
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
    app.get('/IdArtist', function (req, res) {
        var tabId = [];
        var i = 0;
        var length = 4;
        IdArtistsGenerator.IdRequest(['M83', 'Jake Bugg', 'Caravan Palace', 'Woodkid'], function (data) {
            var json = JSON.parse(data);
            var id = json['artists']['items']['0']['id'];
            var name = json['artists']['items']['0']['name'];
            var test = name + ',' + id;
            tabId[i] = test.substr(test.indexOf(",") + 1);
            i++;
            console.log('Iteration ' + i + test);
            if (tabId.length == length) {
                res.send({
                    'idArtist': tabId
                });
            }
        }).sendRequest(req.session.global_access_token);
    });

    // Recommandation moodmusic
    // Fonctionnalité qui permet d'obtenir n chansons en fonction d'artistes, de styles, de musiques mais aussi d'émotions
    // Voir la classe RecommendationGenerator pour plus d'informations
    app.get('/moodmusicRecommendation', function (req, res) {
        var tabId = []; // Tableau des id à passer au constructeur de RecommendationRequest
        var i = 0;
        var artists = req.query.artists;
        IdArtistsGenerator.IdRequest(artists, function (data) {
            var json = JSON.parse(data);
            var id = json['artists']['items']['0']['id'];
            var name = json['artists']['items']['0']['name'];
            var test = name + ',' + id;
            tabId[i] = test.substr(test.indexOf(",") + 1);
            i++;
            console.log('Iteration ' + i + test);
            if (tabId.length == artists.length) {
                console.log("recherche de recommandation...");
                var limitTrack = req.query.limitTrack;
                var tunetables = req.query.tunetables;
                var genre = [req.query.genre];
                RecommendationGenerator.RecommendationRequest(tabId, [], genre, tunetables, limitTrack, function (data) {
                    console.log(data);
                    res.send({
                        'moodmusicRecommendation': data
                    });
                }).sendRequest(req.session.global_access_token);
            }
        }).sendRequest(req.session.global_access_token);
    });

    app.get('/getMoods', function (req, res) {
        db.collection("mood").find().sort({ ordre: 1 }).toArray(function (error, moods) {
            var moodsJSON = JSON.stringify({ moods: moods });
            res.send(moodsJSON);
        });
    });

    // Called when a mood is assigned to an artist by an user
    app.get('/addMoodToArtist', function (req, res) {
        console.log("******************************");
        var artist = req.query.artist;
        var mood = req.query.mood;
        var ajouterMood = req.query.ajouterMood;
        var user = req.query.user;
        // On regarde si user veut enlever ou ajouter le mood
        if (ajouterMood == "true") {
            db.collection("user").update(
                { _id: user, "tabArtistesPref.id": artist },
                { $push: { "tabArtistesPref.$.mood_related": mood } },
                { upsert: true }, function (error, response) {
                    if (error) throw error;
                    console.log(user + " a ajouté l'émotion " + mood + " à l'artiste " + artist)
                }
            );
        } else {
            db.collection("user").update(
                { _id: user, "tabArtistesPref.id": artist },
                { $pull: { "tabArtistesPref.$.mood_related": mood } },
                { upsert: true }, function (error, response) {
                    if (error) throw error;
                    console.log(user + " a retiré l'émotion " + mood + " de l'artiste " + artist)
                }
            );
        }
        res.redirect('/calculerTunetables?artist=' + artist + '&user=' + user);
    });

    // Mettre a jour les valence et activation moyennes de l'artiste
    app.get('/calculerTunetables', function (req, res) {
        var user = req.query.user;
        var artist = req.query.artist;
        var valence = 0;
        var activation = 0;
        console.log("Calcul des nouvelles valences et activation de l'artiste " + artist + " pour l'utilisateur " + user + "...");
        // chercher l'artiste dans les artistes préférés de l'utilisateur
        db.collection("user").find({ _id: user }).toArray(function (error, data_user) {
            var tabArtistesPref = data_user[0].tabArtistesPref;
            for (var i = 0; i < tabArtistesPref.length; i++) {
                if (tabArtistesPref[i].id == artist) {
                    var mood_related = tabArtistesPref[i].mood_related;
                    var nbMood = parseInt(tabArtistesPref[i].mood_related.length);
                    if (nbMood != 0) {
                        console.log("L'artiste possède " + nbMood + " moods");
                        var compteur_mood = 0; // Pour savoir quand on a fini d'additionner les tunetables
                        var dance = false;
                        // On regarde les emojis qui correspondent à l'artiste pour faire une moyenne des valences et activations
                        for (var j = 0; j < nbMood; j++) {
                            // Récupérer le mood j si ce n'est pas une exception
                            db.collection("mood").find({ state: mood_related[j] }).toArray(function (error, response) {
                                compteur_mood++;

                                if (response[0].state != 'dance') {
                                    valence += parseFloat(response[0].valence);
                                    activation += parseFloat(response[0].activation);
                                    //console.log (response[0].state+ " a pour valence "+response[0].valence+" ,et pour activation "+response[0].activation);
                                    //console.log(compteur_mood+" - "+nbMood);

                                } else {  // si il y a dance on ajoute la tunetable (on enlève les autres si il n'y a que ça)
                                    dance = true;
                                    if (nbMood == 1) {
                                        db.collection("user").update({ _id: user, "tabArtistesPref.id": artist }, {
                                            $unset: { "tabArtistesPref.$.activation": 1, "tabArtistesPref.$.valence": 1 }
                                        }, function (error, response) {
                                            if (error) throw error;
                                            console.log("valence et activation supprimées car aucun emoji sélectionné");
                                            console.log("******************************\n");
                                        });
                                    }
                                    db.collection("user").update({ _id: user, "tabArtistesPref.id": artist }, {
                                        $set: { "tabArtistesPref.$.danceability": response[0].danceability }
                                    }, function (error, response) {
                                        if (error) throw error;
                                    });
                                }
                                // quand c'est le dernier aller retour vers la BDD on passe à la suite
                                if (compteur_mood == nbMood) {

                                    // Enlever la tunetable dance si elle n'est plus sélectionnée
                                    if (!dance) {
                                        db.collection("user").update({ _id: user, "tabArtistesPref.id": artist }, {
                                            $unset: { "tabArtistesPref.$.danceability": 1 }
                                        }, function (error, response) {
                                            if (error) throw error;
                                            // console.log("dansabilité supprimée");
                                        });
                                    }
                                    valence = dance ? valence / (nbMood - 1) : valence / nbMood;
                                    activation = dance ? activation / (nbMood - 1) : activation / nbMood;

                                    // Modifier l'artiste pref avec la valence et l'activation calculée
                                    db.collection("user").update({ _id: user, "tabArtistesPref.id": artist }, {
                                        $set: { "tabArtistesPref.$.valence": valence, "tabArtistesPref.$.activation": activation }
                                    }, function (error, response) {
                                        if (error) throw error;
                                        console.log("nouvelle valence de l'artiste : " + valence);
                                        console.log("nouvelle activation de l'artiste : " + activation);
                                        console.log("******************************\n");
                                    });
                                }
                            });
                        }
                        res.send({ state: "tunetables modifiée" });
                    } else { // Cas où aucune emoji n'est sélectionnée
                        db.collection("user").update({ _id: user, "tabArtistesPref.id": artist }, {
                            $unset: { "tabArtistesPref.$.danceability": 1, "tabArtistesPref.$.activation": 1, "tabArtistesPref.$.valence": 1 }
                        }, function (error, response) {
                            if (error) throw error;
                            console.log("Plus d'emoji pour cet artiste. Tunetables supprimées.");
                            res.send({ state: "tunetables supprimées" });
                            console.log("******************************\n");
                        });
                    }
                }
            }
        });
    });

    // Return to the client an array of artists ID that match with the given mood(s)
    app.get('/getArtistsFromMood', function (req, res) {
        req.session.nom_playlist = req.query.nom_playlist ? req.query.nom_playlist : req.query.mood;
        req.session.emojis = req.query.mood;
        req.session.global_user_id = req.query.user;
        var tunetables = JSON.stringify(req.query.tunetables);
        var tabIdArtists = new Array();
        var tabNameArtists = [];

        console.log("******************************");
        console.log("Création d'une nouvelle playlist pour l'utilisateur " + req.session.global_user_id + "...");

        // Tunetables
        var valence_base = req.query.tunetables.valence;
        var activation_base = req.query.tunetables.energy;
        var danceability_base = req.query.tunetables.danceability ? req.query.tunetables.danceability : null;

        // Récupérer les artistes préférés qui correspondent à une ou plusieurs humeurs choisies
        db.collection("user").find({ _id: req.session.global_user_id }).toArray(function (error, response) {
            // Tableau parcouru pour trouver des artistes
            var artistesPrefs = response['0'].tabArtistesPref;

            if (artistesPrefs.length == 0) {
                res.send({ error: "Pas d'artiste représentant cette émotion. Ajoutez d'abord des artistes et choisissez des émotions." });
                console.log("ERREUR : Aucun artiste pour l'utilisateur.");
                console.log("******************************\n");
            }
            else {
                console.log("Recherche des artistes proches")
                var artiste_proche;
                var ecartAbsolu;
                do {
                    ecartAbsolu = 2; // valeur absurde
                    for (var i = 0; i < artistesPrefs.length; i++) {
                        var artisteCourant = artistesPrefs[i];
                        if (artisteCourant.valence) {
                            var ecartRelatif = Math.abs(valence_base - artisteCourant.valence) + Math.abs(activation_base - artisteCourant.activation);
                            if (ecartRelatif < ecartAbsolu) {
                                ecartAbsolu = ecartRelatif;
                                artiste_proche = artisteCourant;
                            }
                        }
                    }
                    if (artiste_proche) {
                        console.log("Artiste proche " + tabIdArtists.length + " : " + artiste_proche.name + " avec un écart de " + ecartAbsolu);
                        // traitement sur les tableaux avant de recommencer
                        tabIdArtists.push(artiste_proche.id); // ajouter l'artiste au tableau
                        tabNameArtists.push(artiste_proche.name);
                        artistesPrefs.splice(artistesPrefs.indexOf(artiste_proche), 1); // supprimer de l'autre tableau l'artiste qu'on vient d'ajouter
                    } else {
                        var error_throwed = true;
                        res.send({ error: "Pas assez d'émotions sélectionnées. Ajoutez d'abord des émotions aux artistes." });
                        console.log("ERREUR : Pas assez d'émotions sélectionnées.");
                        console.log("******************************\n");
                    }
                } while (ecartAbsolu < 0.5 && tabIdArtists.length < 5) // On ne met pas d'artiste inutilement ni trop
                if (ecartAbsolu > 0.5 && tabIdArtists.length > 1) { // Supprimer l'artiste qui a un trop grand écart si on peut
                    console.log("écart de " + tabNameArtists[tabNameArtists.length - 1] + " trop élevé");
                    tabIdArtists.pop();
                    tabNameArtists.pop();
                }
                if (!error_throwed) {
                    req.session.artistesProches = JSON.parse(JSON.stringify(tabNameArtists));
                    var artists = encodeURIComponent(tabIdArtists);
                    tunetables = encodeURIComponent(tunetables);
                    res.redirect('/moodmusic?artists=' + artists + '&tunetables=' + tunetables);
                }
            }
        });

        /*          V 1 en cherchant seulement les moods. à utiliser comme complément de recherche ?
        
                // Récupérer tous les moods
                var mood = req.query.mood.split(",");
        
                db.collection("mood").find().toArray(function(error,moods) {
                    var moodsJSON = JSON.stringify({moods: moods});
        
                    // Récupérer les artistes préférés qui correspondent à une ou plusieurs humeurs choisies
                    db.collection("user").find({_id: user}).toArray(function(error, response) {
                        var artistesPrefs = response['0'].tabArtistesPref;
                        var moodIsSet;
                        for (var i=0; i<artistesPrefs.length; i++) {
        
                            moodIsSet = false;
                            for (var j=0; j<mood.length; j++) {
                                if (artistesPrefs[i].mood_related.indexOf(mood[j]) != -1)
                                    moodIsSet = true;
                            }
                            if (moodIsSet)  tabIdArtists.push(artistesPrefs[i].id);
                        }
                        var artists = encodeURIComponent(tabIdArtists.slice(0,5)); // NUL DE FAIRE CA
                        tunetables = encodeURIComponent(tunetables);
                        res.redirect('/moodmusic_V0?artists='+artists+'&tunetables='+tunetables);
                    });
                });
        */
    });

    // Utilisation de la classe RecommendationRequest avec directement un tableau d'id d'artistes
    app.get('/moodmusic', function (req, res) {
        var artists = req.query.artists.split(',');
        var limitTrack = 30;
        var tunetables = JSON.parse(req.query.tunetables);
        var genre = [];
        req.session.tunetables = JSON.parse(req.query.tunetables);

        console.log("Tunetables = " + JSON.stringify(tunetables));

        RecommendationGenerator.RecommendationRequest(artists, [], genre, tunetables, limitTrack, function (data) {
            // Put the musics got in the session because there's too many musics to pass them by the url...
            req.session.musics = data;
            res.redirect('/create_playlist');
        }).sendRequest(req.session.global_access_token);
    });

    // Crée une playlist
    app.get('/create_playlist', function (req, res) {
        // parameters
        var playlistOptions = {
            url: 'https://api.spotify.com/v1/users/' + req.session.global_user_id + '/playlists',
            headers: { 'Authorization': 'Bearer ' + req.session.global_access_token },
            body: JSON.stringify({ name: req.session.nom_playlist }),
            json: true
        }
        request.post(playlistOptions, function (error, response, body) {
            if (error) throw error;
            // Save the playlist
            db.collection("playlist").insert({
                _id: body.id,
                name: body.name,
                id_user: req.session.global_user_id,
                time: new Date(),//new Date().getHours()+'-'+new Date().getMinutes()+'-'+new Date().getDate()+'-'+(new Date().getMonth()+1)+'-'+(new Date().getFullYear()),
                tunetables: req.session.tunetables,
                artists: req.session.artistesProches,
                mood: req.session.emojis
            }, function (error, response) {
                if (error) throw error;
                console.log("Playlist saved!")
            });

            // Add tracks to the playlist
            var playlist = encodeURIComponent(JSON.stringify(body));
            res.redirect('/addTracksToPlaylist?playlist=' + playlist);
        });
    });

    // Ajouter des titres à une playlist
    app.get('/addTracksToPlaylist', function (req, res) {
        var musics = JSON.parse(req.session.musics); // got from the session
        var JSONplaylistObject = JSON.parse(req.query.playlist);
        // créer le string des uri
        var uriMusics = new Array();
        for (var i = 0; i < musics.tracks.length; i++) // Mettre une ',' sauf si c'est le dernier
            uriMusics.push(musics.tracks[i].uri);
        console.log("Id de la playlist : " + JSONplaylistObject.id);
        console.log("******************************\n");
        var addTracksOptions = {
            url: 'https://api.spotify.com/v1/users/' + req.session.global_user_id + '/playlists/' + JSONplaylistObject.id + '/tracks',
            body: JSON.stringify({ "uris": uriMusics }),
            headers: { 'Authorization': 'Bearer ' + req.session.global_access_token }
        };
        request.post(addTracksOptions, function (error, response, body) {
            if (error) throw error;
            // console.log(body);
            // res.redirect(JSONplaylistObject.external_urls.spotify);
            res.send({ moodmusicRecommendation: JSONplaylistObject });
        });
    });

    // Ajouter un artiste préféré à l'utilisateur
    app.get('/addArtistPref', function (req, res) {
        var artist = req.query.name;
        var user = req.query.user;
        console.log("******************************");
        console.log("Ajout d'un nouvel artiste: " + artist + " pour l'utilisateur " + user);

        IdArtistsGenerator.IdRequest([artist], function (data) {
            var json = JSON.parse(data);
            var artist = json.artists.items['0'];
            //console.log(json.artists.items['0']);
            if (!artist) res.send({ state: "L'artiste n'existe pas 🙁" });
            else {
                // Ajouter l'artiste préféré s'il n'existe pas
                db.collection("user").find({ _id: user }).toArray(function (error, response) {
                    var artistesPrefs = response[0].tabArtistesPref;
                    if (artistesPrefs) {
                        var present = false;
                        for (var i = 0; i < artistesPrefs.length; i++)
                            if (artistesPrefs[i].id == artist.id) present = true;
                    }
                    if (!present) {

                        // Add artists to moodmusics if they dont exist
                        db.collection("artist").findAndModify(
                            { _id: artist.id },     // query
                            [],               // represents a sort order if multiple matches
                            {
                                $set: {
                                    name: artist.name,
                                    popularity: artist.popularity,
                                    genres: artist.genres
                                }
                            },   // update statement
                            { new: true, upsert: true },    // options - new to return the modified document
                            function (err, doc) {
                                if (error) throw error;
                                console.log(artist.name + " ajouté à moodmusic!");
                            }
                        );
                        db.collection("user").update(
                            { _id: user }, {
                            $push: {
                                tabArtistesPref: {
                                    $each: [{
                                        name: artist.name,
                                        id: artist.id,
                                        images: artist['images'],
                                        mood_related: []
                                    }],
                                    $position: 0
                                }
                            }
                        }, function (error, response) {
                            if (error) throw error;
                            console.log("Succes ajout");
                            console.log("******************************\n");
                            res.redirect('/getCurrentUserInfos?user=' + user);
                        }
                        );
                    } else {
                        res.send({ state: "L'artiste existe déjà 😁" });
                    }
                });
            }
        }).sendRequest(req.session.global_access_token);
    });

    app.get('/removeArtistPref', function (req, res) {
        var artist = req.query.idArtist;
        var user = req.query.user;

        db.collection("user").update({
            _id: user, "tabArtistesPref.id": artist
        }, {
            $pull: {
                tabArtistesPref: {
                    id: artist
                }
            }
        }, function (error, response) {
            if (error) throw error;
            console.log("******************************");
            console.log(user + " a supprimé l'artiste " + artist);
            console.log("******************************\n");
            //res.send({state: "artiste supprimé !"});
            res.redirect('/getCurrentUserInfos?user=' + user);
        });
    });

    app.get('/getLyrics', function (req, res) {
        var artist = req.query.artist;
        var track = req.query.track;
        console.log(artist + " " + track);
        lyrics.get(artist, track, function (err, data) {
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
        console.log('Latitude : ' + latitude + ' - Longitude : ' + longitude + ' Vitesse : ' + speed);

        request('http://api.wunderground.com/api/' + key_weather + '/geolookup/conditions/q/' + latitude + ',' + longitude + '.json', function (error, response, body) {
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
            } else { console.log(error); }
        });
    });

    /********* API REST *********/

    var apiRoutes = express.Router();

    // ------- Authorization -------
    apiRoutes.post('/authorization_code', function (req, res) {
        /*
            Générer un code aléatoire à 4 chiffre
            Envoyer un mail avec le code
            Stocker le code dans une base de données avec l'email associé et l'id client
        */
        console.log("********** API REST **********");

        var email = req.body.email.toLowerCase();
        var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        if (re.test(email)) {

            // Vérifier que cet e-mail est bien associé à un compte
            db.collection("user").find({ email: email }).toArray(function (err, resp) {
                if (err) throw err;
                else {
                    switch (resp.length) {
                        case 0: // Pas d'utilisateur avec cet email, on l'envoit au client pour qu'il ressaisisse un email
                            res.respond({ message: "Pas d'utilisateur avec cet email.", error: true }, 200);
                            console.log('Message envoyé!');
                            console.log("******************************\n");
                            break;
                        case 1: // Cas normal, 1 utilisateur trouvé
                            var min = 1000;
                            var max = 9999;
                            var code = Math.floor(Math.random() * (max - min + 1)) + min;
                            db.collection("api_connect_tmp").remove({ email: email }, function () {
                                db.collection("api_connect_tmp").insert({
                                    sessionID: req.sessionID,
                                    email: email,
                                    code: code,
                                    time: new Date()
                                }, function (error, response) {
                                    if (error) throw error;

                                    // setup email data with unicode symbols
                                    var mailOptions = {
                                        from: '"Moodmusic" <hadrien@moodmusic.fr>', // sender address
                                        to: email,
                                        subject: 'Bienvenue!', // Subject line
                                        text: 'Voici votre code : ' + code,
                                        html: 'Voici votre code : <b>' + code + '</b>' // html body
                                    };

                                    // send mail with defined transport object
                                    transporter.sendMail(mailOptions, function (error, info) {
                                        if (error) {
                                            console.log("Erreur mail");
                                            console.log("******************************\n");
                                            res.respond(new Error("Mail can't be sent."), 400);
                                        } else {
                                            console.log('Message envoyé!');
                                            console.log("******************************\n");
                                            res.respond({ message: 'Mail envoyé', code: code }, 200);
                                        }
                                    });
                                });
                            });
                            break;
                        default: // ERROR : Plus d'1 utilisateur avec le meme email
                            res.respond(new Error("Plus d'1 utilisateur"), 200);
                            console.log("Plus d'1 utilisateur...");
                            console.log("******************************\n");
                            break;
                    }
                }
            });
        } else {
            res.respond(new Error("Le mail que possède le serveur est invalide"), 400);
            console.log("Erreur mail");
            console.log("******************************\n");
        }
    });

    apiRoutes.post('/authorize', function (req, res) {
        /*
            Récupérer l'id de session de l'utilisateur pour pouvoir le trouver dans la bdd
            Regarder si le code fourni et le code de la session sont pareils
            renvoyer cote client le profil de l'utilisateur
         */
        console.log("********** API REST **********");

        var code = req.body.code;
        db.collection("api_connect_tmp").find({ sessionID: req.sessionID }).toArray(function (err, resp) {
            if (err) {
                console.log("Erreur demande d'accès aux conexions");
                console.log("******************************\n");
                res.respond(new Error('Database issue : conections requested unavailables'), 500);
            } else {
                switch (resp.length) {
                    case 0:    // Pas de code pour la session, retourner l'erreur
                        console.log("ERROR : Pas d'utilisateur associé mais code présent");
                        console.log("******************************\n");
                        res.respond(new Error('Vous êtes nouveau non ?'), 500);
                        break;
                    case 1:    // Cas normal : 1 utilisateur donc vérifier son code
                        var user = resp[0];
                        if (code == user.code) {
                            db.collection("api_connect_tmp").remove({ sessionID: req.sessionID });
                            db.collection("user").find({ email: user.email }).toArray(function (err, resp) {
                                user = resp[0];
                                res.respond({ state: 'Connecté!', me: user }, 200);
                                db.collection("api_connected").findAndModify(
                                    { _id: user._id }, [], { $set: { _id: user._id } }, { upsert: true });
                                console.log("Utilisateur connecté !");
                                console.log("******************************\n");
                            });
                        } else {
                            console.log("Pas le bon code");
                            console.log("******************************\n");
                            res.respond({ wrong_code: true });
                        }
                        break;
                    default:   // plus d'1 utilisateur
                        res.respond(new Error('Plusieurs utilisateurs'), 500);
                        break;
                }
            }
        });

    });

    // ------- Playlist -------

    // Get all the playlists with a possible filter by user_id
    apiRoutes.get('/playlist/all', function (req, res) {
        console.log("********** API REST **********");
        var filter;
        req.param('id_user') ? filter = { id_user: req.param('id_user') } : filter = {};

        db.collection("playlist").find(filter).sort({ time: -1 }).toArray(function (error, response) {
            if (error) {
                console.log("Erreur demande d'accès aux playlists");
                console.log("******************************\n");
                res.respond(new Error('Database issue : playlists unavailables'), 500);
            } else {
                if (response.length == 0) {
                    res.respond({ state: 'Pas de playlist correspondant à cet identifiant.' }, 200);
                    console.log("pas de playlist pour l'utilisateur moodmusic");
                    console.log("******************************\n");

                } else {
                    var playlists = JSON.parse(JSON.stringify(response));
                    console.log("Demande d'accès aux playlists ");
                    filter.id_user ? console.log(filter.id_user) : null;
                    console.log("******************************\n");

                    res.respond(playlists, error ? 500 : 200);
                }
            }
        });
    });

    // Get the number of playlists with a possible filter by user_id
    apiRoutes.get('/playlist/count', function (req, res) {
        console.log("********** API REST **********");
        var filter;
        req.param('id_user') ? filter = { id_user: req.param('id_user') } : filter = {};
        db.collection("playlist").find(filter).sort({ time: -1 }).toArray(function (error, response) {
            if (response.length == 0) {
                res.respond({ state: 'Pas de playlist correspondant à cet identifiant.' }, 200);
                console.log("pas de playlist pour l'utilisateur moodmusic");
                console.log("******************************\n");
            } else {
                var playlists = JSON.parse(JSON.stringify(response));
                console.log("Demande d'accès au nombre de playlists");
                filter.id_user ? console.log(filter.id_user) : null;
                console.log("******************************\n");

                res.respond({ nb_playlist: playlists.length }, error ? 500 : 200);
            }
        });
    });

    // ------- User -------

    // Get all user's favorite artists
    apiRoutes.get('/user/:id/top-artists', function (req, res) {
        console.log("********** API REST **********");
        var id_user = req.param('id');
        if (!id_user) {
            res.respond(new Error('You must provide an id for the user'), 400);
            console.log("Erreur demande d'accès aux artistes préférés");
            console.log("******************************\n");
        } else {
            db.collection("user").find({ _id: id_user }, { "tabArtistesPref.images": 0 }).toArray(function (error, response) {
                var user = response[0];
                console.log("Demande d'accès au tableau d'artistes préférés de " + user.name);
                res.respond(user.tabArtistesPref, error ? 500 : 200);
                console.log("******************************\n");

            });
        }
    });

    // Get the moods affected to an artist by an user (with ids)
    apiRoutes.get('/user/:id_user/artist/:id_artist/mood', function (req, res) {

        var id_user = req.param('id_user');
        var id_artist = req.param('id_artist');
        if (!id_user || !id_artist) {
            res.respond(new Error('You must provide an id for the user AND the artist'), 400);
        } else {
            res.redirect('/api/artist/' + id_artist + '/mood?id_user=' + id_user);
        }
    });

    // Get the moods affected to an artist by an user (with artist name)
    apiRoutes.get('/user/:id_user/artist/mood', function (req, res) {

        var id_user = req.param('id_user');
        var name_artist = req.param('name');
        if (!id_user || !name_artist) {
            res.respond(new Error('You must provide an id for the user AND a name for the artist'), 400);
        } else {
            res.redirect('/api/artist/mood?name=' + name_artist + '&id_user=' + id_user);
        }
    });

    // Get a list of the count artists taken to get recommendations
    // Also a list of the most felt moods and tunetables
    apiRoutes.get('/user/:id/info-playlists', function (req, res) {
        console.log("********** API REST **********");
        var id_user = req.param('id');
        if (!id_user) {
            res.respond(new Error('You must provide an id for the user'), 400);
            console.log("Pas d'id user fourni");
            console.log("******************************\n");
        } else {
            // On récupère les playlists créées par l'utilisateur
            db.collection("playlist").find({ id_user: id_user }).toArray(function (error, playlists) {
                if (error) {
                    res.respond(new Error('Database error'), 400);
                    console.log("Erreur demande d'accès aux playlists");
                    console.log("******************************\n");
                } else {
                    // Création du JSON que l'on renverra à l'utilisateur
                    var responseJSON = {};
                    responseJSON.nb_playlists = playlists.length;
                    responseJSON.moods = {};
                    responseJSON.tunetables = {};
                    responseJSON.artists = new Array();
                    var total_moods = 0;

                    // On regarde toutes les playlists pour en tirer des infos
                    for (var i = 0; i < playlists.length; i++) {
                        var artists = playlists[i].artists;
                        var moods_playlist = playlists[i].mood ? playlists[i].mood.split(',') : [];
                        var tunetables = playlists[i].tunetables;


                        // -> Traitement des humeurs
                        for (var j = 0; j < moods_playlist.length; j++) {
                            responseJSON.moods[moods_playlist[j]] ? responseJSON.moods[moods_playlist[j]]++ : responseJSON.moods[moods_playlist[j]] = 1;
                            total_moods++;
                        }

                        // -> Traitement des tunetables
                        for (var tunetable in tunetables) {
                            if (responseJSON.tunetables[tunetable]) {
                                responseJSON.tunetables[tunetable]['value'] += parseFloat(tunetables[tunetable]);
                                responseJSON.tunetables[tunetable]['count']++;
                            } else {
                                responseJSON.tunetables[tunetable] = {};
                                responseJSON.tunetables[tunetable]['value'] = parseFloat(tunetables[tunetable]);
                                responseJSON.tunetables[tunetable]['count'] = 1;
                            }
                        }

                        // -> Traitement des artistes
                        for (var j = 0; j < artists.length; j++) {
                            var index = responseJSON.artists.findIndex(function (element, index) {
                                if (element.name == artists[j])
                                    return index;
                            });
                            if (index == -1) {
                                responseJSON.artists.push({
                                    name: artists[j],
                                    nb_playlists_present: 1
                                });
                            }
                            else {
                                responseJSON.artists[index].nb_playlists_present++;
                            }
                        }

                    }

                    // A la fin du traitement on ajoute les attibuts issus de la bdd
                    /*function remplir_infos_artiste(tab_artistes, index) {
                        db.collection("artist").find({name: tab_artistes[index].name}).toArray(function(error,response) {
                            if (response[0]){
                                tab_artistes[index]._id = response[0]._id;
                                tab_artistes[index].popularity = response[0].popularity;
                                response[0].genres ? tab_artistes[index].genres = response[0].genres : null;
                                console.log("Artiste rempli ! " + tab_artistes[index]._id );
                            }
                            if (index < tab_artistes.length-1) {
                                index++;
                                remplir_infos_artiste(tab_artistes,index);
                            } else {
                                return new Promise(function(resolve,reject) {
                                    resolve(tab_artistes);
                                });
                            }
                        });

                    }
                    remplir_infos_artiste(responseJSON.artists,0).then(function(tab_artistes){

                    });*/

                    // Présenter les informations des artistes par ordre décroissant
                    responseJSON.artists.sort(function (a, b) {
                        return b.nb_playlists_present - a.nb_playlists_present;
                    });

                    // normaliser en pourcentage les humeurs
                    for (var elem in responseJSON.moods) {
                        responseJSON.moods[elem] /= total_moods;
                        responseJSON.moods[elem] = responseJSON.moods[elem].toFixed(2);
                    }
                    responseJSON.moods.total_moods = total_moods;

                    // normaliser en pourcentage les tunetables
                    for (var elem in responseJSON.tunetables) {
                        responseJSON.tunetables[elem]['value'] = responseJSON.tunetables[elem]['value'] / responseJSON.tunetables[elem]['count'];
                        responseJSON.tunetables[elem] = responseJSON.tunetables[elem]['value'].toFixed(2);
                    }

                    res.respond(responseJSON, error ? 500 : 200);
                    console.log("Infos sur les playlists donné !");
                    console.log("******************************\n");
                }
            });
        }
    });

    // ------- Artist -------

    // Get a mood tendance for an artist (with name)
    // We have to look for the artist's id and then redirect to the next endpoint
    apiRoutes.get('/artist/mood', function (req, res) {
        console.log("********** API REST **********");
        if (!req.param('name')) {
            res.respond(new Error('You must provide at least a name for the artist'), 400);
            console.log("Erreur demande d'accès à la tendance d'émotionde l'artiste");
            console.log("******************************\n");
        }
        else {
            console.log("recherche de l'artiste " + req.param('name') + " dans moodmusic ...");
            var name = new RegExp(["^", req.param('name'), "$"].join(""), "i");
            db.collection("artist").find({ name: { $regex: name } }).toArray(function (error, response) {
                if (error) {
                    res.respond(new Error('Database issue : artists unavailables'), 500);
                    console.log("Erreur demande d'accès à la tendance d'émotionde l'artiste");
                    console.log("******************************\n");
                }
                else {
                    // console.log(response);
                    // Cas d'invalidité : Pas d'artiste trouvé
                    if (response.length > 1) {
                        res.respond({ state: 'Plusieurs artistes trouvés, précisez votre recherche ou utilisez son id.' }, 200);
                        console.log("Plusieurs artistes dans moodmusic");
                        console.log("******************************\n");

                    } else {
                        if (response.length == 0) {
                            res.respond({ state: 'Pas d\'artiste correspondant au nom fourni dans moodmusic. il n\'existe pas ou il n\'est pas référencé' }, 200);
                            console.log("l'artiste n'exite pas dans moodmusic");
                            console.log("******************************\n");
                        } else {
                            // redirect to the endpoint
                            var route = '/api/artist/' + response[0]._id + '/mood?from_name=true';
                            req.param('id_user') ? route += '&id_user=' + req.param('id_user') : null;
                            res.redirect(route);
                        }
                    }
                }
            });
        }
    });

    // Get a mood tendance for an artist (with id)
    apiRoutes.get('/artist/:id/mood', function (req, res) {
        var id_artist = req.param('id');
        var id_user = req.param('id_user');

        !req.param('from_name') ? console.log("********** API REST **********") : console.log("redirection avec l'id " + id_artist);
        if (id_user) console.log('Humeur évoquée pour un utilisateur et un artiste');

        if (!id_artist) {
            res.respond(new Error('You must provide an id for the artist'), 400);
            console.log("Erreur demande d'accès à la tendance d'émotionde l'artiste");
            console.log("******************************\n");
        } else {
            // Filtre de recherche
            var filter = {};
            if (id_user) filter._id = id_user;
            filter['tabArtistesPref.id'] = id_artist;
            // Get all users that have the artist as favorite to process the statistics
            db.collection("user").find(filter).toArray(function (error, response) {
                if (error) {
                    res.respond(new Error('Database issue : users unavailables'), 500);
                    console.log("Erreur demande d'accès à la tendance d'émotionde l'artiste");
                    console.log("******************************\n");
                }
                else {
                    // Cas d'invalidité : Pas d'artiste trouvé
                    if (response.length == 0) {
                        var state;
                        id_user ? state = 'L\'utilisateur n\'a pas ajouté l\'artiste à ses favoris' : state = 'L\'artiste n\'est pas référencé, il n\'y a aucune information sur sa tendance';
                        res.respond({ state: state }, 200);
                        console.log("l'artiste n'exite pas dans moodmusic ou l'utilisateur ne l'a pas ajouté à ses favoris");
                        console.log("******************************\n");
                    } else {
                        var users = JSON.parse(JSON.stringify(response));
                        //console.log(users);
                        // Get all the moods
                        db.collection("mood").find().sort({ ordre: 1 }).toArray(function (error, response) {
                            if (error) {
                                res.respond(new Error('Database issue : moods unavailables'), 500);
                                console.log("Erreur demande d'accès à la tendance d'émotionde l'artiste");
                                console.log("******************************\n");
                            }
                            else {
                                var moods = JSON.parse(JSON.stringify(response));
                                var tabMoods = new Array();
                                var mood_related;
                                //console.log("humeurs récupérées");

                                // create a counter array that contains all moods possible
                                for (var i = 0; i < moods.length; i++) {
                                    //console.log(moods[i].state);
                                    tabMoods[moods[i].state] = 0;
                                }
                                //console.log("Tableau des moods créé : "+tabMoods);
                                var total_moods = 0;
                                // get the global tendance
                                for (var i = 0; i < users.length; i++) {
                                    var tabArtistesPref = users[i].tabArtistesPref;
                                    // Get the targeted artist in the array
                                    for (var j = 0; j < tabArtistesPref.length; j++)
                                        if (tabArtistesPref[j].id == id_artist) {
                                            mood_related = tabArtistesPref[j].mood_related;
                                            var artist_name = tabArtistesPref[j].name;
                                        }

                                    total_moods += mood_related.length;
                                    for (var j = 0; j < mood_related.length; j++) {
                                        tabMoods[mood_related[j]]++;
                                    }
                                }

                                // Write a JSON response for the client - contains real statistics
                                var tendance = {};
                                if (id_user) {
                                    tendance['user'] = {};
                                    tendance['user']['id'] = id_user;
                                    tendance['user']['name'] = users[0].name;
                                }
                                tendance['artist'] = {};
                                tendance['artist']['id'] = id_artist;
                                tendance['artist']['name'] = artist_name;
                                tendance['moods'] = {};
                                tendance['tunetables'] = {};
                                tendance['tunetables']['valence'] = 0;
                                tendance['tunetables']['energy'] = 0;

                                // Compteur
                                var c = 0;
                                for (var mood_state in tabMoods) {
                                    tendance['moods'][mood_state] = (tabMoods[mood_state] / total_moods).toFixed(2);
                                    // On multiplie le nombre d'emojis avec la valence et activation relative et on ajoute tout pour faire une moyenne
                                    if (tabMoods[mood_state] != 0 && mood_state != 'dance') {
                                        tendance['tunetables']['valence'] += (tabMoods[mood_state] * moods[c].valence);
                                        tendance['tunetables']['energy'] += (tabMoods[mood_state] * moods[c].activation);
                                    }
                                    c++;
                                }
                                tendance['moods']['total_moods'] = total_moods;
                                tendance['tunetables']['valence'] = (tendance['tunetables']['valence'] / (total_moods - tabMoods['dance'])).toFixed(2);
                                tendance['tunetables']['energy'] = (tendance['tunetables']['energy'] / (total_moods - tabMoods['dance'])).toFixed(2);

                                if (!id_user)
                                    tendance['moods']['total_users'] = users.length;

                                console.log("Demande d'accès aux tendances de " + artist_name);
                                res.respond(tendance, error ? 500 : 200);
                                console.log("******************************\n");
                            }
                        });
                    }
                }
            });
        }
    });

    // ------- Bad Request -------
    apiRoutes.all('/?*', function (req, res) {
        res.respond(405);
    });

    app.use('/api', apiRoutes);

    if (!process.env.NODE_ENV || process.env.NODE_ENV == 'development') {
        require('http')
            .createServer(app)
            .listen(port, _ => console.log('Listening http on port ' + port))
    } else {
        const cert = process.env.SSL_CERT
        const key = process.env.SSL_KEY
        const options = {
            cert: fs.readFileSync(cert),
            key: fs.readFileSync(key)
        }
        require('https')
            .createServer(options, app)
            .listen(port, _ => console.log('Listening https on port ' + port))
    }
})
    .catch(err => {
        console.log(err)
    })