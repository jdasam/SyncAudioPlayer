var audioContext;
var sourceNode;
var startOffset = 0;
var startTime = 0;
var audioFile;
var playingOn=false;
var playingB=false;
var increaseValueSave;
var userRecord = [];
var volumes = []; // volume per every window samples

var fftSize = 4096;
var samplingRate = 44100;
var frequencyBinSize = samplingRate/fftSize;

var volumeWindowSize = 2048;


var blackmanAlpha = 0.16
var blackman0 = (1-blackmanAlpha)/2
var blackman1 = 1/2
var blackman2 = blackmanAlpha/2

var smoothingTimeConstant = 0.1;

var dummyArray = new Array(fftSize/2);
for (var i=0; i<fftSize/2; i++){
    dummyArray[i] = 0;
}

var csvA
var csvB




var contextClass = (window.AudioContext || 
  window.webkitAudioContext || 
  window.mozAudioContext || 
  window.oAudioContext || 
  window.msAudioContext);
if (contextClass) {
  // Web Audio API is available.
  var context = new contextClass();
} else {
  // Web Audio API is not available. Ask the user to use a supported browser.
  // Does this work?
  alert('The Web browser does not support WebAudio. Please use the latest version.');
}



window.onload=function(){

	var canvas = document.getElementById("interfaceCanvas");
	canvas.addEventListener("mousedown", doMouseDown, false);

	var file = 'audioA.mp3';
	var fileReader = new FileReader();
	fileReader.onload = fileLoaded;
	fileReader.readAsArrayBuffer(file);
	startOffset = 0;

	var file = 'audioB.mp3';
	var fileReader = new FileReader();
	fileReader.onload = fileLoadedB;
	fileReader.readAsArrayBuffer(file);

	Papa.parse('csvA.csv', {
		dynamicTyping: true,
		complete: function(results) {
			csvA = results;
			console.log(csvA);
		}
	});

	Papa.parse('csvB.csv', {
		dynamicTyping: true,
		complete: function(results) {
			csvB = results;
		}
	});

	audioContext = new contextClass();

}

window.requestAnimFrame = (function(callback) {
        return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame ||
        function(callback) {
          window.setTimeout(callback, 1000 / 60);
        };
})();





function fileLoaded(e){
	audioContext.decodeAudioData(e.target.result, audioFileDecoded, audioFileDecodeFailed);
}

function fileLoadedB(e){
	audioContext.decodeAudioData(e.target.result, audioFileDecodedB, audioFileDecodeFailed);
}

function csvFileLoadedA(e){
	Papa.parse(e.target.result);
	console.log('midi file loaded?');
}



function audioFileDecoded(audioBuffer){
	if (sourceNode) {
		stop();
	}
	audioFile = audioBuffer;

	playSound(audioBuffer);

	drawProgress(document.getElementById("interfaceCanvas"));
	
}
function audioFileDecodedB(audioBuffer){

	audioFileB = audioBuffer;
}


function audioFileDecodeFailed(e){
	alert("The audio file cannot be decoded!");
}



function loadSound(url) {
	var request = new XMLHttpRequest();
	request.open('GET', url, true);
	request.responseType = 'arraybuffer';

	// When loaded decode the data
	request.onload = function() {

		// decode the data
		context.decodeAudioData(request.response, audioFileDecoded, audioFileDecodeFailed);
	}
	request.send();
}




function setupAudioNodes() {
	// create a buffer source node
	sourceNode = audioContext.createBufferSource();
	// and connect to destination
	sourceNode.connect(audioContext.destination);
	
}


//audio file playback control

function playSound(audioBuffer) {
	setupAudioNodes(); //이거 사실 한번만 호출해 두면 될 것 같은데...
	startTime = audioContext.currentTime;
	sourceNode.buffer = audioBuffer;
	sourceNode.start(0, startOffset % audioBuffer.duration);
	playingOn = true;
}

function pause() {
	sourceNode.stop();
	// Measure how much time passed since the last pause.
	startOffset += audioContext.currentTime - startTime;
	playingOn = false;
}

function stop() {
	sourceNode.stop();
	startOffset = 0;
	playingOn = false;
}

function switchAudio(){
	sourceNode.stop();
	setupAudioNodes();
	startTime = audioContext.currentTime;
	if (playingB){
		sourceNode.buffer = audioFile;
		startOffset = indexInterpolation(startOffset, csvB, csvA)
		sourceNode.start(0, startOffset % audioFile.duration);
		playingOn = true;
		playingB = false;
	}
	else{
		sourceNode.buffer = audioFileB;
		startOffset = indexInterpolation(startOffset, csvA, csvB)
		sourceNode.start(0, startOffset % audioFile.duration);
		playingOn = true;
		playingB = true;		
	}
}


function doMouseDown(e){
	//var currentTime = remainingSeconds;
	var rect = e.target.getBoundingClientRect();
	var x= e.clientX-rect.left - e.target.clientLeft + e.target.scrollLeft;

	if(playingB){
		canvas_x = x/plottingCanvasWidth * audioFileB.length / audioFileB.sampleRate;
		stop();
		startOffset = canvas_x;
		playSound(audioFileB);
	}
	else{
		canvas_x = x/plottingCanvasWidth * audioFile.length / audioFile.sampleRate;
		stop();
		startOffset = canvas_x;
		playSound(audioFile);
	}
}


//calculate volume using simple linear array


function drawProgress(canvas){
	var progress = canvas.getContext("2d");
	
	progress.clearRect(0, 0, canvas.width, canvas.height);
	progress.strokeStyle = "#000000"

	progress.beginPath();
	if(playingB){
		progress.moveTo(startOffset * plottingCanvasWidth /audioFileB.length * audioFile.sampleRate, 0);
    	progress.lineTo(startOffset * plottingCanvasWidth /audioFileB.length * audioFile.sampleRate, canvas.height);

	}
	else{
		progress.moveTo(startOffset * plottingCanvasWidth /audioFile.length * audioFile.sampleRate, 0);
    	progress.lineTo(startOffset * plottingCanvasWidth /audioFile.length * audioFile.sampleRate, canvas.height);
	}
    progress.lineWidth=1;

    progress.stroke();    
    
    if (playingOn){
    	startOffset += audioContext.currentTime - startTime;
    	startTime = audioContext.currentTime;
    }
    
    
    
	requestAnimFrame(function() {
		drawProgress(document.getElementById("interfaceCanvas"))
	});
}


function indexInterpolation(currentSecond, csvArray, csvArraySwitch){
	var i = 0;
	csvArray = csvArray.data;
	csvArraySwitch = csvArraySwitch.data;

	while(currentSecond > csvArray[i][0]){
		i++;
	}

	var interpolation = (currentSecond - csvArray[i-1][0]) / (csvArray[i][0] - csvArray[i-1][0]);
	console.log(interpolation);
	return csvArraySwitch[i-1][0] + interpolation * (csvArraySwitch[i][0] - csvArraySwitch[i-1][0])


}

