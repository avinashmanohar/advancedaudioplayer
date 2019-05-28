// Copyright (c) 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * A simple bypass node demo.
 *
 * @class BypassProcessor
 * @extends AudioWorkletProcessor
 */
class BypassProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
  }

  process(inputs, outputs) {

    let input = inputs[0];
    let output = outputs[0];

    // for (let channel = 0; channel < output.length; ++channel) {
    //   output[channel].set(input[channel]);
    // }

    // output[0].set(input[0]);
    // output[1].set(input[1]);
    // Below are invalid
    // output[2].set(input[0] * 0.5 + input[1] * 0.5);
    // output[3].set(input[0] + input[1]);
    // output[4].set(input[1] - input[0]);
    // output[5].set(input[0] - input[1]);

    for (let i = 0; i < output[0].length; ++i) { //It loops 128 times per second. (128Kbps)
      output[0][i] = input[0][i];
      output[1][i] = input[1][i];
      output[2][i] = input[0][i] * 0.5 + input[1][i] * 0.5;
      output[3][i] = input[0][i] * 0.5 + input[1][i] * 0.5;
      output[4][i] = input[1][i] - input[0][i];
      output[5][i] = input[0][i] - input[1][i];
    }

    return true;
  }
}

registerProcessor('bypass-processor', BypassProcessor);