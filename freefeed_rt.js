"use strict";
define("RtUpdate", ["./rt_actions", "./utils"], function(RtHandler, utils){
var RtUpdate = function (context, bump){
	var rt = this;
	Object.keys(rt.defaults).forEach(function(key){
		rt[key] = JSON.parse(JSON.stringify(rt.defaults[key]));
	});
	rt.context = context;
	rt.handlers = new RtHandler(bump);
}
RtUpdate.prototype = {
	  constructor: RtUpdate
	, defaults:{
		 on: false
		, timeout: 60000
		, pingInterval: null
		, pingTimeout: null
		, wSocket: null
		, ready: null
		, subscriptions:[] 
		, handlers: {}
		, callback: null
	}
	, connect: function(){
		var rt = this;
		rt.ready = new utils._Promise(function(resolve,reject){
			var cfg = gConfig.domains[rt.context.domain];
			var oReq = new XMLHttpRequest();
			clearTimeout(rt.pingTimeout);

			rt.pingTimeout = null;
			oReq.onload = function (){
				if(oReq.status < 400){
					var res = JSON.parse(oReq.response.slice(oReq.response.indexOf("{")));
					rt.wSocket = new WebSocket(cfg.server.rtURL.replace("https","wss")+"?token="+rt.context.token+"&transport=websocket&sid=" + res.sid)
					rt.wSocket.onopen = function(){
						rt.wSocket.send("2probe"); 
						rt.wSocket.onmessage = function(e){
							if(e.data == "3probe")rt.wSocket.send("5");
							rt.on = true;
							rt.timeout = res.pingTimeout;
							rt.pingInterval = setInterval(function (){rt.ping();}, res.pingInterval);
							rt.wSocket.onmessage = null;
							rt.callback =  function (e){rt.message(e)};
							rt.wSocket.addEventListener("message",rt.callback);
							resolve(); 
						};
					};
				} else {
					clearTimeout(rt.pingTimeout);
					rt.pingTimeout = setTimeout(rt.reconnect, rt.timeout, rt);
					reject();
				}
			}
			oReq.open("get",cfg.server.rtURL+"?token="+rt.context.token+"&transport=polling&t="+Date.now(), true);
			oReq.send();	
		});
		return rt.ready;
	}
	, close: function(){
		var rt = this;
		if(rt.callback)		
			rt.wSocket.removeEventListener("message", rt.callback);
		try{
			clearInterval(rt.pingInterval);
			rt.wSocket.close();	
		}catch(e){};
	}
	, ping: function (){
		var rt = this;
		rt.wSocket.send("2");
		rt.gotPing = false;
		if(!rt.pingTimeout) rt.pingTimeout = setTimeout(rt.reconnect, rt.timeout, rt);
	}
	, reconnect: function (rt){
		rt.close();
		rt.connect().then(function(){rt.subscribe();});
	}
	, message: function(msg){
		var rt = this;
		if (msg.data == "3"){
			clearTimeout(rt.pingTimeout);
			rt.pingTimeout = null;
			return;
		}
		var idxPayload = msg.data.indexOf("[");
		if (idxPayload == -1) return;
		var type = msg.data.slice(0,idxPayload);
		var data = rt.context.api.parse(msg.data.slice(idxPayload));
		if (Array.isArray(data) &&  (typeof rt.handlers[data[0]] !== "undefined")) rt.handlers[data[0]](data[1], rt.context);
	}
	, subscribe: function (timeline){
		var rt = this;
		function sendSubReq(sub){
			var req = "42"+JSON.stringify(["subscribe", sub]);
			console.log("RT:"+req);
			rt.wSocket.send(req);
		}
		if(!rt.ready)rt.ready = rt.connect();
		if (typeof timeline === "undefined") 
			rt.ready.then(function(){rt.subscriptions.forEach(sendSubReq);});
		else{
			rt.subscriptions.push(timeline);
			rt.ready.then(function(){sendSubReq(timeline);});
		}
	}
	,"rtSubUser": function(id){
		var context = this.context;
		var rt = (typeof context.miscRts[id] !== "undefined")? context.miscRts[id]
			: new RtUpdate(context, false, context.logins[id].token);
		rt.subscribe({"user":[id]});
		context.miscRts[id]  = rt;
	}
	,"rtSubPost": function(data){
		this.subscribe({"post":[data.posts.id]});
	}
	,"rtSubTimeline": function(data){
		var cView = this.context.cView;
		var query = "";
		var homeMode = cView.localStorage.getItem("friends-view");
		if ((data.timelines.name == "RiverOfNews") && (typeof homeMode == "string" ))
			query = "?homefeed-mode=" + homeMode; 
		this.subscribe({"timeline":[data.timelines.id+query]});
	}
} 
return RtUpdate;
});

