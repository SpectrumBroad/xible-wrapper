'use strict';

module.exports = (XIBLE) => {
  class Input extends XIBLE.NodeIo {
    delete() {
      super.delete();

      if (this.node) {
        this.node.deleteInput(this);
      }
    }

    matchesConnectors(connectors) {
      if (!connectors) {
        return false;
      }

      const connector = connectors[0];
      return this.matchesTypeDef(connector)
      .then(matchesTypeDef =>
        this.node !== connectors[0].origin.node &&
        (
          (!this.type && connectors[0].origin.type !== 'trigger') ||
          (!connectors[0].origin.type && this.type !== 'trigger') ||
          matchesTypeDef
        )
      );
    }
  }

  return Input;
};
