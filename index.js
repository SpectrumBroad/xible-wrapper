'use strict';


//require a WebSocket module for nodejs
const WebSocket = require('ws');


const HttpRequest = require('../HttpRequest');
const EventEmitter = require('events').EventEmitter;


process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';


class XibleWrapper extends EventEmitter {

	constructor(obj) {

		super();

		//get obj properties we need
		this.hostname = obj.hostname;
		this.port = obj.port || 9600;

		//token if specified
		if (obj.token) {
			this.setToken(obj.token);
		}

		//default props
		this.readyState = XibleWrapper.STATE_CLOSED;
		this.webSocket = null;
		this.socketServer = null;

		this.Flow = require('./Flow.js')(this);

	}

	static get STATE_CONNECTING() {
		return 0;
	}

	static get STATE_OPEN() {
		return 1;
	}

	static get STATE_CLOSING() {
		return 2;
	}

	static get STATE_CLOSED() {
		return 3;
	}

	setToken(token) {

		this.token = token;
		HttpRequest.defaults.headers['x-access-token'] = this.token;

	}

	getHostPorts() {

		/*
				let req = new HttpRequest('GET', `https://${this.hostname}:${this.port}/server`);
				return req.toObject(Object).then((obj) => {
					this.socketServer = obj.socketServer;
				});
				*/

		this.socketServer = {
			"port": 9601
		};

		return Promise.resolve();

	}

	connectSocket() {

		//setup a websocket towards
		let ws = this.webSocket = new WebSocket(`wss://${this.hostname}:${this.socketServer.port}/?token=${this.token}`);
		ws.addEventListener('open', (event) => {

			this.readyState = XibleWrapper.STATE_OPEN;
			this.emit('open', event);

		});

		ws.addEventListener('close', (event) => {

			this.readyState = XibleWrapper.STATE_CLOSED;
			this.webSocket = null;
			this.emit('close', event);

		});

		ws.addEventListener('error', (event) => {
			this.emit('error', event);
		});

		ws.addEventListener('message', (event) => {

			this.emit('message', event);

			try {

				/**
				 *  Parses event.data from the message to JSON and emits the resulting object
				 *  @event XibleWrapper#json
				 *  @type {Object}
				 */
				this.emit('json', JSON.parse(event.data));
			} catch (e) {}

		});

	}

	connect() {

		if (this.readyState !== XibleWrapper.STATE_CLOSED) {
			throw `Cannot connect; not in a closed state`;
		}

		this.readyState = XibleWrapper.STATE_CONNECTING;

		return this.getHostPorts()
			.then(() => this.connectSocket())
			.catch((err) => {

				this.emit('error', err);
				this.emit('close');

			});

	}

	close() {

		if (this.readyState !== XibleWrapper.STATE_OPEN) {
			throw `Cannot connect; not in a open state`;
		}

		this.readyState = XibleWrapper.STATE_CLOSING;

		this.stopAutoReconnect();

		if (this.webSocket) {
			return new Promise((resolve, reject) => {

				this.webSocket.once('close', () => {
					resolve(this);
				});

				this.webSocket.close();

			});

		} else {
			return Promise.resolve(this);
		}

	}

	/**
	 *  This method will force an automatic reconnect of the socket every <timeout> after a close event
	 *  @param {Number} timeout the amount of milliseconds after 'close' before retrying
	 */
	autoReconnect(timeout = 5000) {

		this.on('close', this._autoReconnectListener = () => {
			setTimeout(() => {
				if (this.readyState === XibleWrapper.STATE_CLOSED) {
					this.connect();
				}
			}, timeout);
		});

	}

	//if this close is enforced and autoreconnect is on,
	//disable autoreconnect
	stopAutoReconnect(timeout) {

		if (this.autoReconnectListener) {

			this.removeListener('close', this.autoReconnectListener);
			this.autoReconnectListener = null;

		}

	}

}

module.exports = XibleWrapper;
