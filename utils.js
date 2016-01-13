"use strict";
define("Utils", [], function(){
function _Utils(view){
	this.cView = view;
};
function args2Arr() {
	//.length is just an integer, this doesn't leak
	//the arguments object itself
	var args = new Array(arguments.length);
	for(var i = 0; i < args.length; ++i) {
	//i is always valid index in the arguments object
		args[i] = arguments[i];
	}
	return args;
}
_Utils.prototype = {
	constructor:_Utils
	/*source: http://stackoverflow.com/a/7516652 */
	,"relative_time": function(date) {
		var cView = this.cView;
	/*	if (!date_str) {return;}
		//date_str = $.trim(date_str);
		date_str = date_str.replace(/\.\d\d\d+/,""); // remove the milliseconds
		date_str = date_str.replace(/-/,"/").replace(/-/,"/"); //substitute - with /
		date_str = date_str.replace(/T/," ").replace(/Z/," UTC"); //remove T and substitute Z with UTC
		date_str = date_str.replace(/([\+\-]\d\d)\:?(\d\d)/," $1$2"); // +08:00 -> +0800*/
		var parsed_date = new Date(date);
		var relative_to = (arguments.length > 1) ? arguments[1] : new Date(); //defines relative to what ..default is now
		var delta = parseInt((relative_to.getTime()-parsed_date)/1000);
		delta=(delta<2)?2:delta;
		var r = '';
		if (delta < 60) {
			r = delta + ' seconds ago';
		} else if(delta < 120) {
			r = 'a minute ago';
		} else if(delta < (45*60)) {
			r = (parseInt(delta / 60, 10)).toString() + ' minutes ago';
		} else if(delta < (2*60*60)) {
			r = 'an hour ago';
		} else if(delta < (24*60*60)) {
			r = '' + (parseInt(delta / 3600, 10)).toString() + ' hours ago';
		} else if(delta < (48*60*60)) {
			r = 'a day ago';
		} else if (delta < (24*60*60*30)) {
			r = (parseInt(delta / 86400, 10)).toString() + ' days ago';
		} else{
			r = (parseInt(delta / 2592000, 10)).toString() + ' months ago';
		}
		return 'about ' + r;
	}
	/**********************************************/
	,"args2Arr": function(){return args2Arr.apply(this,arguments);}
	,"ffReq": function(o, callback, fail ){
		fail = typeof fail !== "undefined" ? fail : function(){return;};
		var method = typeof o.method  !== "undefined"? o.method : "get";
		var oReq = new XMLHttpRequest();
		oReq.open(method ,o.url , true);
		if(typeof o.token !== "undefined" )
			oReq.setRequestHeader("X-Authentication-Token",o.token);
		oReq.onload = function(){
			if(oReq.status < 400) callback(oReq.response);
			else fail();
		}
		if (typeof o.data  !== "undefined")  oReq.send(data);
		else  oReq.send();
	}
	,"setCookie": function(name, data){
		var cView = this.cView;
		//var hostname = window.location.hostname.split(".");
		//hostname.reverse();

		cView.doc.cookie = name
			+"="+data
			+";expires=" + new Date(Date.now()+3600000*24*365).toUTCString()
		//	+"; domain="+ hostname[1] + "." + hostname[0] 
			+"; path=/"
			+";secure";
	}
	,"getCookie": function(name){
		var cView = this.cView;
		var arrCookies = cView.doc.cookie.split(";");
		var res;
		arrCookies.some(function(c){
			var cookie = c.split("=");
			if(cookie[0].trim() == name ){
				res = decodeURIComponent(cookie[1]);
				return true;
			}
		});
		return res;
	}
	,"deleteCookie": function(name){
		var cView = this.cView;
		var hostname = window.location.hostname.split(".");
		hostname.reverse();
		var cookie = name
			+"=;expires=" + new Date(0).toUTCString()
			+"; domain="+ hostname[1] + "." + hostname[0]
			+"; path=/";
		cView.doc.cookie = cookie; 
		cookie = name
			+"=;expires=" + new Date(0).toUTCString()
			+"; path=/";
		cView.doc.cookie = cookie; 
	}
	,"setChild": function (node,name, newNode){
		if(typeof node.cNodes === "undefined")
			node.cNodes = new Object();
		if(typeof node.cNodes[name] !== "undefined") 
			node.replaceChild(newNode, node.cNodes[name]);
		else node.appendChild(newNode);
		node.cNodes[name] = newNode;
		return newNode;
	}
	,"addUser": function(user){
		var cView = this.cView;
		if (typeof cView.gUsers[user.id] !== "undefined" ) return;
		var className = "not-my-link";
		var userTitle;
		if(typeof user.isPrivate !== "undefined")user.isPrivate = JSON.parse(user.isPrivate);
		if (cView.mode == null) cView.mode = "screen";
		switch(cView.mode){
		case "screen":
			userTitle  = user.screenName;
			break;
		case "screen_u":
			if(user.screenName != user.username)
				userTitle  = user.screenName + " <div class=username>(" + user.username + ")</div>";
			else userTitle  = "<div class=username>"+user.username+"</div>";
			break;
		case "username":
			userTitle  = "<div class=username>"+user.username+"</div>";
		}
		if(typeof cView.logins[user.id] !== "undefined"){
			user.my = true;
			className = "my-link-"+user.id;
		}else{
			user.my = false;
			className = "not-my-link";
		}
		user.link = '<a class="'+className+'" href="' + gConfig.front+ user.username+'">'
		+ userTitle
		+"</a>";
		if(!user.profilePictureMediumUrl)user.profilePictureMediumUrl = gConfig.static+ "default-userpic-48.png";
		user.friend = false;
		user.subscriber = false;
		cView.gUsers[user.id] = user;
		cView.gUsers.byName[user.username] = user;
	}
	,"genNodes": function (templates){
		var cView = this.cView;
		var nodes = new Array();
		//oTemplates = JSON.parse(templates);
		templates.forEach(function(template) {
			if (!template.t)template.t = "div";
			var node = cView.doc.createElement(template.t);
			node.cloneAll = function(){
				var newNode = this.cloneNode(true);
				genCNodes(newNode, this);
				return newNode;
			};
			if(template.c)node.className = template.c;
			if(template.children)
			cView.Utils.genNodes(template.children).forEach(function(victim){
				node.appendChild(victim);
			});
			if(template.txt) node.innerHTML = template.txt;
			if(template.e) node.e = template.e;
			if(template.p) for( var p in template.p) node[p] =  template.p[p];
			nodes.push(node);
		} );
		return nodes;
		function genCNodes(node, proto){
			node.cNodes = new Object();
			node.getNode = function(){
				var args = args2Arr.apply(this,arguments);
				args.unshift(node);
				return cView.Utils.getNode.apply(node, args);
			};
			for(var idx = 0; idx <  node.childNodes.length; idx++){
				genCNodes(node.childNodes[idx], proto.childNodes[idx]);
				node.cNodes[node.childNodes[idx].className] = node.childNodes[idx];
			}
			if (typeof proto.e  == "undefined"  ) return;
			Object.keys(proto.e).forEach(function(evt){
				var action = proto.e[evt];
				node.addEventListener(evt,cView[action[0]][action[1]]);
			});
		}
	}
	,"refreshLogin": function(id){
		var cView = this.cView;
		cView.localStorage.setItem("gMe",JSON.stringify(cView.logins));
		if((typeof cView.gUsers[id] !== "undefined") && Array.isArray(cView.gUsers[id].subscriptionRequests))
			cView.subReqsCount -= cView.gUsers[id].subscriptionRequests.length;
		delete cView.gUsers[id];
		var user = cView.logins[id].data.users;
		cView.Utils.addUser(user);
		var links = cView.doc.getElementsByClassName("my-link-" + id);
		for(var idx = 0; idx< links.length; idx++)
			links[idx].outerHTML = user.link;
		var login = cView.logins[id].data;
		login.oFriends = new Object();
		if ((typeof user.subscribers !== "undefined") 
		&& (typeof user.subscriptions !== "undefined")){
			oSubscriptions = new Object();
			login.subscribers.forEach(cView.Utils.addUser, cView.Utils);
			login.subscriptions.forEach(function(sub){
				if(sub.name == "Posts"){
					oSubscriptions[sub.id] = sub.user;
				}
			});
			user.subscribers.forEach(function(sub){
				cView.Utils.addUser(sub);
				cView.gUsers[sub.id].subscriber = true;
			});
			user.subscriptions.forEach(function(subid){
				var userid = oSubscriptions[subid];
				if (typeof userid !== "undefined") {
					if (typeof cView.gUsers[userid] !== "undefined") {
						cView.gUsers[userid].friend = true;
						login.oFriends[userid] = true;
					}
				}
			});
		}
		var nodeSR = cView.doc.getElementById("sr-info");
		if (!nodeSR)return;
		if(Array.isArray(user.subscriptionRequests)){
			cView.subReqsCount += user.subscriptionRequests.length;
			nodeSR.cNodes["sr-info-a"].innerHTML ="You have "
			+ cView.subReqsCount
			+ " subscription requests to review.";
			nodeSR.hidden = false;
		}
		if(!cView.subReqsCount)nodeSR.hidden = true;
	}
	,"setIcon": function (ico){
		var cView = this.cView;
		var linkFavicon = cView.doc.getElementById("favicon");
		if (linkFavicon) linkFavicon.parentNode.removeChild(linkFavicon);
		linkFavicon = cView.doc.createElement('link');
		linkFavicon.id = "favicon";
		linkFavicon.type = 'image/x-icon';
		linkFavicon.rel = 'shortcut icon';
		linkFavicon.href = gConfig.static + ico;
		cView.doc.getElementsByTagName('head')[0].appendChild(linkFavicon);
	}
	,"postInit": function(){
		var cView = this.cView;
		(function(i,s,o,g,r,a,m){i["GoogleAnalyticsObject"]=r;i[r]=i[r]||function(){
		(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
		m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
		})(window,cView.doc,"script","//www.google-analytics.com/analytics.js","ga");
		ga("create", gConfig.ga, "auto");
		ga("send", "pageview");

		if(parseInt(cView.localStorage.getItem("rt")) ) cView.initRt();
		if(cView.localStorage.getItem("show_link_preview") == "1"){
			(function(a,b,c){
				var d,e,f;
				f="PIN_"+~~((new Date).getTime()/864e5),
				a[f]||(a[f]=!0,a.setTimeout(function(){
					d=b.getElementsByTagName("SCRIPT")[0],
					e=b.createElement("SCRIPT"),
					e.type="text/javascript",
					e.async=!0,
					e.src=c+"?"+f,
					d.parentNode.insertBefore(e,d)
				}
				,10))
			})(window,cView.doc,"//assets.pinterest.com/js/pinit_main.js");
		}
		var nodesAttImg = document.getElementsByClassName("atts-img");
		for (var idx = 0; idx < nodesAttImg.length; idx++){
			var nodeImgAtt = nodesAttImg[idx];
			if(cView.Utils.chkOverflow(nodeImgAtt))
				nodeImgAtt.parentNode.cNodes["atts-unfold"].hidden = false;
		}
		cView.Utils.setIcon("favicon.ico");
	}
	,"setStorage": function (){
		var cView = this.cView;
		["localStorage", "sessionStorage"].forEach(function(storage){
			cView[storage] = new Object();
			["setItem", "getItem", "removeItem"].forEach(function(action){
				cView[storage][action] = function(){
					try{
						return window[storage][action].apply(window[storage],arguments);
					} catch(e){return null};
				}
			});
		});
	}
	,"auth": function (check){
		var cView = document.cView;
		var Utils = cView.Utils;
		cView.token = Utils.getCookie(gConfig.tokenPrefix + "authToken");
		var txtgMe = null;
		txtgMe = cView.localStorage.getItem("gMe");
		if (txtgMe && cView.token){
			cView.logins = JSON.parse(txtgMe);
			if(cView.ids && (typeof cView.logins[cView.ids[0]].token !== "undefined")){
				cView.ids.forEach(function(id) {
					var user = cView.logins[id].data;
					if (cView.token == cView.logins[id].token)cView.mainId = id;
					Utils.addUser(user.users);
					Utils.refreshLogin(id);
					setTimeout(function (){ Utils.getWhoami(id); },300);
				});
				return true;
			}else cView.logins = new Object();

		}

		var oReq = new XMLHttpRequest();
		if(cView.token){
			oReq.open("get", gConfig.serverURL +"users/whoami", false);
			oReq.setRequestHeader("X-Authentication-Token", cView.token);
			oReq.send();
			if(oReq.status < 400) {
				var res = JSON.parse(oReq.response); 
				var id = res.users.id;
				cView.mainId = id;
				cView.logins[id] = new Object();
				cView.logins[id].token = cView.token;
				cView.logins[id].data = res;
				Utils.refreshLogin(id);
				return true;
			}
		}
		if (check !== true ){
			cView.Utils.setIcon("favicon.ico");
			var nodeAuth = cView.doc.createElement("div");

			nodeAuth.className = "nodeAuth";
			nodeAuth.innerHTML ='<div id=cView.Utils.auth-msg style="color:white; font-weight: bold;">&nbsp;</div><form action="javascript:" id=a-form><table><tr><td>Username</td><td><input name="username" id=a-user type="text"></td></tr><tr><td>Password</td><td><input name="password" id=a-pass type="password"></td></tr><tr><td>&nbsp;</td><td><input type="submit" value="Log in" style=" font-size: large; height: 2.5em; width: 100%; margin-top: 1em;" ></td></tr></table></form>';
			cView.doc.getElementsByTagName("body")[0].appendChild(nodeAuth);
			cView.doc.getElementById("a-form").addEventListener("submit",cView.Actions.getauth);
		}
		return false;

	}
	,"frfAutolinker":function( autolinker,match ){
		switch (match.getType()){
		case "twitter":
			return "<a href=" + gConfig.front+match.getTwitterHandle()+">@" +match.getTwitterHandle( ) + "</a>" ;
		/*
		case "url":
			if( match.getUrl().indexOf(".freefeed.net") != -1 ) return true;
			else if( match.getUrl().indexOf("freefeed.net") != -1 ) {
			    match.url = match.url.replace("freefeed.net","m.freefeed.net","gm");
			    var tag = autolinker.getTagBuilder().build( match );
			    return tag;

			} else {
			    return true;
			}

		*/
		default:
			return true;
		}
	}
	,"chkOverflow":function(victim){
		var cView = this.cView;
		var test = victim.cloneNode(true);
		test.style.opacity = 0;
		test.style.position = "absolute";
		test.style.display = "block";
		victim.parentNode.appendChild(test);
		test.style.width = victim.clientWidth;
		var ret = victim.clientHeight < test.clientHeight;
		victim.parentNode.removeChild(test);
		return ret;
	}
	,"updateBlockList": function(list, username, add){
		var cView = document.cView;
		var id = cView.gUsers.byName[username].id;
		if(add){
			if ((typeof cView[list] === "undefined") || (cView[list] == null)) cView[list] = new Object();
			cView[list][id] = true;
			cView.localStorage.setItem(list, JSON.stringify(cView[list]));
		}else try{
			delete cView[list][id];
			cView.localStorage.setItem(list, JSON.stringify(cView[list]));
		}catch(e){};
	}
	,"getNode":function(node){
		var arrPath =  args2Arr.apply(this,arguments);
		arrPath.shift();
		arrPath.forEach(function(step){
			var className = step[1];
			switch(step[0]){
			case "p":
				do node = node.parentNode; 
				while(node.className != className);
				break;
			case "c":
				node = node.cNodes[className];
				break;
			}
		});
		return node;

	}
	,"getInputsByName": function(node){
		var oInputs = new Object();
		var nodes = node.getElementsByTagName("input");
		for(var idx = 0; idx < nodes.length; idx++){
			var input = nodes[idx];
			oInputs[input.name] = input;
		}
		return oInputs;
	}
	,"getWhoami": function(id,callback){
		var cView = this.cView;
		var oParam = {
			"url":gConfig.serverURL +"users/whoami"
			,"token":cView.logins[id].token
		};
		cView.Utils.ffReq(oParam, function(res){
			cView.logins[id].data = JSON.parse(res);
			cView.Utils.refreshLogin(id);
			if (typeof callback == "function") callback(res);
		});
	}
};
return _Utils;
});
