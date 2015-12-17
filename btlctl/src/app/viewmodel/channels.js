define('viewmodel/channels',[
"jquery",
"knockout",
"komapping",
], function($, ko, komapping) {
	"use strict";
	var channelsModel;
	ko.mapping = komapping;

    function Channels() {
		var self = this;
		this.list = null;
		this.serverDriver = null;
		this.channelsList = { green: [], orange: [], gray: [] };
		this.rtmp = null;
    }

	Channels.prototype = {
		init: function(driver, source_key_map, rtmp){
			this.serverDriver = driver;

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

			this.rtmp = rtmp;
			return this;
		},

		updateWrapper: function(){
			if (!this.list) return;
			var streams = this.rtmp.getStreams(this.list);
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
							decklink = decklink.replace(/@[\w\d]*$/, "");
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

	channelsModel = new Channels();
	return channelsModel;
});
