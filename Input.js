'use strict';

module.exports = (XIBLE) => {
  class Input extends XIBLE.NodeIo {
    delete() {
      super.delete();

      if (this.node) {
        this.node.deleteInput(this);
      }
    }

    async matchesConnectors(connectors) {
      if (!connectors) {
        return false;
      }

      for (let i = 0; i < connectors.length; i += 1) {
        const connector = connectors[i];

        // don't allow node to connect to itself directly
        if (this.node === connector.origin.node) {
          return false;
        }

        // trigger can only connect to other triggers
        if (
          (connector.origin.type === 'trigger' && this.type !== 'trigger')
          || (connector.origin.type !== 'trigger' && this.type === 'trigger')
        ) {
          return false;
        }

        const matchesTypeDef = await this.matchesTypeDef(connector);
        if (!matchesTypeDef) {
          return false;
        }
      }

      return true;
    }
  }

  return Input;
};
