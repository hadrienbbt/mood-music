/**
 * Created by hadrien1 on 17/11/16.
 */
var minArtistes = 5; // Constante pour un nombre minimum d'artistes à ajouter
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

function processTunetables(moods) {
    var tunetables = {danceability: [], energy: [], valence: []};
    var nbSliders = 0;

    // Création d'un tableau associatif (mood -> functions)
    var functionsTunetables = new Array();
    for (var i = 0; i<moods.length; i++) {
        functionsTunetables[moods[i].state] = moods[i].functions;
    }
    // console.log(functionsTunetables);

    // on regarde tous les sliders visibles
    $(".input-slider-mood").each(function() {
        var state = $(this).attr('id').substr(0,$(this).attr('id').indexOf('-'));
        if ($("#"+state).hasClass('on')) {
            var x = $(this).slider('getValue');

            // Evaluer les fonctions associées à l'humeur courante
            // Ajouter dans une nouvelle case l'image de chaque fonction
            for (var tunetable in functionsTunetables[state])
                tunetables[tunetable][nbSliders] = eval(functionsTunetables[state][tunetable]);

            if (state != 'dance')   nbSliders++;
        }
    });

    // On fait la moyenne et si ça marche pas on enlève l'attribut;
    for(var tunetable in tunetables) {
        //if (!tunetables[tunetable])          delete tunetables[tunetable];
        tunetables[tunetable] = parseFloat(moyenne(tunetables[tunetable]));
        if (isNaN(tunetables[tunetable]))    delete tunetables[tunetable];

    }
    // console.log(tunetables);

    return tunetables;
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
                            var stringIdMood = "#"+artists[i].id + "-" + artists[i]['mood_related'][j];
                            $(stringIdMood).addClass("on");
                            //console.log(stringIdMood + " : classe on ajoutée à " +artists[i].name+" - " +artists[i]['mood_related'][j]);
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
                            if(data.state)  alert(data.state);
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


                var sliders = creerSliders(moods);

                window.addEventListener('resize', function(){

                    // Détruire tous les sliders
                    for (var i=0; i<sliders.length; i++)
                        sliders[i].slider('destroy');

                    // Les recréer avec les bonnes propriétés
                    sliders = creerSliders(moods);
                }, false);

                window.addEventListener('orientationchange', function() {

                    // Détruire tous les sliders
                    for (var i=0; i<sliders.length; i++)
                        sliders[i].slider('destroy');

                    // Les recréer avec les bonnes propriétés
                    sliders = creerSliders(moods);
                });

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
                        var tunetables = processTunetables(moods['moods']);

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

function creerSliders(moods) {
    // Si l'écran est plus petit que 480px on met les sliders horizontal pour l'ux
    if (screen.width < 480 || screen.height <= 570) {
        //console.log("petit ecran");
        var orientation = 'horizontal';
        var reversed = false;
        var max = 1.05;
        if (screen.width < 420) max = 1.08;
    } else {
        var orientation = 'vertical';
        var reversed = true;
        var max = 1.1;
        //console.log("grand ecran");
    }
    var sliders = new Array();
    // Créer tous les sliders
    for (var i = 0; i<moods['moods'].length; i++) {
        var state = moods['moods'][i].state;
        // With JQuery
        sliders.push( $("#"+state+"-slider").slider({
            orientation: orientation,
            min: 0,
            max: max,
            value: 0.55,
            step: 0.01,
            reversed : reversed
        }) );

        // Récupérer la valeur du slider quand on le lâche
        $(".input-slider-mood").on("slideStop",function(){
            // Call a method on the slider
            console.log($(this).slider('getValue'));
            if($(this).slider('getValue') == "0") {
                var id_mood = $(this).attr('id').split('-')[0];
                $("#"+id_mood).click();
                var slider = $(this);
                var restaurerslider = setTimeout(function(){
                    slider.slider('setValue',0.5);
                },300);
                restaurerslider();
            }
            if (parseFloat($(this).slider('getValue')) > 1) $(this).slider('setValue',1);
        });
    }
    return sliders;
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

function afficherCalibrage(user, artists) {
    console.log("Bienvenue sur moodmusic !");
    $("#menu").hide();
    var artists = artists;
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
            username: user.display_name ? user.display_name.split(' ')[0] : '',
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
            username: user.display_name ? user.display_name.split(' ')[0] : '',
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
                // Arreter la rotation du bouton +
                $("#calibrage-button-addArtistPref").toggleClass('processRotate');

                if(data.state)  alert(data.state);
                else {
                    console.log(data);

                    // Afficher artiste trouvé pour le noter
                    var calibrageManuelSource = document.getElementById('calibrage-manuel-template').innerHTML,
                        calibrageManuelTemplate = Handlebars.compile(calibrageManuelSource),
                        calibrageManuelPlaceholder = document.getElementById('calibrage-manuel');

                    var artist = data[0] ? data[0].tabArtistesPref[0] : [];
                    calibrageManuelPlaceholder.innerHTML = calibrageManuelTemplate({
                        username: user.display_name ? user.display_name.split(' ')[0] : '',
                        moods: moods['moods'],
                        artist: artist,
                        numArtiste: numArtiste+1,
                        nbArtistes: minArtistes // ajouter 5 artistes
                    });
                    $("#container-demo").hide();
                    $("#calibrage-addArtistPref").hide();
                    $("#"+artist.id).show();
                    eventListenerEmojiSelect(user.id);
                    eventListenerSupprArtist(user,artists,numArtiste,moods);
                    eventListenerValiderCalibrage(user,artists,numArtiste,moods);
                }
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