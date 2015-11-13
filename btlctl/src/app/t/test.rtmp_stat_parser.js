"use strict";
define(["jquery", "QUnit",
	"rtmp_stat_parser",
	"json!config.json",
	"json!config.rtmp.json",
	"xml!t/stat_bug.xml",
], function($, QUnit, rtmp, config_balthasar, config_rtmp,
			stat_test1_xml
){
	var run = function() {
		var config = {};
		$.extend( config, config_rtmp );
		$.extend( config, config_balthasar );
		rtmp.init( config );

		var stat_json1 = {};

		test( "test.rtmp_stat_parser.stat_test1_parse", function( assert ) {
		  var streams = rtmp.getStreams( stat_test1_xml );
		  assert.deepEqual( streams, stat_json1, "stat_test1.xml parsed OK");
		  console.log( streams );
		});
    };
    return {run: run};
});

