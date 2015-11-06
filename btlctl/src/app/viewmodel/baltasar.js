define('viewmodel/baltasar',[
"jquery",
"knockout",
"komapping",
"server_driver",
"rtmp_stat_parser",
"keycodes",
"json!config.json",
"json!config.rtmp.json",
"jsrender",
"jquery.hotkeys",
], function($, ko, komapping, serverDriver, rtmp, keyboardMap, config_balthasar, config_rtmp) {
	"use strict";
	var viewModel;
	ko.mapping = komapping;
	var config = {};
	$.extend( config, config_rtmp );
	$.extend( config, config_balthasar );

	var stream_video_delay = 13;
	var DEFAULT_INPUT_DATA = { "URL": "none", "GEOMETRY": "0 0 0 0", "STYLE": "foreground", "VISIBLE": "0", "NAME": "none", "KEY": "none" };;


	var TemplateModel = function(serverModel, data) {
		this.server   = serverModel;
		ko.mapping.fromJS(data, {}, this);
		this.img_src = ko.computed(function(){ return "app/img/" + this.name() + ".png"}, this);
	};

	var InputModel = function(serverModel, id, data) {
		if( data === undefined ) data = DEFAULT_INPUT_DATA;
		this.server   = serverModel;
		this.id       = id;
		this.refresh  = ko.observable(true);
		this.URL      = ko.observable(data["URL"]);
		this.GEOMETRY = ko.observable(data["GEOMETRY"]);
		this.STYLE    = ko.observable(data["STYLE"]);
		this.VISIBLE  = ko.observable(data["VISIBLE"]);
		this.NAME     = ko.observable(data["NAME"]);
		this.KEY      = ko.observable(data["KEY"]);

		this.geometry = ko.computed(function(){
			var refresh = this.refresh();
			var visible = (this.VISIBLE() == "1") ? true : false;
			var s = parse_GEOMETRY( visible ? this.GEOMETRY() : '' );
			return { left: (s[0]*125)+'%', top: (s[1]*125)+'%', width: (s[2]*125)+'%', height: (s[3]*125)+'%' };
		}, this);

		this.ctl_position = ko.pureComputed(function(){
			var refresh = this.refresh();
			var s = parse_GEOMETRY( this.GEOMETRY() );
			var enabled = ((s[2] > 0) && (s[3] > 0)) ? 1 : 0;
			return { left: ((enabled ? s[0] : -1)*125)+'%', top: ((enabled ? s[1] : -1)*125)+'%' };
		}, this);

		this.ctl_active = ko.computed(function(){
			var refresh = this.refresh();
			var currentinput = this.server.status ? this.server.status["CURRENTINPUT"]() : "0";
			var css = (parseInt(currentinput) == this.id) ? 'active' : '';
			// if( css ) console.log("CURRENTINPUT = " + this.server.id + ":" + this.id + " = " + currentinput);
			return css;
		}, this);

		this.name = ko.computed(function(){
			var name = this.NAME();
			if( name != "none" ) return name;
			var url = this.URL();
			if( !url ) {
				return "none";
			}
			if( url.match(/^DECKLINK \d/) ) {
				return url.replace(/^DECKLINK (\d)( delay\s\d\d?\s?)?/, 'SDI-$1');
			}
			else if( url.match(/^rtmp:.*/) ) {
				var name = url.replace(/^rtmp:.*\/(\S+)(\s.+)?/, '$1');
				if( name === '' ) name = 'disconnected';
				return name;
			}
			return url;
		}, this);

		this.update = function(o) {
			if( o.data === undefined ) o.data = DEFAULT_INPUT_DATA;
			this.URL( o.data["URL"] );
			this.GEOMETRY( o.data["GEOMETRY"] );
			if( o.data["STYLE"] === undefined ) o.data["STYLE"] = "foreground";
			this.STYLE(   o.data["STYLE"]   );
			this.VISIBLE( o.data["VISIBLE"] );
			this.NAME(    o.data["NAME"]    );
			this.KEY(     o.data["KEY"]     );
		};

		this.valueHasMutated = function() {
			this.refresh.valueHasMutated();
		};

	};

	var ServerModel = function(data) {
		var self = this;
		if( data === undefined ) data = {};
		this.id          = data.id;
		this.name        = ko.observable( data.name );
		this.templates   = ko.observableArray([]);
		this.focused     = ko.observable(false);
		this.isSwitching = ko.observable(false);

		this.status = {
						  "ONLINE"      : ko.observable(0),
						  "TOTALACTIONS": ko.observable(0),
						  "TEMPLATE"    : ko.observable(""),
						  "CURRENTINPUT": ko.observable(0),
						  "ONAIR"       : ko.observable("undefined"),
						  "NEEDDELAY"   : ko.observable(0),
						  "ACTION"      : ko.observable(1),
						  "KEYSTYLE"    : ko.observable("closed"),
						  "INPUT"       : {
							"INPUT1" : new InputModel(self, 1, DEFAULT_INPUT_DATA),
							"INPUT2" : new InputModel(self, 2, DEFAULT_INPUT_DATA),
							"INPUT3" : new InputModel(self, 3, DEFAULT_INPUT_DATA),
							"INPUT4" : new InputModel(self, 4, DEFAULT_INPUT_DATA),
						   },
						};

		this.TemplateChooseScreenActive  = ko.pureComputed(function(){
			return this.status["ONLINE"]() && (this.status['TEMPLATE']() == 'choose');
		}, this);
		this.TemplateControlScreenActive = ko.pureComputed(function(){
			return this.status["ONLINE"]() && (this.status['TEMPLATE']() != 'choose');
		}, this);
		this.TemplateOfflineScreenActive = ko.pureComputed(function(){
			return !this.status["ONLINE"]();
		}, this);

		this.currentTemplateBackgroundLayerStyle = ko.pureComputed(function(){
			// console.log("currentTemplateBackgroundLayerStyle = " + this.status["TEMPLATE"]());
			return { backgroundImage: "url(app/img/templates/"+ this.status["TEMPLATE"]() + "/bg.jpg)" };
		}, this);

		this.currentTemplateDescription = ko.pureComputed(function(){
			var name = this.status["TEMPLATE"]();
			var template = this.templates() ? ko.utils.arrayFirst(this.templates(), function (item) { return item.name() === name; }) : null;
			return template ? template.desc() : '';
		}, this);

		this.templateControlLoading = {
			"CLEAR" : ko.observable(false),
			"CUE"   : ko.observable(false),
			"TAKE"  : ko.observable(false),

			"CTL1"  : ko.observable(false),
			"CTL2"  : ko.observable(false),
			"CTL3"  : ko.observable(false),
			"CTL4"  : ko.observable(false),
			"CTL5"  : ko.observable(false),
			"CTL6"  : ko.observable(false),
		};
		this.resetTemplateControlLoading = function() {
			for( var i in this.templateControlLoading ) this.templateControlLoading[i]( false );
		};

		this.activeTemplateButtons = ko.computed(function(){
			var actions = { "1": false, "2": false, "3": false, "4": false, "5": false, "6": true };
			var name = this.status["TEMPLATE"]();
			if( name == "choose" )
				for( var i = 1; i < 7; i++ ) {
					actions[i.toString()] = ( i <= (this.templates() ? this.templates().length : 0));
				}
			else
				this.resetTemplateControlLoading();
			// console.log("activeTemplate = " + name);
			var templateModel = this.templates() ? ko.utils.arrayFirst(this.templates(), function (item) { return item.name() === name; })
			                  :                    null;
			if( templateModel ) {
				for( var action in templateModel.actions ) {
					actions[ action ] = true;
				}
			}
			return actions;
		}, this);

		this.activeTemplateActions = {
			// 1: ko.computed(function(){ var active = this.status["ACTION"]() == 1; for(var i=1;i<7;i++) this.templateControlLoading["CTL"+i]( false ); return active; }, this),
			1: ko.computed(function(){ var active = this.status["ACTION"]() == 1; if( active ) this.templateControlLoading["CTL1"]( false ); return active; }, this),
			2: ko.computed(function(){ var active = this.status["ACTION"]() == 2; if( active ) this.templateControlLoading["CTL2"]( false ); return active; }, this),
			3: ko.computed(function(){ var active = this.status["ACTION"]() == 3; if( active ) this.templateControlLoading["CTL3"]( false ); return active; }, this),
			4: ko.computed(function(){ var active = this.status["ACTION"]() == 4; if( active ) this.templateControlLoading["CTL4"]( false ); return active; }, this),
			5: ko.computed(function(){ var active = this.status["ACTION"]() == 5; if( active ) this.templateControlLoading["CTL5"]( false ); return active; }, this),
			6: ko.computed(function(){ var active = this.status["ACTION"]() == 6; if( active ) this.templateControlLoading["CTL6"]( false ); return active; }, this),
		};

		this.templateControlActive = {
			"CUE": ko.computed(function() {
				var cued = (this.status["ONAIR"]() == "cued");
				if( cued ) this.templateControlLoading["CUE"]( false );
				return cued;
			}, this),
			"TAKE": ko.computed(function() {
				var taken = (this.status["ONAIR"]() == "taken");
				if( taken ) this.templateControlLoading["TAKE"]( false );
				return taken;
			}, this),
		};

		this.serverStatus = {
			"class": ko.computed(function() {
					return (!this.status["ONLINE"]()         ) ? ''
					      :(this.status["ONAIR"]() == "cued" ) ? 'cued'
					      :(this.status["ONAIR"]() == "taken") ? 'taken'
					      :                                      undefined
					      ;
				}, this),
			"text": ko.computed(function() {
					return(!this.status["ONLINE"]()          ) ? 'OFF'
					      :(this.status["ONAIR"]() == "cued" ) ? 'CUE'
					      :(this.status["ONAIR"]() == "taken") ? 'TAKE'
					      :                                      'IDLE'
					      ;
				}, this),
		};
	};

	function ViewModel()
	{
		rtmp.init( config );
		this.version             = "1.0.3";
		this.rtmp                = rtmp;
		this.serverDriver 		 = serverDriver;
		this.inited              = ko.observable(false);
		this.versionInfo         = ko.observable("VIDI Playout BalthsarLive Director, ver. "+this.version);

		serverDriver.statusURL   = config.Baltasar.StreamsInfoAddr;
		this.source_key_map      = config.Baltasar.source_key_map;
		this.source_key_reverse_map = {};
		for( var k in config.Baltasar.source_key_map ) {
			this.source_key_reverse_map[ config.Baltasar.source_key_map[k] ] = k;
		}

		this.UI = {
			bottomActions : [ { "id": "CTL1", key: "1", name: "" },
			                  { "id": "CTL2", key: "2", name: "" },
			                  { "id": "CTL3", key: "3", name: "" },
			                  { "id": "CTL4", key: "4", name: "" },
			                  { "id": "CTL5", key: "5", name: "" },
			                  { "id": "CTL6", key: "6", name: "A&harr;B" },
			                ],
			rightActions  : [ { "id": "CLEAR", key: "backspace", name: "clear", img: "app/img/clean.png"},
			                  { "id": "CUE",   key: "F4",        name: "cue",   img: "app/img/cue.png"},
			                  { "id": "TAKE",  key: "пробел",    name: "take",  img: "app/img/take.png"},
			                ],
			exitActions   : [ { "id": "EXIT",  key: "ESC",       name: "выход", img: "app/img/exit.png"}],
			inputs        : [
			                  { key: "&lt;",      name: "input4", id: "INPUT4", },
			                  { key: "M",         name: "input3", id: "INPUT3", },
			                  { key: "N",         name: "input2", id: "INPUT2", },
			                  { key: "B",         name: "input1", id: "INPUT1", },
			                ],
		};

		this.channels = new Channels( this.serverDriver, config.Baltasar.source_key_map );
	}

	ViewModel.prototype = {
		init: function()
		{
			$('#inputs').html( $('<div>').append($('#tmplAvailableInputsNode').render( this )).html()  );
			$('#serverStatusNode').html( $('<div>').append($('#tmplServerStatusNode').render( this )).html() );
			$('#serverControlNode').html( $('<div>').append($('#tmplServerCtlNode').render( this )).html() );


			this.serverDriver.getTemplateEngines($.proxy(function(data){
				var servers = [];
				for( var i in data ) {
					console.log("getTemplateEngines OK : server " + i + " : " + data[i].id);
					var model = new ServerModel(data[i]);
					if( i == 0 ) model.focused(true);
					servers.push( model );
				}
				this.servers = ko.observableArray(servers);

				this.serverDriver.getTemplates($.proxy(function(data){
					for( var id in data ) {
						var server = this.getServerById(id);
						ko.mapping.fromJS(
							data[id].templates,
							{ "create": function(o) {
									return new TemplateModel(server, o.data);
							}},
							server.templates
						);
					}

					this.serverDriver.getStatus($.proxy(function(data){
						for( var id in data ) {
							console.log("getStatus OK : status " + id);
							var server = this.getServerById(id);
							for( var tkey in data[id] ) {
								if( server.status[tkey] === undefined ) continue;
								if( tkey == "INPUT" ) {
									if( !data[id][tkey] ) data[id][tkey] = {};
									for( var j = 1; j < 5; j++ )
									  if( data[id][tkey]["INPUT"+j] === undefined ) data[id][tkey]["INPUT"+j] = DEFAULT_INPUT_DATA;
									ko.mapping.fromJS( data[id][tkey], server.status[tkey] );
								}
								else if( tkey == "CURRENTINPUT" )
								{
									if( data[id][tkey] == server.status[tkey]() ) continue;

									server.status[tkey]( data[id][tkey] );
									for( var k in server.status['INPUT'] )
										server.status['INPUT'][k].valueHasMutated();
								}
								else
									server.status[tkey]( data[id][tkey] );
							}

							server.ctrl_images = {
								"ctl1": ko.computed(function(){
									return "app/img/templates/"+this.status["TEMPLATE"]()+"/F1.png";
								}, server),
								"ctl2": ko.computed(function(){
									return "app/img/templates/"+this.status["TEMPLATE"]()+"/F2.png";
								}, server),
								"ctl3": ko.computed(function(){
									return "app/img/templates/"+this.status["TEMPLATE"]()+"/F3.png";
								}, server),
								"ctl4": ko.computed(function(){
									return "app/img/templates/"+this.status["TEMPLATE"]()+"/F4.png";
								}, server),
								"ctl5": ko.computed(function(){
									return "app/img/templates/"+this.status["TEMPLATE"]()+"/F5.png";
								}, server),
								"ctl6": ko.computed(function(){
									return "app/img/templates/"+this.status["TEMPLATE"]()+"/F6.png";
								}, server)
							};

						}
						// console.log("before applyBindings");
						ko.applyBindings(this);

						this.attachKeyboardHanlders();

						this.inited(true);

						setInterval($.proxy(function() {
							this.serverDriver.getStatus(
								$.proxy(this.updateServersStatusSuccess, this),
								$.proxy(this.updateServersStatusError, this)
							);
						}, this),
						config.Baltasar.channels_update_interval || 1000
						);

					}, this), $.proxy(function(err){ console.log('error: ' + err);},this));
				}, this), $.proxy(function(err){ console.log('error: ' + err);},this));
			}, this), $.proxy(function(err){ console.log('error: ' + err);},this));

			var self = this;
			this.channels.update( $.proxy( self.availableInputsUpdated, self) );
			setInterval(function() {
			    self.channels.update( $.proxy(self.availableInputsUpdated, self) );
			  },
			  config.Baltasar.sources_update_interval || 5000
			);

		},

		getServerById: function(id) {
			return ko.utils.arrayFirst(this.servers(), function (item) { return item.id === id; })
		},
		getFocusedServer: function() {
			return ko.utils.arrayFirst(this.servers(), function (item) { return item.focused(); })
		},

		availableInputsUpdated: function( error, data ) { 
			// console.log("availableInputsNode( " + data + " )");
			// this.availableInputsNode( data );	
		},

		updateServersStatusSuccess: function(data) {
			for( var id in data ) {
				// console.log("getStatus OK : status " + id);
				var server = this.getServerById( id );
				if( server ) {
					for( var tkey in data[id] ) {
						if( server.status[tkey] === undefined ) continue;
						if( tkey == "INPUT" ) {
							if( !data[id][tkey] ) data[id][tkey] = {};
							for( var j = 1; j < 5; j++ )
							  if( data[id][tkey]["INPUT"+j] === undefined ) data[id][tkey]["INPUT"+j] = DEFAULT_INPUT_DATA;
							ko.mapping.fromJS( data[id][tkey], server.status[tkey] );
							server.isSwitching(false);
						}
						else if( tkey == "CURRENTINPUT" )
						{
							if( data[id][tkey] == server.status[tkey]() ) continue;

							server.status[tkey]( data[id][tkey] );
							for( var k in server.status['INPUT'] )
								server.status['INPUT'][k].valueHasMutated();
						}
						else
							server.status[tkey]( data[id][tkey] );
					}
				}
			}
		},
		updateServersStatusError: function(error) {
			console.log("updateServersStatusError : " + error.statusText);
		},

		attachKeyboardHanlders: function() {
			$(document).on('keydown', $.proxy( function(e) { return this.onKeyDown(e); }, this));
		},

		asyncServerRequestSuccess: function(result, arg){
			console.log("asyncServerRequest result = " + JSON.stringify( result ));
			if( arg != 'TAKE' && arg != 'CUE' && this.templateControlLoading[arg] )
				setTimeout($.proxy(function(){ this.templateControlLoading[arg]( false ) }, this), 1000);
		},
		asyncServerRequestError: function(error, arg){
			console.log("asyncServerRequest error = " + error.statusText);
			if( arg && this.templateControlLoading[arg] ) this.templateControlLoading[arg]( false );
		},

		onKeyDown: function(e) {
			var key = e.keyCode;
			var KEY = keyboardMap[e.keyCode];
			var modifier = e.metaKey || e.altKey;
			var handled = false;
			var server = this.getFocusedServer();
			var data = { "id": server.id };

			if( !modifier && KEY === 'TAB' )
			{
				// console.log("viewModel.onKeyDown( " + KEY + " ) == CONTROL KEY");
				for( var i in this.servers() ) {
					var server = this.servers()[i];
					server.focused( !server.focused() ) ;
				}
				handled = true;
			}
			else if( !modifier && !e.ctrlKey && this.source_key_reverse_map[ KEY ] )
			{
				// console.log("viewModel.onKeyDown( " + KEY + " ) == SOURCE KEY");
				var input_id = this.source_key_reverse_map[ KEY ];
				var channel = this.channels.getChannelById( input_id );
				var active_input = server.status["CURRENTINPUT"]();
				if( channel.active() ) {
					// var data = { "id": server.id, "name": getStreamNameBySlot(input_id).replace(/\\/,'\\\\\\\\'), "shortcut": KEY.replace(/\\/,'\\\\\\\\') };
					var data = { "id": server.id, "name": getStreamNameBySlot(input_id), "shortcut": KEY };
					if( channel.decklink ) {
						var decklink = channel.decklink();
						if (decklink >= 5) decklink -= 4;
						var input = "DECKLINK " + decklink
						data.input = input;
					}
					else if( channel.stream ) {
						var input = do_url_mapping(channel.stream());
						if (input.indexOf("rtmp://") != 0) input = "rtmp://" + input;
						data.input = input;
						var params = get_rtmp_params(input);
						if( params ) data.input += " " + params;
					}
					data.delay = stream_video_delay;
					console.log("viewModel.onKeyDown( " + KEY + " ) == SOURCE KEY (ACTIVE) => server " + server.id
						         + " => INPUT("+active_input+") = " + data.input
						       );
					this.serverDriver.setInput( data, function(result){
						console.log("setInput result = " + JSON.stringify( result ));
					}, function(error){
						console.log("setInput error = " + error.statusText);
					});
				}
				handled = true;
			}
			else if( !modifier && !e.ctrlKey && (
					KEY === 'B' || KEY === 'N' || KEY === 'M' || KEY === ',')
			) { // Set current input
				console.log("viewModel.onKeyDown( " + KEY + " ) == SET CURRENTINPUT = " + KEY + " => server " + server.id);
				switch(KEY)
				{
					case 'B': data.input = 1; break;
					case 'N': data.input = 2; break;
					case 'M': data.input = 3; break;
					case ',': data.input = 4; break;
				}
				this.serverDriver.setActiveInput( data, function(result){
					console.log("setActiveInput result = " + JSON.stringify( result ));
				}, function(error){
					console.log("setActiveInput error = " + error.statusText);
				});
				handled = true;
			}
			else if( !modifier && !e.ctrlKey && KEY === 'BACK_SPACE' ) // CLEAR
			{
				console.log("viewModel.onKeyDown( " + KEY + " ) == CLEAR => server " + server.id);

				server.templateControlLoading['CLEAR']( true );
				this.serverDriver.CLEAR( data, 'CLEAR', $.proxy(this.asyncServerRequestSuccess, server), $.proxy(this.asyncServerRequestError, server) );

				handled = true;
			}
			else if( !modifier && !e.ctrlKey && KEY === 'F4' ) // CUE
			{
				console.log("viewModel.onKeyDown( " + KEY + " ) == CUE => server " + server.id);

				if( server.status['ONAIR']() != 'cued' ) server.templateControlLoading['CUE']( true );

				this.serverDriver.CUE( data, 'CUE', $.proxy(this.asyncServerRequestSuccess, server), $.proxy(this.asyncServerRequestError, server) );

				handled = true;
			}
			else if( !modifier && KEY === 'SPACE' ) // TAKE
			{
				console.log("viewModel.onKeyDown( " + KEY + " ) == TAKE => server " + server.id);
				var ctrlKey = !!e.ctrlKey;
				if( server.status['ONAIR']() != 'taken' ) server.templateControlLoading['TAKE']( true );
				if( ctrlKey ) data.ctrlKey = ctrlKey;
				this.serverDriver.TAKE( data, 'TAKE', $.proxy(this.asyncServerRequestSuccess, server), $.proxy(this.asyncServerRequestError, server) );

				handled = true;
			}
			else if( !modifier && KEY === 'ESCAPE' ) // EXIT
			{
				console.log("viewModel.onKeyDown( " + KEY + " ) == EXIT => server " + server.id);

				this.serverDriver.EXIT( data, function(result){
					console.log("EXIT result = " + JSON.stringify( result ));
				}, function(error){
					console.log("EXIT error = " + error.statusText);
				});

				handled = true;
			}
			else if( !e.metaKey && key > 48 && key < 55 ) // 1 ... 6
			{
				data["transit"] = !!e.ctrlKey;
				var active = server.activeTemplateButtons();
				var action = (key-48);
				if( action <= server.status.TOTALACTIONS() && active[KEY] )
				{
					data["action"] = action;
					console.log("viewModel.onKeyDown( " + KEY + " ) == CTL"+action+" => server " + server.id);
					if( action != server.status.ACTION() || server.isSwitching() ) server.templateControlLoading['CTL'+action]( true );
					this.serverDriver.setCTL( data, "CTL"+action, $.proxy(this.asyncServerRequestSuccess, server), $.proxy(this.asyncServerRequestError, server) );
					server.isSwitching(true);
				}
				else if( action == 6 )
				{
					console.log("viewModel.onKeyDown( " + KEY + " ) == SWITCH => server " + server.id + " transit = " + data["transit"]);
					server.templateControlLoading['CTL6']( true );
					this.serverDriver.SWITCH( data, 'CTL6', $.proxy(this.asyncServerRequestSuccess, server), $.proxy(this.asyncServerRequestError, server) );
				}
				handled = true;
			}
			else
			{
				// console.log("viewModel.onKeyDown( " + key + ", " + KEY + " )");
				handled = false;
			}
			if( handled ) event.preventDefault();
			return true;
		}

	};

	//streams interface=========================================================================
    function Channels(driver, source_key_map) {
		var self = this;
		this.list = null;
		this.serverDriver = driver;

		this.channelsList = { green: [], orange: [], gray: [] };
		for(var key in source_key_map) {
			var i = parseInt(key);
			if (i <= 8) //sdi
				this.channelsList.green.push({  "i": i, "key": source_key_map[key], "active": false, "decklink": 0 });
			else if ((i >= 9) && (i <= 12)) // pool
				this.channelsList.orange.push({ "i": i, "key": source_key_map[key], "active": false, "stream": ""  });
			else 	//live
				this.channelsList.gray.push({   "i": i, "key": source_key_map[key], "active": false, "stream": ""  });
		}
		for( var key in this.channelsList )
			this.channelsList[key] = ko.mapping.fromJS( this.channelsList[key] );
    }
    Channels.prototype = {
		updateWrapper: function(){
			if (!this.list) return;
			var streams = rtmp.getStreams(this.list);
			for( var app in this.channelsList ) {
				for( var ch in this.channelsList[app]() ) {
					var channel = this.channelsList[app]()[ch];
					var active = null;
					for( var url in streams ) {
						if( parseInt(streams[url].slot) != channel.i() ) continue;
						active = streams[url];
						break;
					}
					if( active ) {
						// console.log( active.url + " active");
						channel.active( true );
						if( active.app == "sdi" ) {
							var decklink = active.name.replace("SDI-", "");
							channel.decklink( decklink );
						}
						else {
							channel.stream( active.fullURL );
						}
					}
					else {
						channel.active( false );
						channel.stream( "" );
					}
				}
			}
		},
		update: function(cb){
			// console.log("Channels.update()");
			var self = this;
			this.serverDriver.getAvailableInputsList( $.proxy(
				function(data){
					this.list = data;
					cb(null, data);
					self.updateWrapper();

				}, this),
				function(jxhr, err){
					cb(500, err);
				}
			);
		},
		getChannelById: function(id) {
			var channel = undefined;
			for( var app in this.channelsList ) {
				for( var ch in this.channelsList[app]() ) {
					var chnl = this.channelsList[app]()[ch];
					if( chnl.i() != id ) continue;
					channel = chnl;
					break;
				}
				if( channel ) break;
			}
			return channel;
		},
    };


	function parse_GEOMETRY(str){
		var parts = str.split(" ");
		if (parts.length != 4) return [ -1.0, -1.0, 0.0, 0.0 ];
		var x = parseFloat(parts[0]); var y = parseFloat(parts[1]);
		var w = parseFloat(parts[2]); var h = parseFloat(parts[3]);
		return [ x, y, w, h ];
	}

	function do_url_mapping(stream) {
		var res = stream;
		$.each(config.Servers, function(addr, server) {
			if (server.RelayAddr)
				res = res.replace(addr, server.RelayAddr);
		});
		return res;
	}

	function get_rtmp_params(url) {
		var res = config.Baltasar.rtmp_params_default;
		$.each(config.Baltasar.rtmp_params_map, function(type, prms) {
			if (url.indexOf(type) >= 0)
				res = prms;
		});
		return res;
	}

	function getStreamNameBySlot(id) {
		var brk = false;
		var result;
		$.each(config.Zones, function(nomatter, zone){
			if (brk) return false;
			$.each(zone.Slots, function(i, slot) {
				if (slot.Pos == id) 
				{
					result = slot.Name;
					brk = true;
					return false;
				}
			});
		});
		return result;
	}


	viewModel = new ViewModel();
	return viewModel;
});
