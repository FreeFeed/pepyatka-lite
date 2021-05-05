 "use strict";
var gPrivTimeline = {"done":0,"postsById":{},"oraphed":{count:0},"noKey":{},"noDecipher":{},nCmts:0,"posts":[] };
var matrix  = new Object();
var Init = require("./init.js")
var Addons = require("./addons.js");
var polyfills = require("./polyfills.js");
window.browserDoc = function(){
	var cView = document.cView;
	var Utils = cView.Utils;
	var locationPath = /(https?:\/\/[^\?]*)/.exec(document.location)[1].slice(gConfig.front.length);
	if (locationPath == "")locationPath = "home";
	cView.fullPath = locationPath;
	var arrLocationPath = locationPath.split("/");
	var settingsNames = require("./settings.json");
	settingsNames.forEach(function(name){
		var setting =  cView.localStorage.getItem(name);
		if (setting == "undefined")cView.localStorage.setItem(name, "false");
	});
	if(arrLocationPath[0].toLowerCase() != "settings"){
		cView.search = document.location.search.slice(1);
		var matchOffset = cView.search.match(/offset=(\d+)/);
		if(matchOffset) cView.skip = matchOffset[1];
		cView.search = cView.search.replace(/&?offset=\d+&?/,"").replace(/&?limit=\d+&?/,"")
	}else if(document.location == gConfig.front +"settings/raw"){
		var nodeSplash = document.getElementById("splash");
		cView.Drawer.drawRaw(nodeSplash);
	}else if(document.location == gConfig.front +"settings/wipe"){
		settingsNames.forEach(function(setting){cView.localStorage.removeItem(setting)});
		cView.Actions.logout();
	}
		
	setLocalSettings();
	cView.Common.loadLogins();
	var body = cView.gNodes["main"].cloneAll();
	var nodeControls;
	if(Object.keys(cView.contexts).some(function(domain){return cView.contexts[domain].token})){
		if(cView.localStorage.getItem("use-custom-upper-menu") == "true"){
			try{
				var scheme = JSON.parse(cView.localStorage.getItem("custom-ui-upper"));
				nodeControls = cView.Drawer.genCustomUI(scheme);
			}catch(e){ nodeControls = cView.gNodes["controls-login"].cloneAll()}
		}else nodeControls = cView.gNodes["controls-login"].cloneAll();
	} else  nodeControls = cView.gNodes["controls-anon"].cloneAll();
	cView.Utils.setChild(body.cNodes["container"], "controls", nodeControls);
	cView.doc.getElementsByTagName("body")[0].appendChild(body);
	/*
	var nodeDebug =  document.createElement("div");	
	nodeDebug.id = "debug";
	nodeDebug.className = "debug";
	body.appendChild(nodeDebug);
	nodeDebug.innerHTML = [document.location
		,"--------"
		,locationPath 
		,gConfig.front.length].join("<br>");
	*/
	var contexts = new Object();
	Object.keys(cView.contexts).forEach(function(domain){contexts[domain] = cView.contexts[domain];});
	cView.Router.route(contexts, locationPath).then(postInit,function(err){
		console.log(err);
		if (Array.isArray(err))
			err = err.filter(function(item){return typeof item !== "undefined"})[0];
		
		if( typeof err === "string") switch(err){
			case "token":
				cView.Common.auth();
			break;
		}else {
			var nodeMsg = cView.gNodes["global-failure"].cloneAll();
			body.getNode(["c","container"],["c","details"]).appendChild(nodeMsg);
			try{
				nodeMsg.cNodes["title"].innerHTML = "Error " + err.code;
				nodeMsg.cNodes["info"].innerHTML = cView.Utils.err2html(err.data);
			}catch(e){ };
		}
		postInit();
	});

	return ;
}

window.initDoc = function(){
	Init.init(document);
	polyfills();
	//document.cView.Utils._Promise = Promise;
	browserDoc();
}

function postInit(){
	var cView = document.cView;
	(function(i,s,o,g,r,a,m){i["GoogleAnalyticsObject"]=r;i[r]=i[r]||function(){
	(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
	m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
	})(window,cView.doc,"script","//www.google-analytics.com/analytics.js","ga");
	ga("create", gConfig.ga, "auto");
	ga("send", "pageview");

	Object.keys(cView.contexts).forEach(function(domain){
		var context = cView.contexts[domain];
		Object.keys(context.logins).forEach(function(id){
			context.getWhoami(context.logins[id].token);
			context.rtSubUser(id);
		});
	});


	//if(parseInt(cView.localStorage.getItem("rt")) ) cView.initRt();
	if(JSON.parse(cView.localStorage.getItem("show_link_preview"))){
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
	cView.Drawer.applyReadMore( cView.doc);
	
	window.addEventListener("whoamiUpdated", cView.Common.regenCounters); 
	var nodeSplash = document.getElementById("splash");
	nodeSplash.parentNode.removeChild(nodeSplash);
	cView.Common.setIcon("favicon.ico");
	Addons.commit(cView).then(function(){
		var lists = cView.blockLists;
		Object.keys(cView.contexts).forEach(function (domain){
			var context = cView.contexts[domain];
			Object.keys(lists).forEach(function(type){
				var list = cView.blocks[lists[type]][domain]; 
				if(typeof list !== "undefined") Object.keys(list).forEach(function(id){
					if(list[id] !== true) return;
					var user = context.gUsers[id];
					if(typeof user === "undefined") return;
					list[id] = user.username;
				});

			});
		});
		cView.Common.updateBlockList();
	});
}
window.srvDoc = function(){
	var cView = document.cView;
	var idx = 0;
	var aidx = 0;
	setLocalSettings();
	if(typeof cView.gContent !== "undefined")
		cView.Drawer.loadGlobals(cView.gContent);
	regenCNodes(document.getElementsByTagName("body")[0]);
	
	switch(cView.timeline){
	case "settings":
		return cView.Drawer.drawSettings();
	case "requests":
		return cView.Drawer.drawRequests();
	default:
	
	
	}

	document.posts = document.getElementById("posts");
	document.hiddenCount = 0;
	document.hiddenPosts = new Array();
	if(Array.isArray(cView.gContent.posts))
		cView.gContent.posts.forEach(function(post){ 
			document.hiddenPosts.push({"data":post, "is": post.isHidden});
			if(!post.isHidden) document.getElementById(post.id).rawData = post; 
			else document.hiddenCount++;
		});
	else if(typeof cView.gContent.posts !== "undefined") 
		document.getElementById(cView.gContent.posts.id).rawData = cView.gContent.posts; 
	setAttr(document.getElementsByClassName("avatar-h"),"userid");
	setAttr(document.getElementsByTagName("a"),"action");
	Object.keys(gEvents).forEach(function(id){
		var node = document.getElementById(id);
		var eh = gEvents[id];
		Object.keys(eh).forEach(function(evt){
			eh[evt].forEach(function(a){
				node.addEventListener(evt, cView[a[0]][a[1]])
			});
		});
	});
	if(cView.gContent.comments)cView.gContent.comments.forEach(function(cmt){
		var nodeComment = document.getElementById(cmt.id);	
		if(nodeComment ){
			nodeComment.createdAt = cmt.createdAt;
			nodeComment.userid = cmt.createdBy;
		}
	});
	var nodesDate = document.getElementsByClassName("post-date");
	for(idx = 0; idx < nodesDate.length; idx++){
		var victim = nodesDate[idx]; do victim = victim.parentNode; while(victim.className != "post");
		var aNode = nodesDate[idx].getElementsByTagName("a")[0];
		aNode.date = JSON.parse(victim.rawData.createdAt);
		window.setTimeout(cView.Drawer.updateDate, 100, aNode, cView);

	}
	var arrUsernames = new Array();
	var nodesUsernames = document.getElementsByClassName("username");
	for(idx = 0; idx < nodesUsernames.length; idx++) 
		arrUsernames.push(nodesUsernames[idx]);
	arrUsernames.forEach(function(node){
		if(typeof cView.gUsers.byName[node.innerHTML] !== "undefined")
			node.parentNode.outerHTML = cView.gUsers.byName[node.innerHTML].link;
	
	});
	var urlMatch;
	if(JSON.parse(cView.localStorage.getItem("show_link_preview"))){
		var nodesPost = document.getElementsByClassName("post");
		for(idx = 0; idx < nodesPost.length; idx ++){
			if(((urlMatch = nodesPost[idx].rawData.body.match(/https?:\/\/[^\s\/$.?#].[^\s]*/i) )!= null) 
			&& (!nodesPost[idx].rawData.attachments))
			(function(url, nodePost){
				cView.gEmbed.p.then(function(oEmbedPr){
					cView.Drawer.embedPreview(oEmbedPr
						,url[0]
						,nodePost.cNodes["post-body"].cNodes["attachments"] 
					);
				});
			})(urlMatch, nodesPost[idx]);
		}
	}
	["blockPosts", "blockComments"].forEach(function(list){
		if(Array.isArray(cView[list]))
			cView[list].forEach(function(user){ cView.Drawer[list](user,true); });
	});
	var nodeAddSender = document.getElementsByClassName("add-sender")[0];
	if(nodeAddSender != null) nodeAddSender.ids = [cView.mainId];
	var nodeNewPostTo =  document.getElementsByClassName("new-post-to")[0];
	if(nodeNewPostTo != null) nodeNewPostTo.userid = cView.mainId;

	cView.Utils.postInit();	
}
function regenCNodes(node){
	var cView = document.cView;
	node.cNodes = new Object();
	node.getNode = function(){
		var args = cView.Utils.args2Arr.apply(this,arguments);
		args.unshift(node);
		return cView.Utils.getNode.apply(node, args);
	};
	for(var idx = 0; idx < node.childNodes.length; idx++){
		regenCNodes(node.childNodes[idx]);
		var cName = node.childNodes[idx].className; 
		if(cName != "")node.cNodes[cName] = node.childNodes[idx];
	}
}
function setAttr(nodes, name){
	for(var idx = 0; idx < nodes.length; idx++){
		var aidx = 0;
		do{
			if (nodes[idx].attributes[aidx].name == name){
				nodes[idx][name] = nodes[idx].attributes[aidx].value;
				if (nodes[idx][name] == "true") nodes[idx][name] = true;
				if (nodes[idx][name] == "false") nodes[idx][name] = false;
				break; 
			}
		}while(++aidx< nodes[idx].attributes.length);

	}
}
function setLocalSettings(){
	var cView = document.cView;
	try{
		if(JSON.parse(cView.localStorage.getItem("blocks")))
			cView.blocks = JSON.parse(cView.localStorage.getItem("blocks"));
	}catch(e){
		settingsError("bolcks");
	}
	try{
	if(typeof cView.blocks.blockStrings === "undefined")
		cView.blocks.blockStrings = new Object();
	Object.keys(cView.blockLists).forEach(function(type){
		if (typeof cView.blocks[cView.blockLists[type]] === "undefined"){
			cView.blocks[cView.blockLists[type]] = new Object();
		}
	});
	}catch(e){
		settingsError("blockLists");
	}
	var nameMode = cView.localStorage.getItem("screenname");
	if(nameMode){
		cView.localStorage.setItem("display_name", nameMode);
		cView.localStorage.removeItem("screenname");
	}
	cView.mode = cView.localStorage.getItem("display_name");
	cView.readMore = JSON.parse(cView.localStorage.getItem("read_more"));
	//default
	if (cView.localStorage.getItem("read_more_height") == null) cView.localStorage.setItem("read_more_height", 10);
	cView.readMoreHeight = cView.readMore? JSON.parse(cView.localStorage.getItem("read_more_height")):0;

	cView.blockLonely = JSON.parse(cView.localStorage.getItem("hide-lonely-posts"));
	cView.noMetapost = JSON.parse(cView.localStorage.getItem("no_metapost"));

	var cssTheme = cView.localStorage.getItem("display_theme");
	if (cssTheme == "main.css") {
		cssTheme = "expanded.css";
		cView.localStorage.setItem("display_theme", cssTheme)
	}
	var sheet;
	var idx;
	try{
		for ( idx = 0 ; idx< document.styleSheets.length; idx ++)
			if( document.styleSheets[idx].title == "local")
				sheet = document.styleSheets[idx]; 
		if (JSON.parse(cView.localStorage.getItem("show_newlines")))
			sheet.insertRule(".long-text{white-space:pre-wrap;}",0);
		else
			sheet.insertRule(".long-text{white-space:normal;}",0);
	}catch(e){
		settingsError("show_newlines");
	}	
	if(cssTheme) 
		document.getElementById("main-stylesheet").href = gConfig.static 
		+ cssTheme 
		+ "?build=" 
		+ encodeURIComponent(___BUILD___); 
	
	if(JSON.parse(cView.localStorage.getItem("show_link_preview"))){
		var nodeEmScript =  document.createElement("script");
		(function(w, d){
			var id='embedly-platform', n = 'script';
			if (!d.getElementById(id)){
				w.embedly = w.embedly || function() {(w.embedly.q = w.embedly.q || []).push(arguments);};
				var e = d.createElement(n); e.id = id; e.async=1;
				e.src = ('https:' === document.location.protocol ? 'https' : 'http') + '://cdn.embedly.com/widgets/platform.js';
				var s = d.getElementsByTagName(n)[0];
				s.parentNode.insertBefore(e, s);
			}
		})(window, document);
		embedly("defaults", {
			cards: {
				height: 200
				//width: 700
				//align: 'right',
				//chrome: 0
			}
		});
		embedly('on', 'card.rendered', function(iframe){

		//	cView.Utils.unscroll(iframe);
		});
		cView.gEmbed.p = new Promise(function(resolve,reject){
			var oReq = new XMLHttpRequest();
			oReq.onload = function(){
				if(oReq.status < 400)
					resolve(JSON.parse(oReq.response));
				else reject(oReq.response);
			}

			oReq.open("get",gConfig.static + "providers.json",true);
			oReq.send();
					
		});
	}
	if (cView.localStorage.getItem("do_dark_theme") == "true"){
		var elCSS = document.createElement("link");
		elCSS.rel = "stylesheet";
		elCSS.href = "https://gitcdn.xyz/repo/dym-sh/freefeed-dark.css/master/no-wrap.css";
		document.getElementsByTagName("head")[0].appendChild(elCSS);
	}


}

function settingsError(id){
	var msg = "Error applying {"+id+"}";
	console.log(msg);
	var dialog = document.getElementById("modalDlg");
	if (!dialog){ 
		dialog = document.cView.gNodes["modal-error-dlg"].cloneAll();
		document.body.appendChild(dialog);
	}
	
	dialog.cNodes["value"].innerHTML += msg + "<br>";
}
