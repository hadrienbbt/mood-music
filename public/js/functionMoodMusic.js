/**
 * Created by hadrien1 on 17/11/16.
 */

// Fonction qui retourne la moyenne des éléments du tableau
function moyenne(tab) {
    var somme = 0;
    for (var i = 0, j = tab.length; i < j; i++) {
        somme += parseFloat(tab[i]);
    }
    console.log (tab);
    return((somme / tab.length).toFixed(4));
}

function afficherMeteo () {
    if(navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position){
            $.ajax({
                url: '/user',
                data: {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    speed: position.coords.speed
                }
            }).done(function(data) {
                console.log('The weather is '+ data['weather']);
            });
        }, function(error){   // On log l'erreur sans l'afficher, permet simplement de débugger.
            console.log('Geolocation error : code '+ error.code +' - '+ error.message);

            // Affichage d'un message d'erreur plus "user friendly" pour l'utilisateur.
            alert('Une erreur est survenue durant la géolocalisation. Veuillez réessayer plus tard ou contacter le support.');}, {enableHighAccuracy:false, maximumAge:60000, timeout:27000});
    }
    else {
        alert('Votre navigateur ne prend malheureusement pas en charge la géolocalisation.');
    }
    return false;
}