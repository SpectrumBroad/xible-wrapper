module.exports = function(XIBLE) {

	const OoHttpRequest = require('../oohttprequest');

	class Config {

    static validatePermissions() {

      let req = new OoHttpRequest('GET', `https://${XIBLE.hostname}:${XIBLE.port}/api/config/validatePermissions`);
      return req.toJson();

    }

  }

  return Config;

};
