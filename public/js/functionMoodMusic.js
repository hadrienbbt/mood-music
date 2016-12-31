/**
 * Created by hadrien1 on 17/11/16.
 */

// Fonction qui retourne la moyenne des éléments du tableau
function moyenne(tab) {
    var somme = 0;
    for (var i = 0, j = tab.length; i < j; i++) {
        somme += parseFloat(tab[i]);
    }
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

function initMoodEval() {

    $("#dance").click();
    $("#tired").click();
    $("#serene").click();
}

function processTunetables() {
    var tunetables = {energy: [], valence: []};
    var nbSliders = 0;

    // on regarde tous les sliders visibles
    $(".input-slider-mood").each(function() {
        var state = $(this).attr('id').substr(0,$(this).attr('id').indexOf('-'));
        if ($("#"+state).hasClass('on')) {
            var x = 1 - $(this).slider('getValue');
            switch (state) {
                case 'dance' :
                    tunetables['danceability'] = x;
                    break;
                case 'sad' :
                    tunetables['energy'][nbSliders] = (0.25 + x * 0.5);
                    tunetables['valence'][nbSliders] = (0.25 * (1-x));
                    nbSliders++;
                    break;
                case 'excited' :
                    tunetables['energy'][nbSliders] = (0.625 + x * 0.375);
                    tunetables['valence'][nbSliders] = (0.625 + x * 0.375);
                    nbSliders++;
                    break;
                case 'tired' :
                    tunetables['energy'][nbSliders] = (0.625 * (1-x));
                    tunetables['valence'][nbSliders] = (0.75 - x * 0.625);
                    nbSliders++;
                    break;
                case 'serene' :
                    tunetables['energy'][nbSliders] = (0.125 + x * 0.375);
                    tunetables['valence'][nbSliders] = (0.625 + x * 0.375);
                    nbSliders++;
                    break;
                case 'upset' :
                    tunetables['energy'][nbSliders] = (0.75 + x * 0.25);
                    tunetables['valence'][nbSliders] = (0.5 * (1-x));
                    nbSliders++;
                    break;
            }
        }
    });

    tunetables['energy'] = parseFloat(moyenne(tunetables['energy']));
    tunetables['valence'] = parseFloat(moyenne(tunetables['valence']));
    console.log(tunetables);

    return tunetables
}

function afficherArtistesPrefs(current_user) {

    var topArtistsSource = document.getElementById('topArtists-template').innerHTML,
        topArtistsTemplate = Handlebars.compile(topArtistsSource),
        topArtistsPlaceholder = document.getElementById('topArtists');

    var selectMoodSource = document.getElementById('select-mood-template').innerHTML,
        selectMoodTemplate = Handlebars.compile(selectMoodSource),
        selectMoodPlaceholder = document.getElementById('selectMood');

    $.ajax({
        url: '/getCurrentUserInfos',
        data: {
            user: current_user
        },
        success: function(response) {
            //console.log(response);
            var artists = response['0']['tabArtistesPref'];
            $.ajax({url: '/getMoods'}).done(function(response) {
                var moods = JSON.parse(response);
                //console.log(moods['moods']);
                //console.log(artists);
                topArtistsPlaceholder.innerHTML = topArtistsTemplate({artists: artists, moods: moods['moods']});
                selectMoodPlaceholder.innerHTML = selectMoodTemplate({moods: moods['moods']});

                // Placer la classe 'ON' sur les moods ayant été selectionnés auparavant :
                for (var i = 0; i< artists.length; i++) {
                    for (var j = 0; j < artists[i]['mood_related'].length; j++) {
                        var stringIdMood = "#"+artists[i].id + "-" + artists[i]['mood_related'][j]
                        $(stringIdMood).addClass("on");
                    }
                }

                // Ajouter un artiste préféré
                $("#button-addArtistPref").click(function(){
                    $.ajax({
                        url: '/addArtistPref',
                        data: {
                            name: $("#artistName").val(),
                            user: current_user
                        }
                    }).done(function(data) {
                        console.log(data);
                        afficherArtistesPrefs(current_user);
                    });
                });

                // Supprimer un artiste préféré
                $(".button-removeArtistPref").click(function(){
                    var idArtist = $(this).attr('id').split('-');
                    $.ajax({
                        url: '/removeArtistPref',
                        data: {
                            idArtist: idArtist[1],
                            user: current_user
                        }
                    }).done(function(data) {
                        console.log(data);
                        afficherArtistesPrefs(current_user)
                    });
                });

                // Placer la classe 'ON' quand l'utilisateur clique sur l'emoji
                $(".emoji-select").click(function() {
                    var ajouterMood;
                    $( this ).toggleClass( "on" );
                    if ($(this).hasClass("on"))   ajouterMood = true;
                    else                          ajouterMood = false;

                    // Dire à la bdd que cet artiste représente cet emoji pour l'utilisateur
                    var link = $(this).attr('id').split('-');
                    $.ajax({
                        url: '/addMoodToArtist',
                        data: {
                            user: current_user,
                            artist: link[0],
                            mood: link[1],
                            ajouterMood: ajouterMood
                        }
                    }).done(function(data) {
                        console.log(data.state);
                    });
                });

                // Créer tous les sliders
                var sliders = new Array();
                for (var i = 0; i<moods['moods'].length; i++) {
                    var state = moods['moods'][i].state;
                    // With JQuery
                    sliders.push( $("#"+state+"-slider").slider({
                        orientation: 'vertical',
                        min: 0,
                        max: 1,
                        value: 0.5,
                        step: 0.01
                    }) );

                    // Récupérer la valeur du slider quand on le lâche
                    $(".input-slider-mood").on("slideStop",function(){
                        // Call a method on the slider
                        console.log($(this).slider('getValue'));
                        if($(this).slider('getValue') == "1") {
                            var id_mood = $(this).attr('id').split('-')[0];
                            $(this).slider('setValue',0.5);
                            $("#"+id_mood).click();

                        }
                    });
                }

                $(".emoji-mood-select").click(function() {
                    $(this).toggleClass("on");
                    var state = $(this).attr('id');
                    $("#div-"+state+"-slider").toggleClass("visible");
                });

                initMoodEval();

                // recherche de recommendations avec emoji
                $("#moodmusic-emoji").click(function() {
                    // Créer un mini csv des emojis selectionnées
                    var stringEmoji = "";
                    $('.emoji-mood-select').each(function(){
                        if ($(this).hasClass('on')) stringEmoji += $(this).attr('id')+',';
                    });
                    stringEmoji = stringEmoji.substr(0,stringEmoji.length-1);
                    console.log('moods = '+stringEmoji);
                    var tunetables = processTunetables();

                    $.ajax({
                        url: '/getArtistsFromMood',
                        data: {
                            user: current_user,
                            mood: stringEmoji,
                            tunetables: tunetables
                        }
                    }).done(function(data) {
                        console.log(data.moodmusicRecommendation)
                        //window.location.href = data.moodmusicRecommendation.external_urls.spotify;
                        successSearch(JSON.parse(data.moodmusicRecommendation));
                    });
                });
            });
        }
    });
}