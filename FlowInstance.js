'use strict';

module.exports = (XIBLE) => {
  const { EventEmitter } = require('events');

  const constructed = {};

  class FlowInstance extends EventEmitter {
    constructor(obj) {
      if (obj && obj._id && constructed[obj._id]) {
        return constructed[obj._id];
      }

      super();

      this.state = FlowInstance.STATE_STOPPED;

      if (obj) {
        Object.assign(this, obj);
      }

      if (this._id) {
        constructed[this._id] = this;
      }

      XIBLE.on('message', (json) => {
        if (
          json.method.substring(0, 20) !== 'xible.flow.instance.' ||
          !json.flowInstance ||
          json.flowInstance._id !== this._id) {
          return;
        }

        this.state = json.flowInstance.state;
        this.directed = json.flowInstance.directed;
        this.timing = json.flowInstance.timing;
        this.params = json.flowInstance.params;
        this.usage = json.flowInstance.usage;

        json.flowInstance = this;

        this.emit(json.method.substring(20), json);
      });

      this.on('delete', () => {
        delete constructed[this._id];
      });
    }

    start() {
      if (!this._id) {
        return Promise.reject('no id');
      }

      const req = XIBLE.http.request('PATCH', `/api/flows/${encodeURIComponent(this.flowId)}/instances/${encodeURIComponent(this._id)}/start`);
      return req.send();
    }

    stop() {
      if (!this._id) {
        return Promise.reject('no id');
      }

      const req = XIBLE.http.request('PATCH', `/api/flows/${encodeURIComponent(this.flowId)}/instances/${encodeURIComponent(this._id)}/stop`);
      return req.send();
    }

    delete() {
      if (!this._id) {
        return Promise.reject('no id');
      }

      const req = XIBLE.http.request('DELETE', `/api/flows/${encodeURIComponent(this.flowId)}/instances/${encodeURIComponent(this._id)}`);
      return req.send();
    }

    async direct(nodes) {
      // throttle
      if (this._lastPostDirectFunction || this._lastDirectPromise || this._lastPostDirectPromise) {
        this._lastPostDirectFunction = async () => {
          this._lastPostDirectPromise = null;
          this._lastPostDirectFunction = null;
          await this.direct(nodes);
        };

        if (!this._lastPostDirectPromise) {
          this._lastPostDirectPromise = this._lastDirectPromise
          .then(() => this._lastPostDirectFunction());
        }

        return this._lastPostDirectPromise;
      }

      // ensure this flow is saved first
      if (!this._id) {
        await this.save();
        return this.direct(nodes);
      }

      if (!nodes) {
        throw new Error('"nodes" argument missing');
      }

      this._lastDirectPromise = new Promise(async (resolve, reject) => {
        nodes = nodes.map(node => ({
          _id: node._id,
          data: node.data
        }));

        try {
          await XIBLE.http.request('PATCH', `/api/flows/${encodeURIComponent(this.flowId)}/instances/${encodeURIComponent(this._id)}/direct`)
          .toString(nodes);
          this._lastDirectPromise = null;

          this.emit('direct');
          resolve();
        } catch (err) {
          this._lastDirectPromise = null;
          reject(err);
        }
      });

      return this._lastDirectPromise;
    }

    static get STATE_STOPPED() {
      return 0;
    }

    static get STATE_STOPPING() {
      return 1;
    }

    static get STATE_INITIALIZING() {
      return 2;
    }

    static get STATE_INITIALIZED() {
      return 3;
    }

    static get STATE_STARTING() {
      return 4;
    }

    static get STATE_STARTED() {
      return 5;
    }
  }

  return FlowInstance;
};
