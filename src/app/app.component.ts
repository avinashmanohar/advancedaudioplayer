import { Component, OnInit } from '@angular/core';
import { AudioService } from './shared/audio.service';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'advancedaudioplayer';
  audioworkletRunning: Subject<boolean>;

  constructor(private audio: AudioService) { }

  ngOnInit() {
    // this.audioworkletRunning = this.audio.audioworkletRunning;
  }

  playLocal() {
    this.audio.playSound('../assets/audio/audio.mp3');
  }
}
