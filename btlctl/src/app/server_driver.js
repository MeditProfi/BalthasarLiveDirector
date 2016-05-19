define("server_driver", [
"jquery",
"jquery.ajaxmanager"
], function($) {
	"use strict";
    var serverDriver;

	window.ServerDriver = function () {
		// this.clientType = 'NLE';
		this.url = location.pathname + 'btlctl.fpl';
	}

    ServerDriver.prototype = {
    	getBrowserUrl: function() {

    	},

		getUserAttributes: function(url, ticket, okCallback, errorCallback) {
			this.qGetUserAttributes(url, { 'ticket': ticket },
				okCallback, errorCallback
			);
		},

		getAvailableInputsList: function(okCallback, errorCallback) {
			var statusUrl = this.statusURL !== undefined ? this.statusURL : this.location.pathname + 'stat';
			this.send_async( 'stat', undefined, statusUrl, function(data){
					// console.log("ServerDriver.getAvailableInputsList OK: " + data);
					okCallback( data );
				}, function(error){
					var err = error ? (error.status+' ('+error.statusText+')') : 'Network Error';
					console.log("ServerDriver.getAvailableInputsList error: " + err);
					errorCallback(err);
				});
		},

		getTemplateEngines: function(okCallback, errorCallback) {
			return this.query('getTemplateEngines', {}, okCallback, errorCallback );
		},

		getTemplates: function(okCallback, errorCallback) {
			return this.query('getTemplates', {}, okCallback, errorCallback );
		},

		getStatus: function(okCallback, errorCallback) {
			return this.query('getStatus', {}, okCallback, errorCallback );
		},

		setCTL: function(data, handlerArg, okCallback, errorCallback) {
			return this.query('setCTL', data, okCallback, errorCallback, handlerArg );
		},

		setInput: function(data, okCallback, errorCallback) {
			return this.query('setInput', data, okCallback, errorCallback );
		},
		setActiveInput: function(data, okCallback, errorCallback) {
			return this.query('setActiveInput', data, okCallback, errorCallback );
		},

		CLEAR: function(data, handlerArg, okCallback, errorCallback) {
			return this.query('CLEAR', data, okCallback, errorCallback, handlerArg );
		},
		CUE: function(data, handlerArg, okCallback, errorCallback) {
			return this.query('CUE', data, okCallback, errorCallback, handlerArg );
		},
		TAKE: function(data, handlerArg, okCallback, errorCallback) {
			return this.query('TAKE', data, okCallback, errorCallback, handlerArg );
		},
		EXIT: function(data, handlerArg, okCallback, errorCallback) {
			return this.query('EXIT', data, okCallback, errorCallback, handlerArg );
		},
		SWITCH: function(data, handlerArg, okCallback, errorCallback) {
			return this.query('SWITCH', data, okCallback, errorCallback, handlerArg );
		},
		// okCallback = function(reply), errorCallback = function(errorId)
		query: function(cmd, params, okCallback, errorCallback, handlerArg) {
			$.extend(params, { 'cmd': cmd });
			this.send_async( 'btlctl', params, this.url, function(data, arg){
					var obj = $.parseJSON( data );
					okCallback( obj, arg );
				},
				errorCallback,
				undefined,
				handlerArg
			);
		},

		send_async: function(queue, data, url, onload_handler, error_handler, abort_handler, handler_argument) {
			var self = this;
			$.manageAjax.add(queue, {
				'statusCode': {
					504: function(error) {
						return error_handler(error, handler_argument);
					}
				},
				'success': function(result) { if( typeof onload_handler === 'function' ) return onload_handler(result, handler_argument); },
				'error'  : function(error)  { if( typeof error_handler === 'function'  ) return error_handler(error, handler_argument);   },
				'abort'  : function(context){ if( typeof abort_handler === 'function ' ) return abort_handler(context, handler_argument); },
				'complete' : function(xhr, textStatus) {
			        if( xhr.status.toString()[0] == '3' ){
				        top.location.href = xhr.getResponseHeader('Location');
				    }
				},
				'type'    : "GET",
				'url'     : url,
				'data'    : data
			});
		},

	};

	serverDriver = new ServerDriver();
	return serverDriver;
});