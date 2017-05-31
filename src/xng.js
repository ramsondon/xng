
var _addListener = function(listeners, key, cb) {
	if (_.isObject(key) && _.isUndefined(cb)) {
		for (var k in key) {
			_addListener(listeners, k, key[k]);
		}
	} else if (_.isString(key) && _.isFunction(cb)) {
		listeners[key] = cb;
	}
};

var _triggerListeners = function(listeners, key) {
	if (_.isString(key) && key in listeners) {
		listeners[key](key);
	}
	if ("*" in listeners) {
		listeners["*"](key);
	}
};


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
	this.wait_cache_freq = 0;
	this.model_cache = {
		mark: {},
		cache: {}
	};
	this.tpl_cache = {
		mark: {},
		cache: {}
	};
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
	return new Promise(function (resolve, reject) {
		var url = _.trimEnd(this.base_remote_dir, '/') + '/' + _.trimStart(resource, '/');

		fetch(url).then(function(response) {
			if (response.status !== 200) {
				reject('Error Report', 'Status Code: ' + response.status, response.statusText);
				return;
			}
			response[type]().then(function(data) {
				resolve(data);
			}.bind(this));

		}.bind(this)).catch(function(err) {
			reject(err);
		}.bind(this));
	}.bind(this));
};

Xng.prototype.toKey = function(str) {
	return str.replace(new RegExp('[\/\.-]', 'g'), '_');
};

Xng.prototype.waitCache = function(cache, key) {
	return new Promise(function(resolve) {
		var t=0;
		var poll = function() {
			if (t > 0 && key in cache) {
				clearTimeout(t);
				t = 0;
				resolve(key);
			} else {
				t = setTimeout(poll, this.wait_cache_freq);
			}
		}.bind(this);
		t = setTimeout(poll, this.wait_cache_freq);
	}.bind(this));
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
						_triggerListeners(this.listeners.view, listener);
					}.bind(this));

		}.bind(this);

		this.cacheResource(filepath, this.tpl_cache, 'text')
			.then(function(key) {
				render(this.tpl_cache.cache[key]);
			}.bind(this))
			.catch(function(k) {
				console.warn(k);
			});
	}.bind(this));
};

Xng.prototype.put = function(html, selector) {
	document.querySelector(selector).innerHTML = html;
};

Xng.prototype.guid = function() {
	var s = function() {
		return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
	};
	return [s() + s(), s(), s(), s(), s() + s() + s()].join('-');
};

Xng.prototype.cacheResource = function (resource, cache, res_type) {
	return new Promise(function (resolve) {
		var key = this.toKey(resource);
		if (key in cache.mark) {
			this.waitCache(cache.cache, key)
				.then(function (key) {
					resolve(key);
				}.bind(this));
		} else {
			cache.mark[key] = resource;
			this.fetch(resource, res_type)
				.then(function(response) {
					cache.cache[key] = response;
					resolve(key);
				});
		}
	}.bind(this));
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
					this.cacheResource(directive.model, this.model_cache, 'json')
						.then(function(key) {
							_render(directive, this.model_cache.cache[key], $cur);
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
	var url = _.trimStart(href, '#');
	// root route
	if ((! str || str === '.') && url.length <= 0) {
		return true;
	}

	return str === url;
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
		var route = element.getAttribute(this.attributes.route);
		root = ((route === '.' || null === root) ? route : root);
		if (this.matches(route, window.location.hash)) {
			element.style.display = 'block';
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
			_.forEach(src, function(s, idx) {
				load(document, "script", s, function() {
					if (idx === src.length-1) {
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
	for (var s in this.templateSettings) {
		_.templateSettings[s] = this.templateSettings[s];
	}

	var p = this.include(document.querySelectorAll('[' + this.attributes.view + ']'));

	p.then(function() {
		window.onhashchange = function() {
			this.routing(document);
		}.bind(this);
	}.bind(this));

	return p;
};

_.xng = new Xng();