'use strict';

module.exports = (XIBLE) => {
  const { EventEmitter } = require('events');

  const constructed = {};

  class Flow extends EventEmitter {
    constructor(obj) {
      super();

      if (obj && obj._id && this.constructor === Flow) {
        if (constructed[obj._id]) {
          return constructed[obj._id];
        }

        if (!constructed[obj._id]) {
          constructed[obj._id] = this;
        }
      }

      this._id = null;
      this.runnable = true;
      this._instances = null;

      if (obj) {
        Object.assign(this, obj);
      }

      const xibleMessageListener = (json) => {
        if (
          json.method.substring(0, 11) !== 'xible.flow.'
          || json.method.substring(0, 20) === 'xible.flow.instance.'
          || !json.flow
          || json.flow._id !== this._id
        ) {
          return;
        }

        if (json.flowInstance) {
          json.flowInstance = new XIBLE.FlowInstance(json.flowInstance);
        }

        this.runnable = json.flow.runnable;
        json.flow = this;

        this.emit(json.method.substring(11), json);
      }
      XIBLE.on('message', xibleMessageListener);

      this.removeAllListeners();

      this.on('delete', () => {
        XIBLE.removeListener('message', xibleMessageListener);
        delete constructed[this._id];
      });

      this.on('createInstance', ({ flowInstance: instance }) => {
        if (this._instances) {
          this._instances.push(instance);
        }
      });

      this.on('deleteInstance', ({ flowInstance: instance }) => {
        if (!this._instances) {
          return;
        }

        const cachedInstanceIndex = this._instances.findIndex(
          cachedInstance => instance._id === cachedInstance._id
        );
        if (cachedInstanceIndex > -1) {
          this._instances.splice(cachedInstanceIndex, 1);
        }
      });

      XIBLE.on('open', () => {
        this._instances = null;
      });

      // setup viewstate
      this.viewState = {
        left: obj && obj.viewState && obj.viewState.left ? obj.viewState.left : 0,
        top: obj && obj.viewState && obj.viewState.top ? obj.viewState.top : 0,
        zoom: obj && obj.viewState && obj.viewState.zoom ? obj.viewState.zoom : 1,
        backgroundLeft: obj && obj.viewState &&
          obj.viewState.backgroundLeft ? obj.viewState.backgroundLeft : 0,
        backgroundTop: obj && obj.viewState &&
          obj.viewState.backgroundTop ? obj.viewState.backgroundTop : 0
      };

      // setup nodes
      if (obj && obj.nodes) {
        this.initNodes(obj.nodes);
      } else {
        this.nodes = [];
      }

      // setup connectors
      if (obj && obj.connectors) {
        this.initConnectors(obj.connectors);
      } else {
        this.connectors = [];
      }
    }

    initNodes(nodes) {
      this.nodes = [];
      nodes.forEach(node => this.addNode(new XIBLE.Node(node)));
    }

    initConnectors(connectors) {
      this.connectors = [];
      connectors.forEach((conn) => {
        conn.origin = this.getOutputById(conn.origin);
        conn.destination = this.getInputById(conn.destination);

        this.addConnector(new XIBLE.Connector(conn));
      });
    }

    static async validatePermissions() {
      return XIBLE.http.request('GET', '/api/validateFlowPermissions')
      .toJson();
    }

    static async getById(id) {
      return XIBLE.http.request('GET', `/api/flows/${encodeURIComponent(id)}`)
      .toObject(Flow);
    }

    static async getAll() {
      const req = XIBLE.http.request('GET', '/api/flows');
      const flows = await req.toObjectMap(Flow);

      // clear any non existing flows.
      Object.keys(constructed)
      .forEach((flowId) => {
        if (!flows[flowId]) {
          delete constructed[flowId];
        }
      });

      return flows;
    }

    delete() {
      if (!this._id) {
        return Promise.resolve();
      }

      const req = XIBLE.http.request('DELETE', `/api/flows/${encodeURIComponent(this._id)}`);
      return req.send();
    }

    save(asNew) {
      return new Promise((resolve, reject) => {
        const json = this.toJson();
        let req;

        if (!this._id || asNew) {
          req = XIBLE.http.request('POST', '/api/flows');
        } else {
          req = XIBLE.http.request('PUT', `/api/flows/${encodeURIComponent(this._id)}`);
        }

        req.toObject(Object, json)
        .then((reqJson) => {
          this._id = reqJson._id;
          resolve(this);
          this.emit('save');
        })
        .catch((err) => {
          reject(err);
        });
      });
    }

    createInstance({ params, directNodes, start } = {}) {
      if (directNodes) {
        directNodes = directNodes.map(node => ({
          _id: node._id,
          data: node.data
        }));
      }

      return XIBLE.http.request('POST', `/api/flows/${encodeURIComponent(this._id)}/instances`)
      .toObject(XIBLE.FlowInstance, {
        params,
        directNodes,
        start
      });
    }

    async getInstances() {
      if (!this._instances) {
        this._instances = await XIBLE.http.request('GET', `/api/flows/${encodeURIComponent(this._id)}/instances`)
        .toObjectArray(XIBLE.FlowInstance);
      }

      return this._instances;
    }

    async getInstanceById(id) {
      const instances = await this.getInstances();
      return instances.find(instance => instance._id === id);
    }

    stopAllInstances() {
      return XIBLE.http.request('PATCH', `/api/flows/${encodeURIComponent(this._id)}/stop`)
      .send();
    }

    deleteAllInstances() {
      return XIBLE.http.request('DELETE', `/api/flows/${encodeURIComponent(this._id)}/instances`)
      .send();
    }

    // TODO: this functions isn't 'pretty'
    // and it should be toJSON().
    toJson(nodes, connectors) {
      // the nodes
      const nodeJson = JSON.stringify(nodes || this.nodes);

      // the connectors
      const CONNECTOR_WHITE_LIST = ['_id', 'origin', 'destination', 'type', 'hidden'];
      const connectorJson = JSON.stringify(connectors || this.connectors, (key, value) => {
        if (key && isNaN(key) && CONNECTOR_WHITE_LIST.indexOf(key) === -1) {
          return;
        } else if (value && (key === 'origin' || key === 'destination')) {
          return value._id; // eslint-disable-line consistent-return
        }
        return value; // eslint-disable-line consistent-return
      });

      return `{"_id":${JSON.stringify(this._id)},"nodes":${nodeJson},"connectors":${connectorJson},"viewState":${JSON.stringify(this.viewState)}}`;
    }

    /**
    * Sets the viewstate of a flow
    * @param {Object} viewState
    * @param {Number} viewState.left
    * @param {Number} viewState.top
    * @param {Number} viewState.backgroundLeft
    * @param {Number} viewState.backgroundTop
    * @param {Number} viewState.zoom
    */
    setViewState(viewState) {
      this.viewState = viewState;
    }

    getNodeById(id) {
      if (typeof id !== 'string') {
        throw new TypeError('"id" argument must be typeof string');
      }

      return this.nodes.find(node => node._id === id);
    }

    getNodesByName(name) {
      if (typeof name !== 'string') {
        throw new TypeError('"name" argument must be typeof string');
      }

      return this.nodes.filter(node => node.name === name);
    }

    addConnector(connector) {
      if (connector.flow) {
        throw new Error('connector already hooked up to other flow');
      }

      this.connectors.push(connector);
      connector.flow = this;
      return connector;
    }

    deleteConnector(connector) {
      const index = this.connectors.indexOf(connector);
      if (index > -1) {
        this.connectors.splice(index, 1);
      }
      connector.flow = null;
    }

    addNode(node) {
      if (node.flow) {
        throw new Error('node already hooked up to other flow');
      }

      this.nodes.push(node);
      node.flow = this;

      return node;
    }

    deleteNode(node) {
      const index = this.nodes.indexOf(node);
      if (index > -1) {
        this.nodes.splice(index, 1);
      }
      node.flow = null;
    }

    getInputById(id) {
      for (let i = 0; i < this.nodes.length; i += 1) {
        const node = this.nodes[i];
        for (const name in node.inputs) {
          if (node.inputs[name]._id === id) {
            return node.inputs[name];
          }
        }
      }
      return null;
    }

    getOutputById(id) {
      for (let i = 0; i < this.nodes.length; i += 1) {
        const node = this.nodes[i];
        for (const name in node.outputs) {
          if (node.outputs[name]._id === id) {
            return node.outputs[name];
          }
        }
      }
      return null;
    }

    /**
    * Returns all global inputs for a given type.
    * @param {String} type Type of global inputs to be fetched.
    * @returns {NodeOutput[]} The global nodeInputs.
    */
    getGlobalInputsByType(type) {
      const inputs = [];

      for (let i = 0; i < this.nodes.length; i += 1) {
        const node = this.nodes[i];
        for (const name in node.inputs) {
          const input = node.inputs[name];
          if (input.global && input.type === type) {
            inputs.push(input);
          }
        }
      }

      return inputs;
    }

    /**
    * Returns all global outputs with a given type.
    * @param {String} type Type of global outputs to be fetched.
    * @returns {NodeOutput[]} The global nodeOutputs.
    */
    getGlobalOutputsByType(type) {
      const outputs = [];

      for (let i = 0; i < this.nodes.length; i += 1) {
        const node = this.nodes[i];
        for (const name in node.outputs) {
          const output = node.outputs[name];
          if (output.global && output.type === type) {
            outputs.push(output);
          }
        }
      }

      return outputs;
    }

    /**
    * returns an array of all nodes in this flow that contain at least one global output
    * @returns {Node[]} list of nodes
    */
    getGlobalNodes() {
      return this.nodes.filter(node => node.getOutputs().some(output => output.global));
    }

    /**
    * returns an array of all outputs in this flow that are global
    * @returns {Output[]} list of nodes
    */
    getGlobalOutputs() {
      let globalOutputs = [];
      for (let i = 0; i < this.nodes.length; i += 1) {
        globalOutputs = globalOutputs.concat(this.nodes[i].getGlobalOutputs());
      }
      return globalOutputs;
    }

    removeAllStatuses() {
      this.nodes.forEach((node) => {
        node.removeAllStatuses();
      });
    }
  }

  // clean up constructed list on reconnect
  XIBLE.on('open', async () => {
    for (const flowId in constructed) {
      if (!await Flow.getById(flowId)) {
        delete constructed[flowId];
      }
    }
  });

  return Flow;
};
