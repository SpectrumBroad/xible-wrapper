'use strict';

module.exports = (XIBLE) => {
  class Registry {

    static searchNodePacks(searchString) {
      const req = XIBLE.httpBase.request('GET', `http${XIBLE.baseUrl}/api/registry/nodepacks?search=${encodeURIComponent(searchString)}`);
      return req.toJson();
    }

    static installNodePackByName(nodePackName) {
      const req = XIBLE.httpBase.request('PATCH', `http${XIBLE.baseUrl}/api/registry/nodepacks/${encodeURIComponent(nodePackName)}/install`);
      req.timeout = 120000; // give this a high timeout because installing may take a while
      return req.send();
    }

  }

  return Registry;
};
