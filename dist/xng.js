;(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['lodash'], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory(require('lodash'));
  } else {
    root.Xng = factory(root._);
  }
}(this, function(_) {
var _randChar = function() {
	"use strict";
	return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
};

var _addListener = function(listeners, key, cb) {
	"use strict";
	if (_.isObject(key) && _.isUndefined(cb)) {
		for (var k in key) {
			_addListener(listeners, k, key[k]);
		}
	} else if (_.isString(key) && _.isFunction(cb)) {
		listeners[key] = cb;
	}
};

var _triggerListeners = function(listeners, key, param) {
	"use strict";
	if (_.isString(key) && key in listeners) {
		listeners[key](key, param);
	} else if (_.isArray(key)) {
		_.forEach(key, function (k) {
			_triggerListeners(listeners, k, param);
		});
	}
	if ("*" in listeners) {
		listeners["*"](key, param);
	}
};


var Cache = function () {
	this.memory = {};
};

Cache.prototype.hit = function (key) {
	return key in this.memory;
};
Cache.prototype.fault = function (key) {
	return ! this.hit(key);
};
Cache.prototype.put = function (key, value) {
	this.memory[key] = value;
};
Cache.prototype.get = function (key) {
	if (this.hit(key))
		return this.memory[key];

	throw new Error('cache fault');
};

/**
 * ResourceCache
 * @constructor
 */
var ResourceCache = function () {
	this.marker = new Cache();
	this.memory = new Cache();
};

ResourceCache.prototype.cache = function (resource, resourceFetcher) {
	return new Promise(function (resolve) {
		var key = _.snakeCase(resource);
		if (this.marker.fault()) this.marker.put(key, resourceFetcher.fetch(resource));

		this.marker.get(key).then(function(response) {
			if (this.memory.fault(key)) this.memory.put(key, response);
			resolve(key);
		}.bind(this));
	}.bind(this));
};

ResourceCache.prototype.get = function (key) {
	return this.memory.get(key);
};


/**
 * ResourceFetcher
 * @param type
 * @constructor
 */
var ResourceFetcher = function(type, urlPrefix) {
	"use strict";
	this.type = type || "text";
	this.url_prefix = urlPrefix || "";
};

ResourceFetcher.prototype.parse = function (resource) {
	"use strict";
	if (this.url_prefix.length > 0) {
		return _.trimEnd(this.url_prefix, '/') + '/' + _.trimStart(resource, '/');
	}
	return resource;
};

ResourceFetcher.prototype.fetch = function (resource) {
	return new Promise(function (resolve, reject) {
		var url = this.parse(resource);

		fetch(url).then(function(response) {
			if (response.status !== 200) {
				reject('Error Report', 'Status Code: ' + response.status, response.statusText);
				return;
			}
			response[this.type]().then(function(data) {
				resolve(data);
			}.bind(this));

		}.bind(this)).catch(function(err) {
			reject(err);
		}.bind(this));
	}.bind(this));
};

/**
 * XNG Core
 * @constructor
 */
var Xng = function () {
	this.attributes = {
		view: 'data-xng-view',
		model: 'data-xng-model',
		listen: 'data-xng-listen',
		route: 'data-xng-route'
	};
	this.templateSettings = {
		escape: /{{\\([\s\S]+?)}}/g,
		evaluate:  /{%([\s\S]+?)%}/g,
		interpolate: /{{([\s\S]+?)}}/g
	};
	this.base_remote_dir = "";
	this.current_route = "";
	this.model_cache = new ResourceCache();
	this.tpl_cache = new ResourceCache();
	this.listeners = {
		route: {},
		view: {}
	};
};

/**
 * fetches a resource and returns a Promise
 * @param resource string - to be fetched
 * @param type string - text or json
 */
Xng.prototype.fetch = function(resource, type) {
	return new ResourceFetcher(type, this.base_remote_dir).fetch(resource);
};

Xng.prototype.render = function (filepath, model, el, listener) {

	return new Promise(function(resolve) {

		var render = function(html) {
			var s = document.createElement('script');
			s.type = 'text/x-xng-tpl';
			s.innerHTML = html;
			el.appendChild(s);
			el.innerHTML = _.template(el.innerHTML)(model);
			el.innerHTML = el.querySelector('script').innerHTML;

				this.include(el.querySelectorAll('['+ this.attributes.view +']'))
					.then(function () {
						resolve();
						_triggerListeners(this.listeners.view, listener, el);
					}.bind(this));

		}.bind(this);
		this.tpl_cache.cache(filepath, new ResourceFetcher('text', this.base_remote_dir))
			.then(function(key) {
				render(this.tpl_cache.get(key));
			}.bind(this))
			.catch(function(k) {
				console.warn(k);
			});
	}.bind(this));
};

Xng.prototype.put = function(html, selector, trigger) {
	var el = document.querySelector(selector);
	el.innerHTML = html;
	_triggerListeners(this.listeners.view, trigger, el);
};

Xng.prototype.guid = function() {
	var s = _randChar;
	return [s()+s(), s(), s(), s(), s()+s()+s()].join('-');
};

Xng.prototype.parseDirectives = function (el) {
	return {
		model: el.getAttribute(this.attributes.model),
		template: el.getAttribute(this.attributes.view),
		listener: el.getAttribute(this.attributes.listen)
	}
};

Xng.prototype.include = function(includes) {

	return new Promise(function (resolve) {

		// count finish rendering actions
		var f_count = 0;

		// fixme: refactor to Promise.all([render_promises]) after _.forEach()
		var _render = function (directive, model, $cur) {
			this.render(directive.template, {
				$route: this.current_route,
				$model: model
			}, $cur, directive.listener)
				.then(function() {
					// wait for all components to resolve this promise
					if (++f_count === includes.length) {
						resolve();
						this.routing($cur);
					}
				}.bind(this));
		}.bind(this);

		_.forEach(includes, function($cur) {
			var directive = this.parseDirectives($cur);
			if (directive.model) {

				try {
					// check if we assigned a json object
					_render(directive, this.readAssignment(directive.model), $cur);
				} catch (e) {
					this.model_cache.cache(directive.model, new ResourceFetcher('json', this.base_remote_dir))
						.then(function(key) {
							_render(directive, this.model_cache.get(key), $cur);
						}.bind(this))
						.catch(function(key) {
							console.warn(key);
						});
				}
			} else {
				_render(directive, null, $cur);
			}
		}.bind(this));

		if (includes.length <= 0) {
			resolve();
		}
	}.bind(this));
};

/**
 * @link https://stackoverflow.com/questions/7467840/nl2br-equivalent-in-javascript
 * @param str
 * @param is_xhtml
 * @returns {string}
 */
Xng.prototype.nl2br = function(str, is_xhtml) {
	if (_.isString(str)) {
		var breakTag = (is_xhtml || typeof is_xhtml === 'undefined') ? '<br />' : '<br>';
		return (str + '').replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1' + breakTag + '$2');
	}
	return str;
};

Xng.prototype.assign = function (obj) {
	return _.escape(JSON.stringify(obj));
};

Xng.prototype.readAssignment = function (obj) {
	return JSON.parse(_.unescape(obj));
};

Xng.prototype.base = function(base_dir) {
	this.base_remote_dir = base_dir;
	return this;
};

Xng.prototype.matches = function(str, href) {
	var match = false;
	var _calcMatch = function(str) {
		var url = _.trimStart(href, '#');
		// root route
		if (((! str || str === '.') && url.length <= 0) || (str === url)) {
			match = true;
			return false;
		}
	};
	if (_.isArray(str)) {
		_.forEach(str, _calcMatch);
	} else {
		_calcMatch(_.toString(str));
	}

	return match;
};

/**
 * executes the router
 * @param el
 */
Xng.prototype.routing = function (el) {

	var selector = '[' + this.attributes.route + ']';
	var routes = el.querySelectorAll(selector);

	var root = null, match = null;

	_.forEach(routes, function(element) {
		var route = _.split(element.getAttribute(this.attributes.route), ',').map(function (v) {return _.trim(v);});

		root = ((_.find('.', route) || null === root) ? _.first(route) : root);
		if (this.matches(route, window.location.hash)) {
			element.style.display = '';
			match = window.location.hash;
			_triggerListeners(this.listeners.route, route);
		} else {
			element.style.display = 'none';
		}
	}.bind(this));

	if (null === match && routes.length > 0) {
		// root.element.style.display = 'block';
		match = root;
		// redirect on invalid route
		window.location.hash = root.replace('.', '');
	}
	this.current_route = match;
};

/**
 * Adds routing listeners
 * @param route
 * @param cb
 * @return {Xng}
 */
Xng.prototype.route = function(route, cb) {
	_addListener(this.listeners.route, route, cb);
	return this;
};

/**
 * Adds view listeners
 * @param key
 * @param cb
 * @return {Xng}
 */
Xng.prototype.listen = function(key, cb) {
	_addListener(this.listeners.view, key, cb);
	return this;
};

/**
 * loads a given src asynchronously and returns a Promise for that
 * @param src
 * @param attrs
 * @return Promise
 */
Xng.prototype.require = function (src, attrs) {
	return new Promise(function(resolve) {

		var load = (function(d, s, src, callback) {
			var id = src.replace(new RegExp('[\/\.:]', 'g'), '_');
			var js, fjs = d.getElementsByTagName(s)[0];
			if (d.getElementById(id)) return;
			js = d.createElement(s);
			js.id = id;
			js.src = src;
			if (_.isString(attrs)) {
				js.setAttribute(attrs, '');
			}
			if (_.isObject(attrs)) {
				for (var a in attrs) {
					js.setAttribute(a, attrs[a]);
				}
			}
			if (_.isArray(attrs)) {
				for (var i=0; i < attrs.length; i++) {
					js.setAttribute(attrs[i], '');
				}
			}
			fjs.parentNode.insertBefore(js, fjs);

			if (js.readyState) { //IE
				js.onreadystatechange = function () {
					if (js.readyState === "loaded" ||
						js.readyState === "complete") {
						js.onreadystatechange = null;
						callback(src);
					}
				};
			} else { // others than IE
				js.onload = function() {
					callback(src);
				};
			}
		});

		if (_.isString(src)) {
			load(document, "script", src, resolve);
		} else {
			var readyCount = 0;
			_.forEach(src, function(s, idx) {
				load(document, "script", s, function() {
					if (readyCount++ >= src.length-1) {
						resolve(src);
					}
				});
			});
		}


	}.bind(this));
};

/**
 * runs the xng application
 * @return Promise
 */
Xng.prototype.run = function () {
	// lodash settings
	_.assign(_.templateSettings, this.templateSettings);

	var p = this.include(document.querySelectorAll('[' + this.attributes.view + ']'));

	p.then(function() {
		window.onhashchange = function() {
			this.routing(document);
		}.bind(this);
	}.bind(this));

	return p;
};

_.xng = new Xng();
return Xng;
}));
