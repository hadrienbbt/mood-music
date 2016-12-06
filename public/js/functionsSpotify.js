/**
 * Created by hadrien1 on 08/11/16.
 */

// Variables globales
var limitTrack = 50;

function chargerGenres(access_token) {
    var tabGenreAvailable = [];
    $.ajax({
        url: 'https://api.spotify.com/v1/recommendations/available-genre-seeds',
        headers: {
            'Authorization': 'Bearer ' + access_token
        },
        success: function(response) {
            console.log(response);
            for (var i = 0; i<response['genres']['length']; i++) {
                var unGenre = response['genres'][i];
                tabGenreAvailable.push(unGenre)
                $("#listGenres").append("<option>"+unGenre+"</option>");
            }
            return tabGenreAvailable;
        }
    });
}

// Rechercher des musiques dont le nom, l'artiste ou l'album match avec la valeur de l'input #search
function rechercheTextuelleSpotify(){
    var artist = getArtiste();
    var url = 'https://api.spotify.com/v1/search';
    var params = {
        q: artist,
        type:'track',
        limit: limitTrack
    };
    callSpotify(url, params).then(successSearch, erreur);
}

// Rechercher des musiques selon la valence courante
// Utiliser getIdArtiste("valence") pour l'appel de l'évènement recherche
function rechercheValence(data){
    var id = data['artists']['items'][0]['id'];
    var url = 'https://api.spotify.com/v1/recommendations';
    var params = {
        seed_artists : id,
        target_valence: getValence(),
        limit: limitTrack
    };
    callSpotify(url, params).then(successSearch, erreur);
}

// Fonction qui renvoit des recommendations en se rapprochant un maximum de la valence et de l'activation courante
// Utiliser getIdArtiste("valence+activation") pour l'appel de l'évènement recherche
function rechercheValenceActivation(data) {
    var id = data['artists']['items'][0]['id'];
    var url = 'https://api.spotify.com/v1/recommendations';
    var params = {
        seed_artists : id,
        target_valence: getValence(),
        target_energy: getActivation(),
        limit: limitTrack
    };
    callSpotify(url, params).then(successSearch, erreur);
}

// Afficher résultat de la recherche de titre
function successSearch(data){
    // Décommetner pour vérifier l'information reçue
    console.log(data);

    // Réinitialiser les champs pour les nouveaux résultats
    document.getElementById('result').innerHTML = '';
    document.getElementById('player').innerHTML = '';
    var musique;

    // Créer le lecteur pour y mettre les musiques trouvées
    var player = '<iframe src="https://embed.spotify.com/?uri=spotify:trackset:Ecouter:';
    for (var i = 0; i<data['tracks'].length; i++){

        // Pour savoir ce qu'on veut afficher
        if (typeof data['tracks']['items'] != "undefined") {
            musique = data['tracks']['items'][i];
        } else {
            musique = data['tracks'][i];
        }

        // Afficher une div par musique contenant des informations
        $('#result').append(
            "<span class='titre' id='"+musique['id']+"'>"+
            musique['name']+" - "+musique['artists'][0]['name']+" : </span>" +
            "<a href='"+musique['external_urls']['spotify']+"'>écouter</a>" +
            "</br>");
        player += musique['id']+',';
    }
    player = player.substr(0,player.length-1);
    player += '" width="300" height="380" frameborder="0" allowtransparency="true"></iframe>';

    // Ajouter le player complet à la suite
    $('#player').append(player);

    // Ajout d'un écouteur de clic sur les résultats de la recherche
    // Lorsqu'on clique sur un titre on affiche ses metadonnées
    $('.titre').click(function(){
        var id = $(this).attr('id');
        url = 'https://api.spotify.com/v1/audio-features?ids='+id
        callSpotify(url).then(alertMetadonnees,erreur);
    });
}

// fonction qui renvoit un artiste
// V 1.0 : renvoit ce qu'il y a dans l'input
function getArtiste() {
    return $('#search').val();
}

// fonction qui renvoit une valence
// V 1.0 : renvoit ce qu'il y a dans l'input
function getValence() {
    var valence = parseFloat($('#valence').val());
    if (!isNaN(valence))
        return (valence);
    else return (null);
}

// fonction qui renvoit une activation
// V 1.0 : renvoit ce qu'il y a dans l'input
function getActivation() {
    var activation = parseFloat($('#activation').val());
    if (!isNaN(activation))
        return (activation);
    else return (null);
}

// Appeler l'API Spotify pour n'importe quel service avec le token d'accès
function callSpotify(url, data, access_token) {
    var params = getHashParams();
    var access_token = params.access_token
    console.log(data);
    return $.ajax(url, {
        dataType: 'json',
        data: data,
        headers: {
            'Authorization': 'Bearer ' + access_token
        }
    });
}

// Récupérer le token
function getHashParams() {
    var hashParams = {};
    var e, r = /([^&;=]+)=?([^&;]*)/g,
        q = window.location.hash.substring(1);
    while ( e = r.exec(q)) {
        hashParams[e[1]] = decodeURIComponent(e[2]);
    }
    return hashParams;
}

function erreur(data){
    console.log(data);
}

// Afficher dans une liste les métadonnées de toutes les musiques passées à l'API Spotify
function afficherMetadonnees(data) {
    console.log(data);
    var items = [];
    for (var i = 0; i< data['audio_features'].length; i++){
        $.each(data['audio_features'][i], function (key, val) {
            items.push("<li id='" + key + "'>" + key + " : " + val + "</li>");
        });

        $("<ul/>", {
            "class": "my-new-list",
            html: items.join("")
        }).appendTo("body");
    }
}

// Afficher les métadonnées de toutes les musiques passée à l'API Spotify dans une alerte au clic sur l'artiste
function alertMetadonnees(data) {
    // Décommenter pour vérifier l'arbre JSON des audio feature
    //console.log(data);
    var items = [];
    for (var i = 0; i< data['audio_features'].length; i++){
        $.each(data['audio_features'][i], function (key, val) {
            items.push("\n"+key + " : " + val);
        });
    }
    alert(items.toString());
}

// fonction qui formate un artiste avec son id Spotify avant de lancer la recherche adaptée
function getIdArtiste(typeRecherche) {
    // Exemple de récupération de recherche
    var url = 'https://api.spotify.com/v1/search';
    var params = {
        q: $('#search').val(),
        type: 'artist',
        limit: 1
    };
    if (typeRecherche == "valence+activation") {
        callSpotify(url, params).then(rechercheValenceActivation, function () {
            return null;
        });
    }
    if (typeRecherche == "valence") {
        callSpotify(url, params).then(rechercheValence, function () {
            return null;
        });
    }
    if (typeRecherche == "texte") {
        callSpotify(url, params).then(rechercheTextuelleSpotify, function () {
            return null;
        });
    }
}