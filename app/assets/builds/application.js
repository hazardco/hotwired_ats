 (() => new EventSource("http://localhost:8082").onmessage = () => location.reload())();
(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __publicField = (obj, key, value) => {
    __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
    return value;
  };

  // ../../node_modules/@rails/actioncable/src/adapters.js
  var adapters_default;
  var init_adapters = __esm({
    "../../node_modules/@rails/actioncable/src/adapters.js"() {
      adapters_default = {
        logger: self.console,
        WebSocket: self.WebSocket
      };
    }
  });

  // ../../node_modules/@rails/actioncable/src/logger.js
  var logger_default;
  var init_logger = __esm({
    "../../node_modules/@rails/actioncable/src/logger.js"() {
      init_adapters();
      logger_default = {
        log(...messages) {
          if (this.enabled) {
            messages.push(Date.now());
            adapters_default.logger.log("[ActionCable]", ...messages);
          }
        }
      };
    }
  });

  // ../../node_modules/@rails/actioncable/src/connection_monitor.js
  var now, secondsSince, ConnectionMonitor, connection_monitor_default;
  var init_connection_monitor = __esm({
    "../../node_modules/@rails/actioncable/src/connection_monitor.js"() {
      init_logger();
      now = () => new Date().getTime();
      secondsSince = (time) => (now() - time) / 1e3;
      ConnectionMonitor = class {
        constructor(connection) {
          this.visibilityDidChange = this.visibilityDidChange.bind(this);
          this.connection = connection;
          this.reconnectAttempts = 0;
        }
        start() {
          if (!this.isRunning()) {
            this.startedAt = now();
            delete this.stoppedAt;
            this.startPolling();
            addEventListener("visibilitychange", this.visibilityDidChange);
            logger_default.log(`ConnectionMonitor started. stale threshold = ${this.constructor.staleThreshold} s`);
          }
        }
        stop() {
          if (this.isRunning()) {
            this.stoppedAt = now();
            this.stopPolling();
            removeEventListener("visibilitychange", this.visibilityDidChange);
            logger_default.log("ConnectionMonitor stopped");
          }
        }
        isRunning() {
          return this.startedAt && !this.stoppedAt;
        }
        recordPing() {
          this.pingedAt = now();
        }
        recordConnect() {
          this.reconnectAttempts = 0;
          this.recordPing();
          delete this.disconnectedAt;
          logger_default.log("ConnectionMonitor recorded connect");
        }
        recordDisconnect() {
          this.disconnectedAt = now();
          logger_default.log("ConnectionMonitor recorded disconnect");
        }
        startPolling() {
          this.stopPolling();
          this.poll();
        }
        stopPolling() {
          clearTimeout(this.pollTimeout);
        }
        poll() {
          this.pollTimeout = setTimeout(
            () => {
              this.reconnectIfStale();
              this.poll();
            },
            this.getPollInterval()
          );
        }
        getPollInterval() {
          const { staleThreshold, reconnectionBackoffRate } = this.constructor;
          const backoff = Math.pow(1 + reconnectionBackoffRate, Math.min(this.reconnectAttempts, 10));
          const jitterMax = this.reconnectAttempts === 0 ? 1 : reconnectionBackoffRate;
          const jitter = jitterMax * Math.random();
          return staleThreshold * 1e3 * backoff * (1 + jitter);
        }
        reconnectIfStale() {
          if (this.connectionIsStale()) {
            logger_default.log(`ConnectionMonitor detected stale connection. reconnectAttempts = ${this.reconnectAttempts}, time stale = ${secondsSince(this.refreshedAt)} s, stale threshold = ${this.constructor.staleThreshold} s`);
            this.reconnectAttempts++;
            if (this.disconnectedRecently()) {
              logger_default.log(`ConnectionMonitor skipping reopening recent disconnect. time disconnected = ${secondsSince(this.disconnectedAt)} s`);
            } else {
              logger_default.log("ConnectionMonitor reopening");
              this.connection.reopen();
            }
          }
        }
        get refreshedAt() {
          return this.pingedAt ? this.pingedAt : this.startedAt;
        }
        connectionIsStale() {
          return secondsSince(this.refreshedAt) > this.constructor.staleThreshold;
        }
        disconnectedRecently() {
          return this.disconnectedAt && secondsSince(this.disconnectedAt) < this.constructor.staleThreshold;
        }
        visibilityDidChange() {
          if (document.visibilityState === "visible") {
            setTimeout(
              () => {
                if (this.connectionIsStale() || !this.connection.isOpen()) {
                  logger_default.log(`ConnectionMonitor reopening stale connection on visibilitychange. visibilityState = ${document.visibilityState}`);
                  this.connection.reopen();
                }
              },
              200
            );
          }
        }
      };
      ConnectionMonitor.staleThreshold = 6;
      ConnectionMonitor.reconnectionBackoffRate = 0.15;
      connection_monitor_default = ConnectionMonitor;
    }
  });

  // ../../node_modules/@rails/actioncable/src/internal.js
  var internal_default;
  var init_internal = __esm({
    "../../node_modules/@rails/actioncable/src/internal.js"() {
      internal_default = {
        "message_types": {
          "welcome": "welcome",
          "disconnect": "disconnect",
          "ping": "ping",
          "confirmation": "confirm_subscription",
          "rejection": "reject_subscription"
        },
        "disconnect_reasons": {
          "unauthorized": "unauthorized",
          "invalid_request": "invalid_request",
          "server_restart": "server_restart"
        },
        "default_mount_path": "/cable",
        "protocols": [
          "actioncable-v1-json",
          "actioncable-unsupported"
        ]
      };
    }
  });

  // ../../node_modules/@rails/actioncable/src/connection.js
  var message_types, protocols, supportedProtocols, indexOf, Connection, connection_default;
  var init_connection = __esm({
    "../../node_modules/@rails/actioncable/src/connection.js"() {
      init_adapters();
      init_connection_monitor();
      init_internal();
      init_logger();
      ({ message_types, protocols } = internal_default);
      supportedProtocols = protocols.slice(0, protocols.length - 1);
      indexOf = [].indexOf;
      Connection = class {
        constructor(consumer5) {
          this.open = this.open.bind(this);
          this.consumer = consumer5;
          this.subscriptions = this.consumer.subscriptions;
          this.monitor = new connection_monitor_default(this);
          this.disconnected = true;
        }
        send(data2) {
          if (this.isOpen()) {
            this.webSocket.send(JSON.stringify(data2));
            return true;
          } else {
            return false;
          }
        }
        open() {
          if (this.isActive()) {
            logger_default.log(`Attempted to open WebSocket, but existing socket is ${this.getState()}`);
            return false;
          } else {
            logger_default.log(`Opening WebSocket, current state is ${this.getState()}, subprotocols: ${protocols}`);
            if (this.webSocket) {
              this.uninstallEventHandlers();
            }
            this.webSocket = new adapters_default.WebSocket(this.consumer.url, protocols);
            this.installEventHandlers();
            this.monitor.start();
            return true;
          }
        }
        close({ allowReconnect } = { allowReconnect: true }) {
          if (!allowReconnect) {
            this.monitor.stop();
          }
          if (this.isOpen()) {
            return this.webSocket.close();
          }
        }
        reopen() {
          logger_default.log(`Reopening WebSocket, current state is ${this.getState()}`);
          if (this.isActive()) {
            try {
              return this.close();
            } catch (error4) {
              logger_default.log("Failed to reopen WebSocket", error4);
            } finally {
              logger_default.log(`Reopening WebSocket in ${this.constructor.reopenDelay}ms`);
              setTimeout(this.open, this.constructor.reopenDelay);
            }
          } else {
            return this.open();
          }
        }
        getProtocol() {
          if (this.webSocket) {
            return this.webSocket.protocol;
          }
        }
        isOpen() {
          return this.isState("open");
        }
        isActive() {
          return this.isState("open", "connecting");
        }
        isProtocolSupported() {
          return indexOf.call(supportedProtocols, this.getProtocol()) >= 0;
        }
        isState(...states) {
          return indexOf.call(states, this.getState()) >= 0;
        }
        getState() {
          if (this.webSocket) {
            for (let state in adapters_default.WebSocket) {
              if (adapters_default.WebSocket[state] === this.webSocket.readyState) {
                return state.toLowerCase();
              }
            }
          }
          return null;
        }
        installEventHandlers() {
          for (let eventName in this.events) {
            const handler = this.events[eventName].bind(this);
            this.webSocket[`on${eventName}`] = handler;
          }
        }
        uninstallEventHandlers() {
          for (let eventName in this.events) {
            this.webSocket[`on${eventName}`] = function() {
            };
          }
        }
      };
      Connection.reopenDelay = 500;
      Connection.prototype.events = {
        message(event) {
          if (!this.isProtocolSupported()) {
            return;
          }
          const { identifier, message, reason, reconnect, type } = JSON.parse(event.data);
          switch (type) {
            case message_types.welcome:
              this.monitor.recordConnect();
              return this.subscriptions.reload();
            case message_types.disconnect:
              logger_default.log(`Disconnecting. Reason: ${reason}`);
              return this.close({ allowReconnect: reconnect });
            case message_types.ping:
              return this.monitor.recordPing();
            case message_types.confirmation:
              this.subscriptions.confirmSubscription(identifier);
              return this.subscriptions.notify(identifier, "connected");
            case message_types.rejection:
              return this.subscriptions.reject(identifier);
            default:
              return this.subscriptions.notify(identifier, "received", message);
          }
        },
        open() {
          logger_default.log(`WebSocket onopen event, using '${this.getProtocol()}' subprotocol`);
          this.disconnected = false;
          if (!this.isProtocolSupported()) {
            logger_default.log("Protocol is unsupported. Stopping monitor and disconnecting.");
            return this.close({ allowReconnect: false });
          }
        },
        close(event) {
          logger_default.log("WebSocket onclose event");
          if (this.disconnected) {
            return;
          }
          this.disconnected = true;
          this.monitor.recordDisconnect();
          return this.subscriptions.notifyAll("disconnected", { willAttemptReconnect: this.monitor.isRunning() });
        },
        error() {
          logger_default.log("WebSocket onerror event");
        }
      };
      connection_default = Connection;
    }
  });

  // ../../node_modules/@rails/actioncable/src/subscription.js
  var extend, Subscription;
  var init_subscription = __esm({
    "../../node_modules/@rails/actioncable/src/subscription.js"() {
      extend = function(object2, properties) {
        if (properties != null) {
          for (let key in properties) {
            const value = properties[key];
            object2[key] = value;
          }
        }
        return object2;
      };
      Subscription = class {
        constructor(consumer5, params2 = {}, mixin) {
          this.consumer = consumer5;
          this.identifier = JSON.stringify(params2);
          extend(this, mixin);
        }
        perform(action, data2 = {}) {
          data2.action = action;
          return this.send(data2);
        }
        send(data2) {
          return this.consumer.send({ command: "message", identifier: this.identifier, data: JSON.stringify(data2) });
        }
        unsubscribe() {
          return this.consumer.subscriptions.remove(this);
        }
      };
    }
  });

  // ../../node_modules/@rails/actioncable/src/subscription_guarantor.js
  var SubscriptionGuarantor, subscription_guarantor_default;
  var init_subscription_guarantor = __esm({
    "../../node_modules/@rails/actioncable/src/subscription_guarantor.js"() {
      init_logger();
      SubscriptionGuarantor = class {
        constructor(subscriptions) {
          this.subscriptions = subscriptions;
          this.pendingSubscriptions = [];
        }
        guarantee(subscription) {
          if (this.pendingSubscriptions.indexOf(subscription) == -1) {
            logger_default.log(`SubscriptionGuarantor guaranteeing ${subscription.identifier}`);
            this.pendingSubscriptions.push(subscription);
          } else {
            logger_default.log(`SubscriptionGuarantor already guaranteeing ${subscription.identifier}`);
          }
          this.startGuaranteeing();
        }
        forget(subscription) {
          logger_default.log(`SubscriptionGuarantor forgetting ${subscription.identifier}`);
          this.pendingSubscriptions = this.pendingSubscriptions.filter((s) => s !== subscription);
        }
        startGuaranteeing() {
          this.stopGuaranteeing();
          this.retrySubscribing();
        }
        stopGuaranteeing() {
          clearTimeout(this.retryTimeout);
        }
        retrySubscribing() {
          this.retryTimeout = setTimeout(
            () => {
              if (this.subscriptions && typeof this.subscriptions.subscribe === "function") {
                this.pendingSubscriptions.map((subscription) => {
                  logger_default.log(`SubscriptionGuarantor resubscribing ${subscription.identifier}`);
                  this.subscriptions.subscribe(subscription);
                });
              }
            },
            500
          );
        }
      };
      subscription_guarantor_default = SubscriptionGuarantor;
    }
  });

  // ../../node_modules/@rails/actioncable/src/subscriptions.js
  var Subscriptions;
  var init_subscriptions = __esm({
    "../../node_modules/@rails/actioncable/src/subscriptions.js"() {
      init_subscription();
      init_subscription_guarantor();
      init_logger();
      Subscriptions = class {
        constructor(consumer5) {
          this.consumer = consumer5;
          this.guarantor = new subscription_guarantor_default(this);
          this.subscriptions = [];
        }
        create(channelName, mixin) {
          const channel = channelName;
          const params2 = typeof channel === "object" ? channel : { channel };
          const subscription = new Subscription(this.consumer, params2, mixin);
          return this.add(subscription);
        }
        add(subscription) {
          this.subscriptions.push(subscription);
          this.consumer.ensureActiveConnection();
          this.notify(subscription, "initialized");
          this.subscribe(subscription);
          return subscription;
        }
        remove(subscription) {
          this.forget(subscription);
          if (!this.findAll(subscription.identifier).length) {
            this.sendCommand(subscription, "unsubscribe");
          }
          return subscription;
        }
        reject(identifier) {
          return this.findAll(identifier).map((subscription) => {
            this.forget(subscription);
            this.notify(subscription, "rejected");
            return subscription;
          });
        }
        forget(subscription) {
          this.guarantor.forget(subscription);
          this.subscriptions = this.subscriptions.filter((s) => s !== subscription);
          return subscription;
        }
        findAll(identifier) {
          return this.subscriptions.filter((s) => s.identifier === identifier);
        }
        reload() {
          return this.subscriptions.map((subscription) => this.subscribe(subscription));
        }
        notifyAll(callbackName, ...args) {
          return this.subscriptions.map((subscription) => this.notify(subscription, callbackName, ...args));
        }
        notify(subscription, callbackName, ...args) {
          let subscriptions;
          if (typeof subscription === "string") {
            subscriptions = this.findAll(subscription);
          } else {
            subscriptions = [subscription];
          }
          return subscriptions.map((subscription2) => typeof subscription2[callbackName] === "function" ? subscription2[callbackName](...args) : void 0);
        }
        subscribe(subscription) {
          if (this.sendCommand(subscription, "subscribe")) {
            this.guarantor.guarantee(subscription);
          }
        }
        confirmSubscription(identifier) {
          logger_default.log(`Subscription confirmed ${identifier}`);
          this.findAll(identifier).map((subscription) => this.guarantor.forget(subscription));
        }
        sendCommand(subscription, command) {
          const { identifier } = subscription;
          return this.consumer.send({ command, identifier });
        }
      };
    }
  });

  // ../../node_modules/@rails/actioncable/src/consumer.js
  function createWebSocketURL(url2) {
    if (typeof url2 === "function") {
      url2 = url2();
    }
    if (url2 && !/^wss?:/i.test(url2)) {
      const a = document.createElement("a");
      a.href = url2;
      a.href = a.href;
      a.protocol = a.protocol.replace("http", "ws");
      return a.href;
    } else {
      return url2;
    }
  }
  var Consumer;
  var init_consumer = __esm({
    "../../node_modules/@rails/actioncable/src/consumer.js"() {
      init_connection();
      init_subscriptions();
      Consumer = class {
        constructor(url2) {
          this._url = url2;
          this.subscriptions = new Subscriptions(this);
          this.connection = new connection_default(this);
        }
        get url() {
          return createWebSocketURL(this._url);
        }
        send(data2) {
          return this.connection.send(data2);
        }
        connect() {
          return this.connection.open();
        }
        disconnect() {
          return this.connection.close({ allowReconnect: false });
        }
        ensureActiveConnection() {
          if (!this.connection.isActive()) {
            return this.connection.open();
          }
        }
      };
    }
  });

  // ../../node_modules/@rails/actioncable/src/index.js
  var src_exports = {};
  __export(src_exports, {
    Connection: () => connection_default,
    ConnectionMonitor: () => connection_monitor_default,
    Consumer: () => Consumer,
    INTERNAL: () => internal_default,
    Subscription: () => Subscription,
    SubscriptionGuarantor: () => subscription_guarantor_default,
    Subscriptions: () => Subscriptions,
    adapters: () => adapters_default,
    createConsumer: () => createConsumer,
    createWebSocketURL: () => createWebSocketURL,
    getConfig: () => getConfig,
    logger: () => logger_default
  });
  function createConsumer(url2 = getConfig("url") || internal_default.default_mount_path) {
    return new Consumer(url2);
  }
  function getConfig(name) {
    const element = document.head.querySelector(`meta[name='action-cable-${name}']`);
    if (element) {
      return element.getAttribute("content");
    }
  }
  var init_src = __esm({
    "../../node_modules/@rails/actioncable/src/index.js"() {
      init_connection();
      init_connection_monitor();
      init_consumer();
      init_internal();
      init_subscription();
      init_subscriptions();
      init_subscription_guarantor();
      init_adapters();
      init_logger();
    }
  });

  // ../../node_modules/@hotwired/turbo/dist/turbo.es2017-esm.js
  (function() {
    if (window.Reflect === void 0 || window.customElements === void 0 || window.customElements.polyfillWrapFlushCallback) {
      return;
    }
    const BuiltInHTMLElement = HTMLElement;
    const wrapperForTheName = {
      HTMLElement: function HTMLElement2() {
        return Reflect.construct(BuiltInHTMLElement, [], this.constructor);
      }
    };
    window.HTMLElement = wrapperForTheName["HTMLElement"];
    HTMLElement.prototype = BuiltInHTMLElement.prototype;
    HTMLElement.prototype.constructor = HTMLElement;
    Object.setPrototypeOf(HTMLElement, BuiltInHTMLElement);
  })();
  (function(prototype) {
    if (typeof prototype.requestSubmit == "function")
      return;
    prototype.requestSubmit = function(submitter) {
      if (submitter) {
        validateSubmitter(submitter, this);
        submitter.click();
      } else {
        submitter = document.createElement("input");
        submitter.type = "submit";
        submitter.hidden = true;
        this.appendChild(submitter);
        submitter.click();
        this.removeChild(submitter);
      }
    };
    function validateSubmitter(submitter, form2) {
      submitter instanceof HTMLElement || raise(TypeError, "parameter 1 is not of type 'HTMLElement'");
      submitter.type == "submit" || raise(TypeError, "The specified element is not a submit button");
      submitter.form == form2 || raise(DOMException, "The specified element is not owned by this form element", "NotFoundError");
    }
    function raise(errorConstructor, message, name) {
      throw new errorConstructor("Failed to execute 'requestSubmit' on 'HTMLFormElement': " + message + ".", name);
    }
  })(HTMLFormElement.prototype);
  var submittersByForm = /* @__PURE__ */ new WeakMap();
  function findSubmitterFromClickTarget(target) {
    const element = target instanceof Element ? target : target instanceof Node ? target.parentElement : null;
    const candidate = element ? element.closest("input, button") : null;
    return (candidate === null || candidate === void 0 ? void 0 : candidate.type) == "submit" ? candidate : null;
  }
  function clickCaptured(event) {
    const submitter = findSubmitterFromClickTarget(event.target);
    if (submitter && submitter.form) {
      submittersByForm.set(submitter.form, submitter);
    }
  }
  (function() {
    if ("submitter" in Event.prototype)
      return;
    let prototype;
    if ("SubmitEvent" in window && /Apple Computer/.test(navigator.vendor)) {
      prototype = window.SubmitEvent.prototype;
    } else if ("SubmitEvent" in window) {
      return;
    } else {
      prototype = window.Event.prototype;
    }
    addEventListener("click", clickCaptured, true);
    Object.defineProperty(prototype, "submitter", {
      get() {
        if (this.type == "submit" && this.target instanceof HTMLFormElement) {
          return submittersByForm.get(this.target);
        }
      }
    });
  })();
  var FrameLoadingStyle;
  (function(FrameLoadingStyle2) {
    FrameLoadingStyle2["eager"] = "eager";
    FrameLoadingStyle2["lazy"] = "lazy";
  })(FrameLoadingStyle || (FrameLoadingStyle = {}));
  var FrameElement = class extends HTMLElement {
    constructor() {
      super();
      this.loaded = Promise.resolve();
      this.delegate = new FrameElement.delegateConstructor(this);
    }
    static get observedAttributes() {
      return ["disabled", "complete", "loading", "src"];
    }
    connectedCallback() {
      this.delegate.connect();
    }
    disconnectedCallback() {
      this.delegate.disconnect();
    }
    reload() {
      const { src } = this;
      this.removeAttribute("complete");
      this.src = null;
      this.src = src;
      return this.loaded;
    }
    attributeChangedCallback(name) {
      if (name == "loading") {
        this.delegate.loadingStyleChanged();
      } else if (name == "complete") {
        this.delegate.completeChanged();
      } else if (name == "src") {
        this.delegate.sourceURLChanged();
      } else {
        this.delegate.disabledChanged();
      }
    }
    get src() {
      return this.getAttribute("src");
    }
    set src(value) {
      if (value) {
        this.setAttribute("src", value);
      } else {
        this.removeAttribute("src");
      }
    }
    get loading() {
      return frameLoadingStyleFromString(this.getAttribute("loading") || "");
    }
    set loading(value) {
      if (value) {
        this.setAttribute("loading", value);
      } else {
        this.removeAttribute("loading");
      }
    }
    get disabled() {
      return this.hasAttribute("disabled");
    }
    set disabled(value) {
      if (value) {
        this.setAttribute("disabled", "");
      } else {
        this.removeAttribute("disabled");
      }
    }
    get autoscroll() {
      return this.hasAttribute("autoscroll");
    }
    set autoscroll(value) {
      if (value) {
        this.setAttribute("autoscroll", "");
      } else {
        this.removeAttribute("autoscroll");
      }
    }
    get complete() {
      return !this.delegate.isLoading;
    }
    get isActive() {
      return this.ownerDocument === document && !this.isPreview;
    }
    get isPreview() {
      var _a2, _b;
      return (_b = (_a2 = this.ownerDocument) === null || _a2 === void 0 ? void 0 : _a2.documentElement) === null || _b === void 0 ? void 0 : _b.hasAttribute("data-turbo-preview");
    }
  };
  function frameLoadingStyleFromString(style) {
    switch (style.toLowerCase()) {
      case "lazy":
        return FrameLoadingStyle.lazy;
      default:
        return FrameLoadingStyle.eager;
    }
  }
  function expandURL(locatable) {
    return new URL(locatable.toString(), document.baseURI);
  }
  function getAnchor(url2) {
    let anchorMatch;
    if (url2.hash) {
      return url2.hash.slice(1);
    } else if (anchorMatch = url2.href.match(/#(.*)$/)) {
      return anchorMatch[1];
    }
  }
  function getAction(form2, submitter) {
    const action = (submitter === null || submitter === void 0 ? void 0 : submitter.getAttribute("formaction")) || form2.getAttribute("action") || form2.action;
    return expandURL(action);
  }
  function getExtension(url2) {
    return (getLastPathComponent(url2).match(/\.[^.]*$/) || [])[0] || "";
  }
  function isHTML(url2) {
    return !!getExtension(url2).match(/^(?:|\.(?:htm|html|xhtml|php))$/);
  }
  function isPrefixedBy(baseURL, url2) {
    const prefix2 = getPrefix(url2);
    return baseURL.href === expandURL(prefix2).href || baseURL.href.startsWith(prefix2);
  }
  function locationIsVisitable(location2, rootLocation) {
    return isPrefixedBy(location2, rootLocation) && isHTML(location2);
  }
  function getRequestURL(url2) {
    const anchor = getAnchor(url2);
    return anchor != null ? url2.href.slice(0, -(anchor.length + 1)) : url2.href;
  }
  function toCacheKey(url2) {
    return getRequestURL(url2);
  }
  function urlsAreEqual(left, right) {
    return expandURL(left).href == expandURL(right).href;
  }
  function getPathComponents(url2) {
    return url2.pathname.split("/").slice(1);
  }
  function getLastPathComponent(url2) {
    return getPathComponents(url2).slice(-1)[0];
  }
  function getPrefix(url2) {
    return addTrailingSlash(url2.origin + url2.pathname);
  }
  function addTrailingSlash(value) {
    return value.endsWith("/") ? value : value + "/";
  }
  var FetchResponse = class {
    constructor(response) {
      this.response = response;
    }
    get succeeded() {
      return this.response.ok;
    }
    get failed() {
      return !this.succeeded;
    }
    get clientError() {
      return this.statusCode >= 400 && this.statusCode <= 499;
    }
    get serverError() {
      return this.statusCode >= 500 && this.statusCode <= 599;
    }
    get redirected() {
      return this.response.redirected;
    }
    get location() {
      return expandURL(this.response.url);
    }
    get isHTML() {
      return this.contentType && this.contentType.match(/^(?:text\/([^\s;,]+\b)?html|application\/xhtml\+xml)\b/);
    }
    get statusCode() {
      return this.response.status;
    }
    get contentType() {
      return this.header("Content-Type");
    }
    get responseText() {
      return this.response.clone().text();
    }
    get responseHTML() {
      if (this.isHTML) {
        return this.response.clone().text();
      } else {
        return Promise.resolve(void 0);
      }
    }
    header(name) {
      return this.response.headers.get(name);
    }
  };
  function isAction(action) {
    return action == "advance" || action == "replace" || action == "restore";
  }
  function activateScriptElement(element) {
    if (element.getAttribute("data-turbo-eval") == "false") {
      return element;
    } else {
      const createdScriptElement = document.createElement("script");
      const cspNonce2 = getMetaContent("csp-nonce");
      if (cspNonce2) {
        createdScriptElement.nonce = cspNonce2;
      }
      createdScriptElement.textContent = element.textContent;
      createdScriptElement.async = false;
      copyElementAttributes(createdScriptElement, element);
      return createdScriptElement;
    }
  }
  function copyElementAttributes(destinationElement, sourceElement) {
    for (const { name, value } of sourceElement.attributes) {
      destinationElement.setAttribute(name, value);
    }
  }
  function createDocumentFragment(html2) {
    const template2 = document.createElement("template");
    template2.innerHTML = html2;
    return template2.content;
  }
  function dispatch(eventName, { target, cancelable, detail } = {}) {
    const event = new CustomEvent(eventName, {
      cancelable,
      bubbles: true,
      detail
    });
    if (target && target.isConnected) {
      target.dispatchEvent(event);
    } else {
      document.documentElement.dispatchEvent(event);
    }
    return event;
  }
  function nextAnimationFrame() {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
  }
  function nextEventLoopTick() {
    return new Promise((resolve) => setTimeout(() => resolve(), 0));
  }
  function nextMicrotask() {
    return Promise.resolve();
  }
  function parseHTMLDocument(html2 = "") {
    return new DOMParser().parseFromString(html2, "text/html");
  }
  function unindent(strings, ...values) {
    const lines = interpolate(strings, values).replace(/^\n/, "").split("\n");
    const match2 = lines[0].match(/^\s+/);
    const indent = match2 ? match2[0].length : 0;
    return lines.map((line) => line.slice(indent)).join("\n");
  }
  function interpolate(strings, values) {
    return strings.reduce((result, string, i) => {
      const value = values[i] == void 0 ? "" : values[i];
      return result + string + value;
    }, "");
  }
  function uuid() {
    return Array.from({ length: 36 }).map((_2, i) => {
      if (i == 8 || i == 13 || i == 18 || i == 23) {
        return "-";
      } else if (i == 14) {
        return "4";
      } else if (i == 19) {
        return (Math.floor(Math.random() * 4) + 8).toString(16);
      } else {
        return Math.floor(Math.random() * 15).toString(16);
      }
    }).join("");
  }
  function getAttribute(attributeName, ...elements) {
    for (const value of elements.map((element) => element === null || element === void 0 ? void 0 : element.getAttribute(attributeName))) {
      if (typeof value == "string")
        return value;
    }
    return null;
  }
  function hasAttribute(attributeName, ...elements) {
    return elements.some((element) => element && element.hasAttribute(attributeName));
  }
  function markAsBusy(...elements) {
    for (const element of elements) {
      if (element.localName == "turbo-frame") {
        element.setAttribute("busy", "");
      }
      element.setAttribute("aria-busy", "true");
    }
  }
  function clearBusyState(...elements) {
    for (const element of elements) {
      if (element.localName == "turbo-frame") {
        element.removeAttribute("busy");
      }
      element.removeAttribute("aria-busy");
    }
  }
  function waitForLoad(element, timeoutInMilliseconds = 2e3) {
    return new Promise((resolve) => {
      const onComplete = () => {
        element.removeEventListener("error", onComplete);
        element.removeEventListener("load", onComplete);
        resolve();
      };
      element.addEventListener("load", onComplete, { once: true });
      element.addEventListener("error", onComplete, { once: true });
      setTimeout(resolve, timeoutInMilliseconds);
    });
  }
  function getHistoryMethodForAction(action) {
    switch (action) {
      case "replace":
        return history.replaceState;
      case "advance":
      case "restore":
        return history.pushState;
    }
  }
  function getVisitAction(...elements) {
    const action = getAttribute("data-turbo-action", ...elements);
    return isAction(action) ? action : null;
  }
  function getMetaElement(name) {
    return document.querySelector(`meta[name="${name}"]`);
  }
  function getMetaContent(name) {
    const element = getMetaElement(name);
    return element && element.content;
  }
  function setMetaContent(name, content) {
    let element = getMetaElement(name);
    if (!element) {
      element = document.createElement("meta");
      element.setAttribute("name", name);
      document.head.appendChild(element);
    }
    element.setAttribute("content", content);
    return element;
  }
  var FetchMethod;
  (function(FetchMethod2) {
    FetchMethod2[FetchMethod2["get"] = 0] = "get";
    FetchMethod2[FetchMethod2["post"] = 1] = "post";
    FetchMethod2[FetchMethod2["put"] = 2] = "put";
    FetchMethod2[FetchMethod2["patch"] = 3] = "patch";
    FetchMethod2[FetchMethod2["delete"] = 4] = "delete";
  })(FetchMethod || (FetchMethod = {}));
  function fetchMethodFromString(method2) {
    switch (method2.toLowerCase()) {
      case "get":
        return FetchMethod.get;
      case "post":
        return FetchMethod.post;
      case "put":
        return FetchMethod.put;
      case "patch":
        return FetchMethod.patch;
      case "delete":
        return FetchMethod.delete;
    }
  }
  var FetchRequest = class {
    constructor(delegate2, method2, location2, body = new URLSearchParams(), target = null) {
      this.abortController = new AbortController();
      this.resolveRequestPromise = (_value) => {
      };
      this.delegate = delegate2;
      this.method = method2;
      this.headers = this.defaultHeaders;
      this.body = body;
      this.url = location2;
      this.target = target;
    }
    get location() {
      return this.url;
    }
    get params() {
      return this.url.searchParams;
    }
    get entries() {
      return this.body ? Array.from(this.body.entries()) : [];
    }
    cancel() {
      this.abortController.abort();
    }
    async perform() {
      var _a2, _b;
      const { fetchOptions } = this;
      (_b = (_a2 = this.delegate).prepareHeadersForRequest) === null || _b === void 0 ? void 0 : _b.call(_a2, this.headers, this);
      await this.allowRequestToBeIntercepted(fetchOptions);
      try {
        this.delegate.requestStarted(this);
        const response = await fetch(this.url.href, fetchOptions);
        return await this.receive(response);
      } catch (error4) {
        if (error4.name !== "AbortError") {
          if (this.willDelegateErrorHandling(error4)) {
            this.delegate.requestErrored(this, error4);
          }
          throw error4;
        }
      } finally {
        this.delegate.requestFinished(this);
      }
    }
    async receive(response) {
      const fetchResponse = new FetchResponse(response);
      const event = dispatch("turbo:before-fetch-response", {
        cancelable: true,
        detail: { fetchResponse },
        target: this.target
      });
      if (event.defaultPrevented) {
        this.delegate.requestPreventedHandlingResponse(this, fetchResponse);
      } else if (fetchResponse.succeeded) {
        this.delegate.requestSucceededWithResponse(this, fetchResponse);
      } else {
        this.delegate.requestFailedWithResponse(this, fetchResponse);
      }
      return fetchResponse;
    }
    get fetchOptions() {
      var _a2;
      return {
        method: FetchMethod[this.method].toUpperCase(),
        credentials: "same-origin",
        headers: this.headers,
        redirect: "follow",
        body: this.isIdempotent ? null : this.body,
        signal: this.abortSignal,
        referrer: (_a2 = this.delegate.referrer) === null || _a2 === void 0 ? void 0 : _a2.href
      };
    }
    get defaultHeaders() {
      return {
        Accept: "text/html, application/xhtml+xml"
      };
    }
    get isIdempotent() {
      return this.method == FetchMethod.get;
    }
    get abortSignal() {
      return this.abortController.signal;
    }
    acceptResponseType(mimeType) {
      this.headers["Accept"] = [mimeType, this.headers["Accept"]].join(", ");
    }
    async allowRequestToBeIntercepted(fetchOptions) {
      const requestInterception = new Promise((resolve) => this.resolveRequestPromise = resolve);
      const event = dispatch("turbo:before-fetch-request", {
        cancelable: true,
        detail: {
          fetchOptions,
          url: this.url,
          resume: this.resolveRequestPromise
        },
        target: this.target
      });
      if (event.defaultPrevented)
        await requestInterception;
    }
    willDelegateErrorHandling(error4) {
      const event = dispatch("turbo:fetch-request-error", {
        target: this.target,
        cancelable: true,
        detail: { request: this, error: error4 }
      });
      return !event.defaultPrevented;
    }
  };
  var AppearanceObserver = class {
    constructor(delegate2, element) {
      this.started = false;
      this.intersect = (entries2) => {
        const lastEntry = entries2.slice(-1)[0];
        if (lastEntry === null || lastEntry === void 0 ? void 0 : lastEntry.isIntersecting) {
          this.delegate.elementAppearedInViewport(this.element);
        }
      };
      this.delegate = delegate2;
      this.element = element;
      this.intersectionObserver = new IntersectionObserver(this.intersect);
    }
    start() {
      if (!this.started) {
        this.started = true;
        this.intersectionObserver.observe(this.element);
      }
    }
    stop() {
      if (this.started) {
        this.started = false;
        this.intersectionObserver.unobserve(this.element);
      }
    }
  };
  var StreamMessage = class {
    constructor(fragment) {
      this.fragment = importStreamElements(fragment);
    }
    static wrap(message) {
      if (typeof message == "string") {
        return new this(createDocumentFragment(message));
      } else {
        return message;
      }
    }
  };
  StreamMessage.contentType = "text/vnd.turbo-stream.html";
  function importStreamElements(fragment) {
    for (const element of fragment.querySelectorAll("turbo-stream")) {
      const streamElement = document.importNode(element, true);
      for (const inertScriptElement of streamElement.templateElement.content.querySelectorAll("script")) {
        inertScriptElement.replaceWith(activateScriptElement(inertScriptElement));
      }
      element.replaceWith(streamElement);
    }
    return fragment;
  }
  var FormSubmissionState;
  (function(FormSubmissionState2) {
    FormSubmissionState2[FormSubmissionState2["initialized"] = 0] = "initialized";
    FormSubmissionState2[FormSubmissionState2["requesting"] = 1] = "requesting";
    FormSubmissionState2[FormSubmissionState2["waiting"] = 2] = "waiting";
    FormSubmissionState2[FormSubmissionState2["receiving"] = 3] = "receiving";
    FormSubmissionState2[FormSubmissionState2["stopping"] = 4] = "stopping";
    FormSubmissionState2[FormSubmissionState2["stopped"] = 5] = "stopped";
  })(FormSubmissionState || (FormSubmissionState = {}));
  var FormEnctype;
  (function(FormEnctype2) {
    FormEnctype2["urlEncoded"] = "application/x-www-form-urlencoded";
    FormEnctype2["multipart"] = "multipart/form-data";
    FormEnctype2["plain"] = "text/plain";
  })(FormEnctype || (FormEnctype = {}));
  function formEnctypeFromString(encoding) {
    switch (encoding.toLowerCase()) {
      case FormEnctype.multipart:
        return FormEnctype.multipart;
      case FormEnctype.plain:
        return FormEnctype.plain;
      default:
        return FormEnctype.urlEncoded;
    }
  }
  var FormSubmission = class {
    constructor(delegate2, formElement, submitter, mustRedirect = false) {
      this.state = FormSubmissionState.initialized;
      this.delegate = delegate2;
      this.formElement = formElement;
      this.submitter = submitter;
      this.formData = buildFormData(formElement, submitter);
      this.location = expandURL(this.action);
      if (this.method == FetchMethod.get) {
        mergeFormDataEntries(this.location, [...this.body.entries()]);
      }
      this.fetchRequest = new FetchRequest(this, this.method, this.location, this.body, this.formElement);
      this.mustRedirect = mustRedirect;
    }
    static confirmMethod(message, _element, _submitter) {
      return Promise.resolve(confirm(message));
    }
    get method() {
      var _a2;
      const method2 = ((_a2 = this.submitter) === null || _a2 === void 0 ? void 0 : _a2.getAttribute("formmethod")) || this.formElement.getAttribute("method") || "";
      return fetchMethodFromString(method2.toLowerCase()) || FetchMethod.get;
    }
    get action() {
      var _a2;
      const formElementAction = typeof this.formElement.action === "string" ? this.formElement.action : null;
      if ((_a2 = this.submitter) === null || _a2 === void 0 ? void 0 : _a2.hasAttribute("formaction")) {
        return this.submitter.getAttribute("formaction") || "";
      } else {
        return this.formElement.getAttribute("action") || formElementAction || "";
      }
    }
    get body() {
      if (this.enctype == FormEnctype.urlEncoded || this.method == FetchMethod.get) {
        return new URLSearchParams(this.stringFormData);
      } else {
        return this.formData;
      }
    }
    get enctype() {
      var _a2;
      return formEnctypeFromString(((_a2 = this.submitter) === null || _a2 === void 0 ? void 0 : _a2.getAttribute("formenctype")) || this.formElement.enctype);
    }
    get isIdempotent() {
      return this.fetchRequest.isIdempotent;
    }
    get stringFormData() {
      return [...this.formData].reduce((entries2, [name, value]) => {
        return entries2.concat(typeof value == "string" ? [[name, value]] : []);
      }, []);
    }
    async start() {
      const { initialized, requesting } = FormSubmissionState;
      const confirmationMessage = getAttribute("data-turbo-confirm", this.submitter, this.formElement);
      if (typeof confirmationMessage === "string") {
        const answer = await FormSubmission.confirmMethod(confirmationMessage, this.formElement, this.submitter);
        if (!answer) {
          return;
        }
      }
      if (this.state == initialized) {
        this.state = requesting;
        return this.fetchRequest.perform();
      }
    }
    stop() {
      const { stopping, stopped } = FormSubmissionState;
      if (this.state != stopping && this.state != stopped) {
        this.state = stopping;
        this.fetchRequest.cancel();
        return true;
      }
    }
    prepareHeadersForRequest(headers, request2) {
      if (!request2.isIdempotent) {
        const token = getCookieValue(getMetaContent("csrf-param")) || getMetaContent("csrf-token");
        if (token) {
          headers["X-CSRF-Token"] = token;
        }
      }
      if (this.requestAcceptsTurboStreamResponse(request2)) {
        request2.acceptResponseType(StreamMessage.contentType);
      }
    }
    requestStarted(_request) {
      var _a2;
      this.state = FormSubmissionState.waiting;
      (_a2 = this.submitter) === null || _a2 === void 0 ? void 0 : _a2.setAttribute("disabled", "");
      dispatch("turbo:submit-start", {
        target: this.formElement,
        detail: { formSubmission: this }
      });
      this.delegate.formSubmissionStarted(this);
    }
    requestPreventedHandlingResponse(request2, response) {
      this.result = { success: response.succeeded, fetchResponse: response };
    }
    requestSucceededWithResponse(request2, response) {
      if (response.clientError || response.serverError) {
        this.delegate.formSubmissionFailedWithResponse(this, response);
      } else if (this.requestMustRedirect(request2) && responseSucceededWithoutRedirect(response)) {
        const error4 = new Error("Form responses must redirect to another location");
        this.delegate.formSubmissionErrored(this, error4);
      } else {
        this.state = FormSubmissionState.receiving;
        this.result = { success: true, fetchResponse: response };
        this.delegate.formSubmissionSucceededWithResponse(this, response);
      }
    }
    requestFailedWithResponse(request2, response) {
      this.result = { success: false, fetchResponse: response };
      this.delegate.formSubmissionFailedWithResponse(this, response);
    }
    requestErrored(request2, error4) {
      this.result = { success: false, error: error4 };
      this.delegate.formSubmissionErrored(this, error4);
    }
    requestFinished(_request) {
      var _a2;
      this.state = FormSubmissionState.stopped;
      (_a2 = this.submitter) === null || _a2 === void 0 ? void 0 : _a2.removeAttribute("disabled");
      dispatch("turbo:submit-end", {
        target: this.formElement,
        detail: Object.assign({ formSubmission: this }, this.result)
      });
      this.delegate.formSubmissionFinished(this);
    }
    requestMustRedirect(request2) {
      return !request2.isIdempotent && this.mustRedirect;
    }
    requestAcceptsTurboStreamResponse(request2) {
      return !request2.isIdempotent || hasAttribute("data-turbo-stream", this.submitter, this.formElement);
    }
  };
  function buildFormData(formElement, submitter) {
    const formData = new FormData(formElement);
    const name = submitter === null || submitter === void 0 ? void 0 : submitter.getAttribute("name");
    const value = submitter === null || submitter === void 0 ? void 0 : submitter.getAttribute("value");
    if (name) {
      formData.append(name, value || "");
    }
    return formData;
  }
  function getCookieValue(cookieName) {
    if (cookieName != null) {
      const cookies = document.cookie ? document.cookie.split("; ") : [];
      const cookie = cookies.find((cookie2) => cookie2.startsWith(cookieName));
      if (cookie) {
        const value = cookie.split("=").slice(1).join("=");
        return value ? decodeURIComponent(value) : void 0;
      }
    }
  }
  function responseSucceededWithoutRedirect(response) {
    return response.statusCode == 200 && !response.redirected;
  }
  function mergeFormDataEntries(url2, entries2) {
    const searchParams = new URLSearchParams();
    for (const [name, value] of entries2) {
      if (value instanceof File)
        continue;
      searchParams.append(name, value);
    }
    url2.search = searchParams.toString();
    return url2;
  }
  var Snapshot = class {
    constructor(element) {
      this.element = element;
    }
    get activeElement() {
      return this.element.ownerDocument.activeElement;
    }
    get children() {
      return [...this.element.children];
    }
    hasAnchor(anchor) {
      return this.getElementForAnchor(anchor) != null;
    }
    getElementForAnchor(anchor) {
      return anchor ? this.element.querySelector(`[id='${anchor}'], a[name='${anchor}']`) : null;
    }
    get isConnected() {
      return this.element.isConnected;
    }
    get firstAutofocusableElement() {
      const inertDisabledOrHidden = "[inert], :disabled, [hidden], details:not([open]), dialog:not([open])";
      for (const element of this.element.querySelectorAll("[autofocus]")) {
        if (element.closest(inertDisabledOrHidden) == null)
          return element;
        else
          continue;
      }
      return null;
    }
    get permanentElements() {
      return queryPermanentElementsAll(this.element);
    }
    getPermanentElementById(id2) {
      return getPermanentElementById(this.element, id2);
    }
    getPermanentElementMapForSnapshot(snapshot) {
      const permanentElementMap = {};
      for (const currentPermanentElement of this.permanentElements) {
        const { id: id2 } = currentPermanentElement;
        const newPermanentElement = snapshot.getPermanentElementById(id2);
        if (newPermanentElement) {
          permanentElementMap[id2] = [currentPermanentElement, newPermanentElement];
        }
      }
      return permanentElementMap;
    }
  };
  function getPermanentElementById(node, id2) {
    return node.querySelector(`#${id2}[data-turbo-permanent]`);
  }
  function queryPermanentElementsAll(node) {
    return node.querySelectorAll("[id][data-turbo-permanent]");
  }
  var FormSubmitObserver = class {
    constructor(delegate2, eventTarget) {
      this.started = false;
      this.submitCaptured = () => {
        this.eventTarget.removeEventListener("submit", this.submitBubbled, false);
        this.eventTarget.addEventListener("submit", this.submitBubbled, false);
      };
      this.submitBubbled = (event) => {
        if (!event.defaultPrevented) {
          const form2 = event.target instanceof HTMLFormElement ? event.target : void 0;
          const submitter = event.submitter || void 0;
          if (form2 && submissionDoesNotDismissDialog(form2, submitter) && submissionDoesNotTargetIFrame(form2, submitter) && this.delegate.willSubmitForm(form2, submitter)) {
            event.preventDefault();
            this.delegate.formSubmitted(form2, submitter);
          }
        }
      };
      this.delegate = delegate2;
      this.eventTarget = eventTarget;
    }
    start() {
      if (!this.started) {
        this.eventTarget.addEventListener("submit", this.submitCaptured, true);
        this.started = true;
      }
    }
    stop() {
      if (this.started) {
        this.eventTarget.removeEventListener("submit", this.submitCaptured, true);
        this.started = false;
      }
    }
  };
  function submissionDoesNotDismissDialog(form2, submitter) {
    const method2 = (submitter === null || submitter === void 0 ? void 0 : submitter.getAttribute("formmethod")) || form2.getAttribute("method");
    return method2 != "dialog";
  }
  function submissionDoesNotTargetIFrame(form2, submitter) {
    const target = (submitter === null || submitter === void 0 ? void 0 : submitter.getAttribute("formtarget")) || form2.target;
    for (const element of document.getElementsByName(target)) {
      if (element instanceof HTMLIFrameElement)
        return false;
    }
    return true;
  }
  var View = class {
    constructor(delegate2, element) {
      this.resolveRenderPromise = (_value) => {
      };
      this.resolveInterceptionPromise = (_value) => {
      };
      this.delegate = delegate2;
      this.element = element;
    }
    scrollToAnchor(anchor) {
      const element = this.snapshot.getElementForAnchor(anchor);
      if (element) {
        this.scrollToElement(element);
        this.focusElement(element);
      } else {
        this.scrollToPosition({ x: 0, y: 0 });
      }
    }
    scrollToAnchorFromLocation(location2) {
      this.scrollToAnchor(getAnchor(location2));
    }
    scrollToElement(element) {
      element.scrollIntoView();
    }
    focusElement(element) {
      if (element instanceof HTMLElement) {
        if (element.hasAttribute("tabindex")) {
          element.focus();
        } else {
          element.setAttribute("tabindex", "-1");
          element.focus();
          element.removeAttribute("tabindex");
        }
      }
    }
    scrollToPosition({ x, y }) {
      this.scrollRoot.scrollTo(x, y);
    }
    scrollToTop() {
      this.scrollToPosition({ x: 0, y: 0 });
    }
    get scrollRoot() {
      return window;
    }
    async render(renderer) {
      const { isPreview, shouldRender, newSnapshot: snapshot } = renderer;
      if (shouldRender) {
        try {
          this.renderPromise = new Promise((resolve) => this.resolveRenderPromise = resolve);
          this.renderer = renderer;
          await this.prepareToRenderSnapshot(renderer);
          const renderInterception = new Promise((resolve) => this.resolveInterceptionPromise = resolve);
          const options2 = { resume: this.resolveInterceptionPromise, render: this.renderer.renderElement };
          const immediateRender = this.delegate.allowsImmediateRender(snapshot, options2);
          if (!immediateRender)
            await renderInterception;
          await this.renderSnapshot(renderer);
          this.delegate.viewRenderedSnapshot(snapshot, isPreview);
          this.delegate.preloadOnLoadLinksForView(this.element);
          this.finishRenderingSnapshot(renderer);
        } finally {
          delete this.renderer;
          this.resolveRenderPromise(void 0);
          delete this.renderPromise;
        }
      } else {
        this.invalidate(renderer.reloadReason);
      }
    }
    invalidate(reason) {
      this.delegate.viewInvalidated(reason);
    }
    async prepareToRenderSnapshot(renderer) {
      this.markAsPreview(renderer.isPreview);
      await renderer.prepareToRender();
    }
    markAsPreview(isPreview) {
      if (isPreview) {
        this.element.setAttribute("data-turbo-preview", "");
      } else {
        this.element.removeAttribute("data-turbo-preview");
      }
    }
    async renderSnapshot(renderer) {
      await renderer.render();
    }
    finishRenderingSnapshot(renderer) {
      renderer.finishRendering();
    }
  };
  var FrameView = class extends View {
    invalidate() {
      this.element.innerHTML = "";
    }
    get snapshot() {
      return new Snapshot(this.element);
    }
  };
  var LinkClickObserver = class {
    constructor(delegate2, eventTarget) {
      this.started = false;
      this.clickCaptured = () => {
        this.eventTarget.removeEventListener("click", this.clickBubbled, false);
        this.eventTarget.addEventListener("click", this.clickBubbled, false);
      };
      this.clickBubbled = (event) => {
        if (event instanceof MouseEvent && this.clickEventIsSignificant(event)) {
          const target = event.composedPath && event.composedPath()[0] || event.target;
          const link2 = this.findLinkFromClickTarget(target);
          if (link2 && doesNotTargetIFrame(link2)) {
            const location2 = this.getLocationForLink(link2);
            if (this.delegate.willFollowLinkToLocation(link2, location2, event)) {
              event.preventDefault();
              this.delegate.followedLinkToLocation(link2, location2);
            }
          }
        }
      };
      this.delegate = delegate2;
      this.eventTarget = eventTarget;
    }
    start() {
      if (!this.started) {
        this.eventTarget.addEventListener("click", this.clickCaptured, true);
        this.started = true;
      }
    }
    stop() {
      if (this.started) {
        this.eventTarget.removeEventListener("click", this.clickCaptured, true);
        this.started = false;
      }
    }
    clickEventIsSignificant(event) {
      return !(event.target && event.target.isContentEditable || event.defaultPrevented || event.which > 1 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey);
    }
    findLinkFromClickTarget(target) {
      if (target instanceof Element) {
        return target.closest("a[href]:not([target^=_]):not([download])");
      }
    }
    getLocationForLink(link2) {
      return expandURL(link2.getAttribute("href") || "");
    }
  };
  function doesNotTargetIFrame(anchor) {
    for (const element of document.getElementsByName(anchor.target)) {
      if (element instanceof HTMLIFrameElement)
        return false;
    }
    return true;
  }
  var FormLinkClickObserver = class {
    constructor(delegate2, element) {
      this.delegate = delegate2;
      this.linkClickObserver = new LinkClickObserver(this, element);
    }
    start() {
      this.linkClickObserver.start();
    }
    stop() {
      this.linkClickObserver.stop();
    }
    willFollowLinkToLocation(link2, location2, originalEvent) {
      return this.delegate.willSubmitFormLinkToLocation(link2, location2, originalEvent) && link2.hasAttribute("data-turbo-method");
    }
    followedLinkToLocation(link2, location2) {
      const action = location2.href;
      const form2 = document.createElement("form");
      form2.setAttribute("data-turbo", "true");
      form2.setAttribute("action", action);
      form2.setAttribute("hidden", "");
      const method2 = link2.getAttribute("data-turbo-method");
      if (method2)
        form2.setAttribute("method", method2);
      const turboFrame = link2.getAttribute("data-turbo-frame");
      if (turboFrame)
        form2.setAttribute("data-turbo-frame", turboFrame);
      const turboAction = link2.getAttribute("data-turbo-action");
      if (turboAction)
        form2.setAttribute("data-turbo-action", turboAction);
      const turboConfirm = link2.getAttribute("data-turbo-confirm");
      if (turboConfirm)
        form2.setAttribute("data-turbo-confirm", turboConfirm);
      const turboStream = link2.hasAttribute("data-turbo-stream");
      if (turboStream)
        form2.setAttribute("data-turbo-stream", "");
      this.delegate.submittedFormLinkToLocation(link2, location2, form2);
      document.body.appendChild(form2);
      form2.addEventListener("turbo:submit-end", () => form2.remove(), { once: true });
      requestAnimationFrame(() => form2.requestSubmit());
    }
  };
  var Bardo = class {
    constructor(delegate2, permanentElementMap) {
      this.delegate = delegate2;
      this.permanentElementMap = permanentElementMap;
    }
    static preservingPermanentElements(delegate2, permanentElementMap, callback) {
      const bardo = new this(delegate2, permanentElementMap);
      bardo.enter();
      callback();
      bardo.leave();
    }
    enter() {
      for (const id2 in this.permanentElementMap) {
        const [currentPermanentElement, newPermanentElement] = this.permanentElementMap[id2];
        this.delegate.enteringBardo(currentPermanentElement, newPermanentElement);
        this.replaceNewPermanentElementWithPlaceholder(newPermanentElement);
      }
    }
    leave() {
      for (const id2 in this.permanentElementMap) {
        const [currentPermanentElement] = this.permanentElementMap[id2];
        this.replaceCurrentPermanentElementWithClone(currentPermanentElement);
        this.replacePlaceholderWithPermanentElement(currentPermanentElement);
        this.delegate.leavingBardo(currentPermanentElement);
      }
    }
    replaceNewPermanentElementWithPlaceholder(permanentElement) {
      const placeholder = createPlaceholderForPermanentElement(permanentElement);
      permanentElement.replaceWith(placeholder);
    }
    replaceCurrentPermanentElementWithClone(permanentElement) {
      const clone = permanentElement.cloneNode(true);
      permanentElement.replaceWith(clone);
    }
    replacePlaceholderWithPermanentElement(permanentElement) {
      const placeholder = this.getPlaceholderById(permanentElement.id);
      placeholder === null || placeholder === void 0 ? void 0 : placeholder.replaceWith(permanentElement);
    }
    getPlaceholderById(id2) {
      return this.placeholders.find((element) => element.content == id2);
    }
    get placeholders() {
      return [...document.querySelectorAll("meta[name=turbo-permanent-placeholder][content]")];
    }
  };
  function createPlaceholderForPermanentElement(permanentElement) {
    const element = document.createElement("meta");
    element.setAttribute("name", "turbo-permanent-placeholder");
    element.setAttribute("content", permanentElement.id);
    return element;
  }
  var Renderer = class {
    constructor(currentSnapshot, newSnapshot, renderElement, isPreview, willRender = true) {
      this.activeElement = null;
      this.currentSnapshot = currentSnapshot;
      this.newSnapshot = newSnapshot;
      this.isPreview = isPreview;
      this.willRender = willRender;
      this.renderElement = renderElement;
      this.promise = new Promise((resolve, reject) => this.resolvingFunctions = { resolve, reject });
    }
    get shouldRender() {
      return true;
    }
    get reloadReason() {
      return;
    }
    prepareToRender() {
      return;
    }
    finishRendering() {
      if (this.resolvingFunctions) {
        this.resolvingFunctions.resolve();
        delete this.resolvingFunctions;
      }
    }
    preservingPermanentElements(callback) {
      Bardo.preservingPermanentElements(this, this.permanentElementMap, callback);
    }
    focusFirstAutofocusableElement() {
      const element = this.connectedSnapshot.firstAutofocusableElement;
      if (elementIsFocusable(element)) {
        element.focus();
      }
    }
    enteringBardo(currentPermanentElement) {
      if (this.activeElement)
        return;
      if (currentPermanentElement.contains(this.currentSnapshot.activeElement)) {
        this.activeElement = this.currentSnapshot.activeElement;
      }
    }
    leavingBardo(currentPermanentElement) {
      if (currentPermanentElement.contains(this.activeElement) && this.activeElement instanceof HTMLElement) {
        this.activeElement.focus();
        this.activeElement = null;
      }
    }
    get connectedSnapshot() {
      return this.newSnapshot.isConnected ? this.newSnapshot : this.currentSnapshot;
    }
    get currentElement() {
      return this.currentSnapshot.element;
    }
    get newElement() {
      return this.newSnapshot.element;
    }
    get permanentElementMap() {
      return this.currentSnapshot.getPermanentElementMapForSnapshot(this.newSnapshot);
    }
  };
  function elementIsFocusable(element) {
    return element && typeof element.focus == "function";
  }
  var FrameRenderer = class extends Renderer {
    constructor(delegate2, currentSnapshot, newSnapshot, renderElement, isPreview, willRender = true) {
      super(currentSnapshot, newSnapshot, renderElement, isPreview, willRender);
      this.delegate = delegate2;
    }
    static renderElement(currentElement, newElement) {
      var _a2;
      const destinationRange = document.createRange();
      destinationRange.selectNodeContents(currentElement);
      destinationRange.deleteContents();
      const frameElement = newElement;
      const sourceRange = (_a2 = frameElement.ownerDocument) === null || _a2 === void 0 ? void 0 : _a2.createRange();
      if (sourceRange) {
        sourceRange.selectNodeContents(frameElement);
        currentElement.appendChild(sourceRange.extractContents());
      }
    }
    get shouldRender() {
      return true;
    }
    async render() {
      await nextAnimationFrame();
      this.preservingPermanentElements(() => {
        this.loadFrameElement();
      });
      this.scrollFrameIntoView();
      await nextAnimationFrame();
      this.focusFirstAutofocusableElement();
      await nextAnimationFrame();
      this.activateScriptElements();
    }
    loadFrameElement() {
      this.delegate.willRenderFrame(this.currentElement, this.newElement);
      this.renderElement(this.currentElement, this.newElement);
    }
    scrollFrameIntoView() {
      if (this.currentElement.autoscroll || this.newElement.autoscroll) {
        const element = this.currentElement.firstElementChild;
        const block = readScrollLogicalPosition(this.currentElement.getAttribute("data-autoscroll-block"), "end");
        const behavior = readScrollBehavior(this.currentElement.getAttribute("data-autoscroll-behavior"), "auto");
        if (element) {
          element.scrollIntoView({ block, behavior });
          return true;
        }
      }
      return false;
    }
    activateScriptElements() {
      for (const inertScriptElement of this.newScriptElements) {
        const activatedScriptElement = activateScriptElement(inertScriptElement);
        inertScriptElement.replaceWith(activatedScriptElement);
      }
    }
    get newScriptElements() {
      return this.currentElement.querySelectorAll("script");
    }
  };
  function readScrollLogicalPosition(value, defaultValue) {
    if (value == "end" || value == "start" || value == "center" || value == "nearest") {
      return value;
    } else {
      return defaultValue;
    }
  }
  function readScrollBehavior(value, defaultValue) {
    if (value == "auto" || value == "smooth") {
      return value;
    } else {
      return defaultValue;
    }
  }
  var ProgressBar = class {
    constructor() {
      this.hiding = false;
      this.value = 0;
      this.visible = false;
      this.trickle = () => {
        this.setValue(this.value + Math.random() / 100);
      };
      this.stylesheetElement = this.createStylesheetElement();
      this.progressElement = this.createProgressElement();
      this.installStylesheetElement();
      this.setValue(0);
    }
    static get defaultCSS() {
      return unindent`
      .turbo-progress-bar {
        position: fixed;
        display: block;
        top: 0;
        left: 0;
        height: 3px;
        background: #0076ff;
        z-index: 2147483647;
        transition:
          width ${ProgressBar.animationDuration}ms ease-out,
          opacity ${ProgressBar.animationDuration / 2}ms ${ProgressBar.animationDuration / 2}ms ease-in;
        transform: translate3d(0, 0, 0);
      }
    `;
    }
    show() {
      if (!this.visible) {
        this.visible = true;
        this.installProgressElement();
        this.startTrickling();
      }
    }
    hide() {
      if (this.visible && !this.hiding) {
        this.hiding = true;
        this.fadeProgressElement(() => {
          this.uninstallProgressElement();
          this.stopTrickling();
          this.visible = false;
          this.hiding = false;
        });
      }
    }
    setValue(value) {
      this.value = value;
      this.refresh();
    }
    installStylesheetElement() {
      document.head.insertBefore(this.stylesheetElement, document.head.firstChild);
    }
    installProgressElement() {
      this.progressElement.style.width = "0";
      this.progressElement.style.opacity = "1";
      document.documentElement.insertBefore(this.progressElement, document.body);
      this.refresh();
    }
    fadeProgressElement(callback) {
      this.progressElement.style.opacity = "0";
      setTimeout(callback, ProgressBar.animationDuration * 1.5);
    }
    uninstallProgressElement() {
      if (this.progressElement.parentNode) {
        document.documentElement.removeChild(this.progressElement);
      }
    }
    startTrickling() {
      if (!this.trickleInterval) {
        this.trickleInterval = window.setInterval(this.trickle, ProgressBar.animationDuration);
      }
    }
    stopTrickling() {
      window.clearInterval(this.trickleInterval);
      delete this.trickleInterval;
    }
    refresh() {
      requestAnimationFrame(() => {
        this.progressElement.style.width = `${10 + this.value * 90}%`;
      });
    }
    createStylesheetElement() {
      const element = document.createElement("style");
      element.type = "text/css";
      element.textContent = ProgressBar.defaultCSS;
      if (this.cspNonce) {
        element.nonce = this.cspNonce;
      }
      return element;
    }
    createProgressElement() {
      const element = document.createElement("div");
      element.className = "turbo-progress-bar";
      return element;
    }
    get cspNonce() {
      return getMetaContent("csp-nonce");
    }
  };
  ProgressBar.animationDuration = 300;
  var HeadSnapshot = class extends Snapshot {
    constructor() {
      super(...arguments);
      this.detailsByOuterHTML = this.children.filter((element) => !elementIsNoscript(element)).map((element) => elementWithoutNonce(element)).reduce((result, element) => {
        const { outerHTML } = element;
        const details = outerHTML in result ? result[outerHTML] : {
          type: elementType(element),
          tracked: elementIsTracked(element),
          elements: []
        };
        return Object.assign(Object.assign({}, result), { [outerHTML]: Object.assign(Object.assign({}, details), { elements: [...details.elements, element] }) });
      }, {});
    }
    get trackedElementSignature() {
      return Object.keys(this.detailsByOuterHTML).filter((outerHTML) => this.detailsByOuterHTML[outerHTML].tracked).join("");
    }
    getScriptElementsNotInSnapshot(snapshot) {
      return this.getElementsMatchingTypeNotInSnapshot("script", snapshot);
    }
    getStylesheetElementsNotInSnapshot(snapshot) {
      return this.getElementsMatchingTypeNotInSnapshot("stylesheet", snapshot);
    }
    getElementsMatchingTypeNotInSnapshot(matchedType, snapshot) {
      return Object.keys(this.detailsByOuterHTML).filter((outerHTML) => !(outerHTML in snapshot.detailsByOuterHTML)).map((outerHTML) => this.detailsByOuterHTML[outerHTML]).filter(({ type }) => type == matchedType).map(({ elements: [element] }) => element);
    }
    get provisionalElements() {
      return Object.keys(this.detailsByOuterHTML).reduce((result, outerHTML) => {
        const { type, tracked, elements } = this.detailsByOuterHTML[outerHTML];
        if (type == null && !tracked) {
          return [...result, ...elements];
        } else if (elements.length > 1) {
          return [...result, ...elements.slice(1)];
        } else {
          return result;
        }
      }, []);
    }
    getMetaValue(name) {
      const element = this.findMetaElementByName(name);
      return element ? element.getAttribute("content") : null;
    }
    findMetaElementByName(name) {
      return Object.keys(this.detailsByOuterHTML).reduce((result, outerHTML) => {
        const { elements: [element] } = this.detailsByOuterHTML[outerHTML];
        return elementIsMetaElementWithName(element, name) ? element : result;
      }, void 0);
    }
  };
  function elementType(element) {
    if (elementIsScript(element)) {
      return "script";
    } else if (elementIsStylesheet(element)) {
      return "stylesheet";
    }
  }
  function elementIsTracked(element) {
    return element.getAttribute("data-turbo-track") == "reload";
  }
  function elementIsScript(element) {
    const tagName2 = element.localName;
    return tagName2 == "script";
  }
  function elementIsNoscript(element) {
    const tagName2 = element.localName;
    return tagName2 == "noscript";
  }
  function elementIsStylesheet(element) {
    const tagName2 = element.localName;
    return tagName2 == "style" || tagName2 == "link" && element.getAttribute("rel") == "stylesheet";
  }
  function elementIsMetaElementWithName(element, name) {
    const tagName2 = element.localName;
    return tagName2 == "meta" && element.getAttribute("name") == name;
  }
  function elementWithoutNonce(element) {
    if (element.hasAttribute("nonce")) {
      element.setAttribute("nonce", "");
    }
    return element;
  }
  var PageSnapshot = class extends Snapshot {
    constructor(element, headSnapshot) {
      super(element);
      this.headSnapshot = headSnapshot;
    }
    static fromHTMLString(html2 = "") {
      return this.fromDocument(parseHTMLDocument(html2));
    }
    static fromElement(element) {
      return this.fromDocument(element.ownerDocument);
    }
    static fromDocument({ head, body }) {
      return new this(body, new HeadSnapshot(head));
    }
    clone() {
      const clonedElement = this.element.cloneNode(true);
      const selectElements = this.element.querySelectorAll("select");
      const clonedSelectElements = clonedElement.querySelectorAll("select");
      for (const [index, source] of selectElements.entries()) {
        const clone = clonedSelectElements[index];
        for (const option of clone.selectedOptions)
          option.selected = false;
        for (const option of source.selectedOptions)
          clone.options[option.index].selected = true;
      }
      for (const clonedPasswordInput of clonedElement.querySelectorAll('input[type="password"]')) {
        clonedPasswordInput.value = "";
      }
      return new PageSnapshot(clonedElement, this.headSnapshot);
    }
    get headElement() {
      return this.headSnapshot.element;
    }
    get rootLocation() {
      var _a2;
      const root = (_a2 = this.getSetting("root")) !== null && _a2 !== void 0 ? _a2 : "/";
      return expandURL(root);
    }
    get cacheControlValue() {
      return this.getSetting("cache-control");
    }
    get isPreviewable() {
      return this.cacheControlValue != "no-preview";
    }
    get isCacheable() {
      return this.cacheControlValue != "no-cache";
    }
    get isVisitable() {
      return this.getSetting("visit-control") != "reload";
    }
    getSetting(name) {
      return this.headSnapshot.getMetaValue(`turbo-${name}`);
    }
  };
  var TimingMetric;
  (function(TimingMetric2) {
    TimingMetric2["visitStart"] = "visitStart";
    TimingMetric2["requestStart"] = "requestStart";
    TimingMetric2["requestEnd"] = "requestEnd";
    TimingMetric2["visitEnd"] = "visitEnd";
  })(TimingMetric || (TimingMetric = {}));
  var VisitState;
  (function(VisitState2) {
    VisitState2["initialized"] = "initialized";
    VisitState2["started"] = "started";
    VisitState2["canceled"] = "canceled";
    VisitState2["failed"] = "failed";
    VisitState2["completed"] = "completed";
  })(VisitState || (VisitState = {}));
  var defaultOptions = {
    action: "advance",
    historyChanged: false,
    visitCachedSnapshot: () => {
    },
    willRender: true,
    updateHistory: true,
    shouldCacheSnapshot: true,
    acceptsStreamResponse: false
  };
  var SystemStatusCode;
  (function(SystemStatusCode2) {
    SystemStatusCode2[SystemStatusCode2["networkFailure"] = 0] = "networkFailure";
    SystemStatusCode2[SystemStatusCode2["timeoutFailure"] = -1] = "timeoutFailure";
    SystemStatusCode2[SystemStatusCode2["contentTypeMismatch"] = -2] = "contentTypeMismatch";
  })(SystemStatusCode || (SystemStatusCode = {}));
  var Visit = class {
    constructor(delegate2, location2, restorationIdentifier, options2 = {}) {
      this.identifier = uuid();
      this.timingMetrics = {};
      this.followedRedirect = false;
      this.historyChanged = false;
      this.scrolled = false;
      this.shouldCacheSnapshot = true;
      this.acceptsStreamResponse = false;
      this.snapshotCached = false;
      this.state = VisitState.initialized;
      this.delegate = delegate2;
      this.location = location2;
      this.restorationIdentifier = restorationIdentifier || uuid();
      const { action, historyChanged, referrer, snapshotHTML, response, visitCachedSnapshot, willRender, updateHistory, shouldCacheSnapshot, acceptsStreamResponse } = Object.assign(Object.assign({}, defaultOptions), options2);
      this.action = action;
      this.historyChanged = historyChanged;
      this.referrer = referrer;
      this.snapshotHTML = snapshotHTML;
      this.response = response;
      this.isSamePage = this.delegate.locationWithActionIsSamePage(this.location, this.action);
      this.visitCachedSnapshot = visitCachedSnapshot;
      this.willRender = willRender;
      this.updateHistory = updateHistory;
      this.scrolled = !willRender;
      this.shouldCacheSnapshot = shouldCacheSnapshot;
      this.acceptsStreamResponse = acceptsStreamResponse;
    }
    get adapter() {
      return this.delegate.adapter;
    }
    get view() {
      return this.delegate.view;
    }
    get history() {
      return this.delegate.history;
    }
    get restorationData() {
      return this.history.getRestorationDataForIdentifier(this.restorationIdentifier);
    }
    get silent() {
      return this.isSamePage;
    }
    start() {
      if (this.state == VisitState.initialized) {
        this.recordTimingMetric(TimingMetric.visitStart);
        this.state = VisitState.started;
        this.adapter.visitStarted(this);
        this.delegate.visitStarted(this);
      }
    }
    cancel() {
      if (this.state == VisitState.started) {
        if (this.request) {
          this.request.cancel();
        }
        this.cancelRender();
        this.state = VisitState.canceled;
      }
    }
    complete() {
      if (this.state == VisitState.started) {
        this.recordTimingMetric(TimingMetric.visitEnd);
        this.state = VisitState.completed;
        this.followRedirect();
        if (!this.followedRedirect) {
          this.adapter.visitCompleted(this);
          this.delegate.visitCompleted(this);
        }
      }
    }
    fail() {
      if (this.state == VisitState.started) {
        this.state = VisitState.failed;
        this.adapter.visitFailed(this);
      }
    }
    changeHistory() {
      var _a2;
      if (!this.historyChanged && this.updateHistory) {
        const actionForHistory = this.location.href === ((_a2 = this.referrer) === null || _a2 === void 0 ? void 0 : _a2.href) ? "replace" : this.action;
        const method2 = getHistoryMethodForAction(actionForHistory);
        this.history.update(method2, this.location, this.restorationIdentifier);
        this.historyChanged = true;
      }
    }
    issueRequest() {
      if (this.hasPreloadedResponse()) {
        this.simulateRequest();
      } else if (this.shouldIssueRequest() && !this.request) {
        this.request = new FetchRequest(this, FetchMethod.get, this.location);
        this.request.perform();
      }
    }
    simulateRequest() {
      if (this.response) {
        this.startRequest();
        this.recordResponse();
        this.finishRequest();
      }
    }
    startRequest() {
      this.recordTimingMetric(TimingMetric.requestStart);
      this.adapter.visitRequestStarted(this);
    }
    recordResponse(response = this.response) {
      this.response = response;
      if (response) {
        const { statusCode } = response;
        if (isSuccessful(statusCode)) {
          this.adapter.visitRequestCompleted(this);
        } else {
          this.adapter.visitRequestFailedWithStatusCode(this, statusCode);
        }
      }
    }
    finishRequest() {
      this.recordTimingMetric(TimingMetric.requestEnd);
      this.adapter.visitRequestFinished(this);
    }
    loadResponse() {
      if (this.response) {
        const { statusCode, responseHTML } = this.response;
        this.render(async () => {
          if (this.shouldCacheSnapshot)
            this.cacheSnapshot();
          if (this.view.renderPromise)
            await this.view.renderPromise;
          if (isSuccessful(statusCode) && responseHTML != null) {
            await this.view.renderPage(PageSnapshot.fromHTMLString(responseHTML), false, this.willRender, this);
            this.performScroll();
            this.adapter.visitRendered(this);
            this.complete();
          } else {
            await this.view.renderError(PageSnapshot.fromHTMLString(responseHTML), this);
            this.adapter.visitRendered(this);
            this.fail();
          }
        });
      }
    }
    getCachedSnapshot() {
      const snapshot = this.view.getCachedSnapshotForLocation(this.location) || this.getPreloadedSnapshot();
      if (snapshot && (!getAnchor(this.location) || snapshot.hasAnchor(getAnchor(this.location)))) {
        if (this.action == "restore" || snapshot.isPreviewable) {
          return snapshot;
        }
      }
    }
    getPreloadedSnapshot() {
      if (this.snapshotHTML) {
        return PageSnapshot.fromHTMLString(this.snapshotHTML);
      }
    }
    hasCachedSnapshot() {
      return this.getCachedSnapshot() != null;
    }
    loadCachedSnapshot() {
      const snapshot = this.getCachedSnapshot();
      if (snapshot) {
        const isPreview = this.shouldIssueRequest();
        this.render(async () => {
          this.cacheSnapshot();
          if (this.isSamePage) {
            this.adapter.visitRendered(this);
          } else {
            if (this.view.renderPromise)
              await this.view.renderPromise;
            await this.view.renderPage(snapshot, isPreview, this.willRender, this);
            this.performScroll();
            this.adapter.visitRendered(this);
            if (!isPreview) {
              this.complete();
            }
          }
        });
      }
    }
    followRedirect() {
      var _a2;
      if (this.redirectedToLocation && !this.followedRedirect && ((_a2 = this.response) === null || _a2 === void 0 ? void 0 : _a2.redirected)) {
        this.adapter.visitProposedToLocation(this.redirectedToLocation, {
          action: "replace",
          response: this.response
        });
        this.followedRedirect = true;
      }
    }
    goToSamePageAnchor() {
      if (this.isSamePage) {
        this.render(async () => {
          this.cacheSnapshot();
          this.performScroll();
          this.adapter.visitRendered(this);
        });
      }
    }
    prepareHeadersForRequest(headers, request2) {
      if (this.acceptsStreamResponse) {
        request2.acceptResponseType(StreamMessage.contentType);
      }
    }
    requestStarted() {
      this.startRequest();
    }
    requestPreventedHandlingResponse(_request, _response) {
    }
    async requestSucceededWithResponse(request2, response) {
      const responseHTML = await response.responseHTML;
      const { redirected, statusCode } = response;
      if (responseHTML == void 0) {
        this.recordResponse({
          statusCode: SystemStatusCode.contentTypeMismatch,
          redirected
        });
      } else {
        this.redirectedToLocation = response.redirected ? response.location : void 0;
        this.recordResponse({ statusCode, responseHTML, redirected });
      }
    }
    async requestFailedWithResponse(request2, response) {
      const responseHTML = await response.responseHTML;
      const { redirected, statusCode } = response;
      if (responseHTML == void 0) {
        this.recordResponse({
          statusCode: SystemStatusCode.contentTypeMismatch,
          redirected
        });
      } else {
        this.recordResponse({ statusCode, responseHTML, redirected });
      }
    }
    requestErrored(_request, _error) {
      this.recordResponse({
        statusCode: SystemStatusCode.networkFailure,
        redirected: false
      });
    }
    requestFinished() {
      this.finishRequest();
    }
    performScroll() {
      if (!this.scrolled && !this.view.forceReloaded) {
        if (this.action == "restore") {
          this.scrollToRestoredPosition() || this.scrollToAnchor() || this.view.scrollToTop();
        } else {
          this.scrollToAnchor() || this.view.scrollToTop();
        }
        if (this.isSamePage) {
          this.delegate.visitScrolledToSamePageLocation(this.view.lastRenderedLocation, this.location);
        }
        this.scrolled = true;
      }
    }
    scrollToRestoredPosition() {
      const { scrollPosition } = this.restorationData;
      if (scrollPosition) {
        this.view.scrollToPosition(scrollPosition);
        return true;
      }
    }
    scrollToAnchor() {
      const anchor = getAnchor(this.location);
      if (anchor != null) {
        this.view.scrollToAnchor(anchor);
        return true;
      }
    }
    recordTimingMetric(metric) {
      this.timingMetrics[metric] = new Date().getTime();
    }
    getTimingMetrics() {
      return Object.assign({}, this.timingMetrics);
    }
    getHistoryMethodForAction(action) {
      switch (action) {
        case "replace":
          return history.replaceState;
        case "advance":
        case "restore":
          return history.pushState;
      }
    }
    hasPreloadedResponse() {
      return typeof this.response == "object";
    }
    shouldIssueRequest() {
      if (this.isSamePage) {
        return false;
      } else if (this.action == "restore") {
        return !this.hasCachedSnapshot();
      } else {
        return this.willRender;
      }
    }
    cacheSnapshot() {
      if (!this.snapshotCached) {
        this.view.cacheSnapshot().then((snapshot) => snapshot && this.visitCachedSnapshot(snapshot));
        this.snapshotCached = true;
      }
    }
    async render(callback) {
      this.cancelRender();
      await new Promise((resolve) => {
        this.frame = requestAnimationFrame(() => resolve());
      });
      await callback();
      delete this.frame;
    }
    cancelRender() {
      if (this.frame) {
        cancelAnimationFrame(this.frame);
        delete this.frame;
      }
    }
  };
  function isSuccessful(statusCode) {
    return statusCode >= 200 && statusCode < 300;
  }
  var BrowserAdapter = class {
    constructor(session2) {
      this.progressBar = new ProgressBar();
      this.showProgressBar = () => {
        this.progressBar.show();
      };
      this.session = session2;
    }
    visitProposedToLocation(location2, options2) {
      this.navigator.startVisit(location2, (options2 === null || options2 === void 0 ? void 0 : options2.restorationIdentifier) || uuid(), options2);
    }
    visitStarted(visit2) {
      this.location = visit2.location;
      visit2.loadCachedSnapshot();
      visit2.issueRequest();
      visit2.goToSamePageAnchor();
    }
    visitRequestStarted(visit2) {
      this.progressBar.setValue(0);
      if (visit2.hasCachedSnapshot() || visit2.action != "restore") {
        this.showVisitProgressBarAfterDelay();
      } else {
        this.showProgressBar();
      }
    }
    visitRequestCompleted(visit2) {
      visit2.loadResponse();
    }
    visitRequestFailedWithStatusCode(visit2, statusCode) {
      switch (statusCode) {
        case SystemStatusCode.networkFailure:
        case SystemStatusCode.timeoutFailure:
        case SystemStatusCode.contentTypeMismatch:
          return this.reload({
            reason: "request_failed",
            context: {
              statusCode
            }
          });
        default:
          return visit2.loadResponse();
      }
    }
    visitRequestFinished(_visit) {
      this.progressBar.setValue(1);
      this.hideVisitProgressBar();
    }
    visitCompleted(_visit) {
    }
    pageInvalidated(reason) {
      this.reload(reason);
    }
    visitFailed(_visit) {
    }
    visitRendered(_visit) {
    }
    formSubmissionStarted(_formSubmission) {
      this.progressBar.setValue(0);
      this.showFormProgressBarAfterDelay();
    }
    formSubmissionFinished(_formSubmission) {
      this.progressBar.setValue(1);
      this.hideFormProgressBar();
    }
    showVisitProgressBarAfterDelay() {
      this.visitProgressBarTimeout = window.setTimeout(this.showProgressBar, this.session.progressBarDelay);
    }
    hideVisitProgressBar() {
      this.progressBar.hide();
      if (this.visitProgressBarTimeout != null) {
        window.clearTimeout(this.visitProgressBarTimeout);
        delete this.visitProgressBarTimeout;
      }
    }
    showFormProgressBarAfterDelay() {
      if (this.formProgressBarTimeout == null) {
        this.formProgressBarTimeout = window.setTimeout(this.showProgressBar, this.session.progressBarDelay);
      }
    }
    hideFormProgressBar() {
      this.progressBar.hide();
      if (this.formProgressBarTimeout != null) {
        window.clearTimeout(this.formProgressBarTimeout);
        delete this.formProgressBarTimeout;
      }
    }
    reload(reason) {
      dispatch("turbo:reload", { detail: reason });
      if (!this.location)
        return;
      window.location.href = this.location.toString();
    }
    get navigator() {
      return this.session.navigator;
    }
  };
  var CacheObserver = class {
    constructor() {
      this.started = false;
      this.removeStaleElements = (_event) => {
        const staleElements = [...document.querySelectorAll('[data-turbo-cache="false"]')];
        for (const element of staleElements) {
          element.remove();
        }
      };
    }
    start() {
      if (!this.started) {
        this.started = true;
        addEventListener("turbo:before-cache", this.removeStaleElements, false);
      }
    }
    stop() {
      if (this.started) {
        this.started = false;
        removeEventListener("turbo:before-cache", this.removeStaleElements, false);
      }
    }
  };
  var FrameRedirector = class {
    constructor(session2, element) {
      this.session = session2;
      this.element = element;
      this.linkClickObserver = new LinkClickObserver(this, element);
      this.formSubmitObserver = new FormSubmitObserver(this, element);
    }
    start() {
      this.linkClickObserver.start();
      this.formSubmitObserver.start();
    }
    stop() {
      this.linkClickObserver.stop();
      this.formSubmitObserver.stop();
    }
    willFollowLinkToLocation(element, location2, event) {
      return this.shouldRedirect(element) && this.frameAllowsVisitingLocation(element, location2, event);
    }
    followedLinkToLocation(element, url2) {
      const frame = this.findFrameElement(element);
      if (frame) {
        frame.delegate.followedLinkToLocation(element, url2);
      }
    }
    willSubmitForm(element, submitter) {
      return element.closest("turbo-frame") == null && this.shouldSubmit(element, submitter) && this.shouldRedirect(element, submitter);
    }
    formSubmitted(element, submitter) {
      const frame = this.findFrameElement(element, submitter);
      if (frame) {
        frame.delegate.formSubmitted(element, submitter);
      }
    }
    frameAllowsVisitingLocation(target, { href: url2 }, originalEvent) {
      const event = dispatch("turbo:click", {
        target,
        detail: { url: url2, originalEvent },
        cancelable: true
      });
      return !event.defaultPrevented;
    }
    shouldSubmit(form2, submitter) {
      var _a2;
      const action = getAction(form2, submitter);
      const meta = this.element.ownerDocument.querySelector(`meta[name="turbo-root"]`);
      const rootLocation = expandURL((_a2 = meta === null || meta === void 0 ? void 0 : meta.content) !== null && _a2 !== void 0 ? _a2 : "/");
      return this.shouldRedirect(form2, submitter) && locationIsVisitable(action, rootLocation);
    }
    shouldRedirect(element, submitter) {
      const isNavigatable = element instanceof HTMLFormElement ? this.session.submissionIsNavigatable(element, submitter) : this.session.elementIsNavigatable(element);
      if (isNavigatable) {
        const frame = this.findFrameElement(element, submitter);
        return frame ? frame != element.closest("turbo-frame") : false;
      } else {
        return false;
      }
    }
    findFrameElement(element, submitter) {
      const id2 = (submitter === null || submitter === void 0 ? void 0 : submitter.getAttribute("data-turbo-frame")) || element.getAttribute("data-turbo-frame");
      if (id2 && id2 != "_top") {
        const frame = this.element.querySelector(`#${id2}:not([disabled])`);
        if (frame instanceof FrameElement) {
          return frame;
        }
      }
    }
  };
  var History = class {
    constructor(delegate2) {
      this.restorationIdentifier = uuid();
      this.restorationData = {};
      this.started = false;
      this.pageLoaded = false;
      this.onPopState = (event) => {
        if (this.shouldHandlePopState()) {
          const { turbo } = event.state || {};
          if (turbo) {
            this.location = new URL(window.location.href);
            const { restorationIdentifier } = turbo;
            this.restorationIdentifier = restorationIdentifier;
            this.delegate.historyPoppedToLocationWithRestorationIdentifier(this.location, restorationIdentifier);
          }
        }
      };
      this.onPageLoad = async (_event) => {
        await nextMicrotask();
        this.pageLoaded = true;
      };
      this.delegate = delegate2;
    }
    start() {
      if (!this.started) {
        addEventListener("popstate", this.onPopState, false);
        addEventListener("load", this.onPageLoad, false);
        this.started = true;
        this.replace(new URL(window.location.href));
      }
    }
    stop() {
      if (this.started) {
        removeEventListener("popstate", this.onPopState, false);
        removeEventListener("load", this.onPageLoad, false);
        this.started = false;
      }
    }
    push(location2, restorationIdentifier) {
      this.update(history.pushState, location2, restorationIdentifier);
    }
    replace(location2, restorationIdentifier) {
      this.update(history.replaceState, location2, restorationIdentifier);
    }
    update(method2, location2, restorationIdentifier = uuid()) {
      const state = { turbo: { restorationIdentifier } };
      method2.call(history, state, "", location2.href);
      this.location = location2;
      this.restorationIdentifier = restorationIdentifier;
    }
    getRestorationDataForIdentifier(restorationIdentifier) {
      return this.restorationData[restorationIdentifier] || {};
    }
    updateRestorationData(additionalData) {
      const { restorationIdentifier } = this;
      const restorationData = this.restorationData[restorationIdentifier];
      this.restorationData[restorationIdentifier] = Object.assign(Object.assign({}, restorationData), additionalData);
    }
    assumeControlOfScrollRestoration() {
      var _a2;
      if (!this.previousScrollRestoration) {
        this.previousScrollRestoration = (_a2 = history.scrollRestoration) !== null && _a2 !== void 0 ? _a2 : "auto";
        history.scrollRestoration = "manual";
      }
    }
    relinquishControlOfScrollRestoration() {
      if (this.previousScrollRestoration) {
        history.scrollRestoration = this.previousScrollRestoration;
        delete this.previousScrollRestoration;
      }
    }
    shouldHandlePopState() {
      return this.pageIsLoaded();
    }
    pageIsLoaded() {
      return this.pageLoaded || document.readyState == "complete";
    }
  };
  var Navigator = class {
    constructor(delegate2) {
      this.delegate = delegate2;
    }
    proposeVisit(location2, options2 = {}) {
      if (this.delegate.allowsVisitingLocationWithAction(location2, options2.action)) {
        if (locationIsVisitable(location2, this.view.snapshot.rootLocation)) {
          this.delegate.visitProposedToLocation(location2, options2);
        } else {
          window.location.href = location2.toString();
        }
      }
    }
    startVisit(locatable, restorationIdentifier, options2 = {}) {
      this.lastVisit = this.currentVisit;
      this.stop();
      this.currentVisit = new Visit(this, expandURL(locatable), restorationIdentifier, Object.assign({ referrer: this.location }, options2));
      this.currentVisit.start();
    }
    submitForm(form2, submitter) {
      this.stop();
      this.formSubmission = new FormSubmission(this, form2, submitter, true);
      this.formSubmission.start();
    }
    stop() {
      if (this.formSubmission) {
        this.formSubmission.stop();
        delete this.formSubmission;
      }
      if (this.currentVisit) {
        this.currentVisit.cancel();
        delete this.currentVisit;
      }
    }
    get adapter() {
      return this.delegate.adapter;
    }
    get view() {
      return this.delegate.view;
    }
    get history() {
      return this.delegate.history;
    }
    formSubmissionStarted(formSubmission) {
      if (typeof this.adapter.formSubmissionStarted === "function") {
        this.adapter.formSubmissionStarted(formSubmission);
      }
    }
    async formSubmissionSucceededWithResponse(formSubmission, fetchResponse) {
      if (formSubmission == this.formSubmission) {
        const responseHTML = await fetchResponse.responseHTML;
        if (responseHTML) {
          const shouldCacheSnapshot = formSubmission.method == FetchMethod.get;
          if (!shouldCacheSnapshot) {
            this.view.clearSnapshotCache();
          }
          const { statusCode, redirected } = fetchResponse;
          const action = this.getActionForFormSubmission(formSubmission);
          const visitOptions = {
            action,
            shouldCacheSnapshot,
            response: { statusCode, responseHTML, redirected }
          };
          this.proposeVisit(fetchResponse.location, visitOptions);
        }
      }
    }
    async formSubmissionFailedWithResponse(formSubmission, fetchResponse) {
      const responseHTML = await fetchResponse.responseHTML;
      if (responseHTML) {
        const snapshot = PageSnapshot.fromHTMLString(responseHTML);
        if (fetchResponse.serverError) {
          await this.view.renderError(snapshot, this.currentVisit);
        } else {
          await this.view.renderPage(snapshot, false, true, this.currentVisit);
        }
        this.view.scrollToTop();
        this.view.clearSnapshotCache();
      }
    }
    formSubmissionErrored(formSubmission, error4) {
      console.error(error4);
    }
    formSubmissionFinished(formSubmission) {
      if (typeof this.adapter.formSubmissionFinished === "function") {
        this.adapter.formSubmissionFinished(formSubmission);
      }
    }
    visitStarted(visit2) {
      this.delegate.visitStarted(visit2);
    }
    visitCompleted(visit2) {
      this.delegate.visitCompleted(visit2);
    }
    locationWithActionIsSamePage(location2, action) {
      var _a2;
      const anchor = getAnchor(location2);
      const lastLocation = ((_a2 = this.lastVisit) === null || _a2 === void 0 ? void 0 : _a2.location) || this.view.lastRenderedLocation;
      const currentAnchor = getAnchor(lastLocation);
      const isRestorationToTop = action === "restore" && typeof anchor === "undefined";
      return action !== "replace" && getRequestURL(location2) === getRequestURL(lastLocation) && (isRestorationToTop || anchor != null && anchor !== currentAnchor);
    }
    visitScrolledToSamePageLocation(oldURL, newURL) {
      this.delegate.visitScrolledToSamePageLocation(oldURL, newURL);
    }
    get location() {
      return this.history.location;
    }
    get restorationIdentifier() {
      return this.history.restorationIdentifier;
    }
    getActionForFormSubmission(formSubmission) {
      const { formElement, submitter } = formSubmission;
      const action = getAttribute("data-turbo-action", submitter, formElement);
      return isAction(action) ? action : "advance";
    }
  };
  var PageStage;
  (function(PageStage2) {
    PageStage2[PageStage2["initial"] = 0] = "initial";
    PageStage2[PageStage2["loading"] = 1] = "loading";
    PageStage2[PageStage2["interactive"] = 2] = "interactive";
    PageStage2[PageStage2["complete"] = 3] = "complete";
  })(PageStage || (PageStage = {}));
  var PageObserver = class {
    constructor(delegate2) {
      this.stage = PageStage.initial;
      this.started = false;
      this.interpretReadyState = () => {
        const { readyState } = this;
        if (readyState == "interactive") {
          this.pageIsInteractive();
        } else if (readyState == "complete") {
          this.pageIsComplete();
        }
      };
      this.pageWillUnload = () => {
        this.delegate.pageWillUnload();
      };
      this.delegate = delegate2;
    }
    start() {
      if (!this.started) {
        if (this.stage == PageStage.initial) {
          this.stage = PageStage.loading;
        }
        document.addEventListener("readystatechange", this.interpretReadyState, false);
        addEventListener("pagehide", this.pageWillUnload, false);
        this.started = true;
      }
    }
    stop() {
      if (this.started) {
        document.removeEventListener("readystatechange", this.interpretReadyState, false);
        removeEventListener("pagehide", this.pageWillUnload, false);
        this.started = false;
      }
    }
    pageIsInteractive() {
      if (this.stage == PageStage.loading) {
        this.stage = PageStage.interactive;
        this.delegate.pageBecameInteractive();
      }
    }
    pageIsComplete() {
      this.pageIsInteractive();
      if (this.stage == PageStage.interactive) {
        this.stage = PageStage.complete;
        this.delegate.pageLoaded();
      }
    }
    get readyState() {
      return document.readyState;
    }
  };
  var ScrollObserver = class {
    constructor(delegate2) {
      this.started = false;
      this.onScroll = () => {
        this.updatePosition({ x: window.pageXOffset, y: window.pageYOffset });
      };
      this.delegate = delegate2;
    }
    start() {
      if (!this.started) {
        addEventListener("scroll", this.onScroll, false);
        this.onScroll();
        this.started = true;
      }
    }
    stop() {
      if (this.started) {
        removeEventListener("scroll", this.onScroll, false);
        this.started = false;
      }
    }
    updatePosition(position) {
      this.delegate.scrollPositionChanged(position);
    }
  };
  var StreamMessageRenderer = class {
    render({ fragment }) {
      Bardo.preservingPermanentElements(this, getPermanentElementMapForFragment(fragment), () => document.documentElement.appendChild(fragment));
    }
    enteringBardo(currentPermanentElement, newPermanentElement) {
      newPermanentElement.replaceWith(currentPermanentElement.cloneNode(true));
    }
    leavingBardo() {
    }
  };
  function getPermanentElementMapForFragment(fragment) {
    const permanentElementsInDocument = queryPermanentElementsAll(document.documentElement);
    const permanentElementMap = {};
    for (const permanentElementInDocument of permanentElementsInDocument) {
      const { id: id2 } = permanentElementInDocument;
      for (const streamElement of fragment.querySelectorAll("turbo-stream")) {
        const elementInStream = getPermanentElementById(streamElement.templateElement.content, id2);
        if (elementInStream) {
          permanentElementMap[id2] = [permanentElementInDocument, elementInStream];
        }
      }
    }
    return permanentElementMap;
  }
  var StreamObserver = class {
    constructor(delegate2) {
      this.sources = /* @__PURE__ */ new Set();
      this.started = false;
      this.inspectFetchResponse = (event) => {
        const response = fetchResponseFromEvent(event);
        if (response && fetchResponseIsStream(response)) {
          event.preventDefault();
          this.receiveMessageResponse(response);
        }
      };
      this.receiveMessageEvent = (event) => {
        if (this.started && typeof event.data == "string") {
          this.receiveMessageHTML(event.data);
        }
      };
      this.delegate = delegate2;
    }
    start() {
      if (!this.started) {
        this.started = true;
        addEventListener("turbo:before-fetch-response", this.inspectFetchResponse, false);
      }
    }
    stop() {
      if (this.started) {
        this.started = false;
        removeEventListener("turbo:before-fetch-response", this.inspectFetchResponse, false);
      }
    }
    connectStreamSource(source) {
      if (!this.streamSourceIsConnected(source)) {
        this.sources.add(source);
        source.addEventListener("message", this.receiveMessageEvent, false);
      }
    }
    disconnectStreamSource(source) {
      if (this.streamSourceIsConnected(source)) {
        this.sources.delete(source);
        source.removeEventListener("message", this.receiveMessageEvent, false);
      }
    }
    streamSourceIsConnected(source) {
      return this.sources.has(source);
    }
    async receiveMessageResponse(response) {
      const html2 = await response.responseHTML;
      if (html2) {
        this.receiveMessageHTML(html2);
      }
    }
    receiveMessageHTML(html2) {
      this.delegate.receivedMessageFromStream(StreamMessage.wrap(html2));
    }
  };
  function fetchResponseFromEvent(event) {
    var _a2;
    const fetchResponse = (_a2 = event.detail) === null || _a2 === void 0 ? void 0 : _a2.fetchResponse;
    if (fetchResponse instanceof FetchResponse) {
      return fetchResponse;
    }
  }
  function fetchResponseIsStream(response) {
    var _a2;
    const contentType = (_a2 = response.contentType) !== null && _a2 !== void 0 ? _a2 : "";
    return contentType.startsWith(StreamMessage.contentType);
  }
  var ErrorRenderer = class extends Renderer {
    static renderElement(currentElement, newElement) {
      const { documentElement, body } = document;
      documentElement.replaceChild(newElement, body);
    }
    async render() {
      this.replaceHeadAndBody();
      this.activateScriptElements();
    }
    replaceHeadAndBody() {
      const { documentElement, head } = document;
      documentElement.replaceChild(this.newHead, head);
      this.renderElement(this.currentElement, this.newElement);
    }
    activateScriptElements() {
      for (const replaceableElement of this.scriptElements) {
        const parentNode = replaceableElement.parentNode;
        if (parentNode) {
          const element = activateScriptElement(replaceableElement);
          parentNode.replaceChild(element, replaceableElement);
        }
      }
    }
    get newHead() {
      return this.newSnapshot.headSnapshot.element;
    }
    get scriptElements() {
      return document.documentElement.querySelectorAll("script");
    }
  };
  var PageRenderer = class extends Renderer {
    static renderElement(currentElement, newElement) {
      if (document.body && newElement instanceof HTMLBodyElement) {
        document.body.replaceWith(newElement);
      } else {
        document.documentElement.appendChild(newElement);
      }
    }
    get shouldRender() {
      return this.newSnapshot.isVisitable && this.trackedElementsAreIdentical;
    }
    get reloadReason() {
      if (!this.newSnapshot.isVisitable) {
        return {
          reason: "turbo_visit_control_is_reload"
        };
      }
      if (!this.trackedElementsAreIdentical) {
        return {
          reason: "tracked_element_mismatch"
        };
      }
    }
    async prepareToRender() {
      await this.mergeHead();
    }
    async render() {
      if (this.willRender) {
        this.replaceBody();
      }
    }
    finishRendering() {
      super.finishRendering();
      if (!this.isPreview) {
        this.focusFirstAutofocusableElement();
      }
    }
    get currentHeadSnapshot() {
      return this.currentSnapshot.headSnapshot;
    }
    get newHeadSnapshot() {
      return this.newSnapshot.headSnapshot;
    }
    get newElement() {
      return this.newSnapshot.element;
    }
    async mergeHead() {
      const newStylesheetElements = this.copyNewHeadStylesheetElements();
      this.copyNewHeadScriptElements();
      this.removeCurrentHeadProvisionalElements();
      this.copyNewHeadProvisionalElements();
      await newStylesheetElements;
    }
    replaceBody() {
      this.preservingPermanentElements(() => {
        this.activateNewBody();
        this.assignNewBody();
      });
    }
    get trackedElementsAreIdentical() {
      return this.currentHeadSnapshot.trackedElementSignature == this.newHeadSnapshot.trackedElementSignature;
    }
    async copyNewHeadStylesheetElements() {
      const loadingElements = [];
      for (const element of this.newHeadStylesheetElements) {
        loadingElements.push(waitForLoad(element));
        document.head.appendChild(element);
      }
      await Promise.all(loadingElements);
    }
    copyNewHeadScriptElements() {
      for (const element of this.newHeadScriptElements) {
        document.head.appendChild(activateScriptElement(element));
      }
    }
    removeCurrentHeadProvisionalElements() {
      for (const element of this.currentHeadProvisionalElements) {
        document.head.removeChild(element);
      }
    }
    copyNewHeadProvisionalElements() {
      for (const element of this.newHeadProvisionalElements) {
        document.head.appendChild(element);
      }
    }
    activateNewBody() {
      document.adoptNode(this.newElement);
      this.activateNewBodyScriptElements();
    }
    activateNewBodyScriptElements() {
      for (const inertScriptElement of this.newBodyScriptElements) {
        const activatedScriptElement = activateScriptElement(inertScriptElement);
        inertScriptElement.replaceWith(activatedScriptElement);
      }
    }
    assignNewBody() {
      this.renderElement(this.currentElement, this.newElement);
    }
    get newHeadStylesheetElements() {
      return this.newHeadSnapshot.getStylesheetElementsNotInSnapshot(this.currentHeadSnapshot);
    }
    get newHeadScriptElements() {
      return this.newHeadSnapshot.getScriptElementsNotInSnapshot(this.currentHeadSnapshot);
    }
    get currentHeadProvisionalElements() {
      return this.currentHeadSnapshot.provisionalElements;
    }
    get newHeadProvisionalElements() {
      return this.newHeadSnapshot.provisionalElements;
    }
    get newBodyScriptElements() {
      return this.newElement.querySelectorAll("script");
    }
  };
  var SnapshotCache = class {
    constructor(size) {
      this.keys = [];
      this.snapshots = {};
      this.size = size;
    }
    has(location2) {
      return toCacheKey(location2) in this.snapshots;
    }
    get(location2) {
      if (this.has(location2)) {
        const snapshot = this.read(location2);
        this.touch(location2);
        return snapshot;
      }
    }
    put(location2, snapshot) {
      this.write(location2, snapshot);
      this.touch(location2);
      return snapshot;
    }
    clear() {
      this.snapshots = {};
    }
    read(location2) {
      return this.snapshots[toCacheKey(location2)];
    }
    write(location2, snapshot) {
      this.snapshots[toCacheKey(location2)] = snapshot;
    }
    touch(location2) {
      const key = toCacheKey(location2);
      const index = this.keys.indexOf(key);
      if (index > -1)
        this.keys.splice(index, 1);
      this.keys.unshift(key);
      this.trim();
    }
    trim() {
      for (const key of this.keys.splice(this.size)) {
        delete this.snapshots[key];
      }
    }
  };
  var PageView = class extends View {
    constructor() {
      super(...arguments);
      this.snapshotCache = new SnapshotCache(10);
      this.lastRenderedLocation = new URL(location.href);
      this.forceReloaded = false;
    }
    renderPage(snapshot, isPreview = false, willRender = true, visit2) {
      const renderer = new PageRenderer(this.snapshot, snapshot, PageRenderer.renderElement, isPreview, willRender);
      if (!renderer.shouldRender) {
        this.forceReloaded = true;
      } else {
        visit2 === null || visit2 === void 0 ? void 0 : visit2.changeHistory();
      }
      return this.render(renderer);
    }
    renderError(snapshot, visit2) {
      visit2 === null || visit2 === void 0 ? void 0 : visit2.changeHistory();
      const renderer = new ErrorRenderer(this.snapshot, snapshot, ErrorRenderer.renderElement, false);
      return this.render(renderer);
    }
    clearSnapshotCache() {
      this.snapshotCache.clear();
    }
    async cacheSnapshot() {
      if (this.shouldCacheSnapshot) {
        this.delegate.viewWillCacheSnapshot();
        const { snapshot, lastRenderedLocation: location2 } = this;
        await nextEventLoopTick();
        const cachedSnapshot = snapshot.clone();
        this.snapshotCache.put(location2, cachedSnapshot);
        return cachedSnapshot;
      }
    }
    getCachedSnapshotForLocation(location2) {
      return this.snapshotCache.get(location2);
    }
    get snapshot() {
      return PageSnapshot.fromElement(this.element);
    }
    get shouldCacheSnapshot() {
      return this.snapshot.isCacheable;
    }
  };
  var Preloader = class {
    constructor(delegate2) {
      this.selector = "a[data-turbo-preload]";
      this.delegate = delegate2;
    }
    get snapshotCache() {
      return this.delegate.navigator.view.snapshotCache;
    }
    start() {
      if (document.readyState === "loading") {
        return document.addEventListener("DOMContentLoaded", () => {
          this.preloadOnLoadLinksForView(document.body);
        });
      } else {
        this.preloadOnLoadLinksForView(document.body);
      }
    }
    preloadOnLoadLinksForView(element) {
      for (const link2 of element.querySelectorAll(this.selector)) {
        this.preloadURL(link2);
      }
    }
    async preloadURL(link2) {
      const location2 = new URL(link2.href);
      if (this.snapshotCache.has(location2)) {
        return;
      }
      try {
        const response = await fetch(location2.toString(), { headers: { "VND.PREFETCH": "true", Accept: "text/html" } });
        const responseText = await response.text();
        const snapshot = PageSnapshot.fromHTMLString(responseText);
        this.snapshotCache.put(location2, snapshot);
      } catch (_2) {
      }
    }
  };
  var Session = class {
    constructor() {
      this.navigator = new Navigator(this);
      this.history = new History(this);
      this.preloader = new Preloader(this);
      this.view = new PageView(this, document.documentElement);
      this.adapter = new BrowserAdapter(this);
      this.pageObserver = new PageObserver(this);
      this.cacheObserver = new CacheObserver();
      this.linkClickObserver = new LinkClickObserver(this, window);
      this.formSubmitObserver = new FormSubmitObserver(this, document);
      this.scrollObserver = new ScrollObserver(this);
      this.streamObserver = new StreamObserver(this);
      this.formLinkClickObserver = new FormLinkClickObserver(this, document.documentElement);
      this.frameRedirector = new FrameRedirector(this, document.documentElement);
      this.streamMessageRenderer = new StreamMessageRenderer();
      this.drive = true;
      this.enabled = true;
      this.progressBarDelay = 500;
      this.started = false;
      this.formMode = "on";
    }
    start() {
      if (!this.started) {
        this.pageObserver.start();
        this.cacheObserver.start();
        this.formLinkClickObserver.start();
        this.linkClickObserver.start();
        this.formSubmitObserver.start();
        this.scrollObserver.start();
        this.streamObserver.start();
        this.frameRedirector.start();
        this.history.start();
        this.preloader.start();
        this.started = true;
        this.enabled = true;
      }
    }
    disable() {
      this.enabled = false;
    }
    stop() {
      if (this.started) {
        this.pageObserver.stop();
        this.cacheObserver.stop();
        this.formLinkClickObserver.stop();
        this.linkClickObserver.stop();
        this.formSubmitObserver.stop();
        this.scrollObserver.stop();
        this.streamObserver.stop();
        this.frameRedirector.stop();
        this.history.stop();
        this.started = false;
      }
    }
    registerAdapter(adapter) {
      this.adapter = adapter;
    }
    visit(location2, options2 = {}) {
      const frameElement = options2.frame ? document.getElementById(options2.frame) : null;
      if (frameElement instanceof FrameElement) {
        frameElement.src = location2.toString();
        frameElement.loaded;
      } else {
        this.navigator.proposeVisit(expandURL(location2), options2);
      }
    }
    connectStreamSource(source) {
      this.streamObserver.connectStreamSource(source);
    }
    disconnectStreamSource(source) {
      this.streamObserver.disconnectStreamSource(source);
    }
    renderStreamMessage(message) {
      this.streamMessageRenderer.render(StreamMessage.wrap(message));
    }
    clearCache() {
      this.view.clearSnapshotCache();
    }
    setProgressBarDelay(delay) {
      this.progressBarDelay = delay;
    }
    setFormMode(mode) {
      this.formMode = mode;
    }
    get location() {
      return this.history.location;
    }
    get restorationIdentifier() {
      return this.history.restorationIdentifier;
    }
    historyPoppedToLocationWithRestorationIdentifier(location2, restorationIdentifier) {
      if (this.enabled) {
        this.navigator.startVisit(location2, restorationIdentifier, {
          action: "restore",
          historyChanged: true
        });
      } else {
        this.adapter.pageInvalidated({
          reason: "turbo_disabled"
        });
      }
    }
    scrollPositionChanged(position) {
      this.history.updateRestorationData({ scrollPosition: position });
    }
    willSubmitFormLinkToLocation(link2, location2) {
      return this.elementIsNavigatable(link2) && locationIsVisitable(location2, this.snapshot.rootLocation);
    }
    submittedFormLinkToLocation() {
    }
    willFollowLinkToLocation(link2, location2, event) {
      return this.elementIsNavigatable(link2) && locationIsVisitable(location2, this.snapshot.rootLocation) && this.applicationAllowsFollowingLinkToLocation(link2, location2, event);
    }
    followedLinkToLocation(link2, location2) {
      const action = this.getActionForLink(link2);
      const acceptsStreamResponse = link2.hasAttribute("data-turbo-stream");
      this.visit(location2.href, { action, acceptsStreamResponse });
    }
    allowsVisitingLocationWithAction(location2, action) {
      return this.locationWithActionIsSamePage(location2, action) || this.applicationAllowsVisitingLocation(location2);
    }
    visitProposedToLocation(location2, options2) {
      extendURLWithDeprecatedProperties(location2);
      this.adapter.visitProposedToLocation(location2, options2);
    }
    visitStarted(visit2) {
      if (!visit2.acceptsStreamResponse) {
        markAsBusy(document.documentElement);
      }
      extendURLWithDeprecatedProperties(visit2.location);
      if (!visit2.silent) {
        this.notifyApplicationAfterVisitingLocation(visit2.location, visit2.action);
      }
    }
    visitCompleted(visit2) {
      clearBusyState(document.documentElement);
      this.notifyApplicationAfterPageLoad(visit2.getTimingMetrics());
    }
    locationWithActionIsSamePage(location2, action) {
      return this.navigator.locationWithActionIsSamePage(location2, action);
    }
    visitScrolledToSamePageLocation(oldURL, newURL) {
      this.notifyApplicationAfterVisitingSamePageLocation(oldURL, newURL);
    }
    willSubmitForm(form2, submitter) {
      const action = getAction(form2, submitter);
      return this.submissionIsNavigatable(form2, submitter) && locationIsVisitable(expandURL(action), this.snapshot.rootLocation);
    }
    formSubmitted(form2, submitter) {
      this.navigator.submitForm(form2, submitter);
    }
    pageBecameInteractive() {
      this.view.lastRenderedLocation = this.location;
      this.notifyApplicationAfterPageLoad();
    }
    pageLoaded() {
      this.history.assumeControlOfScrollRestoration();
    }
    pageWillUnload() {
      this.history.relinquishControlOfScrollRestoration();
    }
    receivedMessageFromStream(message) {
      this.renderStreamMessage(message);
    }
    viewWillCacheSnapshot() {
      var _a2;
      if (!((_a2 = this.navigator.currentVisit) === null || _a2 === void 0 ? void 0 : _a2.silent)) {
        this.notifyApplicationBeforeCachingSnapshot();
      }
    }
    allowsImmediateRender({ element }, options2) {
      const event = this.notifyApplicationBeforeRender(element, options2);
      const { defaultPrevented, detail: { render } } = event;
      if (this.view.renderer && render) {
        this.view.renderer.renderElement = render;
      }
      return !defaultPrevented;
    }
    viewRenderedSnapshot(_snapshot, _isPreview) {
      this.view.lastRenderedLocation = this.history.location;
      this.notifyApplicationAfterRender();
    }
    preloadOnLoadLinksForView(element) {
      this.preloader.preloadOnLoadLinksForView(element);
    }
    viewInvalidated(reason) {
      this.adapter.pageInvalidated(reason);
    }
    frameLoaded(frame) {
      this.notifyApplicationAfterFrameLoad(frame);
    }
    frameRendered(fetchResponse, frame) {
      this.notifyApplicationAfterFrameRender(fetchResponse, frame);
    }
    applicationAllowsFollowingLinkToLocation(link2, location2, ev) {
      const event = this.notifyApplicationAfterClickingLinkToLocation(link2, location2, ev);
      return !event.defaultPrevented;
    }
    applicationAllowsVisitingLocation(location2) {
      const event = this.notifyApplicationBeforeVisitingLocation(location2);
      return !event.defaultPrevented;
    }
    notifyApplicationAfterClickingLinkToLocation(link2, location2, event) {
      return dispatch("turbo:click", {
        target: link2,
        detail: { url: location2.href, originalEvent: event },
        cancelable: true
      });
    }
    notifyApplicationBeforeVisitingLocation(location2) {
      return dispatch("turbo:before-visit", {
        detail: { url: location2.href },
        cancelable: true
      });
    }
    notifyApplicationAfterVisitingLocation(location2, action) {
      return dispatch("turbo:visit", { detail: { url: location2.href, action } });
    }
    notifyApplicationBeforeCachingSnapshot() {
      return dispatch("turbo:before-cache");
    }
    notifyApplicationBeforeRender(newBody, options2) {
      return dispatch("turbo:before-render", {
        detail: Object.assign({ newBody }, options2),
        cancelable: true
      });
    }
    notifyApplicationAfterRender() {
      return dispatch("turbo:render");
    }
    notifyApplicationAfterPageLoad(timing = {}) {
      return dispatch("turbo:load", {
        detail: { url: this.location.href, timing }
      });
    }
    notifyApplicationAfterVisitingSamePageLocation(oldURL, newURL) {
      dispatchEvent(new HashChangeEvent("hashchange", {
        oldURL: oldURL.toString(),
        newURL: newURL.toString()
      }));
    }
    notifyApplicationAfterFrameLoad(frame) {
      return dispatch("turbo:frame-load", { target: frame });
    }
    notifyApplicationAfterFrameRender(fetchResponse, frame) {
      return dispatch("turbo:frame-render", {
        detail: { fetchResponse },
        target: frame,
        cancelable: true
      });
    }
    submissionIsNavigatable(form2, submitter) {
      if (this.formMode == "off") {
        return false;
      } else {
        const submitterIsNavigatable = submitter ? this.elementIsNavigatable(submitter) : true;
        if (this.formMode == "optin") {
          return submitterIsNavigatable && form2.closest('[data-turbo="true"]') != null;
        } else {
          return submitterIsNavigatable && this.elementIsNavigatable(form2);
        }
      }
    }
    elementIsNavigatable(element) {
      const container = element.closest("[data-turbo]");
      const withinFrame = element.closest("turbo-frame");
      if (this.drive || withinFrame) {
        if (container) {
          return container.getAttribute("data-turbo") != "false";
        } else {
          return true;
        }
      } else {
        if (container) {
          return container.getAttribute("data-turbo") == "true";
        } else {
          return false;
        }
      }
    }
    getActionForLink(link2) {
      const action = link2.getAttribute("data-turbo-action");
      return isAction(action) ? action : "advance";
    }
    get snapshot() {
      return this.view.snapshot;
    }
  };
  function extendURLWithDeprecatedProperties(url2) {
    Object.defineProperties(url2, deprecatedLocationPropertyDescriptors);
  }
  var deprecatedLocationPropertyDescriptors = {
    absoluteURL: {
      get() {
        return this.toString();
      }
    }
  };
  var Cache = class {
    constructor(session2) {
      this.session = session2;
    }
    clear() {
      this.session.clearCache();
    }
    resetCacheControl() {
      this.setCacheControl("");
    }
    exemptPageFromCache() {
      this.setCacheControl("no-cache");
    }
    exemptPageFromPreview() {
      this.setCacheControl("no-preview");
    }
    setCacheControl(value) {
      setMetaContent("turbo-cache-control", value);
    }
  };
  var StreamActions = {
    after() {
      this.targetElements.forEach((e) => {
        var _a2;
        return (_a2 = e.parentElement) === null || _a2 === void 0 ? void 0 : _a2.insertBefore(this.templateContent, e.nextSibling);
      });
    },
    append() {
      this.removeDuplicateTargetChildren();
      this.targetElements.forEach((e) => e.append(this.templateContent));
    },
    before() {
      this.targetElements.forEach((e) => {
        var _a2;
        return (_a2 = e.parentElement) === null || _a2 === void 0 ? void 0 : _a2.insertBefore(this.templateContent, e);
      });
    },
    prepend() {
      this.removeDuplicateTargetChildren();
      this.targetElements.forEach((e) => e.prepend(this.templateContent));
    },
    remove() {
      this.targetElements.forEach((e) => e.remove());
    },
    replace() {
      this.targetElements.forEach((e) => e.replaceWith(this.templateContent));
    },
    update() {
      this.targetElements.forEach((e) => e.replaceChildren(this.templateContent));
    }
  };
  var session = new Session();
  var cache = new Cache(session);
  var { navigator: navigator$1 } = session;
  function start() {
    session.start();
  }
  function registerAdapter(adapter) {
    session.registerAdapter(adapter);
  }
  function visit(location2, options2) {
    session.visit(location2, options2);
  }
  function connectStreamSource(source) {
    session.connectStreamSource(source);
  }
  function disconnectStreamSource(source) {
    session.disconnectStreamSource(source);
  }
  function renderStreamMessage(message) {
    session.renderStreamMessage(message);
  }
  function clearCache() {
    console.warn("Please replace `Turbo.clearCache()` with `Turbo.cache.clear()`. The top-level function is deprecated and will be removed in a future version of Turbo.`");
    session.clearCache();
  }
  function setProgressBarDelay(delay) {
    session.setProgressBarDelay(delay);
  }
  function setConfirmMethod(confirmMethod) {
    FormSubmission.confirmMethod = confirmMethod;
  }
  function setFormMode(mode) {
    session.setFormMode(mode);
  }
  var Turbo = /* @__PURE__ */ Object.freeze({
    __proto__: null,
    navigator: navigator$1,
    session,
    cache,
    PageRenderer,
    PageSnapshot,
    FrameRenderer,
    start,
    registerAdapter,
    visit,
    connectStreamSource,
    disconnectStreamSource,
    renderStreamMessage,
    clearCache,
    setProgressBarDelay,
    setConfirmMethod,
    setFormMode,
    StreamActions
  });
  var FrameController = class {
    constructor(element) {
      this.fetchResponseLoaded = (_fetchResponse) => {
      };
      this.currentFetchRequest = null;
      this.resolveVisitPromise = () => {
      };
      this.connected = false;
      this.hasBeenLoaded = false;
      this.ignoredAttributes = /* @__PURE__ */ new Set();
      this.action = null;
      this.visitCachedSnapshot = ({ element: element2 }) => {
        const frame = element2.querySelector("#" + this.element.id);
        if (frame && this.previousFrameElement) {
          frame.replaceChildren(...this.previousFrameElement.children);
        }
        delete this.previousFrameElement;
      };
      this.element = element;
      this.view = new FrameView(this, this.element);
      this.appearanceObserver = new AppearanceObserver(this, this.element);
      this.formLinkClickObserver = new FormLinkClickObserver(this, this.element);
      this.linkClickObserver = new LinkClickObserver(this, this.element);
      this.restorationIdentifier = uuid();
      this.formSubmitObserver = new FormSubmitObserver(this, this.element);
    }
    connect() {
      if (!this.connected) {
        this.connected = true;
        if (this.loadingStyle == FrameLoadingStyle.lazy) {
          this.appearanceObserver.start();
        } else {
          this.loadSourceURL();
        }
        this.formLinkClickObserver.start();
        this.linkClickObserver.start();
        this.formSubmitObserver.start();
      }
    }
    disconnect() {
      if (this.connected) {
        this.connected = false;
        this.appearanceObserver.stop();
        this.formLinkClickObserver.stop();
        this.linkClickObserver.stop();
        this.formSubmitObserver.stop();
      }
    }
    disabledChanged() {
      if (this.loadingStyle == FrameLoadingStyle.eager) {
        this.loadSourceURL();
      }
    }
    sourceURLChanged() {
      if (this.isIgnoringChangesTo("src"))
        return;
      if (this.element.isConnected) {
        this.complete = false;
      }
      if (this.loadingStyle == FrameLoadingStyle.eager || this.hasBeenLoaded) {
        this.loadSourceURL();
      }
    }
    completeChanged() {
      if (this.isIgnoringChangesTo("complete"))
        return;
      this.loadSourceURL();
    }
    loadingStyleChanged() {
      if (this.loadingStyle == FrameLoadingStyle.lazy) {
        this.appearanceObserver.start();
      } else {
        this.appearanceObserver.stop();
        this.loadSourceURL();
      }
    }
    async loadSourceURL() {
      if (this.enabled && this.isActive && !this.complete && this.sourceURL) {
        this.element.loaded = this.visit(expandURL(this.sourceURL));
        this.appearanceObserver.stop();
        await this.element.loaded;
        this.hasBeenLoaded = true;
      }
    }
    async loadResponse(fetchResponse) {
      if (fetchResponse.redirected || fetchResponse.succeeded && fetchResponse.isHTML) {
        this.sourceURL = fetchResponse.response.url;
      }
      try {
        const html2 = await fetchResponse.responseHTML;
        if (html2) {
          const { body } = parseHTMLDocument(html2);
          const newFrameElement = await this.extractForeignFrameElement(body);
          if (newFrameElement) {
            const snapshot = new Snapshot(newFrameElement);
            const renderer = new FrameRenderer(this, this.view.snapshot, snapshot, FrameRenderer.renderElement, false, false);
            if (this.view.renderPromise)
              await this.view.renderPromise;
            this.changeHistory();
            await this.view.render(renderer);
            this.complete = true;
            session.frameRendered(fetchResponse, this.element);
            session.frameLoaded(this.element);
            this.fetchResponseLoaded(fetchResponse);
          } else if (this.willHandleFrameMissingFromResponse(fetchResponse)) {
            console.warn(`A matching frame for #${this.element.id} was missing from the response, transforming into full-page Visit.`);
            this.visitResponse(fetchResponse.response);
          }
        }
      } catch (error4) {
        console.error(error4);
        this.view.invalidate();
      } finally {
        this.fetchResponseLoaded = () => {
        };
      }
    }
    elementAppearedInViewport(_element) {
      this.loadSourceURL();
    }
    willSubmitFormLinkToLocation(link2) {
      return link2.closest("turbo-frame") == this.element && this.shouldInterceptNavigation(link2);
    }
    submittedFormLinkToLocation(link2, _location, form2) {
      const frame = this.findFrameElement(link2);
      if (frame)
        form2.setAttribute("data-turbo-frame", frame.id);
    }
    willFollowLinkToLocation(element, location2, event) {
      return this.shouldInterceptNavigation(element) && this.frameAllowsVisitingLocation(element, location2, event);
    }
    followedLinkToLocation(element, location2) {
      this.navigateFrame(element, location2.href);
    }
    willSubmitForm(element, submitter) {
      return element.closest("turbo-frame") == this.element && this.shouldInterceptNavigation(element, submitter);
    }
    formSubmitted(element, submitter) {
      if (this.formSubmission) {
        this.formSubmission.stop();
      }
      this.formSubmission = new FormSubmission(this, element, submitter);
      const { fetchRequest } = this.formSubmission;
      this.prepareHeadersForRequest(fetchRequest.headers, fetchRequest);
      this.formSubmission.start();
    }
    prepareHeadersForRequest(headers, request2) {
      var _a2;
      headers["Turbo-Frame"] = this.id;
      if ((_a2 = this.currentNavigationElement) === null || _a2 === void 0 ? void 0 : _a2.hasAttribute("data-turbo-stream")) {
        request2.acceptResponseType(StreamMessage.contentType);
      }
    }
    requestStarted(_request) {
      markAsBusy(this.element);
    }
    requestPreventedHandlingResponse(_request, _response) {
      this.resolveVisitPromise();
    }
    async requestSucceededWithResponse(request2, response) {
      await this.loadResponse(response);
      this.resolveVisitPromise();
    }
    async requestFailedWithResponse(request2, response) {
      console.error(response);
      await this.loadResponse(response);
      this.resolveVisitPromise();
    }
    requestErrored(request2, error4) {
      console.error(error4);
      this.resolveVisitPromise();
    }
    requestFinished(_request) {
      clearBusyState(this.element);
    }
    formSubmissionStarted({ formElement }) {
      markAsBusy(formElement, this.findFrameElement(formElement));
    }
    formSubmissionSucceededWithResponse(formSubmission, response) {
      const frame = this.findFrameElement(formSubmission.formElement, formSubmission.submitter);
      this.proposeVisitIfNavigatedWithAction(frame, formSubmission.formElement, formSubmission.submitter);
      frame.delegate.loadResponse(response);
    }
    formSubmissionFailedWithResponse(formSubmission, fetchResponse) {
      this.element.delegate.loadResponse(fetchResponse);
    }
    formSubmissionErrored(formSubmission, error4) {
      console.error(error4);
    }
    formSubmissionFinished({ formElement }) {
      clearBusyState(formElement, this.findFrameElement(formElement));
    }
    allowsImmediateRender({ element: newFrame }, options2) {
      const event = dispatch("turbo:before-frame-render", {
        target: this.element,
        detail: Object.assign({ newFrame }, options2),
        cancelable: true
      });
      const { defaultPrevented, detail: { render } } = event;
      if (this.view.renderer && render) {
        this.view.renderer.renderElement = render;
      }
      return !defaultPrevented;
    }
    viewRenderedSnapshot(_snapshot, _isPreview) {
    }
    preloadOnLoadLinksForView(element) {
      session.preloadOnLoadLinksForView(element);
    }
    viewInvalidated() {
    }
    willRenderFrame(currentElement, _newElement) {
      this.previousFrameElement = currentElement.cloneNode(true);
    }
    async visit(url2) {
      var _a2;
      const request2 = new FetchRequest(this, FetchMethod.get, url2, new URLSearchParams(), this.element);
      (_a2 = this.currentFetchRequest) === null || _a2 === void 0 ? void 0 : _a2.cancel();
      this.currentFetchRequest = request2;
      return new Promise((resolve) => {
        this.resolveVisitPromise = () => {
          this.resolveVisitPromise = () => {
          };
          this.currentFetchRequest = null;
          resolve();
        };
        request2.perform();
      });
    }
    navigateFrame(element, url2, submitter) {
      const frame = this.findFrameElement(element, submitter);
      this.proposeVisitIfNavigatedWithAction(frame, element, submitter);
      this.withCurrentNavigationElement(element, () => {
        frame.src = url2;
      });
    }
    proposeVisitIfNavigatedWithAction(frame, element, submitter) {
      this.action = getVisitAction(submitter, element, frame);
      this.frame = frame;
      if (isAction(this.action)) {
        const { visitCachedSnapshot } = frame.delegate;
        frame.delegate.fetchResponseLoaded = (fetchResponse) => {
          if (frame.src) {
            const { statusCode, redirected } = fetchResponse;
            const responseHTML = frame.ownerDocument.documentElement.outerHTML;
            const response = { statusCode, redirected, responseHTML };
            const options2 = {
              response,
              visitCachedSnapshot,
              willRender: false,
              updateHistory: false,
              restorationIdentifier: this.restorationIdentifier
            };
            if (this.action)
              options2.action = this.action;
            session.visit(frame.src, options2);
          }
        };
      }
    }
    changeHistory() {
      if (this.action && this.frame) {
        const method2 = getHistoryMethodForAction(this.action);
        session.history.update(method2, expandURL(this.frame.src || ""), this.restorationIdentifier);
      }
    }
    willHandleFrameMissingFromResponse(fetchResponse) {
      this.element.setAttribute("complete", "");
      const response = fetchResponse.response;
      const visit2 = async (url2, options2 = {}) => {
        if (url2 instanceof Response) {
          this.visitResponse(url2);
        } else {
          session.visit(url2, options2);
        }
      };
      const event = dispatch("turbo:frame-missing", {
        target: this.element,
        detail: { response, visit: visit2 },
        cancelable: true
      });
      return !event.defaultPrevented;
    }
    async visitResponse(response) {
      const wrapped = new FetchResponse(response);
      const responseHTML = await wrapped.responseHTML;
      const { location: location2, redirected, statusCode } = wrapped;
      return session.visit(location2, { response: { redirected, statusCode, responseHTML } });
    }
    findFrameElement(element, submitter) {
      var _a2;
      const id2 = getAttribute("data-turbo-frame", submitter, element) || this.element.getAttribute("target");
      return (_a2 = getFrameElementById(id2)) !== null && _a2 !== void 0 ? _a2 : this.element;
    }
    async extractForeignFrameElement(container) {
      let element;
      const id2 = CSS.escape(this.id);
      try {
        element = activateElement(container.querySelector(`turbo-frame#${id2}`), this.sourceURL);
        if (element) {
          return element;
        }
        element = activateElement(container.querySelector(`turbo-frame[src][recurse~=${id2}]`), this.sourceURL);
        if (element) {
          await element.loaded;
          return await this.extractForeignFrameElement(element);
        }
      } catch (error4) {
        console.error(error4);
        return new FrameElement();
      }
      return null;
    }
    formActionIsVisitable(form2, submitter) {
      const action = getAction(form2, submitter);
      return locationIsVisitable(expandURL(action), this.rootLocation);
    }
    shouldInterceptNavigation(element, submitter) {
      const id2 = getAttribute("data-turbo-frame", submitter, element) || this.element.getAttribute("target");
      if (element instanceof HTMLFormElement && !this.formActionIsVisitable(element, submitter)) {
        return false;
      }
      if (!this.enabled || id2 == "_top") {
        return false;
      }
      if (id2) {
        const frameElement = getFrameElementById(id2);
        if (frameElement) {
          return !frameElement.disabled;
        }
      }
      if (!session.elementIsNavigatable(element)) {
        return false;
      }
      if (submitter && !session.elementIsNavigatable(submitter)) {
        return false;
      }
      return true;
    }
    get id() {
      return this.element.id;
    }
    get enabled() {
      return !this.element.disabled;
    }
    get sourceURL() {
      if (this.element.src) {
        return this.element.src;
      }
    }
    set sourceURL(sourceURL) {
      this.ignoringChangesToAttribute("src", () => {
        this.element.src = sourceURL !== null && sourceURL !== void 0 ? sourceURL : null;
      });
    }
    get loadingStyle() {
      return this.element.loading;
    }
    get isLoading() {
      return this.formSubmission !== void 0 || this.resolveVisitPromise() !== void 0;
    }
    get complete() {
      return this.element.hasAttribute("complete");
    }
    set complete(value) {
      this.ignoringChangesToAttribute("complete", () => {
        if (value) {
          this.element.setAttribute("complete", "");
        } else {
          this.element.removeAttribute("complete");
        }
      });
    }
    get isActive() {
      return this.element.isActive && this.connected;
    }
    get rootLocation() {
      var _a2;
      const meta = this.element.ownerDocument.querySelector(`meta[name="turbo-root"]`);
      const root = (_a2 = meta === null || meta === void 0 ? void 0 : meta.content) !== null && _a2 !== void 0 ? _a2 : "/";
      return expandURL(root);
    }
    frameAllowsVisitingLocation(target, { href: url2 }, originalEvent) {
      const event = dispatch("turbo:click", {
        target,
        detail: { url: url2, originalEvent },
        cancelable: true
      });
      return !event.defaultPrevented;
    }
    isIgnoringChangesTo(attributeName) {
      return this.ignoredAttributes.has(attributeName);
    }
    ignoringChangesToAttribute(attributeName, callback) {
      this.ignoredAttributes.add(attributeName);
      callback();
      this.ignoredAttributes.delete(attributeName);
    }
    withCurrentNavigationElement(element, callback) {
      this.currentNavigationElement = element;
      callback();
      delete this.currentNavigationElement;
    }
  };
  function getFrameElementById(id2) {
    if (id2 != null) {
      const element = document.getElementById(id2);
      if (element instanceof FrameElement) {
        return element;
      }
    }
  }
  function activateElement(element, currentURL) {
    if (element) {
      const src = element.getAttribute("src");
      if (src != null && currentURL != null && urlsAreEqual(src, currentURL)) {
        throw new Error(`Matching <turbo-frame id="${element.id}"> element has a source URL which references itself`);
      }
      if (element.ownerDocument !== document) {
        element = document.importNode(element, true);
      }
      if (element instanceof FrameElement) {
        element.connectedCallback();
        element.disconnectedCallback();
        return element;
      }
    }
  }
  var StreamElement = class extends HTMLElement {
    static async renderElement(newElement) {
      await newElement.performAction();
    }
    async connectedCallback() {
      try {
        await this.render();
      } catch (error4) {
        console.error(error4);
      } finally {
        this.disconnect();
      }
    }
    async render() {
      var _a2;
      return (_a2 = this.renderPromise) !== null && _a2 !== void 0 ? _a2 : this.renderPromise = (async () => {
        const event = this.beforeRenderEvent;
        if (this.dispatchEvent(event)) {
          await nextAnimationFrame();
          await event.detail.render(this);
        }
      })();
    }
    disconnect() {
      try {
        this.remove();
      } catch (_a2) {
      }
    }
    removeDuplicateTargetChildren() {
      this.duplicateChildren.forEach((c) => c.remove());
    }
    get duplicateChildren() {
      var _a2;
      const existingChildren = this.targetElements.flatMap((e) => [...e.children]).filter((c) => !!c.id);
      const newChildrenIds = [...((_a2 = this.templateContent) === null || _a2 === void 0 ? void 0 : _a2.children) || []].filter((c) => !!c.id).map((c) => c.id);
      return existingChildren.filter((c) => newChildrenIds.includes(c.id));
    }
    get performAction() {
      if (this.action) {
        const actionFunction = StreamActions[this.action];
        if (actionFunction) {
          return actionFunction;
        }
        this.raise("unknown action");
      }
      this.raise("action attribute is missing");
    }
    get targetElements() {
      if (this.target) {
        return this.targetElementsById;
      } else if (this.targets) {
        return this.targetElementsByQuery;
      } else {
        this.raise("target or targets attribute is missing");
      }
    }
    get templateContent() {
      return this.templateElement.content.cloneNode(true);
    }
    get templateElement() {
      if (this.firstElementChild === null) {
        const template2 = this.ownerDocument.createElement("template");
        this.appendChild(template2);
        return template2;
      } else if (this.firstElementChild instanceof HTMLTemplateElement) {
        return this.firstElementChild;
      }
      this.raise("first child element must be a <template> element");
    }
    get action() {
      return this.getAttribute("action");
    }
    get target() {
      return this.getAttribute("target");
    }
    get targets() {
      return this.getAttribute("targets");
    }
    raise(message) {
      throw new Error(`${this.description}: ${message}`);
    }
    get description() {
      var _a2, _b;
      return (_b = ((_a2 = this.outerHTML.match(/<[^>]+>/)) !== null && _a2 !== void 0 ? _a2 : [])[0]) !== null && _b !== void 0 ? _b : "<turbo-stream>";
    }
    get beforeRenderEvent() {
      return new CustomEvent("turbo:before-stream-render", {
        bubbles: true,
        cancelable: true,
        detail: { newStream: this, render: StreamElement.renderElement }
      });
    }
    get targetElementsById() {
      var _a2;
      const element = (_a2 = this.ownerDocument) === null || _a2 === void 0 ? void 0 : _a2.getElementById(this.target);
      if (element !== null) {
        return [element];
      } else {
        return [];
      }
    }
    get targetElementsByQuery() {
      var _a2;
      const elements = (_a2 = this.ownerDocument) === null || _a2 === void 0 ? void 0 : _a2.querySelectorAll(this.targets);
      if (elements.length !== 0) {
        return Array.prototype.slice.call(elements);
      } else {
        return [];
      }
    }
  };
  var StreamSourceElement = class extends HTMLElement {
    constructor() {
      super(...arguments);
      this.streamSource = null;
    }
    connectedCallback() {
      this.streamSource = this.src.match(/^ws{1,2}:/) ? new WebSocket(this.src) : new EventSource(this.src);
      connectStreamSource(this.streamSource);
    }
    disconnectedCallback() {
      if (this.streamSource) {
        disconnectStreamSource(this.streamSource);
      }
    }
    get src() {
      return this.getAttribute("src") || "";
    }
  };
  FrameElement.delegateConstructor = FrameController;
  if (customElements.get("turbo-frame") === void 0) {
    customElements.define("turbo-frame", FrameElement);
  }
  if (customElements.get("turbo-stream") === void 0) {
    customElements.define("turbo-stream", StreamElement);
  }
  if (customElements.get("turbo-stream-source") === void 0) {
    customElements.define("turbo-stream-source", StreamSourceElement);
  }
  (() => {
    let element = document.currentScript;
    if (!element)
      return;
    if (element.hasAttribute("data-turbo-suppress-warning"))
      return;
    element = element.parentElement;
    while (element) {
      if (element == document.body) {
        return console.warn(unindent`
        You are loading Turbo from a <script> element inside the <body> element. This is probably not what you meant to do!

        Load your application’s JavaScript bundle inside the <head> element instead. <script> elements in <body> are evaluated with each page change.

        For more information, see: https://turbo.hotwired.dev/handbook/building#working-with-script-elements

        ——
        Suppress this warning by adding a "data-turbo-suppress-warning" attribute to: %s
      `, element.outerHTML);
      }
      element = element.parentElement;
    }
  })();
  window.Turbo = Turbo;
  start();

  // ../../node_modules/@hotwired/turbo-rails/app/javascript/turbo/cable.js
  var consumer;
  async function getConsumer() {
    return consumer || setConsumer(createConsumer2().then(setConsumer));
  }
  function setConsumer(newConsumer) {
    return consumer = newConsumer;
  }
  async function createConsumer2() {
    const { createConsumer: createConsumer4 } = await Promise.resolve().then(() => (init_src(), src_exports));
    return createConsumer4();
  }
  async function subscribeTo(channel, mixin) {
    const { subscriptions } = await getConsumer();
    return subscriptions.create(channel, mixin);
  }

  // ../../node_modules/@hotwired/turbo-rails/app/javascript/turbo/snakeize.js
  function walk(obj) {
    if (!obj || typeof obj !== "object")
      return obj;
    if (obj instanceof Date || obj instanceof RegExp)
      return obj;
    if (Array.isArray(obj))
      return obj.map(walk);
    return Object.keys(obj).reduce(function(acc, key) {
      var camel = key[0].toLowerCase() + key.slice(1).replace(/([A-Z]+)/g, function(m2, x) {
        return "_" + x.toLowerCase();
      });
      acc[camel] = walk(obj[key]);
      return acc;
    }, {});
  }

  // ../../node_modules/@hotwired/turbo-rails/app/javascript/turbo/cable_stream_source_element.js
  var TurboCableStreamSourceElement = class extends HTMLElement {
    async connectedCallback() {
      connectStreamSource(this);
      this.subscription = await subscribeTo(this.channel, { received: this.dispatchMessageEvent.bind(this) });
    }
    disconnectedCallback() {
      disconnectStreamSource(this);
      if (this.subscription)
        this.subscription.unsubscribe();
    }
    dispatchMessageEvent(data2) {
      const event = new MessageEvent("message", { data: data2 });
      return this.dispatchEvent(event);
    }
    get channel() {
      const channel = this.getAttribute("channel");
      const signed_stream_name = this.getAttribute("signed-stream-name");
      return { channel, signed_stream_name, ...walk({ ...this.dataset }) };
    }
  };
  customElements.define("turbo-cable-stream-source", TurboCableStreamSourceElement);

  // ../../node_modules/@hotwired/turbo-rails/app/javascript/turbo/fetch_requests.js
  function encodeMethodIntoRequestBody(event) {
    if (event.target instanceof HTMLFormElement) {
      const { target: form2, detail: { fetchOptions } } = event;
      form2.addEventListener("turbo:submit-start", ({ detail: { formSubmission: { submitter } } }) => {
        const method2 = submitter && submitter.formMethod || fetchOptions.body && fetchOptions.body.get("_method") || form2.getAttribute("method");
        if (!/get/i.test(method2)) {
          if (/post/i.test(method2)) {
            fetchOptions.body.delete("_method");
          } else {
            fetchOptions.body.set("_method", method2);
          }
          fetchOptions.method = "post";
        }
      }, { once: true });
    }
  }

  // ../../node_modules/@hotwired/turbo-rails/app/javascript/turbo/index.js
  addEventListener("turbo:before-fetch-request", encodeMethodIntoRequestBody);

  // ../../node_modules/@hotwired/stimulus/dist/stimulus.js
  var EventListener = class {
    constructor(eventTarget, eventName, eventOptions) {
      this.eventTarget = eventTarget;
      this.eventName = eventName;
      this.eventOptions = eventOptions;
      this.unorderedBindings = /* @__PURE__ */ new Set();
    }
    connect() {
      this.eventTarget.addEventListener(this.eventName, this, this.eventOptions);
    }
    disconnect() {
      this.eventTarget.removeEventListener(this.eventName, this, this.eventOptions);
    }
    bindingConnected(binding) {
      this.unorderedBindings.add(binding);
    }
    bindingDisconnected(binding) {
      this.unorderedBindings.delete(binding);
    }
    handleEvent(event) {
      const extendedEvent = extendEvent(event);
      for (const binding of this.bindings) {
        if (extendedEvent.immediatePropagationStopped) {
          break;
        } else {
          binding.handleEvent(extendedEvent);
        }
      }
    }
    get bindings() {
      return Array.from(this.unorderedBindings).sort((left, right) => {
        const leftIndex = left.index, rightIndex = right.index;
        return leftIndex < rightIndex ? -1 : leftIndex > rightIndex ? 1 : 0;
      });
    }
  };
  function extendEvent(event) {
    if ("immediatePropagationStopped" in event) {
      return event;
    } else {
      const { stopImmediatePropagation } = event;
      return Object.assign(event, {
        immediatePropagationStopped: false,
        stopImmediatePropagation() {
          this.immediatePropagationStopped = true;
          stopImmediatePropagation.call(this);
        }
      });
    }
  }
  var Dispatcher = class {
    constructor(application2) {
      this.application = application2;
      this.eventListenerMaps = /* @__PURE__ */ new Map();
      this.started = false;
    }
    start() {
      if (!this.started) {
        this.started = true;
        this.eventListeners.forEach((eventListener) => eventListener.connect());
      }
    }
    stop() {
      if (this.started) {
        this.started = false;
        this.eventListeners.forEach((eventListener) => eventListener.disconnect());
      }
    }
    get eventListeners() {
      return Array.from(this.eventListenerMaps.values()).reduce((listeners, map) => listeners.concat(Array.from(map.values())), []);
    }
    bindingConnected(binding) {
      this.fetchEventListenerForBinding(binding).bindingConnected(binding);
    }
    bindingDisconnected(binding) {
      this.fetchEventListenerForBinding(binding).bindingDisconnected(binding);
    }
    handleError(error4, message, detail = {}) {
      this.application.handleError(error4, `Error ${message}`, detail);
    }
    fetchEventListenerForBinding(binding) {
      const { eventTarget, eventName, eventOptions } = binding;
      return this.fetchEventListener(eventTarget, eventName, eventOptions);
    }
    fetchEventListener(eventTarget, eventName, eventOptions) {
      const eventListenerMap = this.fetchEventListenerMapForEventTarget(eventTarget);
      const cacheKey = this.cacheKey(eventName, eventOptions);
      let eventListener = eventListenerMap.get(cacheKey);
      if (!eventListener) {
        eventListener = this.createEventListener(eventTarget, eventName, eventOptions);
        eventListenerMap.set(cacheKey, eventListener);
      }
      return eventListener;
    }
    createEventListener(eventTarget, eventName, eventOptions) {
      const eventListener = new EventListener(eventTarget, eventName, eventOptions);
      if (this.started) {
        eventListener.connect();
      }
      return eventListener;
    }
    fetchEventListenerMapForEventTarget(eventTarget) {
      let eventListenerMap = this.eventListenerMaps.get(eventTarget);
      if (!eventListenerMap) {
        eventListenerMap = /* @__PURE__ */ new Map();
        this.eventListenerMaps.set(eventTarget, eventListenerMap);
      }
      return eventListenerMap;
    }
    cacheKey(eventName, eventOptions) {
      const parts = [eventName];
      Object.keys(eventOptions).sort().forEach((key) => {
        parts.push(`${eventOptions[key] ? "" : "!"}${key}`);
      });
      return parts.join(":");
    }
  };
  var descriptorPattern = /^((.+?)(@(window|document))?->)?(.+?)(#([^:]+?))(:(.+))?$/;
  function parseActionDescriptorString(descriptorString) {
    const source = descriptorString.trim();
    const matches2 = source.match(descriptorPattern) || [];
    return {
      eventTarget: parseEventTarget(matches2[4]),
      eventName: matches2[2],
      eventOptions: matches2[9] ? parseEventOptions(matches2[9]) : {},
      identifier: matches2[5],
      methodName: matches2[7]
    };
  }
  function parseEventTarget(eventTargetName) {
    if (eventTargetName == "window") {
      return window;
    } else if (eventTargetName == "document") {
      return document;
    }
  }
  function parseEventOptions(eventOptions) {
    return eventOptions.split(":").reduce((options2, token) => Object.assign(options2, { [token.replace(/^!/, "")]: !/^!/.test(token) }), {});
  }
  function stringifyEventTarget(eventTarget) {
    if (eventTarget == window) {
      return "window";
    } else if (eventTarget == document) {
      return "document";
    }
  }
  function camelize(value) {
    return value.replace(/(?:[_-])([a-z0-9])/g, (_2, char) => char.toUpperCase());
  }
  function capitalize(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
  function dasherize(value) {
    return value.replace(/([A-Z])/g, (_2, char) => `-${char.toLowerCase()}`);
  }
  function tokenize(value) {
    return value.match(/[^\s]+/g) || [];
  }
  var Action = class {
    constructor(element, index, descriptor) {
      this.element = element;
      this.index = index;
      this.eventTarget = descriptor.eventTarget || element;
      this.eventName = descriptor.eventName || getDefaultEventNameForElement(element) || error("missing event name");
      this.eventOptions = descriptor.eventOptions || {};
      this.identifier = descriptor.identifier || error("missing identifier");
      this.methodName = descriptor.methodName || error("missing method name");
    }
    static forToken(token) {
      return new this(token.element, token.index, parseActionDescriptorString(token.content));
    }
    toString() {
      const eventNameSuffix = this.eventTargetName ? `@${this.eventTargetName}` : "";
      return `${this.eventName}${eventNameSuffix}->${this.identifier}#${this.methodName}`;
    }
    get params() {
      const params2 = {};
      const pattern = new RegExp(`^data-${this.identifier}-(.+)-param$`);
      for (const { name, value } of Array.from(this.element.attributes)) {
        const match2 = name.match(pattern);
        const key = match2 && match2[1];
        if (key) {
          params2[camelize(key)] = typecast(value);
        }
      }
      return params2;
    }
    get eventTargetName() {
      return stringifyEventTarget(this.eventTarget);
    }
  };
  var defaultEventNames = {
    "a": (e) => "click",
    "button": (e) => "click",
    "form": (e) => "submit",
    "details": (e) => "toggle",
    "input": (e) => e.getAttribute("type") == "submit" ? "click" : "input",
    "select": (e) => "change",
    "textarea": (e) => "input"
  };
  function getDefaultEventNameForElement(element) {
    const tagName2 = element.tagName.toLowerCase();
    if (tagName2 in defaultEventNames) {
      return defaultEventNames[tagName2](element);
    }
  }
  function error(message) {
    throw new Error(message);
  }
  function typecast(value) {
    try {
      return JSON.parse(value);
    } catch (o_O) {
      return value;
    }
  }
  var Binding = class {
    constructor(context, action) {
      this.context = context;
      this.action = action;
    }
    get index() {
      return this.action.index;
    }
    get eventTarget() {
      return this.action.eventTarget;
    }
    get eventOptions() {
      return this.action.eventOptions;
    }
    get identifier() {
      return this.context.identifier;
    }
    handleEvent(event) {
      if (this.willBeInvokedByEvent(event) && this.shouldBeInvokedPerSelf(event)) {
        this.processStopPropagation(event);
        this.processPreventDefault(event);
        this.invokeWithEvent(event);
      }
    }
    get eventName() {
      return this.action.eventName;
    }
    get method() {
      const method2 = this.controller[this.methodName];
      if (typeof method2 == "function") {
        return method2;
      }
      throw new Error(`Action "${this.action}" references undefined method "${this.methodName}"`);
    }
    processStopPropagation(event) {
      if (this.eventOptions.stop) {
        event.stopPropagation();
      }
    }
    processPreventDefault(event) {
      if (this.eventOptions.prevent) {
        event.preventDefault();
      }
    }
    invokeWithEvent(event) {
      const { target, currentTarget } = event;
      try {
        const { params: params2 } = this.action;
        const actionEvent = Object.assign(event, { params: params2 });
        this.method.call(this.controller, actionEvent);
        this.context.logDebugActivity(this.methodName, { event, target, currentTarget, action: this.methodName });
      } catch (error4) {
        const { identifier, controller, element, index } = this;
        const detail = { identifier, controller, element, index, event };
        this.context.handleError(error4, `invoking action "${this.action}"`, detail);
      }
    }
    shouldBeInvokedPerSelf(event) {
      if (this.action.eventOptions.self === true) {
        return this.action.element === event.target;
      } else {
        return true;
      }
    }
    willBeInvokedByEvent(event) {
      const eventTarget = event.target;
      if (this.element === eventTarget) {
        return true;
      } else if (eventTarget instanceof Element && this.element.contains(eventTarget)) {
        return this.scope.containsElement(eventTarget);
      } else {
        return this.scope.containsElement(this.action.element);
      }
    }
    get controller() {
      return this.context.controller;
    }
    get methodName() {
      return this.action.methodName;
    }
    get element() {
      return this.scope.element;
    }
    get scope() {
      return this.context.scope;
    }
  };
  var ElementObserver = class {
    constructor(element, delegate2) {
      this.mutationObserverInit = { attributes: true, childList: true, subtree: true };
      this.element = element;
      this.started = false;
      this.delegate = delegate2;
      this.elements = /* @__PURE__ */ new Set();
      this.mutationObserver = new MutationObserver((mutations) => this.processMutations(mutations));
    }
    start() {
      if (!this.started) {
        this.started = true;
        this.mutationObserver.observe(this.element, this.mutationObserverInit);
        this.refresh();
      }
    }
    pause(callback) {
      if (this.started) {
        this.mutationObserver.disconnect();
        this.started = false;
      }
      callback();
      if (!this.started) {
        this.mutationObserver.observe(this.element, this.mutationObserverInit);
        this.started = true;
      }
    }
    stop() {
      if (this.started) {
        this.mutationObserver.takeRecords();
        this.mutationObserver.disconnect();
        this.started = false;
      }
    }
    refresh() {
      if (this.started) {
        const matches2 = new Set(this.matchElementsInTree());
        for (const element of Array.from(this.elements)) {
          if (!matches2.has(element)) {
            this.removeElement(element);
          }
        }
        for (const element of Array.from(matches2)) {
          this.addElement(element);
        }
      }
    }
    processMutations(mutations) {
      if (this.started) {
        for (const mutation of mutations) {
          this.processMutation(mutation);
        }
      }
    }
    processMutation(mutation) {
      if (mutation.type == "attributes") {
        this.processAttributeChange(mutation.target, mutation.attributeName);
      } else if (mutation.type == "childList") {
        this.processRemovedNodes(mutation.removedNodes);
        this.processAddedNodes(mutation.addedNodes);
      }
    }
    processAttributeChange(node, attributeName) {
      const element = node;
      if (this.elements.has(element)) {
        if (this.delegate.elementAttributeChanged && this.matchElement(element)) {
          this.delegate.elementAttributeChanged(element, attributeName);
        } else {
          this.removeElement(element);
        }
      } else if (this.matchElement(element)) {
        this.addElement(element);
      }
    }
    processRemovedNodes(nodes) {
      for (const node of Array.from(nodes)) {
        const element = this.elementFromNode(node);
        if (element) {
          this.processTree(element, this.removeElement);
        }
      }
    }
    processAddedNodes(nodes) {
      for (const node of Array.from(nodes)) {
        const element = this.elementFromNode(node);
        if (element && this.elementIsActive(element)) {
          this.processTree(element, this.addElement);
        }
      }
    }
    matchElement(element) {
      return this.delegate.matchElement(element);
    }
    matchElementsInTree(tree = this.element) {
      return this.delegate.matchElementsInTree(tree);
    }
    processTree(tree, processor) {
      for (const element of this.matchElementsInTree(tree)) {
        processor.call(this, element);
      }
    }
    elementFromNode(node) {
      if (node.nodeType == Node.ELEMENT_NODE) {
        return node;
      }
    }
    elementIsActive(element) {
      if (element.isConnected != this.element.isConnected) {
        return false;
      } else {
        return this.element.contains(element);
      }
    }
    addElement(element) {
      if (!this.elements.has(element)) {
        if (this.elementIsActive(element)) {
          this.elements.add(element);
          if (this.delegate.elementMatched) {
            this.delegate.elementMatched(element);
          }
        }
      }
    }
    removeElement(element) {
      if (this.elements.has(element)) {
        this.elements.delete(element);
        if (this.delegate.elementUnmatched) {
          this.delegate.elementUnmatched(element);
        }
      }
    }
  };
  var AttributeObserver = class {
    constructor(element, attributeName, delegate2) {
      this.attributeName = attributeName;
      this.delegate = delegate2;
      this.elementObserver = new ElementObserver(element, this);
    }
    get element() {
      return this.elementObserver.element;
    }
    get selector() {
      return `[${this.attributeName}]`;
    }
    start() {
      this.elementObserver.start();
    }
    pause(callback) {
      this.elementObserver.pause(callback);
    }
    stop() {
      this.elementObserver.stop();
    }
    refresh() {
      this.elementObserver.refresh();
    }
    get started() {
      return this.elementObserver.started;
    }
    matchElement(element) {
      return element.hasAttribute(this.attributeName);
    }
    matchElementsInTree(tree) {
      const match2 = this.matchElement(tree) ? [tree] : [];
      const matches2 = Array.from(tree.querySelectorAll(this.selector));
      return match2.concat(matches2);
    }
    elementMatched(element) {
      if (this.delegate.elementMatchedAttribute) {
        this.delegate.elementMatchedAttribute(element, this.attributeName);
      }
    }
    elementUnmatched(element) {
      if (this.delegate.elementUnmatchedAttribute) {
        this.delegate.elementUnmatchedAttribute(element, this.attributeName);
      }
    }
    elementAttributeChanged(element, attributeName) {
      if (this.delegate.elementAttributeValueChanged && this.attributeName == attributeName) {
        this.delegate.elementAttributeValueChanged(element, attributeName);
      }
    }
  };
  var StringMapObserver = class {
    constructor(element, delegate2) {
      this.element = element;
      this.delegate = delegate2;
      this.started = false;
      this.stringMap = /* @__PURE__ */ new Map();
      this.mutationObserver = new MutationObserver((mutations) => this.processMutations(mutations));
    }
    start() {
      if (!this.started) {
        this.started = true;
        this.mutationObserver.observe(this.element, { attributes: true, attributeOldValue: true });
        this.refresh();
      }
    }
    stop() {
      if (this.started) {
        this.mutationObserver.takeRecords();
        this.mutationObserver.disconnect();
        this.started = false;
      }
    }
    refresh() {
      if (this.started) {
        for (const attributeName of this.knownAttributeNames) {
          this.refreshAttribute(attributeName, null);
        }
      }
    }
    processMutations(mutations) {
      if (this.started) {
        for (const mutation of mutations) {
          this.processMutation(mutation);
        }
      }
    }
    processMutation(mutation) {
      const attributeName = mutation.attributeName;
      if (attributeName) {
        this.refreshAttribute(attributeName, mutation.oldValue);
      }
    }
    refreshAttribute(attributeName, oldValue) {
      const key = this.delegate.getStringMapKeyForAttribute(attributeName);
      if (key != null) {
        if (!this.stringMap.has(attributeName)) {
          this.stringMapKeyAdded(key, attributeName);
        }
        const value = this.element.getAttribute(attributeName);
        if (this.stringMap.get(attributeName) != value) {
          this.stringMapValueChanged(value, key, oldValue);
        }
        if (value == null) {
          const oldValue2 = this.stringMap.get(attributeName);
          this.stringMap.delete(attributeName);
          if (oldValue2)
            this.stringMapKeyRemoved(key, attributeName, oldValue2);
        } else {
          this.stringMap.set(attributeName, value);
        }
      }
    }
    stringMapKeyAdded(key, attributeName) {
      if (this.delegate.stringMapKeyAdded) {
        this.delegate.stringMapKeyAdded(key, attributeName);
      }
    }
    stringMapValueChanged(value, key, oldValue) {
      if (this.delegate.stringMapValueChanged) {
        this.delegate.stringMapValueChanged(value, key, oldValue);
      }
    }
    stringMapKeyRemoved(key, attributeName, oldValue) {
      if (this.delegate.stringMapKeyRemoved) {
        this.delegate.stringMapKeyRemoved(key, attributeName, oldValue);
      }
    }
    get knownAttributeNames() {
      return Array.from(new Set(this.currentAttributeNames.concat(this.recordedAttributeNames)));
    }
    get currentAttributeNames() {
      return Array.from(this.element.attributes).map((attribute) => attribute.name);
    }
    get recordedAttributeNames() {
      return Array.from(this.stringMap.keys());
    }
  };
  function add(map, key, value) {
    fetch2(map, key).add(value);
  }
  function del(map, key, value) {
    fetch2(map, key).delete(value);
    prune(map, key);
  }
  function fetch2(map, key) {
    let values = map.get(key);
    if (!values) {
      values = /* @__PURE__ */ new Set();
      map.set(key, values);
    }
    return values;
  }
  function prune(map, key) {
    const values = map.get(key);
    if (values != null && values.size == 0) {
      map.delete(key);
    }
  }
  var Multimap = class {
    constructor() {
      this.valuesByKey = /* @__PURE__ */ new Map();
    }
    get keys() {
      return Array.from(this.valuesByKey.keys());
    }
    get values() {
      const sets = Array.from(this.valuesByKey.values());
      return sets.reduce((values, set) => values.concat(Array.from(set)), []);
    }
    get size() {
      const sets = Array.from(this.valuesByKey.values());
      return sets.reduce((size, set) => size + set.size, 0);
    }
    add(key, value) {
      add(this.valuesByKey, key, value);
    }
    delete(key, value) {
      del(this.valuesByKey, key, value);
    }
    has(key, value) {
      const values = this.valuesByKey.get(key);
      return values != null && values.has(value);
    }
    hasKey(key) {
      return this.valuesByKey.has(key);
    }
    hasValue(value) {
      const sets = Array.from(this.valuesByKey.values());
      return sets.some((set) => set.has(value));
    }
    getValuesForKey(key) {
      const values = this.valuesByKey.get(key);
      return values ? Array.from(values) : [];
    }
    getKeysForValue(value) {
      return Array.from(this.valuesByKey).filter(([key, values]) => values.has(value)).map(([key, values]) => key);
    }
  };
  var TokenListObserver = class {
    constructor(element, attributeName, delegate2) {
      this.attributeObserver = new AttributeObserver(element, attributeName, this);
      this.delegate = delegate2;
      this.tokensByElement = new Multimap();
    }
    get started() {
      return this.attributeObserver.started;
    }
    start() {
      this.attributeObserver.start();
    }
    pause(callback) {
      this.attributeObserver.pause(callback);
    }
    stop() {
      this.attributeObserver.stop();
    }
    refresh() {
      this.attributeObserver.refresh();
    }
    get element() {
      return this.attributeObserver.element;
    }
    get attributeName() {
      return this.attributeObserver.attributeName;
    }
    elementMatchedAttribute(element) {
      this.tokensMatched(this.readTokensForElement(element));
    }
    elementAttributeValueChanged(element) {
      const [unmatchedTokens, matchedTokens] = this.refreshTokensForElement(element);
      this.tokensUnmatched(unmatchedTokens);
      this.tokensMatched(matchedTokens);
    }
    elementUnmatchedAttribute(element) {
      this.tokensUnmatched(this.tokensByElement.getValuesForKey(element));
    }
    tokensMatched(tokens) {
      tokens.forEach((token) => this.tokenMatched(token));
    }
    tokensUnmatched(tokens) {
      tokens.forEach((token) => this.tokenUnmatched(token));
    }
    tokenMatched(token) {
      this.delegate.tokenMatched(token);
      this.tokensByElement.add(token.element, token);
    }
    tokenUnmatched(token) {
      this.delegate.tokenUnmatched(token);
      this.tokensByElement.delete(token.element, token);
    }
    refreshTokensForElement(element) {
      const previousTokens = this.tokensByElement.getValuesForKey(element);
      const currentTokens = this.readTokensForElement(element);
      const firstDifferingIndex = zip(previousTokens, currentTokens).findIndex(([previousToken, currentToken]) => !tokensAreEqual(previousToken, currentToken));
      if (firstDifferingIndex == -1) {
        return [[], []];
      } else {
        return [previousTokens.slice(firstDifferingIndex), currentTokens.slice(firstDifferingIndex)];
      }
    }
    readTokensForElement(element) {
      const attributeName = this.attributeName;
      const tokenString = element.getAttribute(attributeName) || "";
      return parseTokenString(tokenString, element, attributeName);
    }
  };
  function parseTokenString(tokenString, element, attributeName) {
    return tokenString.trim().split(/\s+/).filter((content) => content.length).map((content, index) => ({ element, attributeName, content, index }));
  }
  function zip(left, right) {
    const length = Math.max(left.length, right.length);
    return Array.from({ length }, (_2, index) => [left[index], right[index]]);
  }
  function tokensAreEqual(left, right) {
    return left && right && left.index == right.index && left.content == right.content;
  }
  var ValueListObserver = class {
    constructor(element, attributeName, delegate2) {
      this.tokenListObserver = new TokenListObserver(element, attributeName, this);
      this.delegate = delegate2;
      this.parseResultsByToken = /* @__PURE__ */ new WeakMap();
      this.valuesByTokenByElement = /* @__PURE__ */ new WeakMap();
    }
    get started() {
      return this.tokenListObserver.started;
    }
    start() {
      this.tokenListObserver.start();
    }
    stop() {
      this.tokenListObserver.stop();
    }
    refresh() {
      this.tokenListObserver.refresh();
    }
    get element() {
      return this.tokenListObserver.element;
    }
    get attributeName() {
      return this.tokenListObserver.attributeName;
    }
    tokenMatched(token) {
      const { element } = token;
      const { value } = this.fetchParseResultForToken(token);
      if (value) {
        this.fetchValuesByTokenForElement(element).set(token, value);
        this.delegate.elementMatchedValue(element, value);
      }
    }
    tokenUnmatched(token) {
      const { element } = token;
      const { value } = this.fetchParseResultForToken(token);
      if (value) {
        this.fetchValuesByTokenForElement(element).delete(token);
        this.delegate.elementUnmatchedValue(element, value);
      }
    }
    fetchParseResultForToken(token) {
      let parseResult = this.parseResultsByToken.get(token);
      if (!parseResult) {
        parseResult = this.parseToken(token);
        this.parseResultsByToken.set(token, parseResult);
      }
      return parseResult;
    }
    fetchValuesByTokenForElement(element) {
      let valuesByToken = this.valuesByTokenByElement.get(element);
      if (!valuesByToken) {
        valuesByToken = /* @__PURE__ */ new Map();
        this.valuesByTokenByElement.set(element, valuesByToken);
      }
      return valuesByToken;
    }
    parseToken(token) {
      try {
        const value = this.delegate.parseValueForToken(token);
        return { value };
      } catch (error4) {
        return { error: error4 };
      }
    }
  };
  var BindingObserver = class {
    constructor(context, delegate2) {
      this.context = context;
      this.delegate = delegate2;
      this.bindingsByAction = /* @__PURE__ */ new Map();
    }
    start() {
      if (!this.valueListObserver) {
        this.valueListObserver = new ValueListObserver(this.element, this.actionAttribute, this);
        this.valueListObserver.start();
      }
    }
    stop() {
      if (this.valueListObserver) {
        this.valueListObserver.stop();
        delete this.valueListObserver;
        this.disconnectAllActions();
      }
    }
    get element() {
      return this.context.element;
    }
    get identifier() {
      return this.context.identifier;
    }
    get actionAttribute() {
      return this.schema.actionAttribute;
    }
    get schema() {
      return this.context.schema;
    }
    get bindings() {
      return Array.from(this.bindingsByAction.values());
    }
    connectAction(action) {
      const binding = new Binding(this.context, action);
      this.bindingsByAction.set(action, binding);
      this.delegate.bindingConnected(binding);
    }
    disconnectAction(action) {
      const binding = this.bindingsByAction.get(action);
      if (binding) {
        this.bindingsByAction.delete(action);
        this.delegate.bindingDisconnected(binding);
      }
    }
    disconnectAllActions() {
      this.bindings.forEach((binding) => this.delegate.bindingDisconnected(binding));
      this.bindingsByAction.clear();
    }
    parseValueForToken(token) {
      const action = Action.forToken(token);
      if (action.identifier == this.identifier) {
        return action;
      }
    }
    elementMatchedValue(element, action) {
      this.connectAction(action);
    }
    elementUnmatchedValue(element, action) {
      this.disconnectAction(action);
    }
  };
  var ValueObserver = class {
    constructor(context, receiver) {
      this.context = context;
      this.receiver = receiver;
      this.stringMapObserver = new StringMapObserver(this.element, this);
      this.valueDescriptorMap = this.controller.valueDescriptorMap;
    }
    start() {
      this.stringMapObserver.start();
      this.invokeChangedCallbacksForDefaultValues();
    }
    stop() {
      this.stringMapObserver.stop();
    }
    get element() {
      return this.context.element;
    }
    get controller() {
      return this.context.controller;
    }
    getStringMapKeyForAttribute(attributeName) {
      if (attributeName in this.valueDescriptorMap) {
        return this.valueDescriptorMap[attributeName].name;
      }
    }
    stringMapKeyAdded(key, attributeName) {
      const descriptor = this.valueDescriptorMap[attributeName];
      if (!this.hasValue(key)) {
        this.invokeChangedCallback(key, descriptor.writer(this.receiver[key]), descriptor.writer(descriptor.defaultValue));
      }
    }
    stringMapValueChanged(value, name, oldValue) {
      const descriptor = this.valueDescriptorNameMap[name];
      if (value === null)
        return;
      if (oldValue === null) {
        oldValue = descriptor.writer(descriptor.defaultValue);
      }
      this.invokeChangedCallback(name, value, oldValue);
    }
    stringMapKeyRemoved(key, attributeName, oldValue) {
      const descriptor = this.valueDescriptorNameMap[key];
      if (this.hasValue(key)) {
        this.invokeChangedCallback(key, descriptor.writer(this.receiver[key]), oldValue);
      } else {
        this.invokeChangedCallback(key, descriptor.writer(descriptor.defaultValue), oldValue);
      }
    }
    invokeChangedCallbacksForDefaultValues() {
      for (const { key, name, defaultValue, writer } of this.valueDescriptors) {
        if (defaultValue != void 0 && !this.controller.data.has(key)) {
          this.invokeChangedCallback(name, writer(defaultValue), void 0);
        }
      }
    }
    invokeChangedCallback(name, rawValue, rawOldValue) {
      const changedMethodName = `${name}Changed`;
      const changedMethod = this.receiver[changedMethodName];
      if (typeof changedMethod == "function") {
        const descriptor = this.valueDescriptorNameMap[name];
        try {
          const value = descriptor.reader(rawValue);
          let oldValue = rawOldValue;
          if (rawOldValue) {
            oldValue = descriptor.reader(rawOldValue);
          }
          changedMethod.call(this.receiver, value, oldValue);
        } catch (error4) {
          if (!(error4 instanceof TypeError))
            throw error4;
          throw new TypeError(`Stimulus Value "${this.context.identifier}.${descriptor.name}" - ${error4.message}`);
        }
      }
    }
    get valueDescriptors() {
      const { valueDescriptorMap } = this;
      return Object.keys(valueDescriptorMap).map((key) => valueDescriptorMap[key]);
    }
    get valueDescriptorNameMap() {
      const descriptors = {};
      Object.keys(this.valueDescriptorMap).forEach((key) => {
        const descriptor = this.valueDescriptorMap[key];
        descriptors[descriptor.name] = descriptor;
      });
      return descriptors;
    }
    hasValue(attributeName) {
      const descriptor = this.valueDescriptorNameMap[attributeName];
      const hasMethodName = `has${capitalize(descriptor.name)}`;
      return this.receiver[hasMethodName];
    }
  };
  var TargetObserver = class {
    constructor(context, delegate2) {
      this.context = context;
      this.delegate = delegate2;
      this.targetsByName = new Multimap();
    }
    start() {
      if (!this.tokenListObserver) {
        this.tokenListObserver = new TokenListObserver(this.element, this.attributeName, this);
        this.tokenListObserver.start();
      }
    }
    stop() {
      if (this.tokenListObserver) {
        this.disconnectAllTargets();
        this.tokenListObserver.stop();
        delete this.tokenListObserver;
      }
    }
    tokenMatched({ element, content: name }) {
      if (this.scope.containsElement(element)) {
        this.connectTarget(element, name);
      }
    }
    tokenUnmatched({ element, content: name }) {
      this.disconnectTarget(element, name);
    }
    connectTarget(element, name) {
      var _a2;
      if (!this.targetsByName.has(name, element)) {
        this.targetsByName.add(name, element);
        (_a2 = this.tokenListObserver) === null || _a2 === void 0 ? void 0 : _a2.pause(() => this.delegate.targetConnected(element, name));
      }
    }
    disconnectTarget(element, name) {
      var _a2;
      if (this.targetsByName.has(name, element)) {
        this.targetsByName.delete(name, element);
        (_a2 = this.tokenListObserver) === null || _a2 === void 0 ? void 0 : _a2.pause(() => this.delegate.targetDisconnected(element, name));
      }
    }
    disconnectAllTargets() {
      for (const name of this.targetsByName.keys) {
        for (const element of this.targetsByName.getValuesForKey(name)) {
          this.disconnectTarget(element, name);
        }
      }
    }
    get attributeName() {
      return `data-${this.context.identifier}-target`;
    }
    get element() {
      return this.context.element;
    }
    get scope() {
      return this.context.scope;
    }
  };
  var Context = class {
    constructor(module, scope) {
      this.logDebugActivity = (functionName, detail = {}) => {
        const { identifier, controller, element } = this;
        detail = Object.assign({ identifier, controller, element }, detail);
        this.application.logDebugActivity(this.identifier, functionName, detail);
      };
      this.module = module;
      this.scope = scope;
      this.controller = new module.controllerConstructor(this);
      this.bindingObserver = new BindingObserver(this, this.dispatcher);
      this.valueObserver = new ValueObserver(this, this.controller);
      this.targetObserver = new TargetObserver(this, this);
      try {
        this.controller.initialize();
        this.logDebugActivity("initialize");
      } catch (error4) {
        this.handleError(error4, "initializing controller");
      }
    }
    connect() {
      this.bindingObserver.start();
      this.valueObserver.start();
      this.targetObserver.start();
      try {
        this.controller.connect();
        this.logDebugActivity("connect");
      } catch (error4) {
        this.handleError(error4, "connecting controller");
      }
    }
    disconnect() {
      try {
        this.controller.disconnect();
        this.logDebugActivity("disconnect");
      } catch (error4) {
        this.handleError(error4, "disconnecting controller");
      }
      this.targetObserver.stop();
      this.valueObserver.stop();
      this.bindingObserver.stop();
    }
    get application() {
      return this.module.application;
    }
    get identifier() {
      return this.module.identifier;
    }
    get schema() {
      return this.application.schema;
    }
    get dispatcher() {
      return this.application.dispatcher;
    }
    get element() {
      return this.scope.element;
    }
    get parentElement() {
      return this.element.parentElement;
    }
    handleError(error4, message, detail = {}) {
      const { identifier, controller, element } = this;
      detail = Object.assign({ identifier, controller, element }, detail);
      this.application.handleError(error4, `Error ${message}`, detail);
    }
    targetConnected(element, name) {
      this.invokeControllerMethod(`${name}TargetConnected`, element);
    }
    targetDisconnected(element, name) {
      this.invokeControllerMethod(`${name}TargetDisconnected`, element);
    }
    invokeControllerMethod(methodName, ...args) {
      const controller = this.controller;
      if (typeof controller[methodName] == "function") {
        controller[methodName](...args);
      }
    }
  };
  function readInheritableStaticArrayValues(constructor, propertyName) {
    const ancestors = getAncestorsForConstructor(constructor);
    return Array.from(ancestors.reduce((values, constructor2) => {
      getOwnStaticArrayValues(constructor2, propertyName).forEach((name) => values.add(name));
      return values;
    }, /* @__PURE__ */ new Set()));
  }
  function readInheritableStaticObjectPairs(constructor, propertyName) {
    const ancestors = getAncestorsForConstructor(constructor);
    return ancestors.reduce((pairs, constructor2) => {
      pairs.push(...getOwnStaticObjectPairs(constructor2, propertyName));
      return pairs;
    }, []);
  }
  function getAncestorsForConstructor(constructor) {
    const ancestors = [];
    while (constructor) {
      ancestors.push(constructor);
      constructor = Object.getPrototypeOf(constructor);
    }
    return ancestors.reverse();
  }
  function getOwnStaticArrayValues(constructor, propertyName) {
    const definition = constructor[propertyName];
    return Array.isArray(definition) ? definition : [];
  }
  function getOwnStaticObjectPairs(constructor, propertyName) {
    const definition = constructor[propertyName];
    return definition ? Object.keys(definition).map((key) => [key, definition[key]]) : [];
  }
  function bless(constructor) {
    return shadow(constructor, getBlessedProperties(constructor));
  }
  function shadow(constructor, properties) {
    const shadowConstructor = extend2(constructor);
    const shadowProperties = getShadowProperties(constructor.prototype, properties);
    Object.defineProperties(shadowConstructor.prototype, shadowProperties);
    return shadowConstructor;
  }
  function getBlessedProperties(constructor) {
    const blessings = readInheritableStaticArrayValues(constructor, "blessings");
    return blessings.reduce((blessedProperties, blessing) => {
      const properties = blessing(constructor);
      for (const key in properties) {
        const descriptor = blessedProperties[key] || {};
        blessedProperties[key] = Object.assign(descriptor, properties[key]);
      }
      return blessedProperties;
    }, {});
  }
  function getShadowProperties(prototype, properties) {
    return getOwnKeys(properties).reduce((shadowProperties, key) => {
      const descriptor = getShadowedDescriptor(prototype, properties, key);
      if (descriptor) {
        Object.assign(shadowProperties, { [key]: descriptor });
      }
      return shadowProperties;
    }, {});
  }
  function getShadowedDescriptor(prototype, properties, key) {
    const shadowingDescriptor = Object.getOwnPropertyDescriptor(prototype, key);
    const shadowedByValue = shadowingDescriptor && "value" in shadowingDescriptor;
    if (!shadowedByValue) {
      const descriptor = Object.getOwnPropertyDescriptor(properties, key).value;
      if (shadowingDescriptor) {
        descriptor.get = shadowingDescriptor.get || descriptor.get;
        descriptor.set = shadowingDescriptor.set || descriptor.set;
      }
      return descriptor;
    }
  }
  var getOwnKeys = (() => {
    if (typeof Object.getOwnPropertySymbols == "function") {
      return (object2) => [
        ...Object.getOwnPropertyNames(object2),
        ...Object.getOwnPropertySymbols(object2)
      ];
    } else {
      return Object.getOwnPropertyNames;
    }
  })();
  var extend2 = (() => {
    function extendWithReflect(constructor) {
      function extended() {
        return Reflect.construct(constructor, arguments, new.target);
      }
      extended.prototype = Object.create(constructor.prototype, {
        constructor: { value: extended }
      });
      Reflect.setPrototypeOf(extended, constructor);
      return extended;
    }
    function testReflectExtension() {
      const a = function() {
        this.a.call(this);
      };
      const b = extendWithReflect(a);
      b.prototype.a = function() {
      };
      return new b();
    }
    try {
      testReflectExtension();
      return extendWithReflect;
    } catch (error4) {
      return (constructor) => class extended extends constructor {
      };
    }
  })();
  function blessDefinition(definition) {
    return {
      identifier: definition.identifier,
      controllerConstructor: bless(definition.controllerConstructor)
    };
  }
  var Module = class {
    constructor(application2, definition) {
      this.application = application2;
      this.definition = blessDefinition(definition);
      this.contextsByScope = /* @__PURE__ */ new WeakMap();
      this.connectedContexts = /* @__PURE__ */ new Set();
    }
    get identifier() {
      return this.definition.identifier;
    }
    get controllerConstructor() {
      return this.definition.controllerConstructor;
    }
    get contexts() {
      return Array.from(this.connectedContexts);
    }
    connectContextForScope(scope) {
      const context = this.fetchContextForScope(scope);
      this.connectedContexts.add(context);
      context.connect();
    }
    disconnectContextForScope(scope) {
      const context = this.contextsByScope.get(scope);
      if (context) {
        this.connectedContexts.delete(context);
        context.disconnect();
      }
    }
    fetchContextForScope(scope) {
      let context = this.contextsByScope.get(scope);
      if (!context) {
        context = new Context(this, scope);
        this.contextsByScope.set(scope, context);
      }
      return context;
    }
  };
  var ClassMap = class {
    constructor(scope) {
      this.scope = scope;
    }
    has(name) {
      return this.data.has(this.getDataKey(name));
    }
    get(name) {
      return this.getAll(name)[0];
    }
    getAll(name) {
      const tokenString = this.data.get(this.getDataKey(name)) || "";
      return tokenize(tokenString);
    }
    getAttributeName(name) {
      return this.data.getAttributeNameForKey(this.getDataKey(name));
    }
    getDataKey(name) {
      return `${name}-class`;
    }
    get data() {
      return this.scope.data;
    }
  };
  var DataMap = class {
    constructor(scope) {
      this.scope = scope;
    }
    get element() {
      return this.scope.element;
    }
    get identifier() {
      return this.scope.identifier;
    }
    get(key) {
      const name = this.getAttributeNameForKey(key);
      return this.element.getAttribute(name);
    }
    set(key, value) {
      const name = this.getAttributeNameForKey(key);
      this.element.setAttribute(name, value);
      return this.get(key);
    }
    has(key) {
      const name = this.getAttributeNameForKey(key);
      return this.element.hasAttribute(name);
    }
    delete(key) {
      if (this.has(key)) {
        const name = this.getAttributeNameForKey(key);
        this.element.removeAttribute(name);
        return true;
      } else {
        return false;
      }
    }
    getAttributeNameForKey(key) {
      return `data-${this.identifier}-${dasherize(key)}`;
    }
  };
  var Guide = class {
    constructor(logger2) {
      this.warnedKeysByObject = /* @__PURE__ */ new WeakMap();
      this.logger = logger2;
    }
    warn(object2, key, message) {
      let warnedKeys = this.warnedKeysByObject.get(object2);
      if (!warnedKeys) {
        warnedKeys = /* @__PURE__ */ new Set();
        this.warnedKeysByObject.set(object2, warnedKeys);
      }
      if (!warnedKeys.has(key)) {
        warnedKeys.add(key);
        this.logger.warn(message, object2);
      }
    }
  };
  function attributeValueContainsToken(attributeName, token) {
    return `[${attributeName}~="${token}"]`;
  }
  var TargetSet = class {
    constructor(scope) {
      this.scope = scope;
    }
    get element() {
      return this.scope.element;
    }
    get identifier() {
      return this.scope.identifier;
    }
    get schema() {
      return this.scope.schema;
    }
    has(targetName) {
      return this.find(targetName) != null;
    }
    find(...targetNames) {
      return targetNames.reduce((target, targetName) => target || this.findTarget(targetName) || this.findLegacyTarget(targetName), void 0);
    }
    findAll(...targetNames) {
      return targetNames.reduce((targets, targetName) => [
        ...targets,
        ...this.findAllTargets(targetName),
        ...this.findAllLegacyTargets(targetName)
      ], []);
    }
    findTarget(targetName) {
      const selector = this.getSelectorForTargetName(targetName);
      return this.scope.findElement(selector);
    }
    findAllTargets(targetName) {
      const selector = this.getSelectorForTargetName(targetName);
      return this.scope.findAllElements(selector);
    }
    getSelectorForTargetName(targetName) {
      const attributeName = this.schema.targetAttributeForScope(this.identifier);
      return attributeValueContainsToken(attributeName, targetName);
    }
    findLegacyTarget(targetName) {
      const selector = this.getLegacySelectorForTargetName(targetName);
      return this.deprecate(this.scope.findElement(selector), targetName);
    }
    findAllLegacyTargets(targetName) {
      const selector = this.getLegacySelectorForTargetName(targetName);
      return this.scope.findAllElements(selector).map((element) => this.deprecate(element, targetName));
    }
    getLegacySelectorForTargetName(targetName) {
      const targetDescriptor = `${this.identifier}.${targetName}`;
      return attributeValueContainsToken(this.schema.targetAttribute, targetDescriptor);
    }
    deprecate(element, targetName) {
      if (element) {
        const { identifier } = this;
        const attributeName = this.schema.targetAttribute;
        const revisedAttributeName = this.schema.targetAttributeForScope(identifier);
        this.guide.warn(element, `target:${targetName}`, `Please replace ${attributeName}="${identifier}.${targetName}" with ${revisedAttributeName}="${targetName}". The ${attributeName} attribute is deprecated and will be removed in a future version of Stimulus.`);
      }
      return element;
    }
    get guide() {
      return this.scope.guide;
    }
  };
  var Scope = class {
    constructor(schema2, element, identifier, logger2) {
      this.targets = new TargetSet(this);
      this.classes = new ClassMap(this);
      this.data = new DataMap(this);
      this.containsElement = (element2) => {
        return element2.closest(this.controllerSelector) === this.element;
      };
      this.schema = schema2;
      this.element = element;
      this.identifier = identifier;
      this.guide = new Guide(logger2);
    }
    findElement(selector) {
      return this.element.matches(selector) ? this.element : this.queryElements(selector).find(this.containsElement);
    }
    findAllElements(selector) {
      return [
        ...this.element.matches(selector) ? [this.element] : [],
        ...this.queryElements(selector).filter(this.containsElement)
      ];
    }
    queryElements(selector) {
      return Array.from(this.element.querySelectorAll(selector));
    }
    get controllerSelector() {
      return attributeValueContainsToken(this.schema.controllerAttribute, this.identifier);
    }
  };
  var ScopeObserver = class {
    constructor(element, schema2, delegate2) {
      this.element = element;
      this.schema = schema2;
      this.delegate = delegate2;
      this.valueListObserver = new ValueListObserver(this.element, this.controllerAttribute, this);
      this.scopesByIdentifierByElement = /* @__PURE__ */ new WeakMap();
      this.scopeReferenceCounts = /* @__PURE__ */ new WeakMap();
    }
    start() {
      this.valueListObserver.start();
    }
    stop() {
      this.valueListObserver.stop();
    }
    get controllerAttribute() {
      return this.schema.controllerAttribute;
    }
    parseValueForToken(token) {
      const { element, content: identifier } = token;
      const scopesByIdentifier = this.fetchScopesByIdentifierForElement(element);
      let scope = scopesByIdentifier.get(identifier);
      if (!scope) {
        scope = this.delegate.createScopeForElementAndIdentifier(element, identifier);
        scopesByIdentifier.set(identifier, scope);
      }
      return scope;
    }
    elementMatchedValue(element, value) {
      const referenceCount = (this.scopeReferenceCounts.get(value) || 0) + 1;
      this.scopeReferenceCounts.set(value, referenceCount);
      if (referenceCount == 1) {
        this.delegate.scopeConnected(value);
      }
    }
    elementUnmatchedValue(element, value) {
      const referenceCount = this.scopeReferenceCounts.get(value);
      if (referenceCount) {
        this.scopeReferenceCounts.set(value, referenceCount - 1);
        if (referenceCount == 1) {
          this.delegate.scopeDisconnected(value);
        }
      }
    }
    fetchScopesByIdentifierForElement(element) {
      let scopesByIdentifier = this.scopesByIdentifierByElement.get(element);
      if (!scopesByIdentifier) {
        scopesByIdentifier = /* @__PURE__ */ new Map();
        this.scopesByIdentifierByElement.set(element, scopesByIdentifier);
      }
      return scopesByIdentifier;
    }
  };
  var Router = class {
    constructor(application2) {
      this.application = application2;
      this.scopeObserver = new ScopeObserver(this.element, this.schema, this);
      this.scopesByIdentifier = new Multimap();
      this.modulesByIdentifier = /* @__PURE__ */ new Map();
    }
    get element() {
      return this.application.element;
    }
    get schema() {
      return this.application.schema;
    }
    get logger() {
      return this.application.logger;
    }
    get controllerAttribute() {
      return this.schema.controllerAttribute;
    }
    get modules() {
      return Array.from(this.modulesByIdentifier.values());
    }
    get contexts() {
      return this.modules.reduce((contexts, module) => contexts.concat(module.contexts), []);
    }
    start() {
      this.scopeObserver.start();
    }
    stop() {
      this.scopeObserver.stop();
    }
    loadDefinition(definition) {
      this.unloadIdentifier(definition.identifier);
      const module = new Module(this.application, definition);
      this.connectModule(module);
    }
    unloadIdentifier(identifier) {
      const module = this.modulesByIdentifier.get(identifier);
      if (module) {
        this.disconnectModule(module);
      }
    }
    getContextForElementAndIdentifier(element, identifier) {
      const module = this.modulesByIdentifier.get(identifier);
      if (module) {
        return module.contexts.find((context) => context.element == element);
      }
    }
    handleError(error4, message, detail) {
      this.application.handleError(error4, message, detail);
    }
    createScopeForElementAndIdentifier(element, identifier) {
      return new Scope(this.schema, element, identifier, this.logger);
    }
    scopeConnected(scope) {
      this.scopesByIdentifier.add(scope.identifier, scope);
      const module = this.modulesByIdentifier.get(scope.identifier);
      if (module) {
        module.connectContextForScope(scope);
      }
    }
    scopeDisconnected(scope) {
      this.scopesByIdentifier.delete(scope.identifier, scope);
      const module = this.modulesByIdentifier.get(scope.identifier);
      if (module) {
        module.disconnectContextForScope(scope);
      }
    }
    connectModule(module) {
      this.modulesByIdentifier.set(module.identifier, module);
      const scopes = this.scopesByIdentifier.getValuesForKey(module.identifier);
      scopes.forEach((scope) => module.connectContextForScope(scope));
    }
    disconnectModule(module) {
      this.modulesByIdentifier.delete(module.identifier);
      const scopes = this.scopesByIdentifier.getValuesForKey(module.identifier);
      scopes.forEach((scope) => module.disconnectContextForScope(scope));
    }
  };
  var defaultSchema = {
    controllerAttribute: "data-controller",
    actionAttribute: "data-action",
    targetAttribute: "data-target",
    targetAttributeForScope: (identifier) => `data-${identifier}-target`
  };
  var Application = class {
    constructor(element = document.documentElement, schema2 = defaultSchema) {
      this.logger = console;
      this.debug = false;
      this.logDebugActivity = (identifier, functionName, detail = {}) => {
        if (this.debug) {
          this.logFormattedMessage(identifier, functionName, detail);
        }
      };
      this.element = element;
      this.schema = schema2;
      this.dispatcher = new Dispatcher(this);
      this.router = new Router(this);
    }
    static start(element, schema2) {
      const application2 = new Application(element, schema2);
      application2.start();
      return application2;
    }
    async start() {
      await domReady();
      this.logDebugActivity("application", "starting");
      this.dispatcher.start();
      this.router.start();
      this.logDebugActivity("application", "start");
    }
    stop() {
      this.logDebugActivity("application", "stopping");
      this.dispatcher.stop();
      this.router.stop();
      this.logDebugActivity("application", "stop");
    }
    register(identifier, controllerConstructor) {
      this.load({ identifier, controllerConstructor });
    }
    load(head, ...rest) {
      const definitions = Array.isArray(head) ? head : [head, ...rest];
      definitions.forEach((definition) => {
        if (definition.controllerConstructor.shouldLoad) {
          this.router.loadDefinition(definition);
        }
      });
    }
    unload(head, ...rest) {
      const identifiers = Array.isArray(head) ? head : [head, ...rest];
      identifiers.forEach((identifier) => this.router.unloadIdentifier(identifier));
    }
    get controllers() {
      return this.router.contexts.map((context) => context.controller);
    }
    getControllerForElementAndIdentifier(element, identifier) {
      const context = this.router.getContextForElementAndIdentifier(element, identifier);
      return context ? context.controller : null;
    }
    handleError(error4, message, detail) {
      var _a2;
      this.logger.error(`%s

%o

%o`, message, error4, detail);
      (_a2 = window.onerror) === null || _a2 === void 0 ? void 0 : _a2.call(window, message, "", 0, 0, error4);
    }
    logFormattedMessage(identifier, functionName, detail = {}) {
      detail = Object.assign({ application: this }, detail);
      this.logger.groupCollapsed(`${identifier} #${functionName}`);
      this.logger.log("details:", Object.assign({}, detail));
      this.logger.groupEnd();
    }
  };
  function domReady() {
    return new Promise((resolve) => {
      if (document.readyState == "loading") {
        document.addEventListener("DOMContentLoaded", () => resolve());
      } else {
        resolve();
      }
    });
  }
  function ClassPropertiesBlessing(constructor) {
    const classes = readInheritableStaticArrayValues(constructor, "classes");
    return classes.reduce((properties, classDefinition) => {
      return Object.assign(properties, propertiesForClassDefinition(classDefinition));
    }, {});
  }
  function propertiesForClassDefinition(key) {
    return {
      [`${key}Class`]: {
        get() {
          const { classes } = this;
          if (classes.has(key)) {
            return classes.get(key);
          } else {
            const attribute = classes.getAttributeName(key);
            throw new Error(`Missing attribute "${attribute}"`);
          }
        }
      },
      [`${key}Classes`]: {
        get() {
          return this.classes.getAll(key);
        }
      },
      [`has${capitalize(key)}Class`]: {
        get() {
          return this.classes.has(key);
        }
      }
    };
  }
  function TargetPropertiesBlessing(constructor) {
    const targets = readInheritableStaticArrayValues(constructor, "targets");
    return targets.reduce((properties, targetDefinition) => {
      return Object.assign(properties, propertiesForTargetDefinition(targetDefinition));
    }, {});
  }
  function propertiesForTargetDefinition(name) {
    return {
      [`${name}Target`]: {
        get() {
          const target = this.targets.find(name);
          if (target) {
            return target;
          } else {
            throw new Error(`Missing target element "${name}" for "${this.identifier}" controller`);
          }
        }
      },
      [`${name}Targets`]: {
        get() {
          return this.targets.findAll(name);
        }
      },
      [`has${capitalize(name)}Target`]: {
        get() {
          return this.targets.has(name);
        }
      }
    };
  }
  function ValuePropertiesBlessing(constructor) {
    const valueDefinitionPairs = readInheritableStaticObjectPairs(constructor, "values");
    const propertyDescriptorMap = {
      valueDescriptorMap: {
        get() {
          return valueDefinitionPairs.reduce((result, valueDefinitionPair) => {
            const valueDescriptor = parseValueDefinitionPair(valueDefinitionPair, this.identifier);
            const attributeName = this.data.getAttributeNameForKey(valueDescriptor.key);
            return Object.assign(result, { [attributeName]: valueDescriptor });
          }, {});
        }
      }
    };
    return valueDefinitionPairs.reduce((properties, valueDefinitionPair) => {
      return Object.assign(properties, propertiesForValueDefinitionPair(valueDefinitionPair));
    }, propertyDescriptorMap);
  }
  function propertiesForValueDefinitionPair(valueDefinitionPair, controller) {
    const definition = parseValueDefinitionPair(valueDefinitionPair, controller);
    const { key, name, reader: read, writer: write } = definition;
    return {
      [name]: {
        get() {
          const value = this.data.get(key);
          if (value !== null) {
            return read(value);
          } else {
            return definition.defaultValue;
          }
        },
        set(value) {
          if (value === void 0) {
            this.data.delete(key);
          } else {
            this.data.set(key, write(value));
          }
        }
      },
      [`has${capitalize(name)}`]: {
        get() {
          return this.data.has(key) || definition.hasCustomDefaultValue;
        }
      }
    };
  }
  function parseValueDefinitionPair([token, typeDefinition], controller) {
    return valueDescriptorForTokenAndTypeDefinition({
      controller,
      token,
      typeDefinition
    });
  }
  function parseValueTypeConstant(constant) {
    switch (constant) {
      case Array:
        return "array";
      case Boolean:
        return "boolean";
      case Number:
        return "number";
      case Object:
        return "object";
      case String:
        return "string";
    }
  }
  function parseValueTypeDefault(defaultValue) {
    switch (typeof defaultValue) {
      case "boolean":
        return "boolean";
      case "number":
        return "number";
      case "string":
        return "string";
    }
    if (Array.isArray(defaultValue))
      return "array";
    if (Object.prototype.toString.call(defaultValue) === "[object Object]")
      return "object";
  }
  function parseValueTypeObject(payload) {
    const typeFromObject = parseValueTypeConstant(payload.typeObject.type);
    if (!typeFromObject)
      return;
    const defaultValueType = parseValueTypeDefault(payload.typeObject.default);
    if (typeFromObject !== defaultValueType) {
      const propertyPath = payload.controller ? `${payload.controller}.${payload.token}` : payload.token;
      throw new Error(`The specified default value for the Stimulus Value "${propertyPath}" must match the defined type "${typeFromObject}". The provided default value of "${payload.typeObject.default}" is of type "${defaultValueType}".`);
    }
    return typeFromObject;
  }
  function parseValueTypeDefinition(payload) {
    const typeFromObject = parseValueTypeObject({
      controller: payload.controller,
      token: payload.token,
      typeObject: payload.typeDefinition
    });
    const typeFromDefaultValue = parseValueTypeDefault(payload.typeDefinition);
    const typeFromConstant = parseValueTypeConstant(payload.typeDefinition);
    const type = typeFromObject || typeFromDefaultValue || typeFromConstant;
    if (type)
      return type;
    const propertyPath = payload.controller ? `${payload.controller}.${payload.typeDefinition}` : payload.token;
    throw new Error(`Unknown value type "${propertyPath}" for "${payload.token}" value`);
  }
  function defaultValueForDefinition(typeDefinition) {
    const constant = parseValueTypeConstant(typeDefinition);
    if (constant)
      return defaultValuesByType[constant];
    const defaultValue = typeDefinition.default;
    if (defaultValue !== void 0)
      return defaultValue;
    return typeDefinition;
  }
  function valueDescriptorForTokenAndTypeDefinition(payload) {
    const key = `${dasherize(payload.token)}-value`;
    const type = parseValueTypeDefinition(payload);
    return {
      type,
      key,
      name: camelize(key),
      get defaultValue() {
        return defaultValueForDefinition(payload.typeDefinition);
      },
      get hasCustomDefaultValue() {
        return parseValueTypeDefault(payload.typeDefinition) !== void 0;
      },
      reader: readers[type],
      writer: writers[type] || writers.default
    };
  }
  var defaultValuesByType = {
    get array() {
      return [];
    },
    boolean: false,
    number: 0,
    get object() {
      return {};
    },
    string: ""
  };
  var readers = {
    array(value) {
      const array = JSON.parse(value);
      if (!Array.isArray(array)) {
        throw new TypeError(`expected value of type "array" but instead got value "${value}" of type "${parseValueTypeDefault(array)}"`);
      }
      return array;
    },
    boolean(value) {
      return !(value == "0" || String(value).toLowerCase() == "false");
    },
    number(value) {
      return Number(value);
    },
    object(value) {
      const object2 = JSON.parse(value);
      if (object2 === null || typeof object2 != "object" || Array.isArray(object2)) {
        throw new TypeError(`expected value of type "object" but instead got value "${value}" of type "${parseValueTypeDefault(object2)}"`);
      }
      return object2;
    },
    string(value) {
      return value;
    }
  };
  var writers = {
    default: writeString,
    array: writeJSON,
    object: writeJSON
  };
  function writeJSON(value) {
    return JSON.stringify(value);
  }
  function writeString(value) {
    return `${value}`;
  }
  var Controller = class {
    constructor(context) {
      this.context = context;
    }
    static get shouldLoad() {
      return true;
    }
    get application() {
      return this.context.application;
    }
    get scope() {
      return this.context.scope;
    }
    get element() {
      return this.scope.element;
    }
    get identifier() {
      return this.scope.identifier;
    }
    get targets() {
      return this.scope.targets;
    }
    get classes() {
      return this.scope.classes;
    }
    get data() {
      return this.scope.data;
    }
    initialize() {
    }
    connect() {
    }
    disconnect() {
    }
    dispatch(eventName, { target = this.element, detail = {}, prefix: prefix2 = this.identifier, bubbles = true, cancelable = true } = {}) {
      const type = prefix2 ? `${prefix2}:${eventName}` : eventName;
      const event = new CustomEvent(type, { detail, bubbles, cancelable });
      target.dispatchEvent(event);
      return event;
    }
  };
  Controller.blessings = [ClassPropertiesBlessing, TargetPropertiesBlessing, ValuePropertiesBlessing];
  Controller.targets = [];
  Controller.values = {};

  // ../../node_modules/stimulus/dist/stimulus.js
  function camelize2(value) {
    return value.replace(/(?:[_-])([a-z0-9])/g, (_2, char) => char.toUpperCase());
  }
  function capitalize2(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
  function dasherize2(value) {
    return value.replace(/([A-Z])/g, (_2, char) => `-${char.toLowerCase()}`);
  }
  function readInheritableStaticArrayValues2(constructor, propertyName) {
    const ancestors = getAncestorsForConstructor2(constructor);
    return Array.from(ancestors.reduce((values, constructor2) => {
      getOwnStaticArrayValues2(constructor2, propertyName).forEach((name) => values.add(name));
      return values;
    }, /* @__PURE__ */ new Set()));
  }
  function readInheritableStaticObjectPairs2(constructor, propertyName) {
    const ancestors = getAncestorsForConstructor2(constructor);
    return ancestors.reduce((pairs, constructor2) => {
      pairs.push(...getOwnStaticObjectPairs2(constructor2, propertyName));
      return pairs;
    }, []);
  }
  function getAncestorsForConstructor2(constructor) {
    const ancestors = [];
    while (constructor) {
      ancestors.push(constructor);
      constructor = Object.getPrototypeOf(constructor);
    }
    return ancestors.reverse();
  }
  function getOwnStaticArrayValues2(constructor, propertyName) {
    const definition = constructor[propertyName];
    return Array.isArray(definition) ? definition : [];
  }
  function getOwnStaticObjectPairs2(constructor, propertyName) {
    const definition = constructor[propertyName];
    return definition ? Object.keys(definition).map((key) => [key, definition[key]]) : [];
  }
  var getOwnKeys2 = (() => {
    if (typeof Object.getOwnPropertySymbols == "function") {
      return (object2) => [
        ...Object.getOwnPropertyNames(object2),
        ...Object.getOwnPropertySymbols(object2)
      ];
    } else {
      return Object.getOwnPropertyNames;
    }
  })();
  var extend3 = (() => {
    function extendWithReflect(constructor) {
      function extended() {
        return Reflect.construct(constructor, arguments, new.target);
      }
      extended.prototype = Object.create(constructor.prototype, {
        constructor: { value: extended }
      });
      Reflect.setPrototypeOf(extended, constructor);
      return extended;
    }
    function testReflectExtension() {
      const a = function() {
        this.a.call(this);
      };
      const b = extendWithReflect(a);
      b.prototype.a = function() {
      };
      return new b();
    }
    try {
      testReflectExtension();
      return extendWithReflect;
    } catch (error4) {
      return (constructor) => class extended extends constructor {
      };
    }
  })();
  function ClassPropertiesBlessing2(constructor) {
    const classes = readInheritableStaticArrayValues2(constructor, "classes");
    return classes.reduce((properties, classDefinition) => {
      return Object.assign(properties, propertiesForClassDefinition2(classDefinition));
    }, {});
  }
  function propertiesForClassDefinition2(key) {
    return {
      [`${key}Class`]: {
        get() {
          const { classes } = this;
          if (classes.has(key)) {
            return classes.get(key);
          } else {
            const attribute = classes.getAttributeName(key);
            throw new Error(`Missing attribute "${attribute}"`);
          }
        }
      },
      [`${key}Classes`]: {
        get() {
          return this.classes.getAll(key);
        }
      },
      [`has${capitalize2(key)}Class`]: {
        get() {
          return this.classes.has(key);
        }
      }
    };
  }
  function TargetPropertiesBlessing2(constructor) {
    const targets = readInheritableStaticArrayValues2(constructor, "targets");
    return targets.reduce((properties, targetDefinition) => {
      return Object.assign(properties, propertiesForTargetDefinition2(targetDefinition));
    }, {});
  }
  function propertiesForTargetDefinition2(name) {
    return {
      [`${name}Target`]: {
        get() {
          const target = this.targets.find(name);
          if (target) {
            return target;
          } else {
            throw new Error(`Missing target element "${name}" for "${this.identifier}" controller`);
          }
        }
      },
      [`${name}Targets`]: {
        get() {
          return this.targets.findAll(name);
        }
      },
      [`has${capitalize2(name)}Target`]: {
        get() {
          return this.targets.has(name);
        }
      }
    };
  }
  function ValuePropertiesBlessing2(constructor) {
    const valueDefinitionPairs = readInheritableStaticObjectPairs2(constructor, "values");
    const propertyDescriptorMap = {
      valueDescriptorMap: {
        get() {
          return valueDefinitionPairs.reduce((result, valueDefinitionPair) => {
            const valueDescriptor = parseValueDefinitionPair2(valueDefinitionPair, this.identifier);
            const attributeName = this.data.getAttributeNameForKey(valueDescriptor.key);
            return Object.assign(result, { [attributeName]: valueDescriptor });
          }, {});
        }
      }
    };
    return valueDefinitionPairs.reduce((properties, valueDefinitionPair) => {
      return Object.assign(properties, propertiesForValueDefinitionPair2(valueDefinitionPair));
    }, propertyDescriptorMap);
  }
  function propertiesForValueDefinitionPair2(valueDefinitionPair, controller) {
    const definition = parseValueDefinitionPair2(valueDefinitionPair, controller);
    const { key, name, reader: read, writer: write } = definition;
    return {
      [name]: {
        get() {
          const value = this.data.get(key);
          if (value !== null) {
            return read(value);
          } else {
            return definition.defaultValue;
          }
        },
        set(value) {
          if (value === void 0) {
            this.data.delete(key);
          } else {
            this.data.set(key, write(value));
          }
        }
      },
      [`has${capitalize2(name)}`]: {
        get() {
          return this.data.has(key) || definition.hasCustomDefaultValue;
        }
      }
    };
  }
  function parseValueDefinitionPair2([token, typeDefinition], controller) {
    return valueDescriptorForTokenAndTypeDefinition2({
      controller,
      token,
      typeDefinition
    });
  }
  function parseValueTypeConstant2(constant) {
    switch (constant) {
      case Array:
        return "array";
      case Boolean:
        return "boolean";
      case Number:
        return "number";
      case Object:
        return "object";
      case String:
        return "string";
    }
  }
  function parseValueTypeDefault2(defaultValue) {
    switch (typeof defaultValue) {
      case "boolean":
        return "boolean";
      case "number":
        return "number";
      case "string":
        return "string";
    }
    if (Array.isArray(defaultValue))
      return "array";
    if (Object.prototype.toString.call(defaultValue) === "[object Object]")
      return "object";
  }
  function parseValueTypeObject2(payload) {
    const typeFromObject = parseValueTypeConstant2(payload.typeObject.type);
    if (!typeFromObject)
      return;
    const defaultValueType = parseValueTypeDefault2(payload.typeObject.default);
    if (typeFromObject !== defaultValueType) {
      const propertyPath = payload.controller ? `${payload.controller}.${payload.token}` : payload.token;
      throw new Error(`The specified default value for the Stimulus Value "${propertyPath}" must match the defined type "${typeFromObject}". The provided default value of "${payload.typeObject.default}" is of type "${defaultValueType}".`);
    }
    return typeFromObject;
  }
  function parseValueTypeDefinition2(payload) {
    const typeFromObject = parseValueTypeObject2({
      controller: payload.controller,
      token: payload.token,
      typeObject: payload.typeDefinition
    });
    const typeFromDefaultValue = parseValueTypeDefault2(payload.typeDefinition);
    const typeFromConstant = parseValueTypeConstant2(payload.typeDefinition);
    const type = typeFromObject || typeFromDefaultValue || typeFromConstant;
    if (type)
      return type;
    const propertyPath = payload.controller ? `${payload.controller}.${payload.typeDefinition}` : payload.token;
    throw new Error(`Unknown value type "${propertyPath}" for "${payload.token}" value`);
  }
  function defaultValueForDefinition2(typeDefinition) {
    const constant = parseValueTypeConstant2(typeDefinition);
    if (constant)
      return defaultValuesByType2[constant];
    const defaultValue = typeDefinition.default;
    if (defaultValue !== void 0)
      return defaultValue;
    return typeDefinition;
  }
  function valueDescriptorForTokenAndTypeDefinition2(payload) {
    const key = `${dasherize2(payload.token)}-value`;
    const type = parseValueTypeDefinition2(payload);
    return {
      type,
      key,
      name: camelize2(key),
      get defaultValue() {
        return defaultValueForDefinition2(payload.typeDefinition);
      },
      get hasCustomDefaultValue() {
        return parseValueTypeDefault2(payload.typeDefinition) !== void 0;
      },
      reader: readers2[type],
      writer: writers2[type] || writers2.default
    };
  }
  var defaultValuesByType2 = {
    get array() {
      return [];
    },
    boolean: false,
    number: 0,
    get object() {
      return {};
    },
    string: ""
  };
  var readers2 = {
    array(value) {
      const array = JSON.parse(value);
      if (!Array.isArray(array)) {
        throw new TypeError(`expected value of type "array" but instead got value "${value}" of type "${parseValueTypeDefault2(array)}"`);
      }
      return array;
    },
    boolean(value) {
      return !(value == "0" || String(value).toLowerCase() == "false");
    },
    number(value) {
      return Number(value);
    },
    object(value) {
      const object2 = JSON.parse(value);
      if (object2 === null || typeof object2 != "object" || Array.isArray(object2)) {
        throw new TypeError(`expected value of type "object" but instead got value "${value}" of type "${parseValueTypeDefault2(object2)}"`);
      }
      return object2;
    },
    string(value) {
      return value;
    }
  };
  var writers2 = {
    default: writeString2,
    array: writeJSON2,
    object: writeJSON2
  };
  function writeJSON2(value) {
    return JSON.stringify(value);
  }
  function writeString2(value) {
    return `${value}`;
  }
  var Controller2 = class {
    constructor(context) {
      this.context = context;
    }
    static get shouldLoad() {
      return true;
    }
    get application() {
      return this.context.application;
    }
    get scope() {
      return this.context.scope;
    }
    get element() {
      return this.scope.element;
    }
    get identifier() {
      return this.scope.identifier;
    }
    get targets() {
      return this.scope.targets;
    }
    get classes() {
      return this.scope.classes;
    }
    get data() {
      return this.scope.data;
    }
    initialize() {
    }
    connect() {
    }
    disconnect() {
    }
    dispatch(eventName, { target = this.element, detail = {}, prefix: prefix2 = this.identifier, bubbles = true, cancelable = true } = {}) {
      const type = prefix2 ? `${prefix2}:${eventName}` : eventName;
      const event = new CustomEvent(type, { detail, bubbles, cancelable });
      target.dispatchEvent(event);
      return event;
    }
  };
  Controller2.blessings = [ClassPropertiesBlessing2, TargetPropertiesBlessing2, ValuePropertiesBlessing2];
  Controller2.targets = [];
  Controller2.values = {};

  // ../../node_modules/stimulus_reflex/javascript/utils.js
  var uuidv4 = () => {
    const crypto = window.crypto || window.msCrypto;
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(
      /[018]/g,
      (c) => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
  };
  var serializeForm = (form2, options2 = {}) => {
    if (!form2)
      return "";
    const w = options2.w || window;
    const { element } = options2;
    const formData = new w.FormData(form2);
    const data2 = Array.from(formData, (e) => e.map(encodeURIComponent).join("="));
    const submitButton = form2.querySelector("input[type=submit]");
    if (element && element.name && element.nodeName === "INPUT" && element.type === "submit") {
      data2.push(
        `${encodeURIComponent(element.name)}=${encodeURIComponent(element.value)}`
      );
    } else if (submitButton && submitButton.name) {
      data2.push(
        `${encodeURIComponent(submitButton.name)}=${encodeURIComponent(
          submitButton.value
        )}`
      );
    }
    return Array.from(data2).join("&");
  };
  var camelize3 = (value, uppercaseFirstLetter = true) => {
    if (typeof value !== "string")
      return "";
    value = value.replace(/[\s_](.)/g, ($1) => $1.toUpperCase()).replace(/[\s_]/g, "").replace(/^(.)/, ($1) => $1.toLowerCase());
    if (uppercaseFirstLetter)
      value = value.substr(0, 1).toUpperCase() + value.substr(1);
    return value;
  };
  var debounce = (callback, delay = 250) => {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        timeoutId = null;
        callback(...args);
      }, delay);
    };
  };
  var extractReflexName = (reflexString) => {
    const match2 = reflexString.match(/(?:.*->)?(.*?)(?:Reflex)?#/);
    return match2 ? match2[1] : "";
  };
  var emitEvent = (event, detail) => {
    document.dispatchEvent(
      new CustomEvent(event, {
        bubbles: true,
        cancelable: false,
        detail
      })
    );
    if (window.jQuery)
      window.jQuery(document).trigger(event, detail);
  };
  var elementToXPath = (element) => {
    if (element.id !== "")
      return "//*[@id='" + element.id + "']";
    if (element === document.body)
      return "/html/body";
    let ix = 0;
    const siblings = element.parentNode.childNodes;
    for (var i = 0; i < siblings.length; i++) {
      const sibling = siblings[i];
      if (sibling === element) {
        const computedPath = elementToXPath(element.parentNode);
        const tagName2 = element.tagName.toLowerCase();
        const ixInc = ix + 1;
        return `${computedPath}/${tagName2}[${ixInc}]`;
      }
      if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
        ix++;
      }
    }
  };
  var XPathToElement = (xpath) => {
    return document.evaluate(
      xpath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    ).singleNodeValue;
  };
  var XPathToArray = (xpath, reverse = false) => {
    const snapshotList = document.evaluate(
      xpath,
      document,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    );
    const snapshots = [];
    for (let i = 0; i < snapshotList.snapshotLength; i++) {
      snapshots.push(snapshotList.snapshotItem(i));
    }
    return reverse ? snapshots.reverse() : snapshots;
  };

  // ../../node_modules/stimulus_reflex/javascript/debug.js
  var debugging = false;
  var debug_default = {
    get enabled() {
      return debugging;
    },
    get disabled() {
      return !debugging;
    },
    get value() {
      return debugging;
    },
    set(value) {
      debugging = !!value;
    },
    set debug(value) {
      debugging = !!value;
    }
  };

  // ../../node_modules/cable_ready/package.json
  var version = "5.0.0-pre8";

  // ../../node_modules/cable_ready/javascript/enums.js
  var inputTags = {
    INPUT: true,
    TEXTAREA: true,
    SELECT: true
  };
  var mutableTags = {
    INPUT: true,
    TEXTAREA: true,
    OPTION: true
  };
  var textInputTypes = {
    "datetime-local": true,
    "select-multiple": true,
    "select-one": true,
    color: true,
    date: true,
    datetime: true,
    email: true,
    month: true,
    number: true,
    password: true,
    range: true,
    search: true,
    tel: true,
    text: true,
    textarea: true,
    time: true,
    url: true,
    week: true
  };

  // ../../node_modules/cable_ready/javascript/active_element.js
  var activeElement;
  var active_element_default = {
    get element() {
      return activeElement;
    },
    set(element) {
      activeElement = element;
    }
  };

  // ../../node_modules/cable_ready/javascript/utils.js
  var isTextInput = (element) => {
    return inputTags[element.tagName] && textInputTypes[element.type];
  };
  var assignFocus = (selector) => {
    const element = selector && selector.nodeType === Node.ELEMENT_NODE ? selector : document.querySelector(selector);
    const focusElement = element || active_element_default.element;
    if (focusElement && focusElement.focus)
      focusElement.focus();
  };
  var dispatch2 = (element, name, detail = {}) => {
    const init = { bubbles: true, cancelable: true, detail };
    const evt = new CustomEvent(name, init);
    element.dispatchEvent(evt);
    if (window.jQuery)
      window.jQuery(element).trigger(name, detail);
  };
  var xpathToElement = (xpath) => {
    return document.evaluate(
      xpath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    ).singleNodeValue;
  };
  var getClassNames = (names) => Array(names).flat();
  var processElements = (operation, callback) => {
    Array.from(
      operation.selectAll ? operation.element : [operation.element]
    ).forEach(callback);
  };
  var kebabize = (str) => {
    return str.split("").map((letter, idx) => {
      return letter.toUpperCase() === letter ? `${idx !== 0 ? "-" : ""}${letter.toLowerCase()}` : letter;
    }).join("");
  };
  var operate = (operation, callback) => {
    if (!operation.cancel) {
      operation.delay ? setTimeout(callback, operation.delay) : callback();
      return true;
    }
    return false;
  };
  var before = (target, operation) => dispatch2(
    target,
    `cable-ready:before-${kebabize(operation.operation)}`,
    operation
  );
  var after = (target, operation) => dispatch2(
    target,
    `cable-ready:after-${kebabize(operation.operation)}`,
    operation
  );
  function debounce2(func, timeout) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => func.apply(this, args), timeout);
    };
  }
  function handleErrors(response) {
    if (!response.ok)
      throw Error(response.statusText);
    return response;
  }
  async function graciouslyFetch(url2, additionalHeaders) {
    try {
      const response = await fetch(url2, {
        headers: {
          "X-REQUESTED-WITH": "XmlHttpRequest",
          ...additionalHeaders
        }
      });
      if (response == void 0)
        return;
      handleErrors(response);
      return response;
    } catch (e) {
      console.error(`Could not fetch ${url2}`);
    }
  }

  // ../../node_modules/cable_ready/javascript/morph_callbacks.js
  var shouldMorph = (operation) => (fromEl, toEl) => {
    return !shouldMorphCallbacks.map((callback) => {
      return typeof callback === "function" ? callback(operation, fromEl, toEl) : true;
    }).includes(false);
  };
  var didMorph = (operation) => (el) => {
    didMorphCallbacks.forEach((callback) => {
      if (typeof callback === "function")
        callback(operation, el);
    });
  };
  var verifyNotMutable = (detail, fromEl, toEl) => {
    if (!mutableTags[fromEl.tagName] && fromEl.isEqualNode(toEl))
      return false;
    return true;
  };
  var verifyNotContentEditable = (detail, fromEl, toEl) => {
    if (fromEl === active_element_default.element && fromEl.isContentEditable)
      return false;
    return true;
  };
  var verifyNotPermanent = (detail, fromEl, toEl) => {
    const { permanentAttributeName } = detail;
    if (!permanentAttributeName)
      return true;
    const permanent = fromEl.closest(`[${permanentAttributeName}]`);
    if (!permanent && fromEl === active_element_default.element && isTextInput(fromEl)) {
      const ignore = { value: true };
      Array.from(toEl.attributes).forEach((attribute) => {
        if (!ignore[attribute.name])
          fromEl.setAttribute(attribute.name, attribute.value);
      });
      return false;
    }
    return !permanent;
  };
  var shouldMorphCallbacks = [
    verifyNotMutable,
    verifyNotPermanent,
    verifyNotContentEditable
  ];
  var didMorphCallbacks = [];

  // ../../node_modules/morphdom/dist/morphdom-esm.js
  var DOCUMENT_FRAGMENT_NODE = 11;
  function morphAttrs(fromNode, toNode) {
    var toNodeAttrs = toNode.attributes;
    var attr;
    var attrName;
    var attrNamespaceURI;
    var attrValue;
    var fromValue;
    if (toNode.nodeType === DOCUMENT_FRAGMENT_NODE || fromNode.nodeType === DOCUMENT_FRAGMENT_NODE) {
      return;
    }
    for (var i = toNodeAttrs.length - 1; i >= 0; i--) {
      attr = toNodeAttrs[i];
      attrName = attr.name;
      attrNamespaceURI = attr.namespaceURI;
      attrValue = attr.value;
      if (attrNamespaceURI) {
        attrName = attr.localName || attrName;
        fromValue = fromNode.getAttributeNS(attrNamespaceURI, attrName);
        if (fromValue !== attrValue) {
          if (attr.prefix === "xmlns") {
            attrName = attr.name;
          }
          fromNode.setAttributeNS(attrNamespaceURI, attrName, attrValue);
        }
      } else {
        fromValue = fromNode.getAttribute(attrName);
        if (fromValue !== attrValue) {
          fromNode.setAttribute(attrName, attrValue);
        }
      }
    }
    var fromNodeAttrs = fromNode.attributes;
    for (var d = fromNodeAttrs.length - 1; d >= 0; d--) {
      attr = fromNodeAttrs[d];
      attrName = attr.name;
      attrNamespaceURI = attr.namespaceURI;
      if (attrNamespaceURI) {
        attrName = attr.localName || attrName;
        if (!toNode.hasAttributeNS(attrNamespaceURI, attrName)) {
          fromNode.removeAttributeNS(attrNamespaceURI, attrName);
        }
      } else {
        if (!toNode.hasAttribute(attrName)) {
          fromNode.removeAttribute(attrName);
        }
      }
    }
  }
  var range;
  var NS_XHTML = "http://www.w3.org/1999/xhtml";
  var doc = typeof document === "undefined" ? void 0 : document;
  var HAS_TEMPLATE_SUPPORT = !!doc && "content" in doc.createElement("template");
  var HAS_RANGE_SUPPORT = !!doc && doc.createRange && "createContextualFragment" in doc.createRange();
  function createFragmentFromTemplate(str) {
    var template2 = doc.createElement("template");
    template2.innerHTML = str;
    return template2.content.childNodes[0];
  }
  function createFragmentFromRange(str) {
    if (!range) {
      range = doc.createRange();
      range.selectNode(doc.body);
    }
    var fragment = range.createContextualFragment(str);
    return fragment.childNodes[0];
  }
  function createFragmentFromWrap(str) {
    var fragment = doc.createElement("body");
    fragment.innerHTML = str;
    return fragment.childNodes[0];
  }
  function toElement(str) {
    str = str.trim();
    if (HAS_TEMPLATE_SUPPORT) {
      return createFragmentFromTemplate(str);
    } else if (HAS_RANGE_SUPPORT) {
      return createFragmentFromRange(str);
    }
    return createFragmentFromWrap(str);
  }
  function compareNodeNames(fromEl, toEl) {
    var fromNodeName = fromEl.nodeName;
    var toNodeName = toEl.nodeName;
    var fromCodeStart, toCodeStart;
    if (fromNodeName === toNodeName) {
      return true;
    }
    fromCodeStart = fromNodeName.charCodeAt(0);
    toCodeStart = toNodeName.charCodeAt(0);
    if (fromCodeStart <= 90 && toCodeStart >= 97) {
      return fromNodeName === toNodeName.toUpperCase();
    } else if (toCodeStart <= 90 && fromCodeStart >= 97) {
      return toNodeName === fromNodeName.toUpperCase();
    } else {
      return false;
    }
  }
  function createElementNS(name, namespaceURI) {
    return !namespaceURI || namespaceURI === NS_XHTML ? doc.createElement(name) : doc.createElementNS(namespaceURI, name);
  }
  function moveChildren(fromEl, toEl) {
    var curChild = fromEl.firstChild;
    while (curChild) {
      var nextChild = curChild.nextSibling;
      toEl.appendChild(curChild);
      curChild = nextChild;
    }
    return toEl;
  }
  function syncBooleanAttrProp(fromEl, toEl, name) {
    if (fromEl[name] !== toEl[name]) {
      fromEl[name] = toEl[name];
      if (fromEl[name]) {
        fromEl.setAttribute(name, "");
      } else {
        fromEl.removeAttribute(name);
      }
    }
  }
  var specialElHandlers = {
    OPTION: function(fromEl, toEl) {
      var parentNode = fromEl.parentNode;
      if (parentNode) {
        var parentName = parentNode.nodeName.toUpperCase();
        if (parentName === "OPTGROUP") {
          parentNode = parentNode.parentNode;
          parentName = parentNode && parentNode.nodeName.toUpperCase();
        }
        if (parentName === "SELECT" && !parentNode.hasAttribute("multiple")) {
          if (fromEl.hasAttribute("selected") && !toEl.selected) {
            fromEl.setAttribute("selected", "selected");
            fromEl.removeAttribute("selected");
          }
          parentNode.selectedIndex = -1;
        }
      }
      syncBooleanAttrProp(fromEl, toEl, "selected");
    },
    INPUT: function(fromEl, toEl) {
      syncBooleanAttrProp(fromEl, toEl, "checked");
      syncBooleanAttrProp(fromEl, toEl, "disabled");
      if (fromEl.value !== toEl.value) {
        fromEl.value = toEl.value;
      }
      if (!toEl.hasAttribute("value")) {
        fromEl.removeAttribute("value");
      }
    },
    TEXTAREA: function(fromEl, toEl) {
      var newValue = toEl.value;
      if (fromEl.value !== newValue) {
        fromEl.value = newValue;
      }
      var firstChild = fromEl.firstChild;
      if (firstChild) {
        var oldValue = firstChild.nodeValue;
        if (oldValue == newValue || !newValue && oldValue == fromEl.placeholder) {
          return;
        }
        firstChild.nodeValue = newValue;
      }
    },
    SELECT: function(fromEl, toEl) {
      if (!toEl.hasAttribute("multiple")) {
        var selectedIndex = -1;
        var i = 0;
        var curChild = fromEl.firstChild;
        var optgroup;
        var nodeName;
        while (curChild) {
          nodeName = curChild.nodeName && curChild.nodeName.toUpperCase();
          if (nodeName === "OPTGROUP") {
            optgroup = curChild;
            curChild = optgroup.firstChild;
          } else {
            if (nodeName === "OPTION") {
              if (curChild.hasAttribute("selected")) {
                selectedIndex = i;
                break;
              }
              i++;
            }
            curChild = curChild.nextSibling;
            if (!curChild && optgroup) {
              curChild = optgroup.nextSibling;
              optgroup = null;
            }
          }
        }
        fromEl.selectedIndex = selectedIndex;
      }
    }
  };
  var ELEMENT_NODE = 1;
  var DOCUMENT_FRAGMENT_NODE$1 = 11;
  var TEXT_NODE = 3;
  var COMMENT_NODE = 8;
  function noop() {
  }
  function defaultGetNodeKey(node) {
    if (node) {
      return node.getAttribute && node.getAttribute("id") || node.id;
    }
  }
  function morphdomFactory(morphAttrs2) {
    return function morphdom2(fromNode, toNode, options2) {
      if (!options2) {
        options2 = {};
      }
      if (typeof toNode === "string") {
        if (fromNode.nodeName === "#document" || fromNode.nodeName === "HTML" || fromNode.nodeName === "BODY") {
          var toNodeHtml = toNode;
          toNode = doc.createElement("html");
          toNode.innerHTML = toNodeHtml;
        } else {
          toNode = toElement(toNode);
        }
      }
      var getNodeKey = options2.getNodeKey || defaultGetNodeKey;
      var onBeforeNodeAdded = options2.onBeforeNodeAdded || noop;
      var onNodeAdded = options2.onNodeAdded || noop;
      var onBeforeElUpdated = options2.onBeforeElUpdated || noop;
      var onElUpdated = options2.onElUpdated || noop;
      var onBeforeNodeDiscarded = options2.onBeforeNodeDiscarded || noop;
      var onNodeDiscarded = options2.onNodeDiscarded || noop;
      var onBeforeElChildrenUpdated = options2.onBeforeElChildrenUpdated || noop;
      var childrenOnly = options2.childrenOnly === true;
      var fromNodesLookup = /* @__PURE__ */ Object.create(null);
      var keyedRemovalList = [];
      function addKeyedRemoval(key) {
        keyedRemovalList.push(key);
      }
      function walkDiscardedChildNodes(node, skipKeyedNodes) {
        if (node.nodeType === ELEMENT_NODE) {
          var curChild = node.firstChild;
          while (curChild) {
            var key = void 0;
            if (skipKeyedNodes && (key = getNodeKey(curChild))) {
              addKeyedRemoval(key);
            } else {
              onNodeDiscarded(curChild);
              if (curChild.firstChild) {
                walkDiscardedChildNodes(curChild, skipKeyedNodes);
              }
            }
            curChild = curChild.nextSibling;
          }
        }
      }
      function removeNode2(node, parentNode, skipKeyedNodes) {
        if (onBeforeNodeDiscarded(node) === false) {
          return;
        }
        if (parentNode) {
          parentNode.removeChild(node);
        }
        onNodeDiscarded(node);
        walkDiscardedChildNodes(node, skipKeyedNodes);
      }
      function indexTree(node) {
        if (node.nodeType === ELEMENT_NODE || node.nodeType === DOCUMENT_FRAGMENT_NODE$1) {
          var curChild = node.firstChild;
          while (curChild) {
            var key = getNodeKey(curChild);
            if (key) {
              fromNodesLookup[key] = curChild;
            }
            indexTree(curChild);
            curChild = curChild.nextSibling;
          }
        }
      }
      indexTree(fromNode);
      function handleNodeAdded(el) {
        onNodeAdded(el);
        var curChild = el.firstChild;
        while (curChild) {
          var nextSibling = curChild.nextSibling;
          var key = getNodeKey(curChild);
          if (key) {
            var unmatchedFromEl = fromNodesLookup[key];
            if (unmatchedFromEl && compareNodeNames(curChild, unmatchedFromEl)) {
              curChild.parentNode.replaceChild(unmatchedFromEl, curChild);
              morphEl(unmatchedFromEl, curChild);
            } else {
              handleNodeAdded(curChild);
            }
          } else {
            handleNodeAdded(curChild);
          }
          curChild = nextSibling;
        }
      }
      function cleanupFromEl(fromEl, curFromNodeChild, curFromNodeKey) {
        while (curFromNodeChild) {
          var fromNextSibling = curFromNodeChild.nextSibling;
          if (curFromNodeKey = getNodeKey(curFromNodeChild)) {
            addKeyedRemoval(curFromNodeKey);
          } else {
            removeNode2(curFromNodeChild, fromEl, true);
          }
          curFromNodeChild = fromNextSibling;
        }
      }
      function morphEl(fromEl, toEl, childrenOnly2) {
        var toElKey = getNodeKey(toEl);
        if (toElKey) {
          delete fromNodesLookup[toElKey];
        }
        if (!childrenOnly2) {
          if (onBeforeElUpdated(fromEl, toEl) === false) {
            return;
          }
          morphAttrs2(fromEl, toEl);
          onElUpdated(fromEl);
          if (onBeforeElChildrenUpdated(fromEl, toEl) === false) {
            return;
          }
        }
        if (fromEl.nodeName !== "TEXTAREA") {
          morphChildren(fromEl, toEl);
        } else {
          specialElHandlers.TEXTAREA(fromEl, toEl);
        }
      }
      function morphChildren(fromEl, toEl) {
        var curToNodeChild = toEl.firstChild;
        var curFromNodeChild = fromEl.firstChild;
        var curToNodeKey;
        var curFromNodeKey;
        var fromNextSibling;
        var toNextSibling;
        var matchingFromEl;
        outer:
          while (curToNodeChild) {
            toNextSibling = curToNodeChild.nextSibling;
            curToNodeKey = getNodeKey(curToNodeChild);
            while (curFromNodeChild) {
              fromNextSibling = curFromNodeChild.nextSibling;
              if (curToNodeChild.isSameNode && curToNodeChild.isSameNode(curFromNodeChild)) {
                curToNodeChild = toNextSibling;
                curFromNodeChild = fromNextSibling;
                continue outer;
              }
              curFromNodeKey = getNodeKey(curFromNodeChild);
              var curFromNodeType = curFromNodeChild.nodeType;
              var isCompatible = void 0;
              if (curFromNodeType === curToNodeChild.nodeType) {
                if (curFromNodeType === ELEMENT_NODE) {
                  if (curToNodeKey) {
                    if (curToNodeKey !== curFromNodeKey) {
                      if (matchingFromEl = fromNodesLookup[curToNodeKey]) {
                        if (fromNextSibling === matchingFromEl) {
                          isCompatible = false;
                        } else {
                          fromEl.insertBefore(matchingFromEl, curFromNodeChild);
                          if (curFromNodeKey) {
                            addKeyedRemoval(curFromNodeKey);
                          } else {
                            removeNode2(curFromNodeChild, fromEl, true);
                          }
                          curFromNodeChild = matchingFromEl;
                        }
                      } else {
                        isCompatible = false;
                      }
                    }
                  } else if (curFromNodeKey) {
                    isCompatible = false;
                  }
                  isCompatible = isCompatible !== false && compareNodeNames(curFromNodeChild, curToNodeChild);
                  if (isCompatible) {
                    morphEl(curFromNodeChild, curToNodeChild);
                  }
                } else if (curFromNodeType === TEXT_NODE || curFromNodeType == COMMENT_NODE) {
                  isCompatible = true;
                  if (curFromNodeChild.nodeValue !== curToNodeChild.nodeValue) {
                    curFromNodeChild.nodeValue = curToNodeChild.nodeValue;
                  }
                }
              }
              if (isCompatible) {
                curToNodeChild = toNextSibling;
                curFromNodeChild = fromNextSibling;
                continue outer;
              }
              if (curFromNodeKey) {
                addKeyedRemoval(curFromNodeKey);
              } else {
                removeNode2(curFromNodeChild, fromEl, true);
              }
              curFromNodeChild = fromNextSibling;
            }
            if (curToNodeKey && (matchingFromEl = fromNodesLookup[curToNodeKey]) && compareNodeNames(matchingFromEl, curToNodeChild)) {
              fromEl.appendChild(matchingFromEl);
              morphEl(matchingFromEl, curToNodeChild);
            } else {
              var onBeforeNodeAddedResult = onBeforeNodeAdded(curToNodeChild);
              if (onBeforeNodeAddedResult !== false) {
                if (onBeforeNodeAddedResult) {
                  curToNodeChild = onBeforeNodeAddedResult;
                }
                if (curToNodeChild.actualize) {
                  curToNodeChild = curToNodeChild.actualize(fromEl.ownerDocument || doc);
                }
                fromEl.appendChild(curToNodeChild);
                handleNodeAdded(curToNodeChild);
              }
            }
            curToNodeChild = toNextSibling;
            curFromNodeChild = fromNextSibling;
          }
        cleanupFromEl(fromEl, curFromNodeChild, curFromNodeKey);
        var specialElHandler = specialElHandlers[fromEl.nodeName];
        if (specialElHandler) {
          specialElHandler(fromEl, toEl);
        }
      }
      var morphedNode = fromNode;
      var morphedNodeType = morphedNode.nodeType;
      var toNodeType = toNode.nodeType;
      if (!childrenOnly) {
        if (morphedNodeType === ELEMENT_NODE) {
          if (toNodeType === ELEMENT_NODE) {
            if (!compareNodeNames(fromNode, toNode)) {
              onNodeDiscarded(fromNode);
              morphedNode = moveChildren(fromNode, createElementNS(toNode.nodeName, toNode.namespaceURI));
            }
          } else {
            morphedNode = toNode;
          }
        } else if (morphedNodeType === TEXT_NODE || morphedNodeType === COMMENT_NODE) {
          if (toNodeType === morphedNodeType) {
            if (morphedNode.nodeValue !== toNode.nodeValue) {
              morphedNode.nodeValue = toNode.nodeValue;
            }
            return morphedNode;
          } else {
            morphedNode = toNode;
          }
        }
      }
      if (morphedNode === toNode) {
        onNodeDiscarded(fromNode);
      } else {
        if (toNode.isSameNode && toNode.isSameNode(morphedNode)) {
          return;
        }
        morphEl(morphedNode, toNode, childrenOnly);
        if (keyedRemovalList) {
          for (var i = 0, len = keyedRemovalList.length; i < len; i++) {
            var elToRemove = fromNodesLookup[keyedRemovalList[i]];
            if (elToRemove) {
              removeNode2(elToRemove, elToRemove.parentNode, false);
            }
          }
        }
      }
      if (!childrenOnly && morphedNode !== fromNode && fromNode.parentNode) {
        if (morphedNode.actualize) {
          morphedNode = morphedNode.actualize(fromNode.ownerDocument || doc);
        }
        fromNode.parentNode.replaceChild(morphedNode, fromNode);
      }
      return morphedNode;
    };
  }
  var morphdom = morphdomFactory(morphAttrs);
  var morphdom_esm_default = morphdom;

  // ../../node_modules/cable_ready/javascript/operations.js
  var operations_default = {
    append: (operation) => {
      processElements(operation, (element) => {
        before(element, operation);
        operate(operation, () => {
          const { html: html2, focusSelector } = operation;
          element.insertAdjacentHTML("beforeend", html2 || "");
          assignFocus(focusSelector);
        });
        after(element, operation);
      });
    },
    graft: (operation) => {
      processElements(operation, (element) => {
        before(element, operation);
        operate(operation, () => {
          const { parent, focusSelector } = operation;
          const parentElement = document.querySelector(parent);
          if (parentElement) {
            parentElement.appendChild(element);
            assignFocus(focusSelector);
          }
        });
        after(element, operation);
      });
    },
    innerHtml: (operation) => {
      processElements(operation, (element) => {
        before(element, operation);
        operate(operation, () => {
          const { html: html2, focusSelector } = operation;
          element.innerHTML = html2 || "";
          assignFocus(focusSelector);
        });
        after(element, operation);
      });
    },
    insertAdjacentHtml: (operation) => {
      processElements(operation, (element) => {
        before(element, operation);
        operate(operation, () => {
          const { html: html2, position, focusSelector } = operation;
          element.insertAdjacentHTML(position || "beforeend", html2 || "");
          assignFocus(focusSelector);
        });
        after(element, operation);
      });
    },
    insertAdjacentText: (operation) => {
      processElements(operation, (element) => {
        before(element, operation);
        operate(operation, () => {
          const { text, position, focusSelector } = operation;
          element.insertAdjacentText(position || "beforeend", text || "");
          assignFocus(focusSelector);
        });
        after(element, operation);
      });
    },
    morph: (operation) => {
      processElements(operation, (element) => {
        const { html: html2 } = operation;
        const template2 = document.createElement("template");
        template2.innerHTML = String(html2).trim();
        operation.content = template2.content;
        const parent = element.parentElement;
        const ordinal = Array.from(parent.children).indexOf(element);
        before(element, operation);
        operate(operation, () => {
          const { childrenOnly, focusSelector } = operation;
          morphdom_esm_default(
            element,
            childrenOnly ? template2.content : template2.innerHTML,
            {
              childrenOnly: !!childrenOnly,
              onBeforeElUpdated: shouldMorph(operation),
              onElUpdated: didMorph(operation)
            }
          );
          assignFocus(focusSelector);
        });
        after(parent.children[ordinal], operation);
      });
    },
    outerHtml: (operation) => {
      processElements(operation, (element) => {
        const parent = element.parentElement;
        const ordinal = Array.from(parent.children).indexOf(element);
        before(element, operation);
        operate(operation, () => {
          const { html: html2, focusSelector } = operation;
          element.outerHTML = html2 || "";
          assignFocus(focusSelector);
        });
        after(parent.children[ordinal], operation);
      });
    },
    prepend: (operation) => {
      processElements(operation, (element) => {
        before(element, operation);
        operate(operation, () => {
          const { html: html2, focusSelector } = operation;
          element.insertAdjacentHTML("afterbegin", html2 || "");
          assignFocus(focusSelector);
        });
        after(element, operation);
      });
    },
    remove: (operation) => {
      processElements(operation, (element) => {
        before(element, operation);
        operate(operation, () => {
          const { focusSelector } = operation;
          element.remove();
          assignFocus(focusSelector);
        });
        after(document, operation);
      });
    },
    replace: (operation) => {
      processElements(operation, (element) => {
        const parent = element.parentElement;
        const ordinal = Array.from(parent.children).indexOf(element);
        before(element, operation);
        operate(operation, () => {
          const { html: html2, focusSelector } = operation;
          element.outerHTML = html2 || "";
          assignFocus(focusSelector);
        });
        after(parent.children[ordinal], operation);
      });
    },
    textContent: (operation) => {
      processElements(operation, (element) => {
        before(element, operation);
        operate(operation, () => {
          const { text, focusSelector } = operation;
          element.textContent = text || "";
          assignFocus(focusSelector);
        });
        after(element, operation);
      });
    },
    addCssClass: (operation) => {
      processElements(operation, (element) => {
        before(element, operation);
        operate(operation, () => {
          const { name } = operation;
          element.classList.add(...getClassNames(name || ""));
        });
        after(element, operation);
      });
    },
    removeAttribute: (operation) => {
      processElements(operation, (element) => {
        before(element, operation);
        operate(operation, () => {
          const { name } = operation;
          element.removeAttribute(name);
        });
        after(element, operation);
      });
    },
    removeCssClass: (operation) => {
      processElements(operation, (element) => {
        before(element, operation);
        operate(operation, () => {
          const { name } = operation;
          element.classList.remove(...getClassNames(name));
        });
        after(element, operation);
      });
    },
    setAttribute: (operation) => {
      processElements(operation, (element) => {
        before(element, operation);
        operate(operation, () => {
          const { name, value } = operation;
          element.setAttribute(name, value || "");
        });
        after(element, operation);
      });
    },
    setDatasetProperty: (operation) => {
      processElements(operation, (element) => {
        before(element, operation);
        operate(operation, () => {
          const { name, value } = operation;
          element.dataset[name] = value || "";
        });
        after(element, operation);
      });
    },
    setProperty: (operation) => {
      processElements(operation, (element) => {
        before(element, operation);
        operate(operation, () => {
          const { name, value } = operation;
          if (name in element)
            element[name] = value || "";
        });
        after(element, operation);
      });
    },
    setStyle: (operation) => {
      processElements(operation, (element) => {
        before(element, operation);
        operate(operation, () => {
          const { name, value } = operation;
          element.style[name] = value || "";
        });
        after(element, operation);
      });
    },
    setStyles: (operation) => {
      processElements(operation, (element) => {
        before(element, operation);
        operate(operation, () => {
          const { styles } = operation;
          for (let [name, value] of Object.entries(styles))
            element.style[name] = value || "";
        });
        after(element, operation);
      });
    },
    setValue: (operation) => {
      processElements(operation, (element) => {
        before(element, operation);
        operate(operation, () => {
          const { value } = operation;
          element.value = value || "";
        });
        after(element, operation);
      });
    },
    dispatchEvent: (operation) => {
      processElements(operation, (element) => {
        before(element, operation);
        operate(operation, () => {
          const { name, detail } = operation;
          dispatch2(element, name, detail);
        });
        after(element, operation);
      });
    },
    setMeta: (operation) => {
      before(document, operation);
      operate(operation, () => {
        const { name, content } = operation;
        let meta = document.head.querySelector(`meta[name='${name}']`);
        if (!meta) {
          meta = document.createElement("meta");
          meta.name = name;
          document.head.appendChild(meta);
        }
        meta.content = content;
      });
      after(document, operation);
    },
    clearStorage: (operation) => {
      before(document, operation);
      operate(operation, () => {
        const { type } = operation;
        const storage = type === "session" ? sessionStorage : localStorage;
        storage.clear();
      });
      after(document, operation);
    },
    go: (operation) => {
      before(window, operation);
      operate(operation, () => {
        const { delta } = operation;
        history.go(delta);
      });
      after(window, operation);
    },
    pushState: (operation) => {
      before(window, operation);
      operate(operation, () => {
        const { state, title, url: url2 } = operation;
        history.pushState(state || {}, title || "", url2);
      });
      after(window, operation);
    },
    redirectTo: (operation) => {
      before(window, operation);
      operate(operation, () => {
        let { url: url2, action } = operation;
        action = action || "advance";
        if (window.Turbo)
          window.Turbo.visit(url2, { action });
        if (window.Turbolinks)
          window.Turbolinks.visit(url2, { action });
        if (!window.Turbo && !window.Turbolinks)
          window.location.href = url2;
      });
      after(window, operation);
    },
    reload: (operation) => {
      before(window, operation);
      operate(operation, () => {
        window.location.reload();
      });
      after(window, operation);
    },
    removeStorageItem: (operation) => {
      before(document, operation);
      operate(operation, () => {
        const { key, type } = operation;
        const storage = type === "session" ? sessionStorage : localStorage;
        storage.removeItem(key);
      });
      after(document, operation);
    },
    replaceState: (operation) => {
      before(window, operation);
      operate(operation, () => {
        const { state, title, url: url2 } = operation;
        history.replaceState(state || {}, title || "", url2);
      });
      after(window, operation);
    },
    scrollIntoView: (operation) => {
      const { element } = operation;
      before(element, operation);
      operate(operation, () => {
        element.scrollIntoView(operation);
      });
      after(element, operation);
    },
    setCookie: (operation) => {
      before(document, operation);
      operate(operation, () => {
        const { cookie } = operation;
        document.cookie = cookie || "";
      });
      after(document, operation);
    },
    setFocus: (operation) => {
      const { element } = operation;
      before(element, operation);
      operate(operation, () => {
        assignFocus(element);
      });
      after(element, operation);
    },
    setStorageItem: (operation) => {
      before(document, operation);
      operate(operation, () => {
        const { key, value, type } = operation;
        const storage = type === "session" ? sessionStorage : localStorage;
        storage.setItem(key, value || "");
      });
      after(document, operation);
    },
    consoleLog: (operation) => {
      before(document, operation);
      operate(operation, () => {
        const { message, level } = operation;
        level && ["warn", "info", "error"].includes(level) ? console[level](message || "") : console.log(message || "");
      });
      after(document, operation);
    },
    consoleTable: (operation) => {
      before(document, operation);
      operate(operation, () => {
        const { data: data2, columns } = operation;
        console.table(data2, columns || []);
      });
      after(document, operation);
    },
    notification: (operation) => {
      before(document, operation);
      operate(operation, () => {
        const { title, options: options2 } = operation;
        Notification.requestPermission().then((result) => {
          operation.permission = result;
          if (result === "granted")
            new Notification(title || "", options2);
        });
      });
      after(document, operation);
    }
  };

  // ../../node_modules/cable_ready/javascript/operation_store.js
  var operations = operations_default;
  var add2 = (newOperations) => {
    operations = { ...operations, ...newOperations };
  };
  var addOperations = (operations2) => {
    add2(operations2);
  };
  var addOperation = (name, operation) => {
    const operations2 = {};
    operations2[name] = operation;
    add2(operations2);
  };
  var operation_store_default = {
    get all() {
      return operations;
    }
  };

  // ../../node_modules/cable_ready/javascript/action_cable.js
  var consumer2;
  var wait = () => new Promise((resolve) => setTimeout(resolve));
  var retryGetConsumer = async () => {
    if (!consumer2) {
      await wait();
      return retryGetConsumer();
    } else {
      return consumer2;
    }
  };
  var action_cable_default = {
    setConsumer(value) {
      consumer2 = value;
    },
    async getConsumer() {
      return new Promise((resolve, reject) => {
        consumer2 = retryGetConsumer();
        resolve(consumer2);
      });
    }
  };

  // ../../node_modules/cable_ready/javascript/elements/subscribing_element.js
  var SubscribingElement = class extends HTMLElement {
    disconnectedCallback() {
      if (this.channel)
        this.channel.unsubscribe();
    }
    createSubscription(consumer5, channel, receivedCallback) {
      this.channel = consumer5.subscriptions.create(
        {
          channel,
          identifier: this.getAttribute("identifier")
        },
        {
          received: receivedCallback
        }
      );
    }
    get preview() {
      return document.documentElement.hasAttribute("data-turbolinks-preview") || document.documentElement.hasAttribute("data-turbo-preview");
    }
  };

  // ../../node_modules/cable_ready/javascript/elements/stream_from_element.js
  var StreamFromElement = class extends SubscribingElement {
    async connectedCallback() {
      if (this.preview)
        return;
      const consumer5 = await javascript_default.consumer;
      if (consumer5) {
        this.createSubscription(
          consumer5,
          "CableReady::Stream",
          this.performOperations
        );
      } else {
        console.error(
          "The `stream_from` helper cannot connect without an ActionCable consumer.\nPlease run `rails generate cable_ready:helpers` to fix this."
        );
      }
    }
    performOperations(data2) {
      if (data2.cableReady)
        javascript_default.perform(data2.operations);
    }
  };

  // ../../node_modules/cable_ready/javascript/elements/updates_for_element.js
  var template = `
<style>
  :host {
    display: block;
  }
</style>
<slot></slot>
`;
  function url(ele) {
    return ele.hasAttribute("url") ? ele.getAttribute("url") : location.href;
  }
  var UpdatesForElement = class extends SubscribingElement {
    constructor() {
      super();
      const shadowRoot = this.attachShadow({ mode: "open" });
      shadowRoot.innerHTML = template;
    }
    async connectedCallback() {
      if (this.preview)
        return;
      this.update = debounce2(this.update.bind(this), this.debounce);
      const consumer5 = await javascript_default.consumer;
      if (consumer5) {
        this.createSubscription(consumer5, "CableReady::Stream", this.update);
      } else {
        console.error(
          "The `updates-for` helper cannot connect without an ActionCable consumer.\nPlease run `rails generate cable_ready:helpers` to fix this."
        );
      }
    }
    async update(data2) {
      const identifier = this.getAttribute("identifier");
      const query = `updates-for[identifier="${identifier}"]`;
      const blocks = document.querySelectorAll(query);
      if (blocks[0] !== this)
        return;
      const only = this.getAttribute("only");
      if (only && data2.changed && !only.split(" ").some((attribute) => data2.changed.includes(attribute)))
        return;
      const html2 = {};
      const template2 = document.createElement("template");
      for (let i = 0; i < blocks.length; i++) {
        blocks[i].setAttribute("updating", "updating");
        if (!html2.hasOwnProperty(url(blocks[i]))) {
          const response = await graciouslyFetch(url(blocks[i]), {
            "X-Cable-Ready": "update"
          });
          html2[url(blocks[i])] = await response.text();
        }
        template2.innerHTML = String(html2[url(blocks[i])]).trim();
        await this.resolveTurboFrames(template2.content);
        const fragments = template2.content.querySelectorAll(query);
        if (fragments.length <= i) {
          console.warn("Update aborted due to mismatched number of elements");
          return;
        }
        active_element_default.set(document.activeElement);
        const operation = {
          element: blocks[i],
          html: fragments[i],
          permanentAttributeName: "data-ignore-updates"
        };
        dispatch2(blocks[i], "cable-ready:before-update", operation);
        morphdom_esm_default(blocks[i], fragments[i], {
          childrenOnly: true,
          onBeforeElUpdated: shouldMorph(operation),
          onElUpdated: (_2) => {
            blocks[i].removeAttribute("updating");
            dispatch2(blocks[i], "cable-ready:after-update", operation);
            assignFocus(operation.focusSelector);
          }
        });
      }
    }
    async resolveTurboFrames(documentFragment) {
      const reloadingTurboFrames = [
        ...documentFragment.querySelectorAll(
          'turbo-frame[src]:not([loading="lazy"])'
        )
      ];
      return Promise.all(
        reloadingTurboFrames.map((frame) => {
          return new Promise(async (resolve) => {
            const frameResponse = await graciouslyFetch(
              frame.getAttribute("src"),
              {
                "Turbo-Frame": frame.id,
                "X-Cable-Ready": "update"
              }
            );
            const frameTemplate = document.createElement("template");
            frameTemplate.innerHTML = await frameResponse.text();
            await this.resolveTurboFrames(frameTemplate.content);
            documentFragment.querySelector(
              `turbo-frame#${frame.id}`
            ).innerHTML = String(
              frameTemplate.content.querySelector(`turbo-frame#${frame.id}`).innerHTML
            ).trim();
            resolve();
          });
        })
      );
    }
    get debounce() {
      return this.hasAttribute("debounce") ? parseInt(this.getAttribute("debounce")) : 20;
    }
  };

  // ../../node_modules/cable_ready/javascript/cable_ready.js
  var perform = (operations2, options2 = { emitMissingElementWarnings: true }) => {
    const batches = {};
    operations2.forEach((operation) => {
      if (!!operation.batch)
        batches[operation.batch] = batches[operation.batch] ? ++batches[operation.batch] : 1;
    });
    operations2.forEach((operation) => {
      const name = operation.operation;
      try {
        if (operation.selector) {
          operation.element = operation.xpath ? xpathToElement(operation.selector) : document[operation.selectAll ? "querySelectorAll" : "querySelector"](operation.selector);
        } else {
          operation.element = document;
        }
        if (operation.element || options2.emitMissingElementWarnings) {
          active_element_default.set(document.activeElement);
          const cableReadyOperation = operation_store_default.all[name];
          if (cableReadyOperation) {
            cableReadyOperation(operation);
            if (!!operation.batch && --batches[operation.batch] === 0)
              dispatch2(document, "cable-ready:batch-complete", {
                batch: operation.batch
              });
          } else {
            console.error(
              `CableReady couldn't find the "${name}" operation. Make sure you use the camelized form when calling an operation method.`
            );
          }
        }
      } catch (e) {
        if (operation.element) {
          console.error(
            `CableReady detected an error in ${name}: ${e.message}. If you need to support older browsers make sure you've included the corresponding polyfills. https://docs.stimulusreflex.com/setup#polyfills-for-ie11.`
          );
          console.error(e);
        } else {
          console.warn(
            `CableReady ${name} failed due to missing DOM element for selector: '${operation.selector}'`
          );
        }
      }
    });
  };
  var performAsync = (operations2, options2 = { emitMissingElementWarnings: true }) => {
    return new Promise((resolve, reject) => {
      try {
        resolve(perform(operations2, options2));
      } catch (err) {
        reject(err);
      }
    });
  };
  var initialize = (initializeOptions = {}) => {
    const { consumer: consumer5 } = initializeOptions;
    action_cable_default.setConsumer(consumer5);
    if (!customElements.get("stream-from"))
      customElements.define("stream-from", StreamFromElement);
    if (!customElements.get("updates-for"))
      customElements.define("updates-for", UpdatesForElement);
  };
  var consumer3 = action_cable_default.getConsumer();

  // ../../node_modules/cable_ready/javascript/index.js
  var javascript_default = {
    perform,
    performAsync,
    shouldMorphCallbacks,
    didMorphCallbacks,
    initialize,
    consumer: consumer3,
    addOperation,
    addOperations,
    version,
    get DOMOperations() {
      console.warn(
        "DEPRECATED: Please use `CableReady.operations` instead of `CableReady.DOMOperations`"
      );
      return operation_store_default.all;
    },
    get operations() {
      return operation_store_default.all;
    }
  };

  // ../../node_modules/stimulus_reflex/javascript/schema.js
  var defaultSchema2 = {
    reflexAttribute: "data-reflex",
    reflexPermanentAttribute: "data-reflex-permanent",
    reflexRootAttribute: "data-reflex-root",
    reflexSuppressLoggingAttribute: "data-reflex-suppress-logging",
    reflexDatasetAttribute: "data-reflex-dataset",
    reflexDatasetAllAttribute: "data-reflex-dataset-all",
    reflexSerializeFormAttribute: "data-reflex-serialize-form",
    reflexFormSelectorAttribute: "data-reflex-form-selector",
    reflexIncludeInnerHtmlAttribute: "data-reflex-include-inner-html",
    reflexIncludeTextContentAttribute: "data-reflex-include-text-content"
  };
  var schema = {};
  var schema_default = {
    set(application2) {
      schema = { ...defaultSchema2, ...application2.schema };
      for (const attribute in schema)
        Object.defineProperty(this, attribute.slice(0, -9), {
          get: () => {
            return schema[attribute];
          }
        });
    }
  };

  // ../../node_modules/stimulus_reflex/javascript/isolation_mode.js
  var isolationMode = false;
  var isolation_mode_default = {
    get disabled() {
      return !isolationMode;
    },
    set(value) {
      isolationMode = value;
    }
  };

  // ../../node_modules/stimulus_reflex/javascript/deprecate.js
  var deprecationWarnings = true;
  var deprecate_default = {
    get enabled() {
      return deprecationWarnings;
    },
    get disabled() {
      return !deprecationWarnings;
    },
    get value() {
      return deprecationWarnings;
    },
    set(value) {
      deprecationWarnings = !!value;
    },
    set deprecate(value) {
      deprecationWarnings = !!value;
    }
  };

  // ../../node_modules/stimulus_reflex/javascript/attributes.js
  var multipleInstances = (element) => {
    if (["checkbox", "radio"].includes(element.type)) {
      return document.querySelectorAll(
        `input[type="${element.type}"][name="${element.name}"]`
      ).length > 1;
    }
    return false;
  };
  var collectCheckedOptions = (element) => {
    return Array.from(element.querySelectorAll("option:checked")).concat(
      Array.from(
        document.querySelectorAll(
          `input[type="${element.type}"][name="${element.name}"]`
        )
      ).filter((elem) => elem.checked)
    ).map((o) => o.value);
  };
  var attributeValue = (values = []) => {
    const value = values.filter((v) => v && String(v).length).map((v) => v.trim()).join(" ").trim();
    return value.length ? value : null;
  };
  var attributeValues = (value) => {
    if (!value)
      return [];
    if (!value.length)
      return [];
    return value.split(" ").filter((v) => v.trim().length);
  };
  var extractElementAttributes = (element) => {
    let attrs = Array.from(element.attributes).reduce((memo, attr) => {
      memo[attr.name] = attr.value;
      return memo;
    }, {});
    attrs.checked = !!element.checked;
    attrs.selected = !!element.selected;
    attrs.tag_name = element.tagName;
    if (element.tagName.match(/select/i) || multipleInstances(element)) {
      const collectedOptions = collectCheckedOptions(element);
      attrs.values = collectedOptions;
      attrs.value = collectedOptions.join(",");
    } else {
      attrs.value = element.value;
    }
    return attrs;
  };
  var getElementsFromTokens = (element, tokens) => {
    if (!tokens || tokens.length === 0)
      return [];
    let elements = [element];
    const xPath = elementToXPath(element);
    tokens.forEach((token) => {
      try {
        switch (token) {
          case "combined":
            if (deprecate_default.enabled)
              console.warn(
                "In the next version of StimulusReflex, the 'combined' option to data-reflex-dataset will become 'ancestors'."
              );
            elements = [
              ...elements,
              ...XPathToArray(`${xPath}/ancestor::*`, true)
            ];
            break;
          case "ancestors":
            elements = [
              ...elements,
              ...XPathToArray(`${xPath}/ancestor::*`, true)
            ];
            break;
          case "parent":
            elements = [...elements, ...XPathToArray(`${xPath}/parent::*`)];
            break;
          case "siblings":
            elements = [
              ...elements,
              ...XPathToArray(
                `${xPath}/preceding-sibling::*|${xPath}/following-sibling::*`
              )
            ];
            break;
          case "children":
            elements = [...elements, ...XPathToArray(`${xPath}/child::*`)];
            break;
          case "descendants":
            elements = [...elements, ...XPathToArray(`${xPath}/descendant::*`)];
            break;
          default:
            elements = [...elements, ...document.querySelectorAll(token)];
        }
      } catch (error4) {
        if (debug_default.enabled)
          console.error(error4);
      }
    });
    return elements;
  };
  var extractElementDataset = (element) => {
    const dataset = element.attributes[schema_default.reflexDataset];
    const allDataset = element.attributes[schema_default.reflexDatasetAll];
    const tokens = dataset && dataset.value.split(" ") || [];
    const allTokens = allDataset && allDataset.value.split(" ") || [];
    const datasetElements = getElementsFromTokens(element, tokens);
    const datasetAllElements = getElementsFromTokens(element, allTokens);
    const datasetAttributes = datasetElements.reduce((acc, ele) => {
      return { ...extractDataAttributes(ele), ...acc };
    }, {});
    const reflexElementAttributes = extractDataAttributes(element);
    const elementDataset = {
      dataset: { ...reflexElementAttributes, ...datasetAttributes },
      datasetAll: {}
    };
    datasetAllElements.forEach((element2) => {
      const elementAttributes = extractDataAttributes(element2);
      Object.keys(elementAttributes).forEach((key) => {
        const value = elementAttributes[key];
        if (elementDataset.datasetAll[key] && Array.isArray(elementDataset.datasetAll[key])) {
          elementDataset.datasetAll[key].push(value);
        } else {
          elementDataset.datasetAll[key] = [value];
        }
      });
    });
    return elementDataset;
  };
  var extractDataAttributes = (element) => {
    let attrs = {};
    if (element && element.attributes) {
      Array.from(element.attributes).forEach((attr) => {
        if (attr.name.startsWith("data-")) {
          attrs[attr.name] = attr.value;
        }
      });
    }
    return attrs;
  };

  // ../../node_modules/stimulus_reflex/javascript/controllers.js
  var localReflexControllers = (app, element) => {
    return attributeValues(element.getAttribute(schema_default.controller)).reduce(
      (memo, name) => {
        const controller = app.getControllerForElementAndIdentifier(element, name);
        if (controller && controller.StimulusReflex)
          memo.push(controller);
        return memo;
      },
      []
    );
  };
  var allReflexControllers = (app, element) => {
    let controllers = [];
    while (element) {
      controllers = controllers.concat(localReflexControllers(app, element));
      element = element.parentElement;
    }
    return controllers;
  };
  var findControllerByReflexName = (reflexName, controllers) => {
    const controller = controllers.find((controller2) => {
      if (!controller2.identifier)
        return;
      return extractReflexName(reflexName).replace(/([a-z0–9])([A-Z])/g, "$1-$2").replace(/(::)/g, "--").toLowerCase() === controller2.identifier;
    });
    return controller || controllers[0];
  };

  // ../../node_modules/stimulus_reflex/javascript/reflexes.js
  var reflexes = {};
  var received = (data2) => {
    if (!data2.cableReady)
      return;
    let reflexOperations = [];
    for (let i = data2.operations.length - 1; i >= 0; i--) {
      if (data2.operations[i].stimulusReflex) {
        reflexOperations.push(data2.operations[i]);
        data2.operations.splice(i, 1);
      }
    }
    if (reflexOperations.some((operation) => {
      return operation.stimulusReflex.url !== location.href;
    }))
      return;
    let reflexData;
    if (reflexOperations.length) {
      reflexData = reflexOperations[0].stimulusReflex;
      reflexData.payload = reflexOperations[0].payload;
    }
    if (reflexData) {
      const { reflexId, payload } = reflexData;
      if (!reflexes[reflexId] && isolation_mode_default.disabled) {
        const controllerElement = XPathToElement(reflexData.xpathController);
        const reflexElement = XPathToElement(reflexData.xpathElement);
        controllerElement.reflexController = controllerElement.reflexController || {};
        controllerElement.reflexData = controllerElement.reflexData || {};
        controllerElement.reflexError = controllerElement.reflexError || {};
        controllerElement.reflexController[reflexId] = reflexes.app.getControllerForElementAndIdentifier(
          controllerElement,
          reflexData.reflexController
        );
        controllerElement.reflexData[reflexId] = reflexData;
        dispatchLifecycleEvent(
          "before",
          reflexElement,
          controllerElement,
          reflexId,
          payload
        );
        registerReflex(reflexData);
      }
      if (reflexes[reflexId]) {
        reflexes[reflexId].totalOperations = reflexOperations.length;
        reflexes[reflexId].pendingOperations = reflexOperations.length;
        reflexes[reflexId].completedOperations = 0;
        reflexes[reflexId].piggybackOperations = data2.operations;
        javascript_default.perform(reflexOperations);
      }
    } else {
      if (data2.operations.length && reflexes[data2.operations[0].reflexId])
        javascript_default.perform(data2.operations);
    }
  };
  var registerReflex = (data2) => {
    const { reflexId } = data2;
    reflexes[reflexId] = { finalStage: "finalize" };
    const promise = new Promise((resolve, reject) => {
      reflexes[reflexId].promise = {
        resolve,
        reject,
        data: data2
      };
    });
    promise.reflexId = reflexId;
    if (debug_default.enabled)
      promise.catch(() => {
      });
    return promise;
  };
  var getReflexRoots = (element) => {
    let list = [];
    while (list.length === 0 && element) {
      let reflexRoot = element.getAttribute(schema_default.reflexRoot);
      if (reflexRoot) {
        if (reflexRoot.length === 0 && element.id)
          reflexRoot = `#${element.id}`;
        const selectors = reflexRoot.split(",").filter((s) => s.trim().length);
        if (debug_default.enabled && selectors.length === 0) {
          console.error(
            `No value found for ${schema_default.reflexRoot}. Add an #id to the element or provide a value for ${schema_default.reflexRoot}.`,
            element
          );
        }
        list = list.concat(selectors.filter((s) => document.querySelector(s)));
      }
      element = element.parentElement ? element.parentElement.closest(`[${schema_default.reflexRoot}]`) : null;
    }
    return list;
  };
  var setupDeclarativeReflexes = debounce(() => {
    document.querySelectorAll(`[${schema_default.reflex}]`).forEach((element) => {
      const controllers = attributeValues(element.getAttribute(schema_default.controller));
      const reflexAttributeNames = attributeValues(
        element.getAttribute(schema_default.reflex)
      );
      const actions = attributeValues(element.getAttribute(schema_default.action));
      reflexAttributeNames.forEach((reflexName) => {
        const controller = findControllerByReflexName(
          reflexName,
          allReflexControllers(reflexes.app, element)
        );
        let action;
        if (controller) {
          action = `${reflexName.split("->")[0]}->${controller.identifier}#__perform`;
          if (!actions.includes(action))
            actions.push(action);
        } else {
          action = `${reflexName.split("->")[0]}->stimulus-reflex#__perform`;
          if (!controllers.includes("stimulus-reflex")) {
            controllers.push("stimulus-reflex");
          }
          if (!actions.includes(action))
            actions.push(action);
        }
      });
      const controllerValue = attributeValue(controllers);
      const actionValue = attributeValue(actions);
      if (controllerValue && element.getAttribute(schema_default.controller) != controllerValue) {
        element.setAttribute(schema_default.controller, controllerValue);
      }
      if (actionValue && element.getAttribute(schema_default.action) != actionValue)
        element.setAttribute(schema_default.action, actionValue);
    });
    emitEvent("stimulus-reflex:ready");
  }, 20);
  var reflexes_default = reflexes;

  // ../../node_modules/stimulus_reflex/javascript/lifecycle.js
  var invokeLifecycleMethod = (stage, reflexElement, controllerElement, reflexId, payload) => {
    if (!controllerElement || !controllerElement.reflexData[reflexId])
      return;
    const controller = controllerElement.reflexController[reflexId];
    const reflex = controllerElement.reflexData[reflexId].target;
    const reflexMethodName = reflex.split("#")[1];
    const specificLifecycleMethodName = ["before", "after", "finalize"].includes(
      stage
    ) ? `${stage}${camelize3(reflexMethodName)}` : `${camelize3(reflexMethodName, false)}${camelize3(stage)}`;
    const specificLifecycleMethod = controller[specificLifecycleMethodName];
    const genericLifecycleMethodName = ["before", "after", "finalize"].includes(
      stage
    ) ? `${stage}Reflex` : `reflex${camelize3(stage)}`;
    const genericLifecycleMethod = controller[genericLifecycleMethodName];
    if (typeof specificLifecycleMethod === "function") {
      specificLifecycleMethod.call(
        controller,
        reflexElement,
        reflex,
        controllerElement.reflexError[reflexId],
        reflexId,
        payload
      );
    }
    if (typeof genericLifecycleMethod === "function") {
      genericLifecycleMethod.call(
        controller,
        reflexElement,
        reflex,
        controllerElement.reflexError[reflexId],
        reflexId,
        payload
      );
    }
    if (reflexes_default[reflexId] && stage === reflexes_default[reflexId].finalStage) {
      Reflect.deleteProperty(controllerElement.reflexController, reflexId);
      Reflect.deleteProperty(controllerElement.reflexData, reflexId);
      Reflect.deleteProperty(controllerElement.reflexError, reflexId);
    }
  };
  document.addEventListener(
    "stimulus-reflex:before",
    (event) => invokeLifecycleMethod(
      "before",
      event.detail.element,
      event.detail.controller.element,
      event.detail.reflexId,
      event.detail.payload
    ),
    true
  );
  document.addEventListener(
    "stimulus-reflex:success",
    (event) => {
      invokeLifecycleMethod(
        "success",
        event.detail.element,
        event.detail.controller.element,
        event.detail.reflexId,
        event.detail.payload
      );
      dispatchLifecycleEvent(
        "after",
        event.detail.element,
        event.detail.controller.element,
        event.detail.reflexId,
        event.detail.payload
      );
    },
    true
  );
  document.addEventListener(
    "stimulus-reflex:nothing",
    (event) => {
      dispatchLifecycleEvent(
        "success",
        event.detail.element,
        event.detail.controller.element,
        event.detail.reflexId,
        event.detail.payload
      );
    },
    true
  );
  document.addEventListener(
    "stimulus-reflex:error",
    (event) => {
      invokeLifecycleMethod(
        "error",
        event.detail.element,
        event.detail.controller.element,
        event.detail.reflexId,
        event.detail.payload
      );
      dispatchLifecycleEvent(
        "after",
        event.detail.element,
        event.detail.controller.element,
        event.detail.reflexId,
        event.detail.payload
      );
    },
    true
  );
  document.addEventListener(
    "stimulus-reflex:halted",
    (event) => invokeLifecycleMethod(
      "halted",
      event.detail.element,
      event.detail.controller.element,
      event.detail.reflexId,
      event.detail.payload
    ),
    true
  );
  document.addEventListener(
    "stimulus-reflex:after",
    (event) => invokeLifecycleMethod(
      "after",
      event.detail.element,
      event.detail.controller.element,
      event.detail.reflexId,
      event.detail.payload
    ),
    true
  );
  document.addEventListener(
    "stimulus-reflex:finalize",
    (event) => invokeLifecycleMethod(
      "finalize",
      event.detail.element,
      event.detail.controller.element,
      event.detail.reflexId,
      event.detail.payload
    ),
    true
  );
  var dispatchLifecycleEvent = (stage, reflexElement, controllerElement, reflexId, payload) => {
    if (!controllerElement) {
      if (debug_default.enabled && !reflexes_default[reflexId].warned) {
        console.warn(
          `StimulusReflex was not able execute callbacks or emit events for "${stage}" or later life-cycle stages for this Reflex. The StimulusReflex Controller Element is no longer present in the DOM. Could you move the StimulusReflex Controller to an element higher in your DOM?`
        );
        reflexes_default[reflexId].warned = true;
      }
      return;
    }
    if (!controllerElement.reflexController || controllerElement.reflexController && !controllerElement.reflexController[reflexId]) {
      if (debug_default.enabled && !reflexes_default[reflexId].warned) {
        console.warn(
          `StimulusReflex detected that the StimulusReflex Controller responsible for this Reflex has been replaced with a new instance. Callbacks and events for "${stage}" or later life-cycle stages cannot be executed.`
        );
        reflexes_default[reflexId].warned = true;
      }
      return;
    }
    const { target } = controllerElement.reflexData[reflexId] || {};
    const controller = controllerElement.reflexController[reflexId] || {};
    const event = `stimulus-reflex:${stage}`;
    const action = `${event}:${target.split("#")[1]}`;
    const detail = {
      reflex: target,
      controller,
      reflexId,
      element: reflexElement,
      payload
    };
    const options2 = { bubbles: true, cancelable: false, detail };
    controllerElement.dispatchEvent(new CustomEvent(event, options2));
    controllerElement.dispatchEvent(new CustomEvent(action, options2));
    if (window.jQuery) {
      window.jQuery(controllerElement).trigger(event, detail);
      window.jQuery(controllerElement).trigger(action, detail);
    }
  };

  // ../../node_modules/stimulus_reflex/javascript/log.js
  var request = (reflexId, target, args, controller, element, controllerElement) => {
    const reflex = reflexes_default[reflexId];
    if (debug_default.disabled || reflex.promise.data.suppressLogging)
      return;
    reflex.timestamp = new Date();
    console.log(`\u2191 stimulus \u2191 ${target}`, {
      reflexId,
      args,
      controller,
      element,
      controllerElement
    });
  };
  var success = (event, halted2) => {
    const { detail } = event || {};
    const { selector, payload } = detail || {};
    const { reflexId, target, morph } = detail.stimulusReflex || {};
    const reflex = reflexes_default[reflexId];
    if (debug_default.disabled || reflex.promise.data.suppressLogging)
      return;
    const progress = reflex.totalOperations > 1 ? ` ${reflex.completedOperations}/${reflex.totalOperations}` : "";
    const duration = reflex.timestamp ? `in ${new Date() - reflex.timestamp}ms` : "CLONED";
    const operation = event.type.split(":")[1].split("-").slice(1).join("_");
    console.log(
      `\u2193 reflex \u2193 ${target} \u2192 ${selector || "\u221E"}${progress} ${duration}`,
      { reflexId, morph, operation, halted: halted2, payload }
    );
  };
  var error2 = (event) => {
    const { detail } = event || {};
    const { reflexId, target, payload } = detail.stimulusReflex || {};
    const reflex = reflexes_default[reflexId];
    if (debug_default.disabled || reflex.promise.data.suppressLogging)
      return;
    const duration = reflex.timestamp ? `in ${new Date() - reflex.timestamp}ms` : "CLONED";
    console.log(
      `\u2193 reflex \u2193 ${target} ${duration} %cERROR: ${event.detail.body}`,
      "color: #f00;",
      { reflexId, payload }
    );
  };
  var log_default = { request, success, error: error2 };

  // ../../node_modules/stimulus_reflex/javascript/callbacks.js
  var beforeDOMUpdate = (event) => {
    const { stimulusReflex, payload } = event.detail || {};
    if (!stimulusReflex)
      return;
    const { reflexId, xpathElement, xpathController } = stimulusReflex;
    const controllerElement = XPathToElement(xpathController);
    const reflexElement = XPathToElement(xpathElement);
    const reflex = reflexes_default[reflexId];
    const { promise } = reflex;
    reflex.pendingOperations--;
    if (reflex.pendingOperations > 0)
      return;
    if (!stimulusReflex.resolveLate)
      setTimeout(
        () => promise.resolve({
          element: reflexElement,
          event,
          data: promise.data,
          payload,
          reflexId,
          toString: () => ""
        })
      );
    setTimeout(
      () => dispatchLifecycleEvent(
        "success",
        reflexElement,
        controllerElement,
        reflexId,
        payload
      )
    );
  };
  var afterDOMUpdate = (event) => {
    const { stimulusReflex, payload } = event.detail || {};
    if (!stimulusReflex)
      return;
    const { reflexId, xpathElement, xpathController } = stimulusReflex;
    const controllerElement = XPathToElement(xpathController);
    const reflexElement = XPathToElement(xpathElement);
    const reflex = reflexes_default[reflexId];
    const { promise } = reflex;
    reflex.completedOperations++;
    log_default.success(event, false);
    if (reflex.completedOperations < reflex.totalOperations)
      return;
    if (stimulusReflex.resolveLate)
      setTimeout(
        () => promise.resolve({
          element: reflexElement,
          event,
          data: promise.data,
          payload,
          reflexId,
          toString: () => ""
        })
      );
    setTimeout(
      () => dispatchLifecycleEvent(
        "finalize",
        reflexElement,
        controllerElement,
        reflexId,
        payload
      )
    );
    if (reflex.piggybackOperations.length)
      javascript_default.perform(reflex.piggybackOperations);
  };
  var routeReflexEvent = (event) => {
    const { stimulusReflex, payload, name, body } = event.detail || {};
    const eventType = name.split("-")[2];
    if (!stimulusReflex || !["nothing", "halted", "error"].includes(eventType))
      return;
    const { reflexId, xpathElement, xpathController } = stimulusReflex;
    const reflexElement = XPathToElement(xpathElement);
    const controllerElement = XPathToElement(xpathController);
    const reflex = reflexes_default[reflexId];
    const { promise } = reflex;
    if (controllerElement) {
      controllerElement.reflexError = controllerElement.reflexError || {};
      if (eventType === "error")
        controllerElement.reflexError[reflexId] = body;
    }
    switch (eventType) {
      case "nothing":
        nothing(event, payload, promise, reflex, reflexElement);
        break;
      case "error":
        error3(event, payload, promise, reflex, reflexElement);
        break;
      case "halted":
        halted(event, payload, promise, reflex, reflexElement);
        break;
    }
    setTimeout(
      () => dispatchLifecycleEvent(
        eventType,
        reflexElement,
        controllerElement,
        reflexId,
        payload
      )
    );
    if (reflex.piggybackOperations.length)
      javascript_default.perform(reflex.piggybackOperations);
  };
  var nothing = (event, payload, promise, reflex, reflexElement) => {
    reflex.finalStage = "after";
    log_default.success(event, false);
    setTimeout(
      () => promise.resolve({
        data: promise.data,
        element: reflexElement,
        event,
        payload,
        reflexId: promise.data.reflexId,
        toString: () => ""
      })
    );
  };
  var halted = (event, payload, promise, reflex, reflexElement) => {
    reflex.finalStage = "halted";
    log_default.success(event, true);
    setTimeout(
      () => promise.resolve({
        data: promise.data,
        element: reflexElement,
        event,
        payload,
        reflexId: promise.data.reflexId,
        toString: () => ""
      })
    );
  };
  var error3 = (event, payload, promise, reflex, reflexElement) => {
    reflex.finalStage = "after";
    log_default.error(event);
    setTimeout(
      () => promise.reject({
        data: promise.data,
        element: reflexElement,
        event,
        payload,
        reflexId: promise.data.reflexId,
        error: event.detail.body,
        toString: () => event.detail.body
      })
    );
  };

  // ../../node_modules/stimulus_reflex/javascript/reflex_data.js
  var ReflexData = class {
    constructor(options2, reflexElement, controllerElement, reflexController, permanentAttributeName, target, args, url2, tabId2) {
      this.options = options2;
      this.reflexElement = reflexElement;
      this.controllerElement = controllerElement;
      this.reflexController = reflexController;
      this.permanentAttributeName = permanentAttributeName;
      this.target = target;
      this.args = args;
      this.url = url2;
      this.tabId = tabId2;
    }
    get attrs() {
      this._attrs = this._attrs || this.options["attrs"] || extractElementAttributes(this.reflexElement);
      return this._attrs;
    }
    get reflexId() {
      this._reflexId = this._reflexId || this.options["reflexId"] || uuidv4();
      return this._reflexId;
    }
    get selectors() {
      this._selectors = this._selectors || this.options["selectors"] || getReflexRoots(this.reflexElement);
      return typeof this._selectors === "string" ? [this._selectors] : this._selectors;
    }
    get resolveLate() {
      return this.options["resolveLate"] || false;
    }
    get dataset() {
      this._dataset = this._dataset || extractElementDataset(this.reflexElement);
      return this._dataset;
    }
    get innerHTML() {
      return this.includeInnerHtml ? this.reflexElement.innerHTML : "";
    }
    get textContent() {
      return this.includeTextContent ? this.reflexElement.textContent : "";
    }
    get xpathController() {
      return elementToXPath(this.controllerElement);
    }
    get xpathElement() {
      return elementToXPath(this.reflexElement);
    }
    get formSelector() {
      const attr = this.reflexElement.attributes[schema_default.reflexFormSelector] ? this.reflexElement.attributes[schema_default.reflexFormSelector].value : void 0;
      return this.options["formSelector"] || attr;
    }
    get includeInnerHtml() {
      const attr = this.reflexElement.attributes[schema_default.reflexIncludeInnerHtml] || false;
      return this.options["includeInnerHTML"] || attr ? attr.value !== "false" : false;
    }
    get includeTextContent() {
      const attr = this.reflexElement.attributes[schema_default.reflexIncludeTextContent] || false;
      return this.options["includeTextContent"] || attr ? attr.value !== "false" : false;
    }
    get suppressLogging() {
      return this.options["suppressLogging"] || this.reflexElement.attributes[schema_default.reflexSuppressLogging] || false;
    }
    valueOf() {
      return {
        attrs: this.attrs,
        dataset: this.dataset,
        selectors: this.selectors,
        reflexId: this.reflexId,
        resolveLate: this.resolveLate,
        suppressLogging: this.suppressLogging,
        xpathController: this.xpathController,
        xpathElement: this.xpathElement,
        inner_html: this.innerHTML,
        text_content: this.textContent,
        formSelector: this.formSelector,
        reflexController: this.reflexController,
        permanentAttributeName: this.permanentAttributeName,
        target: this.target,
        args: this.args,
        url: this.url,
        tabId: this.tabId
      };
    }
  };

  // ../../node_modules/@rails/actioncable/app/assets/javascripts/actioncable.esm.js
  var adapters = {
    logger: self.console,
    WebSocket: self.WebSocket
  };
  var logger = {
    log(...messages) {
      if (this.enabled) {
        messages.push(Date.now());
        adapters.logger.log("[ActionCable]", ...messages);
      }
    }
  };
  var now2 = () => new Date().getTime();
  var secondsSince2 = (time) => (now2() - time) / 1e3;
  var ConnectionMonitor2 = class {
    constructor(connection) {
      this.visibilityDidChange = this.visibilityDidChange.bind(this);
      this.connection = connection;
      this.reconnectAttempts = 0;
    }
    start() {
      if (!this.isRunning()) {
        this.startedAt = now2();
        delete this.stoppedAt;
        this.startPolling();
        addEventListener("visibilitychange", this.visibilityDidChange);
        logger.log(`ConnectionMonitor started. stale threshold = ${this.constructor.staleThreshold} s`);
      }
    }
    stop() {
      if (this.isRunning()) {
        this.stoppedAt = now2();
        this.stopPolling();
        removeEventListener("visibilitychange", this.visibilityDidChange);
        logger.log("ConnectionMonitor stopped");
      }
    }
    isRunning() {
      return this.startedAt && !this.stoppedAt;
    }
    recordPing() {
      this.pingedAt = now2();
    }
    recordConnect() {
      this.reconnectAttempts = 0;
      this.recordPing();
      delete this.disconnectedAt;
      logger.log("ConnectionMonitor recorded connect");
    }
    recordDisconnect() {
      this.disconnectedAt = now2();
      logger.log("ConnectionMonitor recorded disconnect");
    }
    startPolling() {
      this.stopPolling();
      this.poll();
    }
    stopPolling() {
      clearTimeout(this.pollTimeout);
    }
    poll() {
      this.pollTimeout = setTimeout(() => {
        this.reconnectIfStale();
        this.poll();
      }, this.getPollInterval());
    }
    getPollInterval() {
      const { staleThreshold, reconnectionBackoffRate } = this.constructor;
      const backoff = Math.pow(1 + reconnectionBackoffRate, Math.min(this.reconnectAttempts, 10));
      const jitterMax = this.reconnectAttempts === 0 ? 1 : reconnectionBackoffRate;
      const jitter = jitterMax * Math.random();
      return staleThreshold * 1e3 * backoff * (1 + jitter);
    }
    reconnectIfStale() {
      if (this.connectionIsStale()) {
        logger.log(`ConnectionMonitor detected stale connection. reconnectAttempts = ${this.reconnectAttempts}, time stale = ${secondsSince2(this.refreshedAt)} s, stale threshold = ${this.constructor.staleThreshold} s`);
        this.reconnectAttempts++;
        if (this.disconnectedRecently()) {
          logger.log(`ConnectionMonitor skipping reopening recent disconnect. time disconnected = ${secondsSince2(this.disconnectedAt)} s`);
        } else {
          logger.log("ConnectionMonitor reopening");
          this.connection.reopen();
        }
      }
    }
    get refreshedAt() {
      return this.pingedAt ? this.pingedAt : this.startedAt;
    }
    connectionIsStale() {
      return secondsSince2(this.refreshedAt) > this.constructor.staleThreshold;
    }
    disconnectedRecently() {
      return this.disconnectedAt && secondsSince2(this.disconnectedAt) < this.constructor.staleThreshold;
    }
    visibilityDidChange() {
      if (document.visibilityState === "visible") {
        setTimeout(() => {
          if (this.connectionIsStale() || !this.connection.isOpen()) {
            logger.log(`ConnectionMonitor reopening stale connection on visibilitychange. visibilityState = ${document.visibilityState}`);
            this.connection.reopen();
          }
        }, 200);
      }
    }
  };
  ConnectionMonitor2.staleThreshold = 6;
  ConnectionMonitor2.reconnectionBackoffRate = 0.15;
  var INTERNAL = {
    message_types: {
      welcome: "welcome",
      disconnect: "disconnect",
      ping: "ping",
      confirmation: "confirm_subscription",
      rejection: "reject_subscription"
    },
    disconnect_reasons: {
      unauthorized: "unauthorized",
      invalid_request: "invalid_request",
      server_restart: "server_restart"
    },
    default_mount_path: "/cable",
    protocols: ["actioncable-v1-json", "actioncable-unsupported"]
  };
  var { message_types: message_types2, protocols: protocols2 } = INTERNAL;
  var supportedProtocols2 = protocols2.slice(0, protocols2.length - 1);
  var indexOf2 = [].indexOf;
  var Connection2 = class {
    constructor(consumer5) {
      this.open = this.open.bind(this);
      this.consumer = consumer5;
      this.subscriptions = this.consumer.subscriptions;
      this.monitor = new ConnectionMonitor2(this);
      this.disconnected = true;
    }
    send(data2) {
      if (this.isOpen()) {
        this.webSocket.send(JSON.stringify(data2));
        return true;
      } else {
        return false;
      }
    }
    open() {
      if (this.isActive()) {
        logger.log(`Attempted to open WebSocket, but existing socket is ${this.getState()}`);
        return false;
      } else {
        logger.log(`Opening WebSocket, current state is ${this.getState()}, subprotocols: ${protocols2}`);
        if (this.webSocket) {
          this.uninstallEventHandlers();
        }
        this.webSocket = new adapters.WebSocket(this.consumer.url, protocols2);
        this.installEventHandlers();
        this.monitor.start();
        return true;
      }
    }
    close({ allowReconnect } = {
      allowReconnect: true
    }) {
      if (!allowReconnect) {
        this.monitor.stop();
      }
      if (this.isOpen()) {
        return this.webSocket.close();
      }
    }
    reopen() {
      logger.log(`Reopening WebSocket, current state is ${this.getState()}`);
      if (this.isActive()) {
        try {
          return this.close();
        } catch (error4) {
          logger.log("Failed to reopen WebSocket", error4);
        } finally {
          logger.log(`Reopening WebSocket in ${this.constructor.reopenDelay}ms`);
          setTimeout(this.open, this.constructor.reopenDelay);
        }
      } else {
        return this.open();
      }
    }
    getProtocol() {
      if (this.webSocket) {
        return this.webSocket.protocol;
      }
    }
    isOpen() {
      return this.isState("open");
    }
    isActive() {
      return this.isState("open", "connecting");
    }
    isProtocolSupported() {
      return indexOf2.call(supportedProtocols2, this.getProtocol()) >= 0;
    }
    isState(...states) {
      return indexOf2.call(states, this.getState()) >= 0;
    }
    getState() {
      if (this.webSocket) {
        for (let state in adapters.WebSocket) {
          if (adapters.WebSocket[state] === this.webSocket.readyState) {
            return state.toLowerCase();
          }
        }
      }
      return null;
    }
    installEventHandlers() {
      for (let eventName in this.events) {
        const handler = this.events[eventName].bind(this);
        this.webSocket[`on${eventName}`] = handler;
      }
    }
    uninstallEventHandlers() {
      for (let eventName in this.events) {
        this.webSocket[`on${eventName}`] = function() {
        };
      }
    }
  };
  Connection2.reopenDelay = 500;
  Connection2.prototype.events = {
    message(event) {
      if (!this.isProtocolSupported()) {
        return;
      }
      const { identifier, message, reason, reconnect, type } = JSON.parse(event.data);
      switch (type) {
        case message_types2.welcome:
          this.monitor.recordConnect();
          return this.subscriptions.reload();
        case message_types2.disconnect:
          logger.log(`Disconnecting. Reason: ${reason}`);
          return this.close({
            allowReconnect: reconnect
          });
        case message_types2.ping:
          return this.monitor.recordPing();
        case message_types2.confirmation:
          this.subscriptions.confirmSubscription(identifier);
          return this.subscriptions.notify(identifier, "connected");
        case message_types2.rejection:
          return this.subscriptions.reject(identifier);
        default:
          return this.subscriptions.notify(identifier, "received", message);
      }
    },
    open() {
      logger.log(`WebSocket onopen event, using '${this.getProtocol()}' subprotocol`);
      this.disconnected = false;
      if (!this.isProtocolSupported()) {
        logger.log("Protocol is unsupported. Stopping monitor and disconnecting.");
        return this.close({
          allowReconnect: false
        });
      }
    },
    close(event) {
      logger.log("WebSocket onclose event");
      if (this.disconnected) {
        return;
      }
      this.disconnected = true;
      this.monitor.recordDisconnect();
      return this.subscriptions.notifyAll("disconnected", {
        willAttemptReconnect: this.monitor.isRunning()
      });
    },
    error() {
      logger.log("WebSocket onerror event");
    }
  };
  var extend4 = function(object2, properties) {
    if (properties != null) {
      for (let key in properties) {
        const value = properties[key];
        object2[key] = value;
      }
    }
    return object2;
  };
  var Subscription2 = class {
    constructor(consumer5, params2 = {}, mixin) {
      this.consumer = consumer5;
      this.identifier = JSON.stringify(params2);
      extend4(this, mixin);
    }
    perform(action, data2 = {}) {
      data2.action = action;
      return this.send(data2);
    }
    send(data2) {
      return this.consumer.send({
        command: "message",
        identifier: this.identifier,
        data: JSON.stringify(data2)
      });
    }
    unsubscribe() {
      return this.consumer.subscriptions.remove(this);
    }
  };
  var SubscriptionGuarantor2 = class {
    constructor(subscriptions) {
      this.subscriptions = subscriptions;
      this.pendingSubscriptions = [];
    }
    guarantee(subscription) {
      if (this.pendingSubscriptions.indexOf(subscription) == -1) {
        logger.log(`SubscriptionGuarantor guaranteeing ${subscription.identifier}`);
        this.pendingSubscriptions.push(subscription);
      } else {
        logger.log(`SubscriptionGuarantor already guaranteeing ${subscription.identifier}`);
      }
      this.startGuaranteeing();
    }
    forget(subscription) {
      logger.log(`SubscriptionGuarantor forgetting ${subscription.identifier}`);
      this.pendingSubscriptions = this.pendingSubscriptions.filter((s) => s !== subscription);
    }
    startGuaranteeing() {
      this.stopGuaranteeing();
      this.retrySubscribing();
    }
    stopGuaranteeing() {
      clearTimeout(this.retryTimeout);
    }
    retrySubscribing() {
      this.retryTimeout = setTimeout(() => {
        if (this.subscriptions && typeof this.subscriptions.subscribe === "function") {
          this.pendingSubscriptions.map((subscription) => {
            logger.log(`SubscriptionGuarantor resubscribing ${subscription.identifier}`);
            this.subscriptions.subscribe(subscription);
          });
        }
      }, 500);
    }
  };
  var Subscriptions2 = class {
    constructor(consumer5) {
      this.consumer = consumer5;
      this.guarantor = new SubscriptionGuarantor2(this);
      this.subscriptions = [];
    }
    create(channelName, mixin) {
      const channel = channelName;
      const params2 = typeof channel === "object" ? channel : {
        channel
      };
      const subscription = new Subscription2(this.consumer, params2, mixin);
      return this.add(subscription);
    }
    add(subscription) {
      this.subscriptions.push(subscription);
      this.consumer.ensureActiveConnection();
      this.notify(subscription, "initialized");
      this.subscribe(subscription);
      return subscription;
    }
    remove(subscription) {
      this.forget(subscription);
      if (!this.findAll(subscription.identifier).length) {
        this.sendCommand(subscription, "unsubscribe");
      }
      return subscription;
    }
    reject(identifier) {
      return this.findAll(identifier).map((subscription) => {
        this.forget(subscription);
        this.notify(subscription, "rejected");
        return subscription;
      });
    }
    forget(subscription) {
      this.guarantor.forget(subscription);
      this.subscriptions = this.subscriptions.filter((s) => s !== subscription);
      return subscription;
    }
    findAll(identifier) {
      return this.subscriptions.filter((s) => s.identifier === identifier);
    }
    reload() {
      return this.subscriptions.map((subscription) => this.subscribe(subscription));
    }
    notifyAll(callbackName, ...args) {
      return this.subscriptions.map((subscription) => this.notify(subscription, callbackName, ...args));
    }
    notify(subscription, callbackName, ...args) {
      let subscriptions;
      if (typeof subscription === "string") {
        subscriptions = this.findAll(subscription);
      } else {
        subscriptions = [subscription];
      }
      return subscriptions.map((subscription2) => typeof subscription2[callbackName] === "function" ? subscription2[callbackName](...args) : void 0);
    }
    subscribe(subscription) {
      if (this.sendCommand(subscription, "subscribe")) {
        this.guarantor.guarantee(subscription);
      }
    }
    confirmSubscription(identifier) {
      logger.log(`Subscription confirmed ${identifier}`);
      this.findAll(identifier).map((subscription) => this.guarantor.forget(subscription));
    }
    sendCommand(subscription, command) {
      const { identifier } = subscription;
      return this.consumer.send({
        command,
        identifier
      });
    }
  };
  var Consumer2 = class {
    constructor(url2) {
      this._url = url2;
      this.subscriptions = new Subscriptions2(this);
      this.connection = new Connection2(this);
    }
    get url() {
      return createWebSocketURL2(this._url);
    }
    send(data2) {
      return this.connection.send(data2);
    }
    connect() {
      return this.connection.open();
    }
    disconnect() {
      return this.connection.close({
        allowReconnect: false
      });
    }
    ensureActiveConnection() {
      if (!this.connection.isActive()) {
        return this.connection.open();
      }
    }
  };
  function createWebSocketURL2(url2) {
    if (typeof url2 === "function") {
      url2 = url2();
    }
    if (url2 && !/^wss?:/i.test(url2)) {
      const a = document.createElement("a");
      a.href = url2;
      a.href = a.href;
      a.protocol = a.protocol.replace("http", "ws");
      return a.href;
    } else {
      return url2;
    }
  }
  function createConsumer3(url2 = getConfig2("url") || INTERNAL.default_mount_path) {
    return new Consumer2(url2);
  }
  function getConfig2(name) {
    const element = document.head.querySelector(`meta[name='action-cable-${name}']`);
    if (element) {
      return element.getAttribute("content");
    }
  }

  // ../../node_modules/stimulus_reflex/javascript/transports/action_cable.js
  var consumer4;
  var params;
  var subscriptionActive;
  var createSubscription = (controller) => {
    consumer4 = consumer4 || controller.application.consumer || createConsumer3();
    const { channel } = controller.StimulusReflex;
    const subscription = { channel, ...params };
    const identifier = JSON.stringify(subscription);
    controller.StimulusReflex.subscription = consumer4.subscriptions.findAll(identifier)[0] || consumer4.subscriptions.create(subscription, {
      received,
      connected,
      rejected,
      disconnected
    });
  };
  var connected = () => {
    subscriptionActive = true;
    document.body.classList.replace(
      "stimulus-reflex-disconnected",
      "stimulus-reflex-connected"
    );
    emitEvent("stimulus-reflex:connected");
    emitEvent("stimulus-reflex:action-cable:connected");
  };
  var rejected = () => {
    subscriptionActive = false;
    document.body.classList.replace(
      "stimulus-reflex-connected",
      "stimulus-reflex-disconnected"
    );
    emitEvent("stimulus-reflex:rejected");
    emitEvent("stimulus-reflex:action-cable:rejected");
    if (Debug.enabled)
      console.warn("Channel subscription was rejected.");
  };
  var disconnected = (willAttemptReconnect) => {
    subscriptionActive = false;
    document.body.classList.replace(
      "stimulus-reflex-connected",
      "stimulus-reflex-disconnected"
    );
    emitEvent("stimulus-reflex:disconnected", willAttemptReconnect);
    emitEvent("stimulus-reflex:action-cable:disconnected", willAttemptReconnect);
  };
  var action_cable_default2 = {
    consumer: consumer4,
    params,
    get subscriptionActive() {
      return subscriptionActive;
    },
    createSubscription,
    connected,
    rejected,
    disconnected,
    set(consumerValue, paramsValue) {
      consumer4 = consumerValue;
      params = paramsValue;
    }
  };

  // ../../node_modules/stimulus_reflex/javascript/stimulus_reflex.js
  var StimulusReflexController = class extends Controller2 {
    constructor(...args) {
      super(...args);
      register(this);
    }
  };
  var initialize2 = (application2, { controller, consumer: consumer5, debug, params: params2, isolate, deprecate } = {}) => {
    action_cable_default2.set(consumer5, params2);
    document.addEventListener(
      "DOMContentLoaded",
      () => {
        document.body.classList.remove("stimulus-reflex-connected");
        document.body.classList.add("stimulus-reflex-disconnected");
        if (deprecate_default.enabled && consumer5)
          console.warn(
            "Deprecation warning: the next version of StimulusReflex will obtain a reference to consumer via the Stimulus application object.\nPlease add 'application.consumer = consumer' to your index.js after your Stimulus application has been established, and remove the consumer key from your StimulusReflex initialize() options object."
          );
        if (deprecate_default.enabled && isolation_mode_default.disabled)
          console.warn(
            "Deprecation warning: the next version of StimulusReflex will standardize isolation mode, and the isolate option will be removed.\nPlease update your applications to assume that every tab will be isolated."
          );
      },
      { once: true }
    );
    isolation_mode_default.set(!!isolate);
    reflexes_default.app = application2;
    schema_default.set(application2);
    reflexes_default.app.register(
      "stimulus-reflex",
      controller || StimulusReflexController
    );
    debug_default.set(!!debug);
    if (typeof deprecate !== "undefined")
      deprecate_default.set(deprecate);
    const observer = new MutationObserver(setupDeclarativeReflexes);
    observer.observe(document.documentElement, {
      attributeFilter: [schema_default.reflex, schema_default.action],
      childList: true,
      subtree: true
    });
  };
  var register = (controller, options2 = {}) => {
    const channel = "StimulusReflex::Channel";
    controller.StimulusReflex = { ...options2, channel };
    action_cable_default2.createSubscription(controller);
    Object.assign(controller, {
      isActionCableConnectionOpen() {
        return this.StimulusReflex.subscription.consumer.connection.isOpen();
      },
      stimulate() {
        const url2 = location.href;
        const args = Array.from(arguments);
        const target = args.shift() || "StimulusReflex::Reflex#default_reflex";
        const controllerElement = this.element;
        const reflexElement = args[0] && args[0].nodeType === Node.ELEMENT_NODE ? args.shift() : controllerElement;
        if (reflexElement.type === "number" && reflexElement.validity && reflexElement.validity.badInput) {
          if (debug_default.enabled)
            console.warn("Reflex aborted: invalid numeric input");
          return;
        }
        const options3 = {};
        if (args[0] && typeof args[0] === "object" && Object.keys(args[0]).filter(
          (key) => [
            "attrs",
            "selectors",
            "reflexId",
            "resolveLate",
            "serializeForm",
            "suppressLogging",
            "includeInnerHTML",
            "includeTextContent"
          ].includes(key)
        ).length) {
          const opts = args.shift();
          Object.keys(opts).forEach((o) => options3[o] = opts[o]);
        }
        const reflexData = new ReflexData(
          options3,
          reflexElement,
          controllerElement,
          this.identifier,
          schema_default.reflexPermanent,
          target,
          args,
          url2,
          tabId
        );
        const reflexId = reflexData.reflexId;
        if (!this.isActionCableConnectionOpen())
          throw "The ActionCable connection is not open! `this.isActionCableConnectionOpen()` must return true before calling `this.stimulate()`";
        if (!action_cable_default2.subscriptionActive)
          throw "The ActionCable channel subscription for StimulusReflex was rejected.";
        controllerElement.reflexController = controllerElement.reflexController || {};
        controllerElement.reflexData = controllerElement.reflexData || {};
        controllerElement.reflexError = controllerElement.reflexError || {};
        controllerElement.reflexController[reflexId] = this;
        controllerElement.reflexData[reflexId] = reflexData.valueOf();
        dispatchLifecycleEvent(
          "before",
          reflexElement,
          controllerElement,
          reflexId
        );
        setTimeout(() => {
          const { params: params2 } = controllerElement.reflexData[reflexId] || {};
          const check = reflexElement.attributes[schema_default.reflexSerializeForm];
          if (check) {
            options3["serializeForm"] = check.value !== "false";
          }
          const form2 = reflexElement.closest(reflexData.formSelector) || document.querySelector(reflexData.formSelector) || reflexElement.closest("form");
          if (deprecate_default.enabled && options3["serializeForm"] === void 0 && form2)
            console.warn(
              `Deprecation warning: the next version of StimulusReflex will not serialize forms by default.
Please set ${schema_default.reflexSerializeForm}="true" on your Reflex Controller Element or pass { serializeForm: true } as an option to stimulate.`
            );
          const formData = options3["serializeForm"] === false ? "" : serializeForm(form2, {
            element: reflexElement
          });
          controllerElement.reflexData[reflexId] = {
            ...reflexData.valueOf(),
            params: params2,
            formData
          };
          this.StimulusReflex.subscription.send(
            controllerElement.reflexData[reflexId]
          );
        });
        const promise = registerReflex(reflexData.valueOf());
        log_default.request(
          reflexId,
          target,
          args,
          this.context.scope.identifier,
          reflexElement,
          controllerElement
        );
        return promise;
      },
      __perform(event) {
        let element = event.target;
        let reflex;
        while (element && !reflex) {
          reflex = element.getAttribute(schema_default.reflex);
          if (!reflex || !reflex.trim().length)
            element = element.parentElement;
        }
        const match2 = attributeValues(reflex).find(
          (reflex2) => reflex2.split("->")[0] === event.type
        );
        if (match2) {
          event.preventDefault();
          event.stopPropagation();
          this.stimulate(match2.split("->")[1], element);
        }
      }
    });
  };
  var tabId = uuidv4();
  var useReflex = (controller, options2 = {}) => {
    register(controller, options2);
  };
  document.addEventListener("cable-ready:after-dispatch-event", routeReflexEvent);
  document.addEventListener("cable-ready:before-inner-html", beforeDOMUpdate);
  document.addEventListener("cable-ready:before-morph", beforeDOMUpdate);
  document.addEventListener("cable-ready:after-inner-html", afterDOMUpdate);
  document.addEventListener("cable-ready:after-morph", afterDOMUpdate);
  window.addEventListener("load", setupDeclarativeReflexes);
  var stimulus_reflex_default = {
    initialize: initialize2,
    register,
    useReflex,
    get debug() {
      return debug_default.value;
    },
    set debug(value) {
      debug_default.set(!!value);
    },
    get deprecate() {
      return deprecate_default.value;
    },
    set deprecate(value) {
      deprecate_default.set(!!value);
    }
  };

  // controllers/application.js
  var application = Application.start();
  application.warnings = true;
  application.debug = false;
  window.Stimulus = application;
  stimulus_reflex_default.initialize(application, { isolate: true });

  // controllers/alert_controller.js
  var alert_controller_default = class extends Controller2 {
    initialize() {
      this.hide();
    }
    connect() {
      setTimeout(() => {
        this.show();
      }, 50);
      setTimeout(() => {
        this.close();
      }, this.closeAfterValue);
    }
    close() {
      this.hide();
      setTimeout(() => {
        this.element.remove();
      }, this.removeAfterValue);
    }
    show() {
      this.element.setAttribute(
        "style",
        "transition: 0.5s; transform:translate(0, -100px);"
      );
    }
    hide() {
      this.element.setAttribute(
        "style",
        "transition: 1s; transform:translate(0, 200px);"
      );
    }
  };
  __publicField(alert_controller_default, "values", {
    closeAfter: {
      type: Number,
      default: 2500
    },
    removeAfter: {
      type: Number,
      default: 1100
    }
  });

  // controllers/hello_controller.js
  var hello_controller_default = class extends Controller {
    connect() {
      this.element.textContent = "Hello World!";
    }
  };

  // controllers/index.js
  application.register("alert", alert_controller_default);
  application.register("hello", hello_controller_default);

  // channels/consumer.js
  var consumer_default = createConsumer3();

  // ../../node_modules/mrujs/dist/index.module.js
  var submittersByForm2 = /* @__PURE__ */ new WeakMap();
  function findSubmitterFromClickTarget2(target) {
    const element = target instanceof Element ? target : target instanceof Node ? target.parentElement : null;
    const candidate = element != null ? element.closest("input, button") : null;
    if (candidate != null && candidate.type === "submit") {
      return candidate;
    }
    return null;
  }
  function clickCaptured2(event) {
    const submitter = findSubmitterFromClickTarget2(event.target);
    if ((submitter === null || submitter === void 0 ? void 0 : submitter.form) != null) {
      submittersByForm2.set(submitter.form, submitter);
    }
  }
  (function() {
    let prototype = Event.prototype;
    const isSafari = navigator.vendor.includes("Apple Computer");
    if ("SubmitEvent" in window) {
      if (!isSafari)
        return;
      prototype = window.SubmitEvent.prototype;
    }
    if ("submitter" in prototype)
      return;
    addEventListener("click", clickCaptured2, true);
    Object.defineProperty(prototype, "submitter", {
      get() {
        if (this.type === "submit" && this.target instanceof HTMLFormElement) {
          return submittersByForm2.get(this.target);
        }
        return void 0;
      }
    });
  })();
  var _a;
  function toArray(value) {
    if (Array.isArray(value)) {
      return value;
    } else if (Array.from != null) {
      return Array.from(value);
    } else {
      return [].slice.call(value);
    }
  }
  var m = (_a = Element.prototype.matches) !== null && _a !== void 0 ? _a : Element.prototype.webkitMatchesSelector;
  function matches$1(element, selector) {
    if (!(element instanceof Element)) {
      return false;
    }
    if (typeof selector === "string") {
      return m.call(element, selector);
    }
    return m.call(element, selector.selector) && !m.call(element, selector.exclude);
  }
  var form = "form";
  var link = "a";
  if (window.Turbo != null) {
    form = 'form[data-turbo="false"]';
    link = 'a[data-turbo="false"]';
  }
  var data = "data-";
  var remote = `${data}remote`;
  var method = `${data}method`;
  var confirm$2 = `${data}confirm`;
  var disable = `${data}disable`;
  var disableWith = `${disable}-with`;
  var BASE_SELECTORS = {
    remoteSelector: `a[${remote}="true"], a[${method}], form[${remote}="true"]`,
    linkClickSelector: `a[${confirm$2}], ${link}[${method}], ${link}[${remote}]:not([disabled]), ${link}[${disableWith}], ${link}[${disable}]`,
    buttonClickSelector: {
      selector: `button[${remote}]:not([form]), button[${confirm$2}]:not([form]), button[${disableWith}]:not([form]), button[${disable}]:not([form])`,
      exclude: "form button"
    },
    inputChangeSelector: `select[${remote}], input[${remote}], textarea[${remote}]`,
    formSubmitSelector: `${form}`,
    formInputClickSelector: "form input[type=submit], form input[type=image], form button[type=submit], form button:not([type]), input[type=submit][form], input[type=image][form], button[type=submit][form], button[form]:not([type])",
    formDisableSelector: `input[${disableWith}]:enabled, button[${disableWith}]:enabled, textarea[${disableWith}]:enabled, input[${disable}]:enabled, button[${disable}]:enabled, textarea[${disable}]:enabled`,
    formEnableSelector: `input[${disableWith}]:disabled, button[${disableWith}]:disabled, textarea[${disableWith}]:disabled, input[${disable}]:disabled, button[${disable}]:disabled, textarea[${disable}]:disabled`,
    linkDisableSelector: `a[${disableWith}], a[${disable}]`,
    buttonDisableSelector: `button[data-remote][${disableWith}], button[data-remote][${disable}]`,
    fileInputSelector: "fileInputSelector: 'input[name][type=file]:not([disabled])'"
  };
  function addListeners(conditions, callbacks) {
    conditions.forEach((condition) => {
      const { selectors, event } = condition;
      const selectorString = selectors.map(selectorToString).join(", ");
      $$1(selectorString).forEach((el) => {
        selectors.forEach((selector) => {
          if (matches$1(el, selector)) {
            callbacks.forEach((callback) => el.addEventListener(event, callback));
          }
        });
      });
    });
  }
  function removeListeners(conditions, callbacks) {
    conditions.forEach((condition) => {
      const { selectors, event } = condition;
      const selectorString = selectors.map(selectorToString).join(", ");
      $$1(selectorString).forEach((el) => {
        selectors.forEach((selector) => {
          if (matches$1(el, selector)) {
            callbacks.forEach((callback) => el.removeEventListener(event, callback));
          }
        });
      });
    });
  }
  function attachObserverCallback(conditions, nodeList, callbacks) {
    conditions.forEach((condition) => {
      condition.selectors.forEach((selector) => {
        nodeList.forEach((node) => {
          if (matches$1(node, selector)) {
            callbacks.forEach((cb) => node.addEventListener(condition.event, cb));
          }
          if (node instanceof Element) {
            node.querySelectorAll(selectorToString(selector)).forEach((el) => {
              callbacks.forEach((cb) => el.addEventListener(condition.event, cb));
            });
          }
        });
      });
    });
  }
  function formElements$1(form2, selector) {
    if (matches$1(form2, "form")) {
      return Array.from(form2.elements).filter((el) => matches$1(el, selector));
    }
    return toArray(form2.querySelectorAll(selectorToString(selector)));
  }
  function $$1(selector) {
    return toArray(document.querySelectorAll(selector));
  }
  function selectorToString(selector) {
    let str;
    if (typeof selector === "string") {
      str = selector;
    } else {
      str = selector.selector;
    }
    return str;
  }
  var EVENT_DEFAULTS = {
    bubbles: true,
    cancelable: true
  };
  function dispatch3(name, options2 = {}) {
    const event = new CustomEvent(name, { ...EVENT_DEFAULTS, ...options2 });
    this.dispatchEvent(event);
    return event;
  }
  function fire$1(element, name, options2 = {}) {
    const event = dispatch3.call(element, name, options2);
    return !event.defaultPrevented;
  }
  function stopEverything$1(event) {
    if (event.target != null)
      fire$1(event.target, "ujs:everythingStopped");
    event.stopPropagation();
    event.stopImmediatePropagation();
    event.preventDefault();
  }
  var prefix = "ajax";
  var AJAX_EVENTS = {
    ajaxBefore: `${prefix}:before`,
    ajaxBeforeSend: `${prefix}:beforeSend`,
    ajaxSend: `${prefix}:send`,
    ajaxResponseError: `${prefix}:response:error`,
    ajaxRequestError: `${prefix}:request:error`,
    ajaxSuccess: `${prefix}:success`,
    ajaxError: `${prefix}:error`,
    ajaxComplete: `${prefix}:complete`,
    ajaxStopped: `${prefix}:stopped`,
    ajaxBeforeNavigation: `${prefix}:beforeNavigation`
  };
  function delegate$1(element, selector, eventType, handler) {
    element.addEventListener(eventType, (event) => {
      let target = event.target;
      while (!(!(target instanceof Element) || matches$1(target, selector))) {
        target = target.parentNode;
      }
      if (target instanceof Element && handler.call(target, event) === false) {
        event.preventDefault();
        event.stopPropagation();
      }
    });
  }
  function findSubmitter(event) {
    var _a2;
    if (event.submitter instanceof HTMLElement) {
      return event.submitter;
    }
    return (_a2 = event.detail) === null || _a2 === void 0 ? void 0 : _a2.submitter;
  }
  function expandUrl(locateable) {
    return new URL(locateable.toString(), document.baseURI);
  }
  function urlsAreEqual2(left, right) {
    return expandUrl(left).href === expandUrl(right).href;
  }
  function mergeHeaders(...sources) {
    const main = {};
    for (const source of sources) {
      for (const [header, value] of source) {
        main[header] = value;
      }
    }
    return new Headers(main);
  }
  function isGetRequest(method2) {
    return method2.toLowerCase() === "get";
  }
  function FetchResponse$1(response) {
    let _text;
    let _json;
    const succeeded = response.ok;
    const status = response.status;
    const failed = !succeeded;
    const clientError = response.status >= 400 && response.status <= 499;
    const serverError = response.status >= 500 && response.status <= 599;
    const redirected = response.redirected;
    const location2 = expandUrl(response.url);
    const contentType = getHeader("content-type");
    const isHtml = Boolean(contentType === null || contentType === void 0 ? void 0 : contentType.match(/^(?:text\/([^\s;,]+\b)?html|application\/xhtml\+xml)\b/));
    const isJson = Boolean(contentType === null || contentType === void 0 ? void 0 : contentType.toLowerCase().match(/(^application\/json|\.json)/));
    async function text() {
      if (_text != null)
        return _text;
      _text = await response.clone().text();
      return _text;
    }
    async function html2() {
      if (isHtml)
        return await text();
      return await Promise.reject(response);
    }
    async function json() {
      if (isJson) {
        if (_json != null)
          return _json;
        _json = JSON.parse(await text());
        return _json;
      }
      return await Promise.reject(response);
    }
    function getHeader(name) {
      return response.headers.get(name);
    }
    return {
      succeeded,
      failed,
      redirected,
      clientError,
      serverError,
      location: location2,
      contentType,
      getHeader,
      isHtml,
      isJson,
      text,
      html: html2,
      json,
      response,
      status
    };
  }
  function buildFormElementFormData(element, submitter) {
    const formData = new FormData(element);
    let name;
    let value;
    if (submitter != null) {
      name = submitter.getAttribute("name");
      value = submitter.getAttribute("value");
    }
    if (name != null && value != null && formData.get(name) !== value) {
      formData.append(name, value);
    }
    return formData;
  }
  var FormEncTypes = {
    urlEncoded: "application/x-www-form-urlencoded",
    multipart: "multipart/form-data",
    plain: "text/plain"
  };
  function formEnctypeFromString2(encoding) {
    switch (encoding.toLowerCase()) {
      case FormEncTypes.multipart:
        return FormEncTypes.multipart;
      case FormEncTypes.plain:
        return FormEncTypes.plain;
      default:
        return FormEncTypes.urlEncoded;
    }
  }
  function formDataToStrings(formData) {
    return [...formData].reduce((entries2, [name, value]) => {
      return entries2.concat(typeof value === "string" ? [[name, value]] : []);
    }, []);
  }
  function urlEncodeFormData(formData) {
    return new URLSearchParams(formDataToStrings(formData));
  }
  var BASE_ACCEPT_HEADERS = {
    "*": "*/*",
    any: "*/*",
    text: "text/plain",
    html: "text/html",
    xml: "application/xml, text/xml",
    json: "application/json, text/javascript",
    script: "text/javascript, application/javascript, application/ecmascript, application/x-ecmascript"
  };
  function findResponseTypeHeader(responseType) {
    var _a2, _b, _c;
    const mimeTypes = (_b = (_a2 = window.mrujs) === null || _a2 === void 0 ? void 0 : _a2.mimeTypes) !== null && _b !== void 0 ? _b : BASE_ACCEPT_HEADERS;
    const acceptHeaders = {
      ...mimeTypes
    };
    if (responseType == null) {
      return (_c = acceptHeaders === null || acceptHeaders === void 0 ? void 0 : acceptHeaders.any) !== null && _c !== void 0 ? _c : "*/*";
    }
    responseType = responseType.trim();
    if (acceptHeaders != null && Object.keys(acceptHeaders).includes(responseType)) {
      responseType = acceptHeaders[responseType];
    }
    if (responseType.includes("*/*"))
      return responseType;
    return `${responseType}, */*; q=0.01`;
  }
  function isInsignificantClick(event) {
    return event.target != null && event.target.isContentEditable || event.defaultPrevented || event.button > 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
  }
  function isSignificantClick(event) {
    return !isInsignificantClick(event);
  }
  function preventInsignificantClick$1(event) {
    if (isSignificantClick(event))
      return;
    stopEverything$1(event);
  }
  function getCookieValue2(cookieName) {
    if (cookieName != null) {
      const cookies = document.cookie.trim() !== "" ? document.cookie.split("; ") : [];
      const cookie = cookies.find((cookie2) => cookie2.startsWith(cookieName));
      if (cookie != null) {
        const value = cookie.split("=").slice(1).join("=");
        return value.trim() !== "" ? decodeURIComponent(value) : void 0;
      }
    }
    return void 0;
  }
  function getMetaContent2(str) {
    var _a2;
    const elements = $$1(`meta[name="${str}"]`);
    const element = elements[elements.length - 1];
    return (_a2 = element === null || element === void 0 ? void 0 : element.content) !== null && _a2 !== void 0 ? _a2 : void 0;
  }
  function Csrf() {
    return {
      name: "Csrf",
      connect: connect$3,
      disconnect: disconnect$3,
      observerCallback
    };
  }
  function connect$3() {
    refreshCSRFTokens$1();
  }
  function disconnect$3() {
  }
  function observerCallback(nodeList) {
    for (let i = 0; i < nodeList.length; i++) {
      const node = nodeList[i];
      if (isCsrfToken(node)) {
        refreshCSRFTokens$1();
      }
    }
  }
  function refreshCSRFTokens$1() {
    const token = csrfToken$1();
    const param = csrfParam$1();
    if (token != null && param != null) {
      $$1(`form input[name="${param}"]`).forEach((input2) => {
        const inputEl = input2;
        inputEl.value = token;
      });
    }
  }
  function isCsrfToken(node) {
    if (node instanceof HTMLMetaElement) {
      return node.matches('meta[name="csrf-token]"');
    }
    return false;
  }
  function csrfToken$1() {
    var _a2;
    return (_a2 = getCookieValue2(csrfParam$1())) !== null && _a2 !== void 0 ? _a2 : getMetaContent2("csrf-token");
  }
  function csrfParam$1() {
    return getMetaContent2("csrf-param");
  }
  function CSRFProtection$1(request2) {
    const token = csrfToken$1();
    const str = "X-CSRF-TOKEN";
    if (token != null && request2.headers.get(str) == null)
      request2.headers.set("X-CSRF-TOKEN", token);
  }
  function FetchRequest$1(input2, options2 = {}) {
    const abortController = new AbortController();
    const abortSignal = abortController.signal;
    let headers;
    let url2;
    let method2 = "get";
    let request2;
    let _isGetRequest = false;
    method2 = getMethod$1(options2);
    _isGetRequest = isGetRequest(method2);
    const body = getBody$2(options2);
    if (input2 instanceof Request) {
      url2 = getUrl(input2.url, _isGetRequest, body);
      request2 = createRequestFromRequest(input2);
    } else {
      url2 = getUrl(input2, _isGetRequest, body);
      request2 = createRequestFromLocateable();
    }
    if (!_isGetRequest)
      CSRFProtection$1(request2);
    headers = request2.headers;
    const params2 = url2.searchParams;
    return {
      request: request2,
      method: method2,
      url: url2,
      body,
      params: params2,
      abortController,
      abortSignal,
      cancel,
      headers,
      isGetRequest: _isGetRequest
    };
    function defaultHeaders() {
      const headers2 = new Headers({
        Accept: "*/*",
        "X-REQUESTED-WITH": "XmlHttpRequest"
      });
      return headers2;
    }
    function cancel(event) {
      abortController.abort();
      if (event != null) {
        stopEverything$1(event);
        const { element } = event.detail;
        dispatch3.call(element, AJAX_EVENTS.ajaxStopped, {
          detail: { ...event.detail }
        });
      }
    }
    function createRequestFromRequest(input3) {
      headers = mergeHeaders(defaultHeaders(), input3.headers);
      const mergedOptions = { ...defaultRequestOptions(), ...input3 };
      if (_isGetRequest)
        delete mergedOptions.body;
      return new Request(url2, mergedOptions);
    }
    function createRequestFromLocateable() {
      headers = mergeHeaders(defaultHeaders(), new Headers(options2.headers));
      const mergedOptions = { ...defaultRequestOptions(), ...options2 };
      mergedOptions.headers = headers;
      if (_isGetRequest)
        delete mergedOptions.body;
      return new Request(url2, mergedOptions);
    }
    function defaultRequestOptions() {
      const options3 = {
        method: method2,
        headers,
        credentials: "same-origin",
        redirect: "follow",
        signal: abortSignal
      };
      if (_isGetRequest) {
        return options3;
      }
      options3.body = body;
      return options3;
    }
  }
  function getUrl(url2, getRequest, body) {
    const location2 = expandUrl(url2);
    if (!getRequest)
      return location2;
    return mergeFormDataEntries2(location2, entries(body));
  }
  function entries(body) {
    return body instanceof URLSearchParams ? Array.from(body.entries()) : [];
  }
  function getBody$2(input2) {
    var _a2;
    return (_a2 = input2.body) !== null && _a2 !== void 0 ? _a2 : new URLSearchParams();
  }
  function getMethod$1(input2) {
    var _a2, _b;
    return (_b = (_a2 = input2.method) === null || _a2 === void 0 ? void 0 : _a2.toLowerCase()) !== null && _b !== void 0 ? _b : "get";
  }
  function mergeFormDataEntries2(url2, entries2) {
    const currentSearchParams = new URLSearchParams(url2.search);
    for (const [name, value] of entries2) {
      if (value instanceof File)
        continue;
      if (name === "authenticity_token")
        continue;
      if (currentSearchParams.has(name)) {
        currentSearchParams.delete(name);
        url2.searchParams.set(name, value);
      } else {
        url2.searchParams.append(name, value);
      }
    }
    return url2;
  }
  function FormSubmission2(element, submitter) {
    const url2 = expandUrl(getAction2(element, submitter));
    const options2 = getOptions(element, submitter);
    const fetchRequest = FetchRequest$1(url2, options2);
    const request2 = fetchRequest.request;
    return {
      fetchRequest,
      request: request2,
      element,
      submitter
    };
  }
  function getOptions(element, submitter) {
    const method2 = getMethod(element, submitter);
    const headers = getHeaders$1(element);
    const options2 = {
      method: method2,
      headers
    };
    options2.body = getBody$1(element, method2, submitter);
    return options2;
  }
  function getHeaders$1(element) {
    let responseType;
    if (element != null) {
      responseType = element.dataset.type;
    }
    const acceptHeader = findResponseTypeHeader(responseType);
    const headers = new Headers({ Accept: acceptHeader });
    headers.set("Accept", acceptHeader);
    return headers;
  }
  function getFormData$1(element, submitter) {
    return buildFormElementFormData(element, submitter);
  }
  function getMethod(element, submitter) {
    var _a2, _b;
    const method2 = (_b = (_a2 = submitter === null || submitter === void 0 ? void 0 : submitter.getAttribute("formmethod")) !== null && _a2 !== void 0 ? _a2 : element.getAttribute("method")) !== null && _b !== void 0 ? _b : "get";
    return method2.toLowerCase();
  }
  function getAction2(element, submitter) {
    var _a2, _b;
    const action = (_b = (_a2 = submitter === null || submitter === void 0 ? void 0 : submitter.getAttribute("formaction")) !== null && _a2 !== void 0 ? _a2 : element.getAttribute("action")) !== null && _b !== void 0 ? _b : "";
    return action;
  }
  function getBody$1(element, method2, submitter) {
    const formData = getFormData$1(element, submitter);
    if (getEncType(element, submitter) === FormEncTypes.urlEncoded || isGetRequest(method2)) {
      return urlEncodeFormData(formData);
    } else {
      return formData;
    }
  }
  function getEncType(element, submitter) {
    var _a2, _b;
    const elementEncType = element.getAttribute("enctype");
    const encType = (_b = (_a2 = submitter === null || submitter === void 0 ? void 0 : submitter.getAttribute("formenctype")) !== null && _a2 !== void 0 ? _a2 : elementEncType) !== null && _b !== void 0 ? _b : FormEncTypes.urlEncoded;
    const encString = formEnctypeFromString2(encType);
    return encString;
  }
  function ElementDisabler() {
    const callbacks = [disableElement$1];
    let queries = [];
    function initialize3() {
      queries = getQueries$5();
    }
    function connect2() {
      addListeners(queries, callbacks);
    }
    function disconnect2() {
      removeListeners(queries, callbacks);
    }
    function observerCallback2(nodeList) {
      attachObserverCallback(queries, nodeList, callbacks);
    }
    return {
      name: "ElementDisabler",
      initialize: initialize3,
      connect: connect2,
      disconnect: disconnect2,
      observerCallback: observerCallback2,
      queries
    };
  }
  function getQueries$5() {
    const { formSubmitSelector: formSubmitSelector2, linkClickSelector: linkClickSelector2, buttonClickSelector: buttonClickSelector2, inputChangeSelector: inputChangeSelector2 } = window.mrujs;
    return [
      { event: "click", selectors: [buttonClickSelector2, linkClickSelector2] },
      { event: "ajax:send", selectors: [formSubmitSelector2] },
      { event: "turbo:submit-start", selectors: ["form"] },
      { event: "change", selectors: [inputChangeSelector2] }
    ];
  }
  function disableElement$1(event) {
    let element;
    if (event instanceof Event) {
      element = event.target;
    } else {
      element = event;
    }
    if (element == null)
      return;
    const { linkDisableSelector: linkDisableSelector2, buttonDisableSelector: buttonDisableSelector2, formDisableSelector: formDisableSelector2, formSubmitSelector: formSubmitSelector2 } = window.mrujs;
    if (matches$1(element, linkDisableSelector2)) {
      disableLinkElement(element);
    } else if (matches$1(element, buttonDisableSelector2) || matches$1(element, formDisableSelector2)) {
      disableFormElement(element);
    } else if (matches$1(element, formSubmitSelector2)) {
      disableFormElements(element);
    }
  }
  function disableFormElements(form2) {
    formElements$1(form2, window.mrujs.formDisableSelector).forEach((el) => disableFormElement(el));
  }
  function disableFormElement(element) {
    if (element.dataset.ujsDisabled != null)
      return;
    const replacement = element.getAttribute("data-disable-with");
    if (replacement != null) {
      if (matches$1(element, "button")) {
        element.dataset.ujsEnableWith = element.innerHTML;
        element.innerHTML = replacement;
      } else {
        element.dataset.ujsEnableWith = element.value;
        element.value = replacement;
      }
    }
    element.dataset.ujsDisabled = "true";
    setTimeout(() => {
      element.disabled = true;
    });
  }
  function disableLinkElement(element) {
    if (element.dataset.ujsDisabled != null)
      return;
    const replacement = element.dataset.disableWith;
    if (replacement != null) {
      element.dataset.ujsEnableWith = element.innerHTML;
      element.innerHTML = replacement;
    }
    element.addEventListener("click", stopEverything$1);
    element.dataset.ujsDisabled = "true";
  }
  function FormSubmitDispatcher() {
    return {
      name: "FormSubmitDispatcher",
      connect: connect$2,
      disconnect: disconnect$2
    };
  }
  function connect$2() {
    attachListeners("addEventListener");
  }
  function disconnect$2() {
    attachListeners("removeEventListener");
  }
  function startFormSubmission(event) {
    if (event.defaultPrevented) {
      return;
    }
    const element = findTarget(event);
    const submitter = findSubmitter(event);
    if (element.dataset.remote !== "true")
      return;
    if (shouldNotSubmit(element))
      return;
    if (shouldNotSubmit(submitter))
      return;
    if (submitter != null) {
      disableElement$1(submitter);
    }
    event.preventDefault();
    const { fetchRequest, request: request2 } = FormSubmission2(element, submitter);
    const detail = { element, fetchRequest, request: request2, submitter };
    dispatch3.call(element, AJAX_EVENTS.ajaxBefore, { detail });
  }
  function startFetchRequest(event) {
    const { element, fetchRequest, request: request2, submitter } = event.detail;
    if (event.defaultPrevented || shouldNotSubmit(element) || shouldNotSubmit(submitter)) {
      dispatchStopped(event);
      return;
    }
    dispatch3.call(element, AJAX_EVENTS.ajaxBeforeSend, {
      detail: { element, fetchRequest, request: request2, submitter }
    });
  }
  function sendFetchRequest(event) {
    const { element, request: request2, submitter } = event.detail;
    if (event.defaultPrevented || shouldNotSubmit(element) || shouldNotSubmit(submitter)) {
      dispatchStopped(event);
      return;
    }
    dispatch3.call(element, AJAX_EVENTS.ajaxSend, { detail: { ...event.detail } });
    window.fetch(request2).then((resp) => {
      const fetchResponse = FetchResponse$1(resp);
      const { response } = fetchResponse;
      dispatchResponse({ ...event.detail, fetchResponse, response });
    }).catch((error4) => dispatchRequestError({ ...event.detail, error: error4 }));
  }
  function dispatchComplete(event) {
    if (event.defaultPrevented) {
      dispatchStopped(event);
      return;
    }
    dispatch3.call(findTarget(event), AJAX_EVENTS.ajaxComplete, {
      detail: { ...event.detail }
    });
  }
  function dispatchResponse({ element, fetchRequest, request: request2, fetchResponse, response, submitter }) {
    const status = response === null || response === void 0 ? void 0 : response.status;
    if ((fetchResponse === null || fetchResponse === void 0 ? void 0 : fetchResponse.succeeded) === true) {
      dispatch3.call(element, AJAX_EVENTS.ajaxSuccess, {
        detail: { element, fetchRequest, request: request2, fetchResponse, response, submitter, status }
      });
      return;
    }
    dispatch3.call(element, AJAX_EVENTS.ajaxResponseError, {
      detail: { element, fetchRequest, request: request2, fetchResponse, response, submitter, status }
    });
  }
  function dispatchRequestError({ element, fetchRequest, request: request2, error: error4, submitter }) {
    dispatch3.call(element, AJAX_EVENTS.ajaxRequestError, {
      detail: { element, fetchRequest, request: request2, error: error4, submitter }
    });
  }
  function dispatchError(event) {
    if (event.defaultPrevented) {
      dispatchStopped(event);
      return;
    }
    dispatch3.call(findTarget(event), AJAX_EVENTS.ajaxError, {
      detail: { ...event.detail }
    });
  }
  function dispatchStopped(event) {
    dispatch3.call(findTarget(event), AJAX_EVENTS.ajaxStopped, {
      detail: { ...event.detail }
    });
  }
  function attachListeners(fn) {
    document[fn]("submit", startFormSubmission);
    document[fn](AJAX_EVENTS.ajaxBefore, startFetchRequest);
    document[fn](AJAX_EVENTS.ajaxBeforeSend, sendFetchRequest);
    document[fn](AJAX_EVENTS.ajaxSuccess, dispatchComplete);
    document[fn](AJAX_EVENTS.ajaxRequestError, dispatchError);
    document[fn](AJAX_EVENTS.ajaxResponseError, dispatchError);
    document[fn](AJAX_EVENTS.ajaxError, dispatchComplete);
  }
  function findTarget(event) {
    return event.target;
  }
  function shouldNotSubmit(element) {
    return (element === null || element === void 0 ? void 0 : element.dataset.ujsSubmit) === "false";
  }
  function RemoteWatcher() {
    let query;
    function initialize3() {
      query = window.mrujs.remoteSelector;
    }
    function connect2() {
      $$1(query).forEach((el) => {
        addTurboFalse(el);
      });
    }
    function disconnect2() {
    }
    function observerCallback2(nodeList) {
      nodeList.forEach((node) => {
        if (matches$1(node, window.mrujs.remoteSelector)) {
          addTurboFalse(node);
        }
        if (node instanceof Element) {
          node.querySelectorAll(query).forEach((el) => {
            addTurboFalse(el);
          });
        }
      });
    }
    return {
      name: "RemoteWatcher",
      initialize: initialize3,
      connect: connect2,
      disconnect: disconnect2,
      observerCallback: observerCallback2
    };
  }
  function addTurboFalse(el) {
    if (el == null)
      return;
    if (el.getAttribute("data-turbo") != null)
      return;
    el.setAttribute("data-turbo", "false");
  }
  function ClickHandler() {
    const callbacks = [preventInsignificantClick$1];
    let queries = [];
    function initialize3() {
      queries = getQueries$4();
    }
    function connect2() {
      addListeners(queries, callbacks);
    }
    function disconnect2() {
      removeListeners(queries, callbacks);
    }
    function observerCallback2(nodeList) {
      attachObserverCallback(queries, nodeList, callbacks);
    }
    return {
      name: "ClickHandler",
      initialize: initialize3,
      connect: connect2,
      disconnect: disconnect2,
      observerCallback: observerCallback2,
      queries,
      callbacks
    };
  }
  function getQueries$4() {
    const { linkClickSelector: linkClickSelector2, buttonClickSelector: buttonClickSelector2, formInputClickSelector: formInputClickSelector2 } = window.mrujs;
    return [
      {
        event: "click",
        selectors: [
          linkClickSelector2,
          buttonClickSelector2,
          formInputClickSelector2
        ]
      }
    ];
  }
  function Confirm() {
    const callbacks = [handleConfirm$1];
    let queries = [];
    function initialize3() {
      queries = getQueries$3();
    }
    function connect2() {
      addListeners(queries, callbacks);
    }
    function disconnect2() {
      removeListeners(queries, callbacks);
    }
    function observerCallback2(nodeList) {
      attachObserverCallback(queries, nodeList, callbacks);
    }
    return {
      name: "Confirm",
      initialize: initialize3,
      connect: connect2,
      disconnect: disconnect2,
      observerCallback: observerCallback2,
      queries,
      callbacks
    };
  }
  function handleConfirm$1(event) {
    if (!allowAction(event)) {
      stopEverything$1(event);
    }
  }
  function allowAction(event) {
    if (event.currentTarget == null)
      return true;
    const element = event.currentTarget;
    const message = element.dataset.confirm;
    if (message == null)
      return true;
    let answer = false;
    try {
      answer = window.mrujs.confirm(message);
    } catch (e) {
      console.warn('The following error was encountered when calling: "mrujs.confirm"\n\n');
      console.error(e);
    }
    const firedEvent = dispatch3.call(element, "confirm:complete", { detail: { answer } });
    return answer && !firedEvent.defaultPrevented;
  }
  function getQueries$3() {
    const { linkClickSelector: linkClickSelector2, buttonClickSelector: buttonClickSelector2, formInputClickSelector: formInputClickSelector2, inputChangeSelector: inputChangeSelector2, formSubmitSelector: formSubmitSelector2 } = window.mrujs;
    return [
      {
        event: "click",
        selectors: [
          linkClickSelector2,
          buttonClickSelector2,
          formInputClickSelector2
        ]
      },
      {
        event: "change",
        selectors: [
          inputChangeSelector2
        ]
      },
      {
        event: "submit",
        selectors: [
          formSubmitSelector2
        ]
      }
    ];
  }
  function MethodSubmission(element) {
    var _a2, _b;
    const method2 = getElementMethod(element);
    let maskedMethod;
    if ((_a2 = window.mrujs) === null || _a2 === void 0 ? void 0 : _a2.maskLinkMethods) {
      maskedMethod = getMaskedMethod(method2);
    }
    const href = (_b = element.getAttribute("href")) !== null && _b !== void 0 ? _b : element.dataset.url;
    if (href == null) {
      throw Error(`No 'href' or 'data-url' found on ${JSON.stringify(element)}`);
    }
    const url2 = expandUrl(href);
    const options2 = {
      headers: getHeaders(element)
    };
    options2.method = maskedMethod !== null && maskedMethod !== void 0 ? maskedMethod : method2;
    if (!isGetRequest(method2))
      options2.body = getBody(method2, element);
    const fetchRequest = FetchRequest$1(url2, options2);
    return {
      request: fetchRequest.request,
      fetchRequest
    };
  }
  function getHeaders(element) {
    let responseType;
    if (element != null) {
      responseType = element.dataset.type;
    }
    const acceptHeader = findResponseTypeHeader(responseType);
    const headers = new Headers({ Accept: acceptHeader });
    headers.set("Accept", acceptHeader);
    return headers;
  }
  function getFormData(method2) {
    var _a2;
    const formData = new FormData();
    if ((_a2 = window.mrujs) === null || _a2 === void 0 ? void 0 : _a2.maskLinkMethods) {
      formData.append("_method", method2);
    }
    return formData;
  }
  function getElementMethod(element) {
    var _a2;
    const method2 = (_a2 = element.dataset.method) !== null && _a2 !== void 0 ? _a2 : "get";
    return method2.toLowerCase();
  }
  function getMaskedMethod(method2) {
    return isGetRequest(method2) ? "get" : "post";
  }
  function getBody(method2, element) {
    const encodedFormData = urlEncodeFormData(getFormData(method2));
    const elName = element.getAttribute("name");
    const elValue = element.value;
    if (elName != null && elValue != null)
      encodedFormData.append(elName, elValue);
    const additionalParams = parseParams(element.getAttribute("data-params"));
    if (additionalParams == null)
      return encodedFormData;
    for (const [key, value] of additionalParams) {
      if (value == null)
        continue;
      const val = value.toString();
      const isString = typeof val === "string" || val instanceof String;
      if (!isString)
        continue;
      encodedFormData.append(key, val.toString());
    }
    return encodedFormData;
  }
  function parseParams(params2) {
    if (params2 == null)
      return void 0;
    if (containsEncodedComponents(params2)) {
      params2 = decodeURIComponent(params2);
    }
    try {
      return Object.entries(JSON.parse(params2));
    } catch (_a2) {
    }
    try {
      return new URLSearchParams(params2).entries();
    } catch (_b) {
    }
    return void 0;
  }
  function containsEncodedComponents(x) {
    return decodeURI(x) !== decodeURIComponent(x);
  }
  function Method() {
    const callbacks = [handleMethod$1];
    let queries = [];
    function initialize3() {
      queries = getQueries$2();
    }
    function connect2() {
      addListeners(queries, callbacks);
    }
    function disconnect2() {
      removeListeners(queries, callbacks);
    }
    function observerCallback2(nodeList) {
      attachObserverCallback(queries, nodeList, callbacks);
    }
    return {
      name: "Method",
      initialize: initialize3,
      connect: connect2,
      disconnect: disconnect2,
      observerCallback: observerCallback2,
      queries,
      callbacks
    };
  }
  function handleMethod$1(event) {
    var _a2;
    const element = event.currentTarget;
    if (element.dataset.remote === "false")
      return;
    if (element.dataset.method == null && element.dataset.remote !== "true")
      return;
    const href = (_a2 = element.getAttribute("href")) !== null && _a2 !== void 0 ? _a2 : element.dataset.url;
    if (href == null)
      return;
    event.preventDefault();
    const submitter = event.target;
    const linkSubmission = MethodSubmission(element);
    const { fetchRequest, request: request2 } = linkSubmission;
    dispatch3.call(element, AJAX_EVENTS.ajaxBeforeSend, {
      detail: { element, fetchRequest, request: request2, submitter }
    });
  }
  function getQueries$2() {
    const { linkClickSelector: linkClickSelector2, inputChangeSelector: inputChangeSelector2, buttonClickSelector: buttonClickSelector2 } = window.mrujs;
    return [
      {
        event: "click",
        selectors: [
          linkClickSelector2,
          buttonClickSelector2
        ]
      },
      {
        event: "change",
        selectors: [
          inputChangeSelector2
        ]
      }
    ];
  }
  var ALLOWABLE_ACTIONS = [
    "advance",
    "replace",
    "restore"
  ];
  function NavigationAdapter() {
    const obj = {
      name: "NavigationAdapter",
      connect: connect$1,
      disconnect: disconnect$1,
      cacheContains,
      prefetch,
      navigate
    };
    Object.defineProperties(obj, {
      adapter: { get: function() {
        return findAdapter();
      } },
      snapshotCache: { get: function() {
        return findSnapshotCache(findAdapter());
      } }
    });
    return obj;
  }
  function connect$1() {
    document.addEventListener("ajax:complete", beforeNavigation);
    document.addEventListener("ajax:beforeNavigation", navigateViaEvent);
  }
  function disconnect$1() {
    document.removeEventListener("ajax:complete", beforeNavigation);
    document.removeEventListener("ajax:beforeNavigation", navigateViaEvent);
  }
  function beforeNavigation(event) {
    if (event.defaultPrevented)
      return;
    dispatch3.call(event.detail.element, "ajax:beforeNavigation", { detail: { ...event.detail } });
  }
  function findAdapter() {
    if (useTurbolinks())
      return window.Turbolinks;
    if (useTurbo())
      return window.Turbo;
    return void 0;
  }
  function useTurbolinks() {
    if (window.Turbolinks == null)
      return false;
    if (window.Turbolinks.supported !== true)
      return false;
    return true;
  }
  function useTurbo() {
    if (window.Turbo == null)
      return false;
    return true;
  }
  function prefetch({ html: html2, url: url2 }) {
    const expandedUrl = expandUrl(url2);
    const snapshot = generateSnapshotFromHtml(html2);
    putSnapshotInCache(expandedUrl, snapshot);
  }
  function findSnapshotCache(adapter) {
    if (adapter == null)
      return void 0;
    if (useTurbolinks())
      return adapter.controller.cache;
    if (useTurbo())
      return adapter.navigator.view.snapshotCache;
    return void 0;
  }
  function cacheContains(url2) {
    var _a2;
    const expandedUrl = expandUrl(url2);
    const snapshotCache = findSnapshotCache(findAdapter());
    return (_a2 = snapshotCache === null || snapshotCache === void 0 ? void 0 : snapshotCache.has(expandedUrl)) !== null && _a2 !== void 0 ? _a2 : false;
  }
  function navigateViaEvent(event) {
    if (event.defaultPrevented)
      return;
    const { element, fetchResponse, fetchRequest } = event.detail;
    if (!shouldNavigate(element, fetchResponse))
      return;
    navigate(element, fetchRequest, fetchResponse);
  }
  function shouldNavigate(element, fetchResponse) {
    if (element.dataset.ujsNavigate === "false")
      return false;
    if (fetchResponse == null)
      return false;
    if (!fetchResponse.isHtml)
      return false;
    if (element instanceof HTMLFormElement && fetchResponse.succeeded && !fetchResponse.redirected) {
      console.error("Successful form submissions must redirect");
      return false;
    }
    return true;
  }
  function navigate(element, request2, response, action) {
    action = action !== null && action !== void 0 ? action : determineAction(element);
    let location2 = expandUrl(window.location.href);
    if (request2 === null || request2 === void 0 ? void 0 : request2.isGetRequest)
      location2 = request2.url;
    if (response.redirected)
      location2 = response.location;
    const currentLocation = window.location.href;
    const isSamePage = urlsAreEqual2(location2, currentLocation);
    let errorRenderer = "morphdom";
    if (window.mrujs.errorRenderer === "turbo" || element.getAttribute("data-ujs-error-renderer") === "turbo") {
      errorRenderer = "turbo";
    }
    if (response.failed || isSamePage) {
      morphResponse(element, response, !isSamePage, errorRenderer);
      return;
    }
    const adapter = findAdapter();
    if (adapter == null) {
      morphResponse(element, response, isSamePage, errorRenderer);
      return;
    }
    adapter.clearCache();
    preventDoubleVisit(response, location2, action);
  }
  function putSnapshotInCache(location2, snapshot) {
    if (snapshot === "")
      return;
    const snapshotCache = findSnapshotCache(findAdapter());
    snapshotCache === null || snapshotCache === void 0 ? void 0 : snapshotCache.put(expandUrl(location2), snapshot);
  }
  function generateSnapshotFromHtml(html2) {
    var _a2, _b, _c;
    const adapter = findAdapter();
    if (adapter == null)
      return "";
    if (useTurbolinks()) {
      return (_a2 = adapter.Snapshot.wrap(html2)) !== null && _a2 !== void 0 ? _a2 : "";
    }
    if (useTurbo() && canSnapshot()) {
      return (_c = (_b = adapter.PageSnapshot) === null || _b === void 0 ? void 0 : _b.fromHTMLString(html2)) !== null && _c !== void 0 ? _c : "";
    }
    return "";
  }
  function canSnapshot() {
    const adapter = findAdapter();
    if (adapter == null)
      return false;
    if (useTurbolinks())
      return true;
    if (useTurbo()) {
      if (adapter.PageSnapshot == null) {
        console.warn("The version of Turbo you are currently using does not support snapshot generation. Please consider upgrading your version of Turbo.");
        return false;
      }
      return true;
    }
    return false;
  }
  function preventDoubleVisit(response, location2, action) {
    const adapter = findAdapter();
    if (adapter == null)
      return;
    response.html().then((html2) => {
      prefetch({ html: html2, url: location2 });
      action = "restore";
      adapter.visit(location2, { action });
    }).catch((error4) => console.error(error4));
  }
  function morphResponse(element, response, pushState = false, errorRenderer = "morphdom") {
    if (!response.isHtml)
      return;
    response.html().then((html2) => {
      var _a2;
      if (errorRenderer === "turbo") {
        renderError(html2);
      } else if (errorRenderer === "morphdom") {
        const selectorString = element.getAttribute("data-ujs-morph-root");
        let selector = document.body;
        if (selectorString != null) {
          if (selectorString.trim() === "") {
            selector = element;
          } else {
            selector = (_a2 = document.querySelector(selectorString)) !== null && _a2 !== void 0 ? _a2 : document.body;
          }
        }
        morphHtml(html2, selector);
      }
      if (pushState) {
        window.history.pushState({}, "", response.location);
      }
    }).catch((error4) => {
      console.error(error4);
    });
  }
  function morphHtml(html2, selector = document.body) {
    const template2 = document.createElement("template");
    template2.innerHTML = String(html2).trim();
    morphdom_esm_default(selector, template2.content, { childrenOnly: true });
  }
  function renderError(html2) {
    const adapter = findAdapter();
    adapter === null || adapter === void 0 ? void 0 : adapter.navigator.view.renderError(generateSnapshotFromHtml(html2));
  }
  function determineAction(element) {
    var _a2, _b;
    let action = (_b = (_a2 = element.dataset.turbolinksAction) !== null && _a2 !== void 0 ? _a2 : element.dataset.turboAction) !== null && _b !== void 0 ? _b : "advance";
    if (!ALLOWABLE_ACTIONS.includes(action)) {
      action = "advance";
    }
    return action;
  }
  function DisabledElementChecker() {
    const callbacks = [handleDisabledElement$1];
    let queries = [];
    function initialize3() {
      queries = getQueries$1();
    }
    function connect2() {
      addListeners(queries, callbacks);
    }
    function disconnect2() {
      removeListeners(queries, callbacks);
    }
    function observerCallback2(nodeList) {
      attachObserverCallback(queries, nodeList, callbacks);
    }
    return {
      name: "DisabledElementChecker",
      initialize: initialize3,
      connect: connect2,
      disconnect: disconnect2,
      observerCallback: observerCallback2,
      queries,
      callbacks
    };
  }
  function getQueries$1() {
    const { linkClickSelector: linkClickSelector2, buttonClickSelector: buttonClickSelector2, inputChangeSelector: inputChangeSelector2, formSubmitSelector: formSubmitSelector2, formInputClickSelector: formInputClickSelector2 } = window.mrujs;
    return [
      { event: "click", selectors: [buttonClickSelector2, linkClickSelector2, formInputClickSelector2] },
      { event: "change", selectors: [inputChangeSelector2] },
      { event: "submit", selectors: [formSubmitSelector2] }
    ];
  }
  function handleDisabledElement$1(event) {
    if (this.disabled === true)
      stopEverything$1(event);
  }
  function ElementEnabler() {
    const callbacks = [enableElement$1];
    let queries = [];
    function initialize3() {
      queries = getQueries();
    }
    function connect2() {
      addListeners(queries, callbacks);
    }
    function disconnect2() {
      removeListeners(queries, callbacks);
    }
    function observerCallback2(nodeList) {
      attachObserverCallback(queries, nodeList, callbacks);
    }
    return {
      name: "ElementEnabler",
      initialize: initialize3,
      connect: connect2,
      disconnect: disconnect2,
      observerCallback: observerCallback2,
      callbacks
    };
  }
  function getQueries() {
    const { formSubmitSelector: formSubmitSelector2, buttonDisableSelector: buttonDisableSelector2, linkDisableSelector: linkDisableSelector2, inputChangeSelector: inputChangeSelector2 } = window.mrujs;
    const selectors = [
      linkDisableSelector2,
      buttonDisableSelector2,
      formSubmitSelector2,
      inputChangeSelector2
    ];
    return [
      { event: AJAX_EVENTS.ajaxComplete, selectors },
      { event: AJAX_EVENTS.ajaxStopped, selectors },
      { event: "turbo:submit-end", selectors }
    ];
  }
  function enableElement$1(trigger) {
    let element = trigger;
    if (trigger instanceof Event)
      element = trigger.target;
    const { linkDisableSelector: linkDisableSelector2, buttonDisableSelector: buttonDisableSelector2, formEnableSelector: formEnableSelector2, formSubmitSelector: formSubmitSelector2 } = window.mrujs;
    if (matches$1(element, linkDisableSelector2)) {
      enableLinkElement(element);
      return;
    }
    if (matches$1(element, buttonDisableSelector2) || matches$1(element, formEnableSelector2)) {
      enableFormElement(element);
      return;
    }
    if (matches$1(element, formSubmitSelector2)) {
      enableFormElements(element);
    }
  }
  function enableLinkElement(element) {
    const originalText = element.dataset.ujsEnableWith;
    if (originalText != null) {
      element.innerHTML = originalText;
      element.removeAttribute("data-ujs-enable-with");
    }
    element.removeEventListener("click", stopEverything$1);
    element.removeAttribute("data-ujs-disabled");
  }
  function enableFormElements(form2) {
    const elements = formElements$1(form2, window.mrujs.formEnableSelector);
    elements.forEach(enableFormElement);
  }
  function enableFormElement(element) {
    const originalText = element.dataset.ujsEnableWith;
    if (originalText != null) {
      if (matches$1(element, "button")) {
        element.innerHTML = originalText;
      } else {
        element.value = originalText;
      }
      element.removeAttribute("data-ujs-enable-with");
    }
    element.disabled = false;
    element.removeAttribute("data-ujs-disabled");
  }
  function AddedNodesObserver(callback) {
    const observer = new MutationObserver(callback);
    function connect2() {
      observer.observe(document, { childList: true, subtree: true, attributes: true });
    }
    function disconnect2() {
      observer.disconnect();
    }
    return {
      name: "AddedNodesObserver",
      connect: connect2,
      disconnect: disconnect2
    };
  }
  function Mrujs(obj = {}) {
    var _a2;
    obj.connected = false;
    obj = { ...BASE_SELECTORS };
    obj.FetchResponse = FetchResponse$1;
    obj.FetchRequest = FetchRequest$1;
    obj.addedNodesObserver = AddedNodesObserver(addedNodesCallback);
    obj.remoteWatcher = RemoteWatcher();
    obj.elementEnabler = ElementEnabler();
    obj.elementDisabler = ElementDisabler();
    obj.disabledElementChecker = DisabledElementChecker();
    obj.navigationAdapter = NavigationAdapter();
    obj.clickHandler = ClickHandler();
    obj.confirmClass = Confirm();
    obj.csrf = Csrf();
    obj.method = Method();
    obj.formSubmitDispatcher = FormSubmitDispatcher();
    const corePlugins = [
      obj.addedNodesObserver,
      obj.remoteWatcher,
      obj.csrf,
      obj.elementEnabler,
      obj.clickHandler,
      obj.disabledElementChecker,
      obj.confirmClass,
      obj.elementDisabler,
      obj.method,
      obj.formSubmitDispatcher,
      obj.navigationAdapter
    ];
    obj.corePlugins = corePlugins;
    const plugins = (_a2 = obj.plugins) !== null && _a2 !== void 0 ? _a2 : [];
    obj.plugins = plugins;
    const allPlugins = corePlugins.concat(plugins);
    obj.allPlugins = allPlugins;
    obj.maskLinkMethods = true;
    obj.mimeTypes = { ...BASE_ACCEPT_HEADERS };
    obj.stop = stop;
    obj.restart = restart;
    obj.fetch = fetch3;
    obj.urlEncodeFormData = urlEncodeFormData;
    obj.registerMimeTypes = registerMimeTypes;
    obj.enableElement = enableElement$1;
    obj.enableFormElements = enableFormElements;
    obj.enableFormElement = enableFormElement;
    obj.disableElement = disableElement$1;
    obj.stopEverything = stopEverything$1;
    obj.dispatch = dispatch3;
    obj.addListeners = addListeners;
    obj.removeListeners = removeListeners;
    obj.attachObserverCallback = attachObserverCallback;
    obj.expandUrl = expandUrl;
    obj.findSubmitter = findSubmitter;
    obj.$ = $$1;
    obj.CSRFProtection = CSRFProtection$1;
    obj.csrfParam = csrfParam$1;
    obj.csrfToken = csrfToken$1;
    obj.cspNonce = cspNonce$1;
    obj.confirm = confirm$1;
    obj.handleConfirm = handleConfirm$1;
    obj.handleDisabledElement = handleDisabledElement$1;
    obj.handleMethod = handleMethod$1;
    obj.start = start$1;
    obj.preventInsignificantClick = preventInsignificantClick$1;
    obj.refreshCSRFTokens = refreshCSRFTokens$1;
    obj.delegate = delegate$1;
    obj.fire = fire$1;
    obj.formElements = formElements$1;
    obj.matches = matches$1;
    obj.toArray = toArray;
    return obj;
  }
  function start$1(options2 = {}) {
    var _a2;
    window.Rails = window.mrujs = this;
    if (window.mrujs.connected) {
      return window.mrujs;
    }
    Object.assign(this, options2);
    this.allPlugins = this.corePlugins.concat(this.plugins);
    for (let i = 0; i < this.allPlugins.length; i++) {
      const plugin = this.allPlugins[i];
      (_a2 = plugin.initialize) === null || _a2 === void 0 ? void 0 : _a2.call(plugin);
    }
    connect();
    return this;
  }
  function stop() {
    disconnect();
  }
  function restart() {
    disconnect();
    connect();
  }
  function connect() {
    var _a2;
    reEnableDisabledElements();
    window.addEventListener("pageshow", reEnableDisabledElements);
    for (let i = 0; i < window.mrujs.allPlugins.length; i++) {
      const plugin = window.mrujs.allPlugins[i];
      (_a2 = plugin.connect) === null || _a2 === void 0 ? void 0 : _a2.call(plugin);
    }
    window.mrujs.connected = true;
  }
  function disconnect() {
    var _a2;
    window.removeEventListener("pageshow", reEnableDisabledElements);
    for (let i = 0; i < window.mrujs.allPlugins.length; i++) {
      const plugin = window.mrujs.allPlugins[i];
      (_a2 = plugin.disconnect) === null || _a2 === void 0 ? void 0 : _a2.call(plugin);
    }
    window.mrujs.connected = false;
  }
  function confirm$1(message) {
    return window.confirm(message);
  }
  function addedNodesCallback(mutationList, _observer) {
    for (const mutation of mutationList) {
      let addedNodes;
      if (mutation.type === "attributes") {
        addedNodes = [mutation.target];
      } else {
        addedNodes = Array.from(mutation.addedNodes);
      }
      window.setTimeout(() => {
        var _a2;
        for (let i = 0; i < window.mrujs.allPlugins.length; i++) {
          const plugin = window.mrujs.allPlugins[i];
          (_a2 = plugin.observerCallback) === null || _a2 === void 0 ? void 0 : _a2.call(plugin, addedNodes);
        }
      }, 0);
    }
  }
  function fetch3(input2, options2 = {}) {
    let { element, submitter, dispatchEvents } = options2;
    delete options2.element;
    delete options2.submitter;
    delete options2.dispatchEvents;
    const fetchRequest = FetchRequest$1(input2, options2);
    if (dispatchEvents === true) {
      if (element == null)
        element = document.documentElement;
      dispatch3.call(element, AJAX_EVENTS.ajaxBeforeSend, {
        detail: { element, fetchRequest, request: fetchRequest.request, submitter }
      });
      return void 0;
    }
    return window.fetch(fetchRequest.request);
  }
  function registerMimeTypes(mimeTypes) {
    mimeTypes.forEach((mimeType) => {
      const { shortcut, header } = mimeType;
      window.mrujs.mimeTypes[shortcut] = header;
    });
    return window.mrujs.mimeTypes;
  }
  function reEnableDisabledElements() {
    const { formEnableSelector: formEnableSelector2, linkDisableSelector: linkDisableSelector2 } = window.mrujs;
    $$1(`${formEnableSelector2}, ${linkDisableSelector2}`).forEach((element) => {
      const el = element;
      enableElement$1(el);
    });
  }
  function cspNonce$1() {
    return getMetaContent2("csp-nonce");
  }
  var mrujs = Mrujs();
  var { $, CSRFProtection, buttonClickSelector, buttonDisableSelector, cspNonce, csrfParam, csrfToken, confirm: confirm2, delegate, disableElement, enableElement, fileInputSelector, fire, formDisableSelector, formElements, formEnableSelector, formInputClickSelector, formSubmitSelector, handleConfirm, handleDisabledElement, handleMethod, inputChangeSelector, linkClickSelector, linkDisableSelector, matches, preventInsignificantClick, refreshCSRFTokens, start: start2, stopEverything, FetchResponse: FetchResponse2, FetchRequest: FetchRequest2 } = mrujs;

  // ../../node_modules/mrujs/plugins/dist/plugins.module.js
  var CableCar = class {
    constructor(cableReady, { mimeType } = {}) {
      this.cableReady = cableReady;
      this.mimeType = mimeType !== null && mimeType !== void 0 ? mimeType : "application/vnd.cable-ready.json";
      this.boundPerform = this.perform.bind(this);
    }
    get name() {
      return "CableCar";
    }
    initialize() {
      const anyHeader = window.mrujs.mimeTypes.any;
      window.mrujs.registerMimeTypes([
        { shortcut: "any", header: `${this.mimeType}, ${anyHeader}` },
        { shortcut: "cablecar", header: this.mimeType }
      ]);
    }
    connect() {
      document.addEventListener("ajax:beforeNavigation", this.boundPerform);
    }
    disconnect() {
      document.removeEventListener("ajax:beforeNavigation", this.boundPerform);
    }
    perform(event) {
      const fetchResponse = event.detail.fetchResponse;
      if ((fetchResponse === null || fetchResponse === void 0 ? void 0 : fetchResponse.contentType) == null)
        return;
      if (!this.isCableReadyResponse(fetchResponse.contentType))
        return;
      event.preventDefault();
      fetchResponse.json().then((response) => {
        this.cableReady.perform(response);
      }).catch((err) => {
        console.error(err);
      });
    }
    isCableReadyResponse(contentType) {
      return Boolean(contentType.includes(this.mimeType));
    }
  };

  // ../../node_modules/trix/dist/trix.js
  var version2 = "2.0.0-alpha.1";
  var attachmentSelector = "[data-trix-attachment]";
  var attachments = {
    preview: {
      presentation: "gallery",
      caption: {
        name: true,
        size: true
      }
    },
    file: {
      caption: {
        size: true
      }
    }
  };
  var attributes = {
    default: {
      tagName: "div",
      parse: false
    },
    quote: {
      tagName: "blockquote",
      nestable: true
    },
    heading1: {
      tagName: "h1",
      terminal: true,
      breakOnReturn: true,
      group: false
    },
    code: {
      tagName: "pre",
      terminal: true,
      text: {
        plaintext: true
      }
    },
    bulletList: {
      tagName: "ul",
      parse: false
    },
    bullet: {
      tagName: "li",
      listAttribute: "bulletList",
      group: false,
      nestable: true,
      test(element) {
        return tagName$1(element.parentNode) === attributes[this.listAttribute].tagName;
      }
    },
    numberList: {
      tagName: "ol",
      parse: false
    },
    number: {
      tagName: "li",
      listAttribute: "numberList",
      group: false,
      nestable: true,
      test(element) {
        return tagName$1(element.parentNode) === attributes[this.listAttribute].tagName;
      }
    },
    attachmentGallery: {
      tagName: "div",
      exclusive: true,
      terminal: true,
      parse: false,
      group: false
    }
  };
  var tagName$1 = (element) => {
    var _element$tagName;
    return element === null || element === void 0 ? void 0 : (_element$tagName = element.tagName) === null || _element$tagName === void 0 ? void 0 : _element$tagName.toLowerCase();
  };
  var browser$1 = {
    composesExistingText: /Android.*Chrome/.test(navigator.userAgent),
    forcesObjectResizing: /Trident.*rv:11/.test(navigator.userAgent),
    supportsInputEvents: function() {
      if (typeof InputEvent === "undefined") {
        return false;
      }
      for (const property of ["data", "getTargetRanges", "inputType"]) {
        if (!(property in InputEvent.prototype)) {
          return false;
        }
      }
      return true;
    }()
  };
  var css$3 = {
    attachment: "attachment",
    attachmentCaption: "attachment__caption",
    attachmentCaptionEditor: "attachment__caption-editor",
    attachmentMetadata: "attachment__metadata",
    attachmentMetadataContainer: "attachment__metadata-container",
    attachmentName: "attachment__name",
    attachmentProgress: "attachment__progress",
    attachmentSize: "attachment__size",
    attachmentToolbar: "attachment__toolbar",
    attachmentGallery: "attachment-gallery"
  };
  var lang$1 = {
    attachFiles: "Attach Files",
    bold: "Bold",
    bullets: "Bullets",
    byte: "Byte",
    bytes: "Bytes",
    captionPlaceholder: "Add a caption\u2026",
    code: "Code",
    heading1: "Heading",
    indent: "Increase Level",
    italic: "Italic",
    link: "Link",
    numbers: "Numbers",
    outdent: "Decrease Level",
    quote: "Quote",
    redo: "Redo",
    remove: "Remove",
    strike: "Strikethrough",
    undo: "Undo",
    unlink: "Unlink",
    url: "URL",
    urlPlaceholder: "Enter a URL\u2026",
    GB: "GB",
    KB: "KB",
    MB: "MB",
    PB: "PB",
    TB: "TB"
  };
  var sizes = [lang$1.bytes, lang$1.KB, lang$1.MB, lang$1.GB, lang$1.TB, lang$1.PB];
  var fileSize = {
    prefix: "IEC",
    precision: 2,
    formatter(number) {
      switch (number) {
        case 0:
          return "0 ".concat(lang$1.bytes);
        case 1:
          return "1 ".concat(lang$1.byte);
        default:
          let base;
          if (this.prefix === "SI") {
            base = 1e3;
          } else if (this.prefix === "IEC") {
            base = 1024;
          }
          const exp = Math.floor(Math.log(number) / Math.log(base));
          const humanSize = number / Math.pow(base, exp);
          const string = humanSize.toFixed(this.precision);
          const withoutInsignificantZeros = string.replace(/0*$/, "").replace(/\.$/, "");
          return "".concat(withoutInsignificantZeros, " ").concat(sizes[exp]);
      }
    }
  };
  var ZERO_WIDTH_SPACE = "\uFEFF";
  var NON_BREAKING_SPACE = "\xA0";
  var OBJECT_REPLACEMENT_CHARACTER = "\uFFFC";
  var extend5 = function(properties) {
    for (const key in properties) {
      const value = properties[key];
      this[key] = value;
    }
    return this;
  };
  var html = document.documentElement;
  var match = html.matches;
  var handleEvent = function(eventName) {
    let {
      onElement,
      matchingSelector,
      withCallback,
      inPhase,
      preventDefault,
      times
    } = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    const element = onElement ? onElement : html;
    const selector = matchingSelector;
    const useCapture = inPhase === "capturing";
    const handler = function(event) {
      if (times != null && --times === 0) {
        handler.destroy();
      }
      const target = findClosestElementFromNode(event.target, {
        matchingSelector: selector
      });
      if (target != null) {
        withCallback === null || withCallback === void 0 ? void 0 : withCallback.call(target, event, target);
        if (preventDefault) {
          event.preventDefault();
        }
      }
    };
    handler.destroy = () => element.removeEventListener(eventName, handler, useCapture);
    element.addEventListener(eventName, handler, useCapture);
    return handler;
  };
  var handleEventOnce = function(eventName) {
    let options2 = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    options2.times = 1;
    return handleEvent(eventName, options2);
  };
  var triggerEvent = function(eventName) {
    let {
      onElement,
      bubbles,
      cancelable,
      attributes: attributes2
    } = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    const element = onElement != null ? onElement : html;
    bubbles = bubbles !== false;
    cancelable = cancelable !== false;
    const event = document.createEvent("Events");
    event.initEvent(eventName, bubbles, cancelable);
    if (attributes2 != null) {
      extend5.call(event, attributes2);
    }
    return element.dispatchEvent(event);
  };
  var elementMatchesSelector = function(element, selector) {
    if ((element === null || element === void 0 ? void 0 : element.nodeType) === 1) {
      return match.call(element, selector);
    }
  };
  var findClosestElementFromNode = function(node) {
    let {
      matchingSelector,
      untilNode
    } = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    while (node && node.nodeType !== Node.ELEMENT_NODE) {
      node = node.parentNode;
    }
    if (node == null) {
      return;
    }
    if (matchingSelector != null) {
      if (node.closest && untilNode == null) {
        return node.closest(matchingSelector);
      } else {
        while (node && node !== untilNode) {
          if (elementMatchesSelector(node, matchingSelector)) {
            return node;
          }
          node = node.parentNode;
        }
      }
    } else {
      return node;
    }
  };
  var findInnerElement = function(element) {
    while ((_element = element) !== null && _element !== void 0 && _element.firstElementChild) {
      var _element;
      element = element.firstElementChild;
    }
    return element;
  };
  var innerElementIsActive = (element) => document.activeElement !== element && elementContainsNode(element, document.activeElement);
  var elementContainsNode = function(element, node) {
    if (!element || !node) {
      return;
    }
    while (node) {
      if (node === element) {
        return true;
      }
      node = node.parentNode;
    }
  };
  var findChildIndexOfNode = function(node) {
    var _node;
    if (!((_node = node) !== null && _node !== void 0 && _node.parentNode)) {
      return;
    }
    let childIndex = 0;
    node = node.previousSibling;
    while (node) {
      childIndex++;
      node = node.previousSibling;
    }
    return childIndex;
  };
  var removeNode = (node) => {
    var _node$parentNode;
    return node === null || node === void 0 ? void 0 : (_node$parentNode = node.parentNode) === null || _node$parentNode === void 0 ? void 0 : _node$parentNode.removeChild(node);
  };
  var walkTree = function(tree) {
    let {
      onlyNodesOfType,
      usingFilter,
      expandEntityReferences
    } = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    const whatToShow = (() => {
      switch (onlyNodesOfType) {
        case "element":
          return NodeFilter.SHOW_ELEMENT;
        case "text":
          return NodeFilter.SHOW_TEXT;
        case "comment":
          return NodeFilter.SHOW_COMMENT;
        default:
          return NodeFilter.SHOW_ALL;
      }
    })();
    return document.createTreeWalker(tree, whatToShow, usingFilter != null ? usingFilter : null, expandEntityReferences === true);
  };
  var tagName = (element) => {
    var _element$tagName;
    return element === null || element === void 0 ? void 0 : (_element$tagName = element.tagName) === null || _element$tagName === void 0 ? void 0 : _element$tagName.toLowerCase();
  };
  var makeElement = function(tag) {
    let options2 = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    let key, value;
    if (typeof tag === "object") {
      options2 = tag;
      tag = options2.tagName;
    } else {
      options2 = {
        attributes: options2
      };
    }
    const element = document.createElement(tag);
    if (options2.editable != null) {
      if (options2.attributes == null) {
        options2.attributes = {};
      }
      options2.attributes.contenteditable = options2.editable;
    }
    if (options2.attributes) {
      for (key in options2.attributes) {
        value = options2.attributes[key];
        element.setAttribute(key, value);
      }
    }
    if (options2.style) {
      for (key in options2.style) {
        value = options2.style[key];
        element.style[key] = value;
      }
    }
    if (options2.data) {
      for (key in options2.data) {
        value = options2.data[key];
        element.dataset[key] = value;
      }
    }
    if (options2.className) {
      options2.className.split(" ").forEach((className) => {
        element.classList.add(className);
      });
    }
    if (options2.textContent) {
      element.textContent = options2.textContent;
    }
    if (options2.childNodes) {
      [].concat(options2.childNodes).forEach((childNode) => {
        element.appendChild(childNode);
      });
    }
    return element;
  };
  var blockTagNames = void 0;
  var getBlockTagNames = function() {
    if (blockTagNames != null) {
      return blockTagNames;
    }
    blockTagNames = [];
    for (const key in attributes) {
      const attributes$1 = attributes[key];
      if (attributes$1.tagName) {
        blockTagNames.push(attributes$1.tagName);
      }
    }
    return blockTagNames;
  };
  var nodeIsBlockContainer = (node) => nodeIsBlockStartComment(node === null || node === void 0 ? void 0 : node.firstChild);
  var nodeProbablyIsBlockContainer = function(node) {
    return getBlockTagNames().includes(tagName(node)) && !getBlockTagNames().includes(tagName(node.firstChild));
  };
  var nodeIsBlockStart = function(node) {
    let {
      strict
    } = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {
      strict: true
    };
    if (strict) {
      return nodeIsBlockStartComment(node);
    } else {
      return nodeIsBlockStartComment(node) || !nodeIsBlockStartComment(node.firstChild) && nodeProbablyIsBlockContainer(node);
    }
  };
  var nodeIsBlockStartComment = (node) => nodeIsCommentNode(node) && (node === null || node === void 0 ? void 0 : node.data) === "block";
  var nodeIsCommentNode = (node) => (node === null || node === void 0 ? void 0 : node.nodeType) === Node.COMMENT_NODE;
  var nodeIsCursorTarget = function(node) {
    let {
      name
    } = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    if (!node) {
      return;
    }
    if (nodeIsTextNode(node)) {
      if (node.data === ZERO_WIDTH_SPACE) {
        if (name) {
          return node.parentNode.dataset.trixCursorTarget === name;
        } else {
          return true;
        }
      }
    } else {
      return nodeIsCursorTarget(node.firstChild);
    }
  };
  var nodeIsAttachmentElement = (node) => elementMatchesSelector(node, attachmentSelector);
  var nodeIsEmptyTextNode = (node) => nodeIsTextNode(node) && (node === null || node === void 0 ? void 0 : node.data) === "";
  var nodeIsTextNode = (node) => (node === null || node === void 0 ? void 0 : node.nodeType) === Node.TEXT_NODE;
  var input = {
    level2Enabled: true,
    getLevel() {
      if (this.level2Enabled && browser$1.supportsInputEvents) {
        return 2;
      } else {
        return 0;
      }
    },
    pickFiles(callback) {
      const input2 = makeElement("input", {
        type: "file",
        multiple: true,
        hidden: true,
        id: this.fileInputId
      });
      input2.addEventListener("change", () => {
        callback(input2.files);
        removeNode(input2);
      });
      removeNode(document.getElementById(this.fileInputId));
      document.body.appendChild(input2);
      input2.click();
    }
  };
  var keyNames$2 = {
    8: "backspace",
    9: "tab",
    13: "return",
    27: "escape",
    37: "left",
    39: "right",
    46: "delete",
    68: "d",
    72: "h",
    79: "o"
  };
  var textAttributes = {
    bold: {
      tagName: "strong",
      inheritable: true,
      parser(element) {
        const style = window.getComputedStyle(element);
        return style.fontWeight === "bold" || style.fontWeight >= 600;
      }
    },
    italic: {
      tagName: "em",
      inheritable: true,
      parser(element) {
        const style = window.getComputedStyle(element);
        return style.fontStyle === "italic";
      }
    },
    href: {
      groupTagName: "a",
      parser(element) {
        const matchingSelector = "a:not(".concat(attachmentSelector, ")");
        const link2 = element.closest(matchingSelector);
        if (link2) {
          return link2.getAttribute("href");
        }
      }
    },
    strike: {
      tagName: "del",
      inheritable: true
    },
    frozen: {
      style: {
        backgroundColor: "highlight"
      }
    }
  };
  var toolbar = {
    getDefaultHTML() {
      return '<div class="trix-button-row">\n      <span class="trix-button-group trix-button-group--text-tools" data-trix-button-group="text-tools">\n        <button type="button" class="trix-button trix-button--icon trix-button--icon-bold" data-trix-attribute="bold" data-trix-key="b" title="'.concat(lang$1.bold, '" tabindex="-1">').concat(lang$1.bold, '</button>\n        <button type="button" class="trix-button trix-button--icon trix-button--icon-italic" data-trix-attribute="italic" data-trix-key="i" title="').concat(lang$1.italic, '" tabindex="-1">').concat(lang$1.italic, '</button>\n        <button type="button" class="trix-button trix-button--icon trix-button--icon-strike" data-trix-attribute="strike" title="').concat(lang$1.strike, '" tabindex="-1">').concat(lang$1.strike, '</button>\n        <button type="button" class="trix-button trix-button--icon trix-button--icon-link" data-trix-attribute="href" data-trix-action="link" data-trix-key="k" title="').concat(lang$1.link, '" tabindex="-1">').concat(lang$1.link, '</button>\n      </span>\n\n      <span class="trix-button-group trix-button-group--block-tools" data-trix-button-group="block-tools">\n        <button type="button" class="trix-button trix-button--icon trix-button--icon-heading-1" data-trix-attribute="heading1" title="').concat(lang$1.heading1, '" tabindex="-1">').concat(lang$1.heading1, '</button>\n        <button type="button" class="trix-button trix-button--icon trix-button--icon-quote" data-trix-attribute="quote" title="').concat(lang$1.quote, '" tabindex="-1">').concat(lang$1.quote, '</button>\n        <button type="button" class="trix-button trix-button--icon trix-button--icon-code" data-trix-attribute="code" title="').concat(lang$1.code, '" tabindex="-1">').concat(lang$1.code, '</button>\n        <button type="button" class="trix-button trix-button--icon trix-button--icon-bullet-list" data-trix-attribute="bullet" title="').concat(lang$1.bullets, '" tabindex="-1">').concat(lang$1.bullets, '</button>\n        <button type="button" class="trix-button trix-button--icon trix-button--icon-number-list" data-trix-attribute="number" title="').concat(lang$1.numbers, '" tabindex="-1">').concat(lang$1.numbers, '</button>\n        <button type="button" class="trix-button trix-button--icon trix-button--icon-decrease-nesting-level" data-trix-action="decreaseNestingLevel" title="').concat(lang$1.outdent, '" tabindex="-1">').concat(lang$1.outdent, '</button>\n        <button type="button" class="trix-button trix-button--icon trix-button--icon-increase-nesting-level" data-trix-action="increaseNestingLevel" title="').concat(lang$1.indent, '" tabindex="-1">').concat(lang$1.indent, '</button>\n      </span>\n\n      <span class="trix-button-group trix-button-group--file-tools" data-trix-button-group="file-tools">\n        <button type="button" class="trix-button trix-button--icon trix-button--icon-attach" data-trix-action="attachFiles" title="').concat(lang$1.attachFiles, '" tabindex="-1">').concat(lang$1.attachFiles, '</button>\n      </span>\n\n      <span class="trix-button-group-spacer"></span>\n\n      <span class="trix-button-group trix-button-group--history-tools" data-trix-button-group="history-tools">\n        <button type="button" class="trix-button trix-button--icon trix-button--icon-undo" data-trix-action="undo" data-trix-key="z" title="').concat(lang$1.undo, '" tabindex="-1">').concat(lang$1.undo, '</button>\n        <button type="button" class="trix-button trix-button--icon trix-button--icon-redo" data-trix-action="redo" data-trix-key="shift+z" title="').concat(lang$1.redo, '" tabindex="-1">').concat(lang$1.redo, '</button>\n      </span>\n    </div>\n\n    <div class="trix-dialogs" data-trix-dialogs>\n      <div class="trix-dialog trix-dialog--link" data-trix-dialog="href" data-trix-dialog-attribute="href">\n        <div class="trix-dialog__link-fields">\n          <input type="url" name="href" class="trix-input trix-input--dialog" placeholder="').concat(lang$1.urlPlaceholder, '" aria-label="').concat(lang$1.url, '" required data-trix-input>\n          <div class="trix-button-group">\n            <input type="button" class="trix-button trix-button--dialog" value="').concat(lang$1.link, '" data-trix-method="setAttribute">\n            <input type="button" class="trix-button trix-button--dialog" value="').concat(lang$1.unlink, '" data-trix-method="removeAttribute">\n          </div>\n        </div>\n      </div>\n    </div>');
    }
  };
  var undoInterval = 5e3;
  var config = {
    attachments,
    blockAttributes: attributes,
    browser: browser$1,
    css: css$3,
    fileSize,
    input,
    keyNames: keyNames$2,
    lang: lang$1,
    textAttributes,
    toolbar,
    undoInterval
  };
  function _AwaitValue(value) {
    this.wrapped = value;
  }
  function _AsyncGenerator(gen) {
    var front, back;
    function send(key, arg) {
      return new Promise(function(resolve, reject) {
        var request2 = {
          key,
          arg,
          resolve,
          reject,
          next: null
        };
        if (back) {
          back = back.next = request2;
        } else {
          front = back = request2;
          resume(key, arg);
        }
      });
    }
    function resume(key, arg) {
      try {
        var result = gen[key](arg);
        var value = result.value;
        var wrappedAwait = value instanceof _AwaitValue;
        Promise.resolve(wrappedAwait ? value.wrapped : value).then(function(arg2) {
          if (wrappedAwait) {
            resume(key === "return" ? "return" : "next", arg2);
            return;
          }
          settle(result.done ? "return" : "normal", arg2);
        }, function(err) {
          resume("throw", err);
        });
      } catch (err) {
        settle("throw", err);
      }
    }
    function settle(type, value) {
      switch (type) {
        case "return":
          front.resolve({
            value,
            done: true
          });
          break;
        case "throw":
          front.reject(value);
          break;
        default:
          front.resolve({
            value,
            done: false
          });
          break;
      }
      front = front.next;
      if (front) {
        resume(front.key, front.arg);
      } else {
        back = null;
      }
    }
    this._invoke = send;
    if (typeof gen.return !== "function") {
      this.return = void 0;
    }
  }
  _AsyncGenerator.prototype[typeof Symbol === "function" && Symbol.asyncIterator || "@@asyncIterator"] = function() {
    return this;
  };
  _AsyncGenerator.prototype.next = function(arg) {
    return this._invoke("next", arg);
  };
  _AsyncGenerator.prototype.throw = function(arg) {
    return this._invoke("throw", arg);
  };
  _AsyncGenerator.prototype.return = function(arg) {
    return this._invoke("return", arg);
  };
  function _defineProperty(obj, key, value) {
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else {
      obj[key] = value;
    }
    return obj;
  }
  var BasicObject = class {
    static proxyMethod(expression) {
      const {
        name,
        toMethod,
        toProperty,
        optional
      } = parseProxyMethodExpression(expression);
      this.prototype[name] = function() {
        let subject;
        let object2;
        if (toMethod) {
          if (optional) {
            var _this$toMethod;
            object2 = (_this$toMethod = this[toMethod]) === null || _this$toMethod === void 0 ? void 0 : _this$toMethod.call(this);
          } else {
            object2 = this[toMethod]();
          }
        } else if (toProperty) {
          object2 = this[toProperty];
        }
        if (optional) {
          var _object;
          subject = (_object = object2) === null || _object === void 0 ? void 0 : _object[name];
          if (subject) {
            return apply.call(subject, object2, arguments);
          }
        } else {
          subject = object2[name];
          return apply.call(subject, object2, arguments);
        }
      };
    }
  };
  var parseProxyMethodExpression = function(expression) {
    const match2 = expression.match(proxyMethodExpressionPattern);
    if (!match2) {
      throw new Error("can't parse @proxyMethod expression: ".concat(expression));
    }
    const args = {
      name: match2[4]
    };
    if (match2[2] != null) {
      args.toMethod = match2[1];
    } else {
      args.toProperty = match2[1];
    }
    if (match2[3] != null) {
      args.optional = true;
    }
    return args;
  };
  var {
    apply
  } = Function.prototype;
  var proxyMethodExpressionPattern = new RegExp("^(.+?)(\\(\\))?(\\?)?\\.(.+?)$");
  var _Array$from;
  var _$codePointAt$1;
  var _$1;
  var _String$fromCodePoint;
  var UTF16String = class extends BasicObject {
    static box() {
      let value = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : "";
      if (value instanceof this) {
        return value;
      } else {
        return this.fromUCS2String(value === null || value === void 0 ? void 0 : value.toString());
      }
    }
    static fromUCS2String(ucs2String) {
      return new this(ucs2String, ucs2decode(ucs2String));
    }
    static fromCodepoints(codepoints) {
      return new this(ucs2encode(codepoints), codepoints);
    }
    constructor(ucs2String, codepoints) {
      super(...arguments);
      this.ucs2String = ucs2String;
      this.codepoints = codepoints;
      this.length = this.codepoints.length;
      this.ucs2Length = this.ucs2String.length;
    }
    offsetToUCS2Offset(offset) {
      return ucs2encode(this.codepoints.slice(0, Math.max(0, offset))).length;
    }
    offsetFromUCS2Offset(ucs2Offset) {
      return ucs2decode(this.ucs2String.slice(0, Math.max(0, ucs2Offset))).length;
    }
    slice() {
      return this.constructor.fromCodepoints(this.codepoints.slice(...arguments));
    }
    charAt(offset) {
      return this.slice(offset, offset + 1);
    }
    isEqualTo(value) {
      return this.constructor.box(value).ucs2String === this.ucs2String;
    }
    toJSON() {
      return this.ucs2String;
    }
    getCacheKey() {
      return this.ucs2String;
    }
    toString() {
      return this.ucs2String;
    }
  };
  var hasArrayFrom = ((_Array$from = Array.from) === null || _Array$from === void 0 ? void 0 : _Array$from.call(Array, "\u{1F47C}").length) === 1;
  var hasStringCodePointAt$1 = ((_$codePointAt$1 = (_$1 = " ").codePointAt) === null || _$codePointAt$1 === void 0 ? void 0 : _$codePointAt$1.call(_$1, 0)) != null;
  var hasStringFromCodePoint = ((_String$fromCodePoint = String.fromCodePoint) === null || _String$fromCodePoint === void 0 ? void 0 : _String$fromCodePoint.call(String, 32, 128124)) === " \u{1F47C}";
  var ucs2decode;
  var ucs2encode;
  if (hasArrayFrom && hasStringCodePointAt$1) {
    ucs2decode = (string) => Array.from(string).map((char) => char.codePointAt(0));
  } else {
    ucs2decode = function(string) {
      const output = [];
      let counter = 0;
      const {
        length
      } = string;
      while (counter < length) {
        let value = string.charCodeAt(counter++);
        if (55296 <= value && value <= 56319 && counter < length) {
          const extra = string.charCodeAt(counter++);
          if ((extra & 64512) === 56320) {
            value = ((value & 1023) << 10) + (extra & 1023) + 65536;
          } else {
            counter--;
          }
        }
        output.push(value);
      }
      return output;
    };
  }
  if (hasStringFromCodePoint) {
    ucs2encode = (array) => String.fromCodePoint(...Array.from(array || []));
  } else {
    ucs2encode = function(array) {
      const characters = (() => {
        const result = [];
        Array.from(array).forEach((value) => {
          let output = "";
          if (value > 65535) {
            value -= 65536;
            output += String.fromCharCode(value >>> 10 & 1023 | 55296);
            value = 56320 | value & 1023;
          }
          result.push(output + String.fromCharCode(value));
        });
        return result;
      })();
      return characters.join("");
    };
  }
  var id$1 = 0;
  var TrixObject = class extends BasicObject {
    static fromJSONString(jsonString) {
      return this.fromJSON(JSON.parse(jsonString));
    }
    constructor() {
      super(...arguments);
      this.id = ++id$1;
    }
    hasSameConstructorAs(object2) {
      return this.constructor === (object2 === null || object2 === void 0 ? void 0 : object2.constructor);
    }
    isEqualTo(object2) {
      return this === object2;
    }
    inspect() {
      const parts = [];
      const contents = this.contentsForInspection() || {};
      for (const key in contents) {
        const value = contents[key];
        parts.push("".concat(key, "=").concat(value));
      }
      return "#<".concat(this.constructor.name, ":").concat(this.id).concat(parts.length ? " ".concat(parts.join(", ")) : "", ">");
    }
    contentsForInspection() {
    }
    toJSONString() {
      return JSON.stringify(this);
    }
    toUTF16String() {
      return UTF16String.box(this);
    }
    getCacheKey() {
      return this.id.toString();
    }
  };
  var arraysAreEqual = function() {
    let a = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : [];
    let b = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : [];
    if (a.length !== b.length) {
      return false;
    }
    for (let index = 0; index < a.length; index++) {
      const value = a[index];
      if (value !== b[index]) {
        return false;
      }
    }
    return true;
  };
  var arrayStartsWith = function() {
    let a = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : [];
    let b = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : [];
    return arraysAreEqual(a.slice(0, b.length), b);
  };
  var spliceArray = function(array) {
    const result = array.slice(0);
    for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
      args[_key - 1] = arguments[_key];
    }
    result.splice(...args);
    return result;
  };
  var summarizeArrayChange = function() {
    let oldArray = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : [];
    let newArray = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : [];
    const added = [];
    const removed = [];
    const existingValues = /* @__PURE__ */ new Set();
    oldArray.forEach((value) => {
      existingValues.add(value);
    });
    const currentValues = /* @__PURE__ */ new Set();
    newArray.forEach((value) => {
      currentValues.add(value);
      if (!existingValues.has(value)) {
        added.push(value);
      }
    });
    oldArray.forEach((value) => {
      if (!currentValues.has(value)) {
        removed.push(value);
      }
    });
    return {
      added,
      removed
    };
  };
  var RTL_PATTERN = /[\u05BE\u05C0\u05C3\u05D0-\u05EA\u05F0-\u05F4\u061B\u061F\u0621-\u063A\u0640-\u064A\u066D\u0671-\u06B7\u06BA-\u06BE\u06C0-\u06CE\u06D0-\u06D5\u06E5\u06E6\u200F\u202B\u202E\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE72\uFE74\uFE76-\uFEFC]/;
  var getDirection = function() {
    const input2 = makeElement("input", {
      dir: "auto",
      name: "x",
      dirName: "x.dir"
    });
    const form2 = makeElement("form");
    form2.appendChild(input2);
    const supportsDirName = function() {
      try {
        return new FormData(form2).has(input2.dirName);
      } catch (error4) {
        return false;
      }
    }();
    const supportsDirSelector = function() {
      try {
        return input2.matches(":dir(ltr),:dir(rtl)");
      } catch (error4) {
        return false;
      }
    }();
    if (supportsDirName) {
      return function(string) {
        input2.value = string;
        return new FormData(form2).get(input2.dirName);
      };
    } else if (supportsDirSelector) {
      return function(string) {
        input2.value = string;
        if (input2.matches(":dir(rtl)")) {
          return "rtl";
        } else {
          return "ltr";
        }
      };
    } else {
      return function(string) {
        const char = string.trim().charAt(0);
        if (RTL_PATTERN.test(char)) {
          return "rtl";
        } else {
          return "ltr";
        }
      };
    }
  }();
  var allAttributeNames = null;
  var blockAttributeNames = null;
  var textAttributeNames = null;
  var listAttributeNames = null;
  var getAllAttributeNames = () => {
    if (!allAttributeNames) {
      allAttributeNames = getTextAttributeNames().concat(getBlockAttributeNames());
    }
    return allAttributeNames;
  };
  var getBlockConfig = (attributeName) => config.blockAttributes[attributeName];
  var getBlockAttributeNames = () => {
    if (!blockAttributeNames) {
      blockAttributeNames = Object.keys(config.blockAttributes);
    }
    return blockAttributeNames;
  };
  var getTextConfig = (attributeName) => config.textAttributes[attributeName];
  var getTextAttributeNames = () => {
    if (!textAttributeNames) {
      textAttributeNames = Object.keys(config.textAttributes);
    }
    return textAttributeNames;
  };
  var getListAttributeNames = () => {
    if (!listAttributeNames) {
      listAttributeNames = [];
      for (const key in config.blockAttributes) {
        const {
          listAttribute
        } = config.blockAttributes[key];
        if (listAttribute != null) {
          listAttributeNames.push(listAttribute);
        }
      }
    }
    return listAttributeNames;
  };
  var installDefaultCSSForTagName = function(tagName2, defaultCSS) {
    const styleElement = insertStyleElementForTagName(tagName2);
    styleElement.textContent = defaultCSS.replace(/%t/g, tagName2);
  };
  var insertStyleElementForTagName = function(tagName2) {
    const element = document.createElement("style");
    element.setAttribute("type", "text/css");
    element.setAttribute("data-tag-name", tagName2.toLowerCase());
    const nonce = getCSPNonce();
    if (nonce) {
      element.setAttribute("nonce", nonce);
    }
    document.head.insertBefore(element, document.head.firstChild);
    return element;
  };
  var getCSPNonce = function() {
    const element = getMetaElement2("trix-csp-nonce") || getMetaElement2("csp-nonce");
    if (element) {
      return element.getAttribute("content");
    }
  };
  var getMetaElement2 = (name) => document.head.querySelector("meta[name=".concat(name, "]"));
  var testTransferData = {
    "application/x-trix-feature-detection": "test"
  };
  var dataTransferIsPlainText = function(dataTransfer) {
    const text = dataTransfer.getData("text/plain");
    const html2 = dataTransfer.getData("text/html");
    if (text && html2) {
      const {
        body
      } = new DOMParser().parseFromString(html2, "text/html");
      if (body.textContent === text) {
        return !body.querySelector("*");
      }
    } else {
      return text === null || text === void 0 ? void 0 : text.length;
    }
  };
  var dataTransferIsWritable = function(dataTransfer) {
    if (!(dataTransfer !== null && dataTransfer !== void 0 && dataTransfer.setData))
      return false;
    for (const key in testTransferData) {
      const value = testTransferData[key];
      try {
        dataTransfer.setData(key, value);
        if (!dataTransfer.getData(key) === value)
          return false;
      } catch (error4) {
        return false;
      }
    }
    return true;
  };
  var keyEventIsKeyboardCommand = function() {
    if (/Mac|^iP/.test(navigator.platform)) {
      return (event) => event.metaKey;
    } else {
      return (event) => event.ctrlKey;
    }
  }();
  var defer = (fn) => setTimeout(fn, 1);
  var copyObject = function() {
    let object2 = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
    const result = {};
    for (const key in object2) {
      const value = object2[key];
      result[key] = value;
    }
    return result;
  };
  var objectsAreEqual = function() {
    let a = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
    let b = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    if (Object.keys(a).length !== Object.keys(b).length) {
      return false;
    }
    for (const key in a) {
      const value = a[key];
      if (value !== b[key]) {
        return false;
      }
    }
    return true;
  };
  var normalizeRange = function(range2) {
    if (range2 == null)
      return;
    if (!Array.isArray(range2)) {
      range2 = [range2, range2];
    }
    return [copyValue(range2[0]), copyValue(range2[1] != null ? range2[1] : range2[0])];
  };
  var rangeIsCollapsed = function(range2) {
    if (range2 == null)
      return;
    const [start3, end] = normalizeRange(range2);
    return rangeValuesAreEqual(start3, end);
  };
  var rangesAreEqual = function(leftRange, rightRange) {
    if (leftRange == null || rightRange == null)
      return;
    const [leftStart, leftEnd] = normalizeRange(leftRange);
    const [rightStart, rightEnd] = normalizeRange(rightRange);
    return rangeValuesAreEqual(leftStart, rightStart) && rangeValuesAreEqual(leftEnd, rightEnd);
  };
  var copyValue = function(value) {
    if (typeof value === "number") {
      return value;
    } else {
      return copyObject(value);
    }
  };
  var rangeValuesAreEqual = function(left, right) {
    if (typeof left === "number") {
      return left === right;
    } else {
      return objectsAreEqual(left, right);
    }
  };
  var SelectionChangeObserver = class extends BasicObject {
    constructor() {
      super(...arguments);
      this.update = this.update.bind(this);
      this.run = this.run.bind(this);
      this.selectionManagers = [];
    }
    start() {
      if (!this.started) {
        this.started = true;
        if ("onselectionchange" in document) {
          return document.addEventListener("selectionchange", this.update, true);
        } else {
          return this.run();
        }
      }
    }
    stop() {
      if (this.started) {
        this.started = false;
        return document.removeEventListener("selectionchange", this.update, true);
      }
    }
    registerSelectionManager(selectionManager) {
      if (!this.selectionManagers.includes(selectionManager)) {
        this.selectionManagers.push(selectionManager);
        return this.start();
      }
    }
    unregisterSelectionManager(selectionManager) {
      this.selectionManagers = this.selectionManagers.filter((s) => s !== selectionManager);
      if (this.selectionManagers.length === 0) {
        return this.stop();
      }
    }
    notifySelectionManagersOfSelectionChange() {
      return this.selectionManagers.map((selectionManager) => selectionManager.selectionDidChange());
    }
    update() {
      const domRange = getDOMRange();
      if (!domRangesAreEqual(domRange, this.domRange)) {
        this.domRange = domRange;
        return this.notifySelectionManagersOfSelectionChange();
      }
    }
    reset() {
      this.domRange = null;
      return this.update();
    }
    run() {
      if (this.started) {
        this.update();
        return requestAnimationFrame(this.run);
      }
    }
  };
  var domRangesAreEqual = (left, right) => (left === null || left === void 0 ? void 0 : left.startContainer) === (right === null || right === void 0 ? void 0 : right.startContainer) && (left === null || left === void 0 ? void 0 : left.startOffset) === (right === null || right === void 0 ? void 0 : right.startOffset) && (left === null || left === void 0 ? void 0 : left.endContainer) === (right === null || right === void 0 ? void 0 : right.endContainer) && (left === null || left === void 0 ? void 0 : left.endOffset) === (right === null || right === void 0 ? void 0 : right.endOffset);
  var selectionChangeObserver = new SelectionChangeObserver();
  var getDOMSelection = function() {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      return selection;
    }
  };
  var getDOMRange = function() {
    var _getDOMSelection;
    const domRange = (_getDOMSelection = getDOMSelection()) === null || _getDOMSelection === void 0 ? void 0 : _getDOMSelection.getRangeAt(0);
    if (domRange) {
      if (!domRangeIsPrivate(domRange)) {
        return domRange;
      }
    }
  };
  var setDOMRange = function(domRange) {
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(domRange);
    return selectionChangeObserver.update();
  };
  var domRangeIsPrivate = (domRange) => nodeIsPrivate(domRange.startContainer) || nodeIsPrivate(domRange.endContainer);
  var nodeIsPrivate = (node) => !Object.getPrototypeOf(node);
  var normalizeSpaces = (string) => string.replace(new RegExp("".concat(ZERO_WIDTH_SPACE), "g"), "").replace(new RegExp("".concat(NON_BREAKING_SPACE), "g"), " ");
  var normalizeNewlines = (string) => string.replace(/\r\n/g, "\n");
  var breakableWhitespacePattern = new RegExp("[^\\S".concat(NON_BREAKING_SPACE, "]"));
  var squishBreakableWhitespace = (string) => string.replace(new RegExp("".concat(breakableWhitespacePattern.source), "g"), " ").replace(/\ {2,}/g, " ");
  var summarizeStringChange = function(oldString, newString) {
    let added, removed;
    oldString = UTF16String.box(oldString);
    newString = UTF16String.box(newString);
    if (newString.length < oldString.length) {
      [removed, added] = utf16StringDifferences(oldString, newString);
    } else {
      [added, removed] = utf16StringDifferences(newString, oldString);
    }
    return {
      added,
      removed
    };
  };
  var utf16StringDifferences = function(a, b) {
    if (a.isEqualTo(b)) {
      return ["", ""];
    }
    const diffA = utf16StringDifference(a, b);
    const {
      length
    } = diffA.utf16String;
    let diffB;
    if (length) {
      const {
        offset
      } = diffA;
      const codepoints = a.codepoints.slice(0, offset).concat(a.codepoints.slice(offset + length));
      diffB = utf16StringDifference(b, UTF16String.fromCodepoints(codepoints));
    } else {
      diffB = utf16StringDifference(b, a);
    }
    return [diffA.utf16String.toString(), diffB.utf16String.toString()];
  };
  var utf16StringDifference = function(a, b) {
    let leftIndex = 0;
    let rightIndexA = a.length;
    let rightIndexB = b.length;
    while (leftIndex < rightIndexA && a.charAt(leftIndex).isEqualTo(b.charAt(leftIndex))) {
      leftIndex++;
    }
    while (rightIndexA > leftIndex + 1 && a.charAt(rightIndexA - 1).isEqualTo(b.charAt(rightIndexB - 1))) {
      rightIndexA--;
      rightIndexB--;
    }
    return {
      utf16String: a.slice(leftIndex, rightIndexA),
      offset: leftIndex
    };
  };
  var Hash = class extends TrixObject {
    static fromCommonAttributesOfObjects() {
      let objects = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : [];
      if (!objects.length) {
        return new this();
      }
      let hash = box(objects[0]);
      let keys = hash.getKeys();
      objects.slice(1).forEach((object2) => {
        keys = hash.getKeysCommonToHash(box(object2));
        hash = hash.slice(keys);
      });
      return hash;
    }
    static box(values) {
      return box(values);
    }
    constructor() {
      let values = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
      super(...arguments);
      this.values = copy(values);
    }
    add(key, value) {
      return this.merge(object(key, value));
    }
    remove(key) {
      return new Hash(copy(this.values, key));
    }
    get(key) {
      return this.values[key];
    }
    has(key) {
      return key in this.values;
    }
    merge(values) {
      return new Hash(merge(this.values, unbox(values)));
    }
    slice(keys) {
      const values = {};
      keys.forEach((key) => {
        if (this.has(key)) {
          values[key] = this.values[key];
        }
      });
      return new Hash(values);
    }
    getKeys() {
      return Object.keys(this.values);
    }
    getKeysCommonToHash(hash) {
      hash = box(hash);
      return this.getKeys().filter((key) => this.values[key] === hash.values[key]);
    }
    isEqualTo(values) {
      return arraysAreEqual(this.toArray(), box(values).toArray());
    }
    isEmpty() {
      return this.getKeys().length === 0;
    }
    toArray() {
      if (!this.array) {
        const result = [];
        for (const key in this.values) {
          const value = this.values[key];
          result.push(result.push(key, value));
        }
        this.array = result.slice(0);
      }
      return this.array;
    }
    toObject() {
      return copy(this.values);
    }
    toJSON() {
      return this.toObject();
    }
    contentsForInspection() {
      return {
        values: JSON.stringify(this.values)
      };
    }
  };
  var object = function(key, value) {
    const result = {};
    result[key] = value;
    return result;
  };
  var merge = function(object2, values) {
    const result = copy(object2);
    for (const key in values) {
      const value = values[key];
      result[key] = value;
    }
    return result;
  };
  var copy = function(object2, keyToRemove) {
    const result = {};
    const sortedKeys = Object.keys(object2).sort();
    sortedKeys.forEach((key) => {
      if (key !== keyToRemove) {
        result[key] = object2[key];
      }
    });
    return result;
  };
  var box = function(object2) {
    if (object2 instanceof Hash) {
      return object2;
    } else {
      return new Hash(object2);
    }
  };
  var unbox = function(object2) {
    if (object2 instanceof Hash) {
      return object2.values;
    } else {
      return object2;
    }
  };
  var Operation = class extends BasicObject {
    isPerforming() {
      return this.performing === true;
    }
    hasPerformed() {
      return this.performed === true;
    }
    hasSucceeded() {
      return this.performed && this.succeeded;
    }
    hasFailed() {
      return this.performed && !this.succeeded;
    }
    getPromise() {
      if (!this.promise) {
        this.promise = new Promise((resolve, reject) => {
          this.performing = true;
          return this.perform((succeeded, result) => {
            this.succeeded = succeeded;
            this.performing = false;
            this.performed = true;
            if (this.succeeded) {
              resolve(result);
            } else {
              reject(result);
            }
          });
        });
      }
      return this.promise;
    }
    perform(callback) {
      return callback(false);
    }
    release() {
      var _this$promise, _this$promise$cancel;
      (_this$promise = this.promise) === null || _this$promise === void 0 ? void 0 : (_this$promise$cancel = _this$promise.cancel) === null || _this$promise$cancel === void 0 ? void 0 : _this$promise$cancel.call(_this$promise);
      this.promise = null;
      this.performing = null;
      this.performed = null;
      this.succeeded = null;
    }
  };
  Operation.proxyMethod("getPromise().then");
  Operation.proxyMethod("getPromise().catch");
  var ImagePreloadOperation = class extends Operation {
    constructor(url2) {
      super(...arguments);
      this.url = url2;
    }
    perform(callback) {
      const image = new Image();
      image.onload = () => {
        image.width = this.width = image.naturalWidth;
        image.height = this.height = image.naturalHeight;
        return callback(true, image);
      };
      image.onerror = () => callback(false);
      image.src = this.url;
    }
  };
  var Attachment = class extends TrixObject {
    static attachmentForFile(file) {
      const attributes2 = this.attributesForFile(file);
      const attachment = new this(attributes2);
      attachment.setFile(file);
      return attachment;
    }
    static attributesForFile(file) {
      return new Hash({
        filename: file.name,
        filesize: file.size,
        contentType: file.type
      });
    }
    static fromJSON(attachmentJSON) {
      return new this(attachmentJSON);
    }
    constructor() {
      let attributes2 = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
      super(attributes2);
      this.releaseFile = this.releaseFile.bind(this);
      this.attributes = Hash.box(attributes2);
      this.didChangeAttributes();
    }
    getAttribute(attribute) {
      return this.attributes.get(attribute);
    }
    hasAttribute(attribute) {
      return this.attributes.has(attribute);
    }
    getAttributes() {
      return this.attributes.toObject();
    }
    setAttributes() {
      let attributes2 = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
      const newAttributes = this.attributes.merge(attributes2);
      if (!this.attributes.isEqualTo(newAttributes)) {
        var _this$previewDelegate, _this$previewDelegate2, _this$delegate, _this$delegate$attach;
        this.attributes = newAttributes;
        this.didChangeAttributes();
        (_this$previewDelegate = this.previewDelegate) === null || _this$previewDelegate === void 0 ? void 0 : (_this$previewDelegate2 = _this$previewDelegate.attachmentDidChangeAttributes) === null || _this$previewDelegate2 === void 0 ? void 0 : _this$previewDelegate2.call(_this$previewDelegate, this);
        return (_this$delegate = this.delegate) === null || _this$delegate === void 0 ? void 0 : (_this$delegate$attach = _this$delegate.attachmentDidChangeAttributes) === null || _this$delegate$attach === void 0 ? void 0 : _this$delegate$attach.call(_this$delegate, this);
      }
    }
    didChangeAttributes() {
      if (this.isPreviewable()) {
        return this.preloadURL();
      }
    }
    isPending() {
      return this.file != null && !(this.getURL() || this.getHref());
    }
    isPreviewable() {
      if (this.attributes.has("previewable")) {
        return this.attributes.get("previewable");
      } else {
        return Attachment.previewablePattern.test(this.getContentType());
      }
    }
    getType() {
      if (this.hasContent()) {
        return "content";
      } else if (this.isPreviewable()) {
        return "preview";
      } else {
        return "file";
      }
    }
    getURL() {
      return this.attributes.get("url");
    }
    getHref() {
      return this.attributes.get("href");
    }
    getFilename() {
      return this.attributes.get("filename") || "";
    }
    getFilesize() {
      return this.attributes.get("filesize");
    }
    getFormattedFilesize() {
      const filesize = this.attributes.get("filesize");
      if (typeof filesize === "number") {
        return config.fileSize.formatter(filesize);
      } else {
        return "";
      }
    }
    getExtension() {
      var _this$getFilename$mat;
      return (_this$getFilename$mat = this.getFilename().match(/\.(\w+)$/)) === null || _this$getFilename$mat === void 0 ? void 0 : _this$getFilename$mat[1].toLowerCase();
    }
    getContentType() {
      return this.attributes.get("contentType");
    }
    hasContent() {
      return this.attributes.has("content");
    }
    getContent() {
      return this.attributes.get("content");
    }
    getWidth() {
      return this.attributes.get("width");
    }
    getHeight() {
      return this.attributes.get("height");
    }
    getFile() {
      return this.file;
    }
    setFile(file) {
      this.file = file;
      if (this.isPreviewable()) {
        return this.preloadFile();
      }
    }
    releaseFile() {
      this.releasePreloadedFile();
      this.file = null;
    }
    getUploadProgress() {
      return this.uploadProgress != null ? this.uploadProgress : 0;
    }
    setUploadProgress(value) {
      if (this.uploadProgress !== value) {
        var _this$uploadProgressD, _this$uploadProgressD2;
        this.uploadProgress = value;
        return (_this$uploadProgressD = this.uploadProgressDelegate) === null || _this$uploadProgressD === void 0 ? void 0 : (_this$uploadProgressD2 = _this$uploadProgressD.attachmentDidChangeUploadProgress) === null || _this$uploadProgressD2 === void 0 ? void 0 : _this$uploadProgressD2.call(_this$uploadProgressD, this);
      }
    }
    toJSON() {
      return this.getAttributes();
    }
    getCacheKey() {
      return [super.getCacheKey(...arguments), this.attributes.getCacheKey(), this.getPreviewURL()].join("/");
    }
    getPreviewURL() {
      return this.previewURL || this.preloadingURL;
    }
    setPreviewURL(url2) {
      if (url2 !== this.getPreviewURL()) {
        var _this$previewDelegate3, _this$previewDelegate4, _this$delegate2, _this$delegate2$attac;
        this.previewURL = url2;
        (_this$previewDelegate3 = this.previewDelegate) === null || _this$previewDelegate3 === void 0 ? void 0 : (_this$previewDelegate4 = _this$previewDelegate3.attachmentDidChangeAttributes) === null || _this$previewDelegate4 === void 0 ? void 0 : _this$previewDelegate4.call(_this$previewDelegate3, this);
        return (_this$delegate2 = this.delegate) === null || _this$delegate2 === void 0 ? void 0 : (_this$delegate2$attac = _this$delegate2.attachmentDidChangePreviewURL) === null || _this$delegate2$attac === void 0 ? void 0 : _this$delegate2$attac.call(_this$delegate2, this);
      }
    }
    preloadURL() {
      return this.preload(this.getURL(), this.releaseFile);
    }
    preloadFile() {
      if (this.file) {
        this.fileObjectURL = URL.createObjectURL(this.file);
        return this.preload(this.fileObjectURL);
      }
    }
    releasePreloadedFile() {
      if (this.fileObjectURL) {
        URL.revokeObjectURL(this.fileObjectURL);
        this.fileObjectURL = null;
      }
    }
    preload(url2, callback) {
      if (url2 && url2 !== this.getPreviewURL()) {
        this.preloadingURL = url2;
        const operation = new ImagePreloadOperation(url2);
        return operation.then((_ref) => {
          let {
            width,
            height
          } = _ref;
          if (!this.getWidth() || !this.getHeight()) {
            this.setAttributes({
              width,
              height
            });
          }
          this.preloadingURL = null;
          this.setPreviewURL(url2);
          return callback === null || callback === void 0 ? void 0 : callback();
        }).catch(() => {
          this.preloadingURL = null;
          return callback === null || callback === void 0 ? void 0 : callback();
        });
      }
    }
  };
  _defineProperty(Attachment, "previewablePattern", /^image(\/(gif|png|jpe?g)|$)/);
  var ManagedAttachment = class extends BasicObject {
    constructor(attachmentManager, attachment) {
      super(...arguments);
      this.attachmentManager = attachmentManager;
      this.attachment = attachment;
      this.id = this.attachment.id;
      this.file = this.attachment.file;
    }
    remove() {
      return this.attachmentManager.requestRemovalOfAttachment(this.attachment);
    }
  };
  ManagedAttachment.proxyMethod("attachment.getAttribute");
  ManagedAttachment.proxyMethod("attachment.hasAttribute");
  ManagedAttachment.proxyMethod("attachment.setAttribute");
  ManagedAttachment.proxyMethod("attachment.getAttributes");
  ManagedAttachment.proxyMethod("attachment.setAttributes");
  ManagedAttachment.proxyMethod("attachment.isPending");
  ManagedAttachment.proxyMethod("attachment.isPreviewable");
  ManagedAttachment.proxyMethod("attachment.getURL");
  ManagedAttachment.proxyMethod("attachment.getHref");
  ManagedAttachment.proxyMethod("attachment.getFilename");
  ManagedAttachment.proxyMethod("attachment.getFilesize");
  ManagedAttachment.proxyMethod("attachment.getFormattedFilesize");
  ManagedAttachment.proxyMethod("attachment.getExtension");
  ManagedAttachment.proxyMethod("attachment.getContentType");
  ManagedAttachment.proxyMethod("attachment.getFile");
  ManagedAttachment.proxyMethod("attachment.setFile");
  ManagedAttachment.proxyMethod("attachment.releaseFile");
  ManagedAttachment.proxyMethod("attachment.getUploadProgress");
  ManagedAttachment.proxyMethod("attachment.setUploadProgress");
  var AttachmentManager = class extends BasicObject {
    constructor() {
      let attachments2 = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : [];
      super(...arguments);
      this.managedAttachments = {};
      Array.from(attachments2).forEach((attachment) => {
        this.manageAttachment(attachment);
      });
    }
    getAttachments() {
      const result = [];
      for (const id2 in this.managedAttachments) {
        const attachment = this.managedAttachments[id2];
        result.push(attachment);
      }
      return result;
    }
    manageAttachment(attachment) {
      if (!this.managedAttachments[attachment.id]) {
        this.managedAttachments[attachment.id] = new ManagedAttachment(this, attachment);
      }
      return this.managedAttachments[attachment.id];
    }
    attachmentIsManaged(attachment) {
      return attachment.id in this.managedAttachments;
    }
    requestRemovalOfAttachment(attachment) {
      if (this.attachmentIsManaged(attachment)) {
        var _this$delegate, _this$delegate$attach;
        return (_this$delegate = this.delegate) === null || _this$delegate === void 0 ? void 0 : (_this$delegate$attach = _this$delegate.attachmentManagerDidRequestRemovalOfAttachment) === null || _this$delegate$attach === void 0 ? void 0 : _this$delegate$attach.call(_this$delegate, attachment);
      }
    }
    unmanageAttachment(attachment) {
      const managedAttachment = this.managedAttachments[attachment.id];
      delete this.managedAttachments[attachment.id];
      return managedAttachment;
    }
  };
  var Piece = class extends TrixObject {
    static registerType(type, constructor) {
      constructor.type = type;
      this.types[type] = constructor;
    }
    static fromJSON(pieceJSON) {
      const constructor = this.types[pieceJSON.type];
      if (constructor) {
        return constructor.fromJSON(pieceJSON);
      }
    }
    constructor(value) {
      let attributes2 = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
      super(...arguments);
      this.attributes = Hash.box(attributes2);
    }
    copyWithAttributes(attributes2) {
      return new this.constructor(this.getValue(), attributes2);
    }
    copyWithAdditionalAttributes(attributes2) {
      return this.copyWithAttributes(this.attributes.merge(attributes2));
    }
    copyWithoutAttribute(attribute) {
      return this.copyWithAttributes(this.attributes.remove(attribute));
    }
    copy() {
      return this.copyWithAttributes(this.attributes);
    }
    getAttribute(attribute) {
      return this.attributes.get(attribute);
    }
    getAttributesHash() {
      return this.attributes;
    }
    getAttributes() {
      return this.attributes.toObject();
    }
    hasAttribute(attribute) {
      return this.attributes.has(attribute);
    }
    hasSameStringValueAsPiece(piece) {
      return piece && this.toString() === piece.toString();
    }
    hasSameAttributesAsPiece(piece) {
      return piece && (this.attributes === piece.attributes || this.attributes.isEqualTo(piece.attributes));
    }
    isBlockBreak() {
      return false;
    }
    isEqualTo(piece) {
      return super.isEqualTo(...arguments) || this.hasSameConstructorAs(piece) && this.hasSameStringValueAsPiece(piece) && this.hasSameAttributesAsPiece(piece);
    }
    isEmpty() {
      return this.length === 0;
    }
    isSerializable() {
      return true;
    }
    toJSON() {
      return {
        type: this.constructor.type,
        attributes: this.getAttributes()
      };
    }
    contentsForInspection() {
      return {
        type: this.constructor.type,
        attributes: this.attributes.inspect()
      };
    }
    canBeGrouped() {
      return this.hasAttribute("href");
    }
    canBeGroupedWith(piece) {
      return this.getAttribute("href") === piece.getAttribute("href");
    }
    getLength() {
      return this.length;
    }
    canBeConsolidatedWith(piece) {
      return false;
    }
  };
  _defineProperty(Piece, "types", {});
  var AttachmentPiece = class extends Piece {
    static fromJSON(pieceJSON) {
      return new this(Attachment.fromJSON(pieceJSON.attachment), pieceJSON.attributes);
    }
    constructor(attachment) {
      super(...arguments);
      this.attachment = attachment;
      this.length = 1;
      this.ensureAttachmentExclusivelyHasAttribute("href");
      if (!this.attachment.hasContent()) {
        this.removeProhibitedAttributes();
      }
    }
    ensureAttachmentExclusivelyHasAttribute(attribute) {
      if (this.hasAttribute(attribute)) {
        if (!this.attachment.hasAttribute(attribute)) {
          this.attachment.setAttributes(this.attributes.slice(attribute));
        }
        this.attributes = this.attributes.remove(attribute);
      }
    }
    removeProhibitedAttributes() {
      const attributes2 = this.attributes.slice(AttachmentPiece.permittedAttributes);
      if (!attributes2.isEqualTo(this.attributes)) {
        this.attributes = attributes2;
      }
    }
    getValue() {
      return this.attachment;
    }
    isSerializable() {
      return !this.attachment.isPending();
    }
    getCaption() {
      return this.attributes.get("caption") || "";
    }
    isEqualTo(piece) {
      var _piece$attachment;
      return super.isEqualTo(piece) && this.attachment.id === (piece === null || piece === void 0 ? void 0 : (_piece$attachment = piece.attachment) === null || _piece$attachment === void 0 ? void 0 : _piece$attachment.id);
    }
    toString() {
      return OBJECT_REPLACEMENT_CHARACTER;
    }
    toJSON() {
      const json = super.toJSON(...arguments);
      json.attachment = this.attachment;
      return json;
    }
    getCacheKey() {
      return [super.getCacheKey(...arguments), this.attachment.getCacheKey()].join("/");
    }
    toConsole() {
      return JSON.stringify(this.toString());
    }
  };
  _defineProperty(AttachmentPiece, "permittedAttributes", ["caption", "presentation"]);
  Piece.registerType("attachment", AttachmentPiece);
  var StringPiece = class extends Piece {
    static fromJSON(pieceJSON) {
      return new this(pieceJSON.string, pieceJSON.attributes);
    }
    constructor(string) {
      super(...arguments);
      this.string = normalizeNewlines(string);
      this.length = this.string.length;
    }
    getValue() {
      return this.string;
    }
    toString() {
      return this.string.toString();
    }
    isBlockBreak() {
      return this.toString() === "\n" && this.getAttribute("blockBreak") === true;
    }
    toJSON() {
      const result = super.toJSON(...arguments);
      result.string = this.string;
      return result;
    }
    canBeConsolidatedWith(piece) {
      return piece && this.hasSameConstructorAs(piece) && this.hasSameAttributesAsPiece(piece);
    }
    consolidateWith(piece) {
      return new this.constructor(this.toString() + piece.toString(), this.attributes);
    }
    splitAtOffset(offset) {
      let left, right;
      if (offset === 0) {
        left = null;
        right = this;
      } else if (offset === this.length) {
        left = this;
        right = null;
      } else {
        left = new this.constructor(this.string.slice(0, offset), this.attributes);
        right = new this.constructor(this.string.slice(offset), this.attributes);
      }
      return [left, right];
    }
    toConsole() {
      let {
        string
      } = this;
      if (string.length > 15) {
        string = string.slice(0, 14) + "\u2026";
      }
      return JSON.stringify(string.toString());
    }
  };
  Piece.registerType("string", StringPiece);
  var SplittableList = class extends TrixObject {
    static box(objects) {
      if (objects instanceof this) {
        return objects;
      } else {
        return new this(objects);
      }
    }
    constructor() {
      let objects = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : [];
      super(...arguments);
      this.objects = objects.slice(0);
      this.length = this.objects.length;
    }
    indexOf(object2) {
      return this.objects.indexOf(object2);
    }
    splice() {
      for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }
      return new this.constructor(spliceArray(this.objects, ...args));
    }
    eachObject(callback) {
      return this.objects.map((object2, index) => callback(object2, index));
    }
    insertObjectAtIndex(object2, index) {
      return this.splice(index, 0, object2);
    }
    insertSplittableListAtIndex(splittableList, index) {
      return this.splice(index, 0, ...splittableList.objects);
    }
    insertSplittableListAtPosition(splittableList, position) {
      const [objects, index] = this.splitObjectAtPosition(position);
      return new this.constructor(objects).insertSplittableListAtIndex(splittableList, index);
    }
    editObjectAtIndex(index, callback) {
      return this.replaceObjectAtIndex(callback(this.objects[index]), index);
    }
    replaceObjectAtIndex(object2, index) {
      return this.splice(index, 1, object2);
    }
    removeObjectAtIndex(index) {
      return this.splice(index, 1);
    }
    getObjectAtIndex(index) {
      return this.objects[index];
    }
    getSplittableListInRange(range2) {
      const [objects, leftIndex, rightIndex] = this.splitObjectsAtRange(range2);
      return new this.constructor(objects.slice(leftIndex, rightIndex + 1));
    }
    selectSplittableList(test) {
      const objects = this.objects.filter((object2) => test(object2));
      return new this.constructor(objects);
    }
    removeObjectsInRange(range2) {
      const [objects, leftIndex, rightIndex] = this.splitObjectsAtRange(range2);
      return new this.constructor(objects).splice(leftIndex, rightIndex - leftIndex + 1);
    }
    transformObjectsInRange(range2, transform) {
      const [objects, leftIndex, rightIndex] = this.splitObjectsAtRange(range2);
      const transformedObjects = objects.map((object2, index) => leftIndex <= index && index <= rightIndex ? transform(object2) : object2);
      return new this.constructor(transformedObjects);
    }
    splitObjectsAtRange(range2) {
      let rightOuterIndex;
      let [objects, leftInnerIndex, offset] = this.splitObjectAtPosition(startOfRange(range2));
      [objects, rightOuterIndex] = new this.constructor(objects).splitObjectAtPosition(endOfRange(range2) + offset);
      return [objects, leftInnerIndex, rightOuterIndex - 1];
    }
    getObjectAtPosition(position) {
      const {
        index
      } = this.findIndexAndOffsetAtPosition(position);
      return this.objects[index];
    }
    splitObjectAtPosition(position) {
      let splitIndex, splitOffset;
      const {
        index,
        offset
      } = this.findIndexAndOffsetAtPosition(position);
      const objects = this.objects.slice(0);
      if (index != null) {
        if (offset === 0) {
          splitIndex = index;
          splitOffset = 0;
        } else {
          const object2 = this.getObjectAtIndex(index);
          const [leftObject, rightObject] = object2.splitAtOffset(offset);
          objects.splice(index, 1, leftObject, rightObject);
          splitIndex = index + 1;
          splitOffset = leftObject.getLength() - offset;
        }
      } else {
        splitIndex = objects.length;
        splitOffset = 0;
      }
      return [objects, splitIndex, splitOffset];
    }
    consolidate() {
      const objects = [];
      let pendingObject = this.objects[0];
      this.objects.slice(1).forEach((object2) => {
        var _pendingObject$canBeC, _pendingObject;
        if ((_pendingObject$canBeC = (_pendingObject = pendingObject).canBeConsolidatedWith) !== null && _pendingObject$canBeC !== void 0 && _pendingObject$canBeC.call(_pendingObject, object2)) {
          pendingObject = pendingObject.consolidateWith(object2);
        } else {
          objects.push(pendingObject);
          pendingObject = object2;
        }
      });
      if (pendingObject) {
        objects.push(pendingObject);
      }
      return new this.constructor(objects);
    }
    consolidateFromIndexToIndex(startIndex, endIndex) {
      const objects = this.objects.slice(0);
      const objectsInRange = objects.slice(startIndex, endIndex + 1);
      const consolidatedInRange = new this.constructor(objectsInRange).consolidate().toArray();
      return this.splice(startIndex, objectsInRange.length, ...consolidatedInRange);
    }
    findIndexAndOffsetAtPosition(position) {
      let index;
      let currentPosition = 0;
      for (index = 0; index < this.objects.length; index++) {
        const object2 = this.objects[index];
        const nextPosition = currentPosition + object2.getLength();
        if (currentPosition <= position && position < nextPosition) {
          return {
            index,
            offset: position - currentPosition
          };
        }
        currentPosition = nextPosition;
      }
      return {
        index: null,
        offset: null
      };
    }
    findPositionAtIndexAndOffset(index, offset) {
      let position = 0;
      for (let currentIndex = 0; currentIndex < this.objects.length; currentIndex++) {
        const object2 = this.objects[currentIndex];
        if (currentIndex < index) {
          position += object2.getLength();
        } else if (currentIndex === index) {
          position += offset;
          break;
        }
      }
      return position;
    }
    getEndPosition() {
      if (this.endPosition == null) {
        this.endPosition = 0;
        this.objects.forEach((object2) => this.endPosition += object2.getLength());
      }
      return this.endPosition;
    }
    toString() {
      return this.objects.join("");
    }
    toArray() {
      return this.objects.slice(0);
    }
    toJSON() {
      return this.toArray();
    }
    isEqualTo(splittableList) {
      return super.isEqualTo(...arguments) || objectArraysAreEqual(this.objects, splittableList === null || splittableList === void 0 ? void 0 : splittableList.objects);
    }
    contentsForInspection() {
      return {
        objects: "[".concat(this.objects.map((object2) => object2.inspect()).join(", "), "]")
      };
    }
  };
  var objectArraysAreEqual = function(left) {
    let right = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : [];
    if (left.length !== right.length) {
      return false;
    }
    let result = true;
    for (let index = 0; index < left.length; index++) {
      const object2 = left[index];
      if (result && !object2.isEqualTo(right[index])) {
        result = false;
      }
    }
    return result;
  };
  var startOfRange = (range2) => range2[0];
  var endOfRange = (range2) => range2[1];
  var Text = class extends TrixObject {
    static textForAttachmentWithAttributes(attachment, attributes2) {
      const piece = new AttachmentPiece(attachment, attributes2);
      return new this([piece]);
    }
    static textForStringWithAttributes(string, attributes2) {
      const piece = new StringPiece(string, attributes2);
      return new this([piece]);
    }
    static fromJSON(textJSON) {
      const pieces = Array.from(textJSON).map((pieceJSON) => Piece.fromJSON(pieceJSON));
      return new this(pieces);
    }
    constructor() {
      let pieces = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : [];
      super(...arguments);
      const notEmpty = pieces.filter((piece) => !piece.isEmpty());
      this.pieceList = new SplittableList(notEmpty);
    }
    copy() {
      return this.copyWithPieceList(this.pieceList);
    }
    copyWithPieceList(pieceList) {
      return new this.constructor(pieceList.consolidate().toArray());
    }
    copyUsingObjectMap(objectMap) {
      const pieces = this.getPieces().map((piece) => objectMap.find(piece) || piece);
      return new this.constructor(pieces);
    }
    appendText(text) {
      return this.insertTextAtPosition(text, this.getLength());
    }
    insertTextAtPosition(text, position) {
      return this.copyWithPieceList(this.pieceList.insertSplittableListAtPosition(text.pieceList, position));
    }
    removeTextAtRange(range2) {
      return this.copyWithPieceList(this.pieceList.removeObjectsInRange(range2));
    }
    replaceTextAtRange(text, range2) {
      return this.removeTextAtRange(range2).insertTextAtPosition(text, range2[0]);
    }
    moveTextFromRangeToPosition(range2, position) {
      if (range2[0] <= position && position <= range2[1])
        return;
      const text = this.getTextAtRange(range2);
      const length = text.getLength();
      if (range2[0] < position) {
        position -= length;
      }
      return this.removeTextAtRange(range2).insertTextAtPosition(text, position);
    }
    addAttributeAtRange(attribute, value, range2) {
      const attributes2 = {};
      attributes2[attribute] = value;
      return this.addAttributesAtRange(attributes2, range2);
    }
    addAttributesAtRange(attributes2, range2) {
      return this.copyWithPieceList(this.pieceList.transformObjectsInRange(range2, (piece) => piece.copyWithAdditionalAttributes(attributes2)));
    }
    removeAttributeAtRange(attribute, range2) {
      return this.copyWithPieceList(this.pieceList.transformObjectsInRange(range2, (piece) => piece.copyWithoutAttribute(attribute)));
    }
    setAttributesAtRange(attributes2, range2) {
      return this.copyWithPieceList(this.pieceList.transformObjectsInRange(range2, (piece) => piece.copyWithAttributes(attributes2)));
    }
    getAttributesAtPosition(position) {
      var _this$pieceList$getOb;
      return ((_this$pieceList$getOb = this.pieceList.getObjectAtPosition(position)) === null || _this$pieceList$getOb === void 0 ? void 0 : _this$pieceList$getOb.getAttributes()) || {};
    }
    getCommonAttributes() {
      const objects = Array.from(this.pieceList.toArray()).map((piece) => piece.getAttributes());
      return Hash.fromCommonAttributesOfObjects(objects).toObject();
    }
    getCommonAttributesAtRange(range2) {
      return this.getTextAtRange(range2).getCommonAttributes() || {};
    }
    getExpandedRangeForAttributeAtOffset(attributeName, offset) {
      let right;
      let left = right = offset;
      const length = this.getLength();
      while (left > 0 && this.getCommonAttributesAtRange([left - 1, right])[attributeName]) {
        left--;
      }
      while (right < length && this.getCommonAttributesAtRange([offset, right + 1])[attributeName]) {
        right++;
      }
      return [left, right];
    }
    getTextAtRange(range2) {
      return this.copyWithPieceList(this.pieceList.getSplittableListInRange(range2));
    }
    getStringAtRange(range2) {
      return this.pieceList.getSplittableListInRange(range2).toString();
    }
    getStringAtPosition(position) {
      return this.getStringAtRange([position, position + 1]);
    }
    startsWithString(string) {
      return this.getStringAtRange([0, string.length]) === string;
    }
    endsWithString(string) {
      const length = this.getLength();
      return this.getStringAtRange([length - string.length, length]) === string;
    }
    getAttachmentPieces() {
      return this.pieceList.toArray().filter((piece) => !!piece.attachment);
    }
    getAttachments() {
      return this.getAttachmentPieces().map((piece) => piece.attachment);
    }
    getAttachmentAndPositionById(attachmentId) {
      let position = 0;
      for (const piece of this.pieceList.toArray()) {
        var _piece$attachment;
        if (((_piece$attachment = piece.attachment) === null || _piece$attachment === void 0 ? void 0 : _piece$attachment.id) === attachmentId) {
          return {
            attachment: piece.attachment,
            position
          };
        }
        position += piece.length;
      }
      return {
        attachment: null,
        position: null
      };
    }
    getAttachmentById(attachmentId) {
      const {
        attachment
      } = this.getAttachmentAndPositionById(attachmentId);
      return attachment;
    }
    getRangeOfAttachment(attachment) {
      const attachmentAndPosition = this.getAttachmentAndPositionById(attachment.id);
      const position = attachmentAndPosition.position;
      attachment = attachmentAndPosition.attachment;
      if (attachment) {
        return [position, position + 1];
      }
    }
    updateAttributesForAttachment(attributes2, attachment) {
      const range2 = this.getRangeOfAttachment(attachment);
      if (range2) {
        return this.addAttributesAtRange(attributes2, range2);
      } else {
        return this;
      }
    }
    getLength() {
      return this.pieceList.getEndPosition();
    }
    isEmpty() {
      return this.getLength() === 0;
    }
    isEqualTo(text) {
      var _text$pieceList;
      return super.isEqualTo(text) || (text === null || text === void 0 ? void 0 : (_text$pieceList = text.pieceList) === null || _text$pieceList === void 0 ? void 0 : _text$pieceList.isEqualTo(this.pieceList));
    }
    isBlockBreak() {
      return this.getLength() === 1 && this.pieceList.getObjectAtIndex(0).isBlockBreak();
    }
    eachPiece(callback) {
      return this.pieceList.eachObject(callback);
    }
    getPieces() {
      return this.pieceList.toArray();
    }
    getPieceAtPosition(position) {
      return this.pieceList.getObjectAtPosition(position);
    }
    contentsForInspection() {
      return {
        pieceList: this.pieceList.inspect()
      };
    }
    toSerializableText() {
      const pieceList = this.pieceList.selectSplittableList((piece) => piece.isSerializable());
      return this.copyWithPieceList(pieceList);
    }
    toString() {
      return this.pieceList.toString();
    }
    toJSON() {
      return this.pieceList.toJSON();
    }
    toConsole() {
      return JSON.stringify(this.pieceList.toArray().map((piece) => JSON.parse(piece.toConsole())));
    }
    getDirection() {
      return getDirection(this.toString());
    }
    isRTL() {
      return this.getDirection() === "rtl";
    }
  };
  var Block = class extends TrixObject {
    static fromJSON(blockJSON) {
      const text = Text.fromJSON(blockJSON.text);
      return new this(text, blockJSON.attributes);
    }
    constructor(text, attributes2) {
      super(...arguments);
      this.text = applyBlockBreakToText(text || new Text());
      this.attributes = attributes2 || [];
    }
    isEmpty() {
      return this.text.isBlockBreak();
    }
    isEqualTo(block) {
      if (super.isEqualTo(block))
        return true;
      return this.text.isEqualTo(block === null || block === void 0 ? void 0 : block.text) && arraysAreEqual(this.attributes, block === null || block === void 0 ? void 0 : block.attributes);
    }
    copyWithText(text) {
      return new Block(text, this.attributes);
    }
    copyWithoutText() {
      return this.copyWithText(null);
    }
    copyWithAttributes(attributes2) {
      return new Block(this.text, attributes2);
    }
    copyWithoutAttributes() {
      return this.copyWithAttributes(null);
    }
    copyUsingObjectMap(objectMap) {
      const mappedText = objectMap.find(this.text);
      if (mappedText) {
        return this.copyWithText(mappedText);
      } else {
        return this.copyWithText(this.text.copyUsingObjectMap(objectMap));
      }
    }
    addAttribute(attribute) {
      const attributes2 = this.attributes.concat(expandAttribute(attribute));
      return this.copyWithAttributes(attributes2);
    }
    removeAttribute(attribute) {
      const {
        listAttribute
      } = getBlockConfig(attribute);
      const attributes2 = removeLastValue(removeLastValue(this.attributes, attribute), listAttribute);
      return this.copyWithAttributes(attributes2);
    }
    removeLastAttribute() {
      return this.removeAttribute(this.getLastAttribute());
    }
    getLastAttribute() {
      return getLastElement(this.attributes);
    }
    getAttributes() {
      return this.attributes.slice(0);
    }
    getAttributeLevel() {
      return this.attributes.length;
    }
    getAttributeAtLevel(level) {
      return this.attributes[level - 1];
    }
    hasAttribute(attributeName) {
      return this.attributes.includes(attributeName);
    }
    hasAttributes() {
      return this.getAttributeLevel() > 0;
    }
    getLastNestableAttribute() {
      return getLastElement(this.getNestableAttributes());
    }
    getNestableAttributes() {
      return this.attributes.filter((attribute) => getBlockConfig(attribute).nestable);
    }
    getNestingLevel() {
      return this.getNestableAttributes().length;
    }
    decreaseNestingLevel() {
      const attribute = this.getLastNestableAttribute();
      if (attribute) {
        return this.removeAttribute(attribute);
      } else {
        return this;
      }
    }
    increaseNestingLevel() {
      const attribute = this.getLastNestableAttribute();
      if (attribute) {
        const index = this.attributes.lastIndexOf(attribute);
        const attributes2 = spliceArray(this.attributes, index + 1, 0, ...expandAttribute(attribute));
        return this.copyWithAttributes(attributes2);
      } else {
        return this;
      }
    }
    getListItemAttributes() {
      return this.attributes.filter((attribute) => getBlockConfig(attribute).listAttribute);
    }
    isListItem() {
      var _getBlockConfig;
      return (_getBlockConfig = getBlockConfig(this.getLastAttribute())) === null || _getBlockConfig === void 0 ? void 0 : _getBlockConfig.listAttribute;
    }
    isTerminalBlock() {
      var _getBlockConfig2;
      return (_getBlockConfig2 = getBlockConfig(this.getLastAttribute())) === null || _getBlockConfig2 === void 0 ? void 0 : _getBlockConfig2.terminal;
    }
    breaksOnReturn() {
      var _getBlockConfig3;
      return (_getBlockConfig3 = getBlockConfig(this.getLastAttribute())) === null || _getBlockConfig3 === void 0 ? void 0 : _getBlockConfig3.breakOnReturn;
    }
    findLineBreakInDirectionFromPosition(direction, position) {
      const string = this.toString();
      let result;
      switch (direction) {
        case "forward":
          result = string.indexOf("\n", position);
          break;
        case "backward":
          result = string.slice(0, position).lastIndexOf("\n");
      }
      if (result !== -1) {
        return result;
      }
    }
    contentsForInspection() {
      return {
        text: this.text.inspect(),
        attributes: this.attributes
      };
    }
    toString() {
      return this.text.toString();
    }
    toJSON() {
      return {
        text: this.text,
        attributes: this.attributes
      };
    }
    getDirection() {
      return this.text.getDirection();
    }
    isRTL() {
      return this.text.isRTL();
    }
    getLength() {
      return this.text.getLength();
    }
    canBeConsolidatedWith(block) {
      return !this.hasAttributes() && !block.hasAttributes() && this.getDirection() === block.getDirection();
    }
    consolidateWith(block) {
      const newlineText = Text.textForStringWithAttributes("\n");
      const text = this.getTextWithoutBlockBreak().appendText(newlineText);
      return this.copyWithText(text.appendText(block.text));
    }
    splitAtOffset(offset) {
      let left, right;
      if (offset === 0) {
        left = null;
        right = this;
      } else if (offset === this.getLength()) {
        left = this;
        right = null;
      } else {
        left = this.copyWithText(this.text.getTextAtRange([0, offset]));
        right = this.copyWithText(this.text.getTextAtRange([offset, this.getLength()]));
      }
      return [left, right];
    }
    getBlockBreakPosition() {
      return this.text.getLength() - 1;
    }
    getTextWithoutBlockBreak() {
      if (textEndsInBlockBreak(this.text)) {
        return this.text.getTextAtRange([0, this.getBlockBreakPosition()]);
      } else {
        return this.text.copy();
      }
    }
    canBeGrouped(depth) {
      return this.attributes[depth];
    }
    canBeGroupedWith(otherBlock, depth) {
      const otherAttributes = otherBlock.getAttributes();
      const otherAttribute = otherAttributes[depth];
      const attribute = this.attributes[depth];
      return attribute === otherAttribute && !(getBlockConfig(attribute).group === false && !getListAttributeNames().includes(otherAttributes[depth + 1])) && (this.getDirection() === otherBlock.getDirection() || otherBlock.isEmpty());
    }
  };
  var applyBlockBreakToText = function(text) {
    text = unmarkExistingInnerBlockBreaksInText(text);
    text = addBlockBreakToText(text);
    return text;
  };
  var unmarkExistingInnerBlockBreaksInText = function(text) {
    let modified = false;
    const pieces = text.getPieces();
    let innerPieces = pieces.slice(0, pieces.length - 1);
    const lastPiece = pieces[pieces.length - 1];
    if (!lastPiece)
      return text;
    innerPieces = innerPieces.map((piece) => {
      if (piece.isBlockBreak()) {
        modified = true;
        return unmarkBlockBreakPiece(piece);
      } else {
        return piece;
      }
    });
    if (modified) {
      return new Text([...innerPieces, lastPiece]);
    } else {
      return text;
    }
  };
  var blockBreakText = Text.textForStringWithAttributes("\n", {
    blockBreak: true
  });
  var addBlockBreakToText = function(text) {
    if (textEndsInBlockBreak(text)) {
      return text;
    } else {
      return text.appendText(blockBreakText);
    }
  };
  var textEndsInBlockBreak = function(text) {
    const length = text.getLength();
    if (length === 0) {
      return false;
    }
    const endText = text.getTextAtRange([length - 1, length]);
    return endText.isBlockBreak();
  };
  var unmarkBlockBreakPiece = (piece) => piece.copyWithoutAttribute("blockBreak");
  var expandAttribute = function(attribute) {
    const {
      listAttribute
    } = getBlockConfig(attribute);
    if (listAttribute) {
      return [listAttribute, attribute];
    } else {
      return [attribute];
    }
  };
  var getLastElement = (array) => array.slice(-1)[0];
  var removeLastValue = function(array, value) {
    const index = array.lastIndexOf(value);
    if (index === -1) {
      return array;
    } else {
      return spliceArray(array, index, 1);
    }
  };
  var ObjectMap = class extends BasicObject {
    constructor() {
      let objects = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : [];
      super(...arguments);
      this.objects = {};
      Array.from(objects).forEach((object2) => {
        const hash = JSON.stringify(object2);
        if (this.objects[hash] == null) {
          this.objects[hash] = object2;
        }
      });
    }
    find(object2) {
      const hash = JSON.stringify(object2);
      return this.objects[hash];
    }
  };
  var Document = class extends TrixObject {
    static fromJSON(documentJSON) {
      const blocks = Array.from(documentJSON).map((blockJSON) => Block.fromJSON(blockJSON));
      return new this(blocks);
    }
    static fromString(string, textAttributes2) {
      const text = Text.textForStringWithAttributes(string, textAttributes2);
      return new this([new Block(text)]);
    }
    constructor() {
      let blocks = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : [];
      super(...arguments);
      if (blocks.length === 0) {
        blocks = [new Block()];
      }
      this.blockList = SplittableList.box(blocks);
    }
    isEmpty() {
      const block = this.getBlockAtIndex(0);
      return this.blockList.length === 1 && block.isEmpty() && !block.hasAttributes();
    }
    copy() {
      let options2 = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
      const blocks = options2.consolidateBlocks ? this.blockList.consolidate().toArray() : this.blockList.toArray();
      return new this.constructor(blocks);
    }
    copyUsingObjectsFromDocument(sourceDocument) {
      const objectMap = new ObjectMap(sourceDocument.getObjects());
      return this.copyUsingObjectMap(objectMap);
    }
    copyUsingObjectMap(objectMap) {
      const blocks = this.getBlocks().map((block) => {
        const mappedBlock = objectMap.find(block);
        return mappedBlock || block.copyUsingObjectMap(objectMap);
      });
      return new this.constructor(blocks);
    }
    copyWithBaseBlockAttributes() {
      let blockAttributes = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : [];
      const blocks = this.getBlocks().map((block) => {
        const attributes2 = blockAttributes.concat(block.getAttributes());
        return block.copyWithAttributes(attributes2);
      });
      return new this.constructor(blocks);
    }
    replaceBlock(oldBlock, newBlock) {
      const index = this.blockList.indexOf(oldBlock);
      if (index === -1) {
        return this;
      }
      return new this.constructor(this.blockList.replaceObjectAtIndex(newBlock, index));
    }
    insertDocumentAtRange(document2, range2) {
      const {
        blockList
      } = document2;
      range2 = normalizeRange(range2);
      let [position] = range2;
      const {
        index,
        offset
      } = this.locationFromPosition(position);
      let result = this;
      const block = this.getBlockAtPosition(position);
      if (rangeIsCollapsed(range2) && block.isEmpty() && !block.hasAttributes()) {
        result = new this.constructor(result.blockList.removeObjectAtIndex(index));
      } else if (block.getBlockBreakPosition() === offset) {
        position++;
      }
      result = result.removeTextAtRange(range2);
      return new this.constructor(result.blockList.insertSplittableListAtPosition(blockList, position));
    }
    mergeDocumentAtRange(document2, range2) {
      let formattedDocument, result;
      range2 = normalizeRange(range2);
      const [startPosition] = range2;
      const startLocation = this.locationFromPosition(startPosition);
      const blockAttributes = this.getBlockAtIndex(startLocation.index).getAttributes();
      const baseBlockAttributes = document2.getBaseBlockAttributes();
      const trailingBlockAttributes = blockAttributes.slice(-baseBlockAttributes.length);
      if (arraysAreEqual(baseBlockAttributes, trailingBlockAttributes)) {
        const leadingBlockAttributes = blockAttributes.slice(0, -baseBlockAttributes.length);
        formattedDocument = document2.copyWithBaseBlockAttributes(leadingBlockAttributes);
      } else {
        formattedDocument = document2.copy({
          consolidateBlocks: true
        }).copyWithBaseBlockAttributes(blockAttributes);
      }
      const blockCount = formattedDocument.getBlockCount();
      const firstBlock = formattedDocument.getBlockAtIndex(0);
      if (arraysAreEqual(blockAttributes, firstBlock.getAttributes())) {
        const firstText = firstBlock.getTextWithoutBlockBreak();
        result = this.insertTextAtRange(firstText, range2);
        if (blockCount > 1) {
          formattedDocument = new this.constructor(formattedDocument.getBlocks().slice(1));
          const position = startPosition + firstText.getLength();
          result = result.insertDocumentAtRange(formattedDocument, position);
        }
      } else {
        result = this.insertDocumentAtRange(formattedDocument, range2);
      }
      return result;
    }
    insertTextAtRange(text, range2) {
      range2 = normalizeRange(range2);
      const [startPosition] = range2;
      const {
        index,
        offset
      } = this.locationFromPosition(startPosition);
      const document2 = this.removeTextAtRange(range2);
      return new this.constructor(document2.blockList.editObjectAtIndex(index, (block) => block.copyWithText(block.text.insertTextAtPosition(text, offset))));
    }
    removeTextAtRange(range2) {
      let blocks;
      range2 = normalizeRange(range2);
      const [leftPosition, rightPosition] = range2;
      if (rangeIsCollapsed(range2)) {
        return this;
      }
      const [leftLocation, rightLocation] = Array.from(this.locationRangeFromRange(range2));
      const leftIndex = leftLocation.index;
      const leftOffset = leftLocation.offset;
      const leftBlock = this.getBlockAtIndex(leftIndex);
      const rightIndex = rightLocation.index;
      const rightOffset = rightLocation.offset;
      const rightBlock = this.getBlockAtIndex(rightIndex);
      const removeRightNewline = rightPosition - leftPosition === 1 && leftBlock.getBlockBreakPosition() === leftOffset && rightBlock.getBlockBreakPosition() !== rightOffset && rightBlock.text.getStringAtPosition(rightOffset) === "\n";
      if (removeRightNewline) {
        blocks = this.blockList.editObjectAtIndex(rightIndex, (block) => block.copyWithText(block.text.removeTextAtRange([rightOffset, rightOffset + 1])));
      } else {
        let block;
        const leftText = leftBlock.text.getTextAtRange([0, leftOffset]);
        const rightText = rightBlock.text.getTextAtRange([rightOffset, rightBlock.getLength()]);
        const text = leftText.appendText(rightText);
        const removingLeftBlock = leftIndex !== rightIndex && leftOffset === 0;
        const useRightBlock = removingLeftBlock && leftBlock.getAttributeLevel() >= rightBlock.getAttributeLevel();
        if (useRightBlock) {
          block = rightBlock.copyWithText(text);
        } else {
          block = leftBlock.copyWithText(text);
        }
        const affectedBlockCount = rightIndex + 1 - leftIndex;
        blocks = this.blockList.splice(leftIndex, affectedBlockCount, block);
      }
      return new this.constructor(blocks);
    }
    moveTextFromRangeToPosition(range2, position) {
      let text;
      range2 = normalizeRange(range2);
      const [startPosition, endPosition] = range2;
      if (startPosition <= position && position <= endPosition) {
        return this;
      }
      let document2 = this.getDocumentAtRange(range2);
      let result = this.removeTextAtRange(range2);
      const movingRightward = startPosition < position;
      if (movingRightward) {
        position -= document2.getLength();
      }
      const [firstBlock, ...blocks] = document2.getBlocks();
      if (blocks.length === 0) {
        text = firstBlock.getTextWithoutBlockBreak();
        if (movingRightward) {
          position += 1;
        }
      } else {
        text = firstBlock.text;
      }
      result = result.insertTextAtRange(text, position);
      if (blocks.length === 0) {
        return result;
      }
      document2 = new this.constructor(blocks);
      position += text.getLength();
      return result.insertDocumentAtRange(document2, position);
    }
    addAttributeAtRange(attribute, value, range2) {
      let {
        blockList
      } = this;
      this.eachBlockAtRange(range2, (block, textRange, index) => blockList = blockList.editObjectAtIndex(index, function() {
        if (getBlockConfig(attribute)) {
          return block.addAttribute(attribute, value);
        } else {
          if (textRange[0] === textRange[1]) {
            return block;
          } else {
            return block.copyWithText(block.text.addAttributeAtRange(attribute, value, textRange));
          }
        }
      }));
      return new this.constructor(blockList);
    }
    addAttribute(attribute, value) {
      let {
        blockList
      } = this;
      this.eachBlock((block, index) => blockList = blockList.editObjectAtIndex(index, () => block.addAttribute(attribute, value)));
      return new this.constructor(blockList);
    }
    removeAttributeAtRange(attribute, range2) {
      let {
        blockList
      } = this;
      this.eachBlockAtRange(range2, function(block, textRange, index) {
        if (getBlockConfig(attribute)) {
          blockList = blockList.editObjectAtIndex(index, () => block.removeAttribute(attribute));
        } else if (textRange[0] !== textRange[1]) {
          blockList = blockList.editObjectAtIndex(index, () => block.copyWithText(block.text.removeAttributeAtRange(attribute, textRange)));
        }
      });
      return new this.constructor(blockList);
    }
    updateAttributesForAttachment(attributes2, attachment) {
      const range2 = this.getRangeOfAttachment(attachment);
      const [startPosition] = Array.from(range2);
      const {
        index
      } = this.locationFromPosition(startPosition);
      const text = this.getTextAtIndex(index);
      return new this.constructor(this.blockList.editObjectAtIndex(index, (block) => block.copyWithText(text.updateAttributesForAttachment(attributes2, attachment))));
    }
    removeAttributeForAttachment(attribute, attachment) {
      const range2 = this.getRangeOfAttachment(attachment);
      return this.removeAttributeAtRange(attribute, range2);
    }
    insertBlockBreakAtRange(range2) {
      let blocks;
      range2 = normalizeRange(range2);
      const [startPosition] = range2;
      const {
        offset
      } = this.locationFromPosition(startPosition);
      const document2 = this.removeTextAtRange(range2);
      if (offset === 0) {
        blocks = [new Block()];
      }
      return new this.constructor(document2.blockList.insertSplittableListAtPosition(new SplittableList(blocks), startPosition));
    }
    applyBlockAttributeAtRange(attributeName, value, range2) {
      const expanded = this.expandRangeToLineBreaksAndSplitBlocks(range2);
      let document2 = expanded.document;
      range2 = expanded.range;
      const blockConfig = getBlockConfig(attributeName);
      if (blockConfig.listAttribute) {
        document2 = document2.removeLastListAttributeAtRange(range2, {
          exceptAttributeName: attributeName
        });
        const converted = document2.convertLineBreaksToBlockBreaksInRange(range2);
        document2 = converted.document;
        range2 = converted.range;
      } else if (blockConfig.exclusive) {
        document2 = document2.removeBlockAttributesAtRange(range2);
      } else if (blockConfig.terminal) {
        document2 = document2.removeLastTerminalAttributeAtRange(range2);
      } else {
        document2 = document2.consolidateBlocksAtRange(range2);
      }
      return document2.addAttributeAtRange(attributeName, value, range2);
    }
    removeLastListAttributeAtRange(range2) {
      let options2 = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
      let {
        blockList
      } = this;
      this.eachBlockAtRange(range2, function(block, textRange, index) {
        const lastAttributeName = block.getLastAttribute();
        if (!lastAttributeName) {
          return;
        }
        if (!getBlockConfig(lastAttributeName).listAttribute) {
          return;
        }
        if (lastAttributeName === options2.exceptAttributeName) {
          return;
        }
        blockList = blockList.editObjectAtIndex(index, () => block.removeAttribute(lastAttributeName));
      });
      return new this.constructor(blockList);
    }
    removeLastTerminalAttributeAtRange(range2) {
      let {
        blockList
      } = this;
      this.eachBlockAtRange(range2, function(block, textRange, index) {
        const lastAttributeName = block.getLastAttribute();
        if (!lastAttributeName) {
          return;
        }
        if (!getBlockConfig(lastAttributeName).terminal) {
          return;
        }
        blockList = blockList.editObjectAtIndex(index, () => block.removeAttribute(lastAttributeName));
      });
      return new this.constructor(blockList);
    }
    removeBlockAttributesAtRange(range2) {
      let {
        blockList
      } = this;
      this.eachBlockAtRange(range2, function(block, textRange, index) {
        if (block.hasAttributes()) {
          blockList = blockList.editObjectAtIndex(index, () => block.copyWithoutAttributes());
        }
      });
      return new this.constructor(blockList);
    }
    expandRangeToLineBreaksAndSplitBlocks(range2) {
      let position;
      range2 = normalizeRange(range2);
      let [startPosition, endPosition] = range2;
      const startLocation = this.locationFromPosition(startPosition);
      const endLocation = this.locationFromPosition(endPosition);
      let document2 = this;
      const startBlock = document2.getBlockAtIndex(startLocation.index);
      startLocation.offset = startBlock.findLineBreakInDirectionFromPosition("backward", startLocation.offset);
      if (startLocation.offset != null) {
        position = document2.positionFromLocation(startLocation);
        document2 = document2.insertBlockBreakAtRange([position, position + 1]);
        endLocation.index += 1;
        endLocation.offset -= document2.getBlockAtIndex(startLocation.index).getLength();
        startLocation.index += 1;
      }
      startLocation.offset = 0;
      if (endLocation.offset === 0 && endLocation.index > startLocation.index) {
        endLocation.index -= 1;
        endLocation.offset = document2.getBlockAtIndex(endLocation.index).getBlockBreakPosition();
      } else {
        const endBlock = document2.getBlockAtIndex(endLocation.index);
        if (endBlock.text.getStringAtRange([endLocation.offset - 1, endLocation.offset]) === "\n") {
          endLocation.offset -= 1;
        } else {
          endLocation.offset = endBlock.findLineBreakInDirectionFromPosition("forward", endLocation.offset);
        }
        if (endLocation.offset !== endBlock.getBlockBreakPosition()) {
          position = document2.positionFromLocation(endLocation);
          document2 = document2.insertBlockBreakAtRange([position, position + 1]);
        }
      }
      startPosition = document2.positionFromLocation(startLocation);
      endPosition = document2.positionFromLocation(endLocation);
      range2 = normalizeRange([startPosition, endPosition]);
      return {
        document: document2,
        range: range2
      };
    }
    convertLineBreaksToBlockBreaksInRange(range2) {
      range2 = normalizeRange(range2);
      let [position] = range2;
      const string = this.getStringAtRange(range2).slice(0, -1);
      let document2 = this;
      string.replace(/.*?\n/g, function(match2) {
        position += match2.length;
        document2 = document2.insertBlockBreakAtRange([position - 1, position]);
      });
      return {
        document: document2,
        range: range2
      };
    }
    consolidateBlocksAtRange(range2) {
      range2 = normalizeRange(range2);
      const [startPosition, endPosition] = range2;
      const startIndex = this.locationFromPosition(startPosition).index;
      const endIndex = this.locationFromPosition(endPosition).index;
      return new this.constructor(this.blockList.consolidateFromIndexToIndex(startIndex, endIndex));
    }
    getDocumentAtRange(range2) {
      range2 = normalizeRange(range2);
      const blocks = this.blockList.getSplittableListInRange(range2).toArray();
      return new this.constructor(blocks);
    }
    getStringAtRange(range2) {
      let endIndex;
      const array = range2 = normalizeRange(range2), endPosition = array[array.length - 1];
      if (endPosition !== this.getLength()) {
        endIndex = -1;
      }
      return this.getDocumentAtRange(range2).toString().slice(0, endIndex);
    }
    getBlockAtIndex(index) {
      return this.blockList.getObjectAtIndex(index);
    }
    getBlockAtPosition(position) {
      const {
        index
      } = this.locationFromPosition(position);
      return this.getBlockAtIndex(index);
    }
    getTextAtIndex(index) {
      var _this$getBlockAtIndex;
      return (_this$getBlockAtIndex = this.getBlockAtIndex(index)) === null || _this$getBlockAtIndex === void 0 ? void 0 : _this$getBlockAtIndex.text;
    }
    getTextAtPosition(position) {
      const {
        index
      } = this.locationFromPosition(position);
      return this.getTextAtIndex(index);
    }
    getPieceAtPosition(position) {
      const {
        index,
        offset
      } = this.locationFromPosition(position);
      return this.getTextAtIndex(index).getPieceAtPosition(offset);
    }
    getCharacterAtPosition(position) {
      const {
        index,
        offset
      } = this.locationFromPosition(position);
      return this.getTextAtIndex(index).getStringAtRange([offset, offset + 1]);
    }
    getLength() {
      return this.blockList.getEndPosition();
    }
    getBlocks() {
      return this.blockList.toArray();
    }
    getBlockCount() {
      return this.blockList.length;
    }
    getEditCount() {
      return this.editCount;
    }
    eachBlock(callback) {
      return this.blockList.eachObject(callback);
    }
    eachBlockAtRange(range2, callback) {
      let block, textRange;
      range2 = normalizeRange(range2);
      const [startPosition, endPosition] = range2;
      const startLocation = this.locationFromPosition(startPosition);
      const endLocation = this.locationFromPosition(endPosition);
      if (startLocation.index === endLocation.index) {
        block = this.getBlockAtIndex(startLocation.index);
        textRange = [startLocation.offset, endLocation.offset];
        return callback(block, textRange, startLocation.index);
      } else {
        for (let index = startLocation.index; index <= endLocation.index; index++) {
          block = this.getBlockAtIndex(index);
          if (block) {
            switch (index) {
              case startLocation.index:
                textRange = [startLocation.offset, block.text.getLength()];
                break;
              case endLocation.index:
                textRange = [0, endLocation.offset];
                break;
              default:
                textRange = [0, block.text.getLength()];
            }
            callback(block, textRange, index);
          }
        }
      }
    }
    getCommonAttributesAtRange(range2) {
      range2 = normalizeRange(range2);
      const [startPosition] = range2;
      if (rangeIsCollapsed(range2)) {
        return this.getCommonAttributesAtPosition(startPosition);
      } else {
        const textAttributes2 = [];
        const blockAttributes = [];
        this.eachBlockAtRange(range2, function(block, textRange) {
          if (textRange[0] !== textRange[1]) {
            textAttributes2.push(block.text.getCommonAttributesAtRange(textRange));
            return blockAttributes.push(attributesForBlock(block));
          }
        });
        return Hash.fromCommonAttributesOfObjects(textAttributes2).merge(Hash.fromCommonAttributesOfObjects(blockAttributes)).toObject();
      }
    }
    getCommonAttributesAtPosition(position) {
      let key, value;
      const {
        index,
        offset
      } = this.locationFromPosition(position);
      const block = this.getBlockAtIndex(index);
      if (!block) {
        return {};
      }
      const commonAttributes = attributesForBlock(block);
      const attributes2 = block.text.getAttributesAtPosition(offset);
      const attributesLeft = block.text.getAttributesAtPosition(offset - 1);
      const inheritableAttributes = Object.keys(config.textAttributes).filter((key2) => {
        return config.textAttributes[key2].inheritable;
      });
      for (key in attributesLeft) {
        value = attributesLeft[key];
        if (value === attributes2[key] || inheritableAttributes.includes(key)) {
          commonAttributes[key] = value;
        }
      }
      return commonAttributes;
    }
    getRangeOfCommonAttributeAtPosition(attributeName, position) {
      const {
        index,
        offset
      } = this.locationFromPosition(position);
      const text = this.getTextAtIndex(index);
      const [startOffset, endOffset] = Array.from(text.getExpandedRangeForAttributeAtOffset(attributeName, offset));
      const start3 = this.positionFromLocation({
        index,
        offset: startOffset
      });
      const end = this.positionFromLocation({
        index,
        offset: endOffset
      });
      return normalizeRange([start3, end]);
    }
    getBaseBlockAttributes() {
      let baseBlockAttributes = this.getBlockAtIndex(0).getAttributes();
      for (let blockIndex = 1; blockIndex < this.getBlockCount(); blockIndex++) {
        const blockAttributes = this.getBlockAtIndex(blockIndex).getAttributes();
        const lastAttributeIndex = Math.min(baseBlockAttributes.length, blockAttributes.length);
        baseBlockAttributes = (() => {
          const result = [];
          for (let index = 0; index < lastAttributeIndex; index++) {
            if (blockAttributes[index] !== baseBlockAttributes[index]) {
              break;
            }
            result.push(blockAttributes[index]);
          }
          return result;
        })();
      }
      return baseBlockAttributes;
    }
    getAttachmentById(attachmentId) {
      for (const attachment of this.getAttachments()) {
        if (attachment.id === attachmentId) {
          return attachment;
        }
      }
    }
    getAttachmentPieces() {
      let attachmentPieces = [];
      this.blockList.eachObject((_ref) => {
        let {
          text
        } = _ref;
        return attachmentPieces = attachmentPieces.concat(text.getAttachmentPieces());
      });
      return attachmentPieces;
    }
    getAttachments() {
      return this.getAttachmentPieces().map((piece) => piece.attachment);
    }
    getRangeOfAttachment(attachment) {
      let position = 0;
      const iterable = this.blockList.toArray();
      for (let index = 0; index < iterable.length; index++) {
        const {
          text
        } = iterable[index];
        const textRange = text.getRangeOfAttachment(attachment);
        if (textRange) {
          return normalizeRange([position + textRange[0], position + textRange[1]]);
        }
        position += text.getLength();
      }
    }
    getLocationRangeOfAttachment(attachment) {
      const range2 = this.getRangeOfAttachment(attachment);
      return this.locationRangeFromRange(range2);
    }
    getAttachmentPieceForAttachment(attachment) {
      for (const piece of this.getAttachmentPieces()) {
        if (piece.attachment === attachment) {
          return piece;
        }
      }
    }
    findRangesForBlockAttribute(attributeName) {
      let position = 0;
      const ranges = [];
      this.getBlocks().forEach((block) => {
        const length = block.getLength();
        if (block.hasAttribute(attributeName)) {
          ranges.push([position, position + length]);
        }
        position += length;
      });
      return ranges;
    }
    findRangesForTextAttribute(attributeName) {
      let {
        withValue
      } = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
      let position = 0;
      let range2 = [];
      const ranges = [];
      const match2 = function(piece) {
        if (withValue) {
          return piece.getAttribute(attributeName) === withValue;
        } else {
          return piece.hasAttribute(attributeName);
        }
      };
      this.getPieces().forEach((piece) => {
        const length = piece.getLength();
        if (match2(piece)) {
          if (range2[1] === position) {
            range2[1] = position + length;
          } else {
            ranges.push(range2 = [position, position + length]);
          }
        }
        position += length;
      });
      return ranges;
    }
    locationFromPosition(position) {
      const location2 = this.blockList.findIndexAndOffsetAtPosition(Math.max(0, position));
      if (location2.index != null) {
        return location2;
      } else {
        const blocks = this.getBlocks();
        return {
          index: blocks.length - 1,
          offset: blocks[blocks.length - 1].getLength()
        };
      }
    }
    positionFromLocation(location2) {
      return this.blockList.findPositionAtIndexAndOffset(location2.index, location2.offset);
    }
    locationRangeFromPosition(position) {
      return normalizeRange(this.locationFromPosition(position));
    }
    locationRangeFromRange(range2) {
      range2 = normalizeRange(range2);
      if (!range2)
        return;
      const [startPosition, endPosition] = Array.from(range2);
      const startLocation = this.locationFromPosition(startPosition);
      const endLocation = this.locationFromPosition(endPosition);
      return normalizeRange([startLocation, endLocation]);
    }
    rangeFromLocationRange(locationRange) {
      let rightPosition;
      locationRange = normalizeRange(locationRange);
      const leftPosition = this.positionFromLocation(locationRange[0]);
      if (!rangeIsCollapsed(locationRange)) {
        rightPosition = this.positionFromLocation(locationRange[1]);
      }
      return normalizeRange([leftPosition, rightPosition]);
    }
    isEqualTo(document2) {
      return this.blockList.isEqualTo(document2 === null || document2 === void 0 ? void 0 : document2.blockList);
    }
    getTexts() {
      return this.getBlocks().map((block) => block.text);
    }
    getPieces() {
      const pieces = [];
      Array.from(this.getTexts()).forEach((text) => {
        pieces.push(...Array.from(text.getPieces() || []));
      });
      return pieces;
    }
    getObjects() {
      return this.getBlocks().concat(this.getTexts()).concat(this.getPieces());
    }
    toSerializableDocument() {
      const blocks = [];
      this.blockList.eachObject((block) => blocks.push(block.copyWithText(block.text.toSerializableText())));
      return new this.constructor(blocks);
    }
    toString() {
      return this.blockList.toString();
    }
    toJSON() {
      return this.blockList.toJSON();
    }
    toConsole() {
      return JSON.stringify(this.blockList.toArray()).map((block) => JSON.parse(block.text.toConsole()));
    }
  };
  var attributesForBlock = function(block) {
    const attributes2 = {};
    const attributeName = block.getLastAttribute();
    if (attributeName) {
      attributes2[attributeName] = true;
    }
    return attributes2;
  };
  var DEFAULT_ALLOWED_ATTRIBUTES = "style href src width height class".split(" ");
  var DEFAULT_FORBIDDEN_PROTOCOLS = "javascript:".split(" ");
  var DEFAULT_FORBIDDEN_ELEMENTS = "script iframe".split(" ");
  var HTMLSanitizer = class extends BasicObject {
    static sanitize(html2, options2) {
      const sanitizer = new this(html2, options2);
      sanitizer.sanitize();
      return sanitizer;
    }
    constructor(html2) {
      let {
        allowedAttributes,
        forbiddenProtocols,
        forbiddenElements
      } = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
      super(...arguments);
      this.allowedAttributes = allowedAttributes || DEFAULT_ALLOWED_ATTRIBUTES;
      this.forbiddenProtocols = forbiddenProtocols || DEFAULT_FORBIDDEN_PROTOCOLS;
      this.forbiddenElements = forbiddenElements || DEFAULT_FORBIDDEN_ELEMENTS;
      this.body = createBodyElementForHTML(html2);
    }
    sanitize() {
      this.sanitizeElements();
      return this.normalizeListElementNesting();
    }
    getHTML() {
      return this.body.innerHTML;
    }
    getBody() {
      return this.body;
    }
    sanitizeElements() {
      const walker = walkTree(this.body);
      const nodesToRemove = [];
      while (walker.nextNode()) {
        const node = walker.currentNode;
        switch (node.nodeType) {
          case Node.ELEMENT_NODE:
            if (this.elementIsRemovable(node)) {
              nodesToRemove.push(node);
            } else {
              this.sanitizeElement(node);
            }
            break;
          case Node.COMMENT_NODE:
            nodesToRemove.push(node);
            break;
        }
      }
      nodesToRemove.forEach((node) => removeNode(node));
      return this.body;
    }
    sanitizeElement(element) {
      if (element.hasAttribute("href")) {
        if (this.forbiddenProtocols.includes(element.protocol)) {
          element.removeAttribute("href");
        }
      }
      Array.from(element.attributes).forEach((_ref) => {
        let {
          name
        } = _ref;
        if (!this.allowedAttributes.includes(name) && name.indexOf("data-trix") !== 0) {
          element.removeAttribute(name);
        }
      });
      return element;
    }
    normalizeListElementNesting() {
      Array.from(this.body.querySelectorAll("ul,ol")).forEach((listElement) => {
        const previousElement = listElement.previousElementSibling;
        if (previousElement) {
          if (tagName(previousElement) === "li") {
            previousElement.appendChild(listElement);
          }
        }
      });
      return this.body;
    }
    elementIsRemovable(element) {
      if ((element === null || element === void 0 ? void 0 : element.nodeType) !== Node.ELEMENT_NODE)
        return;
      return this.elementIsForbidden(element) || this.elementIsntSerializable(element);
    }
    elementIsForbidden(element) {
      return this.forbiddenElements.includes(tagName(element));
    }
    elementIsntSerializable(element) {
      return element.getAttribute("data-trix-serialize") === "false" && !nodeIsAttachmentElement(element);
    }
  };
  var createBodyElementForHTML = function() {
    let html2 = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : "";
    html2 = html2.replace(/<\/html[^>]*>[^]*$/i, "</html>");
    const doc2 = document.implementation.createHTMLDocument("");
    doc2.documentElement.innerHTML = html2;
    Array.from(doc2.head.querySelectorAll("style")).forEach((element) => {
      doc2.body.appendChild(element);
    });
    return doc2.body;
  };
  var pieceForString = function(string) {
    let attributes2 = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    const type = "string";
    string = normalizeSpaces(string);
    return {
      string,
      attributes: attributes2,
      type
    };
  };
  var pieceForAttachment = function(attachment) {
    let attributes2 = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    const type = "attachment";
    return {
      attachment,
      attributes: attributes2,
      type
    };
  };
  var blockForAttributes = function() {
    let attributes2 = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
    const text = [];
    return {
      text,
      attributes: attributes2
    };
  };
  var parseTrixDataAttribute = (element, name) => {
    try {
      return JSON.parse(element.getAttribute("data-trix-".concat(name)));
    } catch (error4) {
      return {};
    }
  };
  var getImageDimensions = (element) => {
    const width = element.getAttribute("width");
    const height = element.getAttribute("height");
    const dimensions = {};
    if (width) {
      dimensions.width = parseInt(width, 10);
    }
    if (height) {
      dimensions.height = parseInt(height, 10);
    }
    return dimensions;
  };
  var HTMLParser = class extends BasicObject {
    static parse(html2, options2) {
      const parser = new this(html2, options2);
      parser.parse();
      return parser;
    }
    constructor(html2) {
      let {
        referenceElement
      } = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
      super(...arguments);
      this.html = html2;
      this.referenceElement = referenceElement;
      this.blocks = [];
      this.blockElements = [];
      this.processedElements = [];
    }
    getDocument() {
      return Document.fromJSON(this.blocks);
    }
    parse() {
      try {
        this.createHiddenContainer();
        const html2 = HTMLSanitizer.sanitize(this.html).getHTML();
        this.containerElement.innerHTML = html2;
        const walker = walkTree(this.containerElement, {
          usingFilter: nodeFilter
        });
        while (walker.nextNode()) {
          this.processNode(walker.currentNode);
        }
        return this.translateBlockElementMarginsToNewlines();
      } finally {
        this.removeHiddenContainer();
      }
    }
    createHiddenContainer() {
      if (this.referenceElement) {
        this.containerElement = this.referenceElement.cloneNode(false);
        this.containerElement.removeAttribute("id");
        this.containerElement.setAttribute("data-trix-internal", "");
        this.containerElement.style.display = "none";
        return this.referenceElement.parentNode.insertBefore(this.containerElement, this.referenceElement.nextSibling);
      } else {
        this.containerElement = makeElement({
          tagName: "div",
          style: {
            display: "none"
          }
        });
        return document.body.appendChild(this.containerElement);
      }
    }
    removeHiddenContainer() {
      return removeNode(this.containerElement);
    }
    processNode(node) {
      switch (node.nodeType) {
        case Node.TEXT_NODE:
          if (!this.isInsignificantTextNode(node)) {
            this.appendBlockForTextNode(node);
            return this.processTextNode(node);
          }
          break;
        case Node.ELEMENT_NODE:
          this.appendBlockForElement(node);
          return this.processElement(node);
      }
    }
    appendBlockForTextNode(node) {
      const element = node.parentNode;
      if (element === this.currentBlockElement && this.isBlockElement(node.previousSibling)) {
        return this.appendStringWithAttributes("\n");
      } else if (element === this.containerElement || this.isBlockElement(element)) {
        var _this$currentBlock;
        const attributes2 = this.getBlockAttributes(element);
        if (!arraysAreEqual(attributes2, (_this$currentBlock = this.currentBlock) === null || _this$currentBlock === void 0 ? void 0 : _this$currentBlock.attributes)) {
          this.currentBlock = this.appendBlockForAttributesWithElement(attributes2, element);
          this.currentBlockElement = element;
        }
      }
    }
    appendBlockForElement(element) {
      const elementIsBlockElement = this.isBlockElement(element);
      const currentBlockContainsElement = elementContainsNode(this.currentBlockElement, element);
      if (elementIsBlockElement && !this.isBlockElement(element.firstChild)) {
        if (!this.isInsignificantTextNode(element.firstChild) || !this.isBlockElement(element.firstElementChild)) {
          const attributes2 = this.getBlockAttributes(element);
          if (element.firstChild) {
            if (!(currentBlockContainsElement && arraysAreEqual(attributes2, this.currentBlock.attributes))) {
              this.currentBlock = this.appendBlockForAttributesWithElement(attributes2, element);
              this.currentBlockElement = element;
            } else {
              return this.appendStringWithAttributes("\n");
            }
          }
        }
      } else if (this.currentBlockElement && !currentBlockContainsElement && !elementIsBlockElement) {
        const parentBlockElement = this.findParentBlockElement(element);
        if (parentBlockElement) {
          return this.appendBlockForElement(parentBlockElement);
        } else {
          this.currentBlock = this.appendEmptyBlock();
          this.currentBlockElement = null;
        }
      }
    }
    findParentBlockElement(element) {
      let {
        parentElement
      } = element;
      while (parentElement && parentElement !== this.containerElement) {
        if (this.isBlockElement(parentElement) && this.blockElements.includes(parentElement)) {
          return parentElement;
        } else {
          parentElement = parentElement.parentElement;
        }
      }
      return null;
    }
    processTextNode(node) {
      let string = node.data;
      if (!elementCanDisplayPreformattedText(node.parentNode)) {
        var _node$previousSibling;
        string = squishBreakableWhitespace(string);
        if (stringEndsWithWhitespace((_node$previousSibling = node.previousSibling) === null || _node$previousSibling === void 0 ? void 0 : _node$previousSibling.textContent)) {
          string = leftTrimBreakableWhitespace(string);
        }
      }
      return this.appendStringWithAttributes(string, this.getTextAttributes(node.parentNode));
    }
    processElement(element) {
      let attributes2;
      if (nodeIsAttachmentElement(element)) {
        attributes2 = parseTrixDataAttribute(element, "attachment");
        if (Object.keys(attributes2).length) {
          const textAttributes2 = this.getTextAttributes(element);
          this.appendAttachmentWithAttributes(attributes2, textAttributes2);
          element.innerHTML = "";
        }
        return this.processedElements.push(element);
      } else {
        switch (tagName(element)) {
          case "br":
            if (!this.isExtraBR(element) && !this.isBlockElement(element.nextSibling)) {
              this.appendStringWithAttributes("\n", this.getTextAttributes(element));
            }
            return this.processedElements.push(element);
          case "img":
            attributes2 = {
              url: element.getAttribute("src"),
              contentType: "image"
            };
            const object2 = getImageDimensions(element);
            for (const key in object2) {
              const value = object2[key];
              attributes2[key] = value;
            }
            this.appendAttachmentWithAttributes(attributes2, this.getTextAttributes(element));
            return this.processedElements.push(element);
          case "tr":
            if (element.parentNode.firstChild !== element) {
              return this.appendStringWithAttributes("\n");
            }
            break;
          case "td":
            if (element.parentNode.firstChild !== element) {
              return this.appendStringWithAttributes(" | ");
            }
            break;
        }
      }
    }
    appendBlockForAttributesWithElement(attributes2, element) {
      this.blockElements.push(element);
      const block = blockForAttributes(attributes2);
      this.blocks.push(block);
      return block;
    }
    appendEmptyBlock() {
      return this.appendBlockForAttributesWithElement([], null);
    }
    appendStringWithAttributes(string, attributes2) {
      return this.appendPiece(pieceForString(string, attributes2));
    }
    appendAttachmentWithAttributes(attachment, attributes2) {
      return this.appendPiece(pieceForAttachment(attachment, attributes2));
    }
    appendPiece(piece) {
      if (this.blocks.length === 0) {
        this.appendEmptyBlock();
      }
      return this.blocks[this.blocks.length - 1].text.push(piece);
    }
    appendStringToTextAtIndex(string, index) {
      const {
        text
      } = this.blocks[index];
      const piece = text[text.length - 1];
      if ((piece === null || piece === void 0 ? void 0 : piece.type) === "string") {
        piece.string += string;
      } else {
        return text.push(pieceForString(string));
      }
    }
    prependStringToTextAtIndex(string, index) {
      const {
        text
      } = this.blocks[index];
      const piece = text[0];
      if ((piece === null || piece === void 0 ? void 0 : piece.type) === "string") {
        piece.string = string + piece.string;
      } else {
        return text.unshift(pieceForString(string));
      }
    }
    getTextAttributes(element) {
      let value;
      const attributes2 = {};
      for (const attribute in config.textAttributes) {
        const configAttr = config.textAttributes[attribute];
        if (configAttr.tagName && findClosestElementFromNode(element, {
          matchingSelector: configAttr.tagName,
          untilNode: this.containerElement
        })) {
          attributes2[attribute] = true;
        } else if (configAttr.parser) {
          value = configAttr.parser(element);
          if (value) {
            let attributeInheritedFromBlock = false;
            for (const blockElement of this.findBlockElementAncestors(element)) {
              if (configAttr.parser(blockElement) === value) {
                attributeInheritedFromBlock = true;
                break;
              }
            }
            if (!attributeInheritedFromBlock) {
              attributes2[attribute] = value;
            }
          }
        } else if (configAttr.styleProperty) {
          value = element.style[configAttr.styleProperty];
          if (value) {
            attributes2[attribute] = value;
          }
        }
      }
      if (nodeIsAttachmentElement(element)) {
        const object2 = parseTrixDataAttribute(element, "attributes");
        for (const key in object2) {
          value = object2[key];
          attributes2[key] = value;
        }
      }
      return attributes2;
    }
    getBlockAttributes(element) {
      const attributes2 = [];
      while (element && element !== this.containerElement) {
        for (const attribute in config.blockAttributes) {
          const attrConfig = config.blockAttributes[attribute];
          if (attrConfig.parse !== false) {
            if (tagName(element) === attrConfig.tagName) {
              var _attrConfig$test;
              if ((_attrConfig$test = attrConfig.test) !== null && _attrConfig$test !== void 0 && _attrConfig$test.call(attrConfig, element) || !attrConfig.test) {
                attributes2.push(attribute);
                if (attrConfig.listAttribute) {
                  attributes2.push(attrConfig.listAttribute);
                }
              }
            }
          }
        }
        element = element.parentNode;
      }
      return attributes2.reverse();
    }
    findBlockElementAncestors(element) {
      const ancestors = [];
      while (element && element !== this.containerElement) {
        const tag = tagName(element);
        if (getBlockTagNames().includes(tag)) {
          ancestors.push(element);
        }
        element = element.parentNode;
      }
      return ancestors;
    }
    isBlockElement(element) {
      if ((element === null || element === void 0 ? void 0 : element.nodeType) !== Node.ELEMENT_NODE)
        return;
      if (nodeIsAttachmentElement(element))
        return;
      if (findClosestElementFromNode(element, {
        matchingSelector: "td",
        untilNode: this.containerElement
      }))
        return;
      return getBlockTagNames().includes(tagName(element)) || window.getComputedStyle(element).display === "block";
    }
    isInsignificantTextNode(node) {
      if ((node === null || node === void 0 ? void 0 : node.nodeType) !== Node.TEXT_NODE)
        return;
      if (!stringIsAllBreakableWhitespace(node.data))
        return;
      const {
        parentNode,
        previousSibling,
        nextSibling
      } = node;
      if (nodeEndsWithNonWhitespace(parentNode.previousSibling) && !this.isBlockElement(parentNode.previousSibling))
        return;
      if (elementCanDisplayPreformattedText(parentNode))
        return;
      return !previousSibling || this.isBlockElement(previousSibling) || !nextSibling || this.isBlockElement(nextSibling);
    }
    isExtraBR(element) {
      return tagName(element) === "br" && this.isBlockElement(element.parentNode) && element.parentNode.lastChild === element;
    }
    translateBlockElementMarginsToNewlines() {
      const defaultMargin = this.getMarginOfDefaultBlockElement();
      for (let index = 0; index < this.blocks.length; index++) {
        const margin = this.getMarginOfBlockElementAtIndex(index);
        if (margin) {
          if (margin.top > defaultMargin.top * 2) {
            this.prependStringToTextAtIndex("\n", index);
          }
          if (margin.bottom > defaultMargin.bottom * 2) {
            this.appendStringToTextAtIndex("\n", index);
          }
        }
      }
    }
    getMarginOfBlockElementAtIndex(index) {
      const element = this.blockElements[index];
      if (element) {
        if (element.textContent) {
          if (!getBlockTagNames().includes(tagName(element)) && !this.processedElements.includes(element)) {
            return getBlockElementMargin(element);
          }
        }
      }
    }
    getMarginOfDefaultBlockElement() {
      const element = makeElement(config.blockAttributes.default.tagName);
      this.containerElement.appendChild(element);
      return getBlockElementMargin(element);
    }
  };
  var elementCanDisplayPreformattedText = function(element) {
    const {
      whiteSpace
    } = window.getComputedStyle(element);
    return ["pre", "pre-wrap", "pre-line"].includes(whiteSpace);
  };
  var nodeEndsWithNonWhitespace = (node) => node && !stringEndsWithWhitespace(node.textContent);
  var getBlockElementMargin = function(element) {
    const style = window.getComputedStyle(element);
    if (style.display === "block") {
      return {
        top: parseInt(style.marginTop),
        bottom: parseInt(style.marginBottom)
      };
    }
  };
  var nodeFilter = function(node) {
    if (tagName(node) === "style") {
      return NodeFilter.FILTER_REJECT;
    } else {
      return NodeFilter.FILTER_ACCEPT;
    }
  };
  var leftTrimBreakableWhitespace = (string) => string.replace(new RegExp("^".concat(breakableWhitespacePattern.source, "+")), "");
  var stringIsAllBreakableWhitespace = (string) => new RegExp("^".concat(breakableWhitespacePattern.source, "*$")).test(string);
  var stringEndsWithWhitespace = (string) => /\s$/.test(string);
  var LineBreakInsertion = class {
    constructor(composition) {
      this.composition = composition;
      this.document = this.composition.document;
      const selectedRange = this.composition.getSelectedRange();
      this.startPosition = selectedRange[0];
      this.endPosition = selectedRange[1];
      this.startLocation = this.document.locationFromPosition(this.startPosition);
      this.endLocation = this.document.locationFromPosition(this.endPosition);
      this.block = this.document.getBlockAtIndex(this.endLocation.index);
      this.breaksOnReturn = this.block.breaksOnReturn();
      this.previousCharacter = this.block.text.getStringAtPosition(this.endLocation.offset - 1);
      this.nextCharacter = this.block.text.getStringAtPosition(this.endLocation.offset);
    }
    shouldInsertBlockBreak() {
      if (this.block.hasAttributes() && this.block.isListItem() && !this.block.isEmpty()) {
        return this.startLocation.offset !== 0;
      } else {
        return this.breaksOnReturn && this.nextCharacter !== "\n";
      }
    }
    shouldBreakFormattedBlock() {
      return this.block.hasAttributes() && !this.block.isListItem() && (this.breaksOnReturn && this.nextCharacter === "\n" || this.previousCharacter === "\n");
    }
    shouldDecreaseListLevel() {
      return this.block.hasAttributes() && this.block.isListItem() && this.block.isEmpty();
    }
    shouldPrependListItem() {
      return this.block.isListItem() && this.startLocation.offset === 0 && !this.block.isEmpty();
    }
    shouldRemoveLastBlockAttribute() {
      return this.block.hasAttributes() && !this.block.isListItem() && this.block.isEmpty();
    }
  };
  var PLACEHOLDER = " ";
  var Composition = class extends BasicObject {
    constructor() {
      super(...arguments);
      this.document = new Document();
      this.attachments = [];
      this.currentAttributes = {};
      this.revision = 0;
    }
    setDocument(document2) {
      if (!document2.isEqualTo(this.document)) {
        var _this$delegate, _this$delegate$compos;
        this.document = document2;
        this.refreshAttachments();
        this.revision++;
        return (_this$delegate = this.delegate) === null || _this$delegate === void 0 ? void 0 : (_this$delegate$compos = _this$delegate.compositionDidChangeDocument) === null || _this$delegate$compos === void 0 ? void 0 : _this$delegate$compos.call(_this$delegate, document2);
      }
    }
    getSnapshot() {
      return {
        document: this.document,
        selectedRange: this.getSelectedRange()
      };
    }
    loadSnapshot(_ref) {
      var _this$delegate2, _this$delegate2$compo, _this$delegate3, _this$delegate3$compo;
      let {
        document: document2,
        selectedRange
      } = _ref;
      (_this$delegate2 = this.delegate) === null || _this$delegate2 === void 0 ? void 0 : (_this$delegate2$compo = _this$delegate2.compositionWillLoadSnapshot) === null || _this$delegate2$compo === void 0 ? void 0 : _this$delegate2$compo.call(_this$delegate2);
      this.setDocument(document2 != null ? document2 : new Document());
      this.setSelection(selectedRange != null ? selectedRange : [0, 0]);
      return (_this$delegate3 = this.delegate) === null || _this$delegate3 === void 0 ? void 0 : (_this$delegate3$compo = _this$delegate3.compositionDidLoadSnapshot) === null || _this$delegate3$compo === void 0 ? void 0 : _this$delegate3$compo.call(_this$delegate3);
    }
    insertText(text) {
      let {
        updatePosition
      } = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {
        updatePosition: true
      };
      const selectedRange = this.getSelectedRange();
      this.setDocument(this.document.insertTextAtRange(text, selectedRange));
      const startPosition = selectedRange[0];
      const endPosition = startPosition + text.getLength();
      if (updatePosition) {
        this.setSelection(endPosition);
      }
      return this.notifyDelegateOfInsertionAtRange([startPosition, endPosition]);
    }
    insertBlock() {
      let block = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : new Block();
      const document2 = new Document([block]);
      return this.insertDocument(document2);
    }
    insertDocument() {
      let document2 = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : new Document();
      const selectedRange = this.getSelectedRange();
      this.setDocument(this.document.insertDocumentAtRange(document2, selectedRange));
      const startPosition = selectedRange[0];
      const endPosition = startPosition + document2.getLength();
      this.setSelection(endPosition);
      return this.notifyDelegateOfInsertionAtRange([startPosition, endPosition]);
    }
    insertString(string, options2) {
      const attributes2 = this.getCurrentTextAttributes();
      const text = Text.textForStringWithAttributes(string, attributes2);
      return this.insertText(text, options2);
    }
    insertBlockBreak() {
      const selectedRange = this.getSelectedRange();
      this.setDocument(this.document.insertBlockBreakAtRange(selectedRange));
      const startPosition = selectedRange[0];
      const endPosition = startPosition + 1;
      this.setSelection(endPosition);
      return this.notifyDelegateOfInsertionAtRange([startPosition, endPosition]);
    }
    insertLineBreak() {
      const insertion = new LineBreakInsertion(this);
      if (insertion.shouldDecreaseListLevel()) {
        this.decreaseListLevel();
        return this.setSelection(insertion.startPosition);
      } else if (insertion.shouldPrependListItem()) {
        const document2 = new Document([insertion.block.copyWithoutText()]);
        return this.insertDocument(document2);
      } else if (insertion.shouldInsertBlockBreak()) {
        return this.insertBlockBreak();
      } else if (insertion.shouldRemoveLastBlockAttribute()) {
        return this.removeLastBlockAttribute();
      } else if (insertion.shouldBreakFormattedBlock()) {
        return this.breakFormattedBlock(insertion);
      } else {
        return this.insertString("\n");
      }
    }
    insertHTML(html2) {
      const document2 = HTMLParser.parse(html2).getDocument();
      const selectedRange = this.getSelectedRange();
      this.setDocument(this.document.mergeDocumentAtRange(document2, selectedRange));
      const startPosition = selectedRange[0];
      const endPosition = startPosition + document2.getLength() - 1;
      this.setSelection(endPosition);
      return this.notifyDelegateOfInsertionAtRange([startPosition, endPosition]);
    }
    replaceHTML(html2) {
      const document2 = HTMLParser.parse(html2).getDocument().copyUsingObjectsFromDocument(this.document);
      const locationRange = this.getLocationRange({
        strict: false
      });
      const selectedRange = this.document.rangeFromLocationRange(locationRange);
      this.setDocument(document2);
      return this.setSelection(selectedRange);
    }
    insertFile(file) {
      return this.insertFiles([file]);
    }
    insertFiles(files) {
      const attachments2 = [];
      Array.from(files).forEach((file) => {
        var _this$delegate4;
        if ((_this$delegate4 = this.delegate) !== null && _this$delegate4 !== void 0 && _this$delegate4.compositionShouldAcceptFile(file)) {
          const attachment = Attachment.attachmentForFile(file);
          attachments2.push(attachment);
        }
      });
      return this.insertAttachments(attachments2);
    }
    insertAttachment(attachment) {
      return this.insertAttachments([attachment]);
    }
    insertAttachments(attachments2) {
      let text = new Text();
      Array.from(attachments2).forEach((attachment) => {
        var _config$attachments$t;
        const type = attachment.getType();
        const presentation = (_config$attachments$t = config.attachments[type]) === null || _config$attachments$t === void 0 ? void 0 : _config$attachments$t.presentation;
        const attributes2 = this.getCurrentTextAttributes();
        if (presentation) {
          attributes2.presentation = presentation;
        }
        const attachmentText = Text.textForAttachmentWithAttributes(attachment, attributes2);
        text = text.appendText(attachmentText);
      });
      return this.insertText(text);
    }
    shouldManageDeletingInDirection(direction) {
      const locationRange = this.getLocationRange();
      if (rangeIsCollapsed(locationRange)) {
        if (direction === "backward" && locationRange[0].offset === 0) {
          return true;
        }
        if (this.shouldManageMovingCursorInDirection(direction)) {
          return true;
        }
      } else {
        if (locationRange[0].index !== locationRange[1].index) {
          return true;
        }
      }
      return false;
    }
    deleteInDirection(direction) {
      let {
        length
      } = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
      let attachment, deletingIntoPreviousBlock, selectionSpansBlocks;
      const locationRange = this.getLocationRange();
      let range2 = this.getSelectedRange();
      const selectionIsCollapsed = rangeIsCollapsed(range2);
      if (selectionIsCollapsed) {
        deletingIntoPreviousBlock = direction === "backward" && locationRange[0].offset === 0;
      } else {
        selectionSpansBlocks = locationRange[0].index !== locationRange[1].index;
      }
      if (deletingIntoPreviousBlock) {
        if (this.canDecreaseBlockAttributeLevel()) {
          const block = this.getBlock();
          if (block.isListItem()) {
            this.decreaseListLevel();
          } else {
            this.decreaseBlockAttributeLevel();
          }
          this.setSelection(range2[0]);
          if (block.isEmpty()) {
            return false;
          }
        }
      }
      if (selectionIsCollapsed) {
        range2 = this.getExpandedRangeInDirection(direction, {
          length
        });
        if (direction === "backward") {
          attachment = this.getAttachmentAtRange(range2);
        }
      }
      if (attachment) {
        this.editAttachment(attachment);
        return false;
      } else {
        this.setDocument(this.document.removeTextAtRange(range2));
        this.setSelection(range2[0]);
        if (deletingIntoPreviousBlock || selectionSpansBlocks) {
          return false;
        }
      }
    }
    moveTextFromRange(range2) {
      const [position] = Array.from(this.getSelectedRange());
      this.setDocument(this.document.moveTextFromRangeToPosition(range2, position));
      return this.setSelection(position);
    }
    removeAttachment(attachment) {
      const range2 = this.document.getRangeOfAttachment(attachment);
      if (range2) {
        this.stopEditingAttachment();
        this.setDocument(this.document.removeTextAtRange(range2));
        return this.setSelection(range2[0]);
      }
    }
    removeLastBlockAttribute() {
      const [startPosition, endPosition] = Array.from(this.getSelectedRange());
      const block = this.document.getBlockAtPosition(endPosition);
      this.removeCurrentAttribute(block.getLastAttribute());
      return this.setSelection(startPosition);
    }
    insertPlaceholder() {
      this.placeholderPosition = this.getPosition();
      return this.insertString(PLACEHOLDER);
    }
    selectPlaceholder() {
      if (this.placeholderPosition != null) {
        this.setSelectedRange([this.placeholderPosition, this.placeholderPosition + PLACEHOLDER.length]);
        return this.getSelectedRange();
      }
    }
    forgetPlaceholder() {
      this.placeholderPosition = null;
    }
    hasCurrentAttribute(attributeName) {
      const value = this.currentAttributes[attributeName];
      return value != null && value !== false;
    }
    toggleCurrentAttribute(attributeName) {
      const value = !this.currentAttributes[attributeName];
      if (value) {
        return this.setCurrentAttribute(attributeName, value);
      } else {
        return this.removeCurrentAttribute(attributeName);
      }
    }
    canSetCurrentAttribute(attributeName) {
      if (getBlockConfig(attributeName)) {
        return this.canSetCurrentBlockAttribute(attributeName);
      } else {
        return this.canSetCurrentTextAttribute(attributeName);
      }
    }
    canSetCurrentTextAttribute(attributeName) {
      const document2 = this.getSelectedDocument();
      if (!document2)
        return;
      for (const attachment of Array.from(document2.getAttachments())) {
        if (!attachment.hasContent()) {
          return false;
        }
      }
      return true;
    }
    canSetCurrentBlockAttribute(attributeName) {
      const block = this.getBlock();
      if (!block)
        return;
      return !block.isTerminalBlock();
    }
    setCurrentAttribute(attributeName, value) {
      if (getBlockConfig(attributeName)) {
        return this.setBlockAttribute(attributeName, value);
      } else {
        this.setTextAttribute(attributeName, value);
        this.currentAttributes[attributeName] = value;
        return this.notifyDelegateOfCurrentAttributesChange();
      }
    }
    setTextAttribute(attributeName, value) {
      const selectedRange = this.getSelectedRange();
      if (!selectedRange)
        return;
      const [startPosition, endPosition] = Array.from(selectedRange);
      if (startPosition === endPosition) {
        if (attributeName === "href") {
          const text = Text.textForStringWithAttributes(value, {
            href: value
          });
          return this.insertText(text);
        }
      } else {
        return this.setDocument(this.document.addAttributeAtRange(attributeName, value, selectedRange));
      }
    }
    setBlockAttribute(attributeName, value) {
      const selectedRange = this.getSelectedRange();
      if (this.canSetCurrentAttribute(attributeName)) {
        this.setDocument(this.document.applyBlockAttributeAtRange(attributeName, value, selectedRange));
        return this.setSelection(selectedRange);
      }
    }
    removeCurrentAttribute(attributeName) {
      if (getBlockConfig(attributeName)) {
        this.removeBlockAttribute(attributeName);
        return this.updateCurrentAttributes();
      } else {
        this.removeTextAttribute(attributeName);
        delete this.currentAttributes[attributeName];
        return this.notifyDelegateOfCurrentAttributesChange();
      }
    }
    removeTextAttribute(attributeName) {
      const selectedRange = this.getSelectedRange();
      if (!selectedRange)
        return;
      return this.setDocument(this.document.removeAttributeAtRange(attributeName, selectedRange));
    }
    removeBlockAttribute(attributeName) {
      const selectedRange = this.getSelectedRange();
      if (!selectedRange)
        return;
      return this.setDocument(this.document.removeAttributeAtRange(attributeName, selectedRange));
    }
    canDecreaseNestingLevel() {
      var _this$getBlock;
      return ((_this$getBlock = this.getBlock()) === null || _this$getBlock === void 0 ? void 0 : _this$getBlock.getNestingLevel()) > 0;
    }
    canIncreaseNestingLevel() {
      var _getBlockConfig;
      const block = this.getBlock();
      if (!block)
        return;
      if ((_getBlockConfig = getBlockConfig(block.getLastNestableAttribute())) !== null && _getBlockConfig !== void 0 && _getBlockConfig.listAttribute) {
        const previousBlock = this.getPreviousBlock();
        if (previousBlock) {
          return arrayStartsWith(previousBlock.getListItemAttributes(), block.getListItemAttributes());
        }
      } else {
        return block.getNestingLevel() > 0;
      }
    }
    decreaseNestingLevel() {
      const block = this.getBlock();
      if (!block)
        return;
      return this.setDocument(this.document.replaceBlock(block, block.decreaseNestingLevel()));
    }
    increaseNestingLevel() {
      const block = this.getBlock();
      if (!block)
        return;
      return this.setDocument(this.document.replaceBlock(block, block.increaseNestingLevel()));
    }
    canDecreaseBlockAttributeLevel() {
      var _this$getBlock2;
      return ((_this$getBlock2 = this.getBlock()) === null || _this$getBlock2 === void 0 ? void 0 : _this$getBlock2.getAttributeLevel()) > 0;
    }
    decreaseBlockAttributeLevel() {
      var _this$getBlock3;
      const attribute = (_this$getBlock3 = this.getBlock()) === null || _this$getBlock3 === void 0 ? void 0 : _this$getBlock3.getLastAttribute();
      if (attribute) {
        return this.removeCurrentAttribute(attribute);
      }
    }
    decreaseListLevel() {
      let [startPosition] = Array.from(this.getSelectedRange());
      const {
        index
      } = this.document.locationFromPosition(startPosition);
      let endIndex = index;
      const attributeLevel = this.getBlock().getAttributeLevel();
      let block = this.document.getBlockAtIndex(endIndex + 1);
      while (block) {
        if (!block.isListItem() || block.getAttributeLevel() <= attributeLevel) {
          break;
        }
        endIndex++;
        block = this.document.getBlockAtIndex(endIndex + 1);
      }
      startPosition = this.document.positionFromLocation({
        index,
        offset: 0
      });
      const endPosition = this.document.positionFromLocation({
        index: endIndex,
        offset: 0
      });
      return this.setDocument(this.document.removeLastListAttributeAtRange([startPosition, endPosition]));
    }
    updateCurrentAttributes() {
      const selectedRange = this.getSelectedRange({
        ignoreLock: true
      });
      if (selectedRange) {
        const currentAttributes = this.document.getCommonAttributesAtRange(selectedRange);
        Array.from(getAllAttributeNames()).forEach((attributeName) => {
          if (!currentAttributes[attributeName]) {
            if (!this.canSetCurrentAttribute(attributeName)) {
              currentAttributes[attributeName] = false;
            }
          }
        });
        if (!objectsAreEqual(currentAttributes, this.currentAttributes)) {
          this.currentAttributes = currentAttributes;
          return this.notifyDelegateOfCurrentAttributesChange();
        }
      }
    }
    getCurrentAttributes() {
      return extend5.call({}, this.currentAttributes);
    }
    getCurrentTextAttributes() {
      const attributes2 = {};
      for (const key in this.currentAttributes) {
        const value = this.currentAttributes[key];
        if (value !== false) {
          if (getTextConfig(key)) {
            attributes2[key] = value;
          }
        }
      }
      return attributes2;
    }
    freezeSelection() {
      return this.setCurrentAttribute("frozen", true);
    }
    thawSelection() {
      return this.removeCurrentAttribute("frozen");
    }
    hasFrozenSelection() {
      return this.hasCurrentAttribute("frozen");
    }
    setSelection(selectedRange) {
      var _this$delegate5;
      const locationRange = this.document.locationRangeFromRange(selectedRange);
      return (_this$delegate5 = this.delegate) === null || _this$delegate5 === void 0 ? void 0 : _this$delegate5.compositionDidRequestChangingSelectionToLocationRange(locationRange);
    }
    getSelectedRange() {
      const locationRange = this.getLocationRange();
      if (locationRange) {
        return this.document.rangeFromLocationRange(locationRange);
      }
    }
    setSelectedRange(selectedRange) {
      const locationRange = this.document.locationRangeFromRange(selectedRange);
      return this.getSelectionManager().setLocationRange(locationRange);
    }
    getPosition() {
      const locationRange = this.getLocationRange();
      if (locationRange) {
        return this.document.positionFromLocation(locationRange[0]);
      }
    }
    getLocationRange(options2) {
      if (this.targetLocationRange) {
        return this.targetLocationRange;
      } else {
        return this.getSelectionManager().getLocationRange(options2) || normalizeRange({
          index: 0,
          offset: 0
        });
      }
    }
    withTargetLocationRange(locationRange, fn) {
      let result;
      this.targetLocationRange = locationRange;
      try {
        result = fn();
      } finally {
        this.targetLocationRange = null;
      }
      return result;
    }
    withTargetRange(range2, fn) {
      const locationRange = this.document.locationRangeFromRange(range2);
      return this.withTargetLocationRange(locationRange, fn);
    }
    withTargetDOMRange(domRange, fn) {
      const locationRange = this.createLocationRangeFromDOMRange(domRange, {
        strict: false
      });
      return this.withTargetLocationRange(locationRange, fn);
    }
    getExpandedRangeInDirection(direction) {
      let {
        length
      } = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
      let [startPosition, endPosition] = Array.from(this.getSelectedRange());
      if (direction === "backward") {
        if (length) {
          startPosition -= length;
        } else {
          startPosition = this.translateUTF16PositionFromOffset(startPosition, -1);
        }
      } else {
        if (length) {
          endPosition += length;
        } else {
          endPosition = this.translateUTF16PositionFromOffset(endPosition, 1);
        }
      }
      return normalizeRange([startPosition, endPosition]);
    }
    shouldManageMovingCursorInDirection(direction) {
      if (this.editingAttachment) {
        return true;
      }
      const range2 = this.getExpandedRangeInDirection(direction);
      return this.getAttachmentAtRange(range2) != null;
    }
    moveCursorInDirection(direction) {
      let canEditAttachment, range2;
      if (this.editingAttachment) {
        range2 = this.document.getRangeOfAttachment(this.editingAttachment);
      } else {
        const selectedRange = this.getSelectedRange();
        range2 = this.getExpandedRangeInDirection(direction);
        canEditAttachment = !rangesAreEqual(selectedRange, range2);
      }
      if (direction === "backward") {
        this.setSelectedRange(range2[0]);
      } else {
        this.setSelectedRange(range2[1]);
      }
      if (canEditAttachment) {
        const attachment = this.getAttachmentAtRange(range2);
        if (attachment) {
          return this.editAttachment(attachment);
        }
      }
    }
    expandSelectionInDirection(direction) {
      let {
        length
      } = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
      const range2 = this.getExpandedRangeInDirection(direction, {
        length
      });
      return this.setSelectedRange(range2);
    }
    expandSelectionForEditing() {
      if (this.hasCurrentAttribute("href")) {
        return this.expandSelectionAroundCommonAttribute("href");
      }
    }
    expandSelectionAroundCommonAttribute(attributeName) {
      const position = this.getPosition();
      const range2 = this.document.getRangeOfCommonAttributeAtPosition(attributeName, position);
      return this.setSelectedRange(range2);
    }
    selectionContainsAttachments() {
      var _this$getSelectedAtta;
      return ((_this$getSelectedAtta = this.getSelectedAttachments()) === null || _this$getSelectedAtta === void 0 ? void 0 : _this$getSelectedAtta.length) > 0;
    }
    selectionIsInCursorTarget() {
      return this.editingAttachment || this.positionIsCursorTarget(this.getPosition());
    }
    positionIsCursorTarget(position) {
      const location2 = this.document.locationFromPosition(position);
      if (location2) {
        return this.locationIsCursorTarget(location2);
      }
    }
    positionIsBlockBreak(position) {
      var _this$document$getPie;
      return (_this$document$getPie = this.document.getPieceAtPosition(position)) === null || _this$document$getPie === void 0 ? void 0 : _this$document$getPie.isBlockBreak();
    }
    getSelectedDocument() {
      const selectedRange = this.getSelectedRange();
      if (selectedRange) {
        return this.document.getDocumentAtRange(selectedRange);
      }
    }
    getSelectedAttachments() {
      var _this$getSelectedDocu;
      return (_this$getSelectedDocu = this.getSelectedDocument()) === null || _this$getSelectedDocu === void 0 ? void 0 : _this$getSelectedDocu.getAttachments();
    }
    getAttachments() {
      return this.attachments.slice(0);
    }
    refreshAttachments() {
      const attachments2 = this.document.getAttachments();
      const {
        added,
        removed
      } = summarizeArrayChange(this.attachments, attachments2);
      this.attachments = attachments2;
      Array.from(removed).forEach((attachment) => {
        var _this$delegate6, _this$delegate6$compo;
        attachment.delegate = null;
        (_this$delegate6 = this.delegate) === null || _this$delegate6 === void 0 ? void 0 : (_this$delegate6$compo = _this$delegate6.compositionDidRemoveAttachment) === null || _this$delegate6$compo === void 0 ? void 0 : _this$delegate6$compo.call(_this$delegate6, attachment);
      });
      return (() => {
        const result = [];
        Array.from(added).forEach((attachment) => {
          var _this$delegate7, _this$delegate7$compo;
          attachment.delegate = this;
          result.push((_this$delegate7 = this.delegate) === null || _this$delegate7 === void 0 ? void 0 : (_this$delegate7$compo = _this$delegate7.compositionDidAddAttachment) === null || _this$delegate7$compo === void 0 ? void 0 : _this$delegate7$compo.call(_this$delegate7, attachment));
        });
        return result;
      })();
    }
    attachmentDidChangeAttributes(attachment) {
      var _this$delegate8, _this$delegate8$compo;
      this.revision++;
      return (_this$delegate8 = this.delegate) === null || _this$delegate8 === void 0 ? void 0 : (_this$delegate8$compo = _this$delegate8.compositionDidEditAttachment) === null || _this$delegate8$compo === void 0 ? void 0 : _this$delegate8$compo.call(_this$delegate8, attachment);
    }
    attachmentDidChangePreviewURL(attachment) {
      var _this$delegate9, _this$delegate9$compo;
      this.revision++;
      return (_this$delegate9 = this.delegate) === null || _this$delegate9 === void 0 ? void 0 : (_this$delegate9$compo = _this$delegate9.compositionDidChangeAttachmentPreviewURL) === null || _this$delegate9$compo === void 0 ? void 0 : _this$delegate9$compo.call(_this$delegate9, attachment);
    }
    editAttachment(attachment, options2) {
      var _this$delegate10, _this$delegate10$comp;
      if (attachment === this.editingAttachment)
        return;
      this.stopEditingAttachment();
      this.editingAttachment = attachment;
      return (_this$delegate10 = this.delegate) === null || _this$delegate10 === void 0 ? void 0 : (_this$delegate10$comp = _this$delegate10.compositionDidStartEditingAttachment) === null || _this$delegate10$comp === void 0 ? void 0 : _this$delegate10$comp.call(_this$delegate10, this.editingAttachment, options2);
    }
    stopEditingAttachment() {
      var _this$delegate11, _this$delegate11$comp;
      if (!this.editingAttachment)
        return;
      (_this$delegate11 = this.delegate) === null || _this$delegate11 === void 0 ? void 0 : (_this$delegate11$comp = _this$delegate11.compositionDidStopEditingAttachment) === null || _this$delegate11$comp === void 0 ? void 0 : _this$delegate11$comp.call(_this$delegate11, this.editingAttachment);
      this.editingAttachment = null;
    }
    updateAttributesForAttachment(attributes2, attachment) {
      return this.setDocument(this.document.updateAttributesForAttachment(attributes2, attachment));
    }
    removeAttributeForAttachment(attribute, attachment) {
      return this.setDocument(this.document.removeAttributeForAttachment(attribute, attachment));
    }
    breakFormattedBlock(insertion) {
      let {
        document: document2
      } = insertion;
      const {
        block
      } = insertion;
      let position = insertion.startPosition;
      let range2 = [position - 1, position];
      if (block.getBlockBreakPosition() === insertion.startLocation.offset) {
        if (block.breaksOnReturn() && insertion.nextCharacter === "\n") {
          position += 1;
        } else {
          document2 = document2.removeTextAtRange(range2);
        }
        range2 = [position, position];
      } else if (insertion.nextCharacter === "\n") {
        if (insertion.previousCharacter === "\n") {
          range2 = [position - 1, position + 1];
        } else {
          range2 = [position, position + 1];
          position += 1;
        }
      } else if (insertion.startLocation.offset - 1 !== 0) {
        position += 1;
      }
      const newDocument = new Document([block.removeLastAttribute().copyWithoutText()]);
      this.setDocument(document2.insertDocumentAtRange(newDocument, range2));
      return this.setSelection(position);
    }
    getPreviousBlock() {
      const locationRange = this.getLocationRange();
      if (locationRange) {
        const {
          index
        } = locationRange[0];
        if (index > 0) {
          return this.document.getBlockAtIndex(index - 1);
        }
      }
    }
    getBlock() {
      const locationRange = this.getLocationRange();
      if (locationRange) {
        return this.document.getBlockAtIndex(locationRange[0].index);
      }
    }
    getAttachmentAtRange(range2) {
      const document2 = this.document.getDocumentAtRange(range2);
      if (document2.toString() === "".concat(OBJECT_REPLACEMENT_CHARACTER, "\n")) {
        return document2.getAttachments()[0];
      }
    }
    notifyDelegateOfCurrentAttributesChange() {
      var _this$delegate12, _this$delegate12$comp;
      return (_this$delegate12 = this.delegate) === null || _this$delegate12 === void 0 ? void 0 : (_this$delegate12$comp = _this$delegate12.compositionDidChangeCurrentAttributes) === null || _this$delegate12$comp === void 0 ? void 0 : _this$delegate12$comp.call(_this$delegate12, this.currentAttributes);
    }
    notifyDelegateOfInsertionAtRange(range2) {
      var _this$delegate13, _this$delegate13$comp;
      return (_this$delegate13 = this.delegate) === null || _this$delegate13 === void 0 ? void 0 : (_this$delegate13$comp = _this$delegate13.compositionDidPerformInsertionAtRange) === null || _this$delegate13$comp === void 0 ? void 0 : _this$delegate13$comp.call(_this$delegate13, range2);
    }
    translateUTF16PositionFromOffset(position, offset) {
      const utf16string = this.document.toUTF16String();
      const utf16position = utf16string.offsetFromUCS2Offset(position);
      return utf16string.offsetToUCS2Offset(utf16position + offset);
    }
  };
  Composition.proxyMethod("getSelectionManager().getPointRange");
  Composition.proxyMethod("getSelectionManager().setLocationRangeFromPointRange");
  Composition.proxyMethod("getSelectionManager().createLocationRangeFromDOMRange");
  Composition.proxyMethod("getSelectionManager().locationIsCursorTarget");
  Composition.proxyMethod("getSelectionManager().selectionIsExpanded");
  Composition.proxyMethod("delegate?.getSelectionManager");
  var UndoManager = class extends BasicObject {
    constructor(composition) {
      super(...arguments);
      this.composition = composition;
      this.undoEntries = [];
      this.redoEntries = [];
    }
    recordUndoEntry(description) {
      let {
        context,
        consolidatable
      } = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
      const previousEntry = this.undoEntries.slice(-1)[0];
      if (!consolidatable || !entryHasDescriptionAndContext(previousEntry, description, context)) {
        const undoEntry = this.createEntry({
          description,
          context
        });
        this.undoEntries.push(undoEntry);
        this.redoEntries = [];
      }
    }
    undo() {
      const undoEntry = this.undoEntries.pop();
      if (undoEntry) {
        const redoEntry = this.createEntry(undoEntry);
        this.redoEntries.push(redoEntry);
        return this.composition.loadSnapshot(undoEntry.snapshot);
      }
    }
    redo() {
      const redoEntry = this.redoEntries.pop();
      if (redoEntry) {
        const undoEntry = this.createEntry(redoEntry);
        this.undoEntries.push(undoEntry);
        return this.composition.loadSnapshot(redoEntry.snapshot);
      }
    }
    canUndo() {
      return this.undoEntries.length > 0;
    }
    canRedo() {
      return this.redoEntries.length > 0;
    }
    createEntry() {
      let {
        description,
        context
      } = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
      return {
        description: description === null || description === void 0 ? void 0 : description.toString(),
        context: JSON.stringify(context),
        snapshot: this.composition.getSnapshot()
      };
    }
  };
  var entryHasDescriptionAndContext = (entry, description, context) => (entry === null || entry === void 0 ? void 0 : entry.description) === (description === null || description === void 0 ? void 0 : description.toString()) && (entry === null || entry === void 0 ? void 0 : entry.context) === JSON.stringify(context);
  var attachmentGalleryFilter = function(snapshot) {
    const filter = new Filter(snapshot);
    filter.perform();
    return filter.getSnapshot();
  };
  var BLOCK_ATTRIBUTE_NAME = "attachmentGallery";
  var TEXT_ATTRIBUTE_NAME = "presentation";
  var TEXT_ATTRIBUTE_VALUE = "gallery";
  var Filter = class {
    constructor(snapshot) {
      this.document = snapshot.document;
      this.selectedRange = snapshot.selectedRange;
    }
    perform() {
      this.removeBlockAttribute();
      return this.applyBlockAttribute();
    }
    getSnapshot() {
      return {
        document: this.document,
        selectedRange: this.selectedRange
      };
    }
    removeBlockAttribute() {
      return this.findRangesOfBlocks().map((range2) => this.document = this.document.removeAttributeAtRange(BLOCK_ATTRIBUTE_NAME, range2));
    }
    applyBlockAttribute() {
      let offset = 0;
      this.findRangesOfPieces().forEach((range2) => {
        if (range2[1] - range2[0] > 1) {
          range2[0] += offset;
          range2[1] += offset;
          if (this.document.getCharacterAtPosition(range2[1]) !== "\n") {
            this.document = this.document.insertBlockBreakAtRange(range2[1]);
            if (range2[1] < this.selectedRange[1]) {
              this.moveSelectedRangeForward();
            }
            range2[1]++;
            offset++;
          }
          if (range2[0] !== 0) {
            if (this.document.getCharacterAtPosition(range2[0] - 1) !== "\n") {
              this.document = this.document.insertBlockBreakAtRange(range2[0]);
              if (range2[0] < this.selectedRange[0]) {
                this.moveSelectedRangeForward();
              }
              range2[0]++;
              offset++;
            }
          }
          this.document = this.document.applyBlockAttributeAtRange(BLOCK_ATTRIBUTE_NAME, true, range2);
        }
      });
    }
    findRangesOfBlocks() {
      return this.document.findRangesForBlockAttribute(BLOCK_ATTRIBUTE_NAME);
    }
    findRangesOfPieces() {
      return this.document.findRangesForTextAttribute(TEXT_ATTRIBUTE_NAME, {
        withValue: TEXT_ATTRIBUTE_VALUE
      });
    }
    moveSelectedRangeForward() {
      this.selectedRange[0] += 1;
      this.selectedRange[1] += 1;
    }
  };
  var DEFAULT_FILTERS = [attachmentGalleryFilter];
  var Editor = class {
    constructor(composition, selectionManager, element) {
      this.insertFiles = this.insertFiles.bind(this);
      this.composition = composition;
      this.selectionManager = selectionManager;
      this.element = element;
      this.undoManager = new UndoManager(this.composition);
      this.filters = DEFAULT_FILTERS.slice(0);
    }
    loadDocument(document2) {
      return this.loadSnapshot({
        document: document2,
        selectedRange: [0, 0]
      });
    }
    loadHTML() {
      let html2 = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : "";
      const document2 = HTMLParser.parse(html2, {
        referenceElement: this.element
      }).getDocument();
      return this.loadDocument(document2);
    }
    loadJSON(_ref) {
      let {
        document: document2,
        selectedRange
      } = _ref;
      document2 = Document.fromJSON(document2);
      return this.loadSnapshot({
        document: document2,
        selectedRange
      });
    }
    loadSnapshot(snapshot) {
      this.undoManager = new UndoManager(this.composition);
      return this.composition.loadSnapshot(snapshot);
    }
    getDocument() {
      return this.composition.document;
    }
    getSelectedDocument() {
      return this.composition.getSelectedDocument();
    }
    getSnapshot() {
      return this.composition.getSnapshot();
    }
    toJSON() {
      return this.getSnapshot();
    }
    deleteInDirection(direction) {
      return this.composition.deleteInDirection(direction);
    }
    insertAttachment(attachment) {
      return this.composition.insertAttachment(attachment);
    }
    insertAttachments(attachments2) {
      return this.composition.insertAttachments(attachments2);
    }
    insertDocument(document2) {
      return this.composition.insertDocument(document2);
    }
    insertFile(file) {
      return this.composition.insertFile(file);
    }
    insertFiles(files) {
      return this.composition.insertFiles(files);
    }
    insertHTML(html2) {
      return this.composition.insertHTML(html2);
    }
    insertString(string) {
      return this.composition.insertString(string);
    }
    insertText(text) {
      return this.composition.insertText(text);
    }
    insertLineBreak() {
      return this.composition.insertLineBreak();
    }
    getSelectedRange() {
      return this.composition.getSelectedRange();
    }
    getPosition() {
      return this.composition.getPosition();
    }
    getClientRectAtPosition(position) {
      const locationRange = this.getDocument().locationRangeFromRange([position, position + 1]);
      return this.selectionManager.getClientRectAtLocationRange(locationRange);
    }
    expandSelectionInDirection(direction) {
      return this.composition.expandSelectionInDirection(direction);
    }
    moveCursorInDirection(direction) {
      return this.composition.moveCursorInDirection(direction);
    }
    setSelectedRange(selectedRange) {
      return this.composition.setSelectedRange(selectedRange);
    }
    activateAttribute(name) {
      let value = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : true;
      return this.composition.setCurrentAttribute(name, value);
    }
    attributeIsActive(name) {
      return this.composition.hasCurrentAttribute(name);
    }
    canActivateAttribute(name) {
      return this.composition.canSetCurrentAttribute(name);
    }
    deactivateAttribute(name) {
      return this.composition.removeCurrentAttribute(name);
    }
    canDecreaseNestingLevel() {
      return this.composition.canDecreaseNestingLevel();
    }
    canIncreaseNestingLevel() {
      return this.composition.canIncreaseNestingLevel();
    }
    decreaseNestingLevel() {
      if (this.canDecreaseNestingLevel()) {
        return this.composition.decreaseNestingLevel();
      }
    }
    increaseNestingLevel() {
      if (this.canIncreaseNestingLevel()) {
        return this.composition.increaseNestingLevel();
      }
    }
    canRedo() {
      return this.undoManager.canRedo();
    }
    canUndo() {
      return this.undoManager.canUndo();
    }
    recordUndoEntry(description) {
      let {
        context,
        consolidatable
      } = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
      return this.undoManager.recordUndoEntry(description, {
        context,
        consolidatable
      });
    }
    redo() {
      if (this.canRedo()) {
        return this.undoManager.redo();
      }
    }
    undo() {
      if (this.canUndo()) {
        return this.undoManager.undo();
      }
    }
  };
  var LocationMapper = class {
    constructor(element) {
      this.element = element;
    }
    findLocationFromContainerAndOffset(container, offset) {
      let {
        strict
      } = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {
        strict: true
      };
      let childIndex = 0;
      let foundBlock = false;
      const location2 = {
        index: 0,
        offset: 0
      };
      const attachmentElement = this.findAttachmentElementParentForNode(container);
      if (attachmentElement) {
        container = attachmentElement.parentNode;
        offset = findChildIndexOfNode(attachmentElement);
      }
      const walker = walkTree(this.element, {
        usingFilter: rejectAttachmentContents
      });
      while (walker.nextNode()) {
        const node = walker.currentNode;
        if (node === container && nodeIsTextNode(container)) {
          if (!nodeIsCursorTarget(node)) {
            location2.offset += offset;
          }
          break;
        } else {
          if (node.parentNode === container) {
            if (childIndex++ === offset) {
              break;
            }
          } else if (!elementContainsNode(container, node)) {
            if (childIndex > 0) {
              break;
            }
          }
          if (nodeIsBlockStart(node, {
            strict
          })) {
            if (foundBlock) {
              location2.index++;
            }
            location2.offset = 0;
            foundBlock = true;
          } else {
            location2.offset += nodeLength(node);
          }
        }
      }
      return location2;
    }
    findContainerAndOffsetFromLocation(location2) {
      let container, offset;
      if (location2.index === 0 && location2.offset === 0) {
        container = this.element;
        offset = 0;
        while (container.firstChild) {
          container = container.firstChild;
          if (nodeIsBlockContainer(container)) {
            offset = 1;
            break;
          }
        }
        return [container, offset];
      }
      let [node, nodeOffset] = this.findNodeAndOffsetFromLocation(location2);
      if (!node)
        return;
      if (nodeIsTextNode(node)) {
        if (nodeLength(node) === 0) {
          container = node.parentNode.parentNode;
          offset = findChildIndexOfNode(node.parentNode);
          if (nodeIsCursorTarget(node, {
            name: "right"
          })) {
            offset++;
          }
        } else {
          container = node;
          offset = location2.offset - nodeOffset;
        }
      } else {
        container = node.parentNode;
        if (!nodeIsBlockStart(node.previousSibling)) {
          if (!nodeIsBlockContainer(container)) {
            while (node === container.lastChild) {
              node = container;
              container = container.parentNode;
              if (nodeIsBlockContainer(container)) {
                break;
              }
            }
          }
        }
        offset = findChildIndexOfNode(node);
        if (location2.offset !== 0) {
          offset++;
        }
      }
      return [container, offset];
    }
    findNodeAndOffsetFromLocation(location2) {
      let node, nodeOffset;
      let offset = 0;
      for (const currentNode of this.getSignificantNodesForIndex(location2.index)) {
        const length = nodeLength(currentNode);
        if (location2.offset <= offset + length) {
          if (nodeIsTextNode(currentNode)) {
            node = currentNode;
            nodeOffset = offset;
            if (location2.offset === nodeOffset && nodeIsCursorTarget(node)) {
              break;
            }
          } else if (!node) {
            node = currentNode;
            nodeOffset = offset;
          }
        }
        offset += length;
        if (offset > location2.offset) {
          break;
        }
      }
      return [node, nodeOffset];
    }
    findAttachmentElementParentForNode(node) {
      while (node && node !== this.element) {
        if (nodeIsAttachmentElement(node)) {
          return node;
        }
        node = node.parentNode;
      }
    }
    getSignificantNodesForIndex(index) {
      const nodes = [];
      const walker = walkTree(this.element, {
        usingFilter: acceptSignificantNodes
      });
      let recordingNodes = false;
      while (walker.nextNode()) {
        const node = walker.currentNode;
        if (nodeIsBlockStartComment(node)) {
          var blockIndex;
          if (blockIndex != null) {
            blockIndex++;
          } else {
            blockIndex = 0;
          }
          if (blockIndex === index) {
            recordingNodes = true;
          } else if (recordingNodes) {
            break;
          }
        } else if (recordingNodes) {
          nodes.push(node);
        }
      }
      return nodes;
    }
  };
  var nodeLength = function(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (nodeIsCursorTarget(node)) {
        return 0;
      } else {
        const string = node.textContent;
        return string.length;
      }
    } else if (tagName(node) === "br" || nodeIsAttachmentElement(node)) {
      return 1;
    } else {
      return 0;
    }
  };
  var acceptSignificantNodes = function(node) {
    if (rejectEmptyTextNodes(node) === NodeFilter.FILTER_ACCEPT) {
      return rejectAttachmentContents(node);
    } else {
      return NodeFilter.FILTER_REJECT;
    }
  };
  var rejectEmptyTextNodes = function(node) {
    if (nodeIsEmptyTextNode(node)) {
      return NodeFilter.FILTER_REJECT;
    } else {
      return NodeFilter.FILTER_ACCEPT;
    }
  };
  var rejectAttachmentContents = function(node) {
    if (nodeIsAttachmentElement(node.parentNode)) {
      return NodeFilter.FILTER_REJECT;
    } else {
      return NodeFilter.FILTER_ACCEPT;
    }
  };
  var PointMapper = class {
    createDOMRangeFromPoint(_ref) {
      let {
        x,
        y
      } = _ref;
      let domRange;
      if (document.caretPositionFromPoint) {
        const {
          offsetNode,
          offset
        } = document.caretPositionFromPoint(x, y);
        domRange = document.createRange();
        domRange.setStart(offsetNode, offset);
        return domRange;
      } else if (document.caretRangeFromPoint) {
        return document.caretRangeFromPoint(x, y);
      } else if (document.body.createTextRange) {
        const originalDOMRange = getDOMRange();
        try {
          const textRange = document.body.createTextRange();
          textRange.moveToPoint(x, y);
          textRange.select();
        } catch (error4) {
        }
        domRange = getDOMRange();
        setDOMRange(originalDOMRange);
        return domRange;
      }
    }
    getClientRectsForDOMRange(domRange) {
      const array = Array.from(domRange.getClientRects());
      const start3 = array[0];
      const end = array[array.length - 1];
      return [start3, end];
    }
  };
  var SelectionManager = class extends BasicObject {
    constructor(element) {
      super(...arguments);
      this.didMouseDown = this.didMouseDown.bind(this);
      this.selectionDidChange = this.selectionDidChange.bind(this);
      this.element = element;
      this.locationMapper = new LocationMapper(this.element);
      this.pointMapper = new PointMapper();
      this.lockCount = 0;
      handleEvent("mousedown", {
        onElement: this.element,
        withCallback: this.didMouseDown
      });
    }
    getLocationRange() {
      let options2 = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
      if (options2.strict === false) {
        return this.createLocationRangeFromDOMRange(getDOMRange());
      } else if (options2.ignoreLock) {
        return this.currentLocationRange;
      } else if (this.lockedLocationRange) {
        return this.lockedLocationRange;
      } else {
        return this.currentLocationRange;
      }
    }
    setLocationRange(locationRange) {
      if (this.lockedLocationRange)
        return;
      locationRange = normalizeRange(locationRange);
      const domRange = this.createDOMRangeFromLocationRange(locationRange);
      if (domRange) {
        setDOMRange(domRange);
        this.updateCurrentLocationRange(locationRange);
      }
    }
    setLocationRangeFromPointRange(pointRange) {
      pointRange = normalizeRange(pointRange);
      const startLocation = this.getLocationAtPoint(pointRange[0]);
      const endLocation = this.getLocationAtPoint(pointRange[1]);
      this.setLocationRange([startLocation, endLocation]);
    }
    getClientRectAtLocationRange(locationRange) {
      const domRange = this.createDOMRangeFromLocationRange(locationRange);
      if (domRange) {
        return this.getClientRectsForDOMRange(domRange)[1];
      }
    }
    locationIsCursorTarget(location2) {
      const node = Array.from(this.findNodeAndOffsetFromLocation(location2))[0];
      return nodeIsCursorTarget(node);
    }
    lock() {
      if (this.lockCount++ === 0) {
        this.updateCurrentLocationRange();
        this.lockedLocationRange = this.getLocationRange();
      }
    }
    unlock() {
      if (--this.lockCount === 0) {
        const {
          lockedLocationRange
        } = this;
        this.lockedLocationRange = null;
        if (lockedLocationRange != null) {
          return this.setLocationRange(lockedLocationRange);
        }
      }
    }
    clearSelection() {
      var _getDOMSelection;
      return (_getDOMSelection = getDOMSelection()) === null || _getDOMSelection === void 0 ? void 0 : _getDOMSelection.removeAllRanges();
    }
    selectionIsCollapsed() {
      var _getDOMRange;
      return ((_getDOMRange = getDOMRange()) === null || _getDOMRange === void 0 ? void 0 : _getDOMRange.collapsed) === true;
    }
    selectionIsExpanded() {
      return !this.selectionIsCollapsed();
    }
    createLocationRangeFromDOMRange(domRange, options2) {
      if (domRange == null || !this.domRangeWithinElement(domRange))
        return;
      const start3 = this.findLocationFromContainerAndOffset(domRange.startContainer, domRange.startOffset, options2);
      if (!start3)
        return;
      const end = domRange.collapsed ? void 0 : this.findLocationFromContainerAndOffset(domRange.endContainer, domRange.endOffset, options2);
      return normalizeRange([start3, end]);
    }
    didMouseDown() {
      return this.pauseTemporarily();
    }
    pauseTemporarily() {
      let resumeHandlers;
      this.paused = true;
      const resume = () => {
        this.paused = false;
        clearTimeout(resumeTimeout);
        Array.from(resumeHandlers).forEach((handler) => {
          handler.destroy();
        });
        if (elementContainsNode(document, this.element)) {
          return this.selectionDidChange();
        }
      };
      const resumeTimeout = setTimeout(resume, 200);
      resumeHandlers = ["mousemove", "keydown"].map((eventName) => handleEvent(eventName, {
        onElement: document,
        withCallback: resume
      }));
    }
    selectionDidChange() {
      if (!this.paused && !innerElementIsActive(this.element)) {
        return this.updateCurrentLocationRange();
      }
    }
    updateCurrentLocationRange(locationRange) {
      if (locationRange != null ? locationRange : locationRange = this.createLocationRangeFromDOMRange(getDOMRange())) {
        if (!rangesAreEqual(locationRange, this.currentLocationRange)) {
          var _this$delegate, _this$delegate$locati;
          this.currentLocationRange = locationRange;
          return (_this$delegate = this.delegate) === null || _this$delegate === void 0 ? void 0 : (_this$delegate$locati = _this$delegate.locationRangeDidChange) === null || _this$delegate$locati === void 0 ? void 0 : _this$delegate$locati.call(_this$delegate, this.currentLocationRange.slice(0));
        }
      }
    }
    createDOMRangeFromLocationRange(locationRange) {
      const rangeStart = this.findContainerAndOffsetFromLocation(locationRange[0]);
      const rangeEnd = rangeIsCollapsed(locationRange) ? rangeStart : this.findContainerAndOffsetFromLocation(locationRange[1]) || rangeStart;
      if (rangeStart != null && rangeEnd != null) {
        const domRange = document.createRange();
        domRange.setStart(...Array.from(rangeStart || []));
        domRange.setEnd(...Array.from(rangeEnd || []));
        return domRange;
      }
    }
    getLocationAtPoint(point) {
      const domRange = this.createDOMRangeFromPoint(point);
      if (domRange) {
        var _this$createLocationR;
        return (_this$createLocationR = this.createLocationRangeFromDOMRange(domRange)) === null || _this$createLocationR === void 0 ? void 0 : _this$createLocationR[0];
      }
    }
    domRangeWithinElement(domRange) {
      if (domRange.collapsed) {
        return elementContainsNode(this.element, domRange.startContainer);
      } else {
        return elementContainsNode(this.element, domRange.startContainer) && elementContainsNode(this.element, domRange.endContainer);
      }
    }
  };
  SelectionManager.proxyMethod("locationMapper.findLocationFromContainerAndOffset");
  SelectionManager.proxyMethod("locationMapper.findContainerAndOffsetFromLocation");
  SelectionManager.proxyMethod("locationMapper.findNodeAndOffsetFromLocation");
  SelectionManager.proxyMethod("pointMapper.createDOMRangeFromPoint");
  SelectionManager.proxyMethod("pointMapper.getClientRectsForDOMRange");
  var models = {
    Attachment,
    AttachmentManager,
    AttachmentPiece,
    Block,
    Composition,
    Cocument: Document,
    Editor,
    HTMLParser,
    HTMLSanitizer,
    LineBreakInsertion,
    LocationMapper,
    ManagedAttachment,
    Piece,
    PointMapper,
    SelectionManager,
    SplittableList,
    StringPiece,
    Text,
    UndoManager
  };
  var Trix = {
    VERSION: version2,
    config
  };
  Object.assign(Trix, models);
  window.Trix = Trix;
  var ObjectGroup = class {
    static groupObjects() {
      let ungroupedObjects = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : [];
      let {
        depth,
        asTree
      } = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
      let group;
      if (asTree) {
        if (depth == null) {
          depth = 0;
        }
      }
      const objects = [];
      Array.from(ungroupedObjects).forEach((object2) => {
        var _object$canBeGrouped2;
        if (group) {
          var _object$canBeGrouped, _group$canBeGroupedWi, _group;
          if ((_object$canBeGrouped = object2.canBeGrouped) !== null && _object$canBeGrouped !== void 0 && _object$canBeGrouped.call(object2, depth) && (_group$canBeGroupedWi = (_group = group[group.length - 1]).canBeGroupedWith) !== null && _group$canBeGroupedWi !== void 0 && _group$canBeGroupedWi.call(_group, object2, depth)) {
            group.push(object2);
            return;
          } else {
            objects.push(new this(group, {
              depth,
              asTree
            }));
            group = null;
          }
        }
        if ((_object$canBeGrouped2 = object2.canBeGrouped) !== null && _object$canBeGrouped2 !== void 0 && _object$canBeGrouped2.call(object2, depth)) {
          group = [object2];
        } else {
          objects.push(object2);
        }
      });
      if (group) {
        objects.push(new this(group, {
          depth,
          asTree
        }));
      }
      return objects;
    }
    constructor() {
      let objects = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : [];
      let {
        depth,
        asTree
      } = arguments.length > 1 ? arguments[1] : void 0;
      this.objects = objects;
      if (asTree) {
        this.depth = depth;
        this.objects = this.constructor.groupObjects(this.objects, {
          asTree,
          depth: this.depth + 1
        });
      }
    }
    getObjects() {
      return this.objects;
    }
    getDepth() {
      return this.depth;
    }
    getCacheKey() {
      const keys = ["objectGroup"];
      Array.from(this.getObjects()).forEach((object2) => {
        keys.push(object2.getCacheKey());
      });
      return keys.join("/");
    }
  };
  var ElementStore = class {
    constructor(elements) {
      this.reset(elements);
    }
    add(element) {
      const key = getKey(element);
      this.elements[key] = element;
    }
    remove(element) {
      const key = getKey(element);
      const value = this.elements[key];
      if (value) {
        delete this.elements[key];
        return value;
      }
    }
    reset() {
      let elements = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : [];
      this.elements = {};
      Array.from(elements).forEach((element) => {
        this.add(element);
      });
      return elements;
    }
  };
  var getKey = (element) => element.dataset.trixStoreKey;
  var ObjectView = class extends BasicObject {
    constructor(object2) {
      let options2 = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
      super(...arguments);
      this.object = object2;
      this.options = options2;
      this.childViews = [];
      this.rootView = this;
    }
    getNodes() {
      if (!this.nodes) {
        this.nodes = this.createNodes();
      }
      return this.nodes.map((node) => node.cloneNode(true));
    }
    invalidate() {
      var _this$parentView;
      this.nodes = null;
      this.childViews = [];
      return (_this$parentView = this.parentView) === null || _this$parentView === void 0 ? void 0 : _this$parentView.invalidate();
    }
    invalidateViewForObject(object2) {
      var _this$findViewForObje;
      return (_this$findViewForObje = this.findViewForObject(object2)) === null || _this$findViewForObje === void 0 ? void 0 : _this$findViewForObje.invalidate();
    }
    findOrCreateCachedChildView(viewClass, object2, options2) {
      let view = this.getCachedViewForObject(object2);
      if (view) {
        this.recordChildView(view);
      } else {
        view = this.createChildView(...arguments);
        this.cacheViewForObject(view, object2);
      }
      return view;
    }
    createChildView(viewClass, object2) {
      let options2 = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {};
      if (object2 instanceof ObjectGroup) {
        options2.viewClass = viewClass;
        viewClass = ObjectGroupView;
      }
      const view = new viewClass(object2, options2);
      return this.recordChildView(view);
    }
    recordChildView(view) {
      view.parentView = this;
      view.rootView = this.rootView;
      this.childViews.push(view);
      return view;
    }
    getAllChildViews() {
      let views = [];
      this.childViews.forEach((childView) => {
        views.push(childView);
        views = views.concat(childView.getAllChildViews());
      });
      return views;
    }
    findElement() {
      return this.findElementForObject(this.object);
    }
    findElementForObject(object2) {
      const id2 = object2 === null || object2 === void 0 ? void 0 : object2.id;
      if (id2) {
        return this.rootView.element.querySelector("[data-trix-id='".concat(id2, "']"));
      }
    }
    findViewForObject(object2) {
      for (const view of this.getAllChildViews()) {
        if (view.object === object2) {
          return view;
        }
      }
    }
    getViewCache() {
      if (this.rootView === this) {
        if (this.isViewCachingEnabled()) {
          if (!this.viewCache) {
            this.viewCache = {};
          }
          return this.viewCache;
        }
      } else {
        return this.rootView.getViewCache();
      }
    }
    isViewCachingEnabled() {
      return this.shouldCacheViews !== false;
    }
    enableViewCaching() {
      this.shouldCacheViews = true;
    }
    disableViewCaching() {
      this.shouldCacheViews = false;
    }
    getCachedViewForObject(object2) {
      var _this$getViewCache;
      return (_this$getViewCache = this.getViewCache()) === null || _this$getViewCache === void 0 ? void 0 : _this$getViewCache[object2.getCacheKey()];
    }
    cacheViewForObject(view, object2) {
      const cache2 = this.getViewCache();
      if (cache2) {
        cache2[object2.getCacheKey()] = view;
      }
    }
    garbageCollectCachedViews() {
      const cache2 = this.getViewCache();
      if (cache2) {
        const views = this.getAllChildViews().concat(this);
        const objectKeys = views.map((view) => view.object.getCacheKey());
        for (const key in cache2) {
          if (!objectKeys.includes(key)) {
            delete cache2[key];
          }
        }
      }
    }
  };
  var ObjectGroupView = class extends ObjectView {
    constructor() {
      super(...arguments);
      this.objectGroup = this.object;
      this.viewClass = this.options.viewClass;
      delete this.options.viewClass;
    }
    getChildViews() {
      if (!this.childViews.length) {
        Array.from(this.objectGroup.getObjects()).forEach((object2) => {
          this.findOrCreateCachedChildView(this.viewClass, object2, this.options);
        });
      }
      return this.childViews;
    }
    createNodes() {
      const element = this.createContainerElement();
      this.getChildViews().forEach((view) => {
        Array.from(view.getNodes()).forEach((node) => {
          element.appendChild(node);
        });
      });
      return [element];
    }
    createContainerElement() {
      let depth = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : this.objectGroup.getDepth();
      return this.getChildViews()[0].createContainerElement(depth);
    }
  };
  var {
    css: css$2
  } = config;
  var AttachmentView = class extends ObjectView {
    constructor() {
      super(...arguments);
      this.attachment = this.object;
      this.attachment.uploadProgressDelegate = this;
      this.attachmentPiece = this.options.piece;
    }
    createContentNodes() {
      return [];
    }
    createNodes() {
      let innerElement;
      const figure = innerElement = makeElement({
        tagName: "figure",
        className: this.getClassName(),
        data: this.getData(),
        editable: false
      });
      const href = this.getHref();
      if (href) {
        innerElement = makeElement({
          tagName: "a",
          editable: false,
          attributes: {
            href,
            tabindex: -1
          }
        });
        figure.appendChild(innerElement);
      }
      if (this.attachment.hasContent()) {
        innerElement.innerHTML = this.attachment.getContent();
      } else {
        this.createContentNodes().forEach((node) => {
          innerElement.appendChild(node);
        });
      }
      innerElement.appendChild(this.createCaptionElement());
      if (this.attachment.isPending()) {
        this.progressElement = makeElement({
          tagName: "progress",
          attributes: {
            class: css$2.attachmentProgress,
            value: this.attachment.getUploadProgress(),
            max: 100
          },
          data: {
            trixMutable: true,
            trixStoreKey: ["progressElement", this.attachment.id].join("/")
          }
        });
        figure.appendChild(this.progressElement);
      }
      return [createCursorTarget("left"), figure, createCursorTarget("right")];
    }
    createCaptionElement() {
      const figcaption = makeElement({
        tagName: "figcaption",
        className: css$2.attachmentCaption
      });
      const caption = this.attachmentPiece.getCaption();
      if (caption) {
        figcaption.classList.add("".concat(css$2.attachmentCaption, "--edited"));
        figcaption.textContent = caption;
      } else {
        let name, size;
        const captionConfig = this.getCaptionConfig();
        if (captionConfig.name) {
          name = this.attachment.getFilename();
        }
        if (captionConfig.size) {
          size = this.attachment.getFormattedFilesize();
        }
        if (name) {
          const nameElement = makeElement({
            tagName: "span",
            className: css$2.attachmentName,
            textContent: name
          });
          figcaption.appendChild(nameElement);
        }
        if (size) {
          if (name) {
            figcaption.appendChild(document.createTextNode(" "));
          }
          const sizeElement = makeElement({
            tagName: "span",
            className: css$2.attachmentSize,
            textContent: size
          });
          figcaption.appendChild(sizeElement);
        }
      }
      return figcaption;
    }
    getClassName() {
      const names = [css$2.attachment, "".concat(css$2.attachment, "--").concat(this.attachment.getType())];
      const extension = this.attachment.getExtension();
      if (extension) {
        names.push("".concat(css$2.attachment, "--").concat(extension));
      }
      return names.join(" ");
    }
    getData() {
      const data2 = {
        trixAttachment: JSON.stringify(this.attachment),
        trixContentType: this.attachment.getContentType(),
        trixId: this.attachment.id
      };
      const {
        attributes: attributes2
      } = this.attachmentPiece;
      if (!attributes2.isEmpty()) {
        data2.trixAttributes = JSON.stringify(attributes2);
      }
      if (this.attachment.isPending()) {
        data2.trixSerialize = false;
      }
      return data2;
    }
    getHref() {
      if (!htmlContainsTagName(this.attachment.getContent(), "a")) {
        return this.attachment.getHref();
      }
    }
    getCaptionConfig() {
      var _config$attachments$t;
      const type = this.attachment.getType();
      const captionConfig = copyObject((_config$attachments$t = config.attachments[type]) === null || _config$attachments$t === void 0 ? void 0 : _config$attachments$t.caption);
      if (type === "file") {
        captionConfig.name = true;
      }
      return captionConfig;
    }
    findProgressElement() {
      var _this$findElement;
      return (_this$findElement = this.findElement()) === null || _this$findElement === void 0 ? void 0 : _this$findElement.querySelector("progress");
    }
    attachmentDidChangeUploadProgress() {
      const value = this.attachment.getUploadProgress();
      const progressElement = this.findProgressElement();
      if (progressElement) {
        progressElement.value = value;
      }
    }
  };
  var createCursorTarget = (name) => makeElement({
    tagName: "span",
    textContent: ZERO_WIDTH_SPACE,
    data: {
      trixCursorTarget: name,
      trixSerialize: false
    }
  });
  var htmlContainsTagName = function(html2, tagName2) {
    const div = makeElement("div");
    div.innerHTML = html2 || "";
    return div.querySelector(tagName2);
  };
  var PreviewableAttachmentView = class extends AttachmentView {
    constructor() {
      super(...arguments);
      this.attachment.previewDelegate = this;
    }
    createContentNodes() {
      this.image = makeElement({
        tagName: "img",
        attributes: {
          src: ""
        },
        data: {
          trixMutable: true
        }
      });
      this.refresh(this.image);
      return [this.image];
    }
    createCaptionElement() {
      const figcaption = super.createCaptionElement(...arguments);
      if (!figcaption.textContent) {
        figcaption.setAttribute("data-trix-placeholder", config.lang.captionPlaceholder);
      }
      return figcaption;
    }
    refresh(image) {
      if (!image) {
        var _this$findElement;
        image = (_this$findElement = this.findElement()) === null || _this$findElement === void 0 ? void 0 : _this$findElement.querySelector("img");
      }
      if (image) {
        return this.updateAttributesForImage(image);
      }
    }
    updateAttributesForImage(image) {
      const url2 = this.attachment.getURL();
      const previewURL = this.attachment.getPreviewURL();
      image.src = previewURL || url2;
      if (previewURL === url2) {
        image.removeAttribute("data-trix-serialized-attributes");
      } else {
        const serializedAttributes = JSON.stringify({
          src: url2
        });
        image.setAttribute("data-trix-serialized-attributes", serializedAttributes);
      }
      const width = this.attachment.getWidth();
      const height = this.attachment.getHeight();
      if (width != null) {
        image.width = width;
      }
      if (height != null) {
        image.height = height;
      }
      const storeKey = ["imageElement", this.attachment.id, image.src, image.width, image.height].join("/");
      image.dataset.trixStoreKey = storeKey;
    }
    attachmentDidChangeAttributes() {
      this.refresh(this.image);
      return this.refresh();
    }
  };
  var PieceView = class extends ObjectView {
    constructor() {
      super(...arguments);
      this.piece = this.object;
      this.attributes = this.piece.getAttributes();
      this.textConfig = this.options.textConfig;
      this.context = this.options.context;
      if (this.piece.attachment) {
        this.attachment = this.piece.attachment;
      } else {
        this.string = this.piece.toString();
      }
    }
    createNodes() {
      let nodes = this.attachment ? this.createAttachmentNodes() : this.createStringNodes();
      const element = this.createElement();
      if (element) {
        const innerElement = findInnerElement(element);
        Array.from(nodes).forEach((node) => {
          innerElement.appendChild(node);
        });
        nodes = [element];
      }
      return nodes;
    }
    createAttachmentNodes() {
      const constructor = this.attachment.isPreviewable() ? PreviewableAttachmentView : AttachmentView;
      const view = this.createChildView(constructor, this.piece.attachment, {
        piece: this.piece
      });
      return view.getNodes();
    }
    createStringNodes() {
      var _this$textConfig;
      if ((_this$textConfig = this.textConfig) !== null && _this$textConfig !== void 0 && _this$textConfig.plaintext) {
        return [document.createTextNode(this.string)];
      } else {
        const nodes = [];
        const iterable = this.string.split("\n");
        for (let index = 0; index < iterable.length; index++) {
          const substring = iterable[index];
          if (index > 0) {
            const element = makeElement("br");
            nodes.push(element);
          }
          if (substring.length) {
            const node = document.createTextNode(this.preserveSpaces(substring));
            nodes.push(node);
          }
        }
        return nodes;
      }
    }
    createElement() {
      let element, key, value;
      const styles = {};
      for (key in this.attributes) {
        value = this.attributes[key];
        const config2 = getTextConfig(key);
        if (config2) {
          if (config2.tagName) {
            var innerElement;
            const pendingElement = makeElement(config2.tagName);
            if (innerElement) {
              innerElement.appendChild(pendingElement);
              innerElement = pendingElement;
            } else {
              element = innerElement = pendingElement;
            }
          }
          if (config2.styleProperty) {
            styles[config2.styleProperty] = value;
          }
          if (config2.style) {
            for (key in config2.style) {
              value = config2.style[key];
              styles[key] = value;
            }
          }
        }
      }
      if (Object.keys(styles).length) {
        if (!element) {
          element = makeElement("span");
        }
        for (key in styles) {
          value = styles[key];
          element.style[key] = value;
        }
      }
      return element;
    }
    createContainerElement() {
      for (const key in this.attributes) {
        const value = this.attributes[key];
        const config2 = getTextConfig(key);
        if (config2) {
          if (config2.groupTagName) {
            const attributes2 = {};
            attributes2[key] = value;
            return makeElement(config2.groupTagName, attributes2);
          }
        }
      }
    }
    preserveSpaces(string) {
      if (this.context.isLast) {
        string = string.replace(/\ $/, NON_BREAKING_SPACE);
      }
      string = string.replace(/(\S)\ {3}(\S)/g, "$1 ".concat(NON_BREAKING_SPACE, " $2")).replace(/\ {2}/g, "".concat(NON_BREAKING_SPACE, " ")).replace(/\ {2}/g, " ".concat(NON_BREAKING_SPACE));
      if (this.context.isFirst || this.context.followsWhitespace) {
        string = string.replace(/^\ /, NON_BREAKING_SPACE);
      }
      return string;
    }
  };
  var TextView = class extends ObjectView {
    constructor() {
      super(...arguments);
      this.text = this.object;
      this.textConfig = this.options.textConfig;
    }
    createNodes() {
      const nodes = [];
      const pieces = ObjectGroup.groupObjects(this.getPieces());
      const lastIndex = pieces.length - 1;
      for (let index = 0; index < pieces.length; index++) {
        const piece = pieces[index];
        const context = {};
        if (index === 0) {
          context.isFirst = true;
        }
        if (index === lastIndex) {
          context.isLast = true;
        }
        if (endsWithWhitespace(previousPiece)) {
          context.followsWhitespace = true;
        }
        const view = this.findOrCreateCachedChildView(PieceView, piece, {
          textConfig: this.textConfig,
          context
        });
        nodes.push(...Array.from(view.getNodes() || []));
        var previousPiece = piece;
      }
      return nodes;
    }
    getPieces() {
      return Array.from(this.text.getPieces()).filter((piece) => !piece.hasAttribute("blockBreak"));
    }
  };
  var endsWithWhitespace = (piece) => /\s$/.test(piece === null || piece === void 0 ? void 0 : piece.toString());
  var {
    css: css$1
  } = config;
  var BlockView = class extends ObjectView {
    constructor() {
      super(...arguments);
      this.block = this.object;
      this.attributes = this.block.getAttributes();
    }
    createNodes() {
      const comment = document.createComment("block");
      const nodes = [comment];
      if (this.block.isEmpty()) {
        nodes.push(makeElement("br"));
      } else {
        var _getBlockConfig;
        const textConfig = (_getBlockConfig = getBlockConfig(this.block.getLastAttribute())) === null || _getBlockConfig === void 0 ? void 0 : _getBlockConfig.text;
        const textView = this.findOrCreateCachedChildView(TextView, this.block.text, {
          textConfig
        });
        nodes.push(...Array.from(textView.getNodes() || []));
        if (this.shouldAddExtraNewlineElement()) {
          nodes.push(makeElement("br"));
        }
      }
      if (this.attributes.length) {
        return nodes;
      } else {
        let attributes2;
        const {
          tagName: tagName2
        } = config.blockAttributes.default;
        if (this.block.isRTL()) {
          attributes2 = {
            dir: "rtl"
          };
        }
        const element = makeElement({
          tagName: tagName2,
          attributes: attributes2
        });
        nodes.forEach((node) => element.appendChild(node));
        return [element];
      }
    }
    createContainerElement(depth) {
      let attributes2, className;
      const attributeName = this.attributes[depth];
      const {
        tagName: tagName2
      } = getBlockConfig(attributeName);
      if (depth === 0 && this.block.isRTL()) {
        attributes2 = {
          dir: "rtl"
        };
      }
      if (attributeName === "attachmentGallery") {
        const size = this.block.getBlockBreakPosition();
        className = "".concat(css$1.attachmentGallery, " ").concat(css$1.attachmentGallery, "--").concat(size);
      }
      return makeElement({
        tagName: tagName2,
        className,
        attributes: attributes2
      });
    }
    shouldAddExtraNewlineElement() {
      return /\n\n$/.test(this.block.toString());
    }
  };
  var DocumentView = class extends ObjectView {
    static render(document2) {
      const element = makeElement("div");
      const view = new this(document2, {
        element
      });
      view.render();
      view.sync();
      return element;
    }
    constructor() {
      super(...arguments);
      this.element = this.options.element;
      this.elementStore = new ElementStore();
      this.setDocument(this.object);
    }
    setDocument(document2) {
      if (!document2.isEqualTo(this.document)) {
        this.document = this.object = document2;
      }
    }
    render() {
      this.childViews = [];
      this.shadowElement = makeElement("div");
      if (!this.document.isEmpty()) {
        const objects = ObjectGroup.groupObjects(this.document.getBlocks(), {
          asTree: true
        });
        Array.from(objects).forEach((object2) => {
          const view = this.findOrCreateCachedChildView(BlockView, object2);
          Array.from(view.getNodes()).map((node) => this.shadowElement.appendChild(node));
        });
      }
    }
    isSynced() {
      return elementsHaveEqualHTML(this.shadowElement, this.element);
    }
    sync() {
      const fragment = this.createDocumentFragmentForSync();
      while (this.element.lastChild) {
        this.element.removeChild(this.element.lastChild);
      }
      this.element.appendChild(fragment);
      return this.didSync();
    }
    didSync() {
      this.elementStore.reset(findStoredElements(this.element));
      return defer(() => this.garbageCollectCachedViews());
    }
    createDocumentFragmentForSync() {
      const fragment = document.createDocumentFragment();
      Array.from(this.shadowElement.childNodes).forEach((node) => {
        fragment.appendChild(node.cloneNode(true));
      });
      Array.from(findStoredElements(fragment)).forEach((element) => {
        const storedElement = this.elementStore.remove(element);
        if (storedElement) {
          element.parentNode.replaceChild(storedElement, element);
        }
      });
      return fragment;
    }
  };
  var findStoredElements = (element) => element.querySelectorAll("[data-trix-store-key]");
  var elementsHaveEqualHTML = (element, otherElement) => ignoreSpaces(element.innerHTML) === ignoreSpaces(otherElement.innerHTML);
  var ignoreSpaces = (html2) => html2.replace(/&nbsp;/g, " ");
  var unserializableElementSelector = "[data-trix-serialize=false]";
  var unserializableAttributeNames = ["contenteditable", "data-trix-id", "data-trix-store-key", "data-trix-mutable", "data-trix-placeholder", "tabindex"];
  var serializedAttributesAttribute = "data-trix-serialized-attributes";
  var serializedAttributesSelector = "[".concat(serializedAttributesAttribute, "]");
  var blockCommentPattern = new RegExp("<!--block-->", "g");
  var serializers = {
    "application/json": function(serializable) {
      let document2;
      if (serializable instanceof Document) {
        document2 = serializable;
      } else if (serializable instanceof HTMLElement) {
        document2 = HTMLParser.parse(serializable.innerHTML).getDocument();
      } else {
        throw new Error("unserializable object");
      }
      return document2.toSerializableDocument().toJSONString();
    },
    "text/html": function(serializable) {
      let element;
      if (serializable instanceof Document) {
        element = DocumentView.render(serializable);
      } else if (serializable instanceof HTMLElement) {
        element = serializable.cloneNode(true);
      } else {
        throw new Error("unserializable object");
      }
      Array.from(element.querySelectorAll(unserializableElementSelector)).forEach((el) => {
        removeNode(el);
      });
      unserializableAttributeNames.forEach((attribute) => {
        Array.from(element.querySelectorAll("[".concat(attribute, "]"))).forEach((el) => {
          el.removeAttribute(attribute);
        });
      });
      Array.from(element.querySelectorAll(serializedAttributesSelector)).forEach((el) => {
        try {
          const attributes2 = JSON.parse(el.getAttribute(serializedAttributesAttribute));
          el.removeAttribute(serializedAttributesAttribute);
          for (const name in attributes2) {
            const value = attributes2[name];
            el.setAttribute(name, value);
          }
        } catch (error4) {
        }
      });
      return element.innerHTML.replace(blockCommentPattern, "");
    }
  };
  var serializeToContentType = function(serializable, contentType) {
    const serializer = serializers[contentType];
    if (serializer) {
      return serializer(serializable);
    } else {
      throw new Error("unknown content type: ".concat(contentType));
    }
  };
  var mutableAttributeName = "data-trix-mutable";
  var mutableSelector = "[".concat(mutableAttributeName, "]");
  var options = {
    attributes: true,
    childList: true,
    characterData: true,
    characterDataOldValue: true,
    subtree: true
  };
  var MutationObserver2 = class extends BasicObject {
    constructor(element) {
      super(element);
      this.didMutate = this.didMutate.bind(this);
      this.element = element;
      this.observer = new window.MutationObserver(this.didMutate);
      this.start();
    }
    start() {
      this.reset();
      return this.observer.observe(this.element, options);
    }
    stop() {
      return this.observer.disconnect();
    }
    didMutate(mutations) {
      this.mutations.push(...Array.from(this.findSignificantMutations(mutations) || []));
      if (this.mutations.length) {
        var _this$delegate, _this$delegate$elemen;
        (_this$delegate = this.delegate) === null || _this$delegate === void 0 ? void 0 : (_this$delegate$elemen = _this$delegate.elementDidMutate) === null || _this$delegate$elemen === void 0 ? void 0 : _this$delegate$elemen.call(_this$delegate, this.getMutationSummary());
        return this.reset();
      }
    }
    reset() {
      this.mutations = [];
    }
    findSignificantMutations(mutations) {
      return mutations.filter((mutation) => {
        return this.mutationIsSignificant(mutation);
      });
    }
    mutationIsSignificant(mutation) {
      if (this.nodeIsMutable(mutation.target)) {
        return false;
      }
      for (const node of Array.from(this.nodesModifiedByMutation(mutation))) {
        if (this.nodeIsSignificant(node))
          return true;
      }
      return false;
    }
    nodeIsSignificant(node) {
      return node !== this.element && !this.nodeIsMutable(node) && !nodeIsEmptyTextNode(node);
    }
    nodeIsMutable(node) {
      return findClosestElementFromNode(node, {
        matchingSelector: mutableSelector
      });
    }
    nodesModifiedByMutation(mutation) {
      const nodes = [];
      switch (mutation.type) {
        case "attributes":
          if (mutation.attributeName !== mutableAttributeName) {
            nodes.push(mutation.target);
          }
          break;
        case "characterData":
          nodes.push(mutation.target.parentNode);
          nodes.push(mutation.target);
          break;
        case "childList":
          nodes.push(...Array.from(mutation.addedNodes || []));
          nodes.push(...Array.from(mutation.removedNodes || []));
          break;
      }
      return nodes;
    }
    getMutationSummary() {
      return this.getTextMutationSummary();
    }
    getTextMutationSummary() {
      const {
        additions,
        deletions
      } = this.getTextChangesFromCharacterData();
      const textChanges = this.getTextChangesFromChildList();
      Array.from(textChanges.additions).forEach((addition) => {
        if (!Array.from(additions).includes(addition)) {
          additions.push(addition);
        }
      });
      deletions.push(...Array.from(textChanges.deletions || []));
      const summary = {};
      const added = additions.join("");
      if (added) {
        summary.textAdded = added;
      }
      const deleted = deletions.join("");
      if (deleted) {
        summary.textDeleted = deleted;
      }
      return summary;
    }
    getMutationsByType(type) {
      return Array.from(this.mutations).filter((mutation) => mutation.type === type);
    }
    getTextChangesFromChildList() {
      let textAdded, textRemoved;
      const addedNodes = [];
      const removedNodes = [];
      Array.from(this.getMutationsByType("childList")).forEach((mutation) => {
        addedNodes.push(...Array.from(mutation.addedNodes || []));
        removedNodes.push(...Array.from(mutation.removedNodes || []));
      });
      const singleBlockCommentRemoved = addedNodes.length === 0 && removedNodes.length === 1 && nodeIsBlockStartComment(removedNodes[0]);
      if (singleBlockCommentRemoved) {
        textAdded = [];
        textRemoved = ["\n"];
      } else {
        textAdded = getTextForNodes(addedNodes);
        textRemoved = getTextForNodes(removedNodes);
      }
      const additions = textAdded.filter((text, index) => text !== textRemoved[index]).map(normalizeSpaces);
      const deletions = textRemoved.filter((text, index) => text !== textAdded[index]).map(normalizeSpaces);
      return {
        additions,
        deletions
      };
    }
    getTextChangesFromCharacterData() {
      let added, removed;
      const characterMutations = this.getMutationsByType("characterData");
      if (characterMutations.length) {
        const startMutation = characterMutations[0], endMutation = characterMutations[characterMutations.length - 1];
        const oldString = normalizeSpaces(startMutation.oldValue);
        const newString = normalizeSpaces(endMutation.target.data);
        const summarized = summarizeStringChange(oldString, newString);
        added = summarized.added;
        removed = summarized.removed;
      }
      return {
        additions: added ? [added] : [],
        deletions: removed ? [removed] : []
      };
    }
  };
  var getTextForNodes = function() {
    let nodes = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : [];
    const text = [];
    for (const node of Array.from(nodes)) {
      switch (node.nodeType) {
        case Node.TEXT_NODE:
          text.push(node.data);
          break;
        case Node.ELEMENT_NODE:
          if (tagName(node) === "br") {
            text.push("\n");
          } else {
            text.push(...Array.from(getTextForNodes(node.childNodes) || []));
          }
          break;
      }
    }
    return text;
  };
  var Controller3 = class extends BasicObject {
  };
  var FileVerificationOperation = class extends Operation {
    constructor(file) {
      super(...arguments);
      this.file = file;
    }
    perform(callback) {
      const reader = new FileReader();
      reader.onerror = () => callback(false);
      reader.onload = () => {
        reader.onerror = null;
        try {
          reader.abort();
        } catch (error4) {
        }
        return callback(true, this.file);
      };
      return reader.readAsArrayBuffer(this.file);
    }
  };
  var InputController = class extends BasicObject {
    constructor(element) {
      super(...arguments);
      this.element = element;
      this.mutationObserver = new MutationObserver2(this.element);
      this.mutationObserver.delegate = this;
      for (const eventName in this.constructor.events) {
        handleEvent(eventName, {
          onElement: this.element,
          withCallback: this.handlerFor(eventName)
        });
      }
    }
    elementDidMutate(mutationSummary) {
    }
    editorWillSyncDocumentView() {
      return this.mutationObserver.stop();
    }
    editorDidSyncDocumentView() {
      return this.mutationObserver.start();
    }
    requestRender() {
      var _this$delegate, _this$delegate$inputC;
      return (_this$delegate = this.delegate) === null || _this$delegate === void 0 ? void 0 : (_this$delegate$inputC = _this$delegate.inputControllerDidRequestRender) === null || _this$delegate$inputC === void 0 ? void 0 : _this$delegate$inputC.call(_this$delegate);
    }
    requestReparse() {
      var _this$delegate2, _this$delegate2$input;
      (_this$delegate2 = this.delegate) === null || _this$delegate2 === void 0 ? void 0 : (_this$delegate2$input = _this$delegate2.inputControllerDidRequestReparse) === null || _this$delegate2$input === void 0 ? void 0 : _this$delegate2$input.call(_this$delegate2);
      return this.requestRender();
    }
    attachFiles(files) {
      const operations2 = Array.from(files).map((file) => new FileVerificationOperation(file));
      return Promise.all(operations2).then((files2) => {
        this.handleInput(function() {
          var _this$delegate3, _this$responder;
          (_this$delegate3 = this.delegate) === null || _this$delegate3 === void 0 ? void 0 : _this$delegate3.inputControllerWillAttachFiles();
          (_this$responder = this.responder) === null || _this$responder === void 0 ? void 0 : _this$responder.insertFiles(files2);
          return this.requestRender();
        });
      });
    }
    handlerFor(eventName) {
      return (event) => {
        if (!event.defaultPrevented) {
          this.handleInput(() => {
            if (!innerElementIsActive(this.element)) {
              this.eventName = eventName;
              this.constructor.events[eventName].call(this, event);
            }
          });
        }
      };
    }
    handleInput(callback) {
      try {
        var _this$delegate4;
        (_this$delegate4 = this.delegate) === null || _this$delegate4 === void 0 ? void 0 : _this$delegate4.inputControllerWillHandleInput();
        callback.call(this);
      } finally {
        var _this$delegate5;
        (_this$delegate5 = this.delegate) === null || _this$delegate5 === void 0 ? void 0 : _this$delegate5.inputControllerDidHandleInput();
      }
    }
    createLinkHTML(href, text) {
      const link2 = document.createElement("a");
      link2.href = href;
      link2.textContent = text ? text : href;
      return link2.outerHTML;
    }
  };
  _defineProperty(InputController, "events", {});
  var _$codePointAt;
  var _;
  var {
    browser,
    keyNames: keyNames$1
  } = config;
  var pastedFileCount = 0;
  var Level0InputController = class extends InputController {
    constructor() {
      super(...arguments);
      this.resetInputSummary();
    }
    setInputSummary() {
      let summary = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
      this.inputSummary.eventName = this.eventName;
      for (const key in summary) {
        const value = summary[key];
        this.inputSummary[key] = value;
      }
      return this.inputSummary;
    }
    resetInputSummary() {
      this.inputSummary = {};
    }
    reset() {
      this.resetInputSummary();
      return selectionChangeObserver.reset();
    }
    elementDidMutate(mutationSummary) {
      if (this.isComposing()) {
        var _this$delegate, _this$delegate$inputC;
        return (_this$delegate = this.delegate) === null || _this$delegate === void 0 ? void 0 : (_this$delegate$inputC = _this$delegate.inputControllerDidAllowUnhandledInput) === null || _this$delegate$inputC === void 0 ? void 0 : _this$delegate$inputC.call(_this$delegate);
      } else {
        return this.handleInput(function() {
          if (this.mutationIsSignificant(mutationSummary)) {
            if (this.mutationIsExpected(mutationSummary)) {
              this.requestRender();
            } else {
              this.requestReparse();
            }
          }
          return this.reset();
        });
      }
    }
    mutationIsExpected(_ref) {
      let {
        textAdded,
        textDeleted
      } = _ref;
      if (this.inputSummary.preferDocument) {
        return true;
      }
      const mutationAdditionMatchesSummary = textAdded != null ? textAdded === this.inputSummary.textAdded : !this.inputSummary.textAdded;
      const mutationDeletionMatchesSummary = textDeleted != null ? this.inputSummary.didDelete : !this.inputSummary.didDelete;
      const unexpectedNewlineAddition = ["\n", " \n"].includes(textAdded) && !mutationAdditionMatchesSummary;
      const unexpectedNewlineDeletion = textDeleted === "\n" && !mutationDeletionMatchesSummary;
      const singleUnexpectedNewline = unexpectedNewlineAddition && !unexpectedNewlineDeletion || unexpectedNewlineDeletion && !unexpectedNewlineAddition;
      if (singleUnexpectedNewline) {
        const range2 = this.getSelectedRange();
        if (range2) {
          var _this$responder;
          const offset = unexpectedNewlineAddition ? textAdded.replace(/\n$/, "").length || -1 : (textAdded === null || textAdded === void 0 ? void 0 : textAdded.length) || 1;
          if ((_this$responder = this.responder) !== null && _this$responder !== void 0 && _this$responder.positionIsBlockBreak(range2[1] + offset)) {
            return true;
          }
        }
      }
      return mutationAdditionMatchesSummary && mutationDeletionMatchesSummary;
    }
    mutationIsSignificant(mutationSummary) {
      var _this$compositionInpu;
      const textChanged = Object.keys(mutationSummary).length > 0;
      const composedEmptyString = ((_this$compositionInpu = this.compositionInput) === null || _this$compositionInpu === void 0 ? void 0 : _this$compositionInpu.getEndData()) === "";
      return textChanged || !composedEmptyString;
    }
    getCompositionInput() {
      if (this.isComposing()) {
        return this.compositionInput;
      } else {
        this.compositionInput = new CompositionInput(this);
      }
    }
    isComposing() {
      return this.compositionInput && !this.compositionInput.isEnded();
    }
    deleteInDirection(direction, event) {
      var _this$responder2;
      if (((_this$responder2 = this.responder) === null || _this$responder2 === void 0 ? void 0 : _this$responder2.deleteInDirection(direction)) === false) {
        if (event) {
          event.preventDefault();
          return this.requestRender();
        }
      } else {
        return this.setInputSummary({
          didDelete: true
        });
      }
    }
    serializeSelectionToDataTransfer(dataTransfer) {
      var _this$responder3;
      if (!dataTransferIsWritable(dataTransfer))
        return;
      const document2 = (_this$responder3 = this.responder) === null || _this$responder3 === void 0 ? void 0 : _this$responder3.getSelectedDocument().toSerializableDocument();
      dataTransfer.setData("application/x-trix-document", JSON.stringify(document2));
      dataTransfer.setData("text/html", DocumentView.render(document2).innerHTML);
      dataTransfer.setData("text/plain", document2.toString().replace(/\n$/, ""));
      return true;
    }
    canAcceptDataTransfer(dataTransfer) {
      const types = {};
      Array.from((dataTransfer === null || dataTransfer === void 0 ? void 0 : dataTransfer.types) || []).forEach((type) => {
        types[type] = true;
      });
      return types.Files || types["application/x-trix-document"] || types["text/html"] || types["text/plain"];
    }
    getPastedHTMLUsingHiddenElement(callback) {
      const selectedRange = this.getSelectedRange();
      const style = {
        position: "absolute",
        left: "".concat(window.pageXOffset, "px"),
        top: "".concat(window.pageYOffset, "px"),
        opacity: 0
      };
      const element = makeElement({
        style,
        tagName: "div",
        editable: true
      });
      document.body.appendChild(element);
      element.focus();
      return requestAnimationFrame(() => {
        const html2 = element.innerHTML;
        removeNode(element);
        this.setSelectedRange(selectedRange);
        return callback(html2);
      });
    }
  };
  _defineProperty(Level0InputController, "events", {
    keydown(event) {
      if (!this.isComposing()) {
        this.resetInputSummary();
      }
      this.inputSummary.didInput = true;
      const keyName = keyNames$1[event.keyCode];
      if (keyName) {
        var _context2;
        let context = this.keys;
        ["ctrl", "alt", "shift", "meta"].forEach((modifier) => {
          if (event["".concat(modifier, "Key")]) {
            var _context;
            if (modifier === "ctrl") {
              modifier = "control";
            }
            context = (_context = context) === null || _context === void 0 ? void 0 : _context[modifier];
          }
        });
        if (((_context2 = context) === null || _context2 === void 0 ? void 0 : _context2[keyName]) != null) {
          this.setInputSummary({
            keyName
          });
          selectionChangeObserver.reset();
          context[keyName].call(this, event);
        }
      }
      if (keyEventIsKeyboardCommand(event)) {
        const character = String.fromCharCode(event.keyCode).toLowerCase();
        if (character) {
          var _this$delegate3;
          const keys = ["alt", "shift"].map((modifier) => {
            if (event["".concat(modifier, "Key")]) {
              return modifier;
            }
          }).filter((key) => key);
          keys.push(character);
          if ((_this$delegate3 = this.delegate) !== null && _this$delegate3 !== void 0 && _this$delegate3.inputControllerDidReceiveKeyboardCommand(keys)) {
            event.preventDefault();
          }
        }
      }
    },
    keypress(event) {
      if (this.inputSummary.eventName != null)
        return;
      if (event.metaKey)
        return;
      if (event.ctrlKey && !event.altKey)
        return;
      const string = stringFromKeyEvent(event);
      if (string) {
        var _this$delegate4, _this$responder9;
        (_this$delegate4 = this.delegate) === null || _this$delegate4 === void 0 ? void 0 : _this$delegate4.inputControllerWillPerformTyping();
        (_this$responder9 = this.responder) === null || _this$responder9 === void 0 ? void 0 : _this$responder9.insertString(string);
        return this.setInputSummary({
          textAdded: string,
          didDelete: this.selectionIsExpanded()
        });
      }
    },
    textInput(event) {
      const {
        data: data2
      } = event;
      const {
        textAdded
      } = this.inputSummary;
      if (textAdded && textAdded !== data2 && textAdded.toUpperCase() === data2) {
        var _this$responder10;
        const range2 = this.getSelectedRange();
        this.setSelectedRange([range2[0], range2[1] + textAdded.length]);
        (_this$responder10 = this.responder) === null || _this$responder10 === void 0 ? void 0 : _this$responder10.insertString(data2);
        this.setInputSummary({
          textAdded: data2
        });
        return this.setSelectedRange(range2);
      }
    },
    dragenter(event) {
      event.preventDefault();
    },
    dragstart(event) {
      var _this$delegate5, _this$delegate5$input;
      this.serializeSelectionToDataTransfer(event.dataTransfer);
      this.draggedRange = this.getSelectedRange();
      return (_this$delegate5 = this.delegate) === null || _this$delegate5 === void 0 ? void 0 : (_this$delegate5$input = _this$delegate5.inputControllerDidStartDrag) === null || _this$delegate5$input === void 0 ? void 0 : _this$delegate5$input.call(_this$delegate5);
    },
    dragover(event) {
      if (this.draggedRange || this.canAcceptDataTransfer(event.dataTransfer)) {
        event.preventDefault();
        const draggingPoint = {
          x: event.clientX,
          y: event.clientY
        };
        if (!objectsAreEqual(draggingPoint, this.draggingPoint)) {
          var _this$delegate6, _this$delegate6$input;
          this.draggingPoint = draggingPoint;
          return (_this$delegate6 = this.delegate) === null || _this$delegate6 === void 0 ? void 0 : (_this$delegate6$input = _this$delegate6.inputControllerDidReceiveDragOverPoint) === null || _this$delegate6$input === void 0 ? void 0 : _this$delegate6$input.call(_this$delegate6, this.draggingPoint);
        }
      }
    },
    dragend(event) {
      var _this$delegate7, _this$delegate7$input;
      (_this$delegate7 = this.delegate) === null || _this$delegate7 === void 0 ? void 0 : (_this$delegate7$input = _this$delegate7.inputControllerDidCancelDrag) === null || _this$delegate7$input === void 0 ? void 0 : _this$delegate7$input.call(_this$delegate7);
      this.draggedRange = null;
      this.draggingPoint = null;
    },
    drop(event) {
      var _event$dataTransfer, _this$responder11;
      event.preventDefault();
      const files = (_event$dataTransfer = event.dataTransfer) === null || _event$dataTransfer === void 0 ? void 0 : _event$dataTransfer.files;
      const documentJSON = event.dataTransfer.getData("application/x-trix-document");
      const point = {
        x: event.clientX,
        y: event.clientY
      };
      (_this$responder11 = this.responder) === null || _this$responder11 === void 0 ? void 0 : _this$responder11.setLocationRangeFromPointRange(point);
      if (files !== null && files !== void 0 && files.length) {
        this.attachFiles(files);
      } else if (this.draggedRange) {
        var _this$delegate8, _this$responder12;
        (_this$delegate8 = this.delegate) === null || _this$delegate8 === void 0 ? void 0 : _this$delegate8.inputControllerWillMoveText();
        (_this$responder12 = this.responder) === null || _this$responder12 === void 0 ? void 0 : _this$responder12.moveTextFromRange(this.draggedRange);
        this.draggedRange = null;
        this.requestRender();
      } else if (documentJSON) {
        var _this$responder13;
        const document2 = Document.fromJSONString(documentJSON);
        (_this$responder13 = this.responder) === null || _this$responder13 === void 0 ? void 0 : _this$responder13.insertDocument(document2);
        this.requestRender();
      }
      this.draggedRange = null;
      this.draggingPoint = null;
    },
    cut(event) {
      var _this$responder14;
      if ((_this$responder14 = this.responder) !== null && _this$responder14 !== void 0 && _this$responder14.selectionIsExpanded()) {
        var _this$delegate9;
        if (this.serializeSelectionToDataTransfer(event.clipboardData)) {
          event.preventDefault();
        }
        (_this$delegate9 = this.delegate) === null || _this$delegate9 === void 0 ? void 0 : _this$delegate9.inputControllerWillCutText();
        this.deleteInDirection("backward");
        if (event.defaultPrevented) {
          return this.requestRender();
        }
      }
    },
    copy(event) {
      var _this$responder15;
      if ((_this$responder15 = this.responder) !== null && _this$responder15 !== void 0 && _this$responder15.selectionIsExpanded()) {
        if (this.serializeSelectionToDataTransfer(event.clipboardData)) {
          event.preventDefault();
        }
      }
    },
    paste(event) {
      const clipboard = event.clipboardData || event.testClipboardData;
      const paste = {
        clipboard
      };
      if (!clipboard || pasteEventIsCrippledSafariHTMLPaste(event)) {
        this.getPastedHTMLUsingHiddenElement((html3) => {
          var _this$delegate10, _this$responder16, _this$delegate11;
          paste.type = "text/html";
          paste.html = html3;
          (_this$delegate10 = this.delegate) === null || _this$delegate10 === void 0 ? void 0 : _this$delegate10.inputControllerWillPaste(paste);
          (_this$responder16 = this.responder) === null || _this$responder16 === void 0 ? void 0 : _this$responder16.insertHTML(paste.html);
          this.requestRender();
          return (_this$delegate11 = this.delegate) === null || _this$delegate11 === void 0 ? void 0 : _this$delegate11.inputControllerDidPaste(paste);
        });
        return;
      }
      const href = clipboard.getData("URL");
      const html2 = clipboard.getData("text/html");
      const name = clipboard.getData("public.url-name");
      if (href) {
        var _this$delegate12, _this$responder17, _this$delegate13;
        let string;
        paste.type = "text/html";
        if (name) {
          string = squishBreakableWhitespace(name).trim();
        } else {
          string = href;
        }
        paste.html = this.createLinkHTML(href, string);
        (_this$delegate12 = this.delegate) === null || _this$delegate12 === void 0 ? void 0 : _this$delegate12.inputControllerWillPaste(paste);
        this.setInputSummary({
          textAdded: string,
          didDelete: this.selectionIsExpanded()
        });
        (_this$responder17 = this.responder) === null || _this$responder17 === void 0 ? void 0 : _this$responder17.insertHTML(paste.html);
        this.requestRender();
        (_this$delegate13 = this.delegate) === null || _this$delegate13 === void 0 ? void 0 : _this$delegate13.inputControllerDidPaste(paste);
      } else if (dataTransferIsPlainText(clipboard)) {
        var _this$delegate14, _this$responder18, _this$delegate15;
        paste.type = "text/plain";
        paste.string = clipboard.getData("text/plain");
        (_this$delegate14 = this.delegate) === null || _this$delegate14 === void 0 ? void 0 : _this$delegate14.inputControllerWillPaste(paste);
        this.setInputSummary({
          textAdded: paste.string,
          didDelete: this.selectionIsExpanded()
        });
        (_this$responder18 = this.responder) === null || _this$responder18 === void 0 ? void 0 : _this$responder18.insertString(paste.string);
        this.requestRender();
        (_this$delegate15 = this.delegate) === null || _this$delegate15 === void 0 ? void 0 : _this$delegate15.inputControllerDidPaste(paste);
      } else if (html2) {
        var _this$delegate16, _this$responder19, _this$delegate17;
        paste.type = "text/html";
        paste.html = html2;
        (_this$delegate16 = this.delegate) === null || _this$delegate16 === void 0 ? void 0 : _this$delegate16.inputControllerWillPaste(paste);
        (_this$responder19 = this.responder) === null || _this$responder19 === void 0 ? void 0 : _this$responder19.insertHTML(paste.html);
        this.requestRender();
        (_this$delegate17 = this.delegate) === null || _this$delegate17 === void 0 ? void 0 : _this$delegate17.inputControllerDidPaste(paste);
      } else if (Array.from(clipboard.types).includes("Files")) {
        var _clipboard$items, _clipboard$items$, _clipboard$items$$get;
        const file = (_clipboard$items = clipboard.items) === null || _clipboard$items === void 0 ? void 0 : (_clipboard$items$ = _clipboard$items[0]) === null || _clipboard$items$ === void 0 ? void 0 : (_clipboard$items$$get = _clipboard$items$.getAsFile) === null || _clipboard$items$$get === void 0 ? void 0 : _clipboard$items$$get.call(_clipboard$items$);
        if (file) {
          var _this$delegate18, _this$responder20, _this$delegate19;
          const extension = extensionForFile(file);
          if (!file.name && extension) {
            file.name = "pasted-file-".concat(++pastedFileCount, ".").concat(extension);
          }
          paste.type = "File";
          paste.file = file;
          (_this$delegate18 = this.delegate) === null || _this$delegate18 === void 0 ? void 0 : _this$delegate18.inputControllerWillAttachFiles();
          (_this$responder20 = this.responder) === null || _this$responder20 === void 0 ? void 0 : _this$responder20.insertFile(paste.file);
          this.requestRender();
          (_this$delegate19 = this.delegate) === null || _this$delegate19 === void 0 ? void 0 : _this$delegate19.inputControllerDidPaste(paste);
        }
      }
      event.preventDefault();
    },
    compositionstart(event) {
      return this.getCompositionInput().start(event.data);
    },
    compositionupdate(event) {
      return this.getCompositionInput().update(event.data);
    },
    compositionend(event) {
      return this.getCompositionInput().end(event.data);
    },
    beforeinput(event) {
      this.inputSummary.didInput = true;
    },
    input(event) {
      this.inputSummary.didInput = true;
      return event.stopPropagation();
    }
  });
  _defineProperty(Level0InputController, "keys", {
    backspace(event) {
      var _this$delegate20;
      (_this$delegate20 = this.delegate) === null || _this$delegate20 === void 0 ? void 0 : _this$delegate20.inputControllerWillPerformTyping();
      return this.deleteInDirection("backward", event);
    },
    delete(event) {
      var _this$delegate21;
      (_this$delegate21 = this.delegate) === null || _this$delegate21 === void 0 ? void 0 : _this$delegate21.inputControllerWillPerformTyping();
      return this.deleteInDirection("forward", event);
    },
    return(event) {
      var _this$delegate22, _this$responder21;
      this.setInputSummary({
        preferDocument: true
      });
      (_this$delegate22 = this.delegate) === null || _this$delegate22 === void 0 ? void 0 : _this$delegate22.inputControllerWillPerformTyping();
      return (_this$responder21 = this.responder) === null || _this$responder21 === void 0 ? void 0 : _this$responder21.insertLineBreak();
    },
    tab(event) {
      var _this$responder22;
      if ((_this$responder22 = this.responder) !== null && _this$responder22 !== void 0 && _this$responder22.canIncreaseNestingLevel()) {
        var _this$responder23;
        (_this$responder23 = this.responder) === null || _this$responder23 === void 0 ? void 0 : _this$responder23.increaseNestingLevel();
        this.requestRender();
        event.preventDefault();
      }
    },
    left(event) {
      if (this.selectionIsInCursorTarget()) {
        var _this$responder24;
        event.preventDefault();
        return (_this$responder24 = this.responder) === null || _this$responder24 === void 0 ? void 0 : _this$responder24.moveCursorInDirection("backward");
      }
    },
    right(event) {
      if (this.selectionIsInCursorTarget()) {
        var _this$responder25;
        event.preventDefault();
        return (_this$responder25 = this.responder) === null || _this$responder25 === void 0 ? void 0 : _this$responder25.moveCursorInDirection("forward");
      }
    },
    control: {
      d(event) {
        var _this$delegate23;
        (_this$delegate23 = this.delegate) === null || _this$delegate23 === void 0 ? void 0 : _this$delegate23.inputControllerWillPerformTyping();
        return this.deleteInDirection("forward", event);
      },
      h(event) {
        var _this$delegate24;
        (_this$delegate24 = this.delegate) === null || _this$delegate24 === void 0 ? void 0 : _this$delegate24.inputControllerWillPerformTyping();
        return this.deleteInDirection("backward", event);
      },
      o(event) {
        var _this$delegate25, _this$responder26;
        event.preventDefault();
        (_this$delegate25 = this.delegate) === null || _this$delegate25 === void 0 ? void 0 : _this$delegate25.inputControllerWillPerformTyping();
        (_this$responder26 = this.responder) === null || _this$responder26 === void 0 ? void 0 : _this$responder26.insertString("\n", {
          updatePosition: false
        });
        return this.requestRender();
      }
    },
    shift: {
      return(event) {
        var _this$delegate26, _this$responder27;
        (_this$delegate26 = this.delegate) === null || _this$delegate26 === void 0 ? void 0 : _this$delegate26.inputControllerWillPerformTyping();
        (_this$responder27 = this.responder) === null || _this$responder27 === void 0 ? void 0 : _this$responder27.insertString("\n");
        this.requestRender();
        event.preventDefault();
      },
      tab(event) {
        var _this$responder28;
        if ((_this$responder28 = this.responder) !== null && _this$responder28 !== void 0 && _this$responder28.canDecreaseNestingLevel()) {
          var _this$responder29;
          (_this$responder29 = this.responder) === null || _this$responder29 === void 0 ? void 0 : _this$responder29.decreaseNestingLevel();
          this.requestRender();
          event.preventDefault();
        }
      },
      left(event) {
        if (this.selectionIsInCursorTarget()) {
          event.preventDefault();
          return this.expandSelectionInDirection("backward");
        }
      },
      right(event) {
        if (this.selectionIsInCursorTarget()) {
          event.preventDefault();
          return this.expandSelectionInDirection("forward");
        }
      }
    },
    alt: {
      backspace(event) {
        var _this$delegate27;
        this.setInputSummary({
          preferDocument: false
        });
        return (_this$delegate27 = this.delegate) === null || _this$delegate27 === void 0 ? void 0 : _this$delegate27.inputControllerWillPerformTyping();
      }
    },
    meta: {
      backspace(event) {
        var _this$delegate28;
        this.setInputSummary({
          preferDocument: false
        });
        return (_this$delegate28 = this.delegate) === null || _this$delegate28 === void 0 ? void 0 : _this$delegate28.inputControllerWillPerformTyping();
      }
    }
  });
  Level0InputController.proxyMethod("responder?.getSelectedRange");
  Level0InputController.proxyMethod("responder?.setSelectedRange");
  Level0InputController.proxyMethod("responder?.expandSelectionInDirection");
  Level0InputController.proxyMethod("responder?.selectionIsInCursorTarget");
  Level0InputController.proxyMethod("responder?.selectionIsExpanded");
  var extensionForFile = (file) => {
    var _file$type, _file$type$match;
    return (_file$type = file.type) === null || _file$type === void 0 ? void 0 : (_file$type$match = _file$type.match(/\/(\w+)$/)) === null || _file$type$match === void 0 ? void 0 : _file$type$match[1];
  };
  var hasStringCodePointAt = !!((_$codePointAt = (_ = " ").codePointAt) !== null && _$codePointAt !== void 0 && _$codePointAt.call(_, 0));
  var stringFromKeyEvent = function(event) {
    if (event.key && hasStringCodePointAt && event.key.codePointAt(0) === event.keyCode) {
      return event.key;
    } else {
      let code;
      if (event.which === null) {
        code = event.keyCode;
      } else if (event.which !== 0 && event.charCode !== 0) {
        code = event.charCode;
      }
      if (code != null && keyNames$1[code] !== "escape") {
        return UTF16String.fromCodepoints([code]).toString();
      }
    }
  };
  var pasteEventIsCrippledSafariHTMLPaste = function(event) {
    const paste = event.clipboardData;
    if (paste) {
      if (paste.types.includes("text/html")) {
        for (const type of paste.types) {
          const hasPasteboardFlavor = /^CorePasteboardFlavorType/.test(type);
          const hasReadableDynamicData = /^dyn\./.test(type) && paste.getData(type);
          const mightBePasteAndMatchStyle = hasPasteboardFlavor || hasReadableDynamicData;
          if (mightBePasteAndMatchStyle) {
            return true;
          }
        }
        return false;
      } else {
        const isExternalHTMLPaste = paste.types.includes("com.apple.webarchive");
        const isExternalRichTextPaste = paste.types.includes("com.apple.flat-rtfd");
        return isExternalHTMLPaste || isExternalRichTextPaste;
      }
    }
  };
  var CompositionInput = class extends BasicObject {
    constructor(inputController) {
      super(...arguments);
      this.inputController = inputController;
      this.responder = this.inputController.responder;
      this.delegate = this.inputController.delegate;
      this.inputSummary = this.inputController.inputSummary;
      this.data = {};
    }
    start(data2) {
      this.data.start = data2;
      if (this.isSignificant()) {
        var _this$responder5;
        if (this.inputSummary.eventName === "keypress" && this.inputSummary.textAdded) {
          var _this$responder4;
          (_this$responder4 = this.responder) === null || _this$responder4 === void 0 ? void 0 : _this$responder4.deleteInDirection("left");
        }
        if (!this.selectionIsExpanded()) {
          this.insertPlaceholder();
          this.requestRender();
        }
        this.range = (_this$responder5 = this.responder) === null || _this$responder5 === void 0 ? void 0 : _this$responder5.getSelectedRange();
      }
    }
    update(data2) {
      this.data.update = data2;
      if (this.isSignificant()) {
        const range2 = this.selectPlaceholder();
        if (range2) {
          this.forgetPlaceholder();
          this.range = range2;
        }
      }
    }
    end(data2) {
      this.data.end = data2;
      if (this.isSignificant()) {
        this.forgetPlaceholder();
        if (this.canApplyToDocument()) {
          var _this$delegate2, _this$responder6, _this$responder7, _this$responder8;
          this.setInputSummary({
            preferDocument: true,
            didInput: false
          });
          (_this$delegate2 = this.delegate) === null || _this$delegate2 === void 0 ? void 0 : _this$delegate2.inputControllerWillPerformTyping();
          (_this$responder6 = this.responder) === null || _this$responder6 === void 0 ? void 0 : _this$responder6.setSelectedRange(this.range);
          (_this$responder7 = this.responder) === null || _this$responder7 === void 0 ? void 0 : _this$responder7.insertString(this.data.end);
          return (_this$responder8 = this.responder) === null || _this$responder8 === void 0 ? void 0 : _this$responder8.setSelectedRange(this.range[0] + this.data.end.length);
        } else if (this.data.start != null || this.data.update != null) {
          this.requestReparse();
          return this.inputController.reset();
        }
      } else {
        return this.inputController.reset();
      }
    }
    getEndData() {
      return this.data.end;
    }
    isEnded() {
      return this.getEndData() != null;
    }
    isSignificant() {
      if (browser.composesExistingText) {
        return this.inputSummary.didInput;
      } else {
        return true;
      }
    }
    canApplyToDocument() {
      var _this$data$start, _this$data$end;
      return ((_this$data$start = this.data.start) === null || _this$data$start === void 0 ? void 0 : _this$data$start.length) === 0 && ((_this$data$end = this.data.end) === null || _this$data$end === void 0 ? void 0 : _this$data$end.length) > 0 && this.range;
    }
  };
  CompositionInput.proxyMethod("inputController.setInputSummary");
  CompositionInput.proxyMethod("inputController.requestRender");
  CompositionInput.proxyMethod("inputController.requestReparse");
  CompositionInput.proxyMethod("responder?.selectionIsExpanded");
  CompositionInput.proxyMethod("responder?.insertPlaceholder");
  CompositionInput.proxyMethod("responder?.selectPlaceholder");
  CompositionInput.proxyMethod("responder?.forgetPlaceholder");
  var Level2InputController = class extends InputController {
    constructor() {
      super(...arguments);
      this.render = this.render.bind(this);
    }
    elementDidMutate() {
      if (this.scheduledRender) {
        if (this.composing) {
          var _this$delegate, _this$delegate$inputC;
          return (_this$delegate = this.delegate) === null || _this$delegate === void 0 ? void 0 : (_this$delegate$inputC = _this$delegate.inputControllerDidAllowUnhandledInput) === null || _this$delegate$inputC === void 0 ? void 0 : _this$delegate$inputC.call(_this$delegate);
        }
      } else {
        return this.reparse();
      }
    }
    scheduleRender() {
      return this.scheduledRender ? this.scheduledRender : this.scheduledRender = requestAnimationFrame(this.render);
    }
    render() {
      var _this$afterRender;
      cancelAnimationFrame(this.scheduledRender);
      this.scheduledRender = null;
      if (!this.composing) {
        var _this$delegate2;
        (_this$delegate2 = this.delegate) === null || _this$delegate2 === void 0 ? void 0 : _this$delegate2.render();
      }
      (_this$afterRender = this.afterRender) === null || _this$afterRender === void 0 ? void 0 : _this$afterRender.call(this);
      this.afterRender = null;
    }
    reparse() {
      var _this$delegate3;
      return (_this$delegate3 = this.delegate) === null || _this$delegate3 === void 0 ? void 0 : _this$delegate3.reparse();
    }
    insertString() {
      var _this$delegate4;
      let string = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : "";
      let options2 = arguments.length > 1 ? arguments[1] : void 0;
      (_this$delegate4 = this.delegate) === null || _this$delegate4 === void 0 ? void 0 : _this$delegate4.inputControllerWillPerformTyping();
      return this.withTargetDOMRange(function() {
        var _this$responder;
        return (_this$responder = this.responder) === null || _this$responder === void 0 ? void 0 : _this$responder.insertString(string, options2);
      });
    }
    toggleAttributeIfSupported(attributeName) {
      if (getAllAttributeNames().includes(attributeName)) {
        var _this$delegate5;
        (_this$delegate5 = this.delegate) === null || _this$delegate5 === void 0 ? void 0 : _this$delegate5.inputControllerWillPerformFormatting(attributeName);
        return this.withTargetDOMRange(function() {
          var _this$responder2;
          return (_this$responder2 = this.responder) === null || _this$responder2 === void 0 ? void 0 : _this$responder2.toggleCurrentAttribute(attributeName);
        });
      }
    }
    activateAttributeIfSupported(attributeName, value) {
      if (getAllAttributeNames().includes(attributeName)) {
        var _this$delegate6;
        (_this$delegate6 = this.delegate) === null || _this$delegate6 === void 0 ? void 0 : _this$delegate6.inputControllerWillPerformFormatting(attributeName);
        return this.withTargetDOMRange(function() {
          var _this$responder3;
          return (_this$responder3 = this.responder) === null || _this$responder3 === void 0 ? void 0 : _this$responder3.setCurrentAttribute(attributeName, value);
        });
      }
    }
    deleteInDirection(direction) {
      let {
        recordUndoEntry
      } = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {
        recordUndoEntry: true
      };
      if (recordUndoEntry) {
        var _this$delegate7;
        (_this$delegate7 = this.delegate) === null || _this$delegate7 === void 0 ? void 0 : _this$delegate7.inputControllerWillPerformTyping();
      }
      const perform2 = () => {
        var _this$responder4;
        return (_this$responder4 = this.responder) === null || _this$responder4 === void 0 ? void 0 : _this$responder4.deleteInDirection(direction);
      };
      const domRange = this.getTargetDOMRange({
        minLength: 2
      });
      if (domRange) {
        return this.withTargetDOMRange(domRange, perform2);
      } else {
        return perform2();
      }
    }
    withTargetDOMRange(domRange, fn) {
      if (typeof domRange === "function") {
        fn = domRange;
        domRange = this.getTargetDOMRange();
      }
      if (domRange) {
        var _this$responder5;
        return (_this$responder5 = this.responder) === null || _this$responder5 === void 0 ? void 0 : _this$responder5.withTargetDOMRange(domRange, fn.bind(this));
      } else {
        selectionChangeObserver.reset();
        return fn.call(this);
      }
    }
    getTargetDOMRange() {
      var _this$event$getTarget, _this$event;
      let {
        minLength
      } = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {
        minLength: 0
      };
      const targetRanges = (_this$event$getTarget = (_this$event = this.event).getTargetRanges) === null || _this$event$getTarget === void 0 ? void 0 : _this$event$getTarget.call(_this$event);
      if (targetRanges) {
        if (targetRanges.length) {
          const domRange = staticRangeToRange(targetRanges[0]);
          if (minLength === 0 || domRange.toString().length >= minLength) {
            return domRange;
          }
        }
      }
    }
    withEvent(event, fn) {
      let result;
      this.event = event;
      try {
        result = fn.call(this);
      } finally {
        this.event = null;
      }
      return result;
    }
  };
  _defineProperty(Level2InputController, "events", {
    keydown(event) {
      if (keyEventIsKeyboardCommand(event)) {
        var _this$delegate8;
        const command = keyboardCommandFromKeyEvent(event);
        if ((_this$delegate8 = this.delegate) !== null && _this$delegate8 !== void 0 && _this$delegate8.inputControllerDidReceiveKeyboardCommand(command)) {
          event.preventDefault();
        }
      } else {
        let name = event.key;
        if (event.altKey) {
          name += "+Alt";
        }
        if (event.shiftKey) {
          name += "+Shift";
        }
        const handler = this.constructor.keys[name];
        if (handler) {
          return this.withEvent(event, handler);
        }
      }
    },
    paste(event) {
      var _event$clipboardData;
      let paste;
      const href = (_event$clipboardData = event.clipboardData) === null || _event$clipboardData === void 0 ? void 0 : _event$clipboardData.getData("URL");
      if (pasteEventHasFilesOnly(event)) {
        event.preventDefault();
        return this.attachFiles(event.clipboardData.files);
      } else if (pasteEventHasPlainTextOnly(event)) {
        var _this$delegate9, _this$responder6, _this$delegate10;
        event.preventDefault();
        paste = {
          type: "text/plain",
          string: event.clipboardData.getData("text/plain")
        };
        (_this$delegate9 = this.delegate) === null || _this$delegate9 === void 0 ? void 0 : _this$delegate9.inputControllerWillPaste(paste);
        (_this$responder6 = this.responder) === null || _this$responder6 === void 0 ? void 0 : _this$responder6.insertString(paste.string);
        this.render();
        return (_this$delegate10 = this.delegate) === null || _this$delegate10 === void 0 ? void 0 : _this$delegate10.inputControllerDidPaste(paste);
      } else if (href) {
        var _this$delegate11, _this$responder7, _this$delegate12;
        event.preventDefault();
        paste = {
          type: "text/html",
          html: this.createLinkHTML(href)
        };
        (_this$delegate11 = this.delegate) === null || _this$delegate11 === void 0 ? void 0 : _this$delegate11.inputControllerWillPaste(paste);
        (_this$responder7 = this.responder) === null || _this$responder7 === void 0 ? void 0 : _this$responder7.insertHTML(paste.html);
        this.render();
        return (_this$delegate12 = this.delegate) === null || _this$delegate12 === void 0 ? void 0 : _this$delegate12.inputControllerDidPaste(paste);
      }
    },
    beforeinput(event) {
      const handler = this.constructor.inputTypes[event.inputType];
      if (handler) {
        this.withEvent(event, handler);
        return this.scheduleRender();
      }
    },
    input(event) {
      return selectionChangeObserver.reset();
    },
    dragstart(event) {
      var _this$responder8;
      if ((_this$responder8 = this.responder) !== null && _this$responder8 !== void 0 && _this$responder8.selectionContainsAttachments()) {
        var _this$responder9;
        event.dataTransfer.setData("application/x-trix-dragging", true);
        this.dragging = {
          range: (_this$responder9 = this.responder) === null || _this$responder9 === void 0 ? void 0 : _this$responder9.getSelectedRange(),
          point: pointFromEvent(event)
        };
      }
    },
    dragenter(event) {
      if (dragEventHasFiles(event)) {
        event.preventDefault();
      }
    },
    dragover(event) {
      if (this.dragging) {
        event.preventDefault();
        const point = pointFromEvent(event);
        if (!objectsAreEqual(point, this.dragging.point)) {
          var _this$responder10;
          this.dragging.point = point;
          return (_this$responder10 = this.responder) === null || _this$responder10 === void 0 ? void 0 : _this$responder10.setLocationRangeFromPointRange(point);
        }
      } else if (dragEventHasFiles(event)) {
        event.preventDefault();
      }
    },
    drop(event) {
      if (this.dragging) {
        var _this$delegate13, _this$responder11;
        event.preventDefault();
        (_this$delegate13 = this.delegate) === null || _this$delegate13 === void 0 ? void 0 : _this$delegate13.inputControllerWillMoveText();
        (_this$responder11 = this.responder) === null || _this$responder11 === void 0 ? void 0 : _this$responder11.moveTextFromRange(this.dragging.range);
        this.dragging = null;
        return this.scheduleRender();
      } else if (dragEventHasFiles(event)) {
        var _this$responder12;
        event.preventDefault();
        const point = pointFromEvent(event);
        (_this$responder12 = this.responder) === null || _this$responder12 === void 0 ? void 0 : _this$responder12.setLocationRangeFromPointRange(point);
        return this.attachFiles(event.dataTransfer.files);
      }
    },
    dragend() {
      if (this.dragging) {
        var _this$responder13;
        (_this$responder13 = this.responder) === null || _this$responder13 === void 0 ? void 0 : _this$responder13.setSelectedRange(this.dragging.range);
        this.dragging = null;
      }
    },
    compositionend(event) {
      if (this.composing) {
        this.composing = false;
        return this.scheduleRender();
      }
    }
  });
  _defineProperty(Level2InputController, "keys", {
    ArrowLeft() {
      var _this$responder14;
      if ((_this$responder14 = this.responder) !== null && _this$responder14 !== void 0 && _this$responder14.shouldManageMovingCursorInDirection("backward")) {
        var _this$responder15;
        this.event.preventDefault();
        return (_this$responder15 = this.responder) === null || _this$responder15 === void 0 ? void 0 : _this$responder15.moveCursorInDirection("backward");
      }
    },
    ArrowRight() {
      var _this$responder16;
      if ((_this$responder16 = this.responder) !== null && _this$responder16 !== void 0 && _this$responder16.shouldManageMovingCursorInDirection("forward")) {
        var _this$responder17;
        this.event.preventDefault();
        return (_this$responder17 = this.responder) === null || _this$responder17 === void 0 ? void 0 : _this$responder17.moveCursorInDirection("forward");
      }
    },
    Backspace() {
      var _this$responder18;
      if ((_this$responder18 = this.responder) !== null && _this$responder18 !== void 0 && _this$responder18.shouldManageDeletingInDirection("backward")) {
        var _this$delegate14, _this$responder19;
        this.event.preventDefault();
        (_this$delegate14 = this.delegate) === null || _this$delegate14 === void 0 ? void 0 : _this$delegate14.inputControllerWillPerformTyping();
        (_this$responder19 = this.responder) === null || _this$responder19 === void 0 ? void 0 : _this$responder19.deleteInDirection("backward");
        return this.render();
      }
    },
    Tab() {
      var _this$responder20;
      if ((_this$responder20 = this.responder) !== null && _this$responder20 !== void 0 && _this$responder20.canIncreaseNestingLevel()) {
        var _this$responder21;
        this.event.preventDefault();
        (_this$responder21 = this.responder) === null || _this$responder21 === void 0 ? void 0 : _this$responder21.increaseNestingLevel();
        return this.render();
      }
    },
    "Tab+Shift"() {
      var _this$responder22;
      if ((_this$responder22 = this.responder) !== null && _this$responder22 !== void 0 && _this$responder22.canDecreaseNestingLevel()) {
        var _this$responder23;
        this.event.preventDefault();
        (_this$responder23 = this.responder) === null || _this$responder23 === void 0 ? void 0 : _this$responder23.decreaseNestingLevel();
        return this.render();
      }
    }
  });
  _defineProperty(Level2InputController, "inputTypes", {
    deleteByComposition() {
      return this.deleteInDirection("backward", {
        recordUndoEntry: false
      });
    },
    deleteByCut() {
      return this.deleteInDirection("backward");
    },
    deleteByDrag() {
      this.event.preventDefault();
      return this.withTargetDOMRange(function() {
        var _this$responder24;
        this.deleteByDragRange = (_this$responder24 = this.responder) === null || _this$responder24 === void 0 ? void 0 : _this$responder24.getSelectedRange();
      });
    },
    deleteCompositionText() {
      return this.deleteInDirection("backward", {
        recordUndoEntry: false
      });
    },
    deleteContent() {
      return this.deleteInDirection("backward");
    },
    deleteContentBackward() {
      return this.deleteInDirection("backward");
    },
    deleteContentForward() {
      return this.deleteInDirection("forward");
    },
    deleteEntireSoftLine() {
      return this.deleteInDirection("forward");
    },
    deleteHardLineBackward() {
      return this.deleteInDirection("backward");
    },
    deleteHardLineForward() {
      return this.deleteInDirection("forward");
    },
    deleteSoftLineBackward() {
      return this.deleteInDirection("backward");
    },
    deleteSoftLineForward() {
      return this.deleteInDirection("forward");
    },
    deleteWordBackward() {
      return this.deleteInDirection("backward");
    },
    deleteWordForward() {
      return this.deleteInDirection("forward");
    },
    formatBackColor() {
      return this.activateAttributeIfSupported("backgroundColor", this.event.data);
    },
    formatBold() {
      return this.toggleAttributeIfSupported("bold");
    },
    formatFontColor() {
      return this.activateAttributeIfSupported("color", this.event.data);
    },
    formatFontName() {
      return this.activateAttributeIfSupported("font", this.event.data);
    },
    formatIndent() {
      var _this$responder25;
      if ((_this$responder25 = this.responder) !== null && _this$responder25 !== void 0 && _this$responder25.canIncreaseNestingLevel()) {
        return this.withTargetDOMRange(function() {
          var _this$responder26;
          return (_this$responder26 = this.responder) === null || _this$responder26 === void 0 ? void 0 : _this$responder26.increaseNestingLevel();
        });
      }
    },
    formatItalic() {
      return this.toggleAttributeIfSupported("italic");
    },
    formatJustifyCenter() {
      return this.toggleAttributeIfSupported("justifyCenter");
    },
    formatJustifyFull() {
      return this.toggleAttributeIfSupported("justifyFull");
    },
    formatJustifyLeft() {
      return this.toggleAttributeIfSupported("justifyLeft");
    },
    formatJustifyRight() {
      return this.toggleAttributeIfSupported("justifyRight");
    },
    formatOutdent() {
      var _this$responder27;
      if ((_this$responder27 = this.responder) !== null && _this$responder27 !== void 0 && _this$responder27.canDecreaseNestingLevel()) {
        return this.withTargetDOMRange(function() {
          var _this$responder28;
          return (_this$responder28 = this.responder) === null || _this$responder28 === void 0 ? void 0 : _this$responder28.decreaseNestingLevel();
        });
      }
    },
    formatRemove() {
      this.withTargetDOMRange(function() {
        for (const attributeName in (_this$responder29 = this.responder) === null || _this$responder29 === void 0 ? void 0 : _this$responder29.getCurrentAttributes()) {
          var _this$responder29, _this$responder30;
          (_this$responder30 = this.responder) === null || _this$responder30 === void 0 ? void 0 : _this$responder30.removeCurrentAttribute(attributeName);
        }
      });
    },
    formatSetBlockTextDirection() {
      return this.activateAttributeIfSupported("blockDir", this.event.data);
    },
    formatSetInlineTextDirection() {
      return this.activateAttributeIfSupported("textDir", this.event.data);
    },
    formatStrikeThrough() {
      return this.toggleAttributeIfSupported("strike");
    },
    formatSubscript() {
      return this.toggleAttributeIfSupported("sub");
    },
    formatSuperscript() {
      return this.toggleAttributeIfSupported("sup");
    },
    formatUnderline() {
      return this.toggleAttributeIfSupported("underline");
    },
    historyRedo() {
      var _this$delegate15;
      return (_this$delegate15 = this.delegate) === null || _this$delegate15 === void 0 ? void 0 : _this$delegate15.inputControllerWillPerformRedo();
    },
    historyUndo() {
      var _this$delegate16;
      return (_this$delegate16 = this.delegate) === null || _this$delegate16 === void 0 ? void 0 : _this$delegate16.inputControllerWillPerformUndo();
    },
    insertCompositionText() {
      this.composing = true;
      return this.insertString(this.event.data);
    },
    insertFromComposition() {
      this.composing = false;
      return this.insertString(this.event.data);
    },
    insertFromDrop() {
      const range2 = this.deleteByDragRange;
      if (range2) {
        var _this$delegate17;
        this.deleteByDragRange = null;
        (_this$delegate17 = this.delegate) === null || _this$delegate17 === void 0 ? void 0 : _this$delegate17.inputControllerWillMoveText();
        return this.withTargetDOMRange(function() {
          var _this$responder31;
          return (_this$responder31 = this.responder) === null || _this$responder31 === void 0 ? void 0 : _this$responder31.moveTextFromRange(range2);
        });
      }
    },
    insertFromPaste() {
      var _dataTransfer$files;
      const {
        dataTransfer
      } = this.event;
      const paste = {
        dataTransfer
      };
      const href = dataTransfer.getData("URL");
      const html2 = dataTransfer.getData("text/html");
      if (href) {
        var _this$delegate18;
        let string;
        this.event.preventDefault();
        paste.type = "text/html";
        const name = dataTransfer.getData("public.url-name");
        if (name) {
          string = squishBreakableWhitespace(name).trim();
        } else {
          string = href;
        }
        paste.html = this.createLinkHTML(href, string);
        (_this$delegate18 = this.delegate) === null || _this$delegate18 === void 0 ? void 0 : _this$delegate18.inputControllerWillPaste(paste);
        this.withTargetDOMRange(function() {
          var _this$responder32;
          return (_this$responder32 = this.responder) === null || _this$responder32 === void 0 ? void 0 : _this$responder32.insertHTML(paste.html);
        });
        this.afterRender = () => {
          var _this$delegate19;
          return (_this$delegate19 = this.delegate) === null || _this$delegate19 === void 0 ? void 0 : _this$delegate19.inputControllerDidPaste(paste);
        };
      } else if (dataTransferIsPlainText(dataTransfer)) {
        var _this$delegate20;
        paste.type = "text/plain";
        paste.string = dataTransfer.getData("text/plain");
        (_this$delegate20 = this.delegate) === null || _this$delegate20 === void 0 ? void 0 : _this$delegate20.inputControllerWillPaste(paste);
        this.withTargetDOMRange(function() {
          var _this$responder33;
          return (_this$responder33 = this.responder) === null || _this$responder33 === void 0 ? void 0 : _this$responder33.insertString(paste.string);
        });
        this.afterRender = () => {
          var _this$delegate21;
          return (_this$delegate21 = this.delegate) === null || _this$delegate21 === void 0 ? void 0 : _this$delegate21.inputControllerDidPaste(paste);
        };
      } else if (html2) {
        var _this$delegate22;
        this.event.preventDefault();
        paste.type = "text/html";
        paste.html = html2;
        (_this$delegate22 = this.delegate) === null || _this$delegate22 === void 0 ? void 0 : _this$delegate22.inputControllerWillPaste(paste);
        this.withTargetDOMRange(function() {
          var _this$responder34;
          return (_this$responder34 = this.responder) === null || _this$responder34 === void 0 ? void 0 : _this$responder34.insertHTML(paste.html);
        });
        this.afterRender = () => {
          var _this$delegate23;
          return (_this$delegate23 = this.delegate) === null || _this$delegate23 === void 0 ? void 0 : _this$delegate23.inputControllerDidPaste(paste);
        };
      } else if ((_dataTransfer$files = dataTransfer.files) !== null && _dataTransfer$files !== void 0 && _dataTransfer$files.length) {
        var _this$delegate24;
        paste.type = "File";
        paste.file = dataTransfer.files[0];
        (_this$delegate24 = this.delegate) === null || _this$delegate24 === void 0 ? void 0 : _this$delegate24.inputControllerWillPaste(paste);
        this.withTargetDOMRange(function() {
          var _this$responder35;
          return (_this$responder35 = this.responder) === null || _this$responder35 === void 0 ? void 0 : _this$responder35.insertFile(paste.file);
        });
        this.afterRender = () => {
          var _this$delegate25;
          return (_this$delegate25 = this.delegate) === null || _this$delegate25 === void 0 ? void 0 : _this$delegate25.inputControllerDidPaste(paste);
        };
      }
    },
    insertFromYank() {
      return this.insertString(this.event.data);
    },
    insertLineBreak() {
      return this.insertString("\n");
    },
    insertLink() {
      return this.activateAttributeIfSupported("href", this.event.data);
    },
    insertOrderedList() {
      return this.toggleAttributeIfSupported("number");
    },
    insertParagraph() {
      var _this$delegate26;
      (_this$delegate26 = this.delegate) === null || _this$delegate26 === void 0 ? void 0 : _this$delegate26.inputControllerWillPerformTyping();
      return this.withTargetDOMRange(function() {
        var _this$responder36;
        return (_this$responder36 = this.responder) === null || _this$responder36 === void 0 ? void 0 : _this$responder36.insertLineBreak();
      });
    },
    insertReplacementText() {
      return this.insertString(this.event.dataTransfer.getData("text/plain"), {
        updatePosition: false
      });
    },
    insertText() {
      var _this$event$dataTrans;
      return this.insertString(this.event.data || ((_this$event$dataTrans = this.event.dataTransfer) === null || _this$event$dataTrans === void 0 ? void 0 : _this$event$dataTrans.getData("text/plain")));
    },
    insertTranspose() {
      return this.insertString(this.event.data);
    },
    insertUnorderedList() {
      return this.toggleAttributeIfSupported("bullet");
    }
  });
  var staticRangeToRange = function(staticRange) {
    const range2 = document.createRange();
    range2.setStart(staticRange.startContainer, staticRange.startOffset);
    range2.setEnd(staticRange.endContainer, staticRange.endOffset);
    return range2;
  };
  var dragEventHasFiles = (event) => {
    var _event$dataTransfer;
    return Array.from(((_event$dataTransfer = event.dataTransfer) === null || _event$dataTransfer === void 0 ? void 0 : _event$dataTransfer.types) || []).includes("Files");
  };
  var pasteEventHasFilesOnly = function(event) {
    const clipboard = event.clipboardData;
    if (clipboard) {
      return clipboard.types.includes("Files") && clipboard.types.length === 1 && clipboard.files.length >= 1;
    }
  };
  var pasteEventHasPlainTextOnly = function(event) {
    const clipboard = event.clipboardData;
    if (clipboard) {
      return clipboard.types.includes("text/plain") && clipboard.types.length === 1;
    }
  };
  var keyboardCommandFromKeyEvent = function(event) {
    const command = [];
    if (event.altKey) {
      command.push("alt");
    }
    if (event.shiftKey) {
      command.push("shift");
    }
    command.push(event.key);
    return command;
  };
  var pointFromEvent = (event) => ({
    x: event.clientX,
    y: event.clientY
  });
  var {
    lang,
    css,
    keyNames
  } = config;
  var undoable = function(fn) {
    return function() {
      const commands = fn.apply(this, arguments);
      commands.do();
      if (!this.undos) {
        this.undos = [];
      }
      this.undos.push(commands.undo);
    };
  };
  var AttachmentEditorController = class extends BasicObject {
    constructor(attachmentPiece, _element, container) {
      let options2 = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : {};
      super(...arguments);
      _defineProperty(this, "makeElementMutable", undoable(() => {
        return {
          do: () => {
            this.element.dataset.trixMutable = true;
          },
          undo: () => delete this.element.dataset.trixMutable
        };
      }));
      _defineProperty(this, "addToolbar", undoable(() => {
        const element = makeElement({
          tagName: "div",
          className: css.attachmentToolbar,
          data: {
            trixMutable: true
          },
          childNodes: makeElement({
            tagName: "div",
            className: "trix-button-row",
            childNodes: makeElement({
              tagName: "span",
              className: "trix-button-group trix-button-group--actions",
              childNodes: makeElement({
                tagName: "button",
                className: "trix-button trix-button--remove",
                textContent: lang.remove,
                attributes: {
                  title: lang.remove
                },
                data: {
                  trixAction: "remove"
                }
              })
            })
          })
        });
        if (this.attachment.isPreviewable()) {
          element.appendChild(makeElement({
            tagName: "div",
            className: css.attachmentMetadataContainer,
            childNodes: makeElement({
              tagName: "span",
              className: css.attachmentMetadata,
              childNodes: [makeElement({
                tagName: "span",
                className: css.attachmentName,
                textContent: this.attachment.getFilename(),
                attributes: {
                  title: this.attachment.getFilename()
                }
              }), makeElement({
                tagName: "span",
                className: css.attachmentSize,
                textContent: this.attachment.getFormattedFilesize()
              })]
            })
          }));
        }
        handleEvent("click", {
          onElement: element,
          withCallback: this.didClickToolbar
        });
        handleEvent("click", {
          onElement: element,
          matchingSelector: "[data-trix-action]",
          withCallback: this.didClickActionButton
        });
        return {
          do: () => this.element.appendChild(element),
          undo: () => removeNode(element)
        };
      }));
      _defineProperty(this, "installCaptionEditor", undoable(() => {
        const textarea = makeElement({
          tagName: "textarea",
          className: css.attachmentCaptionEditor,
          attributes: {
            placeholder: lang.captionPlaceholder
          },
          data: {
            trixMutable: true
          }
        });
        textarea.value = this.attachmentPiece.getCaption();
        const textareaClone = textarea.cloneNode();
        textareaClone.classList.add("trix-autoresize-clone");
        textareaClone.tabIndex = -1;
        const autoresize = function() {
          textareaClone.value = textarea.value;
          textarea.style.height = textareaClone.scrollHeight + "px";
        };
        handleEvent("input", {
          onElement: textarea,
          withCallback: autoresize
        });
        handleEvent("input", {
          onElement: textarea,
          withCallback: this.didInputCaption
        });
        handleEvent("keydown", {
          onElement: textarea,
          withCallback: this.didKeyDownCaption
        });
        handleEvent("change", {
          onElement: textarea,
          withCallback: this.didChangeCaption
        });
        handleEvent("blur", {
          onElement: textarea,
          withCallback: this.didBlurCaption
        });
        const figcaption = this.element.querySelector("figcaption");
        const editingFigcaption = figcaption.cloneNode();
        return {
          do: () => {
            figcaption.style.display = "none";
            editingFigcaption.appendChild(textarea);
            editingFigcaption.appendChild(textareaClone);
            editingFigcaption.classList.add("".concat(css.attachmentCaption, "--editing"));
            figcaption.parentElement.insertBefore(editingFigcaption, figcaption);
            autoresize();
            if (this.options.editCaption) {
              return defer(() => textarea.focus());
            }
          },
          undo() {
            removeNode(editingFigcaption);
            figcaption.style.display = null;
          }
        };
      }));
      this.didClickToolbar = this.didClickToolbar.bind(this);
      this.didClickActionButton = this.didClickActionButton.bind(this);
      this.didKeyDownCaption = this.didKeyDownCaption.bind(this);
      this.didInputCaption = this.didInputCaption.bind(this);
      this.didChangeCaption = this.didChangeCaption.bind(this);
      this.didBlurCaption = this.didBlurCaption.bind(this);
      this.attachmentPiece = attachmentPiece;
      this.element = _element;
      this.container = container;
      this.options = options2;
      this.attachment = this.attachmentPiece.attachment;
      if (tagName(this.element) === "a") {
        this.element = this.element.firstChild;
      }
      this.install();
    }
    install() {
      this.makeElementMutable();
      this.addToolbar();
      if (this.attachment.isPreviewable()) {
        this.installCaptionEditor();
      }
    }
    uninstall() {
      var _this$delegate;
      let undo = this.undos.pop();
      this.savePendingCaption();
      while (undo) {
        undo();
        undo = this.undos.pop();
      }
      (_this$delegate = this.delegate) === null || _this$delegate === void 0 ? void 0 : _this$delegate.didUninstallAttachmentEditor(this);
    }
    savePendingCaption() {
      if (this.pendingCaption) {
        const caption = this.pendingCaption;
        this.pendingCaption = null;
        if (caption) {
          var _this$delegate2, _this$delegate2$attac;
          (_this$delegate2 = this.delegate) === null || _this$delegate2 === void 0 ? void 0 : (_this$delegate2$attac = _this$delegate2.attachmentEditorDidRequestUpdatingAttributesForAttachment) === null || _this$delegate2$attac === void 0 ? void 0 : _this$delegate2$attac.call(_this$delegate2, {
            caption
          }, this.attachment);
        } else {
          var _this$delegate3, _this$delegate3$attac;
          (_this$delegate3 = this.delegate) === null || _this$delegate3 === void 0 ? void 0 : (_this$delegate3$attac = _this$delegate3.attachmentEditorDidRequestRemovingAttributeForAttachment) === null || _this$delegate3$attac === void 0 ? void 0 : _this$delegate3$attac.call(_this$delegate3, "caption", this.attachment);
        }
      }
    }
    didClickToolbar(event) {
      event.preventDefault();
      return event.stopPropagation();
    }
    didClickActionButton(event) {
      var _this$delegate4;
      const action = event.target.getAttribute("data-trix-action");
      switch (action) {
        case "remove":
          return (_this$delegate4 = this.delegate) === null || _this$delegate4 === void 0 ? void 0 : _this$delegate4.attachmentEditorDidRequestRemovalOfAttachment(this.attachment);
      }
    }
    didKeyDownCaption(event) {
      if (keyNames[event.keyCode] === "return") {
        var _this$delegate5, _this$delegate5$attac;
        event.preventDefault();
        this.savePendingCaption();
        return (_this$delegate5 = this.delegate) === null || _this$delegate5 === void 0 ? void 0 : (_this$delegate5$attac = _this$delegate5.attachmentEditorDidRequestDeselectingAttachment) === null || _this$delegate5$attac === void 0 ? void 0 : _this$delegate5$attac.call(_this$delegate5, this.attachment);
      }
    }
    didInputCaption(event) {
      this.pendingCaption = event.target.value.replace(/\s/g, " ").trim();
    }
    didChangeCaption(event) {
      return this.savePendingCaption();
    }
    didBlurCaption(event) {
      return this.savePendingCaption();
    }
  };
  var CompositionController = class extends BasicObject {
    constructor(element, composition) {
      super(...arguments);
      this.didFocus = this.didFocus.bind(this);
      this.didBlur = this.didBlur.bind(this);
      this.didClickAttachment = this.didClickAttachment.bind(this);
      this.element = element;
      this.composition = composition;
      this.documentView = new DocumentView(this.composition.document, {
        element: this.element
      });
      handleEvent("focus", {
        onElement: this.element,
        withCallback: this.didFocus
      });
      handleEvent("blur", {
        onElement: this.element,
        withCallback: this.didBlur
      });
      handleEvent("click", {
        onElement: this.element,
        matchingSelector: "a[contenteditable=false]",
        preventDefault: true
      });
      handleEvent("mousedown", {
        onElement: this.element,
        matchingSelector: attachmentSelector,
        withCallback: this.didClickAttachment
      });
      handleEvent("click", {
        onElement: this.element,
        matchingSelector: "a".concat(attachmentSelector),
        preventDefault: true
      });
    }
    didFocus(event) {
      var _this$blurPromise;
      const perform2 = () => {
        if (!this.focused) {
          var _this$delegate, _this$delegate$compos;
          this.focused = true;
          return (_this$delegate = this.delegate) === null || _this$delegate === void 0 ? void 0 : (_this$delegate$compos = _this$delegate.compositionControllerDidFocus) === null || _this$delegate$compos === void 0 ? void 0 : _this$delegate$compos.call(_this$delegate);
        }
      };
      return ((_this$blurPromise = this.blurPromise) === null || _this$blurPromise === void 0 ? void 0 : _this$blurPromise.then(perform2)) || perform2();
    }
    didBlur(event) {
      this.blurPromise = new Promise((resolve) => {
        return defer(() => {
          if (!innerElementIsActive(this.element)) {
            var _this$delegate2, _this$delegate2$compo;
            this.focused = null;
            (_this$delegate2 = this.delegate) === null || _this$delegate2 === void 0 ? void 0 : (_this$delegate2$compo = _this$delegate2.compositionControllerDidBlur) === null || _this$delegate2$compo === void 0 ? void 0 : _this$delegate2$compo.call(_this$delegate2);
          }
          this.blurPromise = null;
          return resolve();
        });
      });
    }
    didClickAttachment(event, target) {
      var _this$delegate3, _this$delegate3$compo;
      const attachment = this.findAttachmentForElement(target);
      const editCaption = !!findClosestElementFromNode(event.target, {
        matchingSelector: "figcaption"
      });
      return (_this$delegate3 = this.delegate) === null || _this$delegate3 === void 0 ? void 0 : (_this$delegate3$compo = _this$delegate3.compositionControllerDidSelectAttachment) === null || _this$delegate3$compo === void 0 ? void 0 : _this$delegate3$compo.call(_this$delegate3, attachment, {
        editCaption
      });
    }
    getSerializableElement() {
      if (this.isEditingAttachment()) {
        return this.documentView.shadowElement;
      } else {
        return this.element;
      }
    }
    render() {
      var _this$delegate6, _this$delegate6$compo;
      if (this.revision !== this.composition.revision) {
        this.documentView.setDocument(this.composition.document);
        this.documentView.render();
        this.revision = this.composition.revision;
      }
      if (this.canSyncDocumentView() && !this.documentView.isSynced()) {
        var _this$delegate4, _this$delegate4$compo, _this$delegate5, _this$delegate5$compo;
        (_this$delegate4 = this.delegate) === null || _this$delegate4 === void 0 ? void 0 : (_this$delegate4$compo = _this$delegate4.compositionControllerWillSyncDocumentView) === null || _this$delegate4$compo === void 0 ? void 0 : _this$delegate4$compo.call(_this$delegate4);
        this.documentView.sync();
        (_this$delegate5 = this.delegate) === null || _this$delegate5 === void 0 ? void 0 : (_this$delegate5$compo = _this$delegate5.compositionControllerDidSyncDocumentView) === null || _this$delegate5$compo === void 0 ? void 0 : _this$delegate5$compo.call(_this$delegate5);
      }
      return (_this$delegate6 = this.delegate) === null || _this$delegate6 === void 0 ? void 0 : (_this$delegate6$compo = _this$delegate6.compositionControllerDidRender) === null || _this$delegate6$compo === void 0 ? void 0 : _this$delegate6$compo.call(_this$delegate6);
    }
    rerenderViewForObject(object2) {
      this.invalidateViewForObject(object2);
      return this.render();
    }
    invalidateViewForObject(object2) {
      return this.documentView.invalidateViewForObject(object2);
    }
    isViewCachingEnabled() {
      return this.documentView.isViewCachingEnabled();
    }
    enableViewCaching() {
      return this.documentView.enableViewCaching();
    }
    disableViewCaching() {
      return this.documentView.disableViewCaching();
    }
    refreshViewCache() {
      return this.documentView.garbageCollectCachedViews();
    }
    isEditingAttachment() {
      return !!this.attachmentEditor;
    }
    installAttachmentEditorForAttachment(attachment, options2) {
      var _this$attachmentEdito;
      if (((_this$attachmentEdito = this.attachmentEditor) === null || _this$attachmentEdito === void 0 ? void 0 : _this$attachmentEdito.attachment) === attachment)
        return;
      const element = this.documentView.findElementForObject(attachment);
      if (!element)
        return;
      this.uninstallAttachmentEditor();
      const attachmentPiece = this.composition.document.getAttachmentPieceForAttachment(attachment);
      this.attachmentEditor = new AttachmentEditorController(attachmentPiece, element, this.element, options2);
      this.attachmentEditor.delegate = this;
    }
    uninstallAttachmentEditor() {
      var _this$attachmentEdito2;
      return (_this$attachmentEdito2 = this.attachmentEditor) === null || _this$attachmentEdito2 === void 0 ? void 0 : _this$attachmentEdito2.uninstall();
    }
    didUninstallAttachmentEditor() {
      this.attachmentEditor = null;
      return this.render();
    }
    attachmentEditorDidRequestUpdatingAttributesForAttachment(attributes2, attachment) {
      var _this$delegate7, _this$delegate7$compo;
      (_this$delegate7 = this.delegate) === null || _this$delegate7 === void 0 ? void 0 : (_this$delegate7$compo = _this$delegate7.compositionControllerWillUpdateAttachment) === null || _this$delegate7$compo === void 0 ? void 0 : _this$delegate7$compo.call(_this$delegate7, attachment);
      return this.composition.updateAttributesForAttachment(attributes2, attachment);
    }
    attachmentEditorDidRequestRemovingAttributeForAttachment(attribute, attachment) {
      var _this$delegate8, _this$delegate8$compo;
      (_this$delegate8 = this.delegate) === null || _this$delegate8 === void 0 ? void 0 : (_this$delegate8$compo = _this$delegate8.compositionControllerWillUpdateAttachment) === null || _this$delegate8$compo === void 0 ? void 0 : _this$delegate8$compo.call(_this$delegate8, attachment);
      return this.composition.removeAttributeForAttachment(attribute, attachment);
    }
    attachmentEditorDidRequestRemovalOfAttachment(attachment) {
      var _this$delegate9, _this$delegate9$compo;
      return (_this$delegate9 = this.delegate) === null || _this$delegate9 === void 0 ? void 0 : (_this$delegate9$compo = _this$delegate9.compositionControllerDidRequestRemovalOfAttachment) === null || _this$delegate9$compo === void 0 ? void 0 : _this$delegate9$compo.call(_this$delegate9, attachment);
    }
    attachmentEditorDidRequestDeselectingAttachment(attachment) {
      var _this$delegate10, _this$delegate10$comp;
      return (_this$delegate10 = this.delegate) === null || _this$delegate10 === void 0 ? void 0 : (_this$delegate10$comp = _this$delegate10.compositionControllerDidRequestDeselectingAttachment) === null || _this$delegate10$comp === void 0 ? void 0 : _this$delegate10$comp.call(_this$delegate10, attachment);
    }
    canSyncDocumentView() {
      return !this.isEditingAttachment();
    }
    findAttachmentForElement(element) {
      return this.composition.document.getAttachmentById(parseInt(element.dataset.trixId, 10));
    }
  };
  var attributeButtonSelector = "[data-trix-attribute]";
  var actionButtonSelector = "[data-trix-action]";
  var toolbarButtonSelector = "".concat(attributeButtonSelector, ", ").concat(actionButtonSelector);
  var dialogSelector = "[data-trix-dialog]";
  var activeDialogSelector = "".concat(dialogSelector, "[data-trix-active]");
  var dialogButtonSelector = "".concat(dialogSelector, " [data-trix-method]");
  var dialogInputSelector = "".concat(dialogSelector, " [data-trix-input]");
  var getInputForDialog = (element, attributeName) => {
    if (!attributeName) {
      attributeName = getAttributeName(element);
    }
    return element.querySelector("[data-trix-input][name='".concat(attributeName, "']"));
  };
  var getActionName = (element) => element.getAttribute("data-trix-action");
  var getAttributeName = (element) => {
    return element.getAttribute("data-trix-attribute") || element.getAttribute("data-trix-dialog-attribute");
  };
  var getDialogName = (element) => element.getAttribute("data-trix-dialog");
  var ToolbarController = class extends BasicObject {
    constructor(element) {
      super(element);
      this.didClickActionButton = this.didClickActionButton.bind(this);
      this.didClickAttributeButton = this.didClickAttributeButton.bind(this);
      this.didClickDialogButton = this.didClickDialogButton.bind(this);
      this.didKeyDownDialogInput = this.didKeyDownDialogInput.bind(this);
      this.element = element;
      this.attributes = {};
      this.actions = {};
      this.resetDialogInputs();
      handleEvent("mousedown", {
        onElement: this.element,
        matchingSelector: actionButtonSelector,
        withCallback: this.didClickActionButton
      });
      handleEvent("mousedown", {
        onElement: this.element,
        matchingSelector: attributeButtonSelector,
        withCallback: this.didClickAttributeButton
      });
      handleEvent("click", {
        onElement: this.element,
        matchingSelector: toolbarButtonSelector,
        preventDefault: true
      });
      handleEvent("click", {
        onElement: this.element,
        matchingSelector: dialogButtonSelector,
        withCallback: this.didClickDialogButton
      });
      handleEvent("keydown", {
        onElement: this.element,
        matchingSelector: dialogInputSelector,
        withCallback: this.didKeyDownDialogInput
      });
    }
    didClickActionButton(event, element) {
      var _this$delegate;
      (_this$delegate = this.delegate) === null || _this$delegate === void 0 ? void 0 : _this$delegate.toolbarDidClickButton();
      event.preventDefault();
      const actionName = getActionName(element);
      if (this.getDialog(actionName)) {
        return this.toggleDialog(actionName);
      } else {
        var _this$delegate2;
        return (_this$delegate2 = this.delegate) === null || _this$delegate2 === void 0 ? void 0 : _this$delegate2.toolbarDidInvokeAction(actionName);
      }
    }
    didClickAttributeButton(event, element) {
      var _this$delegate3;
      (_this$delegate3 = this.delegate) === null || _this$delegate3 === void 0 ? void 0 : _this$delegate3.toolbarDidClickButton();
      event.preventDefault();
      const attributeName = getAttributeName(element);
      if (this.getDialog(attributeName)) {
        this.toggleDialog(attributeName);
      } else {
        var _this$delegate4;
        (_this$delegate4 = this.delegate) === null || _this$delegate4 === void 0 ? void 0 : _this$delegate4.toolbarDidToggleAttribute(attributeName);
      }
      return this.refreshAttributeButtons();
    }
    didClickDialogButton(event, element) {
      const dialogElement = findClosestElementFromNode(element, {
        matchingSelector: dialogSelector
      });
      const method2 = element.getAttribute("data-trix-method");
      return this[method2].call(this, dialogElement);
    }
    didKeyDownDialogInput(event, element) {
      if (event.keyCode === 13) {
        event.preventDefault();
        const attribute = element.getAttribute("name");
        const dialog = this.getDialog(attribute);
        this.setAttribute(dialog);
      }
      if (event.keyCode === 27) {
        event.preventDefault();
        return this.hideDialog();
      }
    }
    updateActions(actions) {
      this.actions = actions;
      return this.refreshActionButtons();
    }
    refreshActionButtons() {
      return this.eachActionButton((element, actionName) => {
        element.disabled = this.actions[actionName] === false;
      });
    }
    eachActionButton(callback) {
      return Array.from(this.element.querySelectorAll(actionButtonSelector)).map((element) => callback(element, getActionName(element)));
    }
    updateAttributes(attributes2) {
      this.attributes = attributes2;
      return this.refreshAttributeButtons();
    }
    refreshAttributeButtons() {
      return this.eachAttributeButton((element, attributeName) => {
        element.disabled = this.attributes[attributeName] === false;
        if (this.attributes[attributeName] || this.dialogIsVisible(attributeName)) {
          element.setAttribute("data-trix-active", "");
          return element.classList.add("trix-active");
        } else {
          element.removeAttribute("data-trix-active");
          return element.classList.remove("trix-active");
        }
      });
    }
    eachAttributeButton(callback) {
      return Array.from(this.element.querySelectorAll(attributeButtonSelector)).map((element) => callback(element, getAttributeName(element)));
    }
    applyKeyboardCommand(keys) {
      const keyString = JSON.stringify(keys.sort());
      for (const button of Array.from(this.element.querySelectorAll("[data-trix-key]"))) {
        const buttonKeys = button.getAttribute("data-trix-key").split("+");
        const buttonKeyString = JSON.stringify(buttonKeys.sort());
        if (buttonKeyString === keyString) {
          triggerEvent("mousedown", {
            onElement: button
          });
          return true;
        }
      }
      return false;
    }
    dialogIsVisible(dialogName) {
      const element = this.getDialog(dialogName);
      if (element) {
        return element.hasAttribute("data-trix-active");
      }
    }
    toggleDialog(dialogName) {
      if (this.dialogIsVisible(dialogName)) {
        return this.hideDialog();
      } else {
        return this.showDialog(dialogName);
      }
    }
    showDialog(dialogName) {
      var _this$delegate5, _this$delegate6;
      this.hideDialog();
      (_this$delegate5 = this.delegate) === null || _this$delegate5 === void 0 ? void 0 : _this$delegate5.toolbarWillShowDialog();
      const element = this.getDialog(dialogName);
      element.setAttribute("data-trix-active", "");
      element.classList.add("trix-active");
      Array.from(element.querySelectorAll("input[disabled]")).forEach((disabledInput) => {
        disabledInput.removeAttribute("disabled");
      });
      const attributeName = getAttributeName(element);
      if (attributeName) {
        const input2 = getInputForDialog(element, dialogName);
        if (input2) {
          input2.value = this.attributes[attributeName] || "";
          input2.select();
        }
      }
      return (_this$delegate6 = this.delegate) === null || _this$delegate6 === void 0 ? void 0 : _this$delegate6.toolbarDidShowDialog(dialogName);
    }
    setAttribute(dialogElement) {
      const attributeName = getAttributeName(dialogElement);
      const input2 = getInputForDialog(dialogElement, attributeName);
      if (input2.willValidate && !input2.checkValidity()) {
        input2.setAttribute("data-trix-validate", "");
        input2.classList.add("trix-validate");
        return input2.focus();
      } else {
        var _this$delegate7;
        (_this$delegate7 = this.delegate) === null || _this$delegate7 === void 0 ? void 0 : _this$delegate7.toolbarDidUpdateAttribute(attributeName, input2.value);
        return this.hideDialog();
      }
    }
    removeAttribute(dialogElement) {
      var _this$delegate8;
      const attributeName = getAttributeName(dialogElement);
      (_this$delegate8 = this.delegate) === null || _this$delegate8 === void 0 ? void 0 : _this$delegate8.toolbarDidRemoveAttribute(attributeName);
      return this.hideDialog();
    }
    hideDialog() {
      const element = this.element.querySelector(activeDialogSelector);
      if (element) {
        var _this$delegate9;
        element.removeAttribute("data-trix-active");
        element.classList.remove("trix-active");
        this.resetDialogInputs();
        return (_this$delegate9 = this.delegate) === null || _this$delegate9 === void 0 ? void 0 : _this$delegate9.toolbarDidHideDialog(getDialogName(element));
      }
    }
    resetDialogInputs() {
      Array.from(this.element.querySelectorAll(dialogInputSelector)).forEach((input2) => {
        input2.setAttribute("disabled", "disabled");
        input2.removeAttribute("data-trix-validate");
        input2.classList.remove("trix-validate");
      });
    }
    getDialog(dialogName) {
      return this.element.querySelector("[data-trix-dialog=".concat(dialogName, "]"));
    }
  };
  var snapshotsAreEqual = (a, b) => rangesAreEqual(a.selectedRange, b.selectedRange) && a.document.isEqualTo(b.document);
  var EditorController = class extends Controller3 {
    constructor(_ref) {
      let {
        editorElement,
        document: document2,
        html: html2
      } = _ref;
      super(...arguments);
      this.editorElement = editorElement;
      this.selectionManager = new SelectionManager(this.editorElement);
      this.selectionManager.delegate = this;
      this.composition = new Composition();
      this.composition.delegate = this;
      this.attachmentManager = new AttachmentManager(this.composition.getAttachments());
      this.attachmentManager.delegate = this;
      this.inputController = config.input.getLevel() === 2 ? new Level2InputController(this.editorElement) : new Level0InputController(this.editorElement);
      this.inputController.delegate = this;
      this.inputController.responder = this.composition;
      this.compositionController = new CompositionController(this.editorElement, this.composition);
      this.compositionController.delegate = this;
      this.toolbarController = new ToolbarController(this.editorElement.toolbarElement);
      this.toolbarController.delegate = this;
      this.editor = new Editor(this.composition, this.selectionManager, this.editorElement);
      if (document2) {
        this.editor.loadDocument(document2);
      } else {
        this.editor.loadHTML(html2);
      }
    }
    registerSelectionManager() {
      return selectionChangeObserver.registerSelectionManager(this.selectionManager);
    }
    unregisterSelectionManager() {
      return selectionChangeObserver.unregisterSelectionManager(this.selectionManager);
    }
    render() {
      return this.compositionController.render();
    }
    reparse() {
      return this.composition.replaceHTML(this.editorElement.innerHTML);
    }
    compositionDidChangeDocument(document2) {
      this.notifyEditorElement("document-change");
      if (!this.handlingInput) {
        return this.render();
      }
    }
    compositionDidChangeCurrentAttributes(currentAttributes) {
      this.currentAttributes = currentAttributes;
      this.toolbarController.updateAttributes(this.currentAttributes);
      this.updateCurrentActions();
      return this.notifyEditorElement("attributes-change", {
        attributes: this.currentAttributes
      });
    }
    compositionDidPerformInsertionAtRange(range2) {
      if (this.pasting) {
        this.pastedRange = range2;
      }
    }
    compositionShouldAcceptFile(file) {
      return this.notifyEditorElement("file-accept", {
        file
      });
    }
    compositionDidAddAttachment(attachment) {
      const managedAttachment = this.attachmentManager.manageAttachment(attachment);
      return this.notifyEditorElement("attachment-add", {
        attachment: managedAttachment
      });
    }
    compositionDidEditAttachment(attachment) {
      this.compositionController.rerenderViewForObject(attachment);
      const managedAttachment = this.attachmentManager.manageAttachment(attachment);
      this.notifyEditorElement("attachment-edit", {
        attachment: managedAttachment
      });
      return this.notifyEditorElement("change");
    }
    compositionDidChangeAttachmentPreviewURL(attachment) {
      this.compositionController.invalidateViewForObject(attachment);
      return this.notifyEditorElement("change");
    }
    compositionDidRemoveAttachment(attachment) {
      const managedAttachment = this.attachmentManager.unmanageAttachment(attachment);
      return this.notifyEditorElement("attachment-remove", {
        attachment: managedAttachment
      });
    }
    compositionDidStartEditingAttachment(attachment, options2) {
      this.attachmentLocationRange = this.composition.document.getLocationRangeOfAttachment(attachment);
      this.compositionController.installAttachmentEditorForAttachment(attachment, options2);
      return this.selectionManager.setLocationRange(this.attachmentLocationRange);
    }
    compositionDidStopEditingAttachment(attachment) {
      this.compositionController.uninstallAttachmentEditor();
      this.attachmentLocationRange = null;
    }
    compositionDidRequestChangingSelectionToLocationRange(locationRange) {
      if (this.loadingSnapshot && !this.isFocused())
        return;
      this.requestedLocationRange = locationRange;
      this.compositionRevisionWhenLocationRangeRequested = this.composition.revision;
      if (!this.handlingInput) {
        return this.render();
      }
    }
    compositionWillLoadSnapshot() {
      this.loadingSnapshot = true;
    }
    compositionDidLoadSnapshot() {
      this.compositionController.refreshViewCache();
      this.render();
      this.loadingSnapshot = false;
    }
    getSelectionManager() {
      return this.selectionManager;
    }
    attachmentManagerDidRequestRemovalOfAttachment(attachment) {
      return this.removeAttachment(attachment);
    }
    compositionControllerWillSyncDocumentView() {
      this.inputController.editorWillSyncDocumentView();
      this.selectionManager.lock();
      return this.selectionManager.clearSelection();
    }
    compositionControllerDidSyncDocumentView() {
      this.inputController.editorDidSyncDocumentView();
      this.selectionManager.unlock();
      this.updateCurrentActions();
      return this.notifyEditorElement("sync");
    }
    compositionControllerDidRender() {
      if (this.requestedLocationRange) {
        if (this.compositionRevisionWhenLocationRangeRequested === this.composition.revision) {
          this.selectionManager.setLocationRange(this.requestedLocationRange);
        }
        this.requestedLocationRange = null;
        this.compositionRevisionWhenLocationRangeRequested = null;
      }
      if (this.renderedCompositionRevision !== this.composition.revision) {
        this.runEditorFilters();
        this.composition.updateCurrentAttributes();
        this.notifyEditorElement("render");
      }
      this.renderedCompositionRevision = this.composition.revision;
    }
    compositionControllerDidFocus() {
      if (this.isFocusedInvisibly()) {
        this.setLocationRange({
          index: 0,
          offset: 0
        });
      }
      this.toolbarController.hideDialog();
      return this.notifyEditorElement("focus");
    }
    compositionControllerDidBlur() {
      return this.notifyEditorElement("blur");
    }
    compositionControllerDidSelectAttachment(attachment, options2) {
      this.toolbarController.hideDialog();
      return this.composition.editAttachment(attachment, options2);
    }
    compositionControllerDidRequestDeselectingAttachment(attachment) {
      const locationRange = this.attachmentLocationRange || this.composition.document.getLocationRangeOfAttachment(attachment);
      return this.selectionManager.setLocationRange(locationRange[1]);
    }
    compositionControllerWillUpdateAttachment(attachment) {
      return this.editor.recordUndoEntry("Edit Attachment", {
        context: attachment.id,
        consolidatable: true
      });
    }
    compositionControllerDidRequestRemovalOfAttachment(attachment) {
      return this.removeAttachment(attachment);
    }
    inputControllerWillHandleInput() {
      this.handlingInput = true;
      this.requestedRender = false;
    }
    inputControllerDidRequestRender() {
      this.requestedRender = true;
    }
    inputControllerDidHandleInput() {
      this.handlingInput = false;
      if (this.requestedRender) {
        this.requestedRender = false;
        return this.render();
      }
    }
    inputControllerDidAllowUnhandledInput() {
      return this.notifyEditorElement("change");
    }
    inputControllerDidRequestReparse() {
      return this.reparse();
    }
    inputControllerWillPerformTyping() {
      return this.recordTypingUndoEntry();
    }
    inputControllerWillPerformFormatting(attributeName) {
      return this.recordFormattingUndoEntry(attributeName);
    }
    inputControllerWillCutText() {
      return this.editor.recordUndoEntry("Cut");
    }
    inputControllerWillPaste(paste) {
      this.editor.recordUndoEntry("Paste");
      this.pasting = true;
      return this.notifyEditorElement("before-paste", {
        paste
      });
    }
    inputControllerDidPaste(paste) {
      paste.range = this.pastedRange;
      this.pastedRange = null;
      this.pasting = null;
      return this.notifyEditorElement("paste", {
        paste
      });
    }
    inputControllerWillMoveText() {
      return this.editor.recordUndoEntry("Move");
    }
    inputControllerWillAttachFiles() {
      return this.editor.recordUndoEntry("Drop Files");
    }
    inputControllerWillPerformUndo() {
      return this.editor.undo();
    }
    inputControllerWillPerformRedo() {
      return this.editor.redo();
    }
    inputControllerDidReceiveKeyboardCommand(keys) {
      return this.toolbarController.applyKeyboardCommand(keys);
    }
    inputControllerDidStartDrag() {
      this.locationRangeBeforeDrag = this.selectionManager.getLocationRange();
    }
    inputControllerDidReceiveDragOverPoint(point) {
      return this.selectionManager.setLocationRangeFromPointRange(point);
    }
    inputControllerDidCancelDrag() {
      this.selectionManager.setLocationRange(this.locationRangeBeforeDrag);
      this.locationRangeBeforeDrag = null;
    }
    locationRangeDidChange(locationRange) {
      this.composition.updateCurrentAttributes();
      this.updateCurrentActions();
      if (this.attachmentLocationRange && !rangesAreEqual(this.attachmentLocationRange, locationRange)) {
        this.composition.stopEditingAttachment();
      }
      return this.notifyEditorElement("selection-change");
    }
    toolbarDidClickButton() {
      if (!this.getLocationRange()) {
        return this.setLocationRange({
          index: 0,
          offset: 0
        });
      }
    }
    toolbarDidInvokeAction(actionName) {
      return this.invokeAction(actionName);
    }
    toolbarDidToggleAttribute(attributeName) {
      this.recordFormattingUndoEntry(attributeName);
      this.composition.toggleCurrentAttribute(attributeName);
      this.render();
      if (!this.selectionFrozen) {
        return this.editorElement.focus();
      }
    }
    toolbarDidUpdateAttribute(attributeName, value) {
      this.recordFormattingUndoEntry(attributeName);
      this.composition.setCurrentAttribute(attributeName, value);
      this.render();
      if (!this.selectionFrozen) {
        return this.editorElement.focus();
      }
    }
    toolbarDidRemoveAttribute(attributeName) {
      this.recordFormattingUndoEntry(attributeName);
      this.composition.removeCurrentAttribute(attributeName);
      this.render();
      if (!this.selectionFrozen) {
        return this.editorElement.focus();
      }
    }
    toolbarWillShowDialog(dialogElement) {
      this.composition.expandSelectionForEditing();
      return this.freezeSelection();
    }
    toolbarDidShowDialog(dialogName) {
      return this.notifyEditorElement("toolbar-dialog-show", {
        dialogName
      });
    }
    toolbarDidHideDialog(dialogName) {
      this.thawSelection();
      this.editorElement.focus();
      return this.notifyEditorElement("toolbar-dialog-hide", {
        dialogName
      });
    }
    freezeSelection() {
      if (!this.selectionFrozen) {
        this.selectionManager.lock();
        this.composition.freezeSelection();
        this.selectionFrozen = true;
        return this.render();
      }
    }
    thawSelection() {
      if (this.selectionFrozen) {
        this.composition.thawSelection();
        this.selectionManager.unlock();
        this.selectionFrozen = false;
        return this.render();
      }
    }
    canInvokeAction(actionName) {
      if (this.actionIsExternal(actionName)) {
        return true;
      } else {
        var _this$actions$actionN, _this$actions$actionN2;
        return !!((_this$actions$actionN = this.actions[actionName]) !== null && _this$actions$actionN !== void 0 && (_this$actions$actionN2 = _this$actions$actionN.test) !== null && _this$actions$actionN2 !== void 0 && _this$actions$actionN2.call(this));
      }
    }
    invokeAction(actionName) {
      if (this.actionIsExternal(actionName)) {
        return this.notifyEditorElement("action-invoke", {
          actionName
        });
      } else {
        var _this$actions$actionN3, _this$actions$actionN4;
        return (_this$actions$actionN3 = this.actions[actionName]) === null || _this$actions$actionN3 === void 0 ? void 0 : (_this$actions$actionN4 = _this$actions$actionN3.perform) === null || _this$actions$actionN4 === void 0 ? void 0 : _this$actions$actionN4.call(this);
      }
    }
    actionIsExternal(actionName) {
      return /^x-./.test(actionName);
    }
    getCurrentActions() {
      const result = {};
      for (const actionName in this.actions) {
        result[actionName] = this.canInvokeAction(actionName);
      }
      return result;
    }
    updateCurrentActions() {
      const currentActions = this.getCurrentActions();
      if (!objectsAreEqual(currentActions, this.currentActions)) {
        this.currentActions = currentActions;
        this.toolbarController.updateActions(this.currentActions);
        return this.notifyEditorElement("actions-change", {
          actions: this.currentActions
        });
      }
    }
    runEditorFilters() {
      let snapshot = this.composition.getSnapshot();
      Array.from(this.editor.filters).forEach((filter) => {
        const {
          document: document2,
          selectedRange
        } = snapshot;
        snapshot = filter.call(this.editor, snapshot) || {};
        if (!snapshot.document) {
          snapshot.document = document2;
        }
        if (!snapshot.selectedRange) {
          snapshot.selectedRange = selectedRange;
        }
      });
      if (!snapshotsAreEqual(snapshot, this.composition.getSnapshot())) {
        return this.composition.loadSnapshot(snapshot);
      }
    }
    updateInputElement() {
      const element = this.compositionController.getSerializableElement();
      const value = serializeToContentType(element, "text/html");
      return this.editorElement.setInputElementValue(value);
    }
    notifyEditorElement(message, data2) {
      switch (message) {
        case "document-change":
          this.documentChangedSinceLastRender = true;
          break;
        case "render":
          if (this.documentChangedSinceLastRender) {
            this.documentChangedSinceLastRender = false;
            this.notifyEditorElement("change");
          }
          break;
        case "change":
        case "attachment-add":
        case "attachment-edit":
        case "attachment-remove":
          this.updateInputElement();
          break;
      }
      return this.editorElement.notify(message, data2);
    }
    removeAttachment(attachment) {
      this.editor.recordUndoEntry("Delete Attachment");
      this.composition.removeAttachment(attachment);
      return this.render();
    }
    recordFormattingUndoEntry(attributeName) {
      const blockConfig = getBlockConfig(attributeName);
      const locationRange = this.selectionManager.getLocationRange();
      if (blockConfig || !rangeIsCollapsed(locationRange)) {
        return this.editor.recordUndoEntry("Formatting", {
          context: this.getUndoContext(),
          consolidatable: true
        });
      }
    }
    recordTypingUndoEntry() {
      return this.editor.recordUndoEntry("Typing", {
        context: this.getUndoContext(this.currentAttributes),
        consolidatable: true
      });
    }
    getUndoContext() {
      for (var _len = arguments.length, context = new Array(_len), _key = 0; _key < _len; _key++) {
        context[_key] = arguments[_key];
      }
      return [this.getLocationContext(), this.getTimeContext(), ...Array.from(context)];
    }
    getLocationContext() {
      const locationRange = this.selectionManager.getLocationRange();
      if (rangeIsCollapsed(locationRange)) {
        return locationRange[0].index;
      } else {
        return locationRange;
      }
    }
    getTimeContext() {
      if (config.undoInterval > 0) {
        return Math.floor(new Date().getTime() / config.undoInterval);
      } else {
        return 0;
      }
    }
    isFocused() {
      var _this$editorElement$o;
      return this.editorElement === ((_this$editorElement$o = this.editorElement.ownerDocument) === null || _this$editorElement$o === void 0 ? void 0 : _this$editorElement$o.activeElement);
    }
    isFocusedInvisibly() {
      return this.isFocused() && !this.getLocationRange();
    }
    get actions() {
      return this.constructor.actions;
    }
  };
  _defineProperty(EditorController, "actions", {
    undo: {
      test() {
        return this.editor.canUndo();
      },
      perform() {
        return this.editor.undo();
      }
    },
    redo: {
      test() {
        return this.editor.canRedo();
      },
      perform() {
        return this.editor.redo();
      }
    },
    link: {
      test() {
        return this.editor.canActivateAttribute("href");
      }
    },
    increaseNestingLevel: {
      test() {
        return this.editor.canIncreaseNestingLevel();
      },
      perform() {
        return this.editor.increaseNestingLevel() && this.render();
      }
    },
    decreaseNestingLevel: {
      test() {
        return this.editor.canDecreaseNestingLevel();
      },
      perform() {
        return this.editor.decreaseNestingLevel() && this.render();
      }
    },
    attachFiles: {
      test() {
        return true;
      },
      perform() {
        return config.input.pickFiles(this.editor.insertFiles);
      }
    }
  });
  EditorController.proxyMethod("getSelectionManager().setLocationRange");
  EditorController.proxyMethod("getSelectionManager().getLocationRange");
  installDefaultCSSForTagName("trix-toolbar", "%t {\n  display: block;\n}\n\n%t {\n  white-space: nowrap;\n}\n\n%t [data-trix-dialog] {\n  display: none;\n}\n\n%t [data-trix-dialog][data-trix-active] {\n  display: block;\n}\n\n%t [data-trix-dialog] [data-trix-validate]:invalid {\n  background-color: #ffdddd;\n}");
  var TrixToolbarElement = class extends HTMLElement {
    connectedCallback() {
      if (this.innerHTML === "") {
        this.innerHTML = config.toolbar.getDefaultHTML();
      }
    }
  };
  window.customElements.define("trix-toolbar", TrixToolbarElement);
  var id = 0;
  var autofocus = function(element) {
    if (!document.querySelector(":focus")) {
      if (element.hasAttribute("autofocus") && document.querySelector("[autofocus]") === element) {
        return element.focus();
      }
    }
  };
  var makeEditable = function(element) {
    if (element.hasAttribute("contenteditable")) {
      return;
    }
    element.setAttribute("contenteditable", "");
    return handleEventOnce("focus", {
      onElement: element,
      withCallback() {
        return configureContentEditable(element);
      }
    });
  };
  var configureContentEditable = function(element) {
    disableObjectResizing(element);
    return setDefaultParagraphSeparator(element);
  };
  var disableObjectResizing = function(element) {
    var _document$queryComman, _document;
    if ((_document$queryComman = (_document = document).queryCommandSupported) !== null && _document$queryComman !== void 0 && _document$queryComman.call(_document, "enableObjectResizing")) {
      document.execCommand("enableObjectResizing", false, false);
      return handleEvent("mscontrolselect", {
        onElement: element,
        preventDefault: true
      });
    }
  };
  var setDefaultParagraphSeparator = function(element) {
    var _document$queryComman2, _document2;
    if ((_document$queryComman2 = (_document2 = document).queryCommandSupported) !== null && _document$queryComman2 !== void 0 && _document$queryComman2.call(_document2, "DefaultParagraphSeparator")) {
      const {
        tagName: tagName2
      } = config.blockAttributes.default;
      if (["div", "p"].includes(tagName2)) {
        return document.execCommand("DefaultParagraphSeparator", false, tagName2);
      }
    }
  };
  var addAccessibilityRole = function(element) {
    if (element.hasAttribute("role")) {
      return;
    }
    return element.setAttribute("role", "textbox");
  };
  var ensureAriaLabel = function(element) {
    if (element.hasAttribute("aria-label") || element.hasAttribute("aria-labelledby")) {
      return;
    }
    const update = function() {
      const texts = Array.from(element.labels).map((label) => {
        if (!label.contains(element))
          return label.textContent;
      }).filter((text2) => text2);
      const text = texts.join(" ");
      if (text) {
        return element.setAttribute("aria-label", text);
      } else {
        return element.removeAttribute("aria-label");
      }
    };
    update();
    return handleEvent("focus", {
      onElement: element,
      withCallback: update
    });
  };
  var cursorTargetStyles = function() {
    if (config.browser.forcesObjectResizing) {
      return {
        display: "inline",
        width: "auto"
      };
    } else {
      return {
        display: "inline-block",
        width: "1px"
      };
    }
  }();
  installDefaultCSSForTagName("trix-editor", "%t {\n    display: block;\n}\n\n%t:empty:not(:focus)::before {\n    content: attr(placeholder);\n    color: graytext;\n    cursor: text;\n    pointer-events: none;\n    white-space: pre-line;\n}\n\n%t a[contenteditable=false] {\n    cursor: text;\n}\n\n%t img {\n    max-width: 100%;\n    height: auto;\n}\n\n%t ".concat(attachmentSelector, " figcaption textarea {\n    resize: none;\n}\n\n%t ").concat(attachmentSelector, " figcaption textarea.trix-autoresize-clone {\n    position: absolute;\n    left: -9999px;\n    max-height: 0px;\n}\n\n%t ").concat(attachmentSelector, " figcaption[data-trix-placeholder]:empty::before {\n    content: attr(data-trix-placeholder);\n    color: graytext;\n}\n\n%t [data-trix-cursor-target] {\n    display: ").concat(cursorTargetStyles.display, " !important;\n    width: ").concat(cursorTargetStyles.width, " !important;\n    padding: 0 !important;\n    margin: 0 !important;\n    border: none !important;\n}\n\n%t [data-trix-cursor-target=left] {\n    vertical-align: top !important;\n    margin-left: -1px !important;\n}\n\n%t [data-trix-cursor-target=right] {\n    vertical-align: bottom !important;\n    margin-right: -1px !important;\n}"));
  var TrixEditorElement = class extends HTMLElement {
    get trixId() {
      if (this.hasAttribute("trix-id")) {
        return this.getAttribute("trix-id");
      } else {
        this.setAttribute("trix-id", ++id);
        return this.trixId;
      }
    }
    get labels() {
      const labels = [];
      if (this.id && this.ownerDocument) {
        labels.push(...Array.from(this.ownerDocument.querySelectorAll("label[for='".concat(this.id, "']")) || []));
      }
      const label = findClosestElementFromNode(this, {
        matchingSelector: "label"
      });
      if (label) {
        if ([this, null].includes(label.control)) {
          labels.push(label);
        }
      }
      return labels;
    }
    get toolbarElement() {
      if (this.hasAttribute("toolbar")) {
        var _this$ownerDocument;
        return (_this$ownerDocument = this.ownerDocument) === null || _this$ownerDocument === void 0 ? void 0 : _this$ownerDocument.getElementById(this.getAttribute("toolbar"));
      } else if (this.parentNode) {
        const toolbarId = "trix-toolbar-".concat(this.trixId);
        this.setAttribute("toolbar", toolbarId);
        const element = makeElement("trix-toolbar", {
          id: toolbarId
        });
        this.parentNode.insertBefore(element, this);
        return element;
      } else {
        return void 0;
      }
    }
    get form() {
      var _this$inputElement;
      return (_this$inputElement = this.inputElement) === null || _this$inputElement === void 0 ? void 0 : _this$inputElement.form;
    }
    get inputElement() {
      if (this.hasAttribute("input")) {
        var _this$ownerDocument2;
        return (_this$ownerDocument2 = this.ownerDocument) === null || _this$ownerDocument2 === void 0 ? void 0 : _this$ownerDocument2.getElementById(this.getAttribute("input"));
      } else if (this.parentNode) {
        const inputId = "trix-input-".concat(this.trixId);
        this.setAttribute("input", inputId);
        const element = makeElement("input", {
          type: "hidden",
          id: inputId
        });
        this.parentNode.insertBefore(element, this.nextElementSibling);
        return element;
      } else {
        return void 0;
      }
    }
    get editor() {
      var _this$editorControlle;
      return (_this$editorControlle = this.editorController) === null || _this$editorControlle === void 0 ? void 0 : _this$editorControlle.editor;
    }
    get name() {
      var _this$inputElement2;
      return (_this$inputElement2 = this.inputElement) === null || _this$inputElement2 === void 0 ? void 0 : _this$inputElement2.name;
    }
    get value() {
      var _this$inputElement3;
      return (_this$inputElement3 = this.inputElement) === null || _this$inputElement3 === void 0 ? void 0 : _this$inputElement3.value;
    }
    set value(defaultValue) {
      var _this$editor;
      this.defaultValue = defaultValue;
      (_this$editor = this.editor) === null || _this$editor === void 0 ? void 0 : _this$editor.loadHTML(this.defaultValue);
    }
    notify(message, data2) {
      if (this.editorController) {
        return triggerEvent("trix-".concat(message), {
          onElement: this,
          attributes: data2
        });
      }
    }
    setInputElementValue(value) {
      if (this.inputElement) {
        this.inputElement.value = value;
      }
    }
    connectedCallback() {
      if (!this.hasAttribute("data-trix-internal")) {
        makeEditable(this);
        addAccessibilityRole(this);
        ensureAriaLabel(this);
        if (!this.editorController) {
          triggerEvent("trix-before-initialize", {
            onElement: this
          });
          this.editorController = new EditorController({
            editorElement: this,
            html: this.defaultValue = this.value
          });
          requestAnimationFrame(() => triggerEvent("trix-initialize", {
            onElement: this
          }));
        }
        this.editorController.registerSelectionManager();
        this.registerResetListener();
        this.registerClickListener();
        autofocus(this);
      }
    }
    disconnectedCallback() {
      var _this$editorControlle2;
      (_this$editorControlle2 = this.editorController) === null || _this$editorControlle2 === void 0 ? void 0 : _this$editorControlle2.unregisterSelectionManager();
      this.unregisterResetListener();
      return this.unregisterClickListener();
    }
    registerResetListener() {
      this.resetListener = this.resetBubbled.bind(this);
      return window.addEventListener("reset", this.resetListener, false);
    }
    unregisterResetListener() {
      return window.removeEventListener("reset", this.resetListener, false);
    }
    registerClickListener() {
      this.clickListener = this.clickBubbled.bind(this);
      return window.addEventListener("click", this.clickListener, false);
    }
    unregisterClickListener() {
      return window.removeEventListener("click", this.clickListener, false);
    }
    resetBubbled(event) {
      if (event.defaultPrevented)
        return;
      if (event.target !== this.form)
        return;
      return this.reset();
    }
    clickBubbled(event) {
      if (event.defaultPrevented)
        return;
      if (this.contains(event.target))
        return;
      const label = findClosestElementFromNode(event.target, {
        matchingSelector: "label"
      });
      if (!label)
        return;
      if (!Array.from(this.labels).includes(label))
        return;
      return this.focus();
    }
    reset() {
      this.value = this.defaultValue;
    }
  };
  window.customElements.define("trix-editor", TrixEditorElement);

  // ../../node_modules/@rails/actiontext/app/assets/javascripts/actiontext.js
  var commonjsGlobal = typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : {};
  var activestorage = { exports: {} };
  (function(module, exports) {
    (function(global2, factory) {
      factory(exports);
    })(commonjsGlobal, function(exports2) {
      var sparkMd5 = {
        exports: {}
      };
      (function(module2, exports3) {
        (function(factory) {
          {
            module2.exports = factory();
          }
        })(function(undefined$1) {
          var hex_chr = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f"];
          function md5cycle(x, k) {
            var a = x[0], b = x[1], c = x[2], d = x[3];
            a += (b & c | ~b & d) + k[0] - 680876936 | 0;
            a = (a << 7 | a >>> 25) + b | 0;
            d += (a & b | ~a & c) + k[1] - 389564586 | 0;
            d = (d << 12 | d >>> 20) + a | 0;
            c += (d & a | ~d & b) + k[2] + 606105819 | 0;
            c = (c << 17 | c >>> 15) + d | 0;
            b += (c & d | ~c & a) + k[3] - 1044525330 | 0;
            b = (b << 22 | b >>> 10) + c | 0;
            a += (b & c | ~b & d) + k[4] - 176418897 | 0;
            a = (a << 7 | a >>> 25) + b | 0;
            d += (a & b | ~a & c) + k[5] + 1200080426 | 0;
            d = (d << 12 | d >>> 20) + a | 0;
            c += (d & a | ~d & b) + k[6] - 1473231341 | 0;
            c = (c << 17 | c >>> 15) + d | 0;
            b += (c & d | ~c & a) + k[7] - 45705983 | 0;
            b = (b << 22 | b >>> 10) + c | 0;
            a += (b & c | ~b & d) + k[8] + 1770035416 | 0;
            a = (a << 7 | a >>> 25) + b | 0;
            d += (a & b | ~a & c) + k[9] - 1958414417 | 0;
            d = (d << 12 | d >>> 20) + a | 0;
            c += (d & a | ~d & b) + k[10] - 42063 | 0;
            c = (c << 17 | c >>> 15) + d | 0;
            b += (c & d | ~c & a) + k[11] - 1990404162 | 0;
            b = (b << 22 | b >>> 10) + c | 0;
            a += (b & c | ~b & d) + k[12] + 1804603682 | 0;
            a = (a << 7 | a >>> 25) + b | 0;
            d += (a & b | ~a & c) + k[13] - 40341101 | 0;
            d = (d << 12 | d >>> 20) + a | 0;
            c += (d & a | ~d & b) + k[14] - 1502002290 | 0;
            c = (c << 17 | c >>> 15) + d | 0;
            b += (c & d | ~c & a) + k[15] + 1236535329 | 0;
            b = (b << 22 | b >>> 10) + c | 0;
            a += (b & d | c & ~d) + k[1] - 165796510 | 0;
            a = (a << 5 | a >>> 27) + b | 0;
            d += (a & c | b & ~c) + k[6] - 1069501632 | 0;
            d = (d << 9 | d >>> 23) + a | 0;
            c += (d & b | a & ~b) + k[11] + 643717713 | 0;
            c = (c << 14 | c >>> 18) + d | 0;
            b += (c & a | d & ~a) + k[0] - 373897302 | 0;
            b = (b << 20 | b >>> 12) + c | 0;
            a += (b & d | c & ~d) + k[5] - 701558691 | 0;
            a = (a << 5 | a >>> 27) + b | 0;
            d += (a & c | b & ~c) + k[10] + 38016083 | 0;
            d = (d << 9 | d >>> 23) + a | 0;
            c += (d & b | a & ~b) + k[15] - 660478335 | 0;
            c = (c << 14 | c >>> 18) + d | 0;
            b += (c & a | d & ~a) + k[4] - 405537848 | 0;
            b = (b << 20 | b >>> 12) + c | 0;
            a += (b & d | c & ~d) + k[9] + 568446438 | 0;
            a = (a << 5 | a >>> 27) + b | 0;
            d += (a & c | b & ~c) + k[14] - 1019803690 | 0;
            d = (d << 9 | d >>> 23) + a | 0;
            c += (d & b | a & ~b) + k[3] - 187363961 | 0;
            c = (c << 14 | c >>> 18) + d | 0;
            b += (c & a | d & ~a) + k[8] + 1163531501 | 0;
            b = (b << 20 | b >>> 12) + c | 0;
            a += (b & d | c & ~d) + k[13] - 1444681467 | 0;
            a = (a << 5 | a >>> 27) + b | 0;
            d += (a & c | b & ~c) + k[2] - 51403784 | 0;
            d = (d << 9 | d >>> 23) + a | 0;
            c += (d & b | a & ~b) + k[7] + 1735328473 | 0;
            c = (c << 14 | c >>> 18) + d | 0;
            b += (c & a | d & ~a) + k[12] - 1926607734 | 0;
            b = (b << 20 | b >>> 12) + c | 0;
            a += (b ^ c ^ d) + k[5] - 378558 | 0;
            a = (a << 4 | a >>> 28) + b | 0;
            d += (a ^ b ^ c) + k[8] - 2022574463 | 0;
            d = (d << 11 | d >>> 21) + a | 0;
            c += (d ^ a ^ b) + k[11] + 1839030562 | 0;
            c = (c << 16 | c >>> 16) + d | 0;
            b += (c ^ d ^ a) + k[14] - 35309556 | 0;
            b = (b << 23 | b >>> 9) + c | 0;
            a += (b ^ c ^ d) + k[1] - 1530992060 | 0;
            a = (a << 4 | a >>> 28) + b | 0;
            d += (a ^ b ^ c) + k[4] + 1272893353 | 0;
            d = (d << 11 | d >>> 21) + a | 0;
            c += (d ^ a ^ b) + k[7] - 155497632 | 0;
            c = (c << 16 | c >>> 16) + d | 0;
            b += (c ^ d ^ a) + k[10] - 1094730640 | 0;
            b = (b << 23 | b >>> 9) + c | 0;
            a += (b ^ c ^ d) + k[13] + 681279174 | 0;
            a = (a << 4 | a >>> 28) + b | 0;
            d += (a ^ b ^ c) + k[0] - 358537222 | 0;
            d = (d << 11 | d >>> 21) + a | 0;
            c += (d ^ a ^ b) + k[3] - 722521979 | 0;
            c = (c << 16 | c >>> 16) + d | 0;
            b += (c ^ d ^ a) + k[6] + 76029189 | 0;
            b = (b << 23 | b >>> 9) + c | 0;
            a += (b ^ c ^ d) + k[9] - 640364487 | 0;
            a = (a << 4 | a >>> 28) + b | 0;
            d += (a ^ b ^ c) + k[12] - 421815835 | 0;
            d = (d << 11 | d >>> 21) + a | 0;
            c += (d ^ a ^ b) + k[15] + 530742520 | 0;
            c = (c << 16 | c >>> 16) + d | 0;
            b += (c ^ d ^ a) + k[2] - 995338651 | 0;
            b = (b << 23 | b >>> 9) + c | 0;
            a += (c ^ (b | ~d)) + k[0] - 198630844 | 0;
            a = (a << 6 | a >>> 26) + b | 0;
            d += (b ^ (a | ~c)) + k[7] + 1126891415 | 0;
            d = (d << 10 | d >>> 22) + a | 0;
            c += (a ^ (d | ~b)) + k[14] - 1416354905 | 0;
            c = (c << 15 | c >>> 17) + d | 0;
            b += (d ^ (c | ~a)) + k[5] - 57434055 | 0;
            b = (b << 21 | b >>> 11) + c | 0;
            a += (c ^ (b | ~d)) + k[12] + 1700485571 | 0;
            a = (a << 6 | a >>> 26) + b | 0;
            d += (b ^ (a | ~c)) + k[3] - 1894986606 | 0;
            d = (d << 10 | d >>> 22) + a | 0;
            c += (a ^ (d | ~b)) + k[10] - 1051523 | 0;
            c = (c << 15 | c >>> 17) + d | 0;
            b += (d ^ (c | ~a)) + k[1] - 2054922799 | 0;
            b = (b << 21 | b >>> 11) + c | 0;
            a += (c ^ (b | ~d)) + k[8] + 1873313359 | 0;
            a = (a << 6 | a >>> 26) + b | 0;
            d += (b ^ (a | ~c)) + k[15] - 30611744 | 0;
            d = (d << 10 | d >>> 22) + a | 0;
            c += (a ^ (d | ~b)) + k[6] - 1560198380 | 0;
            c = (c << 15 | c >>> 17) + d | 0;
            b += (d ^ (c | ~a)) + k[13] + 1309151649 | 0;
            b = (b << 21 | b >>> 11) + c | 0;
            a += (c ^ (b | ~d)) + k[4] - 145523070 | 0;
            a = (a << 6 | a >>> 26) + b | 0;
            d += (b ^ (a | ~c)) + k[11] - 1120210379 | 0;
            d = (d << 10 | d >>> 22) + a | 0;
            c += (a ^ (d | ~b)) + k[2] + 718787259 | 0;
            c = (c << 15 | c >>> 17) + d | 0;
            b += (d ^ (c | ~a)) + k[9] - 343485551 | 0;
            b = (b << 21 | b >>> 11) + c | 0;
            x[0] = a + x[0] | 0;
            x[1] = b + x[1] | 0;
            x[2] = c + x[2] | 0;
            x[3] = d + x[3] | 0;
          }
          function md5blk(s) {
            var md5blks = [], i;
            for (i = 0; i < 64; i += 4) {
              md5blks[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i + 1) << 8) + (s.charCodeAt(i + 2) << 16) + (s.charCodeAt(i + 3) << 24);
            }
            return md5blks;
          }
          function md5blk_array(a) {
            var md5blks = [], i;
            for (i = 0; i < 64; i += 4) {
              md5blks[i >> 2] = a[i] + (a[i + 1] << 8) + (a[i + 2] << 16) + (a[i + 3] << 24);
            }
            return md5blks;
          }
          function md51(s) {
            var n = s.length, state = [1732584193, -271733879, -1732584194, 271733878], i, length, tail, tmp, lo, hi;
            for (i = 64; i <= n; i += 64) {
              md5cycle(state, md5blk(s.substring(i - 64, i)));
            }
            s = s.substring(i - 64);
            length = s.length;
            tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            for (i = 0; i < length; i += 1) {
              tail[i >> 2] |= s.charCodeAt(i) << (i % 4 << 3);
            }
            tail[i >> 2] |= 128 << (i % 4 << 3);
            if (i > 55) {
              md5cycle(state, tail);
              for (i = 0; i < 16; i += 1) {
                tail[i] = 0;
              }
            }
            tmp = n * 8;
            tmp = tmp.toString(16).match(/(.*?)(.{0,8})$/);
            lo = parseInt(tmp[2], 16);
            hi = parseInt(tmp[1], 16) || 0;
            tail[14] = lo;
            tail[15] = hi;
            md5cycle(state, tail);
            return state;
          }
          function md51_array(a) {
            var n = a.length, state = [1732584193, -271733879, -1732584194, 271733878], i, length, tail, tmp, lo, hi;
            for (i = 64; i <= n; i += 64) {
              md5cycle(state, md5blk_array(a.subarray(i - 64, i)));
            }
            a = i - 64 < n ? a.subarray(i - 64) : new Uint8Array(0);
            length = a.length;
            tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            for (i = 0; i < length; i += 1) {
              tail[i >> 2] |= a[i] << (i % 4 << 3);
            }
            tail[i >> 2] |= 128 << (i % 4 << 3);
            if (i > 55) {
              md5cycle(state, tail);
              for (i = 0; i < 16; i += 1) {
                tail[i] = 0;
              }
            }
            tmp = n * 8;
            tmp = tmp.toString(16).match(/(.*?)(.{0,8})$/);
            lo = parseInt(tmp[2], 16);
            hi = parseInt(tmp[1], 16) || 0;
            tail[14] = lo;
            tail[15] = hi;
            md5cycle(state, tail);
            return state;
          }
          function rhex(n) {
            var s = "", j;
            for (j = 0; j < 4; j += 1) {
              s += hex_chr[n >> j * 8 + 4 & 15] + hex_chr[n >> j * 8 & 15];
            }
            return s;
          }
          function hex(x) {
            var i;
            for (i = 0; i < x.length; i += 1) {
              x[i] = rhex(x[i]);
            }
            return x.join("");
          }
          if (hex(md51("hello")) !== "5d41402abc4b2a76b9719d911017c592")
            ;
          if (typeof ArrayBuffer !== "undefined" && !ArrayBuffer.prototype.slice) {
            (function() {
              function clamp(val, length) {
                val = val | 0 || 0;
                if (val < 0) {
                  return Math.max(val + length, 0);
                }
                return Math.min(val, length);
              }
              ArrayBuffer.prototype.slice = function(from, to) {
                var length = this.byteLength, begin = clamp(from, length), end = length, num, target, targetArray, sourceArray;
                if (to !== undefined$1) {
                  end = clamp(to, length);
                }
                if (begin > end) {
                  return new ArrayBuffer(0);
                }
                num = end - begin;
                target = new ArrayBuffer(num);
                targetArray = new Uint8Array(target);
                sourceArray = new Uint8Array(this, begin, num);
                targetArray.set(sourceArray);
                return target;
              };
            })();
          }
          function toUtf8(str) {
            if (/[\u0080-\uFFFF]/.test(str)) {
              str = unescape(encodeURIComponent(str));
            }
            return str;
          }
          function utf8Str2ArrayBuffer(str, returnUInt8Array) {
            var length = str.length, buff = new ArrayBuffer(length), arr = new Uint8Array(buff), i;
            for (i = 0; i < length; i += 1) {
              arr[i] = str.charCodeAt(i);
            }
            return returnUInt8Array ? arr : buff;
          }
          function arrayBuffer2Utf8Str(buff) {
            return String.fromCharCode.apply(null, new Uint8Array(buff));
          }
          function concatenateArrayBuffers(first, second, returnUInt8Array) {
            var result = new Uint8Array(first.byteLength + second.byteLength);
            result.set(new Uint8Array(first));
            result.set(new Uint8Array(second), first.byteLength);
            return returnUInt8Array ? result : result.buffer;
          }
          function hexToBinaryString(hex2) {
            var bytes = [], length = hex2.length, x;
            for (x = 0; x < length - 1; x += 2) {
              bytes.push(parseInt(hex2.substr(x, 2), 16));
            }
            return String.fromCharCode.apply(String, bytes);
          }
          function SparkMD52() {
            this.reset();
          }
          SparkMD52.prototype.append = function(str) {
            this.appendBinary(toUtf8(str));
            return this;
          };
          SparkMD52.prototype.appendBinary = function(contents) {
            this._buff += contents;
            this._length += contents.length;
            var length = this._buff.length, i;
            for (i = 64; i <= length; i += 64) {
              md5cycle(this._hash, md5blk(this._buff.substring(i - 64, i)));
            }
            this._buff = this._buff.substring(i - 64);
            return this;
          };
          SparkMD52.prototype.end = function(raw) {
            var buff = this._buff, length = buff.length, i, tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], ret;
            for (i = 0; i < length; i += 1) {
              tail[i >> 2] |= buff.charCodeAt(i) << (i % 4 << 3);
            }
            this._finish(tail, length);
            ret = hex(this._hash);
            if (raw) {
              ret = hexToBinaryString(ret);
            }
            this.reset();
            return ret;
          };
          SparkMD52.prototype.reset = function() {
            this._buff = "";
            this._length = 0;
            this._hash = [1732584193, -271733879, -1732584194, 271733878];
            return this;
          };
          SparkMD52.prototype.getState = function() {
            return {
              buff: this._buff,
              length: this._length,
              hash: this._hash.slice()
            };
          };
          SparkMD52.prototype.setState = function(state) {
            this._buff = state.buff;
            this._length = state.length;
            this._hash = state.hash;
            return this;
          };
          SparkMD52.prototype.destroy = function() {
            delete this._hash;
            delete this._buff;
            delete this._length;
          };
          SparkMD52.prototype._finish = function(tail, length) {
            var i = length, tmp, lo, hi;
            tail[i >> 2] |= 128 << (i % 4 << 3);
            if (i > 55) {
              md5cycle(this._hash, tail);
              for (i = 0; i < 16; i += 1) {
                tail[i] = 0;
              }
            }
            tmp = this._length * 8;
            tmp = tmp.toString(16).match(/(.*?)(.{0,8})$/);
            lo = parseInt(tmp[2], 16);
            hi = parseInt(tmp[1], 16) || 0;
            tail[14] = lo;
            tail[15] = hi;
            md5cycle(this._hash, tail);
          };
          SparkMD52.hash = function(str, raw) {
            return SparkMD52.hashBinary(toUtf8(str), raw);
          };
          SparkMD52.hashBinary = function(content, raw) {
            var hash = md51(content), ret = hex(hash);
            return raw ? hexToBinaryString(ret) : ret;
          };
          SparkMD52.ArrayBuffer = function() {
            this.reset();
          };
          SparkMD52.ArrayBuffer.prototype.append = function(arr) {
            var buff = concatenateArrayBuffers(this._buff.buffer, arr, true), length = buff.length, i;
            this._length += arr.byteLength;
            for (i = 64; i <= length; i += 64) {
              md5cycle(this._hash, md5blk_array(buff.subarray(i - 64, i)));
            }
            this._buff = i - 64 < length ? new Uint8Array(buff.buffer.slice(i - 64)) : new Uint8Array(0);
            return this;
          };
          SparkMD52.ArrayBuffer.prototype.end = function(raw) {
            var buff = this._buff, length = buff.length, tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], i, ret;
            for (i = 0; i < length; i += 1) {
              tail[i >> 2] |= buff[i] << (i % 4 << 3);
            }
            this._finish(tail, length);
            ret = hex(this._hash);
            if (raw) {
              ret = hexToBinaryString(ret);
            }
            this.reset();
            return ret;
          };
          SparkMD52.ArrayBuffer.prototype.reset = function() {
            this._buff = new Uint8Array(0);
            this._length = 0;
            this._hash = [1732584193, -271733879, -1732584194, 271733878];
            return this;
          };
          SparkMD52.ArrayBuffer.prototype.getState = function() {
            var state = SparkMD52.prototype.getState.call(this);
            state.buff = arrayBuffer2Utf8Str(state.buff);
            return state;
          };
          SparkMD52.ArrayBuffer.prototype.setState = function(state) {
            state.buff = utf8Str2ArrayBuffer(state.buff, true);
            return SparkMD52.prototype.setState.call(this, state);
          };
          SparkMD52.ArrayBuffer.prototype.destroy = SparkMD52.prototype.destroy;
          SparkMD52.ArrayBuffer.prototype._finish = SparkMD52.prototype._finish;
          SparkMD52.ArrayBuffer.hash = function(arr, raw) {
            var hash = md51_array(new Uint8Array(arr)), ret = hex(hash);
            return raw ? hexToBinaryString(ret) : ret;
          };
          return SparkMD52;
        });
      })(sparkMd5);
      var SparkMD5 = sparkMd5.exports;
      const fileSlice = File.prototype.slice || File.prototype.mozSlice || File.prototype.webkitSlice;
      class FileChecksum {
        static create(file, callback) {
          const instance = new FileChecksum(file);
          instance.create(callback);
        }
        constructor(file) {
          this.file = file;
          this.chunkSize = 2097152;
          this.chunkCount = Math.ceil(this.file.size / this.chunkSize);
          this.chunkIndex = 0;
        }
        create(callback) {
          this.callback = callback;
          this.md5Buffer = new SparkMD5.ArrayBuffer();
          this.fileReader = new FileReader();
          this.fileReader.addEventListener("load", (event) => this.fileReaderDidLoad(event));
          this.fileReader.addEventListener("error", (event) => this.fileReaderDidError(event));
          this.readNextChunk();
        }
        fileReaderDidLoad(event) {
          this.md5Buffer.append(event.target.result);
          if (!this.readNextChunk()) {
            const binaryDigest = this.md5Buffer.end(true);
            const base64digest = btoa(binaryDigest);
            this.callback(null, base64digest);
          }
        }
        fileReaderDidError(event) {
          this.callback(`Error reading ${this.file.name}`);
        }
        readNextChunk() {
          if (this.chunkIndex < this.chunkCount || this.chunkIndex == 0 && this.chunkCount == 0) {
            const start4 = this.chunkIndex * this.chunkSize;
            const end = Math.min(start4 + this.chunkSize, this.file.size);
            const bytes = fileSlice.call(this.file, start4, end);
            this.fileReader.readAsArrayBuffer(bytes);
            this.chunkIndex++;
            return true;
          } else {
            return false;
          }
        }
      }
      function getMetaValue(name) {
        const element = findElement(document.head, `meta[name="${name}"]`);
        if (element) {
          return element.getAttribute("content");
        }
      }
      function findElements(root, selector) {
        if (typeof root == "string") {
          selector = root;
          root = document;
        }
        const elements = root.querySelectorAll(selector);
        return toArray2(elements);
      }
      function findElement(root, selector) {
        if (typeof root == "string") {
          selector = root;
          root = document;
        }
        return root.querySelector(selector);
      }
      function dispatchEvent2(element, type, eventInit = {}) {
        const { disabled } = element;
        const { bubbles, cancelable, detail } = eventInit;
        const event = document.createEvent("Event");
        event.initEvent(type, bubbles || true, cancelable || true);
        event.detail = detail || {};
        try {
          element.disabled = false;
          element.dispatchEvent(event);
        } finally {
          element.disabled = disabled;
        }
        return event;
      }
      function toArray2(value) {
        if (Array.isArray(value)) {
          return value;
        } else if (Array.from) {
          return Array.from(value);
        } else {
          return [].slice.call(value);
        }
      }
      class BlobRecord {
        constructor(file, checksum, url2) {
          this.file = file;
          this.attributes = {
            filename: file.name,
            content_type: file.type || "application/octet-stream",
            byte_size: file.size,
            checksum
          };
          this.xhr = new XMLHttpRequest();
          this.xhr.open("POST", url2, true);
          this.xhr.responseType = "json";
          this.xhr.setRequestHeader("Content-Type", "application/json");
          this.xhr.setRequestHeader("Accept", "application/json");
          this.xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
          const csrfToken2 = getMetaValue("csrf-token");
          if (csrfToken2 != void 0) {
            this.xhr.setRequestHeader("X-CSRF-Token", csrfToken2);
          }
          this.xhr.addEventListener("load", (event) => this.requestDidLoad(event));
          this.xhr.addEventListener("error", (event) => this.requestDidError(event));
        }
        get status() {
          return this.xhr.status;
        }
        get response() {
          const { responseType, response } = this.xhr;
          if (responseType == "json") {
            return response;
          } else {
            return JSON.parse(response);
          }
        }
        create(callback) {
          this.callback = callback;
          this.xhr.send(JSON.stringify({
            blob: this.attributes
          }));
        }
        requestDidLoad(event) {
          if (this.status >= 200 && this.status < 300) {
            const { response } = this;
            const { direct_upload } = response;
            delete response.direct_upload;
            this.attributes = response;
            this.directUploadData = direct_upload;
            this.callback(null, this.toJSON());
          } else {
            this.requestDidError(event);
          }
        }
        requestDidError(event) {
          this.callback(`Error creating Blob for "${this.file.name}". Status: ${this.status}`);
        }
        toJSON() {
          const result = {};
          for (const key in this.attributes) {
            result[key] = this.attributes[key];
          }
          return result;
        }
      }
      class BlobUpload {
        constructor(blob) {
          this.blob = blob;
          this.file = blob.file;
          const { url: url2, headers } = blob.directUploadData;
          this.xhr = new XMLHttpRequest();
          this.xhr.open("PUT", url2, true);
          this.xhr.responseType = "text";
          for (const key in headers) {
            this.xhr.setRequestHeader(key, headers[key]);
          }
          this.xhr.addEventListener("load", (event) => this.requestDidLoad(event));
          this.xhr.addEventListener("error", (event) => this.requestDidError(event));
        }
        create(callback) {
          this.callback = callback;
          this.xhr.send(this.file.slice());
        }
        requestDidLoad(event) {
          const { status, response } = this.xhr;
          if (status >= 200 && status < 300) {
            this.callback(null, response);
          } else {
            this.requestDidError(event);
          }
        }
        requestDidError(event) {
          this.callback(`Error storing "${this.file.name}". Status: ${this.xhr.status}`);
        }
      }
      let id2 = 0;
      class DirectUpload {
        constructor(file, url2, delegate2) {
          this.id = ++id2;
          this.file = file;
          this.url = url2;
          this.delegate = delegate2;
        }
        create(callback) {
          FileChecksum.create(this.file, (error4, checksum) => {
            if (error4) {
              callback(error4);
              return;
            }
            const blob = new BlobRecord(this.file, checksum, this.url);
            notify(this.delegate, "directUploadWillCreateBlobWithXHR", blob.xhr);
            blob.create((error5) => {
              if (error5) {
                callback(error5);
              } else {
                const upload = new BlobUpload(blob);
                notify(this.delegate, "directUploadWillStoreFileWithXHR", upload.xhr);
                upload.create((error6) => {
                  if (error6) {
                    callback(error6);
                  } else {
                    callback(null, blob.toJSON());
                  }
                });
              }
            });
          });
        }
      }
      function notify(object2, methodName, ...messages) {
        if (object2 && typeof object2[methodName] == "function") {
          return object2[methodName](...messages);
        }
      }
      class DirectUploadController {
        constructor(input2, file) {
          this.input = input2;
          this.file = file;
          this.directUpload = new DirectUpload(this.file, this.url, this);
          this.dispatch("initialize");
        }
        start(callback) {
          const hiddenInput = document.createElement("input");
          hiddenInput.type = "hidden";
          hiddenInput.name = this.input.name;
          this.input.insertAdjacentElement("beforebegin", hiddenInput);
          this.dispatch("start");
          this.directUpload.create((error4, attributes2) => {
            if (error4) {
              hiddenInput.parentNode.removeChild(hiddenInput);
              this.dispatchError(error4);
            } else {
              hiddenInput.value = attributes2.signed_id;
            }
            this.dispatch("end");
            callback(error4);
          });
        }
        uploadRequestDidProgress(event) {
          const progress = event.loaded / event.total * 100;
          if (progress) {
            this.dispatch("progress", {
              progress
            });
          }
        }
        get url() {
          return this.input.getAttribute("data-direct-upload-url");
        }
        dispatch(name, detail = {}) {
          detail.file = this.file;
          detail.id = this.directUpload.id;
          return dispatchEvent2(this.input, `direct-upload:${name}`, {
            detail
          });
        }
        dispatchError(error4) {
          const event = this.dispatch("error", {
            error: error4
          });
          if (!event.defaultPrevented) {
            alert(error4);
          }
        }
        directUploadWillCreateBlobWithXHR(xhr) {
          this.dispatch("before-blob-request", {
            xhr
          });
        }
        directUploadWillStoreFileWithXHR(xhr) {
          this.dispatch("before-storage-request", {
            xhr
          });
          xhr.upload.addEventListener("progress", (event) => this.uploadRequestDidProgress(event));
        }
      }
      const inputSelector = "input[type=file][data-direct-upload-url]:not([disabled])";
      class DirectUploadsController {
        constructor(form2) {
          this.form = form2;
          this.inputs = findElements(form2, inputSelector).filter((input2) => input2.files.length);
        }
        start(callback) {
          const controllers = this.createDirectUploadControllers();
          const startNextController = () => {
            const controller = controllers.shift();
            if (controller) {
              controller.start((error4) => {
                if (error4) {
                  callback(error4);
                  this.dispatch("end");
                } else {
                  startNextController();
                }
              });
            } else {
              callback();
              this.dispatch("end");
            }
          };
          this.dispatch("start");
          startNextController();
        }
        createDirectUploadControllers() {
          const controllers = [];
          this.inputs.forEach((input2) => {
            toArray2(input2.files).forEach((file) => {
              const controller = new DirectUploadController(input2, file);
              controllers.push(controller);
            });
          });
          return controllers;
        }
        dispatch(name, detail = {}) {
          return dispatchEvent2(this.form, `direct-uploads:${name}`, {
            detail
          });
        }
      }
      const processingAttribute = "data-direct-uploads-processing";
      const submitButtonsByForm = /* @__PURE__ */ new WeakMap();
      let started = false;
      function start3() {
        if (!started) {
          started = true;
          document.addEventListener("click", didClick, true);
          document.addEventListener("submit", didSubmitForm, true);
          document.addEventListener("ajax:before", didSubmitRemoteElement);
        }
      }
      function didClick(event) {
        const { target } = event;
        if ((target.tagName == "INPUT" || target.tagName == "BUTTON") && target.type == "submit" && target.form) {
          submitButtonsByForm.set(target.form, target);
        }
      }
      function didSubmitForm(event) {
        handleFormSubmissionEvent(event);
      }
      function didSubmitRemoteElement(event) {
        if (event.target.tagName == "FORM") {
          handleFormSubmissionEvent(event);
        }
      }
      function handleFormSubmissionEvent(event) {
        const form2 = event.target;
        if (form2.hasAttribute(processingAttribute)) {
          event.preventDefault();
          return;
        }
        const controller = new DirectUploadsController(form2);
        const { inputs } = controller;
        if (inputs.length) {
          event.preventDefault();
          form2.setAttribute(processingAttribute, "");
          inputs.forEach(disable2);
          controller.start((error4) => {
            form2.removeAttribute(processingAttribute);
            if (error4) {
              inputs.forEach(enable);
            } else {
              submitForm(form2);
            }
          });
        }
      }
      function submitForm(form2) {
        let button = submitButtonsByForm.get(form2) || findElement(form2, "input[type=submit], button[type=submit]");
        if (button) {
          const { disabled } = button;
          button.disabled = false;
          button.focus();
          button.click();
          button.disabled = disabled;
        } else {
          button = document.createElement("input");
          button.type = "submit";
          button.style.display = "none";
          form2.appendChild(button);
          button.click();
          form2.removeChild(button);
        }
        submitButtonsByForm.delete(form2);
      }
      function disable2(input2) {
        input2.disabled = true;
      }
      function enable(input2) {
        input2.disabled = false;
      }
      function autostart() {
        if (window.ActiveStorage) {
          start3();
        }
      }
      setTimeout(autostart, 1);
      exports2.DirectUpload = DirectUpload;
      exports2.start = start3;
      Object.defineProperty(exports2, "__esModule", {
        value: true
      });
    });
  })(activestorage, activestorage.exports);
  var AttachmentUpload = class {
    constructor(attachment, element) {
      this.attachment = attachment;
      this.element = element;
      this.directUpload = new activestorage.exports.DirectUpload(attachment.file, this.directUploadUrl, this);
    }
    start() {
      this.directUpload.create(this.directUploadDidComplete.bind(this));
    }
    directUploadWillStoreFileWithXHR(xhr) {
      xhr.upload.addEventListener("progress", (event) => {
        const progress = event.loaded / event.total * 100;
        this.attachment.setUploadProgress(progress);
      });
    }
    directUploadDidComplete(error4, attributes2) {
      if (error4) {
        throw new Error(`Direct upload failed: ${error4}`);
      }
      this.attachment.setAttributes({
        sgid: attributes2.attachable_sgid,
        url: this.createBlobUrl(attributes2.signed_id, attributes2.filename)
      });
    }
    createBlobUrl(signedId, filename) {
      return this.blobUrlTemplate.replace(":signed_id", signedId).replace(":filename", encodeURIComponent(filename));
    }
    get directUploadUrl() {
      return this.element.dataset.directUploadUrl;
    }
    get blobUrlTemplate() {
      return this.element.dataset.blobUrlTemplate;
    }
  };
  addEventListener("trix-attachment-add", (event) => {
    const { attachment, target } = event;
    if (attachment.file) {
      const upload = new AttachmentUpload(attachment, target);
      upload.start();
    }
  });

  // application.js
  mrujs.start({
    plugins: [
      new CableCar(javascript_default)
    ]
  });
})();
//# sourceMappingURL=application.js.map
