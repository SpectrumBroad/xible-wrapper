module.exports = function(XIBLE) {

  const Io = require('./Io.js');

	class Output extends Io {

		constructor() {
			super(...arguments);
		}

  }

  return Output;

};
