"use strict";
define(["jquery", "QUnit",
	"rtmp_stat_parser",
	"json!config.json",
	"json!config.rtmp.json",
	"xml!t/stat_sdi_bug.xml",
], function($, QUnit, rtmp, config_balthasar, config_rtmp,
			stat_test1_xml
){
	var run = function() {
		var config = {};
		$.extend( config, config_rtmp );
		$.extend( config, config_balthasar );
		rtmp.init( config );

		var stat_json1 = {
		  "192.168.189.34:1935/sdi/SDI-1": {
		    "app": "sdi",
		    "fullURL": "192.168.189.34:1935/sdi/SDI-1",
		    "name": "SDI-1",
		    "slot": "1",
		    "time": "4522746",
		    "url": "192.168.189.34:1935/sdi"
		  },
		  "192.168.189.34:1935/sdi/SDI-2": {
		    "app": "sdi",
		    "fullURL": "192.168.189.34:1935/sdi/SDI-2",
		    "name": "SDI-2",
		    "slot": "2",
		    "time": "4520098",
		    "url": "192.168.189.34:1935/sdi"
		  },
		  "192.168.189.34:1935/sdi/SDI-3": {
		    "app": "sdi",
		    "fullURL": "192.168.189.34:1935/sdi/SDI-3",
		    "name": "SDI-3",
		    "slot": "3",
		    "time": "4518458",
		    "url": "192.168.189.34:1935/sdi"
		  },
		  "192.168.189.34:1935/sdi/SDI-4": {
		    "app": "sdi",
		    "fullURL": "192.168.189.34:1935/sdi/SDI-4",
		    "name": "SDI-4",
		    "slot": "4",
		    "time": "4516682",
		    "url": "192.168.189.34:1935/sdi"
		  },
		  "192.168.189.34:1935/sdi/SDI-5@pool": {
		    "app": "sdi",
		    "fullURL": "192.168.189.34:1935/sdi/SDI-5@pool",
		    "name": "SDI-5@pool",
		    "slot": "5",
		    "time": "4444151",
		    "url": "192.168.189.34:1935/sdi"
		  },
		  "192.168.189.34:1935/sdi/SDI-6@pool": {
		    "app": "sdi",
		    "fullURL": "192.168.189.34:1935/sdi/SDI-6@pool",
		    "name": "SDI-6@pool",
		    "slot": "6",
		    "time": "2787705",
		    "url": "192.168.189.34:1935/sdi"
		  },
		  "192.168.189.34:1935/sdi/SDI-7": {
		    "app": "sdi",
		    "fullURL": "192.168.189.34:1935/sdi/SDI-7",
		    "name": "SDI-7",
		    "slot": "7",
		    "time": "6156253",
		    "url": "192.168.189.34:1935/sdi"
		  },
		  "192.168.189.34:1935/sdi/SDI-8": {
		    "app": "sdi",
		    "fullURL": "192.168.189.34:1935/sdi/SDI-8",
		    "name": "SDI-8",
		    "slot": "8",
		    "time": "6154725",
		    "url": "192.168.189.34:1935/sdi"
		  },
		  "192.168.200.11:1935/liveuspb/LN-1": {
		    "app": "liveuspb",
		    "fullURL": "192.168.200.11:1935/liveuspb/LN-1",
		    "name": "LN-1",
		    "slot": "13",
		    "time": "1824103",
		    "url": "192.168.200.11:1935/liveuspb"
		  }
		};

		test( "test.rtmp_stat_parser.stat_test1_parse", function( assert ) {
		  var streams = rtmp.getStreams( stat_test1_xml );
		  assert.deepEqual( streams, stat_json1, "stat_test1.xml parsed OK");
		  console.log( streams );
		});
    };
    return {run: run};
});

