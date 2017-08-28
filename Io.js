'use strict';

module.exports = (XIBLE) => {
  const EventEmitter = require('events').EventEmitter;

  class Io extends EventEmitter {
    constructor(name, obj) {
      super();

      if (obj) {
        Object.assign(this, obj);
      }

      this.removeAllListeners();

      this.connectors = [];

      if (!this._id) {
        this._id = XIBLE.generateObjectId();
      }

      this.setName(name);

      this.setType(this.type);

      if (typeof this.singleType === 'boolean' && this.singleType && !this.type) {
        this.setSingleType(this.singleType);
      }

      if (typeof this.maxConnectors === 'number') {
        this.setMaxConnectors(this.maxConnectors);
      }

      if (typeof this.assignsOutputType === 'string') {
        this.on('settype', () => {
          if (!this.node) {
            return;
          }
          this.node.getOutputByName(this.assignsOutputType)
          .setType(this.type);
        });
      }

      if (typeof this.assignsInputType === 'string') {
        this.on('settype', () => {
          if (!this.node) {
            return;
          }
          this.node.getInputByName(this.assignsInputType)
          .setType(this.type);
        });
      }

      if (this.hidden) {
        this.hide();
      }

      if (this.global) {
        this.setGlobal(true);
      }
    }

    /**
    * If this is set to true, and type===null,
    * it's verified that only one type of connector is hooked up.
    * @param {Boolean} singleType
    */
    setSingleType(bool) {
      this.singleType = bool;

      // TODO: unhook eventlisteners when changing singleType

      if (this.singleType) {
        this.on('attach', (conn) => {
          const connLoc = conn[this instanceof XIBLE.NodeInput ? 'origin' : 'destination'];
          if (connLoc && connLoc.type) {
            this.setType(connLoc.type);
          }
        });

        this.on('detach', () => {
          if (!this.connectors.length) {
            this.setType(null);
          }
        });
      }

      this.verifyConnectors();
    }

    setGlobal(global) {
      this.global = global;
      return this;
    }

    setMaxConnectors(max) {
      this.maxConnectors = max;
      this.verifyConnectors();

      return this;
    }

    setType(type) {
      if (this.type === type) {
        return this;
      }

      // set new type
      this.type = type;
      this.verifyConnectors();
      this.emit('settype', type);

      return this;
    }

    setName(name) {
      if (!name) {
        throw new Error('the \'name\' argument is missing');
      }

      this.name = name;
      return this;
    }

    verifyConnectors() {
      // remove connectors if we have too many
      // always removes the latest added conns
      if (typeof this.maxConnectors === 'number') {
        while (this.connectors.length > this.maxConnectors) {
          this.connectors[this.connectors.length - 1].delete();
        }
      }

      // verify type
      const checkPlace = this instanceof XIBLE.NodeInput ? 'origin' : 'destination';
      if (this.type) {
        this.connectors
        .filter(conn => conn[checkPlace].type && conn[checkPlace].type !== this.type)
        .forEach(conn => conn.delete());
      }
    }

    hide() {
      this.hidden = true;
      return this;
    }

    unhide() {
      this.hidden = false;
      return this;
    }

    delete() {
      while (this.connectors.length) {
        this.connectors[0].delete();
      }

      if (this.node && this instanceof XIBLE.NodeInput) {
        delete this.node.inputs[this.name];
      }

      if (this.node && this instanceof XIBLE.NodeOutput) {
        delete this.node.outputs[this.name];
      }
    }
  }

  return Io;
};
