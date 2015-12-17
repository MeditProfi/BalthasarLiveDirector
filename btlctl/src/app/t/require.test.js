"use strict";
require.config({
    baseUrl: "app",
    paths: {
        "jquery"            : "lib/jquery-2.0.3.min",
        "rtmp_stat_parser"  : "rtmp_stat_parser",
        "json"              : "lib/json",
        "text"              : "lib/text",
        "xml"               : "lib/xml",
        "jquery-ui"         : "lib/jquery-ui.min",
        "jquery.cookie"     : "lib/jquery.cookie",
        "jquery.ajaxmanager": "lib/jquery.ajaxmanager",
        "jquery.hotkeys"    : "lib/jquery.hotkeys",
        "jsrender"          : "lib/jsrender.min",
        "knockout"          : "lib/knockout-3.3.0",
        "komapping"         : "lib/knockout.mapping-latest",
        "viewmodel/baltasar": "viewmodel/baltasar",
        "viewmodel/channels": "viewmodel/channels",
        "keycodes"          : "lib/keycodes",
        "QUnit"             : "lib/qunit-1.20.0"
    },
    shim: {
       "QUnit": {
           exports: "QUnit",
           init: function() {
               QUnit.config.autoload = false;
               QUnit.config.autostart = false;
           }
       } 
    }
});

// require the unit tests.
require(["QUnit",
         "t/selfTest",
         "t/test.rtmp_stat_parser",
         "t/test.viewmodel_channels"
], function( QUnit,
             selfTest,
             rtmp_stat_parser_Test,
             channel_model_Test
){
    // run the tests.
    selfTest.run();
    rtmp_stat_parser_Test.run();
    channel_model_Test.run();
    // start QUnit.
    QUnit.load();
    QUnit.start();
});