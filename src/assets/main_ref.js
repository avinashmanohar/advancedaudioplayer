(function () {
    'use strict';
  
    function init() {
  
      var filedrag = document.getElementById('filedrag'),
        fileselect = document.getElementById('fileselect'),
        disableFilter = document.getElementById('disable-filter'),
        options = document.getElementById('options'),
        demoAudio = document.getElementById('demo-audio');
  
      // file select
      fileselect.addEventListener('change', fileSelectHandler, false);
  
      var xhr = new XMLHttpRequest();
      if (xhr.upload) {
        // file drop
        filedrag.addEventListener('dragover', fileDragHover, false);
        filedrag.addEventListener('dragleave', fileDragHover, false);
        filedrag.addEventListener('drop', fileSelectHandler, false);
        filedrag.style.display = 'block';
      } else {
        filedrag.style.display = 'none';
      }
  
      var karaokeEnabled = true;
  
      disableFilter.addEventListener('click', function () {
        if (karaokeEnabled) {
          disableKaraoke();
          karaokeEnabled = false;
          disableFilter.innerHTML = 'Enable karaoke';
        } else {
          enableKaraoke();
          karaokeEnabled = true;
          disableFilter.innerHTML = 'Disable karaoke';
        }
      });
  
      demoAudio.addEventListener('click', function () {
        playSound('audio/aankh.mp3')
      }, false);
    }
  
    // plays a file
    function playSound(url) {
      var request = new XMLHttpRequest();
  
      request.open('GET', url, true);
      request.responseType = 'arraybuffer';
  
      // Our asynchronous callback
      request.onload = function () {
        var data = request.response;
        initAudio(data);
        showData(data);
      };
  
      request.send();
    }
  
    // file drag hover
    function fileDragHover(e) {
      e.stopPropagation();
      e.preventDefault();
      e.target.className = (e.type === 'dragover' ? 'hover' : '');
    }
  
    // file selection
    function fileSelectHandler(e) {
      // cancel event and hover styling
      fileDragHover(e);
  
      var droppedFiles = e.target.files || e.dataTransfer.files;
  
      var reader = new FileReader();
  
      reader.onload = function (fileEvent) {
        var data = fileEvent.target.result;
        initAudio(data);
        showData(this.result);
      };
  
      // http://ericbidelman.tumblr.com/post/8343485440/reading-mp3-id3-tags-in-javascript
      // https://github.com/jDataView/jDataView/blob/master/src/jDataView.js
  
      reader.readAsArrayBuffer(droppedFiles[0]);
    }
  
    function showData(file) {
      var currentSong = document.getElementById('current-song');
      var dv = new jDataView(file);
  
      try {
        // "TAG" starts at byte -128 from EOF.
        // See http://en.wikipedia.org/wiki/ID3
        if (dv.getString(3, dv.byteLength - 128) == 'TAG') {
          var title = dv.getString(30, dv.tell());
          var artist = dv.getString(30, dv.tell());
          var album = dv.getString(30, dv.tell());
          var year = dv.getString(4, dv.tell());
          currentSong.innerHTML = 'Playing ' + title + ' by ' + artist;
        } else {
          // no ID3v1 data found.
          currentSong.innerHTML = 'Playing';
        }
      } catch (e) {
        currentSong.innerHTML = 'Playing';
      }
  
      options.style.display = 'block';
    }
  
    // call initialization file
    if (window.File && window.FileList && window.FileReader) {
      init();
    } else {
      alert('Your browser does not support File');
    }
  
    var context = new (window.AudioContext || window.webkitAudioContext)();
    var source;
    var processor,
      filterLowPass,
      filterHighPass,
      mix,
      mix2, processor2;
  
    function initAudio(data) {
      if (source) source.stop(0);
  
      //Make it 6 channels output
      console.log(context.destination.maxChannelCount);
      if (context.destination.maxChannelCount >= 6) {
        context.destination.channelCount = 6;
      }
      else {
        context.destination.channelCount = 2;
      }
  
      context.destination.channelCountMode = "explicit";
      context.destination.channelInterpretation = "discrete";
      //Make it 6 channels output ends
  
      source = context.createBufferSource();
  
      if (context.decodeAudioData) {
        context.decodeAudioData(data, function (buffer) {
          source.buffer = buffer;
          createAudio();
        }, function (e) {
          console.error(e);
        });
      } else {
        source.buffer = context.createBuffer(data, false);
        createAudio();
      }
    }
  
    function createAudio() {
      // create low-pass filter
      filterLowPass = context.createBiquadFilter();
      source.connect(filterLowPass);
  
      filterLowPass.type = 'lowpass';
      filterLowPass.frequency.value = 120;
  
      // create high-pass filter
      filterHighPass = context.createBiquadFilter();
      source.connect(filterHighPass);
      filterHighPass.type = 'highpass';
      filterHighPass.frequency.value = 120;
  
      // create the gain node
      mix = context.createGain();
  
      mix2 = context.createGain();
      source.connect(mix2);
      mix2.connect(context.destination);
  
      mix.gain.value = 1;
      mix2.gain.value = 0;
  
      // create the processor
      processor = context.createScriptProcessor(0 /*bufferSize*/, 2 /*num inputs*/, 6 /*num outputs*/);
      processor2 = context.createScriptProcessor(0 /*bufferSize*/, 2 /*num inputs*/, 6 /*num outputs*/);
  
      // Exp
      var splitter = context.createChannelSplitter(6);
      var merger = context.createChannelMerger(6);
      var gainL = context.createGain();
      var gainR = context.createGain();
      var gainC = context.createGain();
      var gainSW = context.createGain();
      var gainSL = context.createGain();
      var gainSR = context.createGain();
  
      var delaySL = context.createDelay();
      var delaySR = context.createDelay();
  
      var filterHighPassL = context.createBiquadFilter();
      var filterHighPassR = context.createBiquadFilter();
      var filterHighPassC = context.createBiquadFilter();
      var filterHighPassSL = context.createBiquadFilter();
      var filterHighPassSR = context.createBiquadFilter();
  
      var filterLowPassSW = context.createBiquadFilter();
  
  
      // Exp 2
  
      // connect everything
      // filterHighPass.connect(filterLowPass);
      // filterLowPass.connect(processor);
      source.connect(processor);
      // processor.connect(processor2);
      processor.connect(mix);
  
      // Assign nodes of every channel saperately
      mix.connect(splitter);
      splitter.connect(gainL, 0); // Assign left to gainL
      splitter.connect(gainR, 1); // Assign right to gainR
      splitter.connect(gainC, 2); // Assign Center to gainC
      splitter.connect(gainSW, 3); // Assign Sub Woofer to gainSW
      splitter.connect(gainSL, 4); // Assign Surround Left to gainSL
      splitter.connect(gainSR, 5); // Assign Surround Right to gainSR
  
      // gainNode.gain.setValueAtTime(0.01, context.currentTime);//Reduce gain
      gainL.gain.value = 1;
      gainR.gain.value = 1;
      gainC.gain.value = 1;
      gainSW.gain.value = 1;
      gainSL.gain.value = 1;
      gainSR.gain.value = 1;
  
      gainSL.connect(delaySL);
      gainSR.connect(delaySR);
  
      // Set some delay to surround channels
      var delay = 30 / 1000
      delaySL.delayTime.value = delay;
      delaySR.delayTime.value = delay;
  
  
      gainSW.connect(filterLowPassSW);
  
      gainL.connect(filterHighPassL);
      gainR.connect(filterHighPassR);
      gainC.connect(filterHighPassC);
      delaySL.connect(filterHighPassSL);
      delaySR.connect(filterHighPassSR);
  
      // Filters
      var lowPassFreq = 60;// Hz
      var HighPassFreq = 300;// Hz
      filterLowPassSW.type = 'lowpass'; // For subwoofer
      filterLowPassSW.frequency.value = lowPassFreq;
  
      filterHighPassL.type = "highpass";
      filterHighPassL.frequency.value = HighPassFreq;
      filterHighPassR.type = "highpass";
      filterHighPassR.frequency.value = HighPassFreq;
      filterHighPassC.type = "highpass";
      filterHighPassC.frequency.value = HighPassFreq;
      filterHighPassSL.type = "highpass";
      filterHighPassSL.frequency.value = HighPassFreq;
      filterHighPassSR.type = "highpass";
      filterHighPassSR.frequency.value = HighPassFreq;
      // Filters ends
  
      filterHighPassL.connect(merger, 0, 0); // Left 
      filterHighPassR.connect(merger, 0, 1); // Right
      filterHighPassSL.connect(merger, 0, 2); // Center
      filterLowPassSW.connect(merger, 0, 3); // Sub Woofer
      filterHighPassSL.connect(merger, 0, 4); // Surround Left
      filterHighPassSR.connect(merger, 0, 5); // Surround Right
  
  
      merger.connect(context.destination);
  
  
  
  
      // connect with the karaoke filter
      processor.onaudioprocess = karaoke;
      // processor2.onaudioprocess = karaoke2;
  
      // playback the sound
      source.start(0);
  
      //setTimeout(disconnect, source.buffer.duration * 1000 + 1000);
    }
  
    function disconnect() {
      source.stop(0);
      source.disconnect(0);
      processor.disconnect(0);
      mix.disconnect(0);
      mix2.disconnect(0);
      filterHighPass.disconnect(0);
      filterLowPass.disconnect(0);
      console.log('Disconnected!');
    }
  
    // based on https://gist.github.com/kevincennis/3928503
    // flip phase of right channel
    // http://www.soundonsound.com/sos/sep04/articles/qa0904-7.htm
    function karaoke(evt) {
      var inputL = evt.inputBuffer.getChannelData(0),
        inputR = evt.inputBuffer.getChannelData(1);
  
      var outputL = evt.outputBuffer.getChannelData(0),
        outputR = evt.outputBuffer.getChannelData(1),
        outputC = evt.outputBuffer.getChannelData(2),
        outputSW = evt.outputBuffer.getChannelData(3),
  
        outputSL = evt.outputBuffer.getChannelData(4),
        outputSR = evt.outputBuffer.getChannelData(5),
        len = inputL.length;
  
  
      console.log(evt.outputBuffer.numberOfChannels);
      for (var i = 0; i < len; i++) {
  
        outputL[i] = inputL[i];
        outputR[i] = inputR[i];
        outputC[i] = inputL[i] * 0.5 + inputR[i] * 0.5;
        outputSW[i] = inputL[i] + inputR[i];
        outputSL[i] = inputR[i] - inputL[i];
        outputSR[i] = inputL[i] - inputR[i];
  
  
  
        // Below is Dolby Pro Logic II
        /*
        outputL[i] = inputL[i];
        outputR[i] = inputR[i];
        outputC[i] = inputL[i] * 0.5 + inputR[i] * 0.5;
        outputSW[i] = inputL[i] + inputR[i];
        outputSL[i] = Math.sqrt(inputL[i] * (3 / 2)) - (inputR[i] * 0.5);
        outputSR[i] = Math.sqrt(inputR[i] * (3 / 2)) - (inputL[i] * 0.5);
        */
  
      }
    }
    function karaoke2(evt) {
      var inputL = evt.inputBuffer.getChannelData(0),
        inputR = evt.inputBuffer.getChannelData(1);
  
      var outputL = evt.outputBuffer.getChannelData(0),
        outputR = evt.outputBuffer.getChannelData(1),
        outputC = evt.outputBuffer.getChannelData(2),
        outputSW = evt.outputBuffer.getChannelData(3),
        outputSL = evt.outputBuffer.getChannelData(4),
        outputSR = evt.outputBuffer.getChannelData(5),
        len = inputL.length;
      console.log(len);
  
      console.log(evt.outputBuffer.numberOfChannels);
      for (var i = 0; i < len; i++) {
  
        // outputL[i] = 0;
        // outputR[i] = 0;
        // outputC[i] = 0;
        // outputSW[i] = 0;
        outputSL[i] = inputR[i];
        // outputSR[i] = 0;
  
  
        /*
        // Below is Dolby Pro Logic II
        outputL[i] = inputL[i];
        outputR[i] = inputR[i];
        outputC[i] = inputL[i] * 0.5 + inputR[i] * 0.5;
        outputSW[i] = inputL[i] + inputR[i];
        outputSL[i] = (inputL[i] * (Math.sqrt(3) / 2)) - (inputR[i] * 0.5);
        outputSR[i] = (inputR[i] * (Math.sqrt(3) / 2)) - (inputL[i] * 0.5);
        */
      }
    }
  
    function disableKaraoke() {
      mix2.gain.value = 1;
      mix.gain.value = 0;
    }
  
    function enableKaraoke() {
      mix.gain.value = 0.1;
      mix2.gain.value = 0;
    }
  
  })();
  