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

		var source_key_reverse_map = {};
		for( var k in config.Baltasar.source_key_map ) {
			source_key_reverse_map[ config.Baltasar.source_key_map[k] ] = k;
		}
		// console.log(source_key_reverse_map);
		test( "test.viewmodel_channels", function( assert ) {
		  assert.deepEqual( channelsModel.list, null, "Initial channels info is null" );

		  channelsModel.list = stat_test1_xml;
		  channelsModel.updateWrapper();

		  assert.notEqual( channelsModel.list, null, "Updated channels info is not null");

		  var keys = ["G", "H", "J", "K", "L", ";", "'", "\\" ];
		  for(var i in keys) {
		    var key = keys[i];
		    var id = source_key_reverse_map[ key ];
			var ch = channelsModel.getChannelById( id );
			assert.deepEqual( ch.active(), true, "key '" + key + "' is active");
			assert.deepEqual( ch.decklink(), id, "channel['" + key + "'] is mapped to 'DECKLICK " + id + "'");
		  }
		});
    };
    return {run: run};
});

