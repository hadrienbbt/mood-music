/**
 * Created by hadrien1 on 06/11/16.
 */

/****************************
 * EXEMPLES D'APPEL A L'API *
 ****************************/

// Exemple de récupération des infos d'une musique
var url = 'https://api.spotify.com/v1/tracks/0MKqeOVdZcUFGJvWpGCKbG';
callSpotify(url).then(function(data){
    console.log(data);
},erreur);

// Exemple d'appel des infos du user
url = 'https://api.spotify.com/v1/me';
callSpotify(url).then(function(data){
    console.log(data);
},erreur);

// Exemple de récupération des métadonnées de 3 musiques
url = 'https://api.spotify.com/v1/audio-features?ids=4JpKVNYnVcJ8tuMKjAj50A,2NRANZE9UCmPAS5XVbXL40,24JygzOLM0EmRQeGtFcIcG'
callSpotify(url).then(function(data){
    console.log(data);
},erreur);