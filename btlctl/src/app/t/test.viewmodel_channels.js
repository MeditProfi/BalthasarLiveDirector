"use strict";
define(["jquery", "QUnit",
	"viewmodel/channels",
	"server_driver",
	"rtmp_stat_parser",
	"json!config.json",
	"json!config.rtmp.json",
	"xml!t/stat_sdi_bug.xml",
], function($, QUnit, channelsModel,
			serverDriver, rtmp,
			config_balthasar,
			config_rtmp,
			stat_test1_xml
){
	var run = function() {
		var config = {};
		$.extend( config, config_rtmp );
		$.extend( config, config_balthasar );
		rtmp.init( config );

		channelsModel.init( serverDriver, config.Baltasar.source_key_map, rtmp );

		test( "test.viewmodel_channels", function( assert ) {
		  // var streams = rtmp.getStreams( stat_test1_xml );
		  assert.deepEqual( channelsModel.list, null, "Initial channels info is null" );
		  // console.log( streams );
		});
    };
    return {run: run};
});

