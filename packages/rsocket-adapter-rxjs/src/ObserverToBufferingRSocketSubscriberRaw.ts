/*
 * Copyright 2021-2022 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
"use strict";
import {
  Cancellable,
  OnExtensionSubscriber,
  OnNextSubscriber,
  OnTerminalSubscriber,
  Payload,
  Requestable,
} from "rsocket-core";
import { Codec } from "rsocket-messaging";
import { Observer, Subscription } from "rxjs";
import { applyMixins } from "./Utils.js";

interface ObserverToBufferingRSocketSubscriberRaw
  extends Subscription,
    Array<Payload>,
    Observer<Payload>,
    Cancellable,
    Requestable,
    OnExtensionSubscriber {}
class ObserverToBufferingRSocketSubscriberRaw
  extends Subscription
  implements Observer<Payload>, Cancellable, Requestable, OnExtensionSubscriber
{
  protected requested: number;
  protected subscriber: OnTerminalSubscriber &
    OnNextSubscriber &
    OnExtensionSubscriber;
  protected wip: number;
  private e: Error;
  private done: boolean;

  constructor(
    requested: number,
    subscriber: OnTerminalSubscriber & OnNextSubscriber & OnExtensionSubscriber
  ) {
    super();
    this.init(requested, subscriber);
  }

  protected init(
    requested: number,
    subscriber: OnTerminalSubscriber & OnNextSubscriber & OnExtensionSubscriber
  ) {
    this.requested = requested;
    this.subscriber = subscriber;
    this.wip = 0;
  }

  request(n: number) {
    const requested = this.requested;
    this.requested = requested + n;

    if (this.wip == 0 && requested > 0) {
      return;
    }

    this.drain();
  }

  cancel(): void {
    if (this.closed || this.done) {
      return;
    }

    this.unsubscribe();

    this.drain();
  }

  onExtension(
    extendedType: number,
    content: Buffer,
    canBeIgnored: boolean
  ): void {}

  next(value: Payload) {
    this.push(value);

    this.drain();
  }

  error(err: any) {
    if (this.closed || this.done) {
      return;
    }

    this.e = err;
    this.done = true;

    this.drain();
  }

  complete() {
    if (this.done || this.closed) {
      return;
    }

    this.done = true;

    this.drain();
  }

  private drain() {
    let m = this.wip;
    this.wip = m + 1;
    if (m) {
      return;
    }

    m = 1;

    for (;;) {
      let requested = this.requested;
      let delivered = 0;
      while (delivered < requested) {
        const next = this.shift();

        if (next == undefined) {
          if (this.done) {
            if (this.e) {
              this.subscriber.onError(this.e);
            } else {
              this.subscriber.onComplete();
            }
            return;
          }

          if (this.closed) {
            return;
          }

          break;
        }

        const isTerminated = this.length == 0 && this.done;
        this.subscriber.onNext(next, isTerminated);

        if (isTerminated) {
          return;
        }

        delivered++;
      }

      this.requested -= delivered;
      if (m === this.wip) {
        this.wip = 0;
        return;
      }

      m = this.wip;
    }
  }
}

applyMixins(ObserverToBufferingRSocketSubscriberRaw, [Array]);

export default ObserverToBufferingRSocketSubscriberRaw;
