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

      /* Enabling this involves setting event listeners.
       * So it needs to be false to begin with,
       * so a setSingleType() call can fix everything properly.
       * This setting is only managed from the xible-wrapper,
       * so this is safe to force to false.
       */ 
      this.singleType = false;

      if (!this.assignsOutputTypes) {
        this.assignsOutputTypes = [];
      }

      if (!this.assignsInputTypes) {
        this.assignsInputTypes = [];
      }

      this.connectors = [];

      if (!this._id) {
        this._id = XIBLE.generateObjectId();
      }

      this.setName(name);

      this.setType(this.type);

      if (typeof this.maxConnectors === 'number') {
        this.setMaxConnectors(this.maxConnectors);
      }

      if (this.assignsOutputTypes.length) {
        if (!this.singleType) {
          this.setSingleType(true);
        }

        this.assignsOutputTypes.forEach((assignsOutputType) => {
          this.on('settype', () => {
            if (!this.node) {
              return;
            }

            const output = this.node.getOutputByName(assignsOutputType);
            if (!this.connectors.length) {
              if (!this.hasOtherAssignments(assignsOutputType, false)) {
                output.setType(output.structureType);
              }
            } else {
              output.setType(this.type);
            }
          });
        });
      }

      if (this.assignsInputTypes.length) {
        if (!this.singleType) {
          this.setSingleType(true);
        }

        this.assignsInputTypes.forEach((assignsInputType) => {
          this.on('settype', () => {
            if (!this.node) {
              return;
            }

            const input = this.node.getInputByName(assignsInputType);
            if (!this.connectors.length) {
              if (!this.hasOtherAssignments(assignsInputType, true)) {
                input.setType(input.structureType);
              }
            } else {
              input.setType(this.type);
            }
          });
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
     * Verifies if there are any other inputs or outputs that are assigning a type while being connected.
     * @param {String} assignsIoName If provided, this will validatee if the given assignsIoName is part of an assignment.
     * @param {Boolean} assignsIoType True for verifying assignsInputTypes, false for assignsOutputTypes on any io.
     * @returns {Boolean} True if another input or output is already forcing assigment, false if not.
     */
    hasOtherAssignments(assignsIoName, assignsIoType) {
      const ioType = this instanceof XIBLE.NodeInput;
      return this.node.getInputs()
      .concat(this.node.getOutputs())
      .filter(io => io !== this)
      .some(io =>
        io.connectors.length &&
        (
          io[ioType ? 'assignsInputTypes' : 'assignsOutputTypes'].includes(this.name) ||
          (assignsIoName && io[assignsIoType ? 'assignsInputTypes' : 'assignsOutputTypes' ].includes(assignsIoName))
        )
      );
    }

    /**
    * If this is set to true, and type===null,
    * it's verified that only one type of connector is hooked up.
    * @param {Boolean} singleType
    */
    setSingleType(bool) {
      this.singleType = bool;

      // TODO: unhook eventlisteners when changing singleType
      if (bool) {
        this.on('attach', (conn) => {
          const connLoc = conn[this instanceof XIBLE.NodeInput ? 'origin' : 'destination'];
          if (connLoc && connLoc.type) {
            this.setType(connLoc.type);
          }
        });

        this.on('detach', () => {
          if (!this.connectors.length) {
            if (!this.hasOtherAssignments()) {
              this.setType(this.structureType);
            }
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

    /**
     * Sets the type of the io to the given value.
     * Returns immediately if the type is already set.
     * Ensures setSingleType is set to true if no type is supplied, and singleType is not yet set.
     * @param {String} type
     * @returns {Io} Returns this io for daisy chaining.
     */
    setType(type) {
      if (!type && !this.singleType) {
        this.setSingleType(true);
      }

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

    /**
    * Verifies whether a connector matches the typedef on the NodeIo
    * @param {Connector}
    * @returns {Promise.<Boolean>}
    */
    matchesTypeDef(connector) {
      return XIBLE.TypeDef.getAll()
      .then((typeDefs) => {
        const outGoing = this instanceof XIBLE.NodeOutput;
        const originTypeDef = typeDefs[(outGoing ? this.type : connector.origin.type)];
        const destinationTypeDef = typeDefs[(outGoing ? connector.destination.type : this.type)];

        if (!destinationTypeDef || !originTypeDef) {
          return false;
        }
        return destinationTypeDef.matches(originTypeDef);
      });
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
      if (this.type) {
        this.connectors.forEach((connector) => {
          this.matchesTypeDef(connector)
          .then((matchesTypeDef) => {
            if (!matchesTypeDef) {
              connector.delete();
            }
          });
        });
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
