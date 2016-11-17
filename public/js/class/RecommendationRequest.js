/**
 * Created by hadrien1 on 17/11/16.
 */

// Variable globale des caractéristiques disponibles
var tunetableAvailable = ["acousticness", "danceability", "duration_ms", "energy", "instrumentalness", "key", "liveness", "loudness", "mode", "popularity", "speechiness", "tempo", "time_signature", "valence"];

/** Constructeur normal
 * tabId... : tableau d'id pour la requête à l'API
 * -> Noter qu'il ne doit pas y avoir plus de 5 ID au cumul avec artiste, titre et genre.
 * tabTargetedTrackAttributes : tableau associatif dont la clé est un élément de tunetableAvailable et la clé est une valeur que l'on doit avoir initialisée au préalable.
 * callback : paramètre optionnel, on peut passer au constructeur une nouvelle fonction à effectuer lorsque la recherche de recommendation est terminée
 *
**/
function RecommendationRequest(tabIdArtists, tabIdTracks, tabIdgenre, tabTargetedTrackAttributes, callback) {

    // Cas d'invalidité
    if (!Array.isArray(tabIdArtists) || !Array.isArray(tabIdTracks) || !Array.isArray(tabIdgenre)) throw "un paramètre n'est pas un tableau !";
    if ((tabIdArtists.length + tabIdTracks.length + tabIdgenre.length) > 5) throw "Trop d'éléments en seed";
    if ((tabIdArtists.length + tabIdTracks.length + tabIdgenre.length) < 1) throw "mettez au moins un seed de référence";

    for(var key in tabTargetedTrackAttributes) {
        if (!isTunetable(key))  throw key+" n'est pas une tunetable !";
    }

    this.artists = tabIdArtists;
    this.tracks = tabIdTracks;
    this.genres = tabIdgenre;
    // tableau associatif avec attribut => valeur à rechercher
    this.targetedTrackAttributes = tabTargetedTrackAttributes;
    if (typeof(callback) == "function")
        this.callback = callback;
    else
        this.callback = successSearch;
}

// Envoi de la requete
RecommendationRequest.prototype.sendRequest = function() {
    var url = 'https://api.spotify.com/v1/recommendations';
    var params = {
        seed_tracks : tabToCSV(this.tracks),
        seed_genres : tabToCSV(this.genres),
        seed_artists :tabToCSV(this.artists),
        limit: limitTrack
    };
    // On regarde les clés du tableau et on les met dens params
    for(var key in this.targetedTrackAttributes) {
        console.log(this.targetedTrackAttributes[key]);
        params["target_"+key]=this.targetedTrackAttributes[key];
    }
    callSpotify(url, params).then(this.callback, erreur);
}

RecommendationRequest.prototype.toString = function() {
    var string = "L'objet possède "+(this.artists.length + this.tracks.length + this.genres.length)+' seed\nLes tunetables sont : ';
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