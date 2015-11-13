"use strict";
define(["jquery", "QUnit"
], function($, QUnit) {
    var run = function() {
		test("Self test", function() {
		  ok( true, "this test is fine" );
		  var value = "hello";
		  equal( "hello", value, "We expect value to be hello" );
		});
    };
    return {run: run}
});

