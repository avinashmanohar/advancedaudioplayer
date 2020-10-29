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
    this.channelCount = new Subject<number>();
    this.lMatrixL = 1;
    this.lMatrixR = 0;
  }
  public context: AudioContext;

  private source: AudioBufferSourceNode;
  private processor: ScriptProcessorNode | AudioWorkletNode;
  private allGain: GainNode;

  private gainL: GainNode;
  private gainR: GainNode;
  private gainC: GainNode;
  private gainSW: GainNode;
  private gainSL: GainNode;
  private gainSR: GainNode;

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
  private filterLowPassSW0: BiquadFilterNode;
  private filterLowPassSW1: BiquadFilterNode;
  private filterLowPassSW2: BiquadFilterNode;
  private filterLowPassSW3: BiquadFilterNode;

  private filterHighShelfL: BiquadFilterNode;
  private filterHighShelfR: BiquadFilterNode;
  private filterHighShelfC: BiquadFilterNode;
  private filterHighShelfSL: BiquadFilterNode;
  private filterHighShelfSR: BiquadFilterNode;

  public audioworkletRunning: Subject<boolean>;
  public songDuration: Subject<number>;
  public channelCount: Subject<number>;

  public useWorklet = false;

  // Volume variables
  public masterGain = 100;
  public frontGain = 100;
  public surroundGain = 100;
  public centerGain = 100;
  public subwooferGain = 100;

  // Delay variables
  public frontDelay = 0 / 1000;
  public surroundDelay = 50 / 1000;
  public subWooferDelay = 0 / 1000;
  public centerDelay = 0 / 1000;

  // Filter variables
  public highPassFreq = 300;
  public highPassQ = 0;
  public lowPassFreq = 60;
  public lowPassQ = 1;
  public highShelfFreq = 12000;
  public highShelfGain = 10;
  public lpfSlopeLevel = 0;

  // Matrix variables // inputMatrixOutput
  public lMatrixL = 1;
  public lMatrixR = 0;
  public rMatrixL = 0;
  public rMatrixR = 1;

  public lMatrixC = 0.5;
  public rMatrixC = 0.5;

  public lMatrixSW = 0.5;
  public rMatrixSW = 0.5;

  public lMatrixSL = 1;
  public lMatrixSR = -1;
  public rMatrixSL = -1;
  public rMatrixSR = 1;

  playSound(url: string, position: number) {
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

    if (this.context.destination.maxChannelCount >= 6) {
      this.context.destination.channelCount = 6;
    } else {
      this.context.destination.channelCount = 2;
    }

    this.channelCount.next(this.context.destination.channelCount);

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
    // this.allGain.gain.value = 1; // set to max vol; Taken care in updateGain function



    // Required stuff start
    const splitter = this.context.createChannelSplitter(6);
    const merger = this.context.createChannelMerger(6);
    this.gainL = this.context.createGain();
    this.gainR = this.context.createGain();
    this.gainC = this.context.createGain();
    this.gainSW = this.context.createGain();
    this.gainSL = this.context.createGain();
    this.gainSR = this.context.createGain();

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

    this.filterHighShelfL = this.context.createBiquadFilter();
    this.filterHighShelfR = this.context.createBiquadFilter();
    this.filterHighShelfC = this.context.createBiquadFilter();
    this.filterHighShelfSL = this.context.createBiquadFilter();
    this.filterHighShelfSR = this.context.createBiquadFilter();

    this.filterLowPassSW0 = this.context.createBiquadFilter();
    this.filterLowPassSW1 = this.context.createBiquadFilter();
    this.filterLowPassSW2 = this.context.createBiquadFilter();
    this.filterLowPassSW3 = this.context.createBiquadFilter();
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
      // this.processor.onaudioprocess = this.matrixProcessing; // Because this.matrix variables were not accessable
      this.processor.onaudioprocess = evt => {
        const inputL = evt.inputBuffer.getChannelData(0);
        const inputR = evt.inputBuffer.getChannelData(1);

        const outputL = evt.outputBuffer.getChannelData(0);
        const outputR = evt.outputBuffer.getChannelData(1);
        const outputC = evt.outputBuffer.getChannelData(2);
        const outputSW = evt.outputBuffer.getChannelData(3);

        const outputSL = evt.outputBuffer.getChannelData(4);
        const outputSR = evt.outputBuffer.getChannelData(5);
        const len = inputL.length;
        console.log(this.lMatrixL);
        for (let i = 0; i < len; i++) {
          outputL[i] = inputL[i] * this.lMatrixL + inputR[i] * this.rMatrixL;
          outputR[i] = inputL[i] * this.lMatrixR + inputR[i] * this.rMatrixR;
          outputC[i] = inputL[i] * this.lMatrixC + inputR[i] * this.rMatrixC;
          outputSW[i] = inputL[i] * this.lMatrixSW + inputR[i] * this.rMatrixSW;
          outputSL[i] = inputL[i] * this.lMatrixSL + inputR[i] * this.rMatrixSL; // 1 + -1 = 1 - 1
          outputSR[i] = inputL[i] * this.lMatrixSR + inputR[i] * this.rMatrixSR;

          /*
          outputL[i] = inputL[i];
          outputR[i] = inputR[i];
          outputC[i] = inputL[i] * 0.5 + inputR[i] * 0.5;
          outputSW[i] = inputL[i] * 0.5 + inputR[i] * 0.5;
          outputSL[i] = inputL[i] - inputR[i];
          outputSR[i] = inputR[i] - inputL[i];
          */


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
      };
      // Because onaudioprocess is depricating, Audioworklet is implemented, this will fallback if above is failed.
    }
    this.processor.connect(this.allGain);

    // console.log(this.mix);
    // Assign nodes of every channel saperately
    this.allGain.connect(splitter);
    splitter.connect(this.gainL, 0); // Assign left to gainL
    splitter.connect(this.gainR, 1); // Assign right to gainR
    splitter.connect(this.gainC, 2); // Assign Center to gainC
    splitter.connect(this.gainSW, 3); // Assign Sub Woofer to gainSW
    splitter.connect(this.gainSL, 4); // Assign Surround Left to gainSL
    splitter.connect(this.gainSR, 5); // Assign Surround Right to gainSR

    // set gain for channels
    this.updateGain();

    // Connect delay to channels
    this.gainL.connect(this.delayL);
    this.gainR.connect(this.delayR);
    this.gainC.connect(this.delayC);
    this.gainSW.connect(this.delaySW);
    this.gainSL.connect(this.delaySL);
    this.gainSR.connect(this.delaySR);

    // Set some delay to surround channels
    this.updateDelay();


    this.delaySW.connect(this.filterLowPassSW0);
    this.filterLowPassSW0.connect(this.filterLowPassSW1); // Additional slope
    this.filterLowPassSW1.connect(this.filterLowPassSW2); // Additional slope
    this.filterLowPassSW2.connect(this.filterLowPassSW3); // Additional slope

    this.delayL.connect(this.filterHighShelfL);
    this.delayR.connect(this.filterHighShelfR);
    this.delayC.connect(this.filterHighShelfC);
    this.delaySL.connect(this.filterHighShelfSL);
    this.delaySR.connect(this.filterHighShelfSR);

    // Filters
    this.updateHighShelfFilter();
    // Filters ends

    this.filterHighShelfL.connect(this.filterHighPassL);
    this.filterHighShelfR.connect(this.filterHighPassR);
    this.filterHighShelfC.connect(this.filterHighPassC);
    this.filterHighShelfSL.connect(this.filterHighPassSL);
    this.filterHighShelfSR.connect(this.filterHighPassSR);

    // Filters
    this.updateHighPassFilter();
    // Filters ends

    this.filterHighPassL.connect(merger, 0, 0); // Left
    this.filterHighPassR.connect(merger, 0, 1); // Right
    this.filterHighPassC.connect(merger, 0, 2); // Center
    this['filterLowPassSW' + this.lpfSlopeLevel].connect(merger, 0, 3); // Sub Woofer
    this.filterHighPassSL.connect(merger, 0, 4); // Surround Left
    this.filterHighPassSR.connect(merger, 0, 5); // Surround Right

    /* 
        this.filterHighPassL.connect(merger, 0, 0); // Left
        this.filterHighPassR.connect(merger, 0, 1); // Right
        this.filterHighPassC.connect(merger, 0, 2); // Center
        this['filterLowPassSW' + this.lpfSlopeLevel].connect(merger, 0, 0); // Sub Woofer
        this['filterLowPassSW' + this.lpfSlopeLevel].connect(merger, 0, 1); // Sub Woofer
        this.filterHighPassSL.connect(merger, 0, 4); // Surround Left
        this.filterHighPassSR.connect(merger, 0, 5); // Surround Right
     */
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

    for (let i = 0; i < len; i++) {
      outputL[i] = inputL[i] * this.lMatrixL + inputR[i] * this.rMatrixL;
      outputR[i] = inputL[i] * this.lMatrixR + inputR[i] * this.rMatrixR;
      outputC[i] = inputL[i] * this.lMatrixC + inputR[i] * this.rMatrixC;
      outputSW[i] = inputL[i] * this.lMatrixSW + inputR[i] * this.rMatrixSW;
      outputSL[i] = inputL[i] * this.lMatrixSL + inputR[i] * this.rMatrixSL; // 1 + -1 = 1 - 1
      outputSR[i] = inputL[i] * this.lMatrixSR + inputR[i] * this.rMatrixSR;


      /*
      outputL[i] = inputL[i];
      outputR[i] = inputR[i];
      outputC[i] = inputL[i] * 0.5 + inputR[i] * 0.5;
      outputSW[i] = inputL[i] * 0.5 + inputR[i] * 0.5;
      outputSL[i] = inputL[i] - inputR[i];
      outputSR[i] = inputR[i] - inputL[i];
      */

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
    this.delayR.delayTime.value = this.frontDelay; // 0; // testing
    this.delaySL.delayTime.value = this.surroundDelay;
    this.delaySR.delayTime.value = this.surroundDelay;
  }

  updateHighPassFilter() {
    // Set some delay to surround channels
    this.filterLowPassSW0.type = 'lowpass'; // For subwoofer
    this.filterLowPassSW0.frequency.value = this.lowPassFreq; // 12dB/octave slope
    this.filterLowPassSW0.Q.value = this.lowPassQ;
    this.filterLowPassSW1.type = 'lowpass'; // For subwoofer
    this.filterLowPassSW1.frequency.value = this.lowPassFreq; // 24dB/octave slope
    // this.filterLowPassSW1.Q.value = this.lowPassQ;
    this.filterLowPassSW2.type = 'lowpass'; // For subwoofer
    this.filterLowPassSW2.frequency.value = this.lowPassFreq; // 36dB/octave slope
    // this.filterLowPassSW2.Q.value = this.lowPassQ;
    this.filterLowPassSW3.type = 'lowpass'; // For subwoofer
    this.filterLowPassSW3.frequency.value = this.lowPassFreq; // 48dB/octave slope
    // this.filterLowPassSW3.Q.value = this.lowPassQ;

    this.filterHighPassL.type = 'highpass';
    this.filterHighPassL.frequency.value = this.highPassFreq; // Hz;
    this.filterHighPassL.Q.value = this.highPassQ; // Hz;
    this.filterHighPassR.type = 'highpass';
    this.filterHighPassR.frequency.value = this.highPassFreq; // Hz;
    this.filterHighPassR.Q.value = this.highPassQ; // Hz;
    this.filterHighPassC.type = 'highpass';
    this.filterHighPassC.frequency.value = this.highPassFreq; // Hz;
    this.filterHighPassC.Q.value = this.highPassQ; // Hz;
    this.filterHighPassSL.type = 'highpass';
    this.filterHighPassSL.frequency.value = this.highPassFreq; // Hz;
    this.filterHighPassSL.Q.value = this.highPassQ; // Hz;
    this.filterHighPassSR.type = 'highpass';
    this.filterHighPassSR.frequency.value = this.highPassFreq; // Hz;
    this.filterHighPassSR.Q.value = this.highPassQ; // Hz;
  }

  updateHighShelfFilter() {

    this.filterHighShelfL.type = 'highshelf';
    this.filterHighShelfL.frequency.value = this.highShelfFreq; // Hz;
    this.filterHighShelfL.gain.value = this.highShelfGain;

    this.filterHighShelfR.type = 'highshelf';
    this.filterHighShelfR.frequency.value = this.highShelfFreq; // Hz;
    this.filterHighShelfR.gain.value = this.highShelfGain;

    this.filterHighShelfC.type = 'highshelf';
    this.filterHighShelfC.frequency.value = this.highShelfFreq; // Hz;
    this.filterHighShelfC.gain.value = this.highShelfGain;

    this.filterHighShelfSL.type = 'highshelf';
    this.filterHighShelfSL.frequency.value = this.highShelfFreq; // Hz;
    this.filterHighShelfSL.gain.value = this.highShelfGain;

    this.filterHighShelfSR.type = 'highshelf';
    this.filterHighShelfSR.frequency.value = this.highShelfFreq; // Hz;
    this.filterHighShelfSR.gain.value = this.highShelfGain;
  }


  updateGain() {
    this.allGain.gain.value = this.masterGain / 100;
    this.gainL.gain.value = this.frontGain / 100;
    this.gainR.gain.value = this.frontGain / 100;
    this.gainC.gain.value = this.centerGain / 100;
    this.gainSW.gain.value = this.subwooferGain / 100;
    this.gainSL.gain.value = this.surroundGain / 100;
    this.gainSR.gain.value = this.surroundGain / 100;
  }
}
