(function () {
	'use strict';

	_.xng
		.base('docs/web')
		.listen({
			// "*": function (trigger, view) {
				// console.log('view: ', view.getAttribute('data-xng-view'), trigger);
			// },
			"markdown_init" : function () {
				_.xng.require('docs/vendor/tagdown.min.js', 'async');
			}
		})
		.route({
			"*": function (cur) {
				console.log('routing * at', cur);
				if ( cur !== '.') {
					$('html, body').stop().animate({
						scrollTop: 0
					});
				}
			}
		})
		.using("QueryRouter")
		// .using("HashRouter")
		.transform({
			"yml": function(str) {
				return YAML.parse(str);
			},
			"json_string": function(str) {
				return JSON.parse(str);
			}
		})
		.run()
		.then(function() {
			$('.remove-on-loaded').animate({
				opacity: 0
			}, 2000, function() {
				$('.remove-on-loaded').remove();
			});
			_.xng.require([
				'docs/web/js/creative.min.js',
				"docs/web/js/twitter.min.js",
				"https://buttons.github.io/buttons.js"
			], 'async').then(function() {
				console.log('xng totally rocks and finished rendering!');
			});
		});
})();