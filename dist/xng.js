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

/**
 * Cache
 *
 * @constructor
 */
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
 *
 * @constructor
 */
var ResourceCache = function () {
	this.marker = new Cache();
	this.memory = new Cache();
};

ResourceCache.prototype.cache = function (resource, resourceFetcher) {
	return new Promise(function (resolve, reject) {
		var key = _.snakeCase(resource);
		if (this.marker.fault()) this.marker.put(key, resourceFetcher.fetch(resource));
		this.marker.get(key).then(function(response) {
			if (this.memory.fault(key)) this.memory.put(key, response);
			resolve(key);
		}.bind(this), function(err) {
			console.warn('RESOURCE NOT FOUND: ', resource, err);
			reject(resource, resourceFetcher);
		}).catch(function () {
			reject(resource, resourceFetcher);
		});

	}.bind(this));
};

ResourceCache.prototype.get = function (key) {
	return this.memory.get(key);
};


/**
 * ResourceFetcher
 *
 * @param transformer
 * @param urlPrefix
 * @constructor
 */
var ResourceFetcher = function(transformer, urlPrefix) {
	"use strict";
	this.transformer = transformer || new TextTransformer();
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
				console.warn('Error Report', 'Status Code: ' + response.status, response.statusText);
				reject('Error Report', 'Status Code: ' + response.status, response.statusText);
				return;
			}
			response.text().then(function(data) {
				this.transformer.transform(data).then(function(data) {
					resolve(data);
				});
			}.bind(this));

		}.bind(this), reject).catch(function(err) {
			reject(err);
		}.bind(this));
	}.bind(this));
};

/**
 * Renderer
 *
 * @param el
 * @param model
 * @constructor
 */
var Renderer = function(el, model) {
	this.el = el || document.createElement('div');
	this.model = model || {$model: {}};
	this.afterRenderHtmlListeners = {};
};

Renderer.prototype.renderHtml = function(html) {
	var s = document.createElement('script');
	s.type = 'text/x-xng-tpl';
	s.innerHTML = html;
	this.el.appendChild(s);
	this.el.innerHTML = _.template(this.el.innerHTML)(this.model);
	this.el.innerHTML = this.el.querySelector('script').innerHTML;
	_triggerListeners(this.afterRenderHtmlListeners, "all", {el: this.el, model: this.model});
};

Renderer.prototype.afterRenderHtml = function(func) {
	_addListener(this.afterRenderHtmlListeners, "all", func);
};

/**
 * DefaultTransformer 
 * @constructor
 */
var DefaultTransformer = function() {};
DefaultTransformer.prototype.doTransformation = function(str) {
	return str;
};
DefaultTransformer.prototype.transform = function(str) {
	return new Promise(function(resolve, reject) {
		try {
			resolve(this.doTransformation(str));
		} catch(err) {
			reject(str);
		}
	}.bind(this));
};

var TextTransformer = function () {};
TextTransformer.prototype = Object.create(DefaultTransformer.prototype);


var JsonTransformer = function () {};
JsonTransformer.prototype = Object.create(DefaultTransformer.prototype);
JsonTransformer.prototype.doTransformation = function (str) {
	return JSON.parse(str);
};

var Router = function (attribute) {
	this.attribute = attribute;
	this.current_route = "";
	this.listeners = {};
};

Router.prototype.l = function() {
	return window.location;
};
Router.prototype.read = function()  {
	return this.l().href;
};
Router.prototype.redirect = function(path)  {
	this.l().href = path
};

Router.prototype.routing = function (el) {
	var selector = '[' + this.attribute + ']';
	var routes = el.querySelectorAll(selector);

	var root = null, match = null;

	_.forEach(routes, function(element) {
		var route = _.split(element.getAttribute(this.attribute), ',').map(function (v) {return _.trim(v);});

		root = ((_.find('.', route) || null === root) ? _.first(route) : root);
		if (this.matches(route, this.read())) {
			element.style.display = '';
			match = this.l().hash;
			_triggerListeners(this.listeners, route);
		} else {
			element.style.display = 'none';
		}
	}.bind(this));

	if (null === match && routes.length > 0) {
		// root.element.style.display = 'block';
		match = root;
		// redirect on invalid route
		this.redirect(root.replace('.', ''));
	}
	this.current_route = match;
};
Router.prototype.matches = function (str, href) {
	var match = false;
	var _calcMatch = function(str) {
		var url = _.trimEnd(href, '/');
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
Router.prototype.link = function(segment) {
	return segment;
};

var HashRouter = function(attribute) {
	Router.call(this, attribute);
};
HashRouter.prototype = Object.create(Router.prototype);
HashRouter.prototype.read = function()  {
	return _.trimStart(this.l().hash, '#');
};
HashRouter.prototype.redirect = function(path) {
	this.l().hash = path;
};
HashRouter.prototype.link = function(segment) {
	return '#' + segment;
};


var QueryRouter = function(attribute) {
	Router.call(this, attribute);
	this.param = "page";
};
QueryRouter.prototype = Object.create(Router.prototype);
QueryRouter.prototype.read = function() {
	var o = this.getQueryObject();
	return "page" in o ? o.page : "";
};
QueryRouter.prototype.redirect = function(path) {
	this.l().search = path;
};
QueryRouter.prototype.getQueryObject = function() {
	var search = decodeURI(this.l().search.substring(1));

	if (search.length <= 0) {
		return {};
	}

	return JSON.parse('{"' + search.replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g,'":"') + '"}');
};

QueryRouter.prototype.link = function(segment) {
	return this.l().origin + '?page=' + segment;
};


/**
 * XNG Core
 *
 * @constructor
 */
var Xng = function () {
	this.ROUTER_FACTORY = {
		"HashRouter": HashRouter,
		"QueryRouter": QueryRouter
	};
	this.ASSIGNMENT_SYMBOL = "/xng.assignment." + this.guid() + "/";
	this.transformers = {
		'text': new TextTransformer(),
		'json': new JsonTransformer()
	};
	this.defaultModelTransformer = "json";
	this.attributes = {
		view: 'data-xng-view',
		model: 'data-xng-model',
		listen: 'data-xng-listen',
		route: 'data-xng-route',
		transform: 'data-xng-transform'
	};
	this.templateSettings = {
		escape: /{{\\([\s\S]+?)}}/g,
		evaluate:  /{%([\s\S]+?)%}/g,
		interpolate: /{{([\s\S]+?)}}/g
	};
	this.base_remote_dir = "";
	this.model_cache = new ResourceCache();
	this.tpl_cache = new ResourceCache();

	this.router = new HashRouter(this.attributes.route);
	this.listeners = {
		route: {},
		view: {}
	};


	/**
	 * the error template is populated by a {$model: {title: '', message: ''}} object
	 * @type {string}
	 */
	this.errorTemplate = '<div class="error"><h4>{{ $model.title }}</h4><p>{{ $model.message }}</p></div>';
};

/**
 * Creates a specific Transformer Class
 *
 * @param transformFunc gets a string as first param and returns a Json model object
 */
Xng.prototype.createTransformer = function(transformFunc) {
	var transformer = function(){};
	transformer.prototype = Object.create(this.defaultTransformer().prototype);
	transformer.prototype.doTransformation = transformFunc;

	return transformer;
};

Xng.prototype.using = function(router_str_id) {
	var rc = this.ROUTER_FACTORY[router_str_id];
	this.router = new rc(this.attributes.route);
	return this;
};
Xng.prototype.link = function(segment) {
	return this.router.link(segment);
};

Xng.prototype.defaultTransformer = function() {
	return DefaultTransformer;
};

/**
 * fetches a resource and returns a Promise
 * @param resource string - to be fetched
 * @param type string - text or json
 */
Xng.prototype.fetch = function(resource, type) {
	return new ResourceFetcher(this.transformers[type], this.base_remote_dir).fetch(resource);
};

Xng.prototype.render = function (filepath, model, el, listener) {

	return new Promise(function(resolve) {
		var renderer = new Renderer(el, model);

		renderer.afterRenderHtml(function() {
			var views = el.querySelectorAll('['+ this.attributes.view +']');
			this.include(views).then(function () {
				resolve();
				_triggerListeners(this.listeners.view, listener, el);
			}.bind(this));
		}.bind(this));

		this.tpl_cache.cache(filepath, new ResourceFetcher(this.transformers.text, this.base_remote_dir))
			.then(function(key) {
				renderer.renderHtml(this.tpl_cache.get(key));
			}.bind(this), function(src, rf) {
				// render error template if view could not be fetched!
				renderer.model = _.cloneDeep(model);
				renderer.model.$model = {
					title: 'Resource Not Found',
					message: 'Resource ' + filepath + ' could not be loaded!'
				};
				renderer.renderHtml(this.errorTemplate);
				console.warn('Resource not found: ', filepath);
			}.bind(this))
			.catch(function(k) {
				console.warn('error has been catched', k);
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
		listener: el.getAttribute(this.attributes.listen),
		transform: el.getAttribute(this.attributes.transform) || this.defaultModelTransformer
	}
};

Xng.prototype.include = function(includes) {

	return new Promise(function (resolve) {

		// count finish rendering actions
		var f_count = 0;

		// fixme: refactor to Promise.all([render_promises]) after _.forEach()
		var _render = function (directive, model, $cur) {
			this.render(directive.template, {
				$route: this.router.current_route,
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
				this.readAssignment(directive.model, this.transformers[directive.transform])
					.then(function(model) {
						_render(directive, model, $cur);
					}, function() {
						var rf = new ResourceFetcher(this.transformers[directive.transform], this.base_remote_dir);
						this.model_cache.cache(directive.model, rf)
							.then(function(key) {
								_render(directive, this.model_cache.get(key), $cur);
							}.bind(this), function(src) {
								_render(directive, {}, $cur);
								console.warn('Model Resource not found: ', src);
							}.bind(this))
							.catch(function(key) {
								// _render(directive, {}, $cur);
								console.warn(key);
							});
					}.bind(this));

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
	return _.escape(this.ASSIGNMENT_SYMBOL + JSON.stringify(_.toPlainObject(obj)));
};

/**
 * @param obj
 * @param transformer
 * @return {Promise}
 */
Xng.prototype.readAssignment = function (obj, transformer) {
	var str = _.unescape(obj);
	if (_.startsWith(str, this.ASSIGNMENT_SYMBOL)) {
		str = str.replace(this.ASSIGNMENT_SYMBOL, "");
		return transformer.transform(str);
	}
	return new Promise(function(resolve, reject) {
		reject(str);
	});
};

Xng.prototype.base = function(base_dir) {
	this.base_remote_dir = base_dir;
	return this;
};


/**
 * executes the router
 * @param el
 */
Xng.prototype.routing = function (el) {
	this.router.routing(el);
};
Xng.prototype.matches = function(str, href) {
	return this.router.matches(str, href);
};
/**
 * Adds routing listeners
 * @param route
 * @param cb
 * @return {Xng}
 */
Xng.prototype.route = function(route, cb) {
	// _addListener(this.listeners.route, route, cb);
	_addListener(this.router.listeners, route, cb);
	return this;
};

/**
 * registers a model transformer
 * @param format string
 * @param transformer {DefaultTransformer}
 * @return {Xng}
 */
Xng.prototype.transform = function (format, transformer) {
	if (_.isString(format) && _.isFunction(transformer)) {
		var tclass = this.createTransformer(transformer);
		this.transform(format, new tclass());
	} else if (_.isObject(format) && _.isUndefined(transformer)) {
		for (var t in format) {
			this.transform(t, format[t]);
		}
	} else if (_.isString(format) && ! _.isUndefined(transformer)) {
		this.transformers[format] = transformer;
	}

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
	// assign router attribute for overrides
	this.router.attribute = this.attributes.route;

	var p = this.include(document.querySelectorAll('[' + this.attributes.view + ']'));

	p.then(function() {
		window.onhashchange = function() {
			this.routing(document);
		}.bind(this);
	}.bind(this));

	return p;
};

// create global _.xng instance
if ( ! _.xng) _.xng = new Xng();
return Xng;
}));
