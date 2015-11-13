"use strict";
require.config({
    baseUrl: "app",
    paths: {
        "jquery"            : "lib/jquery-2.0.3.min",
        "rtmp_stat_parser"  : "rtmp_stat_parser",
        "json"              : "lib/json",
        "text"              : "lib/text",
        "xml"               : "lib/xml",
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
         "t/test.rtmp_stat_parser"
], function( QUnit,
             selfTest,
             rtmp_stat_parser_Test
){
    // run the tests.
    selfTest.run();
    rtmp_stat_parser_Test.run();
    // start QUnit.
    QUnit.load();
    QUnit.start();
});