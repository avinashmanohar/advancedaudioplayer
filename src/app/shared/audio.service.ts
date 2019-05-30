import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { HelperService } from './helper.service';


@Injectable({
  providedIn: 'root'
})
export class AudioService {

  constructor(private http: HttpClient, private helper: HelperService) {
    this.audioworkletRunning = new Subject<boolean>();
    this.songDuration = new Subject<number>();
  }
  public context: AudioContext;

  private source: AudioBufferSourceNode;
  private processor: ScriptProcessorNode | AudioWorkletNode;
  private allGain: GainNode;

  private delayL: DelayNode;
  private delayR: DelayNode;
  private delayC: DelayNode;
  private delaySW: DelayNode;
  private delaySR: DelayNode;
  private delaySL: DelayNode;

  private filterHighPassL: BiquadFilterNode;
  private filterHighPassR: BiquadFilterNode;
  private filterHighPassC: BiquadFilterNode;
  private filterHighPassSL: BiquadFilterNode;
  private filterHighPassSR: BiquadFilterNode;
  private filterLowPassSW: BiquadFilterNode;

  public audioworkletRunning: Subject<boolean>;
  public songDuration: Subject<number>;

  public useWorklet = true;

  // Delay variables
  public frontDelay = 10 / 1000;
  public surroundDelay = 50 / 1000;
  public subWooferDelay = 0 / 1000;
  public centerDelay = 0 / 1000;

  // Filger variables
  public highPassFreq = 300;
  public lowPassFreq = 60;

  playSound(url: string, position: number) {
    // const request = new XMLHttpRequest();
    // request.open('GET', url, true);
    // request.responseType = 'arraybuffer';

    // // Our asynchronous callback
    // request.onload = () => {
    //   const data = request.response;
    //   this.processAudio(data);
    //   // showData(data);
    // };

    // request.send();

    this.http.get(url, {
      responseType: 'arraybuffer'
    }).subscribe(data => this.processAudio(data, position));
  }

  processAudio(data: any, position: number) {
    if (this.source) {
      this.source.stop(0);
    }

    try {
      this.context = new AudioContext({ latencyHint: 'playback' });
    } catch (e) {
      console.log('No audio');
    }

    // console.log(this.context.baseLatency); // 0.01

    // console.log(this.context.destination.maxChannelCount);
    // console.log(this.context.currentTime);
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
        this.createAudio(position);
      }, e => {
        console.error(e);
      });
    } else {
      this.source.buffer = this.context.createBuffer(
        this.context.destination.channelCount,
        this.context.sampleRate * 3,
        this.context.sampleRate); // Create an empty three-second *stereo (5.1) buffer at the sample rate of the AudioContext
      this.createAudio(position);
    }
  }

  async createAudio(position: number) {
    // create the gain node

    // Visual controls
    this.songDuration.next(this.source.buffer.duration);
    // console.log(this.helper.convertPlaybackTime(this.source.buffer.duration));
    // console.log(this.context.currentTime);
    // Visual controls ends

    this.allGain = this.context.createGain();
    this.allGain.gain.value = 1; // set to max vol;



    // Required stuff start
    const splitter = this.context.createChannelSplitter(6);
    const merger = this.context.createChannelMerger(6);
    const gainL = this.context.createGain();
    const gainR = this.context.createGain();
    const gainC = this.context.createGain();
    const gainSW = this.context.createGain();
    const gainSL = this.context.createGain();
    const gainSR = this.context.createGain();

    this.delayL = this.context.createDelay();
    this.delayR = this.context.createDelay();
    this.delayC = this.context.createDelay();
    this.delaySW = this.context.createDelay();
    this.delaySL = this.context.createDelay();
    this.delaySR = this.context.createDelay();

    this.filterHighPassL = this.context.createBiquadFilter();
    this.filterHighPassR = this.context.createBiquadFilter();
    this.filterHighPassC = this.context.createBiquadFilter();
    this.filterHighPassSL = this.context.createBiquadFilter();
    this.filterHighPassSR = this.context.createBiquadFilter();

    this.filterLowPassSW = this.context.createBiquadFilter();
    // Required stuff start ends

    // start connecting
    if (this.context.audioWorklet && typeof this.context.audioWorklet.addModule === 'function' && this.useWorklet) {
      console.log('Audioworklet support detected, don\'t use the old scriptprocessor...');
      this.audioworkletRunning.next(true);
      /* // Old way
      await this.context.audioWorklet.addModule('../assets/bypass-processor.js').then(() => {
        this.processor = new AudioWorkletNode(this.context, 'bypass-processor', {
          // you have to specify the channel count for each input, so by default only 1 is needed
          outputChannelCount: [6]
        });
        this.source.connect(this.processor);
      });
      */
      await this.context.audioWorklet.addModule('../assets/bypass-processor.js'); // This is possible because we are using await.
      this.processor = new AudioWorkletNode(this.context, 'bypass-processor', {
        // you have to specify the channel count for each input, so by default only 1 is needed
        outputChannelCount: [6]
      });
      this.source.connect(this.processor);
    } else {
      console.log('Audioworklet not support detected, using old scriptprocessor...');
      this.audioworkletRunning.next(false);
      // Create a ScriptProcessorNode with a bufferSize of 0 (Dynamic - system will auto fix buffer) and a single input and output channel
      // create the processor
      this.processor = this.context.createScriptProcessor(0 /*bufferSize*/, 2 /*num inputs*/, 6 /*num outputs*/);
      this.source.connect(this.processor);
      this.processor.onaudioprocess = this.matrixProcessing;
      // Because onaudioprocess is depricating, Audioworklet is implemented, this will fallback if above is failed.
    }
    this.processor.connect(this.allGain);

    // console.log(this.mix);
    // Assign nodes of every channel saperately
    this.allGain.connect(splitter);
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

    // Connect delay to channels
    gainL.connect(this.delayL);
    gainR.connect(this.delayR);
    gainC.connect(this.delayC);
    gainSW.connect(this.delaySW);
    gainSL.connect(this.delaySL);
    gainSR.connect(this.delaySR);

    // Set some delay to surround channels
    this.updateDelay();


    this.delaySW.connect(this.filterLowPassSW);

    this.delayL.connect(this.filterHighPassL);
    this.delayR.connect(this.filterHighPassR);
    this.delayC.connect(this.filterHighPassC);
    this.delaySL.connect(this.filterHighPassSL);
    this.delaySR.connect(this.filterHighPassSR);

    // Filters
    this.updateFilter();
    // Filters ends

    this.filterHighPassL.connect(merger, 0, 0); // Left
    this.filterHighPassR.connect(merger, 0, 1); // Right
    this.filterHighPassC.connect(merger, 0, 2); // Center
    this.filterLowPassSW.connect(merger, 0, 3); // Sub Woofer
    this.filterHighPassSL.connect(merger, 0, 4); // Surround Left
    this.filterHighPassSR.connect(merger, 0, 5); // Surround Right

    merger.connect(this.context.destination);

    // playback the sound
    this.source.start(0, this.source.buffer.duration * position + this.context.currentTime);
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
    if (this.source) {
      this.source.disconnect(0);
      this.source.stop(0);
      this.source.disconnect(0);
      this.processor.disconnect(0);
      this.allGain.disconnect(0);
    }

    console.log('Disconnected!');
  }

  updateDelay() {
    // Set some delay to surround channels
    this.delayC.delayTime.value = this.centerDelay;
    this.delaySW.delayTime.value = this.subWooferDelay;
    this.delayL.delayTime.value = this.frontDelay;
    this.delayR.delayTime.value = 0; // testing
    this.delaySL.delayTime.value = this.surroundDelay;
    this.delaySR.delayTime.value = this.surroundDelay;
  }

  updateFilter() {
    // Set some delay to surround channels
    this.filterLowPassSW.type = 'lowpass'; // For subwoofer
    this.filterLowPassSW.frequency.value = this.lowPassFreq;

    this.filterHighPassL.type = 'highpass';
    this.filterHighPassL.frequency.value = this.highPassFreq; // Hz;
    this.filterHighPassR.type = 'highpass';
    this.filterHighPassR.frequency.value = this.highPassFreq; // Hz;
    this.filterHighPassC.type = 'highpass';
    this.filterHighPassC.frequency.value = this.highPassFreq; // Hz;
    this.filterHighPassSL.type = 'highpass';
    this.filterHighPassSL.frequency.value = this.highPassFreq; // Hz;
    this.filterHighPassSR.type = 'highpass';
    this.filterHighPassSR.frequency.value = this.highPassFreq; // Hz;
  }

}
