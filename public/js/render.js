/**
 * Created by hadrien1 on 05/12/16.
 */
function view_connexion(){
    $('#login').show();
    $('#loggedin').hide();
}

function view_profile(){
    $("#profile").show();
    $("#moodEvaluation").hide();
    $("#topArtists").hide();

}

function view_moodEvaluation(){
    $("#profile").hide();
    $("#moodEvaluation").show();
    $("#topArtists").hide();
}

function view_accueil(){
    $('#loggedin').show();
    $("#moodEvaluation").hide();
    $("#profile").hide();
    $("#topArtists").hide();
}

function view_artistsEvaluation(){
    $("#moodEvaluation").hide();
    $("#profile").hide();
    $("#topArtists").show();
}