# XIBLE
A visual programming language. Visit <https://xible.io> for more information.

[![npm](http://img.shields.io/npm/v/xible-wrapper.svg?style=flat-square)](http://www.npmjs.org/xible-wrapper)

# Description
This npm package can be used as a nodejs wrapper to interface with a XIBLE instance.

# Installation

## Node.js
<pre><code>npm install xible-wrapper --only=prod</code></pre>

## Browser
The `dist` directory contains a transpiled version, ready for use in the browser. Including the `index.js` on any page will expose a global `XibleWrapper` class.

# Examples

## Connecting to XIBLE
```javascript
const XibleWrapper = require('xible-wrapper');

const xibleWrapperInstance = new XibleWrapper('http://127.0.0.1:9600');
xibleWrapperInstance.on('error', (err) => {
  console.error(err);
});

xibleWrapperInstance.on('open', () => {
  console.log('connected');
});

// on disconnect, keep retrying until the connection succeeds
xibleWrapperInstance.autoReconnect();

// connect
xibleWrapperInstance.connect();
```

## Get all flows
```javascript
const flows = await xibleWrapperInstance.Flow.getAll();
console.log(flows);
```

## Creating a flow instance
This creates a flow instance and starts it immediately. After 10 seconds it is forcefully stopped and the instance removed.
```javascript
// get the flow named 'my flow'
const flow = await xibleWrapperInstance.Flow.getById('my flow');
console.log('got flow', flow);

// create instance and start it
const instance = await flow.createInstance({ start: true });
console.log('started', instance);

// wait ten seconds, after that delete the instance
setTimeout(async () => {
  await instance.delete();
  console.log('stopped and deleted');
}, 10000);
```

## Read out settings
```javascript
const registryNodepackAllowPublish = await xibleWrapper.Config.getValue('registry.nodepacks.allowpublish');
console.log(registryNodepackAllowPublish);
````
