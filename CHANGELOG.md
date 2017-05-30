# Changelog

#v 2.0.0

#### new features
	* added data-xng-route directive
	
``` html
<div data-xng-route=".">
	<p>Welcome</p>
	<a href="#bar">goto bar</a>
</div>

<div data-xng-route="bar" >
	<p>bar</p>
</div>
``` 
 
#### incompatible changes
	* sources are now available in ./dist directory
	* development is still the ./src directory
	* method xng() has been replaced by run()
	
#### compatible changes
	* window.Xng is available in browser mode and also wrapped by umd as xng.
	* the _.xng variable is still available

