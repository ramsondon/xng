if (!_ || typeof(_) === 'undefined') {
	_ = {};
}

_.xng = function () {


	var xng = function () {
		this.attributes = {
			view: 'data-xng-view',
			model: 'data-xng-model',
			listen: 'data-xng-listen'
		};
		this.base_route = "";
		this.wait_cache_freq = 0;
		this.model_cache = {
			mark: {},
			cache: {}
		};
		this.tpl_cache = {
			mark: {},
			cache: {}
		};
		this.listeners = {};
	};

	/**
	 * fetches a resource and returns a Promise
	 * @param resource string - to be fetched
	 * @param type string - text or json
	 */
	xng.prototype.fetch = function(resource, type) {
		return new Promise(function (resolve, reject) {
			var url = _.trimEnd(this.base_route, '/') + '/' + _.trimStart(resource, '/');

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

	xng.prototype.toKey = function(str) {
		return str.replace(new RegExp('[\/\.-]', 'g'), '_');
	};

	xng.prototype.waitCache = function(cache, key) {
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

	xng.prototype.render = function (filepath, model, el, listener) {

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
							if (_.isString(listener) && listener in this.listeners) {
								this.listeners[listener]();
							}
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

	xng.prototype.put = function(html, selector) {
		document.querySelector(selector).innerHTML = html;
	};

	xng.prototype.cacheResource = function (resource, cache, res_type) {
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
	
	xng.prototype.parseDirectives = function (el) {
		return {
			model: el.getAttribute(this.attributes.model),
			template: el.getAttribute(this.attributes.view),
			listener: el.getAttribute(this.attributes.listen)
		}
	};

	xng.prototype.include = function(includes) {

		return new Promise(function (resolve, reject) {

			// count finish rendering actions
			var f_count = 0;

			// fixme: refactor to Promise.all([render_promises]) after _.forEach()
			var _render = function (directive, model, $cur) {
				this.render(directive.template, {
					xngModel: model
				}, $cur, directive.listener)
					.then(function() {
						// wait for all components to resolve this promise
						if (++f_count === includes.length) {
							resolve();
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
	xng.prototype.nl2br = function(str, is_xhtml) {
		if (_.isString(str)) {
			var breakTag = (is_xhtml || typeof is_xhtml === 'undefined') ? '<br />' : '<br>';
			return (str + '').replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1' + breakTag + '$2');
		}
		return str;
	};

	xng.prototype.assign = function (obj) {
		return _.escape(JSON.stringify(obj));
	};

	xng.prototype.readAssignment = function (obj) {
		return JSON.parse(_.unescape(obj));
	};

	/**
	 * @return Promise
	 */
	xng.prototype.xng = function () {
		return this.include(document.querySelectorAll('[' + this.attributes.view + ']'))
	};

	xng.prototype.base = function(base_dir) {
		this.base_route = base_dir;
		return this;
	};

	xng.prototype.listen = function(key, cb) {
		if (_.isObject(key) && _.isUndefined(cb)) {
			for (var k in key) {
				this.listen(k, key[k]);
			}
		} else if (_.isString(key) && _.isFunction(cb)) {
			this.listeners [key] = cb;
		}
		return this;
	};

	xng.prototype.require = function (src, attrs) {
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

	return new xng;
}();





