import { Component } from '@angular/core';
import { AudioService } from './shared/audio.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'advancedaudioplayer';

  constructor(private audio: AudioService) { }

  playLocal() {
    this.audio.playSound('../assets/kannadaaudio.mp3');
  }
}
