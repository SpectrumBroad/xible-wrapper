'use strict';

module.exports = (XIBLE) => {
  const { EventEmitter } = require('events');

  // local cache
  let config = null;

  class Config {
    static getAll() {
      if (config) {
        return Promise.resolve(config);
      }

      return XIBLE.http.request('GET', '/api/config')
      .toJson()
      .then((configObj) => {
        config = configObj;
        return config;
      });
    }

    static validatePermissions() {
      const req = XIBLE.http.request('GET', '/api/config/validatePermissions');
      return req.toJson();
    }

    static deleteValue(path) {
      this.deleteObjectValueOnPath(config, path);

      const req = XIBLE.http.request('DELETE', '/api/config/value');
      return req.toJson({
        path
      });
    }

    static setValue(path, value) {
      if (['string', 'number', 'boolean', 'date'].indexOf(typeof value) === -1) {
        throw new Error('Param "value" should be of type "string", "number", "boolean" or "date"');
      }

      this.setObjectValueOnPath(config, path, value);

      const req = XIBLE.http.request('PUT', '/api/config/value');
      return req.toJson({
        path,
        value
      });
    }

    static deleteObjectValueOnPath(obj, path) {
      const pathSplit = path.split('.');
      let sel = obj;

      for (let i = 0; i < pathSplit.length - 1; i += 1) {
        const part = pathSplit[i];
        if (sel.hasOwnProperty(part)) {
          sel = sel[part];
        } else {
          return false;
        }
      }

      delete sel[pathSplit.pop()];
      return true;
    }

    static setObjectValueOnPath(obj, path, value) {
      const pathSplit = path.split('.');
      let sel = obj;

      for (let i = 0; i < pathSplit.length - 1; i += 1) {
        const part = pathSplit[i];
        if (sel.hasOwnProperty(part)) {
          sel = sel[part];
        } else {
          sel = sel[part] = {};
        }
      }

      sel[pathSplit.pop()] = value;
    }

    static getObjectValueOnPath(obj, path) {
      const pathSplit = path.split('.');
      let sel = obj;

      for (let i = 0; i < pathSplit.length; i += 1) {
        const part = pathSplit[i];
        if (sel.hasOwnProperty(part)) {
          sel = sel[part];
        } else {
          return null;
        }
      }

      return sel;
    }

    static getValue(path) {
      return this.getAll()
      .then(configObj => this.getObjectValueOnPath(configObj, path));
    }
  }

  // statically hook eventemitter
  Object.assign(Config, EventEmitter.prototype);
  EventEmitter.call(Config);

  // reset config when the connection closes
  XIBLE.on('close', () => {
    config = null;
  });

  // handle socket messages
  XIBLE.on('message', (json) => {
    if (!config) {
      return;
    }

    switch (json.method) {
      case 'xible.config.setValue':
        Config.setObjectValueOnPath(config, json.path, json.value);
        Config.emit('setValue', json.path, json.value);
        break;

      case 'xible.config.deleteValue':
        Config.deleteObjectValueOnPath(config, json.path);
        Config.emit('deleteValue', json.path);
        break;
    }
  });

  return Config;
};
