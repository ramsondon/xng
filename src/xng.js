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
			console.warn('resource not found: ', resource, err);
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


/**
 * Router
 * @param attr the data-xng-route attribute
 * @constructor
 */
var Router = function (attr) {
	this.attribute = attr;
	this.redirectOnInvalid = true;
	this.routeMap = {
		elements: [],
		routes: {}
	};
	this.listeners = {};
};
Router.prototype.current = function () {
	return this.normalize(this.read());
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
Router.prototype.normalize = function (path) {
	return _.trim(_.trim(path||""),'/');
};
/**
 * parses a path to an array of pathes
 * @param route
 * @return {Array}
 */
Router.prototype.parse = function(route)  {
	route = route || "";
	route = _.split(route, ',');
	route = _.compact(route);
	return route.map(function (v) {
		return this.normalize(v);
	}.bind(this));
};
Router.prototype.select = function(el) {
	return el.querySelectorAll('[' + this.attribute + ']');
};
Router.prototype.collect = function(el) {
	var routes = this.select(el);

	_.forEach(routes, function(element) {

		// cache element in global elements list
		if ( ! _.find(this.routeMap.elements, function (e) {
				return e === element;
			})) {
			this.routeMap.elements.push(element);

			var av = element.getAttribute(this.attribute);
			this.parse(av).forEach(function (r) {
				if ( ! (r in this.routeMap.routes)) {
					this.routeMap.routes[r] = {
						route: r,
						elements: []
					}
				}
				if ( ! _.find(this.routeMap.routes[r].elements, function (e) {
						return e === element;
					})) {
					this.routeMap.routes[r].elements.push(element);
				}
			}.bind(this));
		}
	}.bind(this));

	return routes.length;
};
Router.prototype.link = function(segment) {
	return segment;
};
Router.prototype.listen = function() {
	var cur = this.current();
	var _in  = function (r) {
		return r in this.routeMap.routes;
	}.bind(this);

	var _show = function (r) {
		if (this.routeMap.elements.length > 0 && r in this.routeMap.routes) {
			var route = this.routeMap.routes[r];
			this.routeMap.elements.forEach(function (e) {
				e.style.display = 'none';
			});
			route.elements.forEach(function (e) {
				e.style.display = '';
			});
			_triggerListeners(this.listeners, route.routes);
		}
	}.bind(this);

	if (_in(cur)) {
		_show(cur);
	} else if(cur.length <= 0 && _in(".")) {
		_show(".");
	} else if (cur.length <= 0) {
		_show(_.first(this.routeMap.routes));
	} else if (this.redirectOnInvalid) {
		// redirect on invalid route
		this.redirect("");
	}
};


/**
 * HashRouter
 * @param attr the data-xng-route attribute
 * @constructor
 */
var HashRouter = function(attr) {
	Router.call(this, attr);
};
HashRouter.prototype = Object.create(Router.prototype);
HashRouter.prototype.read = function()  {
	return this.l().hash;
};
HashRouter.prototype.normalize = function (path) {
	return _.trimStart(Router.prototype.normalize.apply(this, arguments), '#');
	// return _.trim(_.trim(path),'/');
};
HashRouter.prototype.redirect = function(path) {
	this.l().hash = path;
};
HashRouter.prototype.link = function(segment) {
	return '#' + segment;
};
HashRouter.prototype.listen = function() {
	Router.prototype.listen.apply(this, arguments);
	window.onhashchange = function() {
		Router.prototype.listen.apply(this, arguments);
	}.bind(this);
};

/**
 * QueryRouter
 * @param attr the data-xng-route attribute
 * @constructor
 */
var QueryRouter = function(attr) {
	Router.call(this, attr);
	this.param = "page";
};
QueryRouter.prototype = Object.create(Router.prototype);
QueryRouter.prototype.read = function() {
	var o = this.getQueryObject();
	return this.param in o ? o.page : "";
};
QueryRouter.prototype.normalize = function (path) {
	return _.trimStart(Router.prototype.normalize.apply(this, arguments), '?');
};
QueryRouter.prototype.redirect = function(path) {
	this.l().search = path;
};
QueryRouter.prototype.getQueryObject = function() {
	var search = decodeURIComponent(this.l().search.substring(1));

	if (search.length <= 0) return {};
	return JSON.parse('{"' + search.replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g,'":"') + '"}');
};
QueryRouter.prototype.toQueryString = function(obj, prefix) {
	var str = [], p;
	for(p in obj) {
		if (obj.hasOwnProperty(p)) {
			var k = prefix ? prefix + "[" + p + "]" : p, v = obj[p];
			str.push((v !== null && typeof v === "object") ?
				this.toQueryString(v, k) :
				encodeURIComponent(k) + "=" + encodeURIComponent(v));
		}
	}

	return str.join("&");
};
QueryRouter.prototype.link = function(segment) {
	// return '?' + this.param + '=' + segment;
	var search = this.getQueryObject();
	search[this.param] = segment;
	return '?' + this.toQueryString(search) + this.l().hash;
	// return _.first(this.l().href.split('?')) + '?' + this.param + '=' + segment;
};
QueryRouter.prototype.listen = function() {
	Router.prototype.listen.apply(this, arguments);
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

Xng.prototype.defaultTransformer = function() {
	return DefaultTransformer;
};
Xng.prototype.using = function(router) {
	var rc = this.ROUTER_FACTORY[router];
	this.router = new rc(this.attributes.route);
	return this;
};
Xng.prototype.link = function(segment) {
	return this.router.link(segment);
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
					title: 'resource not found',
					message: 'resource ' + filepath + ' could not be loaded!'
				};
				renderer.renderHtml(this.errorTemplate);
				console.warn('resource not found: ', filepath);
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
		var _try_resolve = function () {
			if (++f_count === includes.length) {
				resolve();
			}
		};
		// fixme: refactor to Promise.all([render_promises]) after _.forEach()
		var _render = function (directive, model, $cur) {
			this.render(directive.template, {
				$route: this.router.current(),
				$model: model
			}, $cur, directive.listener).then(_try_resolve.bind(this));
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
								console.warn('model resource not found: ', src);
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
 * Adds routing listeners
 * @param route
 * @param cb
 * @return {Xng}
 */
Xng.prototype.route = function(route, cb) {
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
		this.router.collect(document);
		this.router.listen();
	}.bind(this));

	return p;
};

// create global _.xng instance
if ( ! _.xng) _.xng = new Xng();