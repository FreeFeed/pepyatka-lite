"use strict";

define("./draw", [],function(){

function _Drawer(v){
	this.cView = v;
}
_Drawer.prototype = {
	constructor: _Drawer
	,"writeAllLikes":function(id,nodeLikes){
		var cView = this.cView;
		var post = cView.doc.getElementById(id).rawData;
		var context = cView.contexts[post.domain];
		nodeLikes.innerHTML = "";
		var nodeLike = cView.doc.createElement("span");
		nodeLike.className = "p-timeline-user-like";
		for(var like = 0; like < post.likes.length; like++){
			var nodeCLike = nodeLike.cloneNode();
			nodeCLike.innerHTML = context.gUsers[post.likes[like]].link;
			//nodeLikes.childNodes[idx].appendChild(nodeCLike);
			nodeLikes.appendChild(nodeCLike);
		}
		var suffix = cView.doc.createElement("span");
		suffix.innerHTML = " liked this";
		//nodeLikes.childNodes[idx].appendChild(suffix);
		nodeLikes.parentNode.appendChild(suffix);
	}
	,"genLikes":function(nodePost){
		var cView = this.cView;
		var post = nodePost.rawData;
		var context = cView.contexts[post.domain];
		var postNBody = nodePost.cNodes["post-body"];
		var node = cView.doc.createElement("div");
		node.className = "likes";
		postNBody.cNodes["post-info"].replaceChild(node,  postNBody.cNodes["post-info"].cNodes["likes"]);
		postNBody.cNodes["post-info"].cNodes["likes"] = node;
		if(!Array.isArray(post.likes) || !post.likes.length ) return;
		postNBody.cNodes["post-info"].cNodes["likes"].appendChild(cView.gNodes["likes-smile"].cloneNode(true));
		var nodeLikes = cView.doc.createElement( "span");

		/*
		var l =  post.likes.length;
		if(cView.ids){
			for (var idx = 0; idx< l;idx++) {
				var like = post.likes[idx];
				if(like == cView.gMe.users.id){
					post.likes.splice(idx,1);
					post.likes.unshift(like);
					break;
				}
			}
		}
		*/


		var nodeLike = cView.doc.createElement("span");
		nodeLike.className = "p-timeline-user-like";
		post.likes.forEach(function(like){
			var nodeCLike = nodeLike.cloneNode();
			nodeCLike.innerHTML = context.gUsers[like].link;
			nodeLikes.appendChild(nodeCLike);
		});
		var suffix = cView.gNodes["likes-suffix"].cloneAll();

		if (post.omittedLikes){
			suffix.cNodes["likes-omitted"].hidden = false;
			suffix.getElementsByTagName("a")[0].innerHTML = post.omittedLikes + " other people "
		}
		suffix.className = "nocomma";
		postNBody.cNodes["post-info"].cNodes["likes"].appendChild(nodeLikes);
		postNBody.cNodes["post-info"].cNodes["likes"].cNodes = new Object();
		postNBody.cNodes["post-info"].cNodes["likes"].cNodes["comma"] = nodeLikes;
		postNBody.cNodes["post-info"].cNodes["likes"].appendChild(suffix);
		//postNBody.cNodes["post-info"].cNodes["likes"].appendChild(suffix);
		nodeLikes.className = "comma";
		if(context.ids.length && (post.likes[0] == context.gMe.users.id)){
			postNBody.cNodes["post-info"].myLike = nodeLikes.childNodes[0];
			if( postNBody.cNodes["post-info"].nodeLike) {
				postNBody.cNodes["post-info"].nodeLike.innerHTML = "Un-like";
				postNBody.cNodes["post-info"].nodeLike.action = false;
			}
		}
	}
	,"genUserDetails":function(username, context){
		var cView = this.cView;
		var user = context.gUsers.byName[username];
		var nodeUD = cView.gNodes["user-details"].cloneAll();
		var nodeInfo = nodeUD.cNodes["ud-info"];
		nodeInfo.cNodes["ud-username"].value = user.username;
		nodeInfo.getNode(["c","ud-avatar"],["c","ud-avatar-img"]).src = user.profilePictureMediumUrl;
		nodeInfo.getNode(["c","ud-text"],["c","ud-title"]).innerHTML = user.screenName;
		if(typeof user.description === "string")
			nodeInfo.getNode(["c","ud-text"],["c","ud-desc"])[(cView.readMore?"words":"innerHTML")] = context.digestText(user.description);
			//nodeInfo.getNode(["c","ud-text"],["c","ud-desc"]).innerHTML = context.digestText(user.description);
		if (user.type == "group") 
			["uds-subs","uds-likes","uds-com"].forEach(function(key){
			nodeInfo.getNode(["c","ud-stats"],["c",key]).style.display = "none";
		});
		if(typeof user.statistics !== "undefined"){
			var stats = {
				"uds-subs":user.statistics.subscriptions
				,"uds-subsc":user.statistics.subscribers > 0? user.statistics.subscribers:""
				,"uds-likes":user.statistics.likes
				,"uds-com":user.statistics.comments
			}
			Object.keys(stats).forEach(function(key){
				nodeInfo.getNode(["c","ud-stats"],["c",key],["c","val"]).innerHTML = stats[key];
			});
		}
		return nodeUD;
		
	}
	,"genProfile": function(user){
		var cView = document.cView;
		var context = cView.contexts[user.domain];
		var nodeProfile = cView.gNodes["settings-profile"].cloneAll();
		nodeProfile.getElementsByClassName("sp-username")[0].innerHTML = "@" + user.username;
		nodeProfile.cNodes["chng-avatar"].cNodes["sp-avatar-img"].src = user.profilePictureMediumUrl; 
		if (typeof user.description !== "undefined")
			nodeProfile.cNodes["gs-descr"].value = user.description;
		var nodes = nodeProfile.getElementsByTagName("input");
		for(var idx = 0; idx < nodes.length; idx++){
			var node = nodes[idx];
			switch(node.name){
			case "id": 
				node.value = user.id;
				break;
			case "token": 
				node.value = context.logins[user.id].token; 
				break;
			case "is-main":
				node.checked = (context.logins[user.id].token == context.token);
				node.name = "is-main-"+user.domain;
				break;
			case "email": 
				if(typeof user.email !== "undefined" )
					node.value =  user.email;
				break;
			case "domain":
				node.value = user.domain;
				break;
			case "screen-name": 
				node.value = user.screenName;
				break;
			case "is-private":
				node.checked = (user.isPrivate == "1");
				break;
			}
		};
		return nodeProfile;
	}
	,"drawSettings":function(){
		var cView = this.cView;
		var body = cView.doc.getElementById("container");
		body.cNodes["pagetitle"].innerHTML = "Settings";
		cView.doc.title = "Settings";
		var nodeSettingsHead = cView.gNodes["settings-head"].cloneAll();
		body.appendChild(nodeSettingsHead);
		switch(cView.doc.location.pathname.split("/").pop()){
		case "raw":
			cView.addons.pr.then(function(){cView.Drawer.drawRaw(body)});
			break;
		case "accounts":
			drawAcc();
			break;
		case "addons":
			drawAddons();	
			break;
		case "blocks":
			drawBlocks();
			break;
		case "import":
			drawImport();
			break;
		case "display":
		default:
			drawDisp();
		}
		cView.Common.setIcon("favicon.ico");
		return cView.Utils._Promise.resolve();
		function drawAcc(){
			nodeSettingsHead.cNodes["sh-acc"].className = "sh-selected";
			var nodeSettings = cView.gNodes["accaunts-settings"].cloneAll();
			body.appendChild(nodeSettings);
			Object.keys(cView.contexts).forEach(function (domain){
				var context = cView.contexts[domain];
				context.p.then(function(){
					if (context.ids)context.ids.forEach(function(id){
						nodeSettings
						.cNodes["settings-profiles"]
						.appendChild(cView.Drawer.genProfile(context.logins[id].data.users));
					});
				});
			});
		}
		function drawAddons(){
			nodeSettingsHead.cNodes["sh-addons"].className = "sh-selected";
			cView.addons.pr.then(function(){
				cView.addons.all.forEach(function(addon){
					var node = addon.settings();
					node.classList.add( "post");
					body.appendChild(node); 
				});
			});
		}
		function drawBlocks(){
			var lists = cView.blockLists;
			nodeSettingsHead.cNodes["sh-blocks"].className = "sh-selected";
			var nodeCtrl = cView.gNodes["blocks-settings-page-ctrl"].cloneAll();
			cView.Utils.getInputsByName(nodeCtrl)["hideCups"].checked = JSON.parse(
				cView.localStorage.getItem("addons-linkcups-hide")
			);
			body.appendChild( nodeCtrl);
			Object.keys(cView.contexts).forEach(function (domain){
				var context = cView.contexts[domain];
				var page = cView.gNodes["blocks-settings-page"].cloneAll();
				page.cNodes["title"].innerHTML = domain;
				page.cNodes["domain"].value = domain;
				cView.Utils.setChild(
					page.cNodes["strings"]
					,"content"
					,cView.Drawer.genBlockStrPage(domain)
				);	
				var appendUser = function(user){ 
					page.getNode(["c","posts"],["c","content"]).appendChild(genBUser(user, "posts"));
				};
				Object.keys(lists).forEach(function(type){
					var count = 0;
					var list = cView.blocks[lists[type]][domain]; 
					if(typeof list !== "undefined") Object.keys(list).forEach(function(id){
						page.getNode(["c",type]).hidden = false;
						var username;
						if(list[id] === true){
							var user = context.gUsers[id];
							if (typeof user === "undefined"){
								count++;
								return;
							}else username = user.username;
						}else username = list[id];
						var item = cView.gNodes["blocks-item"].cloneAll(true);
						var inputs = cView.Utils.getInputsByName(item);
						inputs["type"].value = type;
						inputs["val"].value  = id;
						item.cNodes["title"].innerHTML = "@"+username;
						page.getNode(["c",type],["c","content"]).appendChild(item);

					});
					if(count){
						var span = cView.doc.createElement("span");
						span.innerHTML = count + " unrecognized users";
						page.getNode(["c",type],["c","content"]).appendChild(span);
					}
				});

				body.appendChild(page);
			});
			cView.Common.updateBlockList();

			
		}
		function drawImport(){
			cView.Utils.xhr({
				"url":"https://dev.moimosk.ru/v2/importAuth/facebook"
				,"token":cView.contexts.local.token 
				,"withCredentials":true
			}).then(function(res){
				console.log(JSON.parse(res).authURL);
			}, console.log);
		

		}
		function drawDisp(){
			nodeSettingsHead.cNodes["sh-displ"].className = "sh-selected";
			var nodeSettings = cView.gNodes["display-settings"].cloneAll();
			body.appendChild(nodeSettings);
			var mode = cView.localStorage.getItem("display_name");
			if (mode == null) mode = "screen";
			var theme = cView.localStorage.getItem("display_theme");
			if (theme  == null) mode = "expanded.css";
			var nodes = nodeSettings.getElementsByTagName("input");
			for(var idx = 0; idx < nodes.length; idx++){
				var node = nodes[idx];
				switch(node.type){
				case "radio" :
					if (( node.name == "display_name") &&(node.value == mode)
					|| ( node.name == "display_theme") &&(node.value == theme))
						node.checked = true;
					break;
				case "checkbox":
					node.checked = JSON.parse (cView.localStorage.getItem(node.value));
					break;
				}
			};
			cView.doc.getElementById("rt-chkbox").checked = JSON.parse(cView.localStorage.getItem("rt"));
			var bump = JSON.parse(cView.localStorage.getItem("rtbump"));
			cView.doc.getElementById("rt-params").hidden = !bump;
			cView.doc.getElementById("rt-bump").checked = bump ;
			var oRTParams = cView.localStorage.getItem("rt_params");
			if (oRTParams != null)
				oRTParams = JSON.parse(oRTParams);
			["rt-bump-int", "rt-bump-cd", "rt-bump-d"].forEach(function(id){
				var node = cView.doc.getElementById(id);
				if(oRTParams)node.value = oRTParams[id];
				node.parentNode.getElementsByTagName("span")[0].innerHTML = node.value + " minutes";
			});
		}

	}
	,"drawSearch":function(search){
		var cView = this.cView;
		cView.doc.getElementById("container").cNodes["pagetitle"]
			.innerHTML = "Search: " + search.query;
		cView.doc.title ="Search: " + search.query;
		var node = cView.gNodes["search-big"].cloneAll();
		cView.Utils.setChild(node, "search-input", cView.gNodes["search-input"].cloneAll());
		node.getElementsByTagName("form")[0].target = "_self";
		Object.keys(cView.contexts).forEach(function(domain){
			var el = cView.gNodes["search-domain"].cloneAll(true);
			el.cNodes["i"].checked =  (search.domains.indexOf(domain) != -1);
			el.cNodes["i"].value = domain;
			el.cNodes["s"].innerHTML = domain;
			node.getElementsByClassName("search-domains")[0].appendChild(el);
		});
		cView.Utils.setChild(cView.doc.getElementById("container"), "details", node);
		if(search.query == "")return;
		cView.Utils.getInputsByName(node)["qs"].value = search.query ;
		if(!cView.doc.getElementsByClassName("post").length){
			var node = cView.gNodes["nothig-found"].cloneAll();
			node.innerHTML += search.query;
			cView.doc.posts.appendChild(node);
		}else node.removeChild(node.cNodes["search-info"]);


	}
	,"drawTimeline":function(posts,contexts){
		var cView = this.cView;
		var Drawer = cView.Drawer;
		var body = cView.doc.getElementById("container");
		var nodeMore = cView.doc.createElement("div");
		nodeMore.className = "more-node";
		var htmlPrefix = '<a href="' + gConfig.front+cView.fullPath + "?";
		if( cView.search != "") htmlPrefix += cView.search+"&";
		var htmlForward= "";  
		var htmlBackward = "";
		//var fLastPage = (content.posts.length != cView.offset);
		var backward = cView.skip*1 - gConfig.offset*1;
		var forward = cView.skip*1 + gConfig.offset*1;
		if (cView.skip){
			if (backward>=0) htmlBackward = htmlPrefix + "offset="
				+ backward*1+ "&limit="+gConfig.offset*1
				+ '"><span style="font-size: 120%">&larr;</span> Newer entries</a>';
			nodeMore.innerHTML = htmlBackward ;
		}
		if(posts.length){
			htmlForward = htmlPrefix + "offset="
			+ forward*1 + "&limit="+gConfig.offset*1
			+'">Older entries<span style="font-size: 120%">&rarr;</span></a>';
		}
		if ( (htmlBackward != "") && (htmlForward != "")) nodeMore.innerHTML += '<span class="spacer">&mdash;</span>'
		nodeMore.innerHTML += htmlForward;
		body.appendChild(nodeMore.cloneNode(true));
		cView.doc.posts = cView.doc.createElement("div");
		cView.doc.posts.className = "posts";
		cView.doc.posts.id = "posts";
		body.appendChild(cView.doc.posts);
		cView.posts = new Array();
		cView.doc.hiddenCount = 0;
		var idx = 0;
		posts.forEach(function(post){
			var nodePost = null; 
			post.idx = idx++;
			if (post.type == "metapost"){
				var dups = post.dups.filter(function(post){
					return post.isHidden != true;
				});
				if (dups.length == 1) 
					nodePost = Drawer.genPost(dups[0]);
				else if(dups.length != 0) 
					nodePost = Drawer.makeMetapost( dups.map(Drawer.genPost, cView));
				if (dups.length != post.dups.length) cView.doc.hiddenCount++;
			}else if(post.isHidden) cView.doc.hiddenCount++;
			else{
				post.isHidden = false;
				nodePost = Drawer.genPost(post);
			}
			if(nodePost)cView.doc.posts.appendChild(nodePost);
			cView.posts.push({"hidden":post.isHidden,"data":post});
		});
		var nodeShowHidden = cView.gNodes["show-hidden"].cloneAll();
		nodeShowHidden.cNodes["href"].action = true;
		body.appendChild(nodeShowHidden);
		if(cView.doc.hiddenCount) nodeShowHidden.cNodes["href"].innerHTML= "Show "+ cView.doc.hiddenCount + " hidden entries";
		body.appendChild(nodeMore);
		/*
		var drop = Math.floor(cView.skip/3);
		var toAdd = drop + Math.floor(gConfig.offset/3);
		if((!gPrivTimeline.done)&& (cView.timeline == "home")&& matrix.ready){
			gPrivTimeline.done = true;
			new Promise(function (){addPosts(drop,toAdd,0);});
		};
		*/
	
	} 
	,"drawPost": function(content,context) {
		var cView = this.cView;
		var singlePost = cView.Drawer.genPost(content);
		var body = cView.doc.getElementById("container");
		body.appendChild(singlePost);
		var nodesHide = singlePost.getElementsByClassName("hide");
		singlePost.hidden = false;
		if (nodesHide.length)nodesHide[0].hidden = true;
		cView.doc.title = "@" 
			+ context.gUsers[singlePost.rawData.createdBy].username + ": "
			+ singlePost.rawData.body.slice(0,20).trim()
			+ (singlePost.rawData.body.length > 20?"\u2026":"" )
			+ " ("+ context.domain  +")";
	}
	/*
		var nodeRTCtrl = body.getElementsByClassName("rt-controls")[0];
		nodeRTCtrl.cNodes["rt-chkbox"].checked = JSON.parse(cView.localStorage.getItem("rt"));
		var nodeBump = nodeRTCtrl.cNodes["rt-bump"];
		for(var idx = 0; idx<nodeBump.childNodes.length; idx++)
			if(nodeBump.childNodes[idx].value == bump){
				nodeBump.selectedIndex = idx;
				break;
			}
		if(content.timelines) context.rtSub = {"timeline":[content.timelines.id]};
		else context.rtSub = {"post":[content.posts.id]};
		*/
	
	,"drawRequests":function(){
		var cView = this.cView;
		var whoamis = new Array();
		Object.keys(cView.contexts).forEach( function (domain){
			var context = cView.contexts[domain];
			context.ids.forEach(function(id){
				whoamis.push(context.getWhoami(context.logins[id].token));
			
			});
		});
		return cView.Utils._Promise.all(whoamis).then(function(){
			var body = cView.doc.getElementById("container");
			Object.keys(cView.contexts).forEach( function (domain){
				genRequests(cView.contexts[domain]);
			});
			if (!body.getElementsByClassName("sub-request").length)
				body.getElementsByClassName("pagetitle")[0].innerHTML = "No requests";
		});

		function genRequests(context){
			var cView = context.cView;
			var body = cView.doc.getElementById("container");
			context.ids.forEach(function(loginId){
				var login = context.logins[loginId].data;
				if(!Array.isArray(login.requests)|| (login.requests.length == 0))
					return;
				var nodeH = cView.doc.createElement("h2");
				nodeH.innerHTML = "@"+login.users.username+" requests";
				body.appendChild(nodeH);
				var nodeReqs = body.appendChild(cView.gNodes["req-body"].cloneAll());
				login.requests.forEach( cView.Common.addUser, context);
				login.requests.forEach(function(req){
					var node = genReqNode(req, loginId);
					if(req.src == loginId){
						nodeReqs.cNodes["req-body-sent"].hidden = false;
						node.cNodes["sr-ctrl"].hidden = true;
						nodeReqs.cNodes["req-body-sent"].appendChild(node);
					}else{
						nodeReqs.cNodes["req-body-pend"].hidden = false;
						nodeReqs.cNodes["req-body-pend"].appendChild(node);
					}
				}); 
			});
			
			function genReqNode(req, loginId){
				var node = cView.gNodes["sub-request"].cloneAll();
				var user = context.gUsers[req.id];
				node.cNodes["sr-name"].innerHTML = user.link;
				/*
				'<a href="'
					+gConfig.front + "as/"
					+context.domain + "/"
					+user.username + '">'
					+user.screenName
					+"</a>"
					+" @" + user.username; 
				*/
				if(req.type == "group")
					node.cNodes["sr-name"].innerHTML += "<br />to "
					+ context.gUsers[req.dest].link;
				node.cNodes["sr-avatar"].src =  user.profilePictureMediumUrl ;
				node.cNodes["sr-user"].value = user.username;
				node.cNodes["sr-id"].value = loginId;
				node.cNodes["sr-src"].value = req.src;
				node.cNodes["sr-dest"].value = req.dest;
				node.cNodes["sr-reqid"].value = req.reqid;
				node.cNodes["sr-type"].value = req.type;
				node.cNodes["sr-domain"].value = context.domain;
				return node;
			}

		}
	}
	,"drawGroups": function( ){
		var cView = this.cView;
		var out = cView.doc.createElement("div");
		out.className = "subs-cont";
		var domains = Object.keys(cView.contexts);
		domains.forEach(function(domain){
			var context = cView.contexts[domain];
			if((context.gMe == null)
			|| (typeof context.gMe.users.subscriptions === "undefined") ) 
				return;
			var subHead = cView.doc.createElement("h3");
			subHead.innerHTML = domain;
			out.appendChild(subHead);
			var oSubscriptions = new Object();
			context.gMe.subscriptions.forEach(function(sub){
				oSubscriptions[sub.id] = sub;
			});
			var nodeGrps = cView.doc.createElement("div");
			context.gMe.users.subscriptions.forEach(function(subid){
				var sub = oSubscriptions[subid];
				var user = context.gUsers[sub.user];
				if((user.type == "user")||(sub.name != "Posts"))
					return;
				var node = cView.gNodes["sub-item"].cloneAll();
				var a = node.cNodes["link"];
				a.href = gConfig.front+ "as/" + context.domain+ "/" + user.username;
				a.cNodes["usr-avatar"].src = user.profilePictureMediumUrl;
				a.cNodes["usr-title"].innerHTML = user.title;
				nodeGrps.appendChild(node);
			});
			out.appendChild(nodeGrps);
		});
		cView.doc.getElementById("container").appendChild(out);
		return cView.Utils._Promise.resolve();

	}
	,"drawFriends": function(content,context){
		var cView = context.cView;
		var out = cView.gNodes["subs-cont"].cloneAll();
		content.subscriptions.forEach(function(sub){
			if(sub.name != "Posts")return;
			var node = cView.gNodes["sub-item"].cloneAll();
			var a = node.cNodes["link"];
			var user = context.gUsers[sub.user];

			a.href = gConfig.front+ "as/" + context.domain+ "/" + user.username;
			a.cNodes["usr-avatar"].src = user.profilePictureMediumUrl;
			a.cNodes["usr-title"].innerHTML = user.title;
			if(user.type == "user")out.cNodes["sc-users"].appendChild(node);
			else out.cNodes["sc-grps"].appendChild(node);
		});
		cView.doc.getElementById("container").appendChild(out);
	}
	,"drawSubs": function(content,context){
		var cView = context.cView;
		var out0 = cView.doc.createElement("div");
		var out = cView.doc.createElement("div");
		out0.appendChild(out);
		out0.className = "subs-cont";
		content.subscribers.forEach(function(sub){
			var node = cView.gNodes["sub-item"].cloneAll();
			var user = context.gUsers[sub.id];

			var a = node.cNodes["link"];
			a.href = gConfig.front+ "as/" + context.domain+ "/" + user.username;
			a.cNodes["usr-avatar"].src = user.profilePictureMediumUrl;
			a.cNodes["usr-title"].innerHTML = user.title;
			out.appendChild(node);
		});
		cView.doc.getElementById("container").appendChild(out0);
	}
	,"genUserPopup": function(node, user){
		var cView = this.cView;
		var context = cView.contexts[user.domain];
		var nodePopup = cView.gNodes["user-popup"].cloneAll(true);
		cView.doc.getElementsByTagName("body")[0].appendChild(nodePopup);
		nodePopup.id = "userPopup" + context.domain + user.id;
		nodePopup.cNodes["up-avatar"].innerHTML = '<img src="'+ user.profilePictureMediumUrl+'" />';
		nodePopup.cNodes["up-info"].innerHTML  ="<span>@" + user.username + "</span><br>"+ user.link;
		if((typeof context.gMe !== "undefined") && (context.ids.indexOf(user.id) == -1))
			cView.Utils.setChild(nodePopup, "up-controls", cView.Drawer.genUpControls(user));
		if (typeof node.createdAt !== "undefined"){
			var spanDate = cView.doc.createElement("span");
			spanDate.className = "up-date";
			var txtdate = new Date(node.createdAt*1).toString();
			spanDate.innerHTML = txtdate.slice(0, txtdate.indexOf("(")).trim();
			nodePopup.appendChild(spanDate);
		}
		return nodePopup;
	}
	,"genUpControls":function(user){
		var cView = this.cView;
		var context = cView.contexts[user.domain];
		var controls = cView.gNodes["up-controls"].cloneAll();
		var subs = controls.cNodes["up-sbs"];
		controls.user = user.username;
		controls.domain = context.domain;
		var isMulti = context.ids.length > 1;
		context.ids.forEach(perLogin);
		return controls;

		function perLogin(id){
			if (user.id == id)return;
			var login = context.logins[id].data;
			var friend = (typeof login.oFriends[user.id] !== "undefined");
			var envelop =  cView.gNodes["up-c-mu"].cloneAll();
			envelop.loginId = id;
			if (isMulti) envelop.cNodes["uname"].innerHTML = "@"+login.users.username+": ";
			var nodeSub = envelop.cNodes["up-s"];
			nodeSub.innerHTML = friend?"Unsubscribe":"Subscribe";
			nodeSub.subscribed = friend;
			if (!friend && (user.isPrivate == 1 )){
				nodeSub.removeEventListener("click",cView["Actions"]["evtSubscribe"]);
				var oRequests = new Object();
				if (Array.isArray(login.requests)){
					login.requests.forEach(function(req){
						oRequests[req.id] = req;
					});
				}
				if(Array.isArray(login.users.pendingSubscriptionRequests)
				&&login.users.pendingSubscriptionRequests.some(function(a){
						return oRequests[a].username == user.username;
					})){
					nodeSub = cView.Utils.setChild(envelop, "up-s", cView.doc.createElement("span")); 
					nodeSub.innerHTML = "Subscription request sent";
				}else{
					nodeSub.innerHTML = "Request subscription";
					nodeSub.addEventListener("click", cView["Actions"]["reqSubscription"] );
				}
			}
			controls.cNodes["up-sbs"].getElementsByTagName("ul")[0].appendChild(envelop);
			if(friend 
			&& ((user.type == "group") 
				|| login.users.subscribers.some(function(sub){ return sub.id == user.id;}))){
				envelop.cNodes["up-d"].href = gConfig.front + "filter/direct#"+ user.username;
				envelop.cNodes["up-d"].target = "_blank";
			}else{
				envelop.cNodes["up-d"].hidden = true;
				envelop.cNodes["up-d"].previousSibling.hidden = true;
			}
			var aBan = envelop.cNodes["up-b"];
			/*if (user.type == "group"){
				aBan.hidden = true;
				envelop.cNodes["up-b"].previousSibling.hidden = true;
				return;
			}
			*/
			aBan.banned  = login.users.banIds.indexOf( user.id) != -1;
			if (aBan.banned){
				aBan.innerHTML = "Un-ban";
				aBan.removeEventListener("click",cView["Actions"]["genBlock"]);
				aBan.addEventListener("click", cView["Actions"]["doUnBan"]);
			}
		}

	}

	,"regenHides":function(){
		var cView = this.cView;
		cView.posts.forEach(function(victim,idx){
			victim.data.idx = idx;
		});
	}
	,"updateDate":function(node, cView){
		node.innerHTML = cView.Utils.relative_time(node.date);
		var txtdate = new Date(node.date).toString();
		node.title = txtdate.slice(0, txtdate.indexOf("(")).trim();
		window.setTimeout(cView.Drawer.updateDate, 30000, node, cView);
	}
	,"genPost":function(post){
		var cView = this.cView;
		var Drawer = cView.Drawer;
		
		if (post.isHidden !== true) post.isHidden = false;
		var context = cView.contexts[post.domain];
		var nodePost = cView.gNodes["post"].cloneAll();
		var postNBody = nodePost.cNodes["post-body"];

		var user = undefined;
		if(post.createdBy) user = context.gUsers[post.createdBy];
		nodePost.rtCtrl = new Object();
		nodePost.homed = false;
		nodePost.rawData = post;
		nodePost.id = context.domain + "-post-" + post.id;
		nodePost.isPrivate = false;
		nodePost.commentsModerated = false;
	
		if( typeof post.body === "string")
			//postNBody.cNodes["post-cont"].innerHTML =  context.digestText(post.body);
			postNBody.cNodes["post-cont"][(cView.readMore?"words":"innerHTML")] = context.digestText(post.body);

		var urlMatch ;		
		nodePost.hidden = cView.Common.chkBlocked(post);
		nodePost.gotLock  = false;
		nodePost.gotShield = false ;
		if(typeof user !== "undefined"){
			nodePost.cNodes["avatar"].cNodes["avatar-h"].innerHTML = '<img src="'+ user.profilePictureMediumUrl+'" />';
			nodePost.cNodes["avatar"].cNodes["avatar-h"].userid = user.id;
			postNBody.cNodes["title"].innerHTML = Drawer.genTitle(nodePost);
		}
		if(nodePost.gotLock)
			postNBody.getNode(["c","post-info"],["c","post-controls"],["c","post-lock"]).innerHTML = "<i class='fa fa-lock icon'>&nbsp;</i>";
		if(nodePost.direct)
			postNBody.getNode(["c","post-info"],["c","post-controls"],["c","post-lock"]).innerHTML += "<i class='fa fa fa-envelope icon'>&nbsp;</i>";

		if(Array.isArray(post.attachments)&&post.attachments.length){
			var attsNode = postNBody.cNodes["attachments"];
			post.attachments.forEach(function(att){
				var nodeAtt = cView.doc.createElement("div");
				var oAtt = context.gAttachments[att];
				switch(oAtt.mediaType){
				case "image":
					var nodeA = cView.doc.createElement("a");
					nodeA.target = "_blank";
					nodeA.href = oAtt.url;
					nodeA.border = "none";
					var nodeImg = cView.doc.createElement("img");
					nodeImg.src = oAtt.thumbnailUrl;
					nodeImg.style.height = 0;
					var showUnfolder =  (post.src === "rt")?	
						cView.Actions.showUnfolderRt
						:cView.Actions.showUnfolder;
					nodeImg.addEventListener("load", showUnfolder);
					nodeA.appendChild(nodeImg);
					nodeAtt.appendChild(nodeA);
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
		if(((urlMatch = post.body.match(/(^|[^!])https?:\/\/[^\s\/$.?#].[^\s]*/i) )!= null)
		&&(JSON.parse(cView.localStorage.getItem("show_link_preview")))){
			cView.gEmbed.p.then(function(oEmbedPr){
				Drawer.embedPreview(oEmbedPr
					,urlMatch[0]
					,postNBody.cNodes["attachments"] 
				).then(((post.src == "rt")?cView.Utils.unscroll:function(){}));
			});
		}
		var anchorDate = cView.doc.createElement("a");
		if(typeof user !== "undefined") anchorDate.href = [gConfig.front + "as",  context.domain, user.username , post.id].join("/");
		postNBody.cNodes["post-info"].cNodes["post-controls"].cNodes["post-date"].appendChild(anchorDate);
		anchorDate.date = JSON.parse(post.createdAt);
		window.setTimeout(Drawer.updateDate, 10,anchorDate, cView);

		if((typeof post.commentsDisabled !== "undefined")
		&& (post.commentsDisabled == "1")){
			postNBody.getNode(["c","post-info"],["c","post-controls"],["c","cmts-lock-msg"]).hidden = false;
		} else post.commentsDisabled = "0";
		if(context.ids.length){
			var nodeControls;
			if (context.ids.indexOf(post.createdBy) != -1){
				nodeControls = cView.gNodes["controls-self"].cloneAll();
			}else {
				nodeControls = cView.gNodes["controls-others"].cloneAll();
				postNBody.cNodes["post-info"].nodeLike = nodeControls.cNodes["post-control-like"];
				nodeControls.cNodes["post-control-like"].action = true;
				if(post.commentsDisabled == "1"){
					var nodeCmtControl = nodeControls.getElementsByClassName("post-control-comment")[0];
					nodeCmtControl.style.display = "none";
					nodeCmtControl.nextSibling.style.display = "none";
				}
			}
			nodeControls.className = "controls";
			var aHide = nodeControls.cNodes["hide"];
			//aHide.className = "hide";
			aHide.innerHTML = post.isHidden?"Un-hide":"Hide";
			aHide.action = !post.isHidden;
			postNBody.cNodes["post-info"].cNodes["post-controls"].appendChild( nodeControls);
			postNBody.cNodes["post-info"].cNodes["post-controls"].cNodes["controls"] = nodeControls;
			//postNBody.cNodes["post-info"].cNodes["post-controls"].nodeHide = aHide;
		}
		if (post.likes)	Drawer.genLikes(nodePost );
		if (post.comments){
			if(post.omittedComments){
				if(post.comments[0])
					postNBody.cNodes["comments"].appendChild(Drawer.genComment.call(context, context.gComments[post.comments[0]]));
				var nodeLoad = cView.gNodes["comments-load"].cloneAll();
				nodeLoad.getElementsByClassName("num")[0].innerHTML = post.omittedComments;
				postNBody.cNodes["comments"].appendChild(nodeLoad);
				if(post.comments[1])
					postNBody.cNodes["comments"].appendChild(Drawer.genComment.call(context, context.gComments[post.comments[1]]));
			}
			else post.comments.forEach(function(commentId){ 
				postNBody.cNodes["comments"]
				.appendChild(Drawer.genComment.call(context, context.gComments[commentId]))
			});
		}
		if (postNBody.cNodes["comments"].childNodes.length > 4)
			postNBody.cNodes["many-cmts-ctrl"].hidden = false;
		return nodePost;

	}
	,"genTitle":function(nodePost){
		var cView = this.cView;
		var context = cView.contexts[nodePost.rawData.domain];
		var post = nodePost.rawData;
		var user = context.gUsers[post.createdBy];
		var title = user.link;
		//if(nodePost.isPrivate) title += "<span> posted a secret to "+StringView.makeFromBase64(matrix.gSymKeys[cpost.payload.feed].name)+"</span>";
		if(false);
		else if(post.postedTo){
			post.postedTo.forEach(function(id){
				nodePost.gotLock = context.gFeeds[id].isPrivate;
				nodePost.gotShield = context.gFeeds[id].isProtected;
				nodePost.direct = context.gFeeds[id].direct;
			});
			if ((post.postedTo.length >1)||(context.gFeeds[post.postedTo[0]].user.id!=user.id)){
				title += "<span> posted to: </span>";
				post.postedTo.forEach(function(id){
					title += context.gFeeds[id].user.link;
				});
			}
		}
		if(post.isDirect == true)
			nodePost.direct = true;
		return title;

	}
	,"embedPreview": function (oEmbedPrs, victim, target){
		var cView = this.cView;
		var oEmbedURL;
		var m;
		var fake = {"then":function(){}};
		var blacklist = gConfig.domains["FreeFeed"].fronts;
		if(blacklist.some(function(item){return victim.indexOf(item)!= -1;})) return fake;
		if((m = /^https:\/\/(?:docs\.google\.com\/(?:document|spreadsheets|presentation|drawings)|drive\.google\.com\/file)\/d\/([^\/]+)/.exec(victim)) !== null) {
			return new Promise(function(resolve,reject){
				var oReq = new XMLHttpRequest();
				oReq.onload = function(){
					if(oReq.status < 400)
						resolve(JSON.parse(oReq.response));
					else reject(oReq.response);
				}

				oReq.open("get","https://www.googleapis.com/drive/v2/files/" + m[1] + "?key=AIzaSyA8TI6x9A8VdqKEGFSE42zSexn5HtUkaT8",true);
				oReq.send();
			}).then(function(info){
				//var nodeiFrame = cView.doc.createElement("iframe");
				//nodeiFrame.src = info.embedLink;
				var nodeA = cView.doc.createElement("a");
				var img = cView.doc.createElement("img");
				var width = cView.doc.getElementById("container").clientWidth*3/4;
				img.src = info.thumbnailLink.replace("=s220","=w"+ width+"-c-h"+ width/5 );// "=s"+cView.doc.getElementById("container").clientWidth/2+"-p");
				var node = cView.doc.createElement("div");
				node.className = "att-img";
				nodeA.appendChild(img);
				nodeA.href = victim;
				node.appendChild(nodeA);
				target.appendChild(node);
				img.onerror=function(){nodeA.hidden = true;};
				return node;
			});
		}else if (/^https?:\/\/(www\.)?pinterest.com\/pin\/.*/.exec(victim) !== null){
			var node = cView.doc.createElement("div");
			node.className = "att-img";
			node.innerHTML = '<a data-pin-do="embedPin" href="' + victim + '"></a>';
			target.appendChild(node);
			return Promise.resolve(node);
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
							+ "&maxwidth="+cView.doc.getElementById("container").clientWidth*3/4
						)
						+ "'&format=json";
					return true;
				}else return false;
			});
		});

		if(bIsOEmbed){
			return new Promise(function(resolve,reject){
				var oReq = new XMLHttpRequest();
				oReq.onload = function(){
					if(oReq.status < 400)
						resolve(JSON.parse(oReq.response));
					else reject(oReq.response);
				}

				oReq.open("get",oEmbedURL,true);
				oReq.send();
			}).then(function(qoEmbed){
				if (!qoEmbed.query.count) return null;
				var oEmbed = qoEmbed.query.results.json;
				if(oEmbed.type == "photo"){
					return target.appendChild(oEmbedImg(oEmbed.url,victim));
				}else if (typeof oEmbed.html !== "undefined"){
					if(oEmbed.html.indexOf("iframe") == 1){
						var node = cView.doc.createElement("div");
						node.innerHTML = oEmbed.html;
						return target.appendChild(node);
					}else if(typeof oEmbed.thumbnail_url !== "undefined"){
						return target.appendChild(oEmbedImg(oEmbed.thumbnail_url,victim));
					}else{
						var iframe = cView.doc.createElement("iframe");	
						iframe.sandbox = true;
						iframe.srcdoc = oEmbed.html;
						iframe.style.width = oEmbed.width;
						iframe.style.height = oEmbed.height;
						return target.appendChild(iframe);
					}
				}
			},doEmbedly );
		}else return doEmbedly();
		function oEmbedImg(url,victim){
			if(!url.match(/^['"]?https?/)) return cView.doc.createElement("img");
			var img = cView.doc.createElement("img");
			img.src = url;
			//img.style.width = oEmbed.width;
			//img.style.height = oEmbed.height;
			var node = cView.doc.createElement("a");
			node.appendChild(img);
			return node;	
		}
		function doEmbedly(){
			var aEmbed = cView.doc.createElement("a");
			aEmbed.href = victim;
			aEmbed.className = "embedly-card";
			target.appendChild(aEmbed);
			return fake; 
		}
	}
	,"genEditNode":function(post,cancel){
		var cView = this.cView;
		var nodeEdit = cView.gNodes["edit"].cloneAll();
		nodeEdit.cNodes["edit-buttons"].cNodes["edit-buttons-post"].addEventListener("click",post);
		nodeEdit.cNodes["edit-buttons"].cNodes["edit-buttons-cancel"].addEventListener("click",cancel);
		cView.cTxt = nodeEdit.cNodes["edit-txt-area"];
		return nodeEdit;
	}
	,"genComment":function(comment){
		var cView = this.cView;
		var context = this;
		var nodeComment = cView.gNodes["comment"].cloneAll();
		var listBlocksUsr = cView.blocks.blockComments[context.domain];
		var listBlocksStr = cView.blocks.blockStrings[context.domain];
		var cUser = context.gUsers[comment.createdBy];
		if(( typeof listBlocksUsr!== "undefined") 
		&& ( listBlocksUsr!= null) 
		&& (listBlocksUsr[cUser.id])){
			nodeComment.innerHTML = "---";
			nodeComment.hidden = true;
			return nodeComment;
		}
		if(( typeof listBlocksStr!== "undefined") 
		&& ( listBlocksStr!= null) 
		&& (listBlocksStr.some(function(str){
			return comment.body.toLowerCase().indexOf(str.toLowerCase())!= -1;
		}))){
			nodeComment.innerHTML = "---";
			nodeComment.hidden = true;
			return nodeComment;
		}
		var nodeSpan = nodeComment.getNode(["c","comment-body"],["c","cmt-content"]);
		nodeComment.userid = null;
		if( typeof comment.body === "string")
			nodeSpan[(cView.readMore?"words":"innerHTML")] = context.digestText(comment.body);
		nodeComment.id = context.domain + "-cmt-" + comment.id;
		nodeComment.rawId = comment.id;
		nodeComment.domain = context.domain;
		nodeComment.createdAt = comment.createdAt;
		nodeComment.userid = cUser.id;
		nodeComment.getNode(["c","comment-body"],["c","cmt-author"]).innerHTML = cUser.link ;
		if(context.ids.length){
			if(context.ids.indexOf(cUser.id) != -1)
				cView.Utils.setChild(nodeComment.cNodes["comment-body"],"comment-controls",cView.gNodes["comment-controls"].cloneAll());
			else if(!cUser.friend) nodeComment.cNodes["comment-date"].cNodes["date"].style.color = "#787878";
		}
		return nodeComment;
	}
	,"genDirectTo":function(victim, login){
		var cView = this.cView;
		var context = cView.contexts[login.domain];
		var nodeDirectTo = cView.gNodes["new-direct-to"].cloneAll();
		nodeDirectTo.userid = login.users.id;
		nodeDirectTo.domain = login.domain;
		if( Object.keys(cView.contexts).reduce(
			function(prev,domain){ return prev.concat(cView.contexts[domain].ids);}
			,[]
		).length > 1 ){
			nodeDirectTo.cNodes["mu-login"].innerHTML = context.domain + ": @" + login.users.username;
			nodeDirectTo.cNodes["mu-login"].hidden = false;
			victim.cNodes["add-sender"].hidden = false;
			if (typeof victim.cNodes["add-sender"].ids === "undefined")
				victim.cNodes["add-sender"].ids = [context.gMe.users.id];
		}
		victim.cNodes["post-to"].appendChild(nodeDirectTo);

		nodeDirectTo.destType = "directs";
		nodeDirectTo.className = "new-post-to";
		nodeDirectTo.feeds = new Array();
		victim.cNodes["edit-buttons"].cNodes["edit-buttons-post"].removeEventListener("click", cView["Actions"]["newPost"]);
		victim.cNodes["edit-buttons"].cNodes["edit-buttons-post"].addEventListener("click", cView["Actions"]["postDirect"]);
		victim.cNodes["edit-buttons"].cNodes["edit-buttons-post"].disabled = true;
		var hash;
		if((cView.fullPath.indexOf("#") != -1) 
		&& ((hash = cView.fullPath.substr(cView.fullPath.indexOf("#")+1)) != "")){
			victim.cNodes["edit-buttons"].cNodes["edit-buttons-post"].disabled = false;
			nodeDirectTo.getNode(["c","new-feed-input"],["c","input"]).value = hash;
		}
		var oSuggest = new Object();
		var oDest = new Object();
		if ((typeof login.users.subscribers !== "undefined") && (typeof login.users.subscriptions !== "undefined")){
			for (var username in context.gUsers.byName){
				var userid = context.gUsers.byName[username].id;
				if (!login.oFriends[userid] 
					|| !(login.users.subscribers.some(function(sub){return sub.id == userid;}) 
						|| (context.gUsers.byName[username].type == "group")
					)
				) continue;
				oDest[username] = username;
				var pos = oSuggest;
				for(var idx = 0; idx < username.length; idx++){
					if (typeof pos[username.charAt(idx)] === "undefined")
						pos[username.charAt(idx)] = new Object();
					pos = pos[username.charAt(idx)];
					if (typeof pos.arr === "undefined") pos.arr = new Array();
					pos.arr.push(username);
				}
			}
		}
		var input = nodeDirectTo.getNode(["c","new-feed-input"],["c","input"]);
		input.dest = oDest;
		input.suggest = oSuggest;
		cView.updPostTo = function (login,clean){
			if(clean == true) {
				document.getElementsByClassName("add-sender")[0].ids = new Array();
				var victims = document.getElementsByClassName("new-post-to");
				while(victims.length)victims[0].parentNode.removeChild(victims[0]);
			}
			return cView.Drawer.genDirectTo(victim, login);
		};
		var rmSenders = victim.getElementsByClassName("rm-sender");
		if(rmSenders.length > 1)
			for (idx = 0; idx < rmSenders.length; idx++)rmSenders[idx].hidden = false;
		victim.getNode(["c","edit-buttons"],["c","edit-buttons-post"]).disabled = false;
	}
	,"genPostTo":function(victim, init, login){
		var cView = this.cView;
		var context = cView.contexts[login.domain];
		var nodePostTo = cView.gNodes["new-post-to"].cloneAll();
		var idx = 1;
		var dest = ( init ? init : login.users.username );
		if( Object.keys(cView.contexts).reduce(
			function(prev,domain){ return prev.concat(cView.contexts[domain].ids);}
			,[]
		).length > 1 ){
			nodePostTo.cNodes["mu-login"].innerHTML = login.domain + ": @" + login.users.username;
			nodePostTo.cNodes["mu-login"].hidden = false;
			victim.cNodes["add-sender"].hidden = false;
			if (typeof victim.cNodes["add-sender"].ids === "undefined")
				victim.cNodes["add-sender"].ids = [context.gMe.users.id];
		}

		victim.cNodes["post-to"].appendChild(nodePostTo);
		nodePostTo.feeds = new Array();
		nodePostTo.feeds.push(dest);
		nodePostTo.cNodes["new-post-feeds"].firstChild.oValue = dest;
		if(dest != login.users.username)
			nodePostTo.cNodes["new-post-feeds"].firstChild.innerHTML = dest;
		nodePostTo.destType = "posts";
		nodePostTo.parentNode.isPrivate  = false;
		nodePostTo.cNodes["new-feed-input"].addEventListener("focus", cView.Actions.newDirectInp, true);
		var oDest = new Object();
		var oSuggest = new Object();
		if (typeof login.users.subscriptions !== "undefined"){
			var oSubscriptions = new Object();
			login.subscriptions.forEach(function(sub){if (sub.name == "Posts")oSubscriptions[sub.id] = sub; });
			login.users.subscriptions.forEach(function(subid){
				if (typeof oSubscriptions[subid] === "undefined") return;
				var sub = context.gUsers[oSubscriptions[subid].user];
				if((typeof sub !=="undefined") && (sub.type == "group")){
					var title = sub.title.replace(/<(?:.|\n)*?>/gm, '').trim();
					oDest[sub.username] = sub.username;
					oDest[sub.screenName] = sub.username;
					oDest[title] = sub.username;
					[sub.username, sub.screenName].forEach(function(name){
						var pos = oSuggest;
						var nameLC = name.toLocaleLowerCase();
						for(var idx = 0; idx < nameLC.length; idx++){
							if (typeof pos[nameLC.charAt(idx)] === "undefined")
								pos[nameLC.charAt(idx)] = new Object();
							pos = pos[nameLC.charAt(idx)];
							//if(idx == 0) continue;
							if (typeof pos.arr === "undefined") 
								pos.arr = new Array();
							if(pos.arr.indexOf(title)== -1)
								pos.arr.push(title);
						}
					});
				}
			});
		};
		/*
		groups.label = "Private groups";
		for (var id in matrix.gSymKeys){
			option = cView.doc.createElement("option");
			option.value = id;
			option.privateFeed = true;
			option.innerHTML = StringView.makeFromBase64(matrix.gSymKeys[id].name);
			groups.appendChild(option);
		}
		*/
		var input = nodePostTo.getNode(["c","new-feed-input"],["c","input"]);
		input.suggest = oSuggest;
		input.dest = oDest;
		cView.updPostTo = function (login,clean){
			if(clean == true) {
				document.getElementsByClassName("add-sender")[0].ids = new Array();
				var victims = document.getElementsByClassName("new-post-to");
				while(victims.length)victims[0].parentNode.removeChild(victims[0]);
			}
			return cView.Drawer.genPostTo(victim, init,login);
		};
		
		var rmSenders = victim.getElementsByClassName("rm-sender");
		if(rmSenders.length > 1)
			for (idx = 0; idx < rmSenders.length; idx++)rmSenders[idx].hidden = false;
		nodePostTo.userid = login.users.id;
		nodePostTo.domain = login.domain;
		victim.getNode(["c","edit-buttons"],["c","edit-buttons-post"]).disabled = false;

	}
	,"blockPosts":function(node, action){
		var cView = this.cView;	
		var context = cView.contexts[node.domain];
		var user = context.gUsers.byName[node.user];
		var nodesPosts = cView.doc.getElementsByClassName("post");
		for(var idx = 0; idx < nodesPosts.length; idx++){
			if((nodesPosts[idx].rawData.createdBy == user.id)
			&& (nodesPosts[idx].rawData.domain == user.domain)){
				nodesPosts[idx].hidden = action;
				if (!action)cView.Drawer.applyReadMore(nodesPosts[idx]);
			}
		}
	}
	,"blockComments":function(node, action){
		var cView = this.cView;	
		var context = cView.contexts[node.domain];
		var user = context.gUsers.byName[node.user];
		var nodesCmts = cView.doc.getElementsByClassName("comment");
		for(var idx = 0; idx < nodesCmts.length; idx++){
			if((nodesCmts[idx].userid == user.id)
			&& (nodesCmts[idx].domain == user.domain)) {
				if(action) {
					nodesCmts[idx].innerHTML = "---";
					nodesCmts[idx].hidden = true;
				}
				else{
					var id = nodesCmts[idx].rawId; 
					var nodeNewCmt = cView.Drawer.genComment.call( context
						,context.gComments[id]
					);
					nodesCmts[idx].parentNode.replaceChild( nodeNewCmt , nodesCmts[idx]);
					cView.Drawer.applyReadMore(nodeNewCmt);
				}
			}
		}
	}
	,"genMultiuser":function(ok, cancle){
		/* context not implemented
		var popup = cView.gNode["multiuser-dialog"].cloneAll();
		cView.cView.ids.forEach(function(id){
			var unit = cView.gNode["multiuser-unit"].cloneAll();
			unit.getElementsByTagName("span")[0].innerHTML = "@"+
				cView.logins[id].data.users.username;
			unit.getElementsByTagName("button")[0].addEventListener("click",ok);
			unit.getElementsByTagName("a")[0].addEventListener("click",cancle);
			unit.getElementsByTagName("input")[0].value = id;
			popup.cNodes["units"].appendChild(unit);
		});
		return popup; 
		*/
	}
	,"genAddSender":function(cb){
		var cView = this.cView;
		var popup = cView.gNodes["add-sender-dialog"].cloneAll();
		Object.keys(cView.contexts).forEach(function (domain){
			var context = cView.contexts[domain];
			var title = document.createElement("p"); 
			title.innerHTML = domain;
			popup.cNodes["units"].appendChild(title);
			context.ids.forEach(function(id){
				var login = context.logins[id].data;
				var unit = cView.gNodes["add-sender-unit"].cloneAll();
				unit.getNode(["c","up-avatar"],["c","avatar-img"]).src = login.users.profilePictureMediumUrl;
				unit.getNode(["c","asu-info"],["c","username"]).innerHTML = "@" + login.users.username;
				unit.getNode(["c","asu-info"],["c","screen-name"]).innerHTML = login.users.screenName;
				unit.addEventListener("click", function(){cb(login,context)});
				popup.cNodes["units"].appendChild(unit);
			});
		});
		return popup;
	}
	,"genAddComment": function(context){
		var cView = context.cView;
		var nodeComment = cView.gNodes["comment"].cloneAll();
		cView.Utils.setChild(nodeComment, "comment-body", cView.Drawer.genEditNode(cView.Actions.postNewComment,cView.Actions.cancelNewComment));
		if(context.ids.length > 1 ){
			nodeComment.getElementsByClassName("select-user")[0].hidden = false;
			var nodeSelectUsr = nodeComment.getElementsByClassName("select-user-ctrl")[0];
			context.ids.forEach(function(id){
				var option = document.createElement("option");
				option.innerHTML = "@"+context.logins[id].data.users.username;
				option.value = id;
				nodeSelectUsr.appendChild(option);
				if(context.logins[id].token == context.token) option.selected = true;
			});
		}
		nodeComment.userid = context.gMe.users.id;
		return nodeComment;
	}
	,"updateReqs":function(){
		var cView = this.cView;
		cView.subReqsCount = 0;
		Object.keys(cView.contexts).forEach(function(domain){
			var context = cView.contexts[domain];
			var ids = context.ids;
			if(ids) cView.subReqsCount += ids.reduce(function(total, id){
				var profile = context.logins[id].data.users;
				if (Array.isArray(profile.subscriptionRequests))
					return total + profile.subscriptionRequests.length;
				else return total;
			},0);
		});
		if (cView.subReqsCount){
			var nodeInfo = cView.doc.getElementById("sr-info");
			nodeInfo.cNodes["sr-info-a"].innerHTML = "You have "
			+ cView.subReqsCount
			+ " subscription requests to review.";
			nodeInfo.hidden = false;
		}
	}
	,"makeMetapost": function(dups){ 
		var cView = this.cView;
		var nodeRefMenu = document.createElement("div");
		var nodeMetapost = document.createElement("div");
		nodeMetapost.className = "metapost";
		var score = new Array(dups.length);
		var nodeMenu = document.createElement("div");
		nodeMenu.className = "post-refl-menu";
		nodeMetapost.appendChild(nodeMenu);	
		dups.forEach(function(nodePost){
			nodePost.hidden = true;
			nodeMetapost.appendChild(nodePost);
			nodeMenu.appendChild( genMenuItem(nodePost.rawData));
			score.push({
				"s":cView.Common.calcPostScore(nodePost.rawData)
				,"node": nodePost
			});
		});
		score.sort(function(a,b){return b.s - a.s;});	
		nodeMetapost.rtCtrl = score[0].node.rtCtrl;
		score[0].node.hidden = false;
		var items = nodeMenu.getElementsByClassName("reflect-menu-item");
		for (var idx = 0; idx < items.length; idx++ )
			if(items[idx].cNodes["victim-id"].value === score[0].node.id)
				items[idx].className += " pr-selected";
			else items[idx].className += " pr-deselected";
		nodeMetapost.rawData = new Object();
		return nodeMetapost;
		function genMenuItem(post){
			var context = cView.contexts[post.domain];
			var node = cView.gNodes["reflect-menu-item"].cloneAll();
			node.cNodes["label"].innerHTML = post.domain 
				+ ": @" + context.gUsers[post.createdBy].username;
			node.cNodes["victim-id"].value = context.domain + "-post-" + post.id;;
			return node;
		}
	}
	,"regenMetapost":function (host){
		var cView = this.cView;
		var nodes = host.getElementsByClassName("post");
		var count = nodes.length;
		if (count){
			var newNode;
			if(count > 1){
				var arrNodes = new Array();
				for(var idx = 0; idx < count; idx++)
					arrNodes.push(nodes[idx]);
				newNode = cView.Drawer.makeMetapost(arrNodes);
			}else{
				newNode = nodes[0];
				newNode.hidden = false;
				cView.Drawer.applyReadMore(newNode);
			}
			host.parentNode.replaceChild( newNode, host);
		}else host.parentNode.removeChild(host);
		return count;
	}
	,"applyReadMore": function(host, flag){
		var cView = this.cView;
		var lines = (flag === false)?0:cView.readMoreHeight;
		var dummy = cView.gNodes["one-line"].cloneAll();

		document.body.appendChild(dummy);
		var lineHeight = dummy.offsetHeight;	
		var height = lineHeight* lines;
		document.body.removeChild(dummy);
		var nodes = ((typeof host.classList !=="undefined")
				&& host.classList.contains("long-text"))?
			[host]:host.getElementsByClassName("long-text");
		for(var idx = 0; idx<nodes.length; idx++)
			if(Array.isArray(nodes[idx].words))
				makeReadMore(nodes[idx],height,nodes[idx].words );

		function makeReadMore(node, height, words){
			var high  = words.length - 1;
			var low = 0;
			if((node.offsetTop == 0) || (node.innerHTML != "")) return;
			if(node.isUnfolded == false) return;
			if (typeof node.isUnfolded === "undefined" ) node.isUnfolded = false;
			node.innerHTML = words.join(" ");
			if((node.offsetHeight < (height + lineHeight))||!height||node.isUnfolded ) return;
			var wrapper = cView.gNodes["read-more-wrapper"].cloneAll();
			cView.Utils.setChild(node.parentNode, node.classList[0], wrapper);
			cView.Utils.setChild(wrapper, "content", node);
			var idx;
			do{
				idx = Math.ceil((high+low)/2);
				node.innerHTML = words
					.slice(0,idx+1)
					.join(" ");
				if(wrapper.offsetHeight < height) low = idx;
				else if (wrapper.offsetHeight > height)high = idx;
				else break;
			}while((high - low) > 1);
			var cHeight = wrapper.offsetHeight;
			var inc =  cHeight > height?-1:1; 
			while(wrapper.offsetHeight == cHeight){
				idx += inc;
				node.innerHTML = words
					.slice(0,idx)
					.join(" ");
			}
			node.innerHTML = words
				.slice(0,idx-1)
				.join(" ");

		}
		var unamesHC = host.getElementsByClassName("url2link-uname");
		for(var idx = 0; idx < unamesHC.length; idx++){
			unamesHC[idx].addEventListener(
				"mouseover"
				,cView.Actions.toggleHighlightCmts
			);
			unamesHC[idx].addEventListener(
				"mouseout"
				,cView.Actions.toggleHighlightCmts
			);
		}

	}
	,"makeErrorMsg":function(err,nodeEButtons){
		var cView = this.cView;
		var node = cView.doc.createElement("div");
		node.className = "msg-error";
		var msg;
		try{msg = JSON.parse(err.data).err;}
		catch(e){msg = err.data;}
		node.innerHTML = err.code?("Error #"+err.code+": "+msg):"Looks like a network error";
		nodeEButtons.appendChild(node);
	}
	,"genBlockStrPage":function(domain){
		var cView = this.cView;
		var blockStrings = cView.blocks.blockStrings[domain]
		var page = cView.doc.createElement("div");
		if(Array.isArray(blockStrings))blockStrings.forEach(function(str){
			var item = cView.gNodes["blocks-item"].cloneAll(true);
			var inputs = cView.Utils.getInputsByName(item);
			inputs["type"].value = "str";
			inputs["val"].value  = str;
			item.cNodes["title"].innerHTML = str;
			page.appendChild(item);
		});
		return page;
	}
	,"drawRaw": function (output){
		var cView = this.cView;
		var settingsNames = require("json!./settings.json");
		cView.doc.location.search.substr(1).split("&").forEach(function(item){
			item = decodeURIComponent(item).split("=");
			if ((item.length != 2) || (settingsNames.indexOf(item[0]) == -1)) return;
			cView.localStorage.setItem(item[0], item[1]);
		});
		var node = cView.doc.createElement("div");
		output.appendChild(node);
		node.style["font-family"] = "monospace";
		settingsNames.forEach(function(name){
			node.innerHTML += name + "=" + cView.localStorage.getItem(name) + "<br />";
		});
	}
};
return _Drawer;
});


