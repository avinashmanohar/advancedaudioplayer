import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class HelperService {

  constructor() { }

  convertPlaybackTime(aPlaybackTime: number) {
    // convert | ex) playbackTime = 360.3452 |
    const minutes = Math.floor(aPlaybackTime / 60);
    const seconds = Math.floor(aPlaybackTime % 60);

    // just for layout ex) 7 >> 07
    const secondsDisp = (seconds < 10) ? '0' + seconds : seconds;

    return minutes + ':' + secondsDisp;
  }
}
