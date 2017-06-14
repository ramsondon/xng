
// create a new transformer
var myJsonTransformer = function() {};

// get the protoype of the xng default transformer
var dtp = _.xng.defaultTransformer().prototype;

// inherit your new transformer from the default transformer
myJsonTransformer.prototype = Object.create(dtp);

// implement the doTransformation function
myJsonTransformer.prototype.doTransformation = function (str) {
	return JSON.parse(str);
};

// instead of a function you can assign your own transformer class instance.
_.xng.transform("json_string", new myJsonTransformer());

