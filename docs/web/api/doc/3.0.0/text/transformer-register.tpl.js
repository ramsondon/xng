
// register a transformer function
_.xng.transform("json_string", function(str) {
	return JSON.parse(str);
});

// register multiple transformer functions
_.xng.transform({
	"json_string" : function(str) {
		return JSON.parse(str);
	}
});
