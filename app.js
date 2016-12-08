// app.js
// Hadrien Barbat

var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
var lyrics = require("lyric-get");
var RecommendationGenerator = require('./public/js/class/RecommendationRequest');
var IdArtistsGenerator = require('./public/js/class/IdRequest');
var user = require('./public/js/class/User.js');

var client_id = 'a3b5315e6cdd4583acfc54f639aeb020'; // Your client id
var client_secret = '2e9b13f3f48f4cc5b8d637c699cc2bc7'; // Your secret
var redirect_uri = 'http://localhost:8888/callback'; // Your redirect uri
var global_access_token;
var key_weather= 'e6953ed25cc6095a';
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

app.use(express.static(__dirname + '/public'))
   .use(cookieParser());

app.get('/login', function(req, res) {

  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  var scope = 'user-read-private user-read-email user-top-read';
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

        var options = {
          url: 'https://api.spotify.com/v1/me',
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
        };

        // use the access token to access the Spotify Web API
        request.get(options, function(error, response, body) {
          console.log(body);
        });

        // we can also pass the token to the browser to make requests from there
        res.redirect('/#' +
          querystring.stringify({
            access_token: access_token,
            refresh_token: refresh_token
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

app.get('/confidentialite', function(req, res) {
    res.send('../public/PC.html');
});

console.log('Listening on 8888');
app.listen(8888);
