'use strict';

module.exports = (XIBLE) => {
  class Output extends XIBLE.NodeIo {

    delete() {
      super.delete();

      if (this.node) {
        this.node.deleteOutput(this);
      }
    }

  }

  return Output;
};
