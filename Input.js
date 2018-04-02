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
        const matchesTypeDef = await this.matchesTypeDef(connector);

        if (
          !(this.node !== connector.origin.node &&
          (
            (!this.type && connector.origin.type !== 'trigger') ||
            (!connector.origin.type && this.type !== 'trigger') ||
            connector.origin.type === this.type || matchesTypeDef
          ))
        ) {
          return false;
        }
      }

      return true;
    }
  }

  return Input;
};
