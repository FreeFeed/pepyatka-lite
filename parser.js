"use strict";
var gUsers = new Object();
var gUsersQ = new Object();
gUsers.byName = new Object();
var gEmbed = new Object();
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
function unfoldLikes(id){
	var post = document.getElementById(id).rawData;
	var span  = document.getElementById(id+"-unl");
	var nodeLikes = span.parentNode.cNodes["comma"];

	if (post.omittedLikes > 0){
		var oReq = new XMLHttpRequest();
		oReq.onload = function(){
			if(oReq.status < 400){
				span.parentNode.removeChild(span);
				var postUpd = JSON.parse(this.response);
				post.likes = postUpd.posts.likes;
				postUpd.users.forEach(addUser);
				document.getElementById(id).rawData = post;
				writeAllLikes(id, nodeLikes);
			}else{
				console.log(oReq.toString());

			};
		};
		oReq.open("get",gConfig.serverURL + "posts/"+post.id+"?maxComments=0&maxLikes=all", true);
		oReq.setRequestHeader("X-Authentication-Token", gConfig.token);
		oReq.send();

	}else  writeAllLikes(id, nodeLikes);
}

function writeAllLikes(id,nodeLikes){
	var post = document.getElementById(id).rawData;
	nodeLikes.innerHTML = "";
	var nodeLike = document.createElement("span");
	nodeLike.className = "p-timeline-user-like";
	for(var like = 0; like < post.likes.length; like++){
		var nodeCLike = nodeLike.cloneNode();
		nodeCLike.innerHTML = gUsers[post.likes[like]].link;
		//nodeLikes.childNodes[idx].appendChild(nodeCLike);
		nodeLikes.appendChild(nodeCLike);
	}
	var suffix = document.createElement("span");
	suffix.innerHTML = " liked this";
	//nodeLikes.childNodes[idx].appendChild(suffix);
	nodeLikes.parentNode.appendChild(suffix);
}
function genLikes(nodePost){
	var post = nodePost.rawData;
	var postNBody = nodePost.cNodes["post-body"];
	var node = document.createElement("div");
	node.className = "likes";
	postNBody.cNodes["post-info"].replaceChild(node,  postNBody.cNodes["post-info"].cNodes["likes"]);
	postNBody.cNodes["post-info"].cNodes["likes"] = node;
	if(!Array.isArray(post.likes) || !post.likes.length ) return;
	postNBody.cNodes["post-info"].cNodes["likes"].appendChild(gNodes["likes-smile"].cloneNode(true));
	var nodeLikes = document.createElement( "span");

 	/*
	var l =  post.likes.length;
	if(typeof gMe !== "undefined"){
		for (var idx = 0; idx< l;idx++) {
			var like = post.likes[idx];
			if(like == gMe.users.id){
				post.likes.splice(idx,1);
				post.likes.unshift(like);
				break;
			}
		}
	}
	*/


	var nodeLike = document.createElement("span");
	nodeLike.className = "p-timeline-user-like";
	post.likes.forEach(function(like){
		var nodeCLike = nodeLike.cloneNode();
		nodeCLike.innerHTML = gUsers[like].link;
		nodeLikes.appendChild(nodeCLike);
	});
	var suffix = document.createElement("span");
	suffix.id = post.id+"-unl"
	if (post.omittedLikes)
		suffix.innerHTML = 'and <a onclick="unfoldLikes(\''+post.id+'\')">'+ post.omittedLikes +" other people</a> ";
	suffix.innerHTML += "liked this";
	suffix.className = "nocomma";
	postNBody.cNodes["post-info"].cNodes["likes"].appendChild(nodeLikes);
	postNBody.cNodes["post-info"].cNodes["likes"].cNodes = new Object();
	postNBody.cNodes["post-info"].cNodes["likes"].cNodes["comma"] = nodeLikes;
	postNBody.cNodes["post-info"].cNodes["likes"].appendChild(suffix);
	//postNBody.cNodes["post-info"].cNodes["likes"].appendChild(suffix);
	nodeLikes.className = "comma";
	if(typeof gMe !== "undefined"){
		if(post.likes[0] == gMe.users.id){
			postNBody.cNodes["post-info"].myLike = nodeLikes.childNodes[0];
			if( postNBody.cNodes["post-info"].nodeLike) {
				postNBody.cNodes["post-info"].nodeLike.innerHTML = "Un-like";
				postNBody.cNodes["post-info"].nodeLike.action = false;

			}

		}
	}
}
function addUser (user){
	if (typeof gUsers[user.id] !== "undefined" ) return;
	var className = "not-my-link";
	var userTitle;
	var mode = window.localStorage.getItem("screenname");
	if (mode == null) mode = "screen";
	switch(mode){
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
	if((typeof gMe !== "undefined")&&(typeof gMe.users !== "undefined"))
		className = (user.id==gMe.users.id?"my-link":"not-my-link");
	user.link = '<a class="'+className+'" href="' + gConfig.front+ user.username+'">'
	+ userTitle
	+"</a>";
	if(!user.profilePictureMediumUrl)user.profilePictureMediumUrl = gConfig.static+ "default-userpic-48.png";
	user.friend = false;
	user.subscriber = false;
	gUsers[user.id] = user;
	gUsers.byName[user.username] = user;
}
function reqSubscription(e){
	var oReq = new XMLHttpRequest();
	var username = e.target.parentNode.user;
	oReq.open("post", gConfig.serverURL +"users/"+username+"/sendRequest/", true);
	oReq.setRequestHeader("X-Authentication-Token", gConfig.token);
	oReq.onload = function(){
		if(oReq.status < 400) {
			var span = document.createElement("span");
			span.innerHTML = "Request sent";
			e.target.parentNode.replaceChild(span, e.target);
		}
	}

	oReq.send();

}
function doUnBan(e){
	var oReq = new XMLHttpRequest();
	var nodeHost = e.target; do nodeHost = nodeHost.parentNode; while(nodeHost.className != "up-controls");
	var username = nodeHost.user;
	oReq.open("post", gConfig.serverURL +"users/"+username+"/unban", true);
	oReq.setRequestHeader("X-Authentication-Token", gConfig.token);
	oReq.onload = function(){
		if(oReq.status < 400) {
			var idx = gMe.users.banIds.indexOf(gUsers.byName[username].id);
			if (idx != -1 ) gMe.users.banIds.splice(idx, 1);
			window.localStorage.setItem("gMe",JSON.stringify(gMe));
			setChild(nodeHost.parentNode, "up-controls", genUpControls(username));
		}
	}

	oReq.send();
}

function doBan(e){
	var oReq = new XMLHttpRequest();
	var nodePopUp = e.target; do nodePopUp = nodePopUp.parentNode; while(nodePopUp.className != "user-popup");
	var username = nodePopUp.user;
	var bBan = e.target.checked;
	var nodeParent = e.target.parentNode;
	oReq.open("post", gConfig.serverURL +"users/"+username+(bBan?"/ban":"/unban"), true);
	oReq.setRequestHeader("X-Authentication-Token", gConfig.token);
	var spinner = gNodes["spinner"].cloneNode(true);
	var ckBox = nodeParent.replaceChild(spinner,e.target);
	oReq.onload = function(){
		nodeParent.replaceChild(ckBox, spinner);
		if(oReq.status < 400) {
			if (bBan)gMe.users.banIds.push(gUsers.byName[username].id);
			else{
				var idx = gMe.users.banIds.indexOf(gUsers.byName[username].id);
				if (idx != -1 ) gMe.users.banIds.splice(idx, 1);
			}
			window.localStorage.setItem("gMe",JSON.stringify(gMe));
			setChild(nodePopUp.parentNode.parentNode, "up-controls", genUpControls(username));
		}
	}

	oReq.send();
}
function doBlockCom(e){
	var action = e.target.checked;
	var nodePopUp = e.target; do nodePopUp = nodePopUp.parentNode; while(nodePopUp.className != "user-popup");
	updateBlockList("blockComments", nodePopUp.user, action);
	var id = gUsers.byName[nodePopUp.user].id;
	var nodesCmts = document.getElementsByClassName("comment");
	for(var idx = 0; idx < nodesCmts.length; idx++){
		if(nodesCmts[idx].userid == id){
			if(action) nodesCmts[idx].innerHTML = "---";
			else nodesCmts[idx].parentNode.replaceChild(genComment(gComments[nodesCmts[idx].id]), nodesCmts[idx]);
		}
	}
}
function doBlockPosts(e){
	var action = e.target.checked;
	var nodePopUp = e.target; do nodePopUp = nodePopUp.parentNode; while(nodePopUp.className != "user-popup");
	updateBlockList("blockPosts", nodePopUp.user, action);
	var id = gUsers.byName[nodePopUp.user].id;
	var nodesPosts = document.getElementsByClassName("post");
	for(var idx = 0; idx < nodesPosts.length; idx++){
		if(nodesPosts[idx].rawData.createdBy == id)
			nodesPosts[idx].hidden = action;
	}
}
function updateBlockList(list, username, add){
	var id = gUsers.byName[username].id;
	if(add){
		if ((typeof gConfig[list] === "undefined") || (gConfig[list] == null)) gConfig[list] = new Object();
		gConfig[list][id] = true;
		window.localStorage.setItem(list, JSON.stringify(gConfig[list]));
	}else try{
		delete gConfig[list][id];
		window.localStorage.setItem(list, JSON.stringify(gConfig[list]));
	}catch(e){};
}
function subscribe(e){
	var oReq = new XMLHttpRequest();
	var username = e.target.parentNode.user;
	oReq.open("post", gConfig.serverURL +"users/"+username+(e.target.subscribed?"/unsubscribe":"/subscribe"), true);
	oReq.setRequestHeader("X-Authentication-Token", gConfig.token);
	oReq.onload = function(){
		if(oReq.status < 400) {
			gMe = JSON.parse(oReq.response);
			window.localStorage.setItem("gMe",JSON.stringify(gMe));
			gUsers.byName[username].friend = !e.target.subscribed;
			setChild(e.target.parentNode.parentNode, "up-controls", genUpControls(username));
		}
	}

	oReq.send();
}
function loadGlobals(data){
	if(data.attachments)data.attachments.forEach(function(attachment){ gAttachments[attachment.id] = attachment; });
	if(data.comments)data.comments.forEach(function(comment){ gComments[comment.id] = comment; });
	if(data.users)data.users.forEach(addUser);
	if(data.subscribers && data.subscriptions ){
		var subscribers = new Object();
		data.subscribers.forEach(function(sub){subscribers[sub.id]=sub;addUser(sub);});
		data.subscriptions.forEach(function(sub){
			if(["Posts", "Directs"].some(function(a){ return a == sub.name })){
				var userTitle;
				var user = subscribers[sub.user];
				var mode = window.localStorage.getItem("screenname");
				if (mode == null) mode = "screen";
				switch(mode){
				case "screen":
					userTitle  = user.screenName;
					break;
				case "screen_u":
					if(user.screenName != user.username)
						userTitle  = user.screenName + " <div class=username>("+user.username+")</div>";
					else userTitle  = "<div class=username>"+user.username+"</div>";
					break;
				case "username":
					userTitle  = "<div class=username>"+user.username+"</div>";
				}
				var className = "not-my-link";
				if((typeof gMe !== "undefined")&&(typeof gMe.users !== "undefined"))
					className = (user.id==gMe.users.id?"my-link":"not-my-link");
				gFeeds[sub.id] = user;
				gFeeds[sub.id].link = '<a class="'+className+'" href="' + gConfig.front+ user.username+'">'+ userTitle+"</a>";
			}
		});
	}
}
function setScreenNameView(e){
	window.localStorage.setItem("screenname",e.target.value );

}
function makeContainer(){
	var body = document.createElement("div");
	body.className = "content";
	body.id = "content";
	document.getElementsByTagName("body")[0].appendChild(body);
	var title =  document.createElement("div");
	title.className = "pagetitle";
	title.innerHTML = "<h1>" +gConfig.timeline+ "</h1>"
	document.title = "FreeFeed: " + gConfig.timeline; 
	var controls = gNodes["controls-user"].cloneAll();
	if(Array.isArray(gMe.users.subscriptionRequests)){
		controls.cNodes["sr-info"].cNodes["sr-info-a"].innerHTML = "You have "
		+ gMe.users.subscriptionRequests.length 
		+ " subscription requests to review.";
		controls.cNodes["sr-info"].hidden = false;
		gConfig.subReqsCount = gMe.users.subscriptionRequests.length;
	} else gConfig.subReqsCount = 0;
	body.appendChild(controls );
	body.appendChild(title);
	return body;
}
function drawSettings(){
	var body = makeContainer();
	var nodeSettings = gNodes["global-settings"].cloneAll();
	body.appendChild(nodeSettings);
	document.getElementById("my-screen-name").value = gMe.users.screenName;
	if(typeof gMe.users.email !== "undefined" )document.getElementById("my-email").value = gMe.users.email;
	document.getElementById("me-private").checked = (gMe.users.isPrivate == 1);
	var mode = window.localStorage.getItem("screenname");
	if (mode == null) mode = "screen";
	var nodes = nodeSettings.getElementsByTagName("input");
	for(var idx = 0; idx < nodes.length; idx++){
		var node = nodes[idx];
		if((node.type == "radio" ) &&(node.name == "display_name") &&(node.value == mode))
			node.checked = true;
	};
	var nodeLinkPreview =  document.getElementById("link-preview");
	if(window.localStorage.getItem("show_link_preview") == "1")
		nodeLinkPreview.checked = true;
	else nodeLinkPreview.checked = false;

	document.getElementById("rt-chkbox").checked = parseInt(window.localStorage.getItem("rt"));
	var bump = (window.localStorage.getItem("rtbump") == 1);
	document.getElementById("rt-params").hidden = !bump;
	document.getElementById("rt-bump").checked = bump ;
	var oRTParams = window.localStorage.getItem("rt_params");
	if (oRTParams != null)
		oRTParams = JSON.parse(oRTParams);
	["rt-bump-int", "rt-bump-cd", "rt-bump-d"].forEach(function(id){
		var node = document.getElementById(id);
		if(oRTParams)node.value = oRTParams[id];
		node.parentNode.getElementsByTagName("span")[0].innerHTML = node.value + " minutes";
	});
	
	addIcon("favicon.ico");
	document.body.removeChild(document.getElementById("splash"));
  (function(i,s,o,g,r,a,m){i["GoogleAnalyticsObject"]=r;i[r]=i[r]||function(){
  (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
  })(window,document,"script","//www.google-analytics.com/analytics.js","ga");

  ga("create", "UA-0-1", "auto");
  ga("send", "pageview");
}
function draw(content){
	matrix = new CryptoPrivate(gCryptoPrivateCfg );
	/*
	var body = document.createElement("div");
	body.className = "content";
	body.id = "content";
	document.getElementsByTagName("body")[0].appendChild(body);
	var title =  document.createElement("div");
	title.innerHTML = "<h1>" +gConfig.timeline+ "</h1>"
	title.className = "pagetitle";
	*/
	var body = makeContainer();
	loadGlobals(content);
	gConfig.cTxt = null;
	["blockPosts", "blockComments"].forEach(function(list){
		gConfig[list]= JSON.parse(window.localStorage.getItem(list));
	})
	//var nodeRTControls = gNodes["rt-controls"].cloneAll();
	if(typeof gMe === "undefined"){
		var nodeGControls = gNodes["controls-anon"].cloneAll();
		var controls = body.getElementsByClassName("controls-user");
		body.replaceChild(nodeGControls, controls);
	}else{
		if ((typeof gMe.users.subscribers !== "undefined") 
		&& (typeof gMe.users.subscriptions !== "undefined")){
			gMe.subscribers.forEach(addUser);
			var oSubscriptions = new Object();
			gMe.subscriptions.forEach(function(sub){
				if(sub.name =="Posts"){
					oSubscriptions[sub.id] = sub.user;
				}
			});
			gMe.users.subscribers.forEach(function(sub){
				addUser(sub);
				gUsers[sub.id].subscriber = true;
			});
			gMe.users.subscriptions.forEach(function(subid){
				if (typeof oSubscriptions[subid] !== "undefined") {
					if (typeof gUsers[oSubscriptions[subid]] !== "undefined")
						gUsers[oSubscriptions[subid]].friend = true;
				}
			});
		}

		switch (gConfig.timeline.split("/")[0]){
		case "filter":
			if (gConfig.timeline.split("/")[1] == "direct"){
				var nodeAddPost = gNodes["new-post"].cloneAll();
				body.appendChild(nodeAddPost);
				genDirectTo(nodeAddPost);
				break;
			}
		case "home":
		case gMe.users.username:
			var nodeAddPost = gNodes["new-post"].cloneAll();
			body.appendChild(nodeAddPost);
			genPostTo(nodeAddPost);
			break;
		default:
			setChild(body, "up-controls", genUpControls(gConfig.timeline));

		}
	}
	if(content.timelines){
		var nodeMore = document.createElement("div");
		nodeMore.className = "more-node";
		var htmlPrefix = '<a href="' + gConfig.front+gConfig.timeline ;
		var htmlForward;
		var htmlBackward;
		//var fLastPage = (content.posts.length != gConfig.offset);
		var backward = gConfig.cSkip*1 - gConfig.offset*1;
		var forward = gConfig.cSkip*1 + gConfig.offset*1;
		if (gConfig.cSkip){
			if (backward>=0) htmlBackward = htmlPrefix + "?offset="
				+ backward*1+ "&limit="+gConfig.offset*1
				+ '"><span style="font-size: 120%">&larr;</span> Newer entries</a>';
			nodeMore.innerHTML = htmlBackward ;
		}
		/*if(!fLastPage)*/ if(content.posts){
			htmlForward = htmlPrefix + "?offset="
			+ forward*1 + "&limit="+gConfig.offset*1
			+'">Older entries<span style="font-size: 120%">&rarr;</span></a>';
			if (htmlBackward) nodeMore.innerHTML += '<span class="spacer">&mdash;</span>'
			nodeMore.innerHTML +=  htmlForward;
		}
		body.appendChild(nodeMore.cloneNode(true));
		document.posts = document.createElement("div");
		document.posts.className = "posts";
		body.appendChild(document.posts);
		document.hiddenPosts = new Array();
		document.hiddenCount = 0;
		var idx = 0;
		if (content.posts){
			content.posts.forEach(function(post){
				post.idx = idx++;
				if(post.isHidden){
					document.hiddenCount++;
				}else{
					post.isHidden = false;
					document.posts.appendChild(genPost(post));
				}
				document.hiddenPosts.push({"is":post.isHidden,"data":post});
			});
		}
		var nodeShowHidden = gNodes["show-hidden"].cloneAll();
		nodeShowHidden.cNodes["href"].action = true;
		body.appendChild(nodeShowHidden);
		if(document.hiddenCount) nodeShowHidden.cNodes["href"].innerHTML= "Show "+ document.hiddenCount + " hidden entries";
		body.appendChild(nodeMore);
		var drop = Math.floor(gConfig.cSkip/3);
		var toAdd = drop + Math.floor(gConfig.offset/3);
		if((!gPrivTimeline.done)&& (gConfig.timeline == "home")&& matrix.ready){
			gPrivTimeline.done = true;
			new Promise(function (){addPosts(drop,toAdd,0);});
		};
	}else{
		var singlePost = genPost(content.posts);
		body.appendChild(singlePost);
		var nodesHide = singlePost.getElementsByClassName("hide");
		singlePost.hidden = false;
		if (nodesHide.lenght)nodesHide[0].hidden = true;
		document.title = "@" 
			+ gUsers[singlePost.rawData.createdBy].username + ": "
			+ singlePost.rawData.body.slice(0,20).trim()
			+ (singlePost.rawData.body.length > 20?"\u2026":"" )
			+ " (FreeFeed)";
	}
/*
	var nodeRTCtrl = body.getElementsByClassName("rt-controls")[0];
	nodeRTCtrl.cNodes["rt-chkbox"].checked = parseInt(window.localStorage.getItem("rt"));
	var nodeBump = nodeRTCtrl.cNodes["rt-bump"];
	for(var idx = 0; idx<nodeBump.childNodes.length; idx++)
		if(nodeBump.childNodes[idx].value == bump){
			nodeBump.selectedIndex = idx;
			break;
		}
	*/
	var bump = window.localStorage.getItem("rtbump");
	if(content.timelines) gConfig.rt = {"timeline":[content.timelines.id]};
	else gConfig.rt = {"post":[content.posts.id]};
	if(parseInt(window.localStorage.getItem("rt")) ){
		gRt = new RtUpdate(gConfig.token, bump);
		gRt.subscribe(gConfig.rt);
	}
	var nodes = document.getElementsByClassName("post");
	for(var idx = 0; idx < nodes.length; idx++ ){
		var nodePost = nodes[idx];
		var nodeImgAtt = nodePost.cNodes["post-body"].cNodes["attachments"].cNodes["atts-img"];
		if(nodeImgAtt.scrollWidth != nodeImgAtt.clientWidth)
			nodeImgAtt.parentNode.cNodes["atts-unfold"].hidden = false;
	};
	if(window.localStorage.getItem("show_link_preview") == "1"){
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
		})(window,document,"//assets.pinterest.com/js/pinit_main.js");
	}
	document.body.removeChild(document.getElementById("splash"));
  (function(i,s,o,g,r,a,m){i["GoogleAnalyticsObject"]=r;i[r]=i[r]||function(){
  (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
  })(window,document,"script","//www.google-analytics.com/analytics.js","ga");

  ga("create", "UA-0-1", "auto");
  ga("send", "pageview");

}

function drawRequests(){
	var oReq = new XMLHttpRequest();
	oReq.open("get", gConfig.serverURL +"users/whoami", true);
	oReq.setRequestHeader("X-Authentication-Token", gConfig.token);
	oReq.onload = function(){
		if(oReq.status < 400) {
			gMe = JSON.parse(oReq.response);
			if (gMe.users) {
				refreshgMe();
				completeRequests();
				return true;
			}
		}
	}
	oReq.send();
}
function completeRequests(){
	var body = makeContainer();
	if (Array.isArray(gMe.requests)) gMe.requests.forEach( addUser);
	else body.getElementsByClassName("pagetitle")[0].innerHTML = "<h1>No requests</h1>";
	
	if(Array.isArray(gMe.users.subscriptionRequests)){
		var nodeTPReq = document.createElement("h3");
		nodeTPReq.innerHTML = "Pending requests";
		nodeTPReq.id = "sr-header";
		body.appendChild(nodeTPReq);
		gMe.users.subscriptionRequests.forEach(function(req){
			body.appendChild(genReqNode(gUsers[req]));
		});
	}
	if(Array.isArray(gMe.users.pendingSubscriptionRequests)){
		var nodeTReq = document.createElement("h3");
		nodeTReq.innerHTML = "Sent requests";
		body.appendChild(nodeTReq);
		gMe.users.pendingSubscriptionRequests.forEach(function(req){
			var node = genReqNode(gUsers[req]);
			node.cNodes["sr-ctrl"].hidden = true;
			body.appendChild(node);
		});
	}

	addIcon("favicon.ico");
	document.body.removeChild(document.getElementById("splash"));
	function genReqNode(user){
		var node = gNodes["sub-request"].cloneAll();
		node.cNodes["sr-name"].innerHTML = "<a href="+gConfig.front+user.username+">"
			+user.screenName
			+"</a>"
			+" @" + user.username; 
		node.cNodes["sr-avatar"].src =  user.profilePictureMediumUrl ;
		node.cNodes["sr-user"].value = user.username;
		return node;
	}

}
function genUpControls(username){
	var controls = gNodes["up-controls"].cloneAll();
	var sub = controls.cNodes["up-s"];
	var user = gUsers.byName[username];
	if (typeof user !== "undifined") gen();
	else new Promise(function(resolve, reject){
		var oReq = new XMLHttpRequest();
		oReq.onload = function(){
			if(this.status < 400){
				var oRes = JSON.parse(oReq.response);
				addUser(oRes.users);
				user = gUsers.byName[comment.user];
				resolve();
			}
		};
		oReq.open("get",gConfig.serverURL + "users/"+username, true);
		oReq.setRequestHeader("X-Authentication-Token", gConfig.token);
		oReq.send();
	}).then(gen);
	function gen() {
		controls.user = username;
		sub.innerHTML = user.friend?"Unsubscribe":"Subscribe";
		sub.subscribed = user.friend;
		if (!user.friend && (user.isPrivate == 1 )){
			sub.removeEventListener("click",subscribe);
			var oRequests = new Object();
			if (Array.isArray(gMe.requests)){
				gMe.requests.forEach(function(req){
					oRequests[req.id] = req;
				});
			}
			if(Array.isArray(gMe.users.subscriptionRequests)
			&&gMe.users.subscriptionRequests.some(function(a){
					return oRequests[a].username == username
				})){
				controls.cNodes["up-s"] = document.createElement("span");
				controls.cNodes["up-s"].innerHTML = "Subscription request sent";
				controls.replaceChild(controls.cNodes["up-s"], sub);
			}else{
				sub.innerHTML = "Request subscription";
				sub.addEventListener("click", reqSubscription);
			}
		}
		if(user.friend && user.subscriber){
			controls.cNodes["up-d"].href = gConfig.front + "filter/direct#"+username;
			controls.cNodes["up-d"].target = "_blank";
		}else{
			controls.cNodes["up-d"].hidden = true;
			controls.cNodes["up-d"].nextSibling.hidden = true;
		}
		var aBan = controls.cNodes["up-b"];
		if (user.type == "group"){
			aBan.nextSibling.hidden = true;
			aBan.hidden = true;
			return;
		}
		aBan.banned = gMe.users.banIds.some(function(a){
			return a == user.id;
		});
		if (aBan.banned){
			aBan.innerHTML = "Un-ban";
			aBan.removeEventListener("click",genBlock);
			aBan.addEventListener("click", doUnBan);
		}
	}
	return controls;
}

function addPosts(drop, toAdd, offset){
	var url = matrix.cfg.srvurl + "posts?offset="+offset+"&limit="+(toAdd*matrix.cfg.mul);
	var oReq = new XMLHttpRequest();
	oReq.onload = function(){
		if(oReq.status < 400){
			var res = JSON.parse(oReq.response);
			var cRemain = toAdd + drop;
			if(typeof res.posts !=="undefined"){
				for(var idx = 0; idx < res.posts.length; idx++  ){
					var nodePost = genPost(res.posts[idx]);
					if (nodePost){
						nodePost.rawData.updatedAt = nodePost.rawData.createdAt;
						if(!(--cRemain)) break;
					}
				}
			}
			if(cRemain&&(res.posts.length == (toAdd*matrix.cfg.mul))) addPosts(drop, cRemain,offset+idx  );
			else {
				doPrivComments(drop);
			}
		}else gPrivTimeline.done = false;
	}
	oReq.open("get",url,true);
	oReq.send();
}
function doPrivComments(drop){
	var limit = 100;
	var url = matrix.cfg.srvurl + "cmts?limit="+limit;
	var oReq = new XMLHttpRequest();
	oReq.onload = function(){
		var arrComPr = new Array();
		if(oReq.status < 400){
			var res = JSON.parse(oReq.response);
			if(typeof res.posts !=="undefined"){
				res.posts.forEach(function (post){arrComPr.push(drawPrivateComment(post));});
			}
		}
		Promise.all(arrComPr).then(function(){
			gPrivTimeline.posts.forEach(function(nodePost){
				var nodeComments = nodePost.cNodes["post-body"].cNodes["comments"];
				if(nodeComments.childNodes.length < gConfig.likesFold)
					for(var idx = 0; idx < nodeComments.childNodes.length; idx++)
						nodeComments.childNodes[idx].hidden = false;
				else{
					for(var idx = 0; idx < 2; idx++)
						nodeComments.childNodes[idx].hidden = false;
					var nodeComment = gNodes["comment"].cloneAll();
					nodeComment.id = nodePost.id+"-ufc";
					nodeComment.cNodes["comment-date"].innerHTML = "";
					nodeComment.cNodes["comment-body"].innerHTML = '<a onclick="unfoldPrivComm(\''+nodePost.id+'-ufc\')" style="font-style: italic;">'+(nodeComments.childNodes.length-3)*1 +" more comments</a>";
					nodeComments.insertBefore( nodeComment, nodeComments.childNodes[2]);
					nodeComments.lastChild.hidden = false;
				}
			});
			gPrivTimeline.posts.sort(function (a,b){return a.rawData.updatedAt<b.rawData.updatedAt?1:-1;});
			gPrivTimeline.posts.splice(0,drop);
			var tmp = gPrivTimeline.posts.slice();
			var privPost = tmp[0];
			if(!privPost)return;
			for(var idx = 0; idx< document.posts.childNodes.length; idx++){
				var pubPost = document.posts.childNodes[idx];
				if(privPost.rawData.updatedAt>pubPost.rawData.updatedAt){
					document.posts.insertBefore(tmp.shift(),pubPost );
					privPost = tmp[0];
					if (typeof privPost === "undefined")break;
				}
			}
			tmp.forEach(function(post){document.posts.appendChild(post);});
		});
	}
	oReq.open("get",url,true);
	oReq.send();
}
function unfoldPrivComm(id){
	var nodeComment = document.getElementById(id);
	for(var idx = 0; idx < nodeComment.parentNode.childNodes.length; idx++)
		nodeComment.parentNode.childNodes[idx].hidden = false;
	nodeComment.parentNode.removeChild(nodeComment);


}
function showHidden(e){
	if(e.target.action){
		if(!document.hiddenCount)return;
		var nodeHiddenPosts = document.createElement("div");
		nodeHiddenPosts.id = "hidden-posts";
		document.hiddenPosts.forEach(function(oHidden){if(oHidden.is)nodeHiddenPosts.appendChild(genPost(oHidden.data));});
		e.target.parentNode.parentNode.insertBefore(nodeHiddenPosts , e.target.parentNode.nextSibling);
		e.target.innerHTML =  "Collapse "+ document.hiddenCount + " hidden entries";
	}else{
		var nodeHiddenPosts = document.getElementById("hidden-posts");
		if (nodeHiddenPosts) nodeHiddenPosts.parentNode.removeChild(nodeHiddenPosts);
		if (document.hiddenCount) e.target.innerHTML = "Show "+ document.hiddenCount + " hidden entries";
		else e.target.innerHTML = "";
	}
	e.target.action = !e.target.action;
}
function postHide(e){
	var victim = e.target; do victim = victim.parentNode; while(victim.className != "post");
	var oReq = new XMLHttpRequest();
	var action = e.target.action;
	oReq.onload = function(){
		if(this.status < 400){
			doHide(victim, action, "user");
		};
	}
		oReq.open("post",gConfig.serverURL + "posts/"+ victim.id+"/"+(action?"hide":"unhide"), true);
		oReq.setRequestHeader("X-Authentication-Token", gConfig.token);
		oReq.send();
}
function doHide(victim, action,src ){
	var nodeHide = victim.cNodes["post-body"].cNodes["post-info"].cNodes["post-controls"].nodeHide;
	if(action != nodeHide.action) return;
	victim.rawData.isHidden = action;
	nodeHide.action = !action;
	var nodeShow = document.getElementsByClassName("show-hidden")[0]
	if (!nodeShow){
		nodeShow = gNodes["show-hidden"].cloneAll();
		nodeShow.cNodes["href"].action = true;
		document.getElementById("content").appendChild(nodeShow);
	}
	var aShow =  nodeShow.cNodes["href"];
	if(action){
		document.hiddenPosts[victim.rawData.idx].is  = true;
		victim.parentNode.removeChild(victim);
		document.hiddenCount++;
		aShow.action = false;
		aShow.dispatchEvent(new Event("click"));
	}else{
		var count = 0;
		var idx = victim.rawData.idx;
		do if(document.hiddenPosts[idx--].is)count++;
		while ( idx >0 );
		if ((victim.rawData.idx - count+1) >= document.posts.childNodes.length )document.posts.appendChild(victim);
		else document.posts.insertBefore(victim, document.posts.childNodes[victim.rawData.idx - count+1]);
		nodeHide.innerHTML = "Hide";
		document.hiddenPosts[victim.rawData.idx].is = false;
		document.hiddenCount--;
		if(document.hiddenCount) aShow.innerHTML = "Collapse "+ document.hiddenCount + " hidden entries";
		else aShow.dispatchEvent(new Event("click"));
	}

}
function regenHides(){
	var idx = 0;
	document.hiddenPosts.forEach(function(victim){
		victim.data.idx = idx++;
	});
}
function updateDate(node){
	node.innerHTML =  relative_time(node.date);
	var txtdate = new Date(node.date).toString();
	node.title = txtdate.slice(0, txtdate.indexOf("(")).trim();
	window.setTimeout(updateDate, 30000, node );
}
function drawPrivateComment(post) {
	return new Promise(function(resolve,reject){
		var cpost = matrix.decrypt(post.body);
		if (typeof cpost.error !== "undefined")return;
		cpost = JSON.parse(cpost);
		if (typeof cpost.payload.author === "undefined" ) return spam();
		var nodeComment;
		matrix.verify(JSON.stringify(cpost.payload), cpost.sign, cpost.payload.author).then(ham,spam);
		function ham(){
			var nodePriv = gPrivTimeline.postsById[cpost.payload.postid];
			if(!nodePriv)return;
			var comment = {"body":cpost.payload.data,
					"createdAt":Date.parse(post.createdAt),
					"id":post.id,
					"user":cpost.payload.author
					};
			nodeComment = genComment(comment);
			nodeComment.hidden = true;
			nodeComment.sign = cpost.sign;
			gComments[post.id] = comment;
			if(comment.createdAt > nodePriv.rawData.updatedAt) nodePriv.rawData.updatedAt = comment.createdAt;
			nodePriv.cNodes["post-body"].cNodes["comments"].insertBefore(nodeComment,nodePriv.cNodes["post-body"].cNodes["comments"].firstChild);
			resolve();
		}
		function spam(){reject()};
	});
}
function embedPreview(oEmbedPrs, victim, target){
	var oEmbedURL;
	var m;
	if((m = /^https:\/\/docs\.google\.com\/(document|spreadsheets|presentation|drawings)\/d\/([^\/]+)/.exec(victim)) !== null) {
		new Promise(function(resolve,reject){
			var oReq = new XMLHttpRequest();
			oReq.onload = function(){
				if(oReq.status < 400)
					resolve(JSON.parse(oReq.response));
				else reject(oReq.response);
			}

			oReq.open("get","https://www.googleapis.com/drive/v2/files/" + m[2] + "?key=AIzaSyA8TI6x9A8VdqKEGFSE42zSexn5HtUkaT8",true);
			oReq.send();
		}).then(function(info){
			//var nodeiFrame = document.createElement("iframe");
			//nodeiFrame.src = info.embedLink;
			var nodeA = document.createElement("a");
			var img = document.createElement("img");
			var width = document.getElementById("content").clientWidth*3/4;
			img.src = info.thumbnailLink.replace("=s220","=w"+ width+"-c-h"+ width/5 );// "=s"+document.getElementById("content").clientWidth/2+"-p");
			var node = document.createElement("div");
			node.className = "att-img";
			nodeA.appendChild(img);
			nodeA.href = victim;
			node.appendChild(nodeA);
			target.appendChild(node);
			img.onerror=function(){nodeA.hidden = true;};
		});
	return;	
	}else if (/^https?:\/\/(www\.)?pinterest.com\/pin\/.*/.exec(victim) !== null){
		var node = document.createElement("div");
		node.className = "att-img";
		node.innerHTML = '<a data-pin-do="embedPin" href="' + victim + '"></a>';
		target.appendChild(node);
		return;
	}
	var bIsOEmbed = oEmbedPrs.some(function(o){
		return o.endpoints.some(function(endp){
			if(!endp.schemes)console.log(endp.url)
			else if (endp.schemes.some(function (scheme){
				return victim.match(scheme) != null; })){
				oEmbedURL = "https://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20json%20where%20url%3D'"
					+ encodeURIComponent(endp.url 
						+ "?url=" + victim 
						+ "&format=json"
						+ "&maxwidth="+document.getElementById("content").clientWidth*3/4
					)
					+ "'&format=json";
				return true;
			}else return false;
		});
	});

	if(bIsOEmbed){
		new Promise(function(resolve,reject){
			var oReq = new XMLHttpRequest();
			oReq.onload = function(){
				if(oReq.status < 400)
					resolve(JSON.parse(oReq.response));
				else reject(oReq.response);
			}

			oReq.open("get",oEmbedURL,true);
			oReq.send();
		}).then(function(qoEmbed){
			if (!qoEmbed.query.count) return;
			var oEmbed = qoEmbed.query.results.json;
			if(oEmbed.type == "photo"){
				target.appendChild(oEmbedImg(oEmbed.url,victim));
			}else if (typeof oEmbed.html !== "undefined"){
				if(oEmbed.html.indexOf("iframe") == 1){
					var node = document.createElement("div");
					node.innerHTML = oEmbed.html;
					target.appendChild(node);
				}else if(typeof oEmbed.thumbnail_url !== "undefined"){
					target.appendChild(oEmbedImg(oEmbed.thumbnail_url,victim));
				}else{
					var iframe = document.createElement("iframe");	
					iframe.sandbox = true;
					iframe.srcdoc = oEmbed.html;
					iframe.style.width = oEmbed.width;
					iframe.style.height = oEmbed.height;
					target.appendChild(iframe);
				}
			}
		},doEmbedly );
	}else doEmbedly();
	function oEmbedImg(url,victim){
		if(!url.match(/^['"]?https?/)) return document.createElement("img");
		var img = document.createElement("img");
		img.src = url;
		//img.style.width = oEmbed.width;
		//img.style.height = oEmbed.height;
		var node = document.createElement("a");
		node.appendChild(img);
		return node;	
	}
	function doEmbedly(){
		var aEmbed = document.createElement("a");
		aEmbed.href = victim;
		aEmbed.className = "embedly-card";
		target.appendChild(aEmbed);
	}
}
function genPost(post){
	function spam(){nodePost = document.createElement("span");};
	function ham(){
		nodePost.feed = cpost.payload.feed;
		gPrivTimeline.posts.push(nodePost);
		gPrivTimeline.postsById[post.id] = nodePost;
		nodePost.rawData.body = cpost.payload.data;
		postNBody.cNodes["post-cont"].innerHTML = autolinker.link(cpost.payload.data.replace(/\n/g,"").replace(/&/g,"&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"));
		if(typeof user === "undefined"){
			if (gUsers.byName[cpost.payload.author]){
				user = gUsers.byName[cpost.payload.author];
				post.createdBy = user.id;
				gotUser();
			} else if(gUsersQ[cpost.payload.author]) gUsersQ[cpost.payload.author].then(
				function(){
					user = gUsers.byName[cpost.payload.author];
					post.createdBy = user.id;
					gotUser();
				},spam);
			else{
				gUsersQ[cpost.payload.author] = new Promise (function(resolve,reject){

					var oReq = new XMLHttpRequest();
					oReq.onload = function(){
						if(this.status < 400){
							var oRes = JSON.parse(oReq.response);
							addUser(oRes.users);
							user = gUsers.byName[cpost.payload.author];
							post.createdBy = user.id;
							resolve();
						}
					};

					oReq.open("get",gConfig.serverURL + "users/"+post.username, true);
					oReq.setRequestHeader("X-Authentication-Token", gConfig.token);
					oReq.send();
				}).then(gotUser,spam);
			}
		}else gotUser();
	}
	function gotUser(){
		var urlMatch ;		
		if(( typeof gConfig["blockPosts"]!== "undefined")&& (gConfig["blockPosts"] != null)&& (gConfig["blockPosts"][user.id])){
			nodePost.hidden = true  ;
		}
		nodePost.gotLock  = false;
		if(typeof user !== "undefined"){
			nodePost.cNodes["avatar"].cNodes["avatar-h"].innerHTML = '<img src="'+ user.profilePictureMediumUrl+'" />';
			nodePost.cNodes["avatar"].cNodes["avatar-h"].userid = user.id;
			postNBody.cNodes["title"].innerHTML = genTitle(nodePost);
		}
		if(nodePost.gotLock == true)
			postNBody.cNodes["post-info"].cNodes["post-controls"].cNodes["post-lock"].innerHTML = "<i class='fa fa-lock icon'>&nbsp;</i>";
		if(post.attachments){
			var attsNode = postNBody.cNodes["attachments"];
			post.attachments.forEach(function(att){
				var nodeAtt = document.createElement("div");
				var oAtt = gAttachments[att];
				switch(oAtt.mediaType){
				case "image":
					nodeAtt.innerHTML = '<a target="_blank" href="'+oAtt.url+'" border=none ><img src="'+oAtt.thumbnailUrl+'"></a>';
					attsNode.cNodes["atts-img"].appendChild(nodeAtt);
					nodeAtt.className = "att-img";
					break;
				case "audio":
					nodeAtt.innerHTML = '<audio style="height:40" preload="none" controls><source src="'+oAtt.url+'" ></audio> <br><a href="'+oAtt.url+'" target="_blank" ><i class="fa fa-download"></i> '+oAtt.fileName+'</a>';
					nodeAtt.className = "att-audio";
					attsNode.cNodes["atts-audio"].appendChild(nodeAtt);
					break;
				default:
					nodeAtt.innerHTML = '<a href="'+oAtt.url+'" target="_blank" ><i class="fa fa-download"></i> '+oAtt.fileName+'</a>';
					attsNode.appendChild(nodeAtt);

				}
			});		
		}else 
		//if(((urlMatch = post.body.match(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/) )!= null)
		if(((urlMatch = post.body.match(/https?:\/\/[^\s\/$.?#].[^\s]*/i) )!= null)
		&&(window.localStorage.getItem("show_link_preview") == "1")){
			gEmbed.p.then(function(oEmbedPr){
				embedPreview(oEmbedPr
					,urlMatch[0]
					,postNBody.cNodes["attachments"] 
				);
			});
		}
		var anchorDate = document.createElement("a");
		if(typeof user !== "undefined") anchorDate.href = gConfig.front+user.username+"/"+post.id;
		postNBody.cNodes["post-info"].cNodes["post-controls"].cNodes["post-date"].appendChild(anchorDate);
		anchorDate.date = post.createdAt*1;
		window.setTimeout(updateDate, 10,anchorDate);

		if(typeof gMe !== "undefined"){
			var nodeControls;
			if (post.createdBy == gMe.users.id){
				nodeControls = gNodes["controls-self"].cloneAll();
			}else {
				nodeControls = gNodes["controls-others"].cloneAll();
				postNBody.cNodes["post-info"].nodeLike = nodeControls.cNodes["post-control-like"];
				nodeControls.cNodes["post-control-like"].action = true;
			}
			var nodeHide  = gNodes["hide"].cloneAll();
			nodeControls.appendChild(nodeHide);
			var aHide = nodeHide.cNodes["href"]
			aHide.className = "hide";
			aHide.innerHTML = post.isHidden?"Un-hide":"Hide";
			aHide.action = !post.isHidden;
			postNBody.cNodes["post-info"].cNodes["post-controls"].appendChild( nodeControls);
			postNBody.cNodes["post-info"].cNodes["post-controls"].nodeHide = aHide;
		}
		if (post.likes)	genLikes(nodePost );
		if (post.comments){
			if(post.omittedComments){
				if(post.comments[0])
					postNBody.cNodes["comments"].appendChild(genComment(gComments[post.comments[0]]));
				var nodeComment = gNodes["comment"].cloneAll();
				nodeComment.cNodes["comment-date"].innerHTML = "";
				nodeComment.cNodes["comment-body"].innerHTML = "<a id="+post.id+'-unc  onclick="unfoldComm(\''+post.id +'\')" style="font-style: italic;">'+ post.omittedComments+" more comments</a>";
				postNBody.cNodes["comments"].appendChild(nodeComment);
				if(post.comments[1])
					postNBody.cNodes["comments"].appendChild(genComment(gComments[post.comments[1]]));
			}
			else post.comments.forEach(function(commentId){ postNBody.cNodes["comments"].appendChild(genComment(gComments[commentId]))});
		}
		postNBody.cNodes["comments"].cnt = postNBody.cNodes["comments"].childNodes.length;
		if (postNBody.cNodes["comments"].cnt > 4)
				addLastCmtButton(postNBody);
	}
	var nodePost = gNodes["post"].cloneAll();
	var postNBody = nodePost.cNodes["post-body"];
	var user = undefined;
	if(post.createdBy) user = gUsers[post.createdBy];
	nodePost.homed = false;
	nodePost.rawData = post;
	nodePost.id = post.id;
	nodePost.isPrivate = false;

	var cpost = matrix.decrypt(post.body);
	if (typeof cpost.error !== "undefined"){
		switch(cpost.error){
		case "0":
			break;
		case "3":
			gPrivTimeline.noKey[post.id] = post;
			console.log(post.id+": unknown key");
			break;
		case "4":
			gPrivTimeline.noDecipher[post.id] = post;
			console.log("Private keys not loaded");
			break;
		}
		postNBody.cNodes["post-cont"].innerHTML =  autolinker.link(post.body.replace(/\n/g,"").replace(/&/g,"&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"));
		gotUser();
	}else{
		nodePost.isPrivate = true;
		post.createdAt = Date.parse(post.createdAt);
		nodePost.rawData.createdAt = post.createdAt;
		cpost = JSON.parse(cpost);
		if (typeof cpost.payload.author === "undefined" ) return spam();
		matrix.verify(JSON.stringify(cpost.payload), cpost.sign, cpost.payload.author).then(ham,spam);
		nodePost.sign = cpost.sign;
	}
	return nodePost;

}
function genTitle(nodePost){
	var post = nodePost.rawData;
	var user = gUsers[post.createdBy];
	var title = user.link;
	if(nodePost.isPrivate) title += "<span> posted a secret to "+StringView.makeFromBase64(matrix.gSymKeys[cpost.payload.feed].name)+"</span>";
	else if(post.postedTo){
		nodePost.gotLock  = true;
		post.postedTo.forEach(function(id){
			if (gFeeds[id].isPrivate == "0")
				nodePost.gotLock = false;
		});
		if ((post.postedTo.length >1)||(gFeeds[post.postedTo[0]].id!=user.id)){
			title += "<span> posted to: </span>";
			post.postedTo.forEach(function(id){
				title += gFeeds[id].link;
			});
		}
	}
	return title;

}
function unfoldAttImgs(e){
	var nodeAtts = e.target; do nodeAtts = nodeAtts.parentNode; while(nodeAtts.className != "attachments");
	if(nodeAtts.cNodes["atts-unfold"].cNodes["unfold-action"].value == "true"){
		nodeAtts.cNodes["atts-img"].style.display = "block";
		nodeAtts.cNodes["atts-unfold"].getElementsByTagName("a")[0].innerHTML = '<i class="fa fa-chevron-up fa-2x"></i>';
		nodeAtts.cNodes["atts-unfold"].cNodes["unfold-action"].value = "false";
	}else{
		nodeAtts.cNodes["atts-img"].style.display = "flex";
		nodeAtts.cNodes["atts-unfold"].getElementsByTagName("a")[0].innerHTML = '<i class="fa fa-chevron-down fa-2x"></i>';
		nodeAtts.cNodes["atts-unfold"].cNodes["unfold-action"].value = "true";
	}

}
function newPost(e){
	var textField = e.target.parentNode.parentNode.cNodes["edit-txt-area"];
	textField.disabled = true;
	e.target.disabled = true;
	var nodeSpinner = e.target.parentNode.appendChild(gNodes["spinner"].cloneNode(true));
	if(textField.pAtt)textField.pAtt.then(send);
	else send();
	function send(){
		var postdata = new Object();
		var post = new Object();
		var postTo = e.target.parentNode.parentNode.cNodes["new-post-to"];
		postdata.meta = new Object();
		postdata.meta.feeds = postTo.feeds ;
		var oReq = new XMLHttpRequest();
		var onload = function(){
			if(oReq.status < 400){
				var nodeAtt = document.createElement("div");
				nodeAtt.className = "attachments";
				textField.parentNode.replaceChild(nodeAtt,
					textField.parentNode.cNodes["attachments"]);
				textField.parentNode.cNodes["attachments"] = nodeAtt;
				textField.value = "";
				textField.disabled = false;
				delete textField.pAtt;
				delete textField.attachments;
				postTo.feeds = new Array();
				gConfig.regenPostTo();
				e.target.disabled = false;
				textField.style.height  = "4em";
				e.target.parentNode.removeChild(nodeSpinner);
				var res = JSON.parse(oReq.response);
				loadGlobals(res);
				if(!document.getElementById(res.posts.id))document.posts.insertBefore(genPost(res.posts), document.posts.childNodes[0]);
			}else{
				textField.disabled = false;
				e.target.disabled = false;
				e.target.parentNode.removeChild(nodeSpinner );
				var errmsg = "";
				try{
					var eresp = JSON.parse(oReq.response);
					errmsg = eresp.err;
				}catch(e){};
				alert("Error #"+oReq.status+": "+oReq.statusText+" "+errmsg) ;
			}
		};
		if(textField.attachments) post.attachments = textField.attachments;
		postdata.post = post;
		if(postTo.isPrivate){
			oReq.open("post",matrix.cfg.srvurl+"post", true);
			oReq.setRequestHeader("x-content-type", "post");
			oReq.setRequestHeader("Content-type","text/plain");
			oReq.onload = onload;
			var payload =  {
				"feed":postTo.feeds[0],
				"type":"post",
				"author":gMe.users.username,
				"data":textField.value,
			};
			matrix.sign(JSON.stringify(payload)).then(function(sign){
				var token = matrix.mkOwnToken(sign);
				if(!token) return console.log("Failed to make access token");
				oReq.setRequestHeader("x-content-token", token);
				post = matrix.encrypt(postTo.feeds,
					JSON.stringify({"payload":payload,"sign":sign}));
				oReq.setRequestHeader("Content-type","application/json");
				oReq.send(JSON.stringify({"d":post}));
			},function(){console.log("Failed to sign")});
		}else{
			oReq.open("post",gConfig.serverURL + "posts", true);
			oReq.onload = onload;
			oReq.setRequestHeader("Content-type","application/json");
			oReq.setRequestHeader("X-Authentication-Token",
				gConfig.token);
			if (textField.value == ""){
				textField.disabled = false;
				e.target.disabled = false;
				e.target.parentNode.removeChild(nodeSpinner );
				alert("you should provide some text");
				return;
			}
			post.body = textField.value;
			oReq.send(JSON.stringify(postdata));
		}
	}
}
function sendAttachment(e){
	e.target.disabled = true;
	var textField = e.target.parentNode.parentNode.cNodes["edit-txt-area"];
	var nodeSpinner = document.createElement("div");
	nodeSpinner.innerHTML = '<img src="'+gConfig.static+'throbber-100.gif">';
	e.target.parentNode.parentNode.cNodes["attachments"].appendChild(nodeSpinner);
	textField.pAtt = new Promise(function(resolve,reject){
		var oReq = new XMLHttpRequest();
		oReq.onload = function(){
			if(this.status < 400){
				e.target.value = "";
				e.target.disabled = false;
				var attachments = JSON.parse(this.response).attachments;
				var nodeAtt = document.createElement("div");
				nodeAtt.className = "att-img";
				nodeAtt.innerHTML = '<a target="_blank" href="'+attachments.url+'" border=none ><img src="'+attachments.thumbnailUrl+'"></a>';
				nodeSpinner.parentNode.replaceChild(nodeAtt, nodeSpinner);
				if (typeof(textField.attachments) === "undefined" ) textField.attachments = new Array();
				textField.attachments.push(attachments.id);
				resolve();

			}else reject(this.status);
		};

		oReq.open("post",gConfig.serverURL + "attachments", true);
		oReq.setRequestHeader("X-Authentication-Token", gConfig.token);
		var data = new FormData();
		data.append( "name", "attachment[file]");
		data.append( "attachment[file]", e.target.files[0], e.target.value);
		oReq.send(data);
	});
}
function editPost(e) {
	var victim = e.target; do victim = victim.parentNode; while(victim.className != "post");
	var nodeEdit = genEditNode(postEditedPost,cancelEditPost);
	nodeEdit.cNodes["edit-txt-area"].value = victim.rawData.body;
	victim.cNodes["post-body"].replaceChild( nodeEdit, victim.cNodes["post-body"].cNodes["post-cont"]);
}
function cancelEditPost(e){
	 var victim = e.target; do victim = victim.parentNode; while(victim.className != "post");
	 var postCNode = document.createElement("div");
	 postCNode.innerHTML = victim.rawData.body;
	 postCNode.className = "post-cont";
	 victim.cNodes["post-body"].replaceChild(postCNode,e.target.parentNode.parentNode );
	 victim.cNodes["post-body"].cNodes["post-cont"] = postCNode;

}
function postEditedPost(e){
	var nodePost =e.target; do nodePost = nodePost.parentNode; while(nodePost.className != "post");
	var oReq = new XMLHttpRequest();
	e.target.disabled = true;
	oReq.onload = function(){
		if(this.status < 400){
			var post = JSON.parse(oReq.response).posts;
			var postCNode = document.createElement("div");
			var cpost = matrix.decrypt(post.body);
			if (typeof cpost.error === "undefined") {
				cpost = JSON.parse(cpost);
				post.body = cpost.payload.data;
				nodePost.sign = cpost.sign;
			}
			postCNode.innerHTML = autolinker.link(post.body.replace(/\n/g,"").replace(/&/g,"&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"));
			postCNode.className = "post-cont";
			nodePost.rawData = post;
			nodePost.cNodes["post-body"].replaceChild(postCNode,e.target.parentNode.parentNode );
			nodePost.cNodes["post-body"].cNodes["post-cont"] = postCNode;
		}
	};

	var post = new Object();
	post.createdAt = nodePost.rawData.createdAt;
	post.createdBy = nodePost.rawData.createdBy;
	post.updatedAt = Date.now();
	var postdata = new Object();
	postdata.post = post;
	e.target.parentNode.parentNode.cNodes["edit-txt-area"].disabled = true;

	e.target.parentNode.replaceChild(gNodes["spinner"].cloneNode(true),e.target.parentNode.cNodes["edit-buttons-cancel"] );
	var text = e.target.parentNode.parentNode.cNodes["edit-txt-area"].value;
	if(nodePost.isPrivate){
		oReq.open("put",matrix.cfg.srvurl+"edit", true);
		oReq.setRequestHeader("x-content-type", "post");
		oReq.setRequestHeader("Content-type","application/json");
		//oReq.onload = onload;
		var payload =  {
			"feed":nodePost.feed,
			"type":"post",
			"author":gMe.users.username,
			"data":text,
		};
		oReq.setRequestHeader("x-access-token", matrix.mkOwnToken(nodePost.sign));
		matrix.sign(JSON.stringify(payload)).then(function(sign){
			var token = matrix.mkOwnToken(sign);
			if(!token) return console.log("Failed to make access token");
			oReq.setRequestHeader("x-content-token", token);
			oReq.setRequestHeader("x-content-id",nodePost.id);
			post = matrix.encrypt(nodePost.feed,
				JSON.stringify({"payload":payload,"sign":sign}));
			oReq.send(JSON.stringify({"d":post}));
		},function(){console.log("Failed to sign")});
	}else{
		post.body =  text;
		oReq.open("put",gConfig.serverURL + "posts/"+nodePost.id, true);
		oReq.setRequestHeader("X-Authentication-Token", gConfig.token);
		oReq.setRequestHeader("Content-type","application/json");
		oReq.send(JSON.stringify(postdata));
	}
}
function deletePost(e){
	var victim =e.target; do victim = victim.parentNode; while(victim.className != "post");
	deleteNode(victim, doDeletePost);
}
function doDeletePost(but){
	var victim = but.node;
	but.parentNode.parentNode.removeChild(but.parentNode);
	var oReq = new XMLHttpRequest();
	oReq.onload = function(){
		if(this.status < 400){
			document.hiddenPosts.splice(victim.rawData.idx,1);
			//victim.parentNode.removeChild(victim);
			regenHides();
		}
	};
	if(victim.isPrivate){
		oReq.open("delete",matrix.cfg.srvurl+"delete",true);
		oReq.setRequestHeader("x-content-id", victim.id);
		oReq.setRequestHeader("x-access-token", matrix.mkOwnToken(victim.sign));
		oReq.setRequestHeader("x-content-type", "post");
		oReq.send();
	}else{
		oReq.open("delete",gConfig.serverURL + "posts/"+victim.id, true);
		oReq.setRequestHeader("X-Authentication-Token", gConfig.token);
		oReq.setRequestHeader("Content-type","application/json");
		oReq.send();
	}
}
function postLike(e){
	var oReq = new XMLHttpRequest();
	var nodeLikes = e.target.parentNode.parentNode.parentNode.cNodes["likes"];
	var nodePost =nodeLikes; do nodePost = nodePost.parentNode; while(nodePost.className != "post");
	oReq.onload = function(){
		if(this.status < 400){
			if(e.target.action){
				var idx;
				var likesUL;
				if (!nodeLikes.childNodes.length){
					nodeLikes.appendChild(gNodes["likes-smile"].cloneNode(true));
					likesUL = document.createElement( "span");
					likesUL.className ="comma";
					var suffix = document.createElement("span");
					suffix.id = e.target.parentNode.postId+"-unl";
					suffix.innerHTML = " liked this";
					nodeLikes.appendChild(likesUL);
					nodeLikes.appendChild(suffix);

				}else {

				/*	for(idx = 0; idx < nodeLikes.childNodes.length; idx++)
						if (nodeLikes.childNodes[idx].nodeName == "UL")break;
					likesUL = nodeLikes.childNodes[idx];
					*/
					likesUL = nodeLikes.cNodes["comma"];
				}
				var nodeLike = document.createElement("span");
				nodeLike.className = "p-timeline-user-like";
				nodeLike.innerHTML = gUsers[gMe.users.id].link;
				if(likesUL.childNodes.length)likesUL.insertBefore(nodeLike, likesUL.childNodes[0]);
				else likesUL.appendChild(nodeLike);
				e.target.parentNode.parentNode.parentNode.myLike = nodeLike;
				if(!Array.isArray(nodePost.rawData.likes)) nodePost.rawData.likes = new Array();
				nodePost.rawData.likes.unshift(gMe.users.id);
			}else{
				nodePost.rawData.likes.splice(nodePost.rawData.likes.indexOf(gMe.users.id), 1) ;
				var myLike = e.target.parentNode.parentNode.parentNode.myLike;
				likesUL = myLike.parentNode;
				likesUL.removeChild(myLike);
			genLikes(nodePost);

			/*
				if (likesUL.childNodes.length < 2){
					var nodePI = nodeLikes.parentNode;
					nodePI.cNodes["likes"] = document.createElement("div");
					nodePI.cNodes["likes"].className = "likes";
					nodePI.replaceChild(nodePI.cNodes["likes"], nodeLikes);
				}
				*/
			 }
			e.target.innerHTML=e.target.action?"Un-like":"Like";
			e.target.action = !e.target.action;
		}else e.target.innerHTML= !e.target.action?"Un-like":"Like";
	}


		oReq.open("post",gConfig.serverURL + "posts/"+ e.target.parentNode.parentNode.parentNode.parentNode.parentNode.id+"/"+(e.target.action?"like":"unlike"), true);
		oReq.setRequestHeader("X-Authentication-Token", gConfig.token);
		oReq.send();
		e.target.innerHTML = "";
		e.target.appendChild(gNodes["spinner"].cloneAll());

}
function genEditNode(post,cancel){
	var nodeEdit = gNodes["edit"].cloneAll();
	nodeEdit.cNodes["edit-buttons"].cNodes["edit-buttons-post"].addEventListener("click",post);
	nodeEdit.cNodes["edit-buttons"].cNodes["edit-buttons-cancel"].addEventListener("click",cancel);
	gConfig.cTxt = nodeEdit.cNodes["edit-txt-area"];
	return nodeEdit;
}
function addComment(e){
	var postNBody = e.target; do postNBody = postNBody.parentNode; while(postNBody.className != "post-body");
	if(postNBody.isBeenCommented === true)return;
	postNBody.isBeenCommented = true;
	var nodeComment = gNodes["comment"].cloneAll();
	nodeComment.cNodes["comment-body"].appendChild(genEditNode(postNewComment,cancelNewComment));
	nodeComment.userid = gMe.users.id;
	postNBody.cNodes["comments"].appendChild(nodeComment);
	nodeComment.getElementsByClassName("edit-txt-area")[0].focus();
}
function editComment(e){
	var victim = e.target; do victim = victim.parentNode; while(victim.className != "comment");
	var nodeEdit = genEditNode(postEditComment,cancelEditComment);
	nodeEdit.cNodes["edit-txt-area"].value = gComments[victim.id].body;
	victim.replaceChild( nodeEdit, victim.cNodes["comment-body"]);
	victim.cNodes["comment-body"] = nodeEdit;
	nodeEdit.className = "comment-body";
	victim.getElementsByClassName("edit-txt-area")[0].focus();
}
function sendEditedPrivateComment(textField, nodeComment, nodePost){
	var oReq = new XMLHttpRequest();
	oReq.onload = function(){
		if(this.status < 400){
			var res = JSON.parse(this.response);
			var cpost = JSON.parse(matrix.decrypt(res.posts.body));
			var comment = {
				"body":cpost.payload.data,
				"createdAt":Date.parse(res.posts.createdAt),
				"user":cpost.payload.author,
				"feed":cpost.payload.id,
				"id":res.posts.id
			};
			gComments[res.posts.id] = comment;
			var nodeNewComment = genComment(comment);
			nodeNewComment.sign = cpost.sign;

			nodeComment.parentNode.replaceChild(nodeNewComment,nodeComment);
		}
	};

	oReq.open("put",matrix.cfg.srvurl+"edit", true);
	oReq.setRequestHeader("Content-type","application/json");
	var post = new Object();
	var payload =  {
		"id":nodePost.feed,
		"type":"comment",
		"data":textField.value,
		"author":gMe.users.username,
		"postid":nodePost.id
	};
	oReq.setRequestHeader("x-access-token", matrix.mkOwnToken(nodeComment.sign));
	oReq.setRequestHeader("x-content-id", nodeComment.id);
	oReq.setRequestHeader("x-content-type", "comment");
	matrix.sign(JSON.stringify(payload)).then(function(sign){
		var token = matrix.mkOwnToken(sign);
		if(!token) return console.log("Failed to make access token");
		oReq.setRequestHeader("x-content-token", token);
		post = matrix.encrypt(nodePost.feed,
			JSON.stringify({"payload":payload,"sign":sign}));
		oReq.send(JSON.stringify({"d":post}));
	},function(){console.log("Failed to sign")});


}
function postEditComment(e){
	var nodeComment = e.target; do nodeComment = nodeComment.parentNode; while(nodeComment.className != "comment");
	var nodePost =nodeComment; do nodePost = nodePost.parentNode; while(nodePost.className != "post");
	var textField = e.target.parentNode.parentNode.cNodes["edit-txt-area"];
	e.target.disabled = true;
	e.target.parentNode.replaceChild(gNodes["spinner"].cloneNode(true),e.target.parentNode.cNodes["edit-buttons-cancel"] );
	if(nodePost.isPrivate){
		sendEditedPrivateComment(textField, nodeComment, nodePost);
		return;
	}
	var comment = gComments[nodeComment.id];
	comment.body = textField.value ;
	comment.updatedAt = Date.now();
	var oReq = new XMLHttpRequest();
	oReq.onload = function(){
		if(this.status < 400){
			var comment = JSON.parse(this.response).comments;
			nodeComment.parentNode.replaceChild(genComment(comment),nodeComment);
			gComments[comment.id] = comment;

		}
	};

	oReq.open("put",gConfig.serverURL + "comments/"+comment.id, true);
	oReq.setRequestHeader("X-Authentication-Token", gConfig.token);
	oReq.setRequestHeader("Content-type","application/json");
	var postdata = new Object();
	postdata.comment = comment;
	postdata.users = new Array(gMe);
	oReq.send(JSON.stringify(postdata));

};
function cancelEditComment(e){
	var nodeComment = e.target; do nodeComment = nodeComment.parentNode; while(nodeComment.className != "comment");
	 nodeComment.parentNode.replaceChild(genComment( gComments[nodeComment.id]),nodeComment);
};
function processText(e) {
	gConfig.cTxt = e.target;
	if (e.target.scrollHeight > e.target.clientHeight)
		e.target.style.height = e.target.scrollHeight + "px";
	if (e.which == "13"){
		var text = e.target.value;
		e.preventDefault();
		e.stopImmediatePropagation();
		//if(text.charAt(text.length-1) == "\n") e.target.value = text.slice(0, -1);
		e.target.parentNode.cNodes["edit-buttons"].cNodes["edit-buttons-post"].dispatchEvent(new Event("click"));
	}

}
function cancelNewComment(e){
	var postNBody = e.target; do postNBody = postNBody.parentNode; while(postNBody.className != "post-body");
	postNBody.isBeenCommented = false;
	if(typeof postNBody.bumpLater !== "undefined")setTimeout(postNBody.bumpLater, 1000);
	var nodeComment =e.target; do nodeComment = nodeComment.parentNode; while(nodeComment.className != "comment");
	nodeComment.parentNode.removeChild(nodeComment);

}
function postNewComment(e){
	e.target.disabled = true;
	e.target.parentNode.replaceChild(gNodes["spinner"].cloneNode(true),e.target.parentNode.cNodes["edit-buttons-cancel"] );
	sendComment(e.target.parentNode.previousSibling);
	var nodeComments =e.target; do nodeComments = nodeComments.parentNode; while(nodeComments.className != "comments");
	nodeComments.cnt++;
}
function deleteComment(e){
	var nodeComment = e.target; do nodeComment = nodeComment.parentNode; while(nodeComment.className != "comment");
	deleteNode(nodeComment,doDeleteComment);
}
function deleteNode(node,doDelete){
	var nodeConfirm = document.createElement("div");
	var butDelete = document.createElement("button");
	butDelete.innerHTML = "delete";
	butDelete.node = node;
	butDelete.onclick = function(){doDelete(butDelete);};
	var butCancel0 = document.createElement("button");
	butCancel0.innerHTML = "cancel";
	butCancel0.onclick = function (){deleteCancel(nodeConfirm)};
	var aButtons = [butDelete,butCancel0] ;
	nodeConfirm.innerHTML = "<p>Sure delete?</p>";
	aButtons.forEach(function(but){ but.className = "confirm-button";});
	nodeConfirm.appendChild(aButtons.splice(Math.floor(Math.random()*2 ),1)[0]);
	nodeConfirm.appendChild(aButtons[0]);
	node.parentNode.insertBefore(nodeConfirm,node);
	nodeConfirm.node = node;
	node.hidden = true;

}
function deleteCancel(nodeConfirm){
	nodeConfirm.node.hidden = false;
	nodeConfirm.parentNode.removeChild(nodeConfirm);
}

function doDeleteComment(but){
	var nodeComment = but.node;
	var nodePost =nodeComment; do nodePost = nodePost.parentNode; while(nodePost.className != "post");
	but.parentNode.parentNode.removeChild(but.parentNode);
	but.node.hidden = false;
	var oReq = new XMLHttpRequest();
	oReq.onload = function(){
		if(this.status < 400){
			if(nodeComment.parentNode) nodeComment.parentNode.removeChild(nodeComment);
			delete gComments[nodeComment.id];
		}
	};
	if(nodePost.isPrivate){
		oReq.open("delete",matrix.cfg.srvurl+"delete",true);
		oReq.setRequestHeader("x-content-id", nodeComment.id);
		oReq.setRequestHeader("x-access-token", matrix.mkOwnToken(nodeComment.sign));
		oReq.setRequestHeader("x-content-type", "comment");
		oReq.send();
	}else{
		oReq.open("delete",gConfig.serverURL + "comments/"+nodeComment.id, true);
		oReq.setRequestHeader("X-Authentication-Token", gConfig.token);
		oReq.setRequestHeader("Content-type","application/json");
		oReq.send();
	}
}
function getUsername(e){
	var node = e.target; do node = node.parentNode; while(typeof node.user === "undefined");
	if ( gConfig.cTxt == null ) return;
	gConfig.cTxt.value += "@" + node.user;
}
function sendPrivateComment( textField, nodeComment, nodePost){
	textField.disabled = true;
	var oReq = new XMLHttpRequest();
	oReq.onload = function(){
		if(this.status < 400){
			textField.value = "";
			textField.disabled = false;
			textField.style.height  = "4em";
			var res = JSON.parse(this.response);
			var cpost = JSON.parse(matrix.decrypt(res.posts.body));
			var comment = {"body":cpost.payload.data,
					"createdAt":Date.parse(res.posts.createdAt),
					"user":cpost.payload.author,
					"id":res.posts.id
					};
			gComments[comment.id] = comment;
			textField.parentNode.cNodes["edit-buttons"].cNodes["edit-buttons-post"].disabled = false;
			if( nodeComment.parentNode.childNodes.length > 4 ) addLastCmtButton(nodePost.cNodes["post-body"]);
			var nodeNewComment = genComment(comment);
			nodeNewComment.sign = cpost.sign;
			nodeComment.parentNode.replaceChild(nodeNewComment,nodeComment);
		}
	};

	oReq.open("post",matrix.cfg.srvurl+"post", true);
	oReq.setRequestHeader("Content-type","application/json");
	var post = new Object();
	var payload =  {
		"id":nodePost.feed,
		"type":"comment",
		"data":textField.value,
		"author":gMe.users.username,
		"postid":nodePost.id
	};
	oReq.setRequestHeader("x-content-type", "comment");
	matrix.sign(JSON.stringify(payload)).then(function(sign){
		var token = matrix.mkOwnToken(sign);
		if(!token) return console.log("Failed to make access token");
		oReq.setRequestHeader("x-content-token", token);
		post = matrix.encrypt(nodePost.feed,
			JSON.stringify({"payload":payload,"sign":sign}));
		oReq.send(JSON.stringify({"d":post}));
	},function(){console.log("Failed to sign")});

}
function sendComment(textField){
	var nodeComment =textField; do nodeComment = nodeComment.parentNode; while(nodeComment.className != "comment");
	var nodePost =nodeComment; do nodePost = nodePost.parentNode; while(nodePost.className != "post");
	nodePost.cNodes["post-body"].isBeenCommented = false;
	if(typeof nodePost.cNodes["post-body"].bumpLater !== "undefined")setTimeout(nodePost.cNodes["post-body"].bumpLater, 1000);
	if(nodePost.isPrivate){
		sendPrivateComment(textField, nodeComment, nodePost);
		return;
	}
	textField.parentNode.cNodes["edit-buttons"].cNodes["edit-buttons-post"].disabled = true;
	var comment = new Object();
	comment.body = textField.value;
	comment.postId = nodePost.id;
	comment.createdAt = null;
	comment.createdBy = null;
	comment.updatedAt = null;
	comment.post = null;
	var oReq = new XMLHttpRequest();
	oReq.onload = function(){
		if(this.status < 400){
			var comment = JSON.parse(this.response).comments;
			gComments[comment.id] = comment;
			if( nodeComment.parentNode.childNodes.length > 4 ) addLastCmtButton(nodePost.cNodes["post-body"]);
			if(!document.getElementById(comment.id))nodeComment.parentNode.replaceChild(genComment(comment),nodeComment);
			else nodeComment.parentNode.removeChild(nodeComment);
		}
	};

	oReq.open("post",gConfig.serverURL + "comments", true);
	oReq.setRequestHeader("X-Authentication-Token", gConfig.token);
	oReq.setRequestHeader("Content-type","application/json");
	var postdata = new Object();
	postdata.comment = comment;
	oReq.send(JSON.stringify(postdata));
}/*
function genPComment(cpost){
	var nodeComment = gNodes["comment"].cloneAll();
	var cUser = gUsers[comment.createdBy];
<<<<<<< HEAD
	nodeComment.cNodes["comment-body"].innerHTML = autolinker.link(comment.body.replace(/&/g,"&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"))+ " - " + cUser.link ;
=======
	nodeComment.cNodes["comment-body"].innerHTML = autolinker.link(comment.body.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"))+ " - " + cUser.link ;
>>>>>>> master
	nodeComment.id = comment.id;
	nodeComment.createdAt = comment.createdAt;
	if(typeof gMe !== "undefined")
		if(cUser.id == gMe.users.id)
			nodeComment.cNodes["comment-body"].appendChild(gNodes["comment-controls"].cloneAll());
	 return nodeComment;

}
*/
function genComment(comment){
	var nodeComment = gNodes["comment"].cloneAll();
	var cUser = gUsers[comment.createdBy];
	var nodeSpan = document.createElement("span");
	nodeComment.userid = null;
	function gotUser(){
		nodeComment.userid = cUser.id;
		nodeSpan.innerHTML += " - " + cUser.link ;
		if(typeof gMe !== "undefined"){
			if(cUser.id == gMe.users.id)
				nodeComment.cNodes["comment-body"].appendChild(gNodes["comment-controls"].cloneAll());
			else if(!cUser.friend) nodeComment.cNodes["comment-date"].cNodes["date"].style.color = "#787878";
		}
		if(( typeof gConfig["blockComments"]!== "undefined") && ( gConfig["blockComments"]!= null) && (gConfig["blockComments"][cUser.id]))
			nodeComment.innerHTML = "---";

	}
	function spam(){nodeComment = document.createElement("span");};
	nodeComment.cNodes["comment-body"].appendChild(nodeSpan);
	nodeSpan.innerHTML = autolinker.link(comment.body.replace(/\n/g,"").replace(/&/g,"&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"));
	nodeComment.id = comment.id;
	nodeComment.createdAt = comment.createdAt;
	if(typeof cUser !== "undefined"){
		gotUser();
	}else if(comment.user) {
		if (gUsers.byName[comment.user]) {
			cUser = gUsers.byName[comment.user];
			gotUser();
		}
		else if(gUsersQ[comment.user]) gUsersQ[comment.user].then(gotUser,spam);
		else{
			gUsersQ[comment.user] = new Promise (function(resolve,reject){

				var oReq = new XMLHttpRequest();
				oReq.onload = function(){
					if(this.status < 400){
						var oRes = JSON.parse(oReq.response);
						addUser(oRes.users);
						cUser = gUsers.byName[comment.user];
						resolve();
					}
				};
				oReq.open("get",gConfig.serverURL + "users/"+comment.username, true);
				oReq.setRequestHeader("X-Authentication-Token", gConfig.token);
				oReq.send();
			}).then(gotUser,spam);
		}
	}
	return nodeComment;
}
function addLastCmtButton(postNBody){
	if (postNBody.lastCmtButton == true)return;
	var aAddComment = document.createElement("a");
	var aIcon = document.createElement("a");
	aAddComment.className = "post-control-comment";
	aIcon.className = "fa-stack fa-1x";
	aIcon.innerHTML = '<i class="fa fa-comment-o fa-stack-1x"></i>'
	+'<i class="fa fa-square fa-inverse fa-stack-1x" style="left: 3px; top: 3px; font-size: 60%"></i>'
	+'<i class="fa fa-plus fa-stack-1x" style="left: 3px; top: 3px; font-size: 60%"></i>';
	aAddComment.innerHTML  = "Add comment";
	aAddComment.addEventListener("click",addComment);
	postNBody.appendChild(aIcon);
	postNBody.appendChild(aAddComment );
	postNBody.lastCmtButton = true;
}
function unfoldComm(id){
	var post = document.getElementById(id).rawData;
	var oReq = new XMLHttpRequest();
	var spUnfold = document.getElementById(id+"-unc").parentNode.appendChild(document.createElement("i"));
	spUnfold.className = "fa fa-spinner fa-pulse";
	oReq.onload = function(){
		if(oReq.status < 400){
			var postUpd = JSON.parse(this.response);
			loadGlobals(postUpd);
			document.getElementById(id).rawData = post;
			var nodePB = document.getElementById(id).cNodes["post-body"];
			nodePB.isBeenCommented = false;
			if(typeof nodePB.bumpLater !== "undefined")setTimeout(postPB.bumpLater, 1000);
			nodePB.removeChild(nodePB.cNodes["comments"]);
			nodePB.cNodes["comments"] = document.createElement("div");
			nodePB.cNodes["comments"].className = "comments";

			postUpd.comments.forEach(function(cmt){gComments[cmt.id] =cmt; nodePB.cNodes["comments"].appendChild(genComment(cmt))});
			nodePB.appendChild(nodePB.cNodes["comments"]);
			addLastCmtButton(nodePB);
			nodePB.cNodes["comments"].cnt = postUpd.comments.length;

		}else{
			spUnfold.parentNode.removeChild(spUnfold);
			console.log(oReq.toString());

		};
	};

	oReq.open("get",gConfig.serverURL + "posts/"+post.id+"?maxComments=all&maxLikes=0", true);
	oReq.setRequestHeader("X-Authentication-Token", gConfig.token);
	oReq.send();


}
function calcCmtTime(e){
	if (typeof(e.target.parentNode.parentNode.parentNode.createdAt) !== "undefined" ){
		var absUxTime = e.target.parentNode.parentNode.parentNode.createdAt*1;
		var txtdate = new Date(absUxTime ).toString();

		e.target.title =  relative_time(absUxTime) + " ("+ txtdate.slice(0, txtdate.indexOf("(")).trim()+ ")";
	}
}
function genCNodes(node, proto){
	node.cNodes = new Object();
	for(var idx = 0; idx <  node.childNodes.length; idx++){
		genCNodes(node.childNodes[idx], proto.childNodes[idx]);
		node.cNodes[node.childNodes[idx].className] = node.childNodes[idx];
	}
	if (typeof(proto.e) !== "undefined" )
		for(var action in proto.e)
			node.addEventListener(action, window[proto.e[action]]);
}
function genNodes(templates){
	var nodes = new Array();
	//oTemplates = JSON.parse(templates);
	templates.forEach(function(template){
				if (!template.t)template.t = "div";
				var node = document.createElement(template.t);
				node.cloneAll = function(){
					var newNode = this.cloneNode(true);
					genCNodes(newNode, this);
					return newNode;
				};
				if(template.c)node.className = template.c;
				if(template.children)
				genNodes(template.children).forEach(function(victim){
					node.appendChild(victim);
				});
				if(template.txt) node.innerHTML = template.txt;
				if(template.e) node.e = template.e;
				if(template.p) for( var p in template.p) node[p] =  template.p[p];
				nodes.push(node);
			} );
	return nodes;

}
function auth(check){
	gConfig.token = getCookie(gConfig.tokenPrefix + "authToken");
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
		addIcon("favicon.ico");
		var nodeAuth = document.createElement("div");
		nodeAuth.className = "nodeAuth";
		nodeAuth.innerHTML = '<div id=auth-msg style="color:white; font-weight: bold;">&nbsp;</div><form action="javascript:" onsubmit=getauth(this)><table><tr><td>Username</td><td><input name="username" id=a-user type="text"></td></tr><tr><td>Password</td><td><input name="password" id=a-pass type="password"></td></tr><tr><td>&nbsp;</td><td><input type="submit" value="Log in" style=" font-size: large; height: 2.5em; width: 100%; margin-top: 1em;" ></td></tr></table></form>';
		document.getElementsByTagName("body")[0].appendChild(nodeAuth);
	}
	return false;

}
function refreshgMe(){
	window.localStorage.setItem("gMe",JSON.stringify(gMe));
	delete gUsers[gMe.users.id];
	addUser(gMe.users);
	var links = document.getElementsByClassName("my-link");
	for(var idx = 0; idx< links.length; idx++)
		links[idx].outerHTML = gMe.users.link;
	var nodeSR = document.getElementById("sr-info");
	if(!nodeSR)return;
	if(Array.isArray(gMe.users.subscriptionRequests)){
		nodeSR.cNodes["sr-info-a"].innerHTML = "You have "
		+ gMe.users.subscriptionRequests.length 
		+ " subscription requests to review.";
		nodeSR.hidden = false;
		gConfig.subReqsCount = gMe.users.subscriptionRequests.length;
	}else{
		gConfig.subReqsCount = 0;
		nodeSR.hidden = true;
	}
	
}
function getauth(oFormElement){
	var oReq = new XMLHttpRequest();
	oReq.onload = function(){
		if(this.status < 400){
			setCookie(gConfig.tokenPrefix + "authToken", JSON.parse(this.response).authToken);
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
function logout(){
	matrix.ready = 0;
	try{matrix.logout();}catch(e){};
	window.localStorage.removeItem("gMe");
	deleteCookie(gConfig.tokenPrefix + "authToken");
	location.reload();
}
function ctrlPriv(){
	if(typeof gMe === "undefined") return;
	if (!matrix.ready){
		if( document.getElementsByClassName("priv-dlg-login")[0])return;
		document.body.appendChild(gNodes["priv-dlg-login"].cloneAll());
	}else{
		if( document.getElementsByClassName("private-control")[0])return;
		document.body.appendChild(gNodes["private-control"].cloneAll());
		loadPrivs();
	}
	/*
	var nodePCtrl = document.body.appendChild(gNodes["private-control"].cloneAll());
	if (!matrix.ready) return;
	nodePCtrl.cNodes["priv-login"].cNodes["priv-pass"].hidden = true;
	var bLogin = nodePCtrl.cNodes["priv-login"].cNodes["priv-pass-submit"];
	bLogin.innerHTML = "logout";
	bLogin.removeEventListener("click", ctrlPrivLogin);
	bLogin.addEventListener("click", ctrlPrivLogout);
	*/
}

function ctrlPrivLogin(e){
	var inpPass = e.target.parentNode.cNodes["priv-pass"].cNodes["priv-pass-i"];
	if (inpPass.value == ""){
		alert("Must have a password");
		return;
	}
	matrix.username = gMe.users.username;
	matrix.setPassword(inpPass.value);
	matrix.getUserPriv().then(
	function(){

		var nodeDlg =e.target; do nodeDlg = nodeDlg.parentNode; while(nodeDlg.className != "priv-dlg-login");
		nodeDlg.parentNode.removeChild(nodeDlg);
		document.body.appendChild(gNodes["private-control"].cloneAll());
		privRegenGrps();
		matrix.ready = 1;
		var drop = Math.floor(gConfig.cSkip/3);
		var toAdd = drop + Math.floor(gConfig.offset/3);
		if((!gPrivTimeline.done)&& (gConfig.timeline == "home")&& matrix.ready){
			gPrivTimeline.done = true;
			new Promise(function (){addPosts(drop,toAdd,0);});
		};
	}
	, function(wut){
		switch(wut){
		case -1:
			e.target.parentNode.parentNode.cNodes["priv-info"].innerHTML = "Incorrect password";
			break;
		case 404:
			ctrlPrivNewUser(e.target);
			break;
		default:
			e.target.parentNode.parentNode.cNodes["priv-info"].innerHTML = "Got error#"+wut+"<br/>Try again later";

		}
	});
}
function ctrlPrivNewUser(nodeSubmit){
	var node = gNodes["priv-new-user"].cloneAll();
	node.cNodes["priv-pass-submit"].addEventListener("click",function(e){
		if (node.cNodes["priv-pass-i"].value != nodeSubmit.parentNode.cNodes["priv-pass"].cNodes["priv-pass-i"].value){
			alert("Passwords must match");
			return;
		}
		node.cNodes["priv-pass-submit"].disabled = true;
		matrix.register().then(
			function(){
				document.getElementsByTagName("body")[0].removeChild(node);
				nodeSubmit.dispatchEvent(new Event("click"));
			},
			function(){new Error("Failed to register on the key sever.");}
		);
	});
	node.cNodes["priv-pass-cancel"].addEventListener("click",function(){ document.getElementsByTagName("body")[0].removeChild(node);});
	document.getElementsByTagName("body")[0].appendChild(node);

}
function ctrlPrivLogout(e){
	matrix.ready = 0;
	matrix.logout();
	gPrivTimeline.posts.forEach(function(post){post.parentNode.removeChild(post);});
	gPrivTimeline.posts = new Array();
	gPrivTimeline.done = false;
	document.body.removeChild( document.getElementsByClassName("private-control")[0]);
	privRegenGrps();
}
function loadPrivs(){
	var nodePCtrl = document.getElementsByClassName("private-control")[0];
	nodePCtrl.login = true;
	var nodeGrps = nodePCtrl.cNodes["priv-groups"];
	if(typeof matrix.gSymKeys !== "undefined"){
		for(var id in matrix.gSymKeys){
			var nodeGrp = gNodes["priv-grp"].cloneAll(true);
			nodeGrp.cNodes["priv-grp-name"].innerHTML = StringView.makeFromBase64(matrix.gSymKeys[id].name);
			nodeGrp.id = id;
			nodeGrps.appendChild(nodeGrp);
		}
	}

}
function ctrlPrivLeave(){
	var privGrps = document.getElementsByName("privGrp");
	var victim;
	for (var idx = 0; idx < privGrps.length; idx++){
		if (privGrps[idx].checked){
			victim = privGrps[idx].parentNode;
			break;
		}
	}
	if (typeof victim.id === "undefined") return;
	delete matrix.gSymKeys[victim.id];
	matrix.update();
	victim.parentNode.removeChild(victim);
	privRegenGrps();
}
function privRegenGrps(){
	var nodePCtrl = document.getElementsByClassName("private-control")[0];
	if(nodePCtrl){
		var nodeGrps = document.createElement("div");
		nodeGrps.className = "priv-groups";
		nodePCtrl.replaceChild( nodeGrps, nodePCtrl.cNodes["priv-groups"]);
		nodePCtrl.cNodes["priv-groups"] = nodeGrps;
		loadPrivs();
	}
	gConfig.regenPostTo();

}
function ctrlPrivShowInvite(){
	var privGrps = document.getElementsByName("privGrp");
	var id;
	for (var idx = 0; idx < privGrps.length; idx++){
		if (privGrps[idx].checked){
			if (typeof privGrps[idx].parentNode.id === "undefined") return;
			id = privGrps[idx].parentNode.id;
			break;
		}
	}
	var nodeDlg = document.body.appendChild(gNodes["priv-dlg-share"].cloneAll());
	nodeDlg.feedId = id;
	nodeDlg.cNodes["priv-share-feed"].innerHTML += StringView.makeFromBase64(matrix.gSymKeys[id].name);
}
function privGrpActivateButton(e){
	var nodeDlg =e.target; do nodeDlg = nodeDlg.parentNode; while(nodeDlg.className != "private-control");
	var buttons = nodeDlg.cNodes["priv-groups-ctrl"].getElementsByTagName("button");
	for(var idx = 0; idx < buttons.length; idx++)
		buttons[idx].disabled = false;

}
function privActivateButton(e){
	var state = false;
	if (e.target.value == "" ) state = true;
	var buttons = e.target.parentNode.getElementsByTagName("button");
	for(var idx = 0; idx < buttons.length; idx++)
		buttons[idx].disabled = state;

}
function ctrlPrivShare(e){
	matrix.genMsg(e.target.parentNode.cNodes["priv-inv-name"].value, JSON.stringify(matrix.gSymKeys[e.target.parentNode.feedId ])).then(function(msg){
		e.target.parentNode.cNodes["priv-key-input"].value = msg;
		e.target.parentNode.cNodes["priv-info"].innerHTML = "Invite generated successfuly";
	},function(err){
		var msg;
		if(err == 404) msg = "User not found";
		else msg = "Got error#"+err;
		e.target.parentNode.cNodes["priv-info"].innerHTML = msg;

	});
}
function ctrlPrivJoin(e){
	matrix.readMsg(e.target.parentNode.cNodes["priv-key-input"].value).then(function(msg){
		var symKeys = new Object();
		symKeys = JSON.parse(msg);
		if(typeof symKeys.id === "undefined")return;
		if(typeof symKeys.aKeys === "undefined")return;
		matrix.addKeys(symKeys);
		privRegenGrps();
		e.target.parentNode.cNodes["priv-key-input"].value = "";
	});
}
function ctrlPrivGen(e){
	var name = e.target.parentNode.cNodes["priv-c-name"].value;
	matrix.initPrivate(name).then( privRegenGrps);

}
function me(e){
	e.target.href = gConfig.front+gMe["users"]["username"];
}

function home(e){
    e.target.href = gConfig.front;
}
function goSettings(e){
    e.target.href = gConfig.front+"settings";
}
function goRequests(e){
    e.target.href = gConfig.front+"requests";
}

function directs(e){
    e.target.href = gConfig.front+ "filter/direct";
}
function my(e){
    e.target.href = gConfig.front+ "filter/discussions";
}
function ctrlPrivClose(e){
	var victim = e.target; while(victim.parentNode !=  document.body)victim = victim.parentNode;
	document.body.removeChild(victim);
}
function newDirectInp(e){
	if (e.target.value){
		var victim =e.target; do victim = victim.parentNode; while(victim.className != "new-post");
		victim.cNodes["edit-buttons"].cNodes["edit-buttons-post"].disabled = false;
		if(e.which == "13") newDirectAddFeed(e);
		else{
			var txt = e.target.value.toLowerCase();
			var nodeTip = gNodes["friends-tip"].cloneAll();
			var oDest = e.target.dest;
			var pos = oDest;
			for(var idx = 0; idx < txt.length; idx++){
				if (typeof pos[txt.charAt(idx)] !== "undefined")
					pos = pos[txt.charAt(idx)];
				else{
					pos = null;
					break;
				}
			}
			if(pos)pos.arr.forEach(function(user){
				var li = document.createElement("li");
				li.className = "ft-i";
				li.innerHTML = user;
				li.addEventListener("click",selectFriend);
				nodeTip.cNodes["ft-list"].appendChild(li);
			});
			nodeTip.inp = e.target;
			nodeTip.style.top = e.target.offsetTop+e.target.offsetHeight;
			nodeTip.style.left =  e.target.offsetLeft;
			nodeTip.style.width = e.target.clientWidth;
			if((typeof e.target.tip !== "undefined") && e.target.tip.parentNode) {
				document.body.replaceChild(nodeTip, e.target.tip);
				e.target.tip = nodeTip;
			}else e.target.tip = document.body.appendChild(nodeTip);
		}
	}else if(e.target.tip){
		document.body.removeChild(e.target.tip);
		e.target.tip = undefined;
	}


}
function ftClose(e){
	var victim =e.target;while(victim.className != "friends-tip") victim = victim.parentNode;
	victim.inp.tip = undefined;
	document.body.removeChild(victim);

}
function selectFriend(e){
	var victim =e.target; do victim = victim.parentNode; while(victim.className != "friends-tip");
	victim.inp.value = e.target.innerHTML;

}
function postDirect(e){
	var victim =e.target; do victim = victim.parentNode; while(victim.className != "new-post");
	var input = victim.cNodes["new-post-to"].cNodes["new-direct-input"].value;
	if ((input != "") && (typeof gUsers.byName[input] !== "undefined")
	&& gUsers.byName[input].friend 
	&& (gUsers.byName[input].subscriber||gUsers.byName[input].type == "group"))
		victim.cNodes["new-post-to"].feeds.push(input);
	if (victim.cNodes["new-post-to"].feeds.length) newPost(e);
	else alert("should have valid recipients");
}
function genDirectTo(victim){
	var nodeDirectTo = gNodes["new-direct-to"].cloneAll();
	victim.replaceChild(nodeDirectTo, victim.cNodes["new-post-to"]);
	victim.cNodes["new-post-to"] = nodeDirectTo;
	nodeDirectTo.feeds = new Array();
	victim.cNodes["edit-buttons"].cNodes["edit-buttons-post"].removeEventListener("click", newPost);
	victim.cNodes["edit-buttons"].cNodes["edit-buttons-post"].addEventListener("click", postDirect);
	victim.cNodes["edit-buttons"].cNodes["edit-buttons-post"].disabled = true;
	if(document.location.hash != ""){
		victim.cNodes["edit-buttons"].cNodes["edit-buttons-post"].disabled = false;
		nodeDirectTo.cNodes["new-direct-input"].value = document.location.hash.slice(1);
	}
	if ((typeof gMe.users.subscribers !== "undefined") && (typeof gMe.users.subscriptions !== "undefined")){
		var oDest = new Object();
		for (var username in gUsers.byName){
			if (!gUsers.byName[username].friend || !(gUsers.byName[username].subscriber || (gUsers.byName[username].type == "group")))
				continue;
			var pos = oDest;
			for(var idx = 0; idx < username.length; idx++){
				if (typeof pos.arr === "undefined") pos.arr = new Array();
				pos.arr.push(username);
				if (typeof pos[username.charAt(idx)] === "undefined")
					pos[username.charAt(idx)] = new Object();
				pos = pos[username.charAt(idx)];
			}
		}
	}
	nodeDirectTo.cNodes["new-direct-input"].dest = oDest;
	gConfig.regenPostTo = function (){return genDirectTo(victim);};
}
function genPostTo(victim){
	var nodePostTo = gNodes["new-post-to"].cloneAll();
	victim.replaceChild(nodePostTo, victim.cNodes["new-post-to"]);
	victim.cNodes["new-post-to"] = nodePostTo;
	nodePostTo.feeds = new Array();
	nodePostTo.feeds.push(gMe.users.username);
	nodePostTo.parentNode.isPrivate  = false;
	nodePostTo.cNodes["new-post-feeds"].firstChild.idx = 1;
	nodePostTo.cNodes["new-post-feeds"].firstChild.oValue = gMe.users.username;
	var option = document.createElement("option");
	option.selected = true;
	var select = document.createElement("select");
	select.className = "new-post-feed-select";
	select.hidden = nodePostTo.cNodes["new-post-feed-select"].hidden;
	select.addEventListener("change",newPostSelect);
	nodePostTo.replaceChild(select, nodePostTo.cNodes["new-post-feed-select"]);
	nodePostTo.cNodes["new-post-feed-select"] = select;
	nodePostTo.cNodes["new-post-feed-select"].appendChild(option);
	option = document.createElement("option");
	option.disabled = true;
	option.innerHTML = "My feed";
	option.value = gMe.users.username;
	nodePostTo.cNodes["new-post-feed-select"].appendChild(option);
	var groups = document.createElement("optgroup");
	groups.label = "Public groups";
	if (typeof gMe.users.subscriptions !== "undefined"){
		var oSubscriptions = new Object();
		gMe.subscriptions.forEach(function(sub){if (sub.name == "Posts")oSubscriptions[sub.id] = sub; });
		gMe.users.subscriptions.forEach(function(subid){
			if (typeof oSubscriptions[subid] === "undefined") return;
			var sub = gUsers[oSubscriptions[subid].user];
			if((typeof sub !=="undefined") && (sub.type == "group")){
				option = document.createElement("option");
				option.value = sub.username;
				option.innerHTML = sub.screenName;
				groups.appendChild(option);
			}
		});

	};
	if (groups.childNodes.length > 0 )
		nodePostTo.cNodes["new-post-feed-select"].appendChild(groups);
	groups = document.createElement("optgroup");
	groups.label = "Private groups";
	for (var id in matrix.gSymKeys){
		option = document.createElement("option");
		option.value = id;
		option.privateFeed = true;
		option.innerHTML = StringView.makeFromBase64(matrix.gSymKeys[id].name);
		groups.appendChild(option);
	}
	if (groups.childNodes.length > 0 )
		nodePostTo.cNodes["new-post-feed-select"].appendChild(groups);

	gConfig.regenPostTo = function (){return genPostTo(victim);};

}
function newPostRemoveFeed(e){
	var nodeP = e.target.parentNode.parentNode;
	nodeP.cNodes["new-post-feed-select"][e.target.idx].disabled = false;
	for(var idx = 0; idx < nodeP.feeds.length; idx++){
		if(nodeP.feeds[idx] == e.target.oValue){
			nodeP.feeds.splice(idx,1);
			break;
		}
	}
	e.target.parentNode.removeChild(e.target);
	if(nodeP.feeds.length == 0)
		nodeP.parentNode.cNodes["edit-buttons"].cNodes["edit-buttons-post"].disabled = true;
}
function newDirectRemoveFeed(e){
	var nodeP = e.target.parentNode.parentNode;
	for(var idx = 0; idx < nodeP.feeds.length; idx++){
		if(nodeP.feeds[idx] == e.target.oValue){
			nodeP.feeds.splice(idx,1);
			break;
		}
	}
	e.target.parentNode.removeChild(e.target);
	if((nodeP.feeds.length == 0)&&(nodeP.cNodes["new-direct-input"].value == ""))
		nodeP.parentNode.cNodes["edit-buttons"].cNodes["edit-buttons-post"].disabled = true;
}
function newPostAddFeed(e){
	e.target.parentNode.cNodes["new-post-feed-select"].hidden = false;
}
function newDirectAddFeed(e){
	var nodeP = e.target.parentNode;
	var option = nodeP.cNodes["new-direct-input"];
	if (option.value == "") return;
	if(typeof option.tip !== "undefined")document.body.removeChild(option.tip);
	nodeP.feeds.push(option.value);
	var li = document.createElement("li");
	li.innerHTML = option.value;
	li.className = "new-post-feed";
	li.oValue = option.value;
	li.idx = e.target.selectedIndex;
	li.addEventListener("click",newDirectRemoveFeed);
	nodeP.cNodes["new-post-feeds"].appendChild(li);
	option.value = "";
}
function newPostSelect(e){
	var option = e.target[e.target.selectedIndex];
	if (option.value == "")return;
	var nodeP = e.target.parentNode;
	if (option.privateFeed ){
		nodeP.isPrivate  = true;
		var ul = document.createElement("ul");
		ul.className = "new-post-feeds";
		nodeP.replaceChild(ul, nodeP.cNodes["new-post-feeds"]);
		nodeP.cNodes["new-post-feeds"] = ul;
		nodeP.feeds = new Array();
		for(var idx = 0; idx < e.target.length; idx++)
			e.target[idx].disabled = false;
	}
	option.disabled = true;
	nodeP.feeds.push(option.value);
	var li = document.createElement("li");
	li.innerHTML = option.innerHTML;
	li.className = "new-post-feed";
	li.oValue = option.value;
	li.idx = e.target.selectedIndex;
	li.addEventListener("click",newPostRemoveFeed);
	nodeP.cNodes["new-post-feeds"].appendChild(li);
	nodeP.parentNode.cNodes["edit-buttons"].cNodes["edit-buttons-post"].disabled = false;
}
function genUserPopup(e){
	var node = e.target; while(typeof node.userid === "undefined")node = node.parentNode;
	var user = gUsers[node.userid];
	if(document.getElementById("userPopup" + node.userid))return;
	var nodePopup = gNodes["user-popup"].cloneAll(true);
	document.getElementsByTagName("body")[0].appendChild(nodePopup);
	nodePopup.id = "userPopup" + node.userid;
	nodePopup.cNodes["up-avatar"].innerHTML = '<img src="'+ user.profilePictureMediumUrl+'" />';
	nodePopup.cNodes["up-info"].innerHTML  = user.link + "<br><span>@" + user.username + "</span>"
	document.getElementsByTagName("body")[0].appendChild(nodePopup);
	if((typeof gMe !== "undefined") && (user.id != gMe.users.id) )
		setChild(nodePopup, "up-controls", genUpControls(user.username));
	nodePopup.style.top = e.pageY;
	nodePopup.style.left = e.pageX;
	nodePopup.style["z-index"] = 1;
	if (typeof node.createdAt !== "undefined"){
		var spanDate = document.createElement("span");
		var txtdate = new Date(node.createdAt*1).toString();
		spanDate.innerHTML = txtdate.slice(0, txtdate.indexOf("(")).trim();
		nodePopup.appendChild(spanDate);
	}


}
function genBlock(e){
	var node = e.target.parentNode;
	var nodeBlock = gNodes["up-block"].cloneAll();
	nodeBlock.className = "user-popup"; 
	nodeBlock.user = node.user;
	node.appendChild(nodeBlock);
	nodeBlock.style.top =  e.target.offsetTop;
	nodeBlock.style.left = e.target.offsetLeft;
	nodeBlock.style["z-index"] = 2;
	var chkboxes = nodeBlock.getElementsByTagName("input");
	for(var idx = 0; idx < chkboxes.length; idx++){
		var list = gConfig[chkboxes[idx].value];
		if((typeof list !== "undefined") && (list != null) && (list[gUsers.byName[node.user].id]>-1))
			chkboxes[idx].checked = true;
	}

}
function upClose(e){
	var node = e.target; while(node.className != "user-popup")node = node.parentNode;
	node.parentNode.removeChild(node);
}
function destroy(e){
	if (!e.currentTarget.parentNode)return;
	if (e.eventPhase != Event.AT_TARGET)return;
	e.target.parentNode.removeChild(e.target);
	//e.stopPropagation();

}
function updateProfile(e){
	e.target.disabled = true;
	document.getElementById("update-spinner").hidden = false;
	gMe.users.screenName = document.getElementById("my-screen-name").value;
	gMe.users.email = document.getElementById("my-email").value;
	gMe.users.isPrivate = (document.getElementById("me-private").chacked?1:0);
	var oReq = new XMLHttpRequest();
	oReq.onload = function(){
		var nodeMsg = document.getElementById("update-status");
		e.target.disabled = false;
		document.getElementById("update-spinner").hidden = true;
		if(oReq.status < 400){
			gMe = JSON.parse(oReq.response);
			nodeMsg.className = "sr-info";
			nodeMsg.innerHTML = "Updated";
			refreshgMe();
		}else {
			nodeMsg.className = "msg-error";
			nodeMsg.innerHTML = "Got error: ";
			try{ 
				nodeMsg.innerHTML += JSON.parse(oReq.response).err;
			}catch(e) {nodeMsg.innerHTML += "unknown error";};

		}
	}

	oReq.open("put",gConfig.serverURL + "users/" + gMe.users.id ,true);
	oReq.setRequestHeader("Content-type","application/json");
	oReq.setRequestHeader("X-Authentication-Token", gConfig.token);
	oReq.send(JSON.stringify({"user":gMe.users}));
}
function realTimeSwitch(e){
	if(e.target.checked )window.localStorage.setItem("rt",1);
	else window.localStorage.setItem("rt",0);
	if(gConfig.timeline == "settings") return;
	var bump = e.target.parentNode.cNodes["rt-bump"].value;
	if(e.target.checked && !gRt.on){
		gRt = new RtUpdate(gConfig.token,bump);
		gRt.subscribe(gConfig.rt);
	}else if(!e.target.checked){
		if(gRt.on){
			gRt.close();
			gRt = new Object();
		}
	}
}
function setRTparams(e){
	var value = e.target.value;
	e.target.parentNode.getElementsByTagName("span")[0].innerHTML = value + " minutes";
	var oRTParams = new Object();
	["rt-bump-int", "rt-bump-cd", "rt-bump-d"].forEach(function(id){
		oRTParams[id] = document.getElementById(id).value;
	});
	window.localStorage.setItem("rt_params",JSON.stringify(oRTParams) );
}
function setRTBump(e){
	var bump = e.target.checked;
	window.localStorage.setItem("rtbump",bump?1:0);
	document.getElementById("rt-params").hidden = !bump;
}
function linkPreviewSwitch(e){
	if(e.target.checked )window.localStorage.setItem("show_link_preview",1);
	else window.localStorage.setItem("show_link_preview",0);
}
function srAccept(e){
	sendReqResp(e.target, "acceptRequest" );
}
function srReject(e){
	sendReqResp(e.target, "rejectRequest" );
}
function sendReqResp(node, action){
	node.parentNode.hidden = true;
	var host = node.parentNode.parentNode;
	var spinner = gNodes["spinner"].cloneNode(true);
	host.appendChild(spinner);
	var oReq = new XMLHttpRequest();
	oReq.onload = function(){
		if(oReq.status < 400){
			host.parentNode.removeChild(host);
			var nodeSR = document.getElementById("sr-info");
			if(--gConfig.subReqsCount){
				nodeSR.cNodes["sr-info-a"].innrHTML = "You have "
				+ gMe.users.subscriptionRequests.length 
				+ " subscription requests to review.";
			}else{
				nodeSR.hidden = true;
				var victim = document.getElementById("sr-header");
				victim.parentNode.removeChild(victim);
			}
			
		}else {
			host.removeChild(spinner);
			node.parentNode.hidden = false;
		}
	}

	oReq.open("post",gConfig.serverURL
		+ "users/" 
		+ action + "/" 
		+ host.cNodes["sr-user"].value
	,true);
	oReq.setRequestHeader("X-Authentication-Token", gConfig.token);
	oReq.send();
}
function frfAutolinker( autolinker,match ){
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
function addIcon(ico){
	var linkFavicon = document.getElementById("favicon");
	if (linkFavicon) linkFavicon.parentNode.removeChild(linkFavicon);
	linkFavicon = document.createElement('link');
	linkFavicon.id = "favicon";
	linkFavicon.type = 'image/x-icon';
	linkFavicon.rel = 'shortcut icon';
	linkFavicon.href = gConfig.static + ico;
	document.getElementsByTagName('head')[0].appendChild(linkFavicon);
}
function initDoc(){
	addIcon("throbber-16.gif");
	var locationPath = (document.location.origin + document.location.pathname).slice(gConfig.front.length);
	var locationSearch = document.location.search;
	if (locationPath == "")locationPath = "home";
	if (locationSearch == "")locationSearch = "?offset=0";
	gConfig.cSkip = locationSearch.split("&")[0].split("=")[1]*1;
	var arrLocationPath = locationPath.split("/");
	gConfig.timeline = arrLocationPath[0];
	if(window.localStorage.getItem("show_link_preview") == "1"){
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

		gEmbed.p = new Promise(function(resolve,reject){
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
	genNodes(templates.nodes).forEach( function(node){ gNodes[node.className] = node; });


	if(["home", "filter", "settings", "requests"].some(function(a){
		return a == gConfig.timeline;
	})){
		if(!auth()) return;
	}else if(!auth(true)) gMe = undefined;
	if(gConfig.timeline == "settings")return drawSettings();
	if(gConfig.timeline == "requests")return drawRequests();
	var oReq = new XMLHttpRequest();
	oReq.onload = function(){
		document.getElementById("loading").innerHTML = "Building page";
		if(oReq.status < 400){
			draw(JSON.parse(this.response));
			addIcon("favicon.ico");
			return;
		}
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
			document.body.removeChild(document.getElementById("splash"));

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
