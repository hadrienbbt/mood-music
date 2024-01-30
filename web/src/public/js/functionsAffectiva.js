/**
 * Created by hadrien1 on 05/11/16.
 */

// SDK Needs to create video and canvas nodes in the DOM in order to function
// Here we are adding those nodes a predefined div.

var divRoot = $("#affdex_elements")[0];
var width = 640;
var height = 480;
var faceMode = affdex.FaceDetectorMode.LARGE_FACES;
//Construct a CameraDetector and specify the image width / height and face detector mode.
var detector = new affdex.CameraDetector(divRoot, width, height, faceMode);
var tabValence = new Array();

//Enable detection of all Expressions, Emotions and Emojis classifiers.
detector.detectAllEmotions();
detector.detectAllExpressions();
detector.detectAllEmojis();
detector.detectAllAppearance();

//Add a callback to notify when the detector is initialized and ready for runing.
detector.addEventListener("onInitializeSuccess", function() {
    //Display canvas instead of video feed because we want to draw the feature points on it
    $("#face_video_canvas").css("display", "block");
    $("#face_video").css("display", "none");
});

function log(node_name, msg) {
    $(node_name).append("<span>" + msg + "</span><br />")
}

//function executes when Start button is pushed.
function onStart() {
    if (detector && !detector.isRunning) {
        detector.start();
    }
}

//function executes when the Stop button is pushed.
function onStop() {
    if (detector && detector.isRunning) {
        detector.removeEventListener();
        detector.stop();
    }
};

//function executes when the Reset button is pushed.
function onReset() {
    if (detector && detector.isRunning) {
        detector.reset();

        $('#results').html("");
    }
};

//Add a callback to notify when camera access is allowed
detector.addEventListener("onWebcamConnectSuccess", function() {
});

//Add a callback to notify when camera access is denied
detector.addEventListener("onWebcamConnectFailure", function() {
    console.log("Webcam access denied");
});

//Add a callback to notify when detector is stoppedé
detector.addEventListener("onStopSuccess", function() {
    $("#results").html("");
});

//Add a callback to receive the results from processing an image.
//The faces object contains the list of the faces detected in an image.
//Faces object contains probabilities for all the different expressions, emotions and appearance metrics
detector.addEventListener("onImageResultsSuccess", function(faces, image, timestamp) {
    // Décommenter pour connaitre les caractéristiques mesurées
    //console.log(faces);
    $('#results').html("");
    log('#results', "Timestamp: " + timestamp.toFixed(2));
    log('#results', "Number of faces found: " + faces.length);
    if (faces.length > 0) {
        //console.log(faces);
        // Ajout Hadrien pour remplir le champ valence et activation
        var valence = ((faces[0]['emotions']['valence']+100)/200).toFixed(4);
        var activation = (faces[0]['emotions']['engagement']/100).toFixed(4);
        var emoji = faces[0]['emojis']['dominantEmoji'];
        $('#valence').val(valence);
        $('#activation').val(activation);
        $('#emoji').empty();
        $('#emoji').append(emoji);
        tabValence.push(valence);
        //Fin ajout

        // V2 : plus besoin de ça
        /*log('#results', "Appearance: " + JSON.stringify(faces[0].appearance));
        log('#results', "Emotions: " + JSON.stringify(faces[0].emotions, function(key, val) {
            return val.toFixed ? Number(val.toFixed(0)) : val;
        }));
        log('#results', "Expressions: " + JSON.stringify(faces[0].expressions, function(key, val) {
            return val.toFixed ? Number(val.toFixed(0)) : val;
        }));
        log('#results', "Emoji: " + faces[0].emojis.dominantEmoji);
        drawFeaturePoints(image, faces[0].featurePoints);
        */
    }
});

//Draw the detected facial feature points on the image
function drawFeaturePoints(img, featurePoints) {
    var contxt = $('#face_video_canvas')[0].getContext('2d');

    var hRatio = contxt.canvas.width / img.width;
    var vRatio = contxt.canvas.height / img.height;
    var ratio = Math.min(hRatio, vRatio);

    contxt.strokeStyle = "#FFFFFF";
    for (var id in featurePoints) {
        contxt.beginPath();
        contxt.arc(featurePoints[id].x,
            featurePoints[id].y, 2, 0, 2 * Math.PI);
        contxt.stroke();

    }
}