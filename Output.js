module.exports = function(XIBLE) {

  const Io = require('./Io.js');

	class Output extends Io {

		constructor() {
			super(...arguments);
		}

    delete() {

      super.delete();

      if (this.node) {
        this.node.deleteOutput(this);
      }

    }

  }

  return Output;

};
