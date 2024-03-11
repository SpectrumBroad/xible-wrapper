'use strict';

module.exports = (XIBLE) => {
  const { EventEmitter } = require('events');

  const constructed = {};

  class FlowInstance extends EventEmitter {
    constructor(obj) {
      super();

      if (obj && obj._id && this.constructor === FlowInstance) {
        if (constructed[obj._id]) {
          return constructed[obj._id];
        }

        if (!constructed[obj._id]) {
          constructed[obj._id] = this;
        }
      }

      this.state = FlowInstance.STATE_STOPPED;

      if (obj) {
        Object.assign(this, obj);
      }

      const xibleMessageListener = (json) => {
        if (
          json.method.substring(0, 20) !== 'xible.flow.instance.'
          || !json.flowInstance
          || json.flowInstance._id !== this._id
        ) {
          return;
        }

        this.state = json.flowInstance.state;
        this.directed = json.flowInstance.directed;
        this.timing = json.flowInstance.timing;
        this.params = json.flowInstance.params;
        this.usage = json.flowInstance.usage;

        json.flowInstance = this;

        this.emit(json.method.substring(20), json);
      };
      XIBLE.on('message', xibleMessageListener);

      this.on('delete', () => {
        XIBLE.removeListener('message', xibleMessageListener);
        delete constructed[this._id];
      });

      // to prevent this from throwing.
      this.on('error', () => {});
    }

    start() {
      if (!this._id) {
        return Promise.reject('no id');
      }

      const req = XIBLE.http.request('PATCH', `api/flows/${encodeURIComponent(this.flowId)}/instances/${encodeURIComponent(this._id)}/start`);
      return req.send();
    }

    stop() {
      if (!this._id) {
        return Promise.reject('no id');
      }

      const req = XIBLE.http.request('PATCH', `api/flows/${encodeURIComponent(this.flowId)}/instances/${encodeURIComponent(this._id)}/stop`);
      return req.send();
    }

    delete() {
      if (!this._id) {
        return Promise.reject('no id');
      }

      const req = XIBLE.http.request('DELETE', `api/flows/${encodeURIComponent(this.flowId)}/instances/${encodeURIComponent(this._id)}`);
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

      this._lastDirectPromise = (async () => {
        nodes = nodes.map((node) => ({
          _id: node._id,
          data: node.data
        }));

        try {
          await XIBLE.http.request('PATCH', `api/flows/${encodeURIComponent(this.flowId)}/instances/${encodeURIComponent(this._id)}/direct`)
            .toString(nodes);
          this._lastDirectPromise = null;

          this.emit('direct');
        } catch (err) {
          this._lastDirectPromise = null;
          throw err;
        }
      })();

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
