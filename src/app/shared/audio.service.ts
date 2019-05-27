import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AudioService {
  public context: AudioContext;

  private source: AudioBufferSourceNode;
  private processor: AudioProcessingEvent;
  private filterLowPass;
  private filterHighPass;
  private mix;
  private mix2;
  private processor2;

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
  }

}
