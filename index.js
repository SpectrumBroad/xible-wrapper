'use strict';

// require a WebSocket module for nodejs
const WebSocket = require('ws');

const OoHttpBase = require('oohttp').Base;
const EventEmitter = require('events').EventEmitter;

class XibleWrapper extends EventEmitter {

  constructor(obj) {
    super();

    // get obj properties we need
    this.secure = typeof obj.secure === 'boolean' ? obj.secure : true;
    this.hostname = obj.hostname;
    this.port = obj.port || 9600;
    this.baseUrl = `${this.secure ? 's' : ''}://${this.hostname}:${this.port}`;

    this.httpBase = new OoHttpBase();

    // token if specified
    if (obj.token) {
      this.setToken(obj.token);
    }

    // default props
    this.readyState = XibleWrapper.STATE_CLOSED;
    this.webSocket = null;
    this.socketServer = null;

    this.Flow = require('./Flow.js')(this);
    this.Node = require('./Node.js')(this);
    this.NodeIo = require('./Io.js')(this);
    this.NodeInput = require('./Input.js')(this);
    this.NodeOutput = require('./Output.js')(this);
    this.Connector = require('./Connector.js')(this);
    this.Config = require('./Config.js')(this);
    this.Registry = require('./Registry.js')(this);
  }

  static get STATE_CONNECTING() {
    return 0;
  }

  static get STATE_OPEN() {
    return 1;
  }

  static get STATE_CLOSING() {
    return 2;
  }

  static get STATE_CLOSED() {
    return 3;
  }

  generateObjectId() {
    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    }
    return `${s4() + s4()}-${s4()}-${s4()}-${
      s4()}-${s4()}${s4()}${s4()}`;
  }

  setToken(token) {
    this.token = token;
    this.httpBase.headers['x-access-token'] = this.token;
  }

  getServerDate() {
    const req = this.httpBase.request('GET', `http${this.baseUrl}/api/serverDate`);
    return req.toJson();
  }

  getServerClientDateDifference() {
    return this.getServerDate().then(epoch => epoch - Date.now());
  }

  getPersistentWebSocketMessages() {
    const req = this.httpBase.request('GET', `http${this.baseUrl}/api/persistentWebSocketMessages`);
    return req.toJson();
  }

  connectSocket() {
    // setup a websocket towards
    const ws = this.webSocket = new WebSocket(`ws${this.baseUrl}/?token=${this.token}`);
    ws.addEventListener('open', (event) => {
      this.readyState = XibleWrapper.STATE_OPEN;
      this.emit('open', event);
    });

    ws.addEventListener('close', (event) => {
      this.readyState = XibleWrapper.STATE_CLOSED;
      this.webSocket = null;
      this.emit('close', event);
    });

    ws.addEventListener('error', (event) => {
      this.emit('error', event);
    });

    const messageHandler = (json) => {
      if (json.method !== 'xible.messages') {
        this.emit('message', json);
        return;
      }

      for (let i = 0; i < json.messages.length; i += 1) {
        messageHandler(json.messages[i]);
      }
    };

    ws.addEventListener('message', (event) => {
      let json;
      try {
        /**
        * Parses event.data from the message to JSON and emits the resulting object
        * @event XibleWrapper#json
        * @type {Object}
        */
        json = JSON.parse(event.data);
      } catch (err) {}

      if (!json) {
        return;
      }

      messageHandler(json);
    });
  }

  connect() {
    if (this.readyState !== XibleWrapper.STATE_CLOSED) {
      throw new Error('Cannot connect; not in a closed state');
    }

    this.readyState = XibleWrapper.STATE_CONNECTING;
    this.connectSocket();
  }

  close() {
    if (this.readyState !== XibleWrapper.STATE_OPEN) {
      throw new Error('Cannot connect; not in a open state');
    }

    this.readyState = XibleWrapper.STATE_CLOSING;

    this.stopAutoReconnect();

    if (this.webSocket) {
      return new Promise((resolve) => {
        this.webSocket.once('close', () => {
          resolve(this);
        });

        this.webSocket.close();
      });
    }
    return Promise.resolve(this);
  }

  /**
  * This method will force an automatic reconnect of the socket every <timeout> after a close event
  * @param {Number} timeout the amount of milliseconds after 'close' before retrying
  */
  autoReconnect(timeout = 5000) {
    this.on('close', this._autoReconnectListener = () => {
      setTimeout(() => {
        if (this.readyState === XibleWrapper.STATE_CLOSED) {
          this.connect();
        }
      }, timeout);
    });
  }

  // if this close is enforced and autoreconnect is on,
  // disable autoreconnect
  stopAutoReconnect() {
    if (this.autoReconnectListener) {
      this.removeListener('close', this.autoReconnectListener);
      this.autoReconnectListener = null;
    }
  }

}

module.exports = XibleWrapper;
