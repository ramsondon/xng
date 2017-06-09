# Changelog

### Version 2.0.1
	
#### compatible changes
	* added jest for unit testing
	* ```_.xng.toKey()``` method is now using lodash's ```_.snakeCase()``` and ```_.escape()``` instead of a regular expression.


### Version 2.0.0

#### new features
	* added ``` data-xng-route ``` directive
	
here is an example: the ``` . ``` route will be rendered at the 
beginning. if you would click on the anchor all containing 
views in the ``` . ``` route container will be replaced by the ``` bar ``` route  
	
``` html
<div data-xng-route="." style="display: none">
	<a href="#bar">goto bar</a>
</div>

<div data-xng-route="bar" style="display: none">
	<p>bar</p>
</div>
``` 
	* implemented routing listeners: ``` _.xng.route() ``` [executable before startup]
	
``` javascript
_.xng.route({
	// triggered for all routing events
	"*": function() {}
	// triggered only for domain.com/#my/url/path routing event
	"my/url/path": function() {},  
});
``` 
	* implemented the "*" trigger for view listeners _.xng.listeners({})

 
 
#### incompatible changes
	* sources are now available in ``` ./dist ``` directory
	* development is still the ``` ./src ``` directory
	* method ``` _.xng.xng() ``` has been replaced by ``` _.xng.run() ```
	* variable ``` _.xng.base_route ``` has been replaced by ``` _.xng.base_remote_dir ```
	* replaced the xngModel variable assigned to views by $model variable
	
#### compatible changes
	* window.Xng is available in browser mode and also wrapped by umd as xng.
	* the ``` _.xng ``` variable is still available
	* implemented ``` _.xng.guid() ```
	* implemented trigger variable for method ``` _.xng.put(content, selector, trigger_name) ``` for custom triggering data-xng-listeners when asynchronously fetching resources 

