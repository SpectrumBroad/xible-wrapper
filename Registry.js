'use strict';

module.exports = (XIBLE) => {
  class Registry {
    static searchNodePacks(searchString) {
      const req = XIBLE.http.request('GET', `/api/registry/nodepacks?search=${encodeURIComponent(searchString)}`);
      return req.toJson();
    }

    static installNodePackByName(nodePackName) {
      const req = XIBLE.http.request('PATCH', `/api/registry/nodepacks/${encodeURIComponent(nodePackName)}/install`);
      req.timeout = 120000; // give this a high timeout because installing may take a while
      return req.send();
    }

    static searchFlows(searchString) {
      const req = XIBLE.http.request('GET', `/api/registry/flows?search=${encodeURIComponent(searchString)}`);
      return req.toJson();
    }

    static installFlowByName(flowName) {
      const req = XIBLE.http.request('PATCH', `/api/registry/flows/${encodeURIComponent(flowName)}/install`);
      req.timeout = 120000; // give this a high timeout because installing may take a while
      return req.send();
    }
  }

  return Registry;
};
