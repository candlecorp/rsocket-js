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
import {
  asyncScheduler,
  Observable,
  Observer,
  SchedulerLike,
  Subscriber,
  TeardownLogic,
  Unsubscribable,
} from "rxjs";
import ObserverToBufferingRSocketSubscriberRaw from "./ObserverToBufferingRSocketSubscriberRaw.js";
import RSocketPublisherToPrefetchingObservableRaw from "./RSocketPublisherToPrefetchingObservableRaw.js";
import { applyMixins } from "./Utils.js";

interface Observer2BufferingSubscriberToPublisher2PrefetchingObservableRaw
  extends ObserverToBufferingRSocketSubscriberRaw,
    RSocketPublisherToPrefetchingObservableRaw<
      OnNextSubscriber &
        OnTerminalSubscriber &
        OnExtensionSubscriber &
        Requestable &
        Cancellable
    > {
  subscriber: OnNextSubscriber &
    OnTerminalSubscriber &
    OnExtensionSubscriber &
    Requestable &
    Cancellable;
  forEach(next: any): any;
}

class Observer2BufferingSubscriberToPublisher2PrefetchingObservableRaw
  extends RSocketPublisherToPrefetchingObservableRaw<
    OnNextSubscriber &
      OnTerminalSubscriber &
      OnExtensionSubscriber &
      Requestable &
      Cancellable
  >
  implements
    Observer<Payload>,
    Unsubscribable,
    OnNextSubscriber,
    OnTerminalSubscriber,
    OnExtensionSubscriber,
    Requestable,
    Cancellable
{
  constructor(
    exchangeFunction: (
      s: OnNextSubscriber &
        OnTerminalSubscriber &
        OnExtensionSubscriber &
        Requestable &
        Cancellable,
      n: number
    ) => OnNextSubscriber &
      OnTerminalSubscriber &
      OnExtensionSubscriber &
      Requestable &
      Cancellable,
    prefetch: number,
    private readonly restObservable: Observable<Payload>,
    scheduler: SchedulerLike = asyncScheduler
  ) {
    super(exchangeFunction, prefetch, scheduler);
    this.init(0, undefined);
  }

  _subscribe(s: Subscriber<Payload>): TeardownLogic {
    super._subscribe(s);

    this.restObservable.subscribe(this);

    return this;
  }

  unsubscribe(): void {
    if (this.subscriber) {
      this.subscriber.cancel();
    }
    super.unsubscribe();
  }
}

applyMixins(Observer2BufferingSubscriberToPublisher2PrefetchingObservableRaw, [
  ObserverToBufferingRSocketSubscriberRaw,
]);

export default Observer2BufferingSubscriberToPublisher2PrefetchingObservableRaw;

const outputCodec: Codec<Buffer> = {
  mimeType: "application/binary",
  encode(entity: Buffer): Buffer {
    return entity;
  },
  decode(buffer: Buffer): Buffer {
    return buffer;
  },
};
