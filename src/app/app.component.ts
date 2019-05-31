import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { AudioService } from './shared/audio.service';
import { timer, interval, Subscription } from 'rxjs';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { HelperService } from './shared/helper.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {

  constructor(private audio: AudioService, private ref: ChangeDetectorRef, private helper: HelperService) { }
  title = 'advancedaudioplayer';
  audioworkletRunning = '-';
  songDuration: string;

  maxDurationInSec = 0;
  currentSeek = 0;

  sliderMouseDown = false;

  url = 'https://raw.githubusercontent.com/mdn/webaudio-examples/master/multi-track/drums.mp3';
  // url = '../assets/audio/audio6.mp3';
  seekSubscription: Subscription;

  // Delay variables
  frontDelay = 0;
  centerDelay = 0;
  surroundDelay = 50;
  subWooferDelay = 0;

  // Filters variables
  lowPassFreq = 60;
  highPassFreq = 300; // Hz

  highShelfFreq = 12000; // Hz
  highShelfGain = 20; // Hz

  ngOnInit() {
    this.audio.audioworkletRunning.subscribe(d => {
      if (d) {
        this.audioworkletRunning = 'Yes';
      } else {
        this.audioworkletRunning = 'No';
      }
      this.ref.detectChanges();
    });

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
        this.disconnect();
      }
      if (!this.sliderMouseDown) {
        this.currentSeek += 0.125;
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
  }

  updateHighPassFilter() {
    console.log('Update highpass filter');
    this.audio.lowPassFreq = this.lowPassFreq;
    this.audio.highPassFreq = this.highPassFreq;
    this.audio.updateHighPassFilter();
  }

  updateHighShelfFilter() {
    console.log('Update highshelf filter');
    this.audio.highShelfFreq = this.highShelfFreq;
    this.audio.highShelfGain = this.highShelfGain;
    this.audio.updateHighShelfFilter();
  }
}
