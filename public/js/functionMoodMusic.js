/**
 * Created by hadrien1 on 17/11/16.
 */
var minArtistes = 2; // Constante pour un nombre minimum d'artistes à ajouter
var calibrageManuel = false;

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

    $("#mood-select").find('.emoji-mood-select').each(function() {
        $(this).click();
    });
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
    if (isNaN(tunetables['energy'])) tunetables['energy'] = 0.5;
    if (isNaN(tunetables['valence'])) tunetables['valence'] = 0.5;
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
                if (artists) {
                    for (var i = 0; i< artists.length; i++) {
                        for (var j = 0; j < artists[i]['mood_related'].length; j++) {
                            var stringIdMood = "#"+artists[i].id + "-" + artists[i]['mood_related'][j]
                            $(stringIdMood).addClass("on");
                        }
                    }
                }

                // Ajouter un artiste préféré
                $("#button-addArtistPref").click(function(){
                    var artist_name = $("#artistName").val();
                    if (artist_name) {
                        $(this).toggleClass('processRotate');
                        $.ajax({
                            url: '/addArtistPref',
                            data: {
                                name: artist_name,
                                user: current_user
                            }
                        }).done(function(data) {
                            if(data.state)  alert("L'artiste n'existe pas");
                            console.log(data);
                            afficherArtistesPrefs(current_user);
                            // Arreter la rotation du bouton +
                            $("#button-addArtistPref").toggleClass('processRotate');
                        });
                    }
                });

                // Supprimer un artiste préféré
                $(".button-removeArtistPref").click(function(){
                    // commencer a tourner le btn x
                    $(this).toggleClass('processRotate');

                    var idArtist = $(this).attr('id').split('-');
                    $("#"+idArtist).fadeOut();
                    $.ajax({
                        url: '/removeArtistPref',
                        data: {
                            idArtist: idArtist[1],
                            user: current_user
                        }
                    }).done(function(data) {
                        // Arreter la rotation du bouton x
                        $(this).toggleClass('processRotate');
                        console.log(data);
                        afficherArtistesPrefs(current_user)
                    });
                });

                eventListenerEmojiSelect(current_user);

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
                            $("#"+id_mood).click();
                            var slider = $(this);
                            var restaurerslider = setTimeout(function(){
                                slider.slider('setValue',0.5);
                            },300);
                            restaurerslider();
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
                $("#bouton-creer-playlist").click(function(){

                    var nom_playlist = $("#nom-playlist").val().slice(0,25);
                    console.log(nom_playlist);

                    // Créer un mini csv des emojis selectionnées
                    var stringEmoji = "";
                    $('.emoji-mood-select').each(function(){
                        if ($(this).hasClass('on')) stringEmoji += $(this).attr('id')+',';
                    });

                    if (stringEmoji != "") {
                        // Commencer animation UX
                        animateButtonPlaylist();
                        stringEmoji = stringEmoji.substr(0,stringEmoji.length-1);
                        console.log('moods = '+stringEmoji);
                        var tunetables = processTunetables();

                        $.ajax({
                            url: '/getArtistsFromMood',
                            data: {
                                user: current_user,
                                mood: stringEmoji,
                                tunetables: tunetables,
                                nom_playlist: nom_playlist
                            }
                        }).done(function(data) {
                            if (data.error) alert(data.error);
                            else {
                                console.log(data.moodmusicRecommendation)
                                window.location.href = data.moodmusicRecommendation.external_urls.spotify;
                            }
                        });
                    } else {
                        alert("Sélectionnez au moins une emotion");
                    }
                });
            });
        }
    });
}

function animateButtonPlaylist() {
    var bouton = $("#bouton-creer-playlist");
    bouton.unbind("click");
    bouton.toggleClass('processReduce');
    bouton.children().each(function() {
        var dot = $(this);
        dot.toggleClass('dot');
        setTimeout(function(){
            dot.toggleClass('dot-full');
        },1000*parseInt(dot.attr('id')));
    });
}

function afficherCalibrage(user) {
    console.log("Bienvenue sur moodmusic !");
    $("#menu").hide();

    $.ajax({
        url: '/getCurrentUserInfos',
        data: {
            user: user.id
        },
        success: function (response) {
            var artists = response['0']['tabArtistesPref'];
            $.ajax({url: '/getMoods'}).done(function(response) {
                var moods = JSON.parse(response);
                console.log(user);
                console.log(artists);
                console.log(moods);

                var numArtiste = -1;

                if(artists.length == 0) {
                    calibrageManuel = true;
                    afficherAjoutArtiste(user,artists,numArtiste,moods);
                } else {
                    afficherArtisteSuivant(user, artists, numArtiste,moods);
                }
            });
        }
    });
}

function afficherArtisteSuivant(user,artists,numArtiste,moods) {
    var calibrageSource = document.getElementById('calibrage-template').innerHTML,
        calibrageTemplate = Handlebars.compile(calibrageSource),
        calibragePlaceholder = document.getElementById('calibrage');

    // On passe à l'artiste suivant ou on arrête s'il n'y en a plus
    numArtiste++;
    if (numArtiste == artists.length){
        // Passer à autre chose
        $(".fin-calibrage").show();
        $("#debut-calibrage").hide();

        $(".finir-calibrage").click(function() {
            $("#menu").show();
            view_moodEvaluation();
            afficherArtistesPrefs(user.id);
        });
    } else {
        calibragePlaceholder.innerHTML = calibrageTemplate({
            username: user.display_name.split(' ')[0] ? user.display_name.split(' ')[0] : '',
            user: user,
            artist: artists[numArtiste],
            moods: moods['moods'],
            numArtiste: numArtiste+1,
            nbArtistes: artists.length
        });
        eventListenerEmojiSelect(user.id);
        eventListenerSupprArtist(user,artists,numArtiste,moods);
        eventListenerValiderCalibrage(user,artists,numArtiste,moods);
    }
}

function afficherAjoutArtiste(user,artists,numArtiste,moods) {
    var calibrageManuelSource = document.getElementById('calibrage-manuel-template').innerHTML,
        calibrageManuelTemplate = Handlebars.compile(calibrageManuelSource),
        calibrageManuelPlaceholder = document.getElementById('calibrage-manuel');

    numArtiste++;
    if (numArtiste == minArtistes) {
        console.log("FINI");
        // Passer à autre chose
        $(".fin-calibrage").show();
        $("#debut-calibrage-manuel").hide();

        $(".finir-calibrage").click(function() {
            $("#menu").show();
            view_moodEvaluation();
            afficherArtistesPrefs(user.id);
        });
    } else {
        calibrageManuelPlaceholder.innerHTML = calibrageManuelTemplate({
            username: user.display_name.split(' ')[0] ? user.display_name.split(' ')[0] : '',
            moods: moods['moods'],
            numArtiste: numArtiste+1,
            nbArtistes: minArtistes // ajouter 5 artistes
        });
        eventListenerAddArtist(user,artists,numArtiste,moods); // margot treinsoutrot c la best
    }
}

function eventListenerAddArtist(user,artists,numArtiste,moods) {
    // Ajouter un artiste préféré
    $("#calibrage-button-addArtistPref").click(function(){
        var artist_name = $("#calibrage-artistName").val();
        if (artist_name) {
            $(this).toggleClass('processRotate');
            $.ajax({
                url: '/addArtistPref',
                data: {
                    name: artist_name,
                    user: user.id
                }
            }).done(function(data) {
                if(data.state)  alert("L'artiste n'existe pas");
                console.log(data);
                // Arreter la rotation du bouton +
                $("#calibrage-button-addArtistPref").toggleClass('processRotate');

                // Afficher artiste trouvé pour le noter
                var calibrageManuelSource = document.getElementById('calibrage-manuel-template').innerHTML,
                    calibrageManuelTemplate = Handlebars.compile(calibrageManuelSource),
                    calibrageManuelPlaceholder = document.getElementById('calibrage-manuel');

                var artist = data[0].tabArtistesPref[0];
                calibrageManuelPlaceholder.innerHTML = calibrageManuelTemplate({
                    username: user.display_name.split(' ')[0] ? user.display_name.split(' ')[0] : '',
                    moods: moods['moods'],
                    artist: artist,
                    numArtiste: numArtiste+1,
                    nbArtistes: minArtistes // ajouter 5 artistes
                });
                $("#calibrage-addArtistPref").hide();
                $("#"+artist.id).show();
                eventListenerEmojiSelect(user.id);
                eventListenerSupprArtist(user,artists,numArtiste,moods);
                eventListenerValiderCalibrage(user,artists,numArtiste,moods);
            });
        }
    });
}

function eventListenerSupprArtist(user,artists,numArtiste,moods) {

    // Supprimer un artiste préféré
    $(".removeArtistPref").click(function(){
        var idArtist = $(this).attr('id').split('-');
        $("#"+idArtist).fadeOut();
        $.ajax({
            url: '/removeArtistPref',
            data: {
                idArtist: idArtist[1],
                user: user.id
            }
        }).done(function(data) {
            if (calibrageManuel) {
                afficherAjoutArtiste(user,artists,numArtiste-1,moods);
            } else {
                afficherArtisteSuivant(user,artists,numArtiste,moods);
            }
        });
    });
}

function eventListenerValiderCalibrage(user,artists,numArtiste,moods) {

    $("#suite").click(function(){
        if (calibrageManuel) {
            afficherAjoutArtiste(user,artists,numArtiste,moods);
        } else {
            afficherArtisteSuivant(user,artists,numArtiste,moods);
        }
    });
}

function eventListenerEmojiSelect(id_user) {
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
                user: id_user,
                artist: link[0],
                mood: link[1],
                ajouterMood: ajouterMood
            }
        }).done(function(data) {
            console.log(data.state);
        });
    });
}