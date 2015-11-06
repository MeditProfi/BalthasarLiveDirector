define('rtmp_stat_parser', [
	"jquery", "json"
], function($, json){

var config;

function initImpl(conf)
{
	config = conf;
}

function parseStreamsInfo(data) {
	var streams = {};
	$(data).find("server").each(function(idx, srv) {
		var explicitAddr = $(srv).attr('addr');
		var addr = explicitAddr ? explicitAddr : (config.Client.DefaultStreamerAddr === undefined) ? document.location.hostname : config.Client.DefaultStreamerAddr;
		var srvStreams = getServerStreams(srv);
		jQuery.each(srvStreams, function(name, stream) {
			stream.url = addr + ':' + ((config.Baltasar.DefaultRTMPPort === undefined) ? "1935" : config.Baltasar.DefaultRTMPPort) + '/' + stream.app;
			stream.fullURL = _makeFullURL(stream);
			streams[stream.fullURL] = stream;
		});
	});
	return streams;
}

function _makeFullURL(stream) {
	return stream.url + '/' + stream.name;
}

function getServerStreams(srv) {
	var streams = {};
	$(srv).find("application").each(function(idx, app) {
		var appStreams = getAppStreams($(app));
		jQuery.each(appStreams, function(name, stream) {
			streams[stream.app + '/' + name] = stream;
		});
	});
	return streams;
}

function getAppStreams(app) {
	var appName = app.children("name").text();
	if(appName === undefined) /*|| isExcludedApp(appName))*/
		return {};
	return getStreamsFromApp(appName, app); 
}

/*
function isExcludedApp(appName) {
	try { 
		return (jQuery.inArray(appName, config.ExcludedApps) > -1);
	} catch(e) {
		console.log(e);
		return false;
	}
}
*/

function getStreamsFromApp(appName, app) {
	var streams = {};
	app.find("stream").each(function(idx, stream) {
		var streamInfo = parseStreamInfo(appName, stream);
		if(streamInfo === "")
			return true;
		streams[streamInfo.name] = streamInfo;
	});
	return streams;
}

function parseStreamInfo(appName, stream) {
	var streamObject = $(stream);
	if(streamObject.find("publishing").length === 0)
		return '';
	var name = streamObject.find("name").text();
	var time = streamObject.find("time").text();
	var slot = streamObject.find("slot").text();
	return {
		"time": time,
		"name": name,
		"app": appName,
		"slot": slot
	};
}

function getStreamsImpl(data)
{
	return parseStreamsInfo(data);
}

return {
	getStreams:function(data)
	{
		return getStreamsImpl(data);
	},
	
	init:function(conf)
	{
		initImpl(conf);
	}
}

});
