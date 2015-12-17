requirejs.config({
    waitSeconds: 300
    // , urlArgs: "_ts=" + (new Date()).getTime()
    , urlArgs: "v=1.0.4"
    , shim: {
      'baltasar'          : ['jquery', 'json'],
      'jquery.cookie'     : ['jquery'],
      'jquery.blockUI'    : ['jquery', 'jquery-ui'],
      'jquery.hotkeys'    : ['jquery'],
      'jquery.ajaxmanager': ['jquery'],
      'jsrender'          : ['jquery'],
      'knockout'          : ['jquery'],
      'komapping'         : {
        'deps': ['knockout'],
        'exports': 'komapping'
      }
    }
    , paths: {
        'jquery'            : 'lib/jquery-2.0.3.min',
        'jquery-ui'         : "lib/jquery-ui.min",
        'jquery.cookie'     : 'lib/jquery.cookie',
        'jquery.ajaxmanager': 'lib/jquery.ajaxmanager',
        'jquery.hotkeys'    : 'lib/jquery.hotkeys',
        'jsrender'          : 'lib/jsrender.min',
        'knockout'          : 'lib/knockout-3.3.0',
        'komapping'         : 'lib/knockout.mapping-latest',
        'viewmodel/baltasar': 'viewmodel/baltasar',
        'viewmodel/channels': 'viewmodel/channels',
        'json'              : 'lib/json',
        'text'              : 'lib/text',
        'xml'               : 'lib/xml',
        'keycodes'          : 'lib/keycodes',
        // 'purl'              : 'lib/purl',
        'server_driver'     : 'server_driver',
        'rtmp_stat_parser'  : 'rtmp_stat_parser',
        'baltasar'          : 'baltasar'
    }
});

require(['baltasar']);
