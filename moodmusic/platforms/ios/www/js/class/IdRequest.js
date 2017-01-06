/**
 * Created by hadrien1 on 27/11/16.
 */

var request = require('request');
var querystring = require('querystring');

function IdRequest(tabNomsArtistes, callback) {

    // Cas d'invalidité
    if (!Array.isArray(tabNomsArtistes)) throw "un paramètre n'est pas un tableau !";
    if (tabNomsArtistes.length > 5) throw "Trop d'éléments en seed";
    if (tabNomsArtistes.length < 1) throw "mettez au moins un seed de référence";

    // Affecter les paramètres valides
    this.DictionnaireArtistes = new Object();
    for (var i = 0; i<tabNomsArtistes.length; i++) {
        this.DictionnaireArtistes[tabNomsArtistes[i]] = '';
    }

    this.callback = callback;
    return this;
}

IdRequest.prototype.sendRequest = function(access_token) {

    var url = 'https://api.spotify.com/v1/search';
    var params;

    for(var artist in this.DictionnaireArtistes) {
        params = {
            q: artist,
            type: 'artist',
            limit: 1
        };
        callSpotify(url, params, access_token).then(this.callback, function () {
            console.log('unable to retrieve data');
        });
    }

}

IdRequest.prototype.setIdArtist = function (idArtiste, access_token) {
    console.log("fonction setIdArtiste. id : "+idArtiste);
    return new Promise(function(resolve, reject){
        this.setFirstEmpty(idArtiste);
        resolve(this.firstEmpty());
    });
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
            'Authorization': 'Bearer ' + access_token
        }
    };

    return new Promise( /* exécuteur */ function(resolve, reject) {
        console.log('En attente de la réponse...');
        request(options, function(error, response, body){
            // On écrit dans la console
            if (!error && response.statusCode == 200) {
                console.log('Réponse reçue !');
                // On renvoit la réponse à l'objet
                resolve(body);
            }
        });
    });
}

IdRequest.prototype.isReady = function() {
    for(var artist in this.DictionnaireArtistes)
    {
        var id = this.DictionnaireArtistes[artist];
        if (id == '')   return false
    }
    return true;
}

IdRequest.prototype.firstEmpty = function() {
    for(var artist in this.DictionnaireArtistes)
    {
        var id = this.DictionnaireArtistes[artist];
        if (id == '')   return artist;
    }
    return '';
}

IdRequest.prototype.setFirstEmpty = function(id) {
    for(var artist in this.DictionnaireArtistes)
    {
        var id = this.DictionnaireArtistes[artist];
        if (id == ''){
            this.DictionnaireArtistes[artist] = id;
            console.log("fonction setFirstEmpty. "+artist+" : "+idArtiste);
            return
        }
    }
    return;
}

IdRequest.prototype.toString = function() {
    var string = '';
    for(var artists in this.DictionnaireArtistes)
    {
        var id = this.DictionnaireArtistes[artists];
        string += (artists + " = " + id + '\n');
    }
    return string;
}


exports.IdRequest = IdRequest;
exports.sendRequest = IdRequest.prototype.sendRequest;
exports.toString = IdRequest.prototype.toString;

// On a l'id de l'artiste
// Il faut le rajouter au Dictionnaire
// Ensuite on regarde si le dictionnaire est rempli
//  - Si oui :  on renvoit la callback avec le dictionnaire
//  - Si non :  on passe à l'encodage de l'artiste suivant
//              -> créer une fonction qui retourne un nom d'artiste et qu'on passera à sendRequest
