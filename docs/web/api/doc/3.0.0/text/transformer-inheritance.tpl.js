
// create a new Transformer
var myJsonTransformer = function() {};

// inherit of the default Transformer
myJsonTransformer.prototype = Object.create(_.xng.defaultTransformer().prototype);

// implement the doTransformation function
myJsonTransformer.prototype.doTransformation = function (str) {
	return JSON.parse(str);
};

// instead of a function you can assign your own Transformer class.
_.xng.transform("json_string", new myJsonTransformer());

