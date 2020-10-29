import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { AudioService } from './shared/audio.service';
import { interval, Subscription } from 'rxjs';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { HelperService } from './shared/helper.service';
import { LocalStorage } from '@ngx-pwa/local-storage';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {

  constructor(
    private audio: AudioService,
    private ref: ChangeDetectorRef,
    private helper: HelperService,
    private localStorage: LocalStorage) { }

  private subscriptions: Subscription = new Subscription();

  title = 'advancedaudioplayer';
  audioworkletRunning = 'NA';
  channelCount = 0;
  songDuration = '0';

  maxDurationInSec = 0;
  currentSeek = 0;
  currentSeekMS = '0';

  sliderMouseDown = false;

  url = 'https://raw.githubusercontent.com/mdn/webaudio-examples/master/multi-track/drums.mp3';
  fileName: string;
  // url = '../assets/audio/audio6.mp3';
  seekSubscription: Subscription;

  // Volume controller
  masterGain = 100;
  frontGain = 100;
  surroundGain = 100;
  centerGain = 100;
  subwooferGain = 100;

  // Delay variables
  frontDelay = 0;
  centerDelay = 0;
  surroundDelay = 50;
  subWooferDelay = 0;

  // Filters variables
  lowPassFreq = 60;
  lowPassQ = 1;
  lpfSlopeLevel = '0';

  highPassFreq = 300; // Hz
  highPassQ = 0;

  highShelfFreq = 12000; // Hz
  highShelfGain = 10; // Hz

  // Matrix variables // inputMatrixOutput
  lMatrixL = 1;
  lMatrixR = 0;
  rMatrixL = 0;
  rMatrixR = 1;

  lMatrixC = 0.5;
  rMatrixC = 0.5;

  lMatrixSW = 0.5;
  rMatrixSW = 0.5;

  lMatrixSL = 1;
  lMatrixSR = -1;
  rMatrixSL = -1;
  rMatrixSR = 1;

  ngOnInit() {
    this.getSettings(); // Get values from localStorage
    this.subscriptions.add(
      this.audio.audioworkletRunning.subscribe(d => {
        if (d) {
          this.audioworkletRunning = 'Yes';
        } else {
          this.audioworkletRunning = 'No';
        }
        this.ref.detectChanges();
      })
    );

    this.subscriptions.add(
      this.audio.channelCount.subscribe(n => this.channelCount = n)
    );

    this.subscriptions.add(
      this.audio.songDuration
        .subscribe(secs => {
          // this.seekSubscription.closed = false;
          if (!this.seekSubscription || this.seekSubscription.closed) {
            this.startTimer();
          }

          this.songDuration = this.helper.convertPlaybackTime(secs);
          this.maxDurationInSec = secs;


        })
    );

  }

  playFile(event: FileList) {
    // The File object
    const file = event.item(0);
    this.fileName = file.name;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e: any) => {
      this.url = e.target.result;
    };
  }

  playLocal() {
    // this.audio.playSound('../assets/audio/audio8.mp3');
    this.audio.playSound(this.url, 0);
  }

  disconnect() {
    this.audio.disconnect();
    if (this.seekSubscription) {
      // console.log('Never reached');
      this.seekSubscription.unsubscribe();
    }
    this.maxDurationInSec = 1;
    this.currentSeek = 0;

    this.subscriptions.unsubscribe();
  }

  slideToggle(event: MatSlideToggleChange) {
    this.audio.useWorklet = event.checked;
    if (this.seekSubscription) {
      this.audio.disconnect();
      const position = this.currentSeek / this.maxDurationInSec;
      this.audio.playSound(this.url, position);
    }
  }

  startTimer() {
    const source = interval(125);
    this.subscriptions.add(
      this.seekSubscription = source.subscribe(ts => {
        if (this.currentSeek > this.maxDurationInSec) {
          this.currentSeek = this.maxDurationInSec;
          this.currentSeekMS = this.helper.convertPlaybackTime(this.currentSeek);
          this.disconnect();
        }
        if (!this.sliderMouseDown) {
          this.currentSeek += 0.125;
          this.currentSeekMS = this.helper.convertPlaybackTime(this.currentSeek);
        }

        this.ref.detectChanges();
      }));

  }

  resetSeek() {
    if (this.currentSeek < this.maxDurationInSec) {
      if (!this.seekSubscription) {
        this.startTimer();
      }
    }
    this.audio.disconnect();
    const position = this.currentSeek / this.maxDurationInSec;
    this.audio.playSound(this.url, position);
  }

  updateDelay() {
    this.storeSettings();
    console.log('Update delay');
    this.audio.frontDelay = this.frontDelay / 1000;
    this.audio.centerDelay = this.centerDelay / 1000;
    this.audio.subWooferDelay = this.subWooferDelay / 1000;
    this.audio.surroundDelay = this.surroundDelay / 1000;
    this.audio.updateDelay();
  }

  updateHighPassFilter() {
    this.storeSettings();
    console.log('Update highpass filter');
    this.audio.lpfSlopeLevel = +this.lpfSlopeLevel;
    this.audio.lowPassFreq = this.lowPassFreq;
    this.audio.highPassFreq = this.highPassFreq;
    this.audio.lowPassQ = this.lowPassQ;
    this.audio.highPassQ = this.highPassQ;
    this.audio.updateHighPassFilter();
  }

  updateHighShelfFilter() {
    this.storeSettings();
    console.log('Update highshelf filter');
    this.audio.highShelfFreq = this.highShelfFreq;
    this.audio.highShelfGain = this.highShelfGain;
    this.audio.updateHighShelfFilter();
  }

  updateGain() {
    this.storeSettings();
    console.log('Update volume');
    this.audio.masterGain = this.masterGain;
    this.audio.frontGain = this.frontGain;
    this.audio.centerGain = this.centerGain;
    this.audio.subwooferGain = this.subwooferGain;
    this.audio.surroundGain = this.surroundGain;
    this.audio.updateGain();
  }



  storeSettings() {
    const digitalAudio = {
      masterGain: this.masterGain,
      frontGain: this.frontGain,
      surroundGain: this.surroundGain,
      centerGain: this.centerGain,
      subwooferGain: this.subwooferGain,
      frontDelay: this.frontDelay,
      centerDelay: this.centerDelay,
      surroundDelay: this.surroundDelay,
      subWooferDelay: this.subWooferDelay,
      lowPassFreq: this.lowPassFreq,
      lowPassQ: this.lowPassQ,
      highPassFreq: this.highPassFreq,
      highPassQ: this.highPassQ,
      highShelfFreq: this.highShelfFreq,
      highShelfGain: this.highShelfGain,

      lMatrixL: this.lMatrixL,
      lMatrixR: this.lMatrixR,
      lMatrixC: this.lMatrixC,
      lMatrixSW: this.lMatrixSW,
      lMatrixSL: this.lMatrixSL,
      lMatrixSR: this.lMatrixSR,

      rMatrixL: this.rMatrixL,
      rMatrixR: this.rMatrixR,
      rMatrixC: this.rMatrixC,
      rMatrixSW: this.rMatrixSW,
      rMatrixSL: this.rMatrixSL,
      rMatrixSR: this.rMatrixSR
    };
    this.subscriptions.add(
      this.localStorage.setItem('digitalAudio', digitalAudio).subscribe()
    );
  }

  getSettings() {
    this.subscriptions.add(
      this.localStorage.getItem('digitalAudio').subscribe((digitalAudio: any) => {
        if (digitalAudio) {
          this.masterGain = digitalAudio.masterGain;
          this.frontGain = digitalAudio.frontGain;
          this.surroundGain = digitalAudio.surroundGain;
          this.centerGain = digitalAudio.centerGain;
          this.subwooferGain = digitalAudio.subwooferGain;
          this.frontDelay = digitalAudio.frontDelay;
          this.centerDelay = digitalAudio.centerDelay;
          this.surroundDelay = digitalAudio.surroundDelay;
          this.subWooferDelay = digitalAudio.subWooferDelay;
          this.lowPassFreq = digitalAudio.lowPassFreq;
          this.lowPassQ = digitalAudio.lowPassQ;
          this.highPassFreq = digitalAudio.highPassFreq;
          this.highPassQ = digitalAudio.highPassQ;
          this.highShelfFreq = digitalAudio.highShelfFreq;
          this.highShelfGain = digitalAudio.highShelfGain;

          this.lMatrixL = digitalAudio.lMatrixL;
          this.lMatrixR = digitalAudio.lMatrixR;
          this.lMatrixC = digitalAudio.lMatrixC;
          this.lMatrixSW = digitalAudio.lMatrixSW;
          this.lMatrixSL = digitalAudio.lMatrixSL;
          this.lMatrixSR = digitalAudio.lMatrixSR;

          this.rMatrixL = digitalAudio.rMatrixL;
          this.rMatrixR = digitalAudio.rMatrixR;
          this.rMatrixC = digitalAudio.rMatrixC;
          this.rMatrixSW = digitalAudio.rMatrixSW;
          this.rMatrixSL = digitalAudio.rMatrixSL;
          this.rMatrixSR = digitalAudio.rMatrixSR;

          // Update audio service variables
          this.audio.frontDelay = this.frontDelay / 1000;
          this.audio.centerDelay = this.centerDelay / 1000;
          this.audio.subWooferDelay = this.subWooferDelay / 1000;
          this.audio.surroundDelay = this.surroundDelay / 1000;

          this.audio.lowPassFreq = this.lowPassFreq;
          this.audio.highPassFreq = this.highPassFreq;
          this.audio.lowPassQ = this.lowPassQ;
          this.audio.highPassQ = this.highPassQ;

          this.audio.highShelfFreq = this.highShelfFreq;
          this.audio.highShelfGain = this.highShelfGain;

          this.audio.masterGain = this.masterGain;
          this.audio.frontGain = this.frontGain;
          this.audio.centerGain = this.centerGain;
          this.audio.subwooferGain = this.subwooferGain;
          this.audio.surroundGain = this.surroundGain;

          this.audio.lMatrixL = this.lMatrixL;
          this.audio.lMatrixR = this.lMatrixR;
          this.audio.lMatrixC = this.lMatrixC;
          this.audio.lMatrixSW = this.lMatrixSW;
          this.audio.lMatrixSL = this.lMatrixSL;
          this.audio.lMatrixSR = this.lMatrixSR;

          this.audio.rMatrixL = this.rMatrixL;
          this.audio.rMatrixR = this.rMatrixR;
          this.audio.rMatrixC = this.rMatrixC;
          this.audio.rMatrixSW = this.rMatrixSW;
          this.audio.rMatrixSL = this.rMatrixSL;
          this.audio.rMatrixSR = this.rMatrixSR;
        }
      })
    );
  }

  updateMatrix() {
    this.storeSettings();
    console.log('Update matrix');
    this.audio.lMatrixL = this.lMatrixL;
    this.audio.lMatrixR = this.lMatrixR;
    this.audio.lMatrixC = this.lMatrixC;
    this.audio.lMatrixSW = this.lMatrixSW;
    this.audio.lMatrixSL = this.lMatrixSL;
    this.audio.lMatrixSR = this.lMatrixSR;

    this.audio.rMatrixL = this.rMatrixL;
    this.audio.rMatrixR = this.rMatrixR;
    this.audio.rMatrixC = this.rMatrixC;
    this.audio.rMatrixSW = this.rMatrixSW;
    this.audio.rMatrixSL = this.rMatrixSL;
    this.audio.rMatrixSR = this.rMatrixSR;
  }

  resetSettings() {
    this.subscriptions.add(
      this.localStorage.clear().subscribe()
    );
    window.location.reload();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }
}
