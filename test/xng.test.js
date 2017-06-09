// const _ = require('./lodash');
const factory = require('./../dist/xng');
var xng = new factory();

test('test toKey: "./-"', () => {
	expect(xng.toKey('hello.world/foo-bar')).toBe('hello_world_foo_bar');
});