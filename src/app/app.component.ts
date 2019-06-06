import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
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
export class AppComponent implements OnInit {

  constructor(
    private audio: AudioService,
    private ref: ChangeDetectorRef,
    private helper: HelperService,
    private localStorage: LocalStorage) { }
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
  highPassFreq = 300; // Hz
  highPassQ = 1;

  highShelfFreq = 12000; // Hz
  highShelfGain = 10; // Hz

  ngOnInit() {
    this.getSettings(); // Get values from localStorage
    this.audio.audioworkletRunning.subscribe(d => {
      if (d) {
        this.audioworkletRunning = 'Yes';
      } else {
        this.audioworkletRunning = 'No';
      }
      this.ref.detectChanges();
    });

    this.audio.channelCount.subscribe(n => this.channelCount = n);

    this.audio.songDuration
      .subscribe(secs => {
        // this.seekSubscription.closed = false;
        if (!this.seekSubscription || this.seekSubscription.closed) {
          this.startTimer();
        }

        this.songDuration = this.helper.convertPlaybackTime(secs);
        this.maxDurationInSec = secs;


      });

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
    this.maxDurationInSec = 0;
    this.currentSeek = 0;
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
    });

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
    console.log('Update delay');
    this.audio.frontDelay = this.frontDelay / 1000;
    this.audio.centerDelay = this.centerDelay / 1000;
    this.audio.subWooferDelay = this.subWooferDelay / 1000;
    this.audio.surroundDelay = this.surroundDelay / 1000;
    this.audio.updateDelay();
    this.storeSettings();
  }

  updateHighPassFilter() {
    console.log('Update highpass filter');
    this.audio.lowPassFreq = this.lowPassFreq;
    this.audio.highPassFreq = this.highPassFreq;
    this.audio.lowPassQ = this.lowPassQ;
    this.audio.highPassQ = this.highPassQ;
    this.audio.updateHighPassFilter();
    this.storeSettings();
  }

  updateHighShelfFilter() {
    console.log('Update highshelf filter');
    this.audio.highShelfFreq = this.highShelfFreq;
    this.audio.highShelfGain = this.highShelfGain;
    this.audio.updateHighShelfFilter();
    this.storeSettings();
  }

  updateGain() {
    console.log('Update volume');
    this.audio.masterGain = this.masterGain;
    this.audio.frontGain = this.frontGain;
    this.audio.centerGain = this.centerGain;
    this.audio.subwooferGain = this.subwooferGain;
    this.audio.surroundGain = this.surroundGain;
    this.audio.updateGain();
    this.storeSettings();
  }



  storeSettings() {
    console.log('storing');
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
      highShelfGain: this.highShelfGain
    };
    this.localStorage.setItem('digitalAudio', digitalAudio).subscribe();
  }

  getSettings() {
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
      }
    });
  }
}
