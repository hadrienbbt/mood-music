/**
 * Created by hadrien1 on 08/11/16.
 */

    // Here we run a very simple test of the Graph API after login is
    // successful.  See statusChangeCallback() for when this call is made.
function testAPI() {
    // console.log('Welcome!  Fetching your information.... ');
    FB.api('/me', function(response) {
        // Décommenter pour constater la connexion
        console.log(response.id + " " + response.name);
        /*$.ajax({
            url: '/checkSpotifySession',
            data: {
                'id': response.id,
                'name': response.name
            }
        }).done(function(data) {
            console.log("refresh_token : "+data.refresh_token);
        });*/
        //console.log(response);
    });
    FB.api(
        '/me/music',
        'GET',
        {},
        function(response) {
            // Du code ici
        }
    );
}

// Remplir la liste des artistes likés sur facebook
// V1. Implémentation de la première page du JSON seulement
function getArtistesAimes(){
    FB.api(
        '/me/music',
        'GET',
        {},
        function(response) {
            for (var i = 0; i<25; i++)
                addArtistToList(response['data'][i]['name']);
            //rechercheTextuelleSpotify();
        }
    );
}

// Ajoute un artiste au menu déroulant #search
function addArtistToList(unArtiste) {
    $("#search").append("<option>"+unArtiste+"</option>");
}