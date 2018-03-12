'use strict';

module.exports = (XIBLE) => {
  const EventEmitter = require('events').EventEmitter;

  class FlowInstance extends EventEmitter {
    constructor(obj) {
      super();

      this.state = FlowInstance.STATE_STOPPED;

      if (obj) {
        Object.assign(this, obj);
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

        this.emit(json.method.substring(20), json);
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

    direct(nodes) {
      // throttle
      if (this._lastPostDirectFunction || this._lastDirectPromise) {
        const hasFunction = !!this._lastPostDirectFunction;

        this._lastPostDirectFunction = () => {
          this.direct(related);
          this._lastPostDirectFunction = null;
        };

        if (!hasFunction) {
          this._lastDirectPromise.then(this._lastPostDirectFunction);
        }

        return Promise.resolve();
      }

      // ensure this flow is saved first
      if (!this._id) {
        return this.save()
        .then(() => this.direct(nodes));
      }

      if (!nodes) {
        return Promise.reject('related argument missing');
      }

      this._lastDirectPromise = new Promise((resolve, reject) => {
        nodes = nodes.map(node => ({
          _id: node._id,
          data: node.data
        }));

        const req = XIBLE.http.request('PATCH', `/api/flows/${encodeURIComponent(this.flowId)}/instances/${encodeURIComponent(this._id)}/direct`);
        req.toString(nodes)
        .then(() => {
          resolve(this);
          this._lastDirectPromise = null;

          this.emit('direct');
        })
        .catch((err) => {
          reject(err);
        });
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
