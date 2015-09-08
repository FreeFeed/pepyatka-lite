"use strict";
var gUsers = new Object();
var gUsersQ = new Object();
gUsers.byName = new Object();
var gNodes = new Object();
var gMe = new Object();
var gComments = new Object();
var gAttachments  = new Object();
var gFeeds = new Object();
var gRt = new Object();
var gPrivTimeline = {"done":0,"postsById":{},"oraphed":{count:0},"noKey":{},"noDecipher":{},nCmts:0,"posts":[] };
var autolinker = new Autolinker({"truncate":20,  "replaceFn":frfAutolinker } );
var matrix  = new Object();
document.addEventListener("DOMContentLoaded", initDoc);

function initDoc(){
	var locationPath = (document.location.origin + document.location.pathname).slice(gConfig.front.length);
	var locationSearch = document.location.search;
	if (locationPath == "")locationPath = "home";
	if (locationSearch == "")locationSearch = "?offset=0";
	gConfig.cSkip = locationSearch.split("&")[0].split("=")[1]*1;
	var arrLocationPath = locationPath.split("/");
	gConfig.timeline = arrLocationPath[0];
	genNodes(templates.nodes).forEach( function(node){ gNodes[node.className] = node; });
	switch(gConfig.timeline){
	case "home":
	case "filter":
		if(!auth()) return;
		break;
	default:
		if(!auth(true)) gMe = undefined;
	}
	var arrStage1 = new Array();
	arrStage1.push();


	Promise.All(arrStage1).then(window["draw"](JSON.parse(this.response)));
	var oReq = new XMLHttpRequest();
	oReq.onload = function(){
		if(oReq.status < 400) 
		else{
			if (oReq.status==401)
				{
					deleteCookie("token");
					try {localStorage.removeItem("gMe");}catch(e){
					
						window.localStorage ={
							setItem: function(){return;}
							,getItem: function(){return null;}
							,removeItem: function(){return null;}
						};
						window.sessionStorage = window.localStorage;
					};
					location.reload();
				}
			if(auth())
				document.getElementsByTagName("body")[0].appendChild(gNodes["controls-user"].cloneAll());
			var nodeError = document.createElement("div");
			nodeError.className = "error-node";
			nodeError.innerHTML = "Error #"+ oReq.status + ": " + oReq.statusText;
			try{ 
				var res = JSON.parse(this.response);
				nodeError.innerHTML += "<br>"+res.err;
			}catch(e){};
			document.getElementsByTagName("body")[0].appendChild(nodeError);
		}

	};
	if(arrLocationPath.length > 1){
		if (locationPath == "filter/discussions") {
			gConfig.timeline = locationPath;
			gConfig.xhrurl = gConfig.serverURL + "timelines/filter/discussions";
		} else	if (locationPath == "filter/direct") {
			gConfig.timeline = locationPath;
			gConfig.xhrurl = gConfig.serverURL + "timelines/filter/directs";
		}else{
			gConfig.xhrurl = gConfig.serverURL +"posts/"+arrLocationPath[1];
			locationSearch = "?maxComments=all";
		}
	} else 
		gConfig.xhrurl = gConfig.serverURL + "timelines/"+locationPath;
	
	oReq.open("get",gConfig.xhrurl+locationSearch,true);
	oReq.setRequestHeader("X-Authentication-Token", gConfig.token);
	oReq.send();
}
function loadScript(script){
	return new Promis(function(resolve,reject){
		document.createElement("script");
		

	});
}
function auth(check){
	gConfig.token = getCookie("token");
	var txtgMe = null;
	try{txtgMe = window.localStorage.getItem("gMe");} catch(e){
		window.localStorage ={
			setItem: function(){return;}
			,getItem: function(){return null;}
			,removeItem: function(){return null;}
		};
		window.sessionStorage = window.localStorage;
	}
	if (txtgMe && gConfig.token){
		gMe = JSON.parse(txtgMe);
		if (gMe.users) {
			addUser(gMe.users);
			new Promise(function(){
				var oReq = new XMLHttpRequest();
				oReq.open("get", gConfig.serverURL +"users/whoami", true);
				oReq.setRequestHeader("X-Authentication-Token", gConfig.token);
				oReq.onload = function(){
					if(oReq.status < 400) {
						gMe = JSON.parse(oReq.response);
						if (gMe.users) {
							refreshgMe();
							return true;
						}
					}			
				}
				setTimeout(function (){oReq.send()},300);
			});
			return true;
		}
	}

	var oReq = new XMLHttpRequest();
	if(gConfig.token){
		oReq.open("get", gConfig.serverURL +"users/whoami", false);
		oReq.setRequestHeader("X-Authentication-Token", gConfig.token);
		oReq.send();
		if(oReq.status < 400) {
			gMe = JSON.parse(oReq.response);
			if (gMe.users) {
				refreshgMe();
				return true;
			}
		}
	}
	if (check !== true ){
		var nodeAuth = document.createElement("div");
		nodeAuth.className = "nodeAuth";
		nodeAuth.innerHTML = '<div id=auth-msg style="color:white; font-weight: bold;">&nbsp;</div><form action="javascript:" onsubmit=getauth(this)><table><tr><td>Username</td><td><input name="username" id=a-user type="text"></td></tr><tr><td>Password</td><td><input name="password" id=a-pass type="password"></td></tr><tr><td>&nbsp;</td><td><input type="submit" value="Log in" style=" font-size: large; height: 2.5em; width: 100%; margin-top: 1em;" ></td></tr></table></form>';
		document.getElementsByTagName("body")[0].appendChild(nodeAuth);
	}
	return false;

}
function addUser (user){
	if (typeof gUsers[user.id] !== "undefined" ) return;
	user.link = '<a class="'+(user.id==gMe.users.id?"my-link":"not-my-link")+'" href="' + gConfig.front+ user.username+'">'+ user.screenName+"</a>";
	if(!user.profilePictureMediumUrl)user.profilePictureMediumUrl = gConfig.static+ "default-userpic-48.png";
	user.friend = false;
	user.subscriber = false;
	gUsers[user.id] = user;
	gUsers.byName[user.username] = user;
}
function refreshgMe(){
	window.localStorage.setItem("gMe",JSON.stringify(gMe));
	delete gUsers[gMe.users.id];
	addUser(gMe.users);
	var links = document.getElementsByClassName("my-link");
	if(Array.isArray(links))links.forEach(function(link){
		link.innerHTML = gMe.users.screenName;
	});
}
function getauth(oFormElement){
	var oReq = new XMLHttpRequest();
	oReq.onload = function(){
		if(this.status < 400){	
			setCookie("token", JSON.parse(this.response).authToken);
			gConfig.token =  JSON.parse(this.response).authToken;
			document.getElementsByTagName("body")[0].removeChild(document.getElementsByClassName("nodeAuth")[0]);
		//	initDoc();

			location.reload();
		}else document.getElementById("auth-msg").innerHTML = JSON.parse(this.response).err;
	};
	oReq.open("post", gConfig.serverURL +"session", true);
	oReq.setRequestHeader("X-Authentication-Token", null);
	oReq.setRequestHeader("Content-type","application/x-www-form-urlencoded");
	oReq.send("username="+document.getElementById("a-user").value+"&password="+document.getElementById("a-pass").value);
}
