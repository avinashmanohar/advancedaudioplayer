import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class AudioService {
  public context: AudioContext;

  private source: AudioBufferSourceNode;
  private processor: ScriptProcessorNode | AudioWorkletNode;
  private mix: GainNode;

  // public audioworkletRunning: Subject<boolean>;

  constructor() {
    try {
      this.context = new AudioContext();
    } catch (e) {
      console.log('No audio');
    }
  }

  playSound(url: string) {
    const request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.responseType = 'arraybuffer';

    // Our asynchronous callback
    request.onload = () => {
      const data = request.response;
      this.processAudio(data);
      // showData(data);
    };

    request.send();
  }

  processAudio(data: any) {
    if (this.source) {
      this.source.stop(0);
    }

    console.log(this.context.destination.maxChannelCount);
    if (this.context.destination.maxChannelCount >= 6) {
      this.context.destination.channelCount = 6;
    } else {
      this.context.destination.channelCount = 2;
    }

    this.context.destination.channelCountMode = 'explicit';
    this.context.destination.channelInterpretation = 'discrete';

    this.source = this.context.createBufferSource();

    if (this.context.decodeAudioData) {
      this.context.decodeAudioData(data, (buffer) => {
        this.source.buffer = buffer;
        this.createAudio();
      }, e => {
        console.error(e);
      });
    } else {
      this.source.buffer = this.context.createBuffer(
        this.context.destination.channelCount,
        this.context.sampleRate * 3,
        this.context.sampleRate); // Create an empty three-second *stereo (5.1) buffer at the sample rate of the AudioContext
      this.createAudio();
    }
  }

  async createAudio() {
    // create the gain node
    this.mix = this.context.createGain();
    this.mix.gain.value = 1; // set to max vol;



    // Required stuff start
    const splitter = this.context.createChannelSplitter(6);
    const merger = this.context.createChannelMerger(6);
    const gainL = this.context.createGain();
    const gainR = this.context.createGain();
    const gainC = this.context.createGain();
    const gainSW = this.context.createGain();
    const gainSL = this.context.createGain();
    const gainSR = this.context.createGain();

    const delaySL = this.context.createDelay();
    const delaySR = this.context.createDelay();

    const filterHighPassL = this.context.createBiquadFilter();
    const filterHighPassR = this.context.createBiquadFilter();
    const filterHighPassC = this.context.createBiquadFilter();
    const filterHighPassSL = this.context.createBiquadFilter();
    const filterHighPassSR = this.context.createBiquadFilter();

    const filterLowPassSW = this.context.createBiquadFilter();
    // Required stuff start ends

    // start connecting
    if (this.context.audioWorklet && typeof this.context.audioWorklet.addModule === 'function') {
      console.log('Audioworklet support detected, don\'t use the old scriptprocessor...');
      // this.audioworkletRunning.next(true);
      await this.context.audioWorklet.addModule('../assets/bypass-processor.js').then(() => {
        this.processor = new AudioWorkletNode(this.context, 'bypass-processor', {
          // you have to specify the channel count for each input, so by default only 1 is needed
          outputChannelCount: [6]
        });
        // console.log(this.processor);
        this.source.connect(this.processor);
      });
    } else {
      console.log('Audioworklet not support detected, using old scriptprocessor...');
      // this.audioworkletRunning.next(false);
      // Create a ScriptProcessorNode with a bufferSize of 0 (Dynamic - system will auto fix buffer) and a single input and output channel
      // create the processor
      this.processor = this.context.createScriptProcessor(0 /*bufferSize*/, 2 /*num inputs*/, 6 /*num outputs*/);
      this.source.connect(this.processor);
      this.processor.onaudioprocess = this.matrixProcessing;
      // Because onaudioprocess is depricating, Audioworklet is implemented, this will fallback if above is failed.
    }
    this.processor.connect(this.mix);

    console.log(this.mix);
    // Assign nodes of every channel saperately
    this.mix.connect(splitter);
    splitter.connect(gainL, 0); // Assign left to gainL
    splitter.connect(gainR, 1); // Assign right to gainR
    splitter.connect(gainC, 2); // Assign Center to gainC
    splitter.connect(gainSW, 3); // Assign Sub Woofer to gainSW
    splitter.connect(gainSL, 4); // Assign Surround Left to gainSL
    splitter.connect(gainSR, 5); // Assign Surround Right to gainSR

    // set gain for channels
    gainL.gain.value = 1;
    gainR.gain.value = 1;
    gainC.gain.value = 1;
    gainSW.gain.value = 1;
    gainSL.gain.value = 1;
    gainSR.gain.value = 1;

    // Connect delay to surround channels
    gainSL.connect(delaySL);
    gainSR.connect(delaySR);

    // Set some delay to surround channels
    const delay = 50 / 1000;
    delaySL.delayTime.value = delay;
    delaySR.delayTime.value = delay;


    gainSW.connect(filterLowPassSW);

    gainL.connect(filterHighPassL);
    gainR.connect(filterHighPassR);
    gainC.connect(filterHighPassC);
    delaySL.connect(filterHighPassSL);
    delaySR.connect(filterHighPassSR);

    // Filters
    const lowPassFreq = 60; // Hz
    const HighPassFreq = 300; // Hz
    filterLowPassSW.type = 'lowpass'; // For subwoofer
    filterLowPassSW.frequency.value = lowPassFreq;

    filterHighPassL.type = 'highpass';
    filterHighPassL.frequency.value = HighPassFreq;
    filterHighPassR.type = 'highpass';
    filterHighPassR.frequency.value = HighPassFreq;
    filterHighPassC.type = 'highpass';
    filterHighPassC.frequency.value = HighPassFreq;
    filterHighPassSL.type = 'highpass';
    filterHighPassSL.frequency.value = HighPassFreq;
    filterHighPassSR.type = 'highpass';
    filterHighPassSR.frequency.value = HighPassFreq;
    // Filters ends

    filterHighPassL.connect(merger, 0, 0); // Left
    filterHighPassR.connect(merger, 0, 1); // Right
    filterHighPassC.connect(merger, 0, 2); // Center
    filterLowPassSW.connect(merger, 0, 3); // Sub Woofer
    filterHighPassSL.connect(merger, 0, 4); // Surround Left
    filterHighPassSR.connect(merger, 0, 5); // Surround Right


    merger.connect(this.context.destination);


    // playback the sound
    this.source.start(0);
  }


  matrixProcessing(evt: AudioProcessingEvent) {
    const inputL = evt.inputBuffer.getChannelData(0);
    const inputR = evt.inputBuffer.getChannelData(1);

    const outputL = evt.outputBuffer.getChannelData(0);
    const outputR = evt.outputBuffer.getChannelData(1);
    const outputC = evt.outputBuffer.getChannelData(2);
    const outputSW = evt.outputBuffer.getChannelData(3);

    const outputSL = evt.outputBuffer.getChannelData(4);
    const outputSR = evt.outputBuffer.getChannelData(5);
    const len = inputL.length;


    console.log(evt.outputBuffer.numberOfChannels);
    for (let i = 0; i < len; i++) {

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


  disconnect() {
    this.source.stop(0);
    this.source.disconnect(0);
    this.processor.disconnect(0);
    this.mix.disconnect(0);

    console.log('Disconnected!');
  }
}
