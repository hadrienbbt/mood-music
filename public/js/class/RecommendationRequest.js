/**
 * Created by hadrien1 on 17/11/16.
 */

var request = require('request');
var querystring = require('querystring');

// Variable globale des caractéristiques disponibles
var tunetableAvailable = ["acousticness", "danceability", "duration_ms", "energy", "instrumentalness", "key", "liveness", "loudness", "mode", "popularity", "speechiness", "tempo", "time_signature", "valence"];

/** Constructeur normal
 * tabId... : tableau d'id pour la requête à l'API
 * -> Noter qu'il ne doit pas y avoir plus de 5 ID au cumul avec artiste, titre et genre.
 * tabTargetedTrackAttributes : tableau associatif dont la clé est un élément de tunetableAvailable et la clé est une valeur que l'on doit avoir initialisée au préalable.
 * limitTrack : the number of tracks you need
 * callback : paramètre optionnel, on peut passer au constructeur une nouvelle fonction à effectuer lorsque la recherche de recommendation est terminée
 *
 **/
function RecommendationRequest(tabIdArtists, tabIdTracks, tabGenre, tabTargetedTrackAttributes, limitTrack, callback) {

    // Cas d'invalidité
    if (!Array.isArray(tabIdArtists) || !Array.isArray(tabIdTracks) || !Array.isArray(tabGenre)) throw "un paramètre n'est pas un tableau !";
    if ((tabIdArtists.length + tabIdTracks.length + tabGenre.length) > 5) throw "Trop d'éléments en seed";
    if ((tabIdArtists.length + tabIdTracks.length + tabGenre.length) < 1) throw "mettez au moins un seed de référence";

    for(var key in tabTargetedTrackAttributes) {
        if (!isTunetable(key))  throw key+" n'est pas une tunetable !";
    }

    // Affecter les paramètres valides
    this.artists = tabIdArtists;
    this.tracks = tabIdTracks;
    this.genres = tabGenre;
    this.limitTrack = limitTrack;
    // tableau associatif avec attribut => valeur à rechercher
    this.targetedTrackAttributes = tabTargetedTrackAttributes;
    this.callback = callback;

    return this;
}

// Envoi de la requete
RecommendationRequest.prototype.sendRequest = function(access_token) {
    var url = 'https://api.spotify.com/v1/recommendations';
    var params = {
        seed_tracks : tabToCSV(this.tracks),
        seed_genres : tabToCSV(this.genres),
        seed_artists :tabToCSV(this.artists),
        limit: this.limitTrack
    };
    // On regarde les clés du tableau et on les met dans params
    console.log("avec les paramètres suivants :");
    for(var key in this.targetedTrackAttributes) {
        console.log(this.targetedTrackAttributes[key]);
        params["target_"+key]=this.targetedTrackAttributes[key];
    }

    callSpotify(url, params, access_token).then(this.callback, function(){
        console.log('unable to retrieve data');
    });
}

RecommendationRequest.prototype.toString = function() {
    var string = "La recommendation possède "+(this.artists.length + this.tracks.length + this.genres.length)+' seed\nLes tunetables sont : ';
    for(var key in this.targetedTrackAttributes) {
        string += key+" : "+this.targetedTrackAttributes[key]+"\n";
    }
    return string;
}

// Formate un des tableau seed pour correspondre à la requete Spotify
function tabToCSV(tab) {
    var string = "";
    for (var i = 0; i < tab.length; i++) string += tab[i]+",";
    return string.substr(0,(string.length-1));
}

// Renvoie vrai si la chaine de caractère paramètre est présente dans l'énumération des tunetable disponibles
function isTunetable (string) {
    for( var i=0; i<tunetableAvailable.length; i++){
        if(tunetableAvailable[i] == string) return true;
    }
    return false;
}

// On appelle Spotify depuis le serveur : on utilise node.js
function callSpotify(url, data, access_token) {
    // On construit la requête selon les infos nécessaire sans y accéder
    var urlWithParams = (url+'?'+querystring.stringify(data));
    var options = {
        url: urlWithParams,
        dataType: 'json',
        data: data,
        headers: {
            'User-Agent': 'Chre',
            'Authorization': 'Bearer ' + access_token
        }
    };

    return new Promise( /* exécuteur */ function(resolve, reject) {
        console.log('En attente de la réponse...');
        request(options, function(error, response, body){
            console.log('callback déclenchée' + '\nREPONSE :');
            // On écrit la réponse dans la console
            console.log(body)
            if (!error && response.statusCode == 200) {
                // On renvoit la réponse à l'objet
                resolve(body);
            }
        });
    } );
}

// fonction qui formate un artiste avec son id Spotify avant de lancer la recherche adaptée
function getIdArtiste(nom, access_token) {
    // endoint
    var url = 'https://api.spotify.com/v1/search';
    // requestedArtist
    var params = {
        q: nom,
        type: 'artist',
        limit: 1
    };
    callSpotify(url, params, access_token).then(function(){
        this.sendRequest(access_token);
    }, function(){
        console.log('unable to retrieve data');
    });
}

// Variables
exports.tunetableAvailable = tunetableAvailable;

// Méthodes
exports.RecommendationRequest = RecommendationRequest;
exports.sendRequest = RecommendationRequest.prototype.sendRequest;
exports.tabToCSV = tabToCSV;
exports.toString = RecommendationRequest.prototype.toString;