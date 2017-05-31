# Changelog

#v 2.0.0

#### new features
	* added data-xng-route directive
	
here is an example: the "." route will be rendered at the 
beginning. if you would click on the anchor all containing 
views in the "." route container will be replaced by the "bar" route  
	
``` html
<div data-xng-route="." style="display: none">
	<a href="#bar">goto bar</a>
</div>

<div data-xng-route="bar" style="display: none">
	<p>bar</p>
</div>
``` 
	* implemented routing listeners: _.xng.route() [executable before startup]
``` javascript
_.xng.route({
	"*": function() {} 			  // triggered for all routing events
	"my/url/path": function() {}, // triggered only for domain.com/#my/url/path routing event 
});
``` 
	* implemented the "*" trigger for view listeners _.xng.listeners({})

 
 
#### incompatible changes
	* sources are now available in ./dist directory
	* development is still the ./src directory
	* method xng() has been replaced by run()
	* _.xng.base_route has been replaced by _.xng.base_remote_dir
	* replaced the xngModel variable assigned to views by $model variable
	
#### compatible changes
	* window.Xng is available in browser mode and also wrapped by umd as xng.
	* the _.xng variable is still available
	* implemented Xng.guid()

