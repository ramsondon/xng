(function () {
	'use strict';

	_.xng
		.base('docs/web')
		.listen({
			"contact": function () {
				_.xng.require("docs/web/js/twitter.min.js")
					.then(function (src) {
						console.log(src + ' downloaded');
					});
				_.xng.require("https://buttons.github.io/buttons.js")
					.then(function (src) {
						console.log(src + ' downloaded');
					});
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
		.run()
		.then(function() {
			_.xng.require('docs/web/js/creative.min.js').then(function() {
				console.log('xng totally rocks and finished rendering!');
			});
		});

})();