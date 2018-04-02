'use strict';

module.exports = (XIBLE) => {
  class Output extends XIBLE.NodeIo {
    delete() {
      super.delete();

      if (this.node) {
        this.node.deleteOutput(this);
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
          !(this.node !== connector.destination.node &&
          (
            (!this.type && connector.destination.type !== 'trigger') ||
            (!connector.destination.type && this.type !== 'trigger') ||
            connector.destination.type === this.type || matchesTypeDef
          ))
        ) {
          return false;
        }
      }

      return true;
    }
  }

  return Output;
};
