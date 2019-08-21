"use strict";
function is(val){return typeof val !== "undefined";};
function goUnfolder(nodeImgAtt){
	var host = nodeImgAtt.parentNode;
	var total = 0;
	var cView = document.cView;
	for(var idx = 0; idx < nodeImgAtt.childNodes.length; idx++){
		total += nodeImgAtt.childNodes[idx].t.w  ;
		var nodeImg = nodeImgAtt.childNodes[idx].img;
		if(idx && (typeof nodeImg.src === "undefined")||(nodeImg.src == "") ) {
			nodeImgAtt.childNodes[idx].hidden = false;
			/*
			nodeImg.addEventListener("load",function(){ 
				cView.Utils.unscroll(function(){
					nodeImg.style.height = "auto";
					return nodeImgAtt;
				});
			});
			*/
			nodeImg.src = nodeImgAtt.childNodes[idx].url;
		}
		if (host.clientWidth < total) break;
		total += nodeImgAtt.childNodes[idx].style["margin-left"]*(!!idx);
	}
	if ((host.clientWidth < total)&&(nodeImgAtt.childNodes.length > 1) )
		host.cNodes["atts-unfold"].hidden = false;

}
define("./actions",[],function() {
function appendAttachment(nodeNewPost, name, file){
	var cView = document.cView;
	var nodeInput =  nodeNewPost.getNode(["c","edit-buttons"], ["c","edit-buttons-upload"]);
	nodeInput.disabled = true;
	var host = nodeNewPost.getNode(["c","post-to"]);
	var nodeSpinner = cView.doc.createElement("div");
	var buttonPost = nodeNewPost.getElementsByClassName("edit-buttons-post")[0];
	buttonPost.disabled = true;
	host.buttonPost = buttonPost;
	host.nodeInput = nodeInput;
	host.nodeSpinner = nodeSpinner;
	nodeSpinner.innerHTML = '<img src="'+gConfig.static+'throbber-100.gif">';
	nodeNewPost.getNode(["c", "new-post-cont"],["c","attachments"]).appendChild(nodeSpinner);
	if (typeof host.files === "undefined") host.files = new Array(); 
	if (typeof host.attachs === "undefined") host.attachs = new Object(); 
	host.files.push({ 
		"name":name 
		,"file":file
		,"timestamp":Date.now() 
	});
	regenAttaches(host);
}
function regenAttaches(host){
	var cView = document.cView;
	if (typeof host.attachs  === "undefined") return;
	var nodesDest = host.childNodes;
	var nodeInput = host.getNode(["p","new-post"], ["c","edit-buttons-upload"]);
	delete host.attP;
	var arrAttP = new Array();
	for (var idx = 0; idx < nodesDest.length; idx++ )(function(domain, userid){
		var context = cView.contexts[domain];
		var fullId = domain +"-"+ userid;
		if (typeof host.attachs[fullId] === "undefined") 
			host.attachs[fullId] = {
				"arrP":[]
				,"arrId":[]
				,"timestamps":[]
			}
		host.files.forEach(function(oAttach){
			if (host.attachs[fullId].timestamps.indexOf(oAttach.timestamp) == -1){
				var token = context.logins[userid].token;
				host.attachs[fullId].arrP.push(
					context.api.sendAttachment(
						token
						,oAttach.file
						,oAttach.name
					).then(function(data){
						var payload = data.attachments;
						var attachments = Array.isArray(payload)?payload[0]:payload ;
						var id = attachments.id;
						host.attachs[fullId].arrId.push(id);
						if (typeof host.nodeSpinner === "undefined") return data;
						var nodeAtt = cView.doc.createElement("div");
						nodeAtt.className = "att-img";
						nodeAtt.innerHTML = '<a target="_blank" href="'
							+attachments.url
							+'" border=none ><img src="'
							+attachments.thumbnailUrl
							+'"></a>';
						host.nodeSpinner.parentNode.replaceChild(nodeAtt, host.nodeSpinner);
						delete host.nodeSpinner;
						return data;
					})
				);
				arrAttP = arrAttP.concat(host.attachs[fullId].arrP);
				host.attachs[fullId].timestamps.push(oAttach.timestamp);
			}
		});
	})(nodesDest[idx].domain, nodesDest[idx].userid);
	host.attP = cView.Utils._Promise.all(arrAttP).then( function(data){
		host.nodeInput.value = "";
		host.nodeInput.disabled = false;
		host.buttonPost.disabled = false;
		return data;
	},function(data){
		host.nodeInput.value = "";
		host.nodeInput.disabled = false;
		host.buttonPost.disabled = false;
		if (typeof host.nodeSpinner === "undefined")
			delete host.nodeSpinner;
	});
}
function _Actions(v){
	this.cView = v;
};
_Actions.prototype = {
	constructor:_Actions
	/*
	,"auth": function(){
		var cView = document.cView;
		cView.Utils.auth();
	}
	*/
	,"newPost": function(e){
		var cView = document.cView;
		var textField = e.target.getNode(["p","new-post"],["c","new-post-cont"],["c","edit-txt-area"]);
		if (textField.value == ""){
			alert("you should provide some text");
			return;
		}
		textField.disabled = true;
		e.target.disabled = true;
		var nodeSpinner = e.target.parentNode.appendChild(cView.gNodes["spinner"].cloneNode(true));
		var postsTo = e.target.getNode(["p", "new-post"]).getElementsByClassName("new-post-to");
		var arrPostsTo = new Array(postsTo.length);
		var body = cView.Common.urlsToCanonical(textField.value);
		for (var idx = 0; idx < postsTo.length; idx++)arrPostsTo[idx] = postsTo[idx];

		var nodeError = e.target.parentNode.getElementsByClassName("msg-error")[0];
		if(typeof nodeError !== "undefined") nodeError.parentNode.removeChild(nodeError);

		cView.Utils._Promise.all(arrPostsTo.map(send)).then(function(res){
			var nodeAtt = cView.doc.createElement("div");
			var nodePostTo =  e.target.getNode(["p", "new-post"],["c","post-to"]);
			delete nodePostTo.attachs;
			delete nodePostTo.files;
			delete nodePostTo.attP;
			nodeAtt.className = "attachments";
			textField.parentNode.replaceChild(nodeAtt,
				textField.parentNode.cNodes["attachments"]);
			textField.parentNode.cNodes["attachments"] = nodeAtt;
			textField.value = "";
			textField.disabled = false;
			e.target.disabled = false;
			textField.style.height  = "4em";
			try{ e.target.parentNode.removeChild(nodeSpinner); }
			catch(e){};
			var arrNodes = new Array();
			arrPostsTo.forEach(function(postTo,idx){
				res[idx].posts.domain = postTo.domain;
				var context = cView.contexts[postTo.domain];
				cView.Common.loadGlobals(res[idx], context);
				var nodePostId = [
					context.domain
					,"post" 
					,res[idx].posts.id
				].join("-");
				if(!cView.doc.getElementById(nodePostId)){
					var nodePost = cView.doc.posts.insertBefore(
						cView.Drawer.genPost(res[idx].posts)
						, cView.doc.posts.childNodes[0]
					)
					cView.Drawer.applyReadMore(nodePost);
					arrNodes.push(nodePost);
				}
			});
			window.dispatchEvent(new CustomEvent("newNode", {"detail":arrNodes}));
			var login;
			if (cView.leadContext.gMe)
				login = cView.leadContext.gMe;
			else Object.keys(cView.contexts).some(function(domain){
					return login = cView.contexts[domain].gMe;
				});
			
			cView.updPostTo(login, true);
			cView.Drawer.regenHides();
		} ,function(err){
			textField.disabled = false;
			e.target.disabled = false;
			try{
				e.target.parentNode.removeChild(nodeSpinner );
			}catch(e){};
			cView.Drawer.makeErrorMsg(err,e.target.parentNode);
		});

		function send(postTo){
			var context = cView.contexts[postTo.domain];
			var postdata = new Object();
			postdata.meta = new Object();
			postdata.post = new Object();
			var input = postTo.getNode(["c","new-feed-input"],["c", "input"]);
			var feed = input.value;
			if((feed != "") && (typeof input.dest[feed] !== "undefined") 
			&& (postTo.feeds.indexOf(input.dest[feed]) == -1) ){
				postTo.feeds.push(input.dest[feed]);
			}
			postdata.post.body = body;
			postdata.meta.feeds = postTo.feeds ;
			if(typeof postTo.parentNode.attachs !== "undefined")
				postdata.post.attachments = postTo.parentNode.attachs[context.domain+"-"+postTo.userid].arrId;

			return context.api.sendPost(
				context.logins[postTo.userid].token
				,postdata
				,context.logins[postTo.userid].data.users.username
				,postTo.destType
				,context.timelineId
			);
		}			
		/*	if(postTo.isPrivate){
				oReq.open("post",matrix.cfg.srvurl+"post", true);
				oReq.setRequestHeader("x-content-type", "post");
				oReq.setRequestHeader("Content-type","text/plain");
				oReq.onload = onload;
				var payload =  {
					"feed":postTo.feeds[0],
					"type":"post",
					"author":cView.gMe.users.username,
					"data":textField.value
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
			}else*/{
			}
	}
	,"attachmentCtrl": function(e){//TODO
		appendAttachment(
			e.target.getNode(["p","new-post"])
			, e.target.value
			, e.target.files[0]
		);
	}
	,"editPost": function(e) {
		var cView = document.cView;
		var victim = e.target.getNode(["p","post"]);
		var domain = victim.rawData.domain;
		victim.classList.add("new-post");
		var nodeBody = victim.cNodes["post-body"];
		var nodeEdit = cView.Drawer.genEditNode(cView.Actions.postEditedPost,cView.Actions.cancelEditPost);
		var textArea = nodeEdit.cNodes["edit-txt-area"];
		victim.cNodes["add-sender"] = cView.doc.createElement("div");
		var nodePostTo = cView.doc.createElement("div");
		textArea.value = victim.rawData.body;
		cView.Utils.setChild(nodeBody , "post-cont", nodeEdit);
		cView.Utils.setChild(nodeBody , "title", nodePostTo);
		victim.cNodes["post-to"]  = nodePostTo;
		victim.cNodes["edit-buttons"]  = nodeEdit.cNodes["edit-buttons"];
		nodeBody.feeds = victim.rawData.postedTo;
		cView.Drawer.genPostTo(victim
			,nodeBody.feeds.map(function(id){return cView.contexts[domain].gFeeds[id].user.username ;})
			,cView.contexts[domain].logins[victim.rawData.createdBy].data
		);
		/*
		nodeTo.domain = victim.rawData.domain ;
		nodeTo.userid = victim.rawData.createdBy;
		nodeBody.replaceChild(nodeTo , nodeBody.cNodes["title"]);
		*/
		if (textArea.scrollHeight > textArea.clientHeight)
			textArea.style.height = textArea.scrollHeight + "px";
	}
	,"cancelEditPost": function(e){
		var cView = document.cView;
		var victim = e.target.getNode(["p","post"]);
		var context = cView.contexts[victim.rawData.domain]
		var postCNode = cView.doc.createElement("div");
		postCNode.innerHTML = context.digestText(victim.rawData.body);
		postCNode.className = "post-cont long-text";
		postCNode.dir = "auto";
		victim.cNodes["post-body"].replaceChild(postCNode,e.target.parentNode.parentNode );
		victim.cNodes["post-body"].cNodes["post-cont"] = postCNode;
		victim.cNodes["post-body"].cNodes["title"].innerHTML = cView.Drawer.genTitle(victim);
		victim.cNodes["post-body"].cNodes["title"].className = "title";
		cView.Drawer.applyReadMore(postCNode);
		cView.cTxt = null;

	}
	,"postEditedPost": function(e){
		var cView = document.cView;
		var nodePost =e.target.getNode(["p","post"]);
		var context = cView.contexts[nodePost.rawData.domain];
		e.target.disabled = true;
		var post = new Object();
		post.createdAt = nodePost.rawData.createdAt;
		post.createdBy = nodePost.rawData.createdBy;
		post.updatedAt = Date.now();
		post.attachments = nodePost.rawData.attachments;
		var postdata = new Object();
		postdata.post = post;
		var textField = e.target.parentNode.parentNode.cNodes["edit-txt-area"];
		textField.disabled = true;
		e.target.parentNode.replaceChild(cView.gNodes["spinner"].cloneNode(true),e.target.parentNode.cNodes["edit-buttons-cancel"] );
		var postTo =  nodePost.getElementsByClassName("new-post-to")[0];
		var input = postTo.getNode(["c","new-feed-input"],["c", "input"]);
		var feed = input.value;
		if((feed != "") && (typeof input.dest[feed] !== "undefined") 
		&& (postTo.feeds.indexOf(input.dest[feed]) == -1) ){
			postTo.feeds.push(input.dest[feed]);
		}
		post.feeds = postTo.feeds ;
		post.body = cView.Common.urlsToCanonical( textField.value);
		context.api.editPost(
			context.logins[nodePost.rawData.createdBy].token
			,nodePost.rawData.id
			,postdata
		).then(function(res){
			var post = res.posts;
			var postCNode = cView.doc.createElement("div");
			nodePost.rawData.body = post.body;
			nodePost.rawData.postedTo = post.postedTo;
			nodePost.cNodes["post-body"].cNodes["title"].innerHTML = cView.Drawer.genTitle(nodePost);
			nodePost.cNodes["post-body"].cNodes["title"].className = "title";
			/*
			var cpost = matrix.decrypt(post.body);
			if (typeof cpost.error === "undefined") {
				cpost = JSON.parse(cpost);
				post.body = cpost.payload.data;
				nodePost.sign = cpost.sign;
			}
			*/
			nodePost.cNodes["post-body"].replaceChild(postCNode,e.target.parentNode.parentNode );
			nodePost.cNodes["post-body"].cNodes["post-cont"] = postCNode;
			postCNode.innerHTML = context.digestText(post.body);
			postCNode.className = "post-cont long-text";
			postCNode.dir = "auto";
		},function(err){
			cView.Drawer.makeErrorMsg(err,textField.parentNode);
		});
		cView.cTxt = null;

	/*
		if(nodePost.isPrivate){
			oReq.open("put",matrix.cfg.srvurl+"edit", true);
			oReq.setRequestHeader("x-content-type", "post");
			oReq.setRequestHeader("Content-type","application/json");
			//oReq.onload = onload;
			var payload =  {
				"feed":nodePost.feed,
				"type":"post",
				"author":cView.gMe.users.username,
				"data":text
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
		}else
	*/
	}
	,"deletePost": function(e){
		var cView = document.cView;
		var victim =e.target.getNode(["p", "post"]);
		cView.Actions.deleteNode(victim, cView.Actions.doDeletePost);
	}
	,"doDeletePost": function(but){
		var cView = document.cView;
		var victim = but.node;
		var context = cView.contexts[victim.rawData.domain];
		but.parentNode.parentNode.removeChild(but.parentNode);
		context.api.deletePost( 
			context.logins[victim.rawData.createdBy].token
			,victim.rawData.id
		).then(function(){
			var host = victim.parentNode;	
			host.removeChild(victim);
			if(host.className == "metapost"){
				cView.Drawer.regenMetapost(host);
				var metapostData = cView.posts[victim.rawData.idx].data;
				metapostData.dups = metapostData.dups.filter(function(dup){ 
					return dup.id != victim.rawData.id;
				});
				if (metapostData.dups.length == 1)
					cView.posts[victim.rawData.idx].data = metapostData.dups[0];
			} else cView.posts.splice(victim.rawData.idx,1);
			cView.Drawer.regenHides();
		}, function(err){
			victim.hidden = false;
			cView.Drawer.makeErrorMsg(err,victim);
		});/*
		if(victim.isPrivate){
			oReq.open("delete",matrix.cfg.srvurl+"delete",true);
			oReq.setRequestHeader("x-content-id", victim.id);
			oReq.setRequestHeader("x-access-token", matrix.mkOwnToken(victim.sign));
			oReq.setRequestHeader("x-content-type", "post");
			oReq.send();
		}else*/{
		}
	}
	,"postLike": function(e){
		var cView = document.cView;
		var nodeLikes = cView.Utils.getNode(e.target,["p","post-info"],["c","likes"]);
		var nodePost = cView.Utils.getNode(nodeLikes, ["p","post"]);
		var context = cView.contexts[nodePost.rawData.domain];
		var action = e.target.action;
		e.target.innerHTML = "";
		e.target.appendChild(cView.gNodes["spinner"].cloneAll());
		context.api.sendLike(context.token, nodePost.rawData.id, action).then(function(){
			if(action){
				var idx;
				var likesUL;
				if (!nodeLikes.childNodes.length){
					nodeLikes.appendChild(cView.gNodes["likes-smile"].cloneNode(true));
					likesUL = cView.doc.createElement( "span");
					likesUL.className ="comma";
					var suffix = cView.doc.createElement("span");
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
				var nodeLike = cView.doc.createElement("span");
				nodeLike.className = "p-timeline-user-like";
				nodeLike.innerHTML = context.gUsers[context.gMe.users.id].link;
				if(likesUL.childNodes.length)likesUL.insertBefore(nodeLike, likesUL.childNodes[0]);
				else likesUL.appendChild(nodeLike);
				e.target.parentNode.parentNode.parentNode.myLike = nodeLike;
				if(!Array.isArray(nodePost.rawData.likes)) nodePost.rawData.likes = new Array();
				nodePost.rawData.likes.unshift(context.gMe.users.id);
				action = false;
			}else{
				nodePost.rawData.likes.splice(nodePost.rawData.likes.indexOf(context.gMe.users.id), 1) ;
				var myLike = e.target.parentNode.parentNode.parentNode.myLike;
				likesUL = myLike.parentNode;
				likesUL.removeChild(myLike);
				cView.Drawer.genLikes(nodePost);

			/*
				if (likesUL.childNodes.length < 2){
					var nodePI = nodeLikes.parentNode;
					nodePI.cNodes["likes"] = cView.doc.createElement("div");
					nodePI.cNodes["likes"].className = "likes";
					nodePI.replaceChild(nodePI.cNodes["likes"], nodeLikes);
				}
				*/
				action = true;
			}
			 
			e.target.action = action;
			e.target.innerHTML=action?"Like":"Un-like";
			try{
				e.target.parentNode.cNodes["msg-error"].hidden = true;
			}catch(e){};
		},function(err) { 
		
			cView.Drawer.makeErrorMsg(err,e.target.parentNode);
			e.target.innerHTML=action?"Like":"Un-like";
		});



	}
	,"unfoldLikes": function(e){
		var cView = document.cView;
		var nodePost = e.target.getNode(["p","post"]);
		var rawData = nodePost.rawData;
		var context = cView.contexts[rawData.domain];
		var span = e.target.getNode(["p","nocomma"]);
		var nodeLikes = span.parentNode.cNodes["comma"];

		if (nodePost.rawData.omittedLikes > 0){
			context.api.getPost(context.token 
				,context.gUsers[rawData.createdBy].username + "/" + rawData.id
				,["likes"]
			).then (function(postUpd){
				span.parentNode.removeChild(span);
				postUpd.users.forEach(cView.Common.addUser, context);
				nodePost.rawData.likes = postUpd.posts.likes;
				cView.Drawer.writeAllLikes(nodePost.id, nodeLikes);
				try{
					nodeLikes.parentNode.cNodes["msg-error"].hidden = true;
				}catch(e){};
			},function (err){
				cView.Drawer.makeErrorMsg(err,nodeLikes.parentNode);

			});

		}else cView.Drawer.writeAllLikes(id, nodeLikes);
	}
	,"getUsername": function(e){
		var cView = document.cView;
		var node = e.target; do node = node.parentNode; while(typeof node.user === "undefined");
		var nodePopUp = node.getNode(["p","user-popup"]);
		if ( cView.cTxt == null ){
			if (nodePopUp && (typeof nodePopUp.post !== "undefined"))
				cView.Actions.addComment({"target":nodePopUp.post});
			else return;
		}
		cView.cTxt.value += "@" + node.user;
		if(nodePopUp) nodePopUp.parentNode.removeChild(nodePopUp);

	}
	,"reqSubscription": function(e){
		var cView = document.cView;
		var username = cView.Utils.getNode(e.target,["p","up-controls"]).user;
		var loginId = e.target.getNode(["p","up-c-mu"]).loginId;
		var domain = e.target.getNode(["p","up-controls"]).domain;
		var context = cView.contexts[domain];
		context.api.reqSub( 
			context.logins[loginId].token
			,username
			,context.gUsers.byName[username].type 
		).then( function(){
			var span = cView.doc.createElement("span");
			span.innerHTML = "Request sent";
			e.target.parentNode.replaceChild(span, e.target);
			context.getWhoami(context.logins[loginId].token);
		} );
	}
	,"evtSubscribe": function(e){
		var cView = document.cView;
		var target = e.target;
		var nodeParent = target.parentNode;
		var spinner = cView.gNodes["spinner"].cloneAll();
		nodeParent.replaceChild(spinner, target);
		var nodeUC = cView.Utils.getNode(nodeParent,["p","up-controls"]);
		var username = nodeUC.user;
		var loginId = nodeParent.getNode(["p","up-c-mu"]).loginId;
		var context = cView.contexts[nodeUC.domain];
		context.api.evtSub(
			context.logins[loginId].token
			,username
			,target.subscribed
			,context.gUsers.byName[username].type 
		).then( function(res){
			context.logins[loginId].data = res;
			cView.Common.refreshLogin(loginId,context);
			cView.Utils.setChild(nodeParent.getNode(["p","up-controls"]).parentNode, "up-controls", cView.Drawer.genUpControls(context.gUsers.byName[username]));
			context.getWhoami(context.logins[loginId].token);
		},function(){ 
			cView.Drawer.makeErrorMsg(err,nodeParent);
			nodeParent.replaceChild( target, spinner);
		});
	}
	,"showHidden": function(e){
		var cView = document.cView;
		if(e.target.action){
			if(!cView.doc.hiddenCount)return;
			var nodeHiddenPosts = cView.doc.createElement("div");
			nodeHiddenPosts.id = "hidden-posts";
			cView.posts.forEach(function(oPost){
				if(oPost.data.type == "metapost"){
					var nodeOut;
					var hides = oPost.data.dups.filter(function(post){
						return post.isHidden;
					});
					if (hides.length == 0)return;
					if (hides.length == 1) 
						nodeOut = cView.Drawer.genPost(hides[0]);
					else nodeOut = cView.Drawer.makeMetapost(
						hides.map(cView.Drawer.genPost, cView)
					);
					return nodeHiddenPosts.appendChild(nodeOut);
				}
				if(!oPost.hidden)return;
				nodeHiddenPosts.appendChild(
					cView.Drawer.genPost(oPost.data)
				);
			});
			e.target.parentNode.parentNode.insertBefore(nodeHiddenPosts , e.target.parentNode.nextSibling);
			e.target.innerHTML =  "Collapse "+ cView.doc.hiddenCount + " hidden entries";
			cView.Drawer.applyReadMore(nodeHiddenPosts);
		}else{
			var nodeHiddenPosts = cView.doc.getElementById("hidden-posts");
			if (nodeHiddenPosts) nodeHiddenPosts.parentNode.removeChild(nodeHiddenPosts);
			if (cView.doc.hiddenCount) e.target.innerHTML = "Show "+ cView.doc.hiddenCount + " hidden entries";
			else e.target.innerHTML = "";
		}
		e.target.action = !e.target.action;
	}
	,"postHide": function(e){
		var cView = document.cView;
		var victim = e.target.getNode(["p","post"]);
		var action = e.target.action;
		var context = cView.contexts[victim.rawData.domain];
		context.api.sendHide(context.token, victim.rawData.id, action).then(function(){
				cView.Actions.doHide(victim, action, "user");
		});
	}
	,"doHide": function(victim, action){
		var cView = document.cView;
		var nodeHide = victim.getNode(["c","post-body"],["c","post-info"],["c","post-controls"],["c","controls"],["c","hide"]);
		var host = victim.parentNode;
		if(!host || (action != nodeHide.action)) return;
		var oPost = cView.posts[victim.rawData.idx];
		var nodeShow = cView.doc.getElementsByClassName("show-hidden")[0];
		if (!nodeShow){
			nodeShow = cView.gNodes["show-hidden"].cloneAll();
			nodeShow.cNodes["href"].action = true;
			cView.doc.getElementById("content").appendChild(nodeShow);
		}
		var aShow = nodeShow.cNodes["href"];
		var count = 1;
		if(action){
			host.removeChild(victim);
			if(host.className != "metapost") oPost.hidden = true;
			else cView.Drawer.regenMetapost(host); 
			if ((oPost.data.type != "metapost")
			|| !oPost.data.dups.some(function(dup){return dup.isHidden == true;}))  
				cView.doc.hiddenCount++;
			aShow.action = false;
			aShow.dispatchEvent(new Event("click"));
		}else{
			nodeHide.innerHTML = "Hide";
			cView.posts[victim.rawData.idx].hidden = false;
			if(oPost.data.type == "metapost"){
				var unhidden =  oPost.data.dups.find(function(post){ 
					return post.isHidden?0:1; 
				});
				if (typeof unhidden === "undefined" )
					insertPost(victim);
				else{
					var dupId = [unhidden.domain,"post" ,unhidden.id].join("-");
					var dup = document.getElementById(dupId);
					var newHost = dup.parentNode;
					if (newHost.className == "metapost" ){
						newHost.appendChild(victim);
						cView.Drawer.regenMetapost(newHost);
					}else{
						var dummy = document.createElement("div");
						newHost.insertBefore(dummy, dup);
						newHost.replaceChild(
							cView.Drawer.makeMetapost([victim, dup])
							,dummy
						);
					}
				}
				if((host.className != "metapost")|| !cView.Drawer.regenMetapost(host))
					cView.doc.hiddenCount--;
			}else{
				insertPost(victim);
				cView.doc.hiddenCount--;
			}
			cView.Drawer.applyReadMore(victim);
			if(cView.doc.hiddenCount) 
				aShow.innerHTML = "Collapse "
					+ cView.doc.hiddenCount 
					+ " hidden entries";
			else aShow.dispatchEvent(new Event("click"));
		}
		victim.rawData.isHidden = action;
		nodeHide.action = !action;
		function insertPost(victim){
			var idx = victim.rawData.idx;
			var count = 0;
			do if(cView.posts[idx--].hidden)count++;
			while ( idx >0 );
			if ((victim.rawData.idx - count+1) >= cView.doc.posts.childNodes.length )
				cView.doc.posts.appendChild(victim);
			else cView.doc.posts.insertBefore(victim
				,cView.doc.posts.childNodes[victim.rawData.idx - count+1]
			);
		}

	}
	,"addComment": function(e){
		var cView = document.cView;
		var nodePost = cView.Utils.getNode(e.target,["p","post"]);
		var postNBody = nodePost.cNodes["post-body"];
		if(nodePost.rtCtrl.isBeenCommented === true)return;
		nodePost.rtCtrl.isBeenCommented = true;
		var nodeComment = cView.Drawer.genAddComment(cView.contexts[nodePost.rawData.domain]);
		postNBody.cNodes["comments"].appendChild(nodeComment);
		cView.cTxt = nodeComment.getElementsByClassName("edit-txt-area")[0];
		cView.cTxt.focus();
	}
	,"editComment": function(e){
		var cView = document.cView;
		var victim = e.target.getNode(["p", "comment"]);
		var context = cView.contexts[victim.domain];
		var nodeEdit = cView.Drawer.genEditNode(cView.Actions.postEditComment,cView.Actions.cancelEditComment);
		var textArea = nodeEdit.cNodes["edit-txt-area"];
		textArea.value = context.gComments[victim.rawId].body;
	
		victim.replaceChild( nodeEdit, victim.cNodes["comment-body"]);
		victim.cNodes["comment-body"] = nodeEdit;
		nodeEdit.className = "comment-body";
		cView.cTxt = victim.getElementsByClassName("edit-txt-area")[0];
		cView.cTxt.focus();
		if (textArea.scrollHeight > textArea.clientHeight)
			textArea.style.height = textArea.scrollHeight + "px";
	}
	,"postEditComment": function(e){
		var cView = document.cView;
		var nodeComment = e.target.getNode(["p", "comment"]);
		var postId = nodeComment.getNode(["p","post"]).rawData.id;
		var context = cView.contexts[nodeComment.domain];
		var textField = e.target.parentNode.parentNode.cNodes["edit-txt-area"];
		e.target.disabled = true;
		var spinner = cView.gNodes["spinner"].cloneNode(true);
		var nodeCancel = e.target.parentNode.replaceChild(spinner, e.target.parentNode.cNodes["edit-buttons-cancel"] );
		var comment = context.gComments[nodeComment.rawId];
		comment.body = cView.Common.urlsToCanonical(textField.value);
		comment.updatedAt = Date.now();
		var postdata = new Object();
		postdata.comment = comment;
		context.api.editComment( context.logins[comment.createdBy].token
			,comment.id, postdata,postId 
		).then( function(res){
			nodeComment.parentNode.replaceChild(cView.Drawer.genComment.call(context, res.comments),nodeComment);
			context.gComments[comment.id] = res.comments;
		},function(err){
			e.target.disabled = false;
			e.target.parentNode.replaceChild(nodeCancel, spinner);
			cView.Drawer.makeErrorMsg(err,nodeComment);
		});
		cView.cTxt = null;

	}
	,"cancelEditComment": function(e){
		var cView = document.cView;
		var nodeComment = e.target.getNode(["p","comment"]);
		var context = cView.contexts[nodeComment.getNode(["p","post"]).rawData.domain];
		var newNodeComment = cView.Drawer.genComment.call(context, context.gComments[nodeComment.rawId]);
		nodeComment.parentNode.replaceChild(newNodeComment,nodeComment);
		cView.Drawer.applyReadMore(newNodeComment);
		cView.cTxt = null;
	}
	,"processText": function(e) {
		var cView = document.cView;
		cView.cTxt = e.target;
		if (e.target.scrollHeight > e.target.clientHeight)
			e.target.style.height = e.target.scrollHeight + "px";
		if (e.ctrlKey && (e.which == "13")){
			e.preventDefault();
			e.stopImmediatePropagation();
			//if(text.charAt(text.length-1) == "\n") e.target.value = text.slice(0, -1);
			e.target.parentNode.parentNode.getElementsByClassName("edit-buttons-post")[0].dispatchEvent(new Event("click"));
		}

	}
	,"cancelNewComment": function(e){
		var cView = document.cView;
		var nodePost = e.target.getNode(["p", "post"]);
		nodePost.rtCtrl.isBeenCommented = false;
		if(typeof nodePost.rtCtrl.bumpLater !== "undefined")
			setTimeout(nodePost.rtCtrl.bumpLater, 1000);
		var nodeComment = e.target.getNode(["p", "comment"]);
		nodeComment.parentNode.removeChild(nodeComment);
		cView.cTxt = null;

	}
	,"postNewComment": function(e){
		var cView = document.cView;
		e.target.disabled = true;
		var textField = e.target.getNode(["p","edit"], ["c","edit-txt-area"]);
		var spinner = cView.gNodes["spinner"].cloneNode(true);
		var nodeEButtons = textField.parentNode.cNodes["edit-buttons"];
		var butCancel = e.target.parentNode.replaceChild(spinner,e.target.parentNode.cNodes["edit-buttons-cancel"] );
		var nodeComment = cView.Utils.getNode(textField, ["p", "comment"]);
		var nodePost = cView.Utils.getNode(nodeComment,["p", "post"])
		var context = cView.contexts[nodePost.rawData.domain];
		nodeEButtons.cNodes["edit-buttons-post"].disabled = true;
		var comment = new Object();
		comment.body = cView.Common.urlsToCanonical(textField.value);
		comment.postId = nodePost.rawData.id;
		comment.createdAt = null;
		comment.createdBy = null;
		comment.updatedAt = null;
		comment.post = null;
		var postdata = new Object();
		postdata.comment = comment;
		var token;
		var nodesSelectUsr = nodeComment.getElementsByClassName("select-user-ctrl")[0].childNodes;
		if(context.ids.length > 1){
			for(var idx = 0; idx < nodesSelectUsr.length; idx++){
				if (nodesSelectUsr[idx].selected){
					token = context.logins[nodesSelectUsr[idx].value].token;
					break;
				}
			}
		}else token = context.token;

		var nodeError = nodeEButtons.getElementsByClassName("msg-error")[0];
		if(typeof nodeError !== "undefined") nodeError.parentNode.removeChild(nodeError);

		context.api.sendComment(token,postdata).then(function(res){
			nodePost.rtCtrl.isBeenCommented = false;
			if(typeof nodePost.rtCtrl.bumpLater !== "undefined")
				setTimeout(nodePost.rtCtrl.bumpLater, 1000);
			var comment = res.comments;
			context.gComments[comment.id] = comment;
			if( nodeComment.parentNode.children.length > 4 )
				nodePost.getNode(["c","post-body"],["c","many-cmts-ctrl"]).hidden = false;
			if(!document.getElementById(context.domain + "-cmt-" + comment.id)){
				var newComment = cView.Drawer.genComment.call(context, comment);
				nodeComment.parentNode.replaceChild(newComment ,nodeComment);
				cView.Drawer.applyReadMore(newComment);
				if(nodePost.rawData.comments.indexOf(comment.id) == -1)
					nodePost.rawData.comments.push(comment.id);
				window.dispatchEvent(new CustomEvent("newNode", {"detail":newComment}));
			} else nodeComment.parentNode.removeChild(nodeComment);
		},function(err){
			nodeEButtons.cNodes["edit-buttons-post"].disabled = false;
			nodeEButtons.replaceChild(butCancel,spinner );
			cView.Drawer.makeErrorMsg(err,nodeEButtons);
		});
		cView.cTxt = null;
		
	}
	,"deleteComment": function(e){
		var cView = document.cView;
		var nodeComment = e.target.getNode(["p", "comment"]);
		cView.Actions.deleteNode(nodeComment,cView.Actions.doDeleteComment);
	}

	,"deleteNode": function(node,doDelete){
		var cView = document.cView;
		var nodeConfirm = cView.doc.createElement("div");
		var butDelete = cView.doc.createElement("button");
		butDelete.innerHTML = "delete";
		butDelete.node = node;
		butDelete.onclick = function(){doDelete(butDelete);};
		var butCancel0 = cView.doc.createElement("button");
		butCancel0.innerHTML = "cancel";
		butCancel0.onclick = function (){cView.Actions.deleteCancel(nodeConfirm)};
		var aButtons = [butDelete,butCancel0] ;
		nodeConfirm.innerHTML = "<p>Sure delete?</p>";
		aButtons.forEach(function(but){ but.className = "confirm-button";});
		nodeConfirm.appendChild(aButtons.splice(Math.floor(Math.random()*2 ),1)[0]);
		nodeConfirm.appendChild(aButtons[0]);
		node.parentNode.insertBefore(nodeConfirm,node);
		nodeConfirm.node = node;
		node.hidden = true;

	}
	,"deleteCancel": function(nodeConfirm){
		var cView = document.cView;
		nodeConfirm.node.hidden = false;
		nodeConfirm.parentNode.removeChild(nodeConfirm);
	}
	,"doDeleteComment": function(but){
		var cView = document.cView;
		var nodeComment = but.node;
		var nodePost = nodeComment.getNode(["p", "post"])
		var context = cView.contexts[nodePost.rawData.domain];
		but.parentNode.parentNode.removeChild(but.parentNode);
		but.node.hidden = false;
		var token;
		if( typeof context.logins[nodeComment.userid] != "undefined") 
			token = context.logins[nodeComment.userid].token;
		else if (typeof context.logins[nodePost.rawData.createdBy] != "undefined" )
			token = context.logins[nodePost.rawData.createdBy].token;
		else return;
		context.api.deleteComment(token, nodeComment.rawId, nodePost.rawData.id ).then(function(){
			if(nodeComment.parentNode) nodeComment.parentNode.removeChild(nodeComment);
			delete context.gComments[nodeComment.rawId];
		});
/*		
		if(nodePost.isPrivate){
			oReq.open("delete",matrix.cfg.srvurl+"delete",true);
			oReq.setRequestHeader("x-content-id", nodeComment.id);
			oReq.setRequestHeader("x-access-token", matrix.mkOwnToken(nodeComment.sign));
			oReq.setRequestHeader("x-content-type", "comment");
			oReq.send();
		}else{
*/
	}
	,"unfoldComm": function(e){
		var cView = document.cView;
		var nodePost = e.target.getNode(["p","post"]);
		var domain = nodePost.rawData.domain;
		var context = cView.contexts[domain];
		var id = nodePost.id;
		var spUnfold = e.target.parentNode.appendChild(cView.doc.createElement("i"));
		var host = e.target.getNode(["p","comment-body"]);
		spUnfold.className = "fa fa-spinner fa-pulse";
		return context.api.getPost(context.token
			, context.gUsers[nodePost.rawData.createdBy].username
				+ "/" + nodePost.rawData.id 
			, ["comments"]
		).then( function(postUpd){
			var arrCmts = new Array();
			nodePost.rawData.omittedComments = 0; 
			cView.Common.loadGlobals(postUpd, context);
			postUpd.posts.domain = domain;
			cView.doc.getElementById(id).rawData = postUpd.posts;
			var nodePB = cView.doc.getElementById(id).cNodes["post-body"];
			var text = "";
			if (nodePost.rtCtrl.isBeenCommented == true)
				text = nodePB.getElementsByTagName("textarea")[0].value;	
			if(typeof nodePost.rtCtrl.bumpLater !== "undefined")
				setTimeout(nodePost.rtCtrl.bumpLater, 1000);
			var host = cView.doc.createElement("div");
			host.className = "comments";

			postUpd.comments.forEach(function(cmt){
				context.gComments[cmt.id] = cmt;
				var nodeCmt = cView.Drawer.genComment.call(context, cmt);
				host.appendChild(nodeCmt);
				arrCmts.push(nodeCmt);
			});
			if (nodePost.rtCtrl.isBeenCommented == true){ 
				var nodeComment = cView.Drawer.genAddComment(context);
				host.appendChild(nodeComment);
				nodeComment.getElementsByClassName("edit-txt-area")[0].value = text;
			}
			cView.Utils.setChild(nodePB,"comments", host);
			nodePost.getNode(["c","post-body"],["c","many-cmts-ctrl"]).hidden = false;
			if ((context.ids.indexOf(postUpd.posts.createdBy) == -1) && (postUpd.posts.commentsDisabled == "1")){
				var nodeCmtControls = nodePost.getElementsByClassName("cmts-add");
				for(var idx = 0; idx < nodeCmtControls.length; idx++){
					nodeCmtControls[idx].style.display = "none";
					nodeCmtControls[idx].nextSibling.style.display = "none";
				}
			}
			cView.Drawer.applyReadMore( nodePB);

			window.dispatchEvent(new CustomEvent("newNode", {"detail":arrCmts}));
			return postUpd;

		},function(err){
			spUnfold.parentNode.removeChild(spUnfold);
			cView.Drawer.makeErrorMsg(err,host);

		});
	}
	,"calcCmtTime": function(e){
		var cView = document.cView;
		var nodeCmt = cView.Utils.getNode(e.target,["p","comment"]);
		if (typeof(nodeCmt.createdAt) !== "undefined" ){
			var absUxTime = nodeCmt.createdAt*1;
			var txtdate = new Date(absUxTime ).toString();

			e.target.title =  cView.Utils.relative_time(absUxTime) + " ("+ txtdate.slice(0, txtdate.indexOf("(")).trim()+ ")";
		}
	}
	,"me": function(e){
		e.currentTarget.href = gConfig.front+"filter/me";
	}
	,"goComments": function(e){
		e.currentTarget.href = gConfig.front+"filter/comments";
	}
	,"home": function(e){
		e.currentTarget.href = gConfig.front;
	}
	,"directs": function(e){
		e.currentTarget.href = gConfig.front+ "filter/direct";
	}
	,"notifications": function(e){
		e.currentTarget.href = gConfig.front+ "filter/notifications";
	}
	,"bestof": function(e){
		e.currentTarget.href = gConfig.front+ "filter/best_of";
	}
	,"my": function(e){
		e.currentTarget.href = gConfig.front+ "filter/discussions";
	}
	,"newDirectInp": function(e){
		var cView = document.cView;
		var nodeP = e.target.getNode(["p","new-post-to"]);
		var victim = e.target.getNode(["p", "new-post"]);
		if(e.which == "13") return cView.Actions.newDirectAddFeed(e);

		var nodeTip = cView.gNodes["friends-tip"].cloneAll();
		nodeTip.inp = e.target;
		nodeTip.style.top = e.target.offsetHeight;
		nodeTip.style.left = 0;// e.target.offsetLeft ;
		nodeTip.style.width = e.target.offsetWidth;
		if((typeof e.target.tip !== "undefined") && e.target.tip.parentNode) {
			e.target.parentNode.replaceChild(nodeTip, e.target.tip);
			e.target.tip = nodeTip;
		}else e.target.tip =  e.target.parentNode.appendChild(nodeTip);
		var myFeed = cView.contexts[nodeP.domain].logins[nodeP.userid].data.users.username;
		if((nodeP.destType == "posts") && (nodeP.feeds.indexOf(myFeed) == -1 )){
			li = document.createElement("li");
			li.innerHTML = "My Feed";
			li.className = "ft-i";
			nodeTip.cNodes["ft-list"].appendChild(li);
			li.addEventListener("click",function(e){
				var li = cView.gNodes["new-post-feed"].cloneAll();
				li.innerHTML = "My Feed";
				li.oValue = myFeed;
				nodeP.cNodes["new-post-feeds"].appendChild(li);
				nodeP.feeds.push(myFeed);
				nodeP.getNode(["p","new-post"], ["c","edit-buttons"],["c","edit-buttons-post"]).disabled = false;
			});
		}
	
		var txt = e.target.value.toLocaleLowerCase();
		var pos =  e.target.suggest;
		for(var idx = 0; idx < txt.length; idx++){
			if (typeof pos[txt.charAt(idx)] !== "undefined")
				pos = pos[txt.charAt(idx)];
			else{
				pos = null;
				break;
			}
		}
		if(pos && pos.arr)pos.arr.forEach(function(user){
			var li = cView.gNodes["ft-i"].cloneAll();
			li.innerHTML = user;
			nodeTip.cNodes["ft-list"].appendChild(li);
		});
		
		if(typeof e.target.dest[txt] !== "undefined")
			nodeP.getNode(["p","new-post"],["c","edit-buttons"],["c","edit-buttons-post"]).disabled = false;
	}
	,"doBan": function(e){
		var cView = document.cView;
		//var nodePopUp = e.target; do nodePopUp = nodePopUp.parentNode; while(nodePopUp.className != "user-popup");
		var nodeUC = e.target.getNode(["p","up-controls"]);
		var username = nodeUC.user;
		var bBan = e.target.checked;
		var nodeParent = e.target.parentNode;
		var loginId = e.target.getNode(["p","up-c-mu"]).loginId;
		var context = cView.contexts[nodeUC.domain];
		var user = context.gUsers.byName[username];
		var spinner = cView.gNodes["spinner"].cloneNode(true);
		nodeParent.replaceChild(spinner,e.target);
		context.api.doBan(context.logins[loginId].token,username, bBan).then(function(){
			var banIds = context.logins[loginId].data.users.banIds;
			if (bBan)banIds.push(context.gUsers.byName[username].id);
			else{
				var idx = banIds.indexOf(user.id);
				if (idx != -1 ) banIds.splice(idx, 1);
			}
			cView.Common.saveLogins();
			if (typeof nodeUC.parentNode !== "undefined" )
				cView.Utils.setChild(nodeUC.parentNode, "up-controls", cView.Drawer.genUpControls(user));
		},function(){
			if (typeof nodeUC.parentNode !== "undefined" )
				cView.Utils.setChild(nodeUC.parentNode, "up-controls", cView.Drawer.genUpControls(user));

		});

	}
	,"doUnBan": function(e){
		var cView = document.cView;
		var nodeHost = e.target.getNode(["p","up-controls"]);
		var loginId = e.target.getNode(["p","up-c-mu"]).loginId;
		var context = cView.contexts[nodeHost.domain];
		var username = nodeHost.user;
		var user = context.gUsers.byName[username];
		var spinner = cView.gNodes["spinner"].cloneNode(true);
		e.target.parentNode.replaceChild(spinner,e.target);
		context.api.doBan(context.logins[loginId].token, username, false).then(function(){
			var banIds = context.logins[loginId].data.users.banIds;
			var idx = banIds.indexOf(user.id);
			if (idx != -1 ) banIds.splice(idx, 1);
			cView.localStorage.setItem("gMe",JSON.stringify(cView.logins));
			if (typeof nodeHost.parentNode !== "undefined" )
				cView.Utils.setChild(nodeHost.parentNode, "up-controls", cView.Drawer.genUpControls(user));
		},function(res){	
			console.log(res);
			if (typeof nodeHost.parentNode !== "undefined" )
				cView.Utils.setChild(nodeHost.parentNode, "up-controls", cView.Drawer.genUpControls(users));
		});

	}
	,"doBlockCom": function(e){
		var cView = document.cView;
		var nodeUPC = e.target.getNode(["p" ,"up-controls"]);
		var id = cView.contexts[nodeUPC.domain].gUsers.byName[nodeUPC.user].id; 
		cView.Common.updateBlockList("blockComments" ,nodeUPC.domain, id ,e.target.checked);
		cView.Drawer.blockComments( nodeUPC ,e.target.checked);
	}
	,"doBlockPosts": function(e){
		var cView = document.cView;
		var nodeUPC = e.target.getNode(["p" ,"up-controls"]);
		var id = cView.contexts[nodeUPC.domain].gUsers.byName[nodeUPC.user].id; 
		cView.Common.updateBlockList("blockPosts" ,nodeUPC.domain, id  ,e.target.checked);
		cView.Drawer.blockPosts( nodeUPC,e.target.checked );
	}
	,"setRadioOption": function(e){
		var cView = document.cView;
		cView.localStorage.setItem(e.target.name, e.target.value );
	}
	,"unfoldAttImgs": function (e){
		var cView = document.cView;
		var nodeAtts = cView.Utils.getNode(e.target,["p", "attachments"]);
		var nodeImgHost = nodeAtts.cNodes["atts-img"];
		if(nodeAtts.cNodes["atts-unfold"].cNodes["unfold-action"].value == "true"){
			nodeImgHost.style.flexWrap = "wrap";
			for (var idx = 1;idx < nodeImgHost.childNodes.length; idx++){
				nodeImgHost.childNodes[idx].hidden = false;
				nodeImgHost.childNodes[idx].img.src = nodeImgHost.childNodes[idx].url;
				nodeImgHost.childNodes[idx].img.style.height = "auto";
			}
			
			nodeAtts.cNodes["atts-unfold"].getElementsByTagName("a")[0].innerHTML = '<i class="fa fa-chevron-up fa-2x"></i>';
			nodeAtts.cNodes["atts-unfold"].cNodes["unfold-action"].value = "false";
		}else{
			nodeImgHost.style.flexWrap = "nowrap";
			nodeAtts.cNodes["atts-unfold"].getElementsByTagName("a")[0].innerHTML = '<i class="fa fa-chevron-down fa-2x"></i>';
			nodeAtts.cNodes["atts-unfold"].cNodes["unfold-action"].value = "true";
		}

	}
	,"ftClose": function(e){
		var cView = document.cView;
		var victim =cView.Utils.getNode(e.target,["p","friends-tip"]);
		victim.inp.tip = undefined;
		victim.parentNode.removeChild(victim);

	}
	,"selectFeed": function(e){
		var cView = document.cView;
		var input = e.target.getNode(["p","friends-tip"]).inp;
		input.value = e.target.innerHTML;
		var event = new Event("click");
		input.getNode(["p","new-post-to"],["c","new-feed-add"]).dispatchEvent(event);
	}
	,"postDirect": function(e){
		var cView = document.cView;
		var victim =e.target.getNode(["p","new-post"]);
		var nodesSenders = victim.getElementsByClassName("new-post-to");	
		for (var idx = 0; idx<nodesSenders.length; idx++){
			var nodeSender = nodesSenders[idx];
			var context = cView.contexts[nodeSender.domain];
			var input = nodeSender.getNode(["c","new-feed-input"],["c","input"]).value;
			if ((input != "") && (typeof context.gUsers.byName[input] !== "undefined")
			&& context.gUsers.byName[input].friend 
			&& (context.gUsers.byName[input].subscriber||context.gUsers.byName[input].type == "group"))
			nodeSender.feeds.push(input);

			/*
			if (nodeSender.feeds.length) cView.Actions.newPost(e);
			else alert("should have valid recipients");
			*/
		}
		cView.Actions.newPost(e);
	}
	,"logout": function(){
		var cView = document.cView;
		//matrix.ready = 0;
		try{matrix.logout();}catch(e){};
		cView.localStorage.removeItem("logins");
		Object.keys(cView.contexts).forEach(function(domain){
			cView.contexts[domain].token = null;
		});
		cView.Common.saveLogins();
		location.assign(gConfig.front);
	}
	,"newPostRemoveFeed": function(e){
		var cView = document.cView;
		var nodeP = e.target.parentNode.parentNode;
		nodeP.cNodes["new-feed-input"][e.target.idx].disabled = false;
		for(var idx = 0; idx < nodeP.feeds.length; idx++){
			if(nodeP.feeds[idx] == e.target.oValue){
				nodeP.feeds.splice(idx,1);
				break;
			}
		}
		e.target.parentNode.removeChild(e.target);
		if(nodeP.feeds.length == 0)
			nodeP.getNode(["p","new-post"],["c","edit-buttons"],["c","edit-buttons-post"]).disabled = true;
	}
	,"newDirectRemoveFeed": function(e){
		var cView = document.cView;
		var nodeP = cView.Utils.getNode(e.target,["p","new-post-to"]);
		var idx = nodeP.feeds.indexOf(e.target.oValue);
		if(idx != -1 ) nodeP.feeds.splice(idx,1);
		e.target.parentNode.removeChild(e.target);
		var input = nodeP.getNode(["c","new-feed-input"],["c", "input"]);
		if((nodeP.feeds.length == 0)
		&&((input.value == "")||(typeof input.dest[input.value] === "undefined" ) ))
			nodeP.getNode(["p","new-post"],["c","edit-buttons"],["c","edit-buttons-post"]).disabled = true;
	}
	,"newPostAddFeed": function(e){
		var cView = document.cView;
		var nodeP = e.target.getNode(["p", "new-post-to"]);
		var input = nodeP.getNode(["c","new-feed-input"],["c", "input"]);
		input.hidden = false;
		if (input.value == "") return;
		var feed = input.value;
		if((feed != "") && (typeof input.dest[feed] !== "undefined") 
		&& (nodeP.feeds.indexOf(input.dest[feed]) == -1) ){
			nodeP.feeds.push(input.dest[feed]);
			var li = cView.gNodes["new-post-feed"].cloneAll();
			li.innerHTML = input.dest[feed];
			li.oValue = input.dest[feed];
			nodeP.cNodes["new-post-feeds"].appendChild(li);
			input.value = "";
		}
		nodeP.getNode(["p","new-post"],["c","edit-buttons"],["c","edit-buttons-post"]).disabled = false;
	}
	,"newDirectAddFeed": function(e){
		var cView = document.cView;
		var nodeP = e.target.getNode(["p","new-post-to"]);
		var input = nodeP.getNode(["c","new-feed-input"],["c", "input"]);
		if (input.value == "") return;
		var username = input.dest[input.value];
		if (nodeP.feeds.indexOf(username) != -1 ) return;
		if(typeof input.tip !== "undefined")
			input.tip.parentNode.removeChild(input.tip);
		nodeP.feeds.push(username);
		var li = cView.gNodes["new-post-feed"].cloneAll();
		li.innerHTML = username;
		li.oValue = username;
		nodeP.cNodes["new-post-feeds"].appendChild(li);
		input.value = "";
		nodeP.getNode(["p","new-post"],["c","edit-buttons"],["c","edit-buttons-post"]).disabled = false;
	}
	,"newPostSelect": function(e){
		var cView = document.cView;
		var option = e.target[e.target.selectedIndex];
		if (option.value == "")return;
		var nodeP = e.target.parentNode;
		var context = cView.contexts[nodeP.domain];
		if (option.privateFeed ){
			nodeP.isPrivate  = true;
			var ul = cView.doc.createElement("ul");
			ul.className = "new-post-feeds";
			nodeP.replaceChild(ul, nodeP.cNodes["new-post-feeds"]);
			nodeP.cNodes["new-post-feeds"] = ul;
			nodeP.feeds = new Array();
			for(var idx = 0; idx < e.target.length; idx++)
				e.target[idx].disabled = false;
		}
		option.disabled = true;
		nodeP.feeds.push(option.value);
		var li = cView.doc.createElement("li");
		if(option.value == context.gMe.users.username)li.innerHTML = "My feed";
		else li.innerHTML = "@" + option.value;
		li.className = "new-post-feed";
		li.oValue = option.value;
		li.idx = e.target.selectedIndex;
		li.addEventListener("click", cView["Actions"]["newPostRemoveFeed"]);
		nodeP.cNodes["new-post-feeds"].appendChild(li);
		nodeP.getNode(["p","new-post"],["c","edit-buttons"],["c","edit-buttons-post"]).disabled = false;
	}
	,"evtUserPopup": function(e){
		var cView = document.cView;
		var node = e.target; while(typeof node.userid === "undefined")node = node.parentNode;
		var nodePost = node.getNode(["p","post"]);
		var context = cView.contexts[nodePost.rawData.domain];
		var user = context.gUsers[node.userid];
		var innerWidth = window.innerWidth;
		if(cView.doc.getElementById("userPopup" + context.domain+ node.userid))return;
		var nodePopup = cView.Drawer.genUserPopup(node, user);
		nodePopup.post = nodePost;
		nodePopup.style.opacity = 0;
		cView.doc.getElementsByTagName("body")[0].appendChild(nodePopup);
		nodePopup.style.top = 0;
		nodePopup.style.left = 0;
		var width = nodePopup.offsetWidth;
		nodePopup.style.top = e.pageY;
		nodePopup.style.left = e.pageX;
		if(nodePopup.offsetLeft + width > innerWidth){
			nodePopup.style.left = "auto";
			nodePopup.style.right = "1em";
		}
		nodePopup.style["z-index"] = 2;
		nodePopup.style.opacity = 1;
	}
	,"upClose": function(e){
		var cView = document.cView;
		var node = e.target.getNode(["p", "user-popup"]);
		node.parentNode.removeChild(node);
	}
	,"destroy": function(e){
		var cView = document.cView;
		if (!e.currentTarget.parentNode)return;
		if (e.eventPhase != Event.AT_TARGET)return;
		e.target.parentNode.removeChild(e.target);
		//e.stopPropagation();

	}
	,"realTimeSwitch": function(e){
		var cView = document.cView;
		if(e.target.checked )cView.localStorage.setItem("rt",1);
		else cView.localStorage.setItem("rt",0);
	}
	,"goSettings": function (e){
		var cView = document.cView;
		e.currentTarget.href = gConfig.front+"settings";
	}
	,"goRequests": function (e){
		var cView = document.cView;
		e.currentTarget.href = gConfig.front+"requests";
	}
	,"genBlock": function (e){
		var cView = document.cView;
		var node = e.target.parentNode;
		var nodeUC = e.target.getNode(["p","up-controls"]);
		var nodeBlock = cView.gNodes["up-block"].cloneAll();
		var context = cView.contexts[nodeUC.domain];
		nodeBlock.className = "user-popup"; 
		nodeBlock.user = node.user;
		node.appendChild(nodeBlock);
		nodeBlock.style.top =  e.target.offsetTop;
		nodeBlock.style.left = e.target.offsetLeft;
		nodeBlock.style["z-index"] = 2;
		var chkboxes = nodeBlock.getElementsByTagName("input");
		for(var idx = 0; idx < chkboxes.length; idx++){
			var list = cView.blocks[chkboxes[idx].value];
			if((typeof list !== "undefined") 
				&& (typeof list[context.domain]!== "undefined")
				&& (list[context.domain] != null) 
				&& (typeof list[context.domain][context.gUsers.byName[nodeUC.user].id] !== "undefined")
			)
				chkboxes[idx].checked = true;
		}

	}
	,"updateProfile": function (e){
		var cView = document.cView;
		var nodeProfile = cView.Utils.getNode(e.target,["p","settings-profile"]);
		e.target.disabled = true;
		nodeProfile.getElementsByClassName("spinner")[0].hidden = false;
		var inputs = cView.Utils.getInputsByName(nodeProfile); 
		var id = inputs["id"].value; 
		var context = cView.contexts[inputs["domain"].value]; 
		var oUser = context.logins[id].data.users;
		oUser.screenName = inputs["screen-name"].value;
		oUser.email = inputs["email"].value;
		var access = inputs[["access",oUser.domain, oUser.id].join("-")].value;
		switch (access){
		case "is-private":
			oUser.isPrivate = "1";
			break;
		case "is-protected":
			oUser.isProtected = "1";
			break;
		default:
			oUser.isPrivate = "0";
			oUser.isProtected = "0";
		}

		oUser.description = nodeProfile.cNodes["gs-descr"].value;
		oUser.homeFeedMode = nodeProfile.cNodes["friends-view"].value;
		var nodeMsg = nodeProfile.getElementsByClassName("update-status")[0];
		nodeMsg.className = "update-status";
		nodeMsg.innerHTML = "";
		context.api.updProfile(context.logins[id].token, id, {"user":oUser})
		.then(function(res){
			e.target.disabled = false;
			nodeProfile.getElementsByClassName("spinner")[0].hidden = true;
			context.logins[id].data = res;
			nodeMsg.classList.add("sr-info");
			nodeMsg.innerHTML = "Updated. @"+ oUser.username +"'s feed is <span style='font-weight: bold;'>" + ((oUser.isPrivate == "1")?"private":"public")+ ".</span>";
			cView.Common.refreshLogin(id, context);
		}
		,function(res){
			e.target.disabled = false;
			nodeProfile.getElementsByClassName("spinner")[0].hidden = true;
			nodeMsg.classList.add( "msg-error");
			nodeMsg.innerHTML = "Got error: ";
			try{ 
				nodeMsg.innerHTML += res.data.err;
			}catch(e) {nodeMsg.innerHTML += "unknown error";};

			
		});
	}
	,"addAcc": function (e){
		var cView = document.cView;
		var nodePorfiles = e.target.getNode( ["p","accaunts-settings"],["c","settings-profiles"]);
		var nodeLogin = cView.gNodes["settings-login"].cloneAll();
		nodePorfiles.appendChild(nodeLogin);
		document.getElementsByClassName("gs-add-acc")[0].hidden = true;
		Object.keys(cView.contexts).forEach(function(domain,num){
			var nodeIB = cView.gNodes["input-block"].cloneAll();
			var nodeInput = nodeIB.cNodes["ib-input"];
			nodeInput.value = domain;
			nodeInput.name = "domain";
			nodeIB.cNodes["ib-span"].innerHTML = domain;
			nodeInput.addEventListener("change",cView.Actions.setDomainInfo);
			nodeLogin.cNodes["domains"].appendChild(nodeIB); 
			if(domain == gConfig.leadDomain){
				nodeInput.checked = true;
				nodeInput.dispatchEvent(new Event("change"));
			}
		});

	}
	,"addProfileLogin": function (e){
		var cView = document.cView;
		e.target.disabled = true;
		var nodeLogin = cView.Utils.getNode(e.target, ["p","settings-login"]);
		nodeLogin.getElementsByClassName("spinner")[0].hidden = false;
		var inpsLogin = cView.Utils.getInputsByName(nodeLogin);
		var context = cView.contexts[inpsLogin["domain"].value];
		var userid = null;
		var nodeMsg = nodeLogin.cNodes["msg-error"];
		context.api.login(
			inpsLogin["login-username"].value.trim()
			,inpsLogin["login-password"].value.trim()
		).then( function(res){
			nodeMsg.hidden = true;
			userid = res.users.id;
			if(!context.ids)context.token = res.authToken;
			if(typeof context.logins[userid] !== "undefined"){
				cView.doc.getElementsByClassName("gs-add-acc")[0].hidden = false;
				nodeLogin.parentNode.removeChild(nodeLogin);
				return; 
			}
			context.logins[userid] = new Object();
			context.logins[userid].token =  res.authToken;
			context.logins[userid].domain = context.domain;
			if (!context.token)context.token = res.authToken;
			cView.Common.saveLogins();
			context.getWhoami(res.authToken).then(finish);

		} ,function(res){
			nodeMsg.hidden = false;
			nodeMsg.innerHTML = res.code+" "+ res.data;
			nodeLogin.getElementsByClassName("spinner")[0].hidden = true;
			e.target.disabled = false;
		});
		function finish(){
			cView.doc.getElementsByClassName("gs-add-acc")[0].hidden = false;
			nodeLogin.parentNode.replaceChild(cView.Drawer.genProfile(context.logins[userid].data.users),nodeLogin);

		}
	}
	,"setMainProfile": function(e){
		if(!e.target.checked)return;
		var cView = document.cView;
		var nodeProf = e.target.getNode(["p","settings-profile"]);
		var inputs = cView.Utils.getInputsByName(nodeProf);
		var id = inputs["id"].value;
		var context = cView.contexts[inputs["domain"].value];
		context.token = context.logins[id].token;
		cView.Common.saveLogins();
	}
	,"logoutAcc": function(e){
		var cView = document.cView;
		var nodeProf = cView.Utils.getNode(e.target, ["p","settings-profile"]);
		var inputs = cView.Utils.getInputsByName(nodeProf);
		var id = inputs["id"].value;
		var context = cView.contexts[inputs["domain"].value];
		var token = context.logins[id].token;
		delete context.logins[id];
		nodeProf.parentNode.removeChild(nodeProf);
		if(token ==  context.token){
			context.token = null;
			nodesProf = cView.doc.getElementsByClassName("settings-profile");
			if (!nodesProf.length) return cView.Actions.logout(e);
			for (var idx = 0; idx < nodesProf.length; idx++ ){
				var nodeProf = nodesProf[idx];
				inputs = cView.Utils.getInputsByName(nodeProf);
				if(context.domin != inputs["domain"].value) continue;
				id = inputs["id"].value;
				inputs["is-main-"+context.domain].checked = true;
				context.token = context.logins[id].token;
				break;
			}
		}
		cView.Common.saveLogins();
	}
	,"setRTparams": function (e){
		var cView = document.cView;
		var value = e.target.value;
		e.target.parentNode.getElementsByTagName("span")[0].innerHTML = value + " minutes";
		var oRTParams = new Object();
		["rt-bump-int", "rt-bump-cd", "rt-bump-d"].forEach(function(id){
			oRTParams[id] = cView.doc.getElementById(id).value;
		});
		cView.localStorage.setItem("rt_params",JSON.stringify(oRTParams) );
	}
	,"setRTBump": function (e){
		var cView = document.cView;
		var bump = e.target.checked;
		cView.localStorage.setItem("rtbump",bump?1:0);
		cView.doc.getElementById("rt-params").hidden = !bump;
	}
	,"srAccept": function (e){
		var cView = document.cView;
		cView.Actions.sendReqResp(e.target, "acceptRequest" );
	}
	,"srReject": function (e){
		var cView = document.cView;
		cView.Actions.sendReqResp(e.target, "rejectRequest" );
	}
	,"sendReqResp": function (node, action){
		var cView = document.cView;
		node.parentNode.hidden = true;
		var host = node.parentNode.parentNode;
		var context = cView.contexts[host.cNodes["sr-domain"].value];
		var spinner = cView.gNodes["spinner"].cloneNode(true);
		host.appendChild(spinner);
		context.api.reqResp(context.logins[host.cNodes["sr-id"].value].token
			,host.cNodes["sr-user"].value
			,action
			,host.cNodes["sr-reqid"].value
			,host.cNodes["sr-type"].value
			,context.gUsers[host.cNodes["sr-dest"].value].username
		).then(function() {
			host.parentNode.removeChild(host);
			var nodeSR = cView.doc.getElementById("sr-info");
			if(--cView.subReqsCount){
				nodeSR.cNodes["sr-info-a"].innerHTML = "You have "
				+ cView.subReqsCount
				+ " subscription requests to review.";
			}else{
				nodeSR.hidden = true;
				var victim = cView.doc.getElementById("sr-header");
				victim.parentNode.removeChild(victim);
			}
			
		}
		,function(err){
			host.removeChild(spinner);
			cView.Drawer.makeErrorMsg(err,host);
			node.parentNode.hidden = false;
		});

	}
	,"getauth": function (e){
		var cView = document.cView;
		var context = cView.leadContext;
		var oReq = new XMLHttpRequest();
		context.api.login(
			cView.doc.getElementById("a-user").value.trim()
			,cView.doc.getElementById("a-pass").value.trim()
		).then(function(data){
				cView.Common.setCookie(gConfig.domains[context.domain].tokenPrefix 
					+ "authToken"
					, data.authToken
				);
				cView.localStorage.setItem( "logins"
					,JSON.stringify([{
						"domain":context.domain
						,"token":data.authToken
					}])
				);
				location.reload();
		},function(err){
			cView.doc.getElementById("auth-msg").innerHTML = JSON.parse(err.data).err;
		});
	}
	,"showUnfolder":function(e){
		var cView = document.cView;
		var nodeImgAtt = cView.Utils.getNode(e.target, ["p", "atts-img"]);
		e.target.style.height = "auto";
		goUnfolder(nodeImgAtt);
	
	}
	,"showUnfolderRt":function(e){
		var cView = document.cView;
		var nodeImgAtt = cView.Utils.getNode(e.target, ["p", "atts-img"]);
		cView.Utils.unscroll(function(){
			e.target.style.height = "auto";
			return nodeImgAtt;
		});
		cView.Utils.getNode(e.target, ["p", "att-img"]).t.w = e.target.width;
		goUnfolder(nodeImgAtt);
	}
	,"chngAvatar":function(e){
		var cView = document.cView;
		var Utils = cView.Utils;
		var files = e.target.parentNode.cNodes["edit-buttons-upload"].files; 
		if (!files.length)return;
		e.target.disabled = true;
		var nodeImg = e.target.getNode(["p","chng-avatar"],["c","sp-avatar-img"]);
		nodeImg.src = gConfig.static+"throbber-100.gif";
		var inputs = Utils.getInputsByName( e.target.getNode(["p","settings-profile"]));
		var id = inputs["id"].value;
		var context = cView.contexts[inputs["domain"].value];
		var token = context.logins[id].token;
		context.api.chngAvatar(token, files[0]).then( function() {
			e.target.value = "";
			e.target.disabled = false;
			context.getWhoami(token).then(function(res){
				nodeImg.src = context.logins[id].data.users.profilePictureMediumUrl;
			});
		});
	}
	,"addSender": function(e){
		var cView = document.cView;
		if(document.getElementById("add_sender"))return;
		var host = e.target.getNode(["p","add-sender"]);
		var nodePopup = cView.Drawer.genAddSender(function(login,context){
			if(typeof login === "undefined")return;
			var globalId = login.domain + "-" + login.id;
			if (host.ids.indexOf(globalId) == -1 ) {
				host.ids.push(globalId);
				cView.updPostTo(login,false, login.users.username);
				var victim = document.getElementById("add_sender");
				victim.parentNode.removeChild(victim);
				regenAttaches(document.getElementsByClassName("post-to")[0]);
			}
		});

		cView.doc.getElementsByTagName("body")[0].appendChild(nodePopup);
		nodePopup.className = "user-popup";
		nodePopup.style.top = e.pageY;
		nodePopup.style.left = e.pageX - nodePopup.clientWidth;
		nodePopup.style["z-index"] = 1;
	}
	,"setSender":function(e){
		e.target.getNode(["p","add-sender-dialog"]).id = e.target.id;
	}
	,"newPostRmSender":function(e){
		var host = e.target.getNode(["p","post-to"]);
		var ids = document.getElementsByClassName("add-sender")[0].ids;
		ids.splice(ids.indexOf(e.target.parentNode.userid),1);
		host.removeChild(e.target.parentNode);
		var rmSenders = host.getElementsByClassName("rm-sender");
		if(rmSenders.length == 1)rmSenders[0].hidden = true;
		regenAttaches(host);
	}
	,"unfoldUserDet":function(e){
		var cView = document.cView;
		document.getElementsByClassName("ud-info")[0].style.display = "flex";
		document.getElementsByClassName("ud-fold")[0].hidden = false;
		document.getElementsByClassName("ud-unfold")[0].style.display = "none";
		cView.Drawer.applyReadMore(document.getElementsByClassName("ud-info")[0]);
	}
	,"foldUserDet":function(e){
		document.getElementsByClassName("ud-info")[0].style.display = "none";
		document.getElementsByClassName("ud-fold")[0].hidden = true;
		document.getElementsByClassName("ud-unfold")[0].style.display = "block";
	}
	,"goUserSubs": function(e){
		e.target.getNode(["p","uds-subs"]).href =document.location + "/subscriptions";
	}
	,"goUserSubsc": function(e){
		e.target.getNode(["p","uds-subsc"]).href = document.location + "/subscribers";
	}
	,"goUserComments": function(e){
		e.target.getNode(["p","uds-com"]).href = document.location + "/comments";
	}
	,"goUserLikes": function(e){
		e.target.getNode(["p","uds-likes"]).href = document.location +"/likes";
	}
	,"morePostCtrls":function(e){
		if(e.target!=e.currentTarget) return;
		var cView = document.cView;
		var node = e.target.parentNode;
		var nodePost = e.target.getNode(["p","post"]);
		var nodeMore = cView.gNodes["adv-cmts"].cloneAll();
		nodeMore.user = node.user;
		nodeMore.style["z-index"] = 2;
		var nodeDisCmt = nodeMore.getElementsByClassName("disable-cmts")[0];
		var nodeModCmt = nodeMore.getElementsByClassName("moderate-cmts")[0];

		if((typeof nodePost.rawData.commentsDisabled !== "undefined")
		&& JSON.parse(nodePost.rawData.commentsDisabled)){
			nodeDisCmt.innerHTML = "Enable comments";
			nodeDisCmt.action = false;
		}else nodeDisCmt.action = true;

		if(nodePost.commentsModerated){
			nodeModCmt.innerHTML = "Stop moderating comments";
			nodeModCmt.action = false;
		}else nodeModCmt.action = true;
		e.target.appendChild(nodeMore);
		cView.Utils.fixPopupPos(nodeMore);


	}
	,"showDelete": function(e){
		var cView = document.cView;
		var action = e.target.action;
		var nodePost = e.target.getNode(["p","post"]);
		nodePost.commentsModerated = action;
		var comments = e.target.getNode(["p","post-body"],["c","comments"]).getElementsByClassName("comment");
		for(var idx = 0; idx < comments.length; idx++){
			var comment = comments[idx];
			if (cView.contexts[nodePost.rawData.domain].ids.indexOf(comment.userid) != -1)
				continue;
			comment.getNode(["c","comment-body"],["c","comment-controls"]).hidden = !action;
		}
		e.target.innerHTML = action?"Stop moderating comments":"Moderate comments";
		e.target.action = !action;

	}
	,"switchCmts": function(e){
		var cView = document.cView;
		var nodePost = e.target.getNode(["p","post"]);
		var post = nodePost.rawData;
		var context = cView.contexts[post.domain];
		var spinner = cView.gNodes["spinner"].cloneAll(); 
		var parentNode = e.target.parentNode;
		var ctrl = parentNode.replaceChild(spinner, e.target);
		context.api.switchCmts(context.logins[post.createdBy].token
			,post.id
			,e.target.action )
		.then(function(res){
			post.commentsDisabled = ctrl.action?"1":"0";
			ctrl.innerHTML = ctrl.action?"Enable comments":"Disable commnents";
			nodePost.getElementsByClassName("cmts-lock-msg")[0].hidden = !ctrl.action;
			ctrl.action = !ctrl.action;
			parentNode.replaceChild(ctrl, spinner);	
			try{
				parentNode.cNodes["msg-error"].hidden = true;
			}catch(e){};
		},function(err){
			cView.Drawer.makeErrorMsg(err,parentNode);
		});
	}
	,"goSetAccounts": function(e){
		e.currentTarget.href = gConfig.front+"settings/accounts";
	}
	,"goSetAddons": function(e){
		e.currentTarget.href = gConfig.front+"settings/addons";
	}
	,"goSetBlocks": function(e){
		e.currentTarget.href = gConfig.front+"settings/blocks";
	}
	,"goSetCustomUI": function(e){
		e.currentTarget.href = gConfig.front+"settings/customui";
	}
	,"goSetDisplay": function(e){
		e.currentTarget.href = gConfig.front+"settings/display";
	}
	,"setDomainInfo": function(e){
		e.target.getNode(["p","settings-login"],["c","info"]).innerHTML = "Log in to&nbsp;"
		+ gConfig.domains[e.target.value].msg;
	}
	,"showRefl": function(e){
		var cView = document.cView;
		var id = e.target.getNode(["p","reflect-menu-item"],["c","victim-id"]).value;
		var metapost = e.target.getNode(["p","metapost"])
		var nodesPosts = metapost.getElementsByClassName("post");
		for (var idx = 0; idx < nodesPosts.length; idx++)
			nodesPosts[idx].hidden = (nodesPosts[idx].id != id);
		cView.Drawer.applyReadMore(document.getElementById(id));
		var menuItems = metapost.getElementsByClassName("reflect-menu-item");
		for (var idx = 0; idx < menuItems.length; idx++){
			if (menuItems[idx].cNodes["c","victim-id"].value == id){
				menuItems[idx].className = "reflect-menu-item pr-selected"; 
				menuItems[idx].cNodes["star"].hidden = true;
			}
			else menuItems[idx].className = "reflect-menu-item pr-deselected"; 
		}
	}
	,"toggleSidebar":function(e){
		var sidebar = document.getElementById("sidebar");
		var showSb = document.getElementById("show-sidebar");
		sidebar.classList.toggle("sidebar-h");
		showSb.classList.toggle("hidden");
	}
	,"setChkboxOption":function(e){
		var cView = document.cView;
		cView.localStorage.setItem(e.target.value, e.target.checked );
	}
	,"unfoldReadMore":function(e){
		var cView = document.cView;
		var wrapper = e.target.getNode(["p","read-more-wrapper"]);
		var victim = wrapper.cNodes["content"];
		victim.innerHTML = victim.words;
		victim.isUnfolded = true;
		cView.Utils.setChild(wrapper.parentNode, victim.classList[0],victim );
		
		window.dispatchEvent(new CustomEvent("updNode", {"detail":victim}));
	}
	,"remBlockingItem":function(e){
		var cView = document.cView;
		var victim = cView.Utils.getNode(e.target,["p","blocks-item"]);
		var domain = victim.getNode(["p","blocks-settings-page"],["c","domain"]).value;
		var inputs = cView.Utils.getInputsByName(victim);
		switch(inputs.type.value){
		case "str":
			var strings = cView.blocks.blockStrings[domain];
			var idx = strings.indexOf(inputs.val.value);
			if(idx != -1) strings.splice(idx, 1);
			cView.Common.updateBlockList("blockStrings", domain, inputs.val.value, false);
			break;
		case "posts":
		case "cmts":
			cView.Common.updateBlockList(
				cView.blockLists[inputs.type.value]
				,domain
				,inputs.val.value
				,false
			);
			break;
		}
		victim.parentNode.removeChild(victim);
	}
	,"addBlockingString":function(e){
		var cView = document.cView;
		if((e.type != "click")&& (e.which != "13")) return ;
		var str = cView.Utils.getInputsByName(e.target.getNode(["p","controls"]))["strToBlock"].value.trim();
		var host = e.target.getNode(["p","blocks-settings-page"]);
		var domain = host.getNode(["c","domain"]).value;
		var item = cView.gNodes["blocks-item"].cloneAll();
		var inputs = cView.Utils.getInputsByName(item);
		if((typeof cView.blocks.blockStrings[domain] !== "undefined")
		&& (cView.blocks.blockStrings[domain].indexOf(str) != -1 ))return;
		inputs["type"].value = "str";
		inputs["val"].value  = str;
		item.cNodes["title"].innerHTML = str;
		host.getNode(["c","strings"],["c","content"]).appendChild(item);
		cView.Common.updateBlockList("blockStrings", domain, str, true);
	}
	,"copyBlockingStrings": function(e){
		var cView = document.cView;
		var host = e.target.getNode(["p","blocks-settings-page"]);
		var domain = host.getNode(["c","domain"]).value;
		cView.tmp = cView.blocks.blockStrings[domain];
		var buttons = cView.doc.getElementsByTagName("button");
		for (var idx = 0; idx < buttons.length; idx++) {
			if(buttons[idx].className == "paste")buttons[idx].disabled = false;
		}

	
	}
	,"pasteBlockingStrings": function(e){
		var cView = document.cView;
		var host = e.target.getNode(["p","blocks-settings-page"]);
		var domain = host.getNode(["c","domain"]).value;
		if(!Array.isArray(cView.blocks.blockStrings[domain]))
			cView.blocks.blockStrings[domain] = new Array();
		var arr = cView.blocks.blockStrings[domain];
		cView.blocks.blockStrings[domain] = arr.concat(
			cView.tmp.filter(function (item) { return arr.indexOf(item) < 0; })
		);
		var buttons = cView.doc.getElementsByTagName("button");
		for (var idx = 0; idx < buttons.length; idx++) {
			if(buttons[idx].className == "paste")buttons[idx].disabled = true;
		}
		delete cView.tmp;
		cView.Utils.setChild(
			host.cNodes["strings"]
			,"content"
			,cView.Drawer.genBlockStrPage(domain)
		);	
		cView.Common.updateBlockList();


	}
	,"setHideCups": function(e){
		var cView = document.cView;
		var nodeCtrl = e.target.getNode(["p" ,"blocks-settings-page-ctrl"]);
		cView.localStorage.setItem("addons-linkcups-hide"
			,cView.Utils.getInputsByName(nodeCtrl)["hideCups"].checked
		);
	}
	,"toggleHighlightCmts": function(e){
		var cView = document.cView;
		var node = e.target;
		if (node.tagName.toLowerCase() != "a"){
			node = cView.Utils
				.getNode(node,["p","cmt-author"])
				.getElementsByTagName("a")[0];
		} 
		e.stopPropagation();
		var nodePost = cView.Utils.getNode(node,["p","post"]);
		var domain = nodePost.rawData.domain;
		var username = node.href.substr(gConfig.front.length+4+domain.length);
		var userid = cView.contexts[domain].gUsers.byName[username].id;
		if(typeof userid === "undefined" )return;
		var nodesCmts = nodePost.getElementsByClassName("comment");
		for (var idx = 0; idx < nodesCmts.length; idx++) {
			if(nodesCmts[idx].userid == userid)
				nodesCmts[idx]
				.classList
				.toggle("highlighted");
		}
	}
	,"selectAll": function(e){
		e.target.setSelectionRange(0, e.target.value.length);
	}
	,"foldComments":function(e){
		var cView = document.cView;
		var nodePost = e.target.getNode(["p","post"]);
		var post = nodePost.rawData;
		var context = cView.contexts[post.domain];
		var host = cView.doc.createElement("div");
		host.className = "comments";
		host.appendChild(cView.Drawer.genComment.call(context, context.gComments[post.comments[0]]));
		var nodeLoad = cView.gNodes["comments-load"].cloneAll();
		nodeLoad.getElementsByClassName("num")[0].innerHTML = post.omittedComments + post.comments.length;
		host.appendChild(nodeLoad);
		host.appendChild(cView.Drawer.genComment.call(context, context.gComments[post.comments[post.comments.length - 1]]));

		if (nodePost.rtCtrl.isBeenCommented == true){ 
			var nodeComment = cView.Drawer.genAddComment(context);
			host.appendChild(nodeComment);
			nodeComment.getElementsByClassName("edit-txt-area")[0].value = nodePost.getElementsByTagName("textarea")[0].value;	
		}
		var refNode = nodePost.getNode(["c","post-body"],["c","many-cmts-ctrl"]);
		var refTop = refNode.getBoundingClientRect().top;
		cView.Utils.setChild(nodePost.cNodes["post-body"],"comments", host);
		cView.Drawer.applyReadMore( host);
		window.scrollBy(0,refNode.getBoundingClientRect().top - refTop);
		nodePost.getNode(["c","post-body"],["c","many-cmts-ctrl"]).hidden = true;
	}
	,"submitCuUm": function(e){
		var cView = document.cView;
		var customFunctions = require("./custom_functions.json");
		var item = cView.gNodes["custom-ui-item"].cloneAll(true);
		var host = cView.doc.getElementById("custom-ui-um-display")
		var slots = cView.Utils.getInputsByName(item);
		var inputs = cView.Utils.getInputsByName(cView.doc.getElementById("custom-ui-um-control"));
		var functionId = cView.doc.getElementById("cu-um-function").value;
		var options = cView.doc.getElementById("cu-um-function").getElementsByTagName("option");
		if(functionId == "spacer"){
			slots["type"].value = "spacer";	
			item.cNodes["title"].innerHTML = "&bullet;";
			host.appendChild(item);
			clearCU();
			return;
		}
		for(var idx = 0; idx < options.length; idx++ ) if(options[idx].selected){
			options[idx].disabled = true;
			break;
		}
		if ((typeof inputs["label"].value === "undefined")|| (inputs["label"].value == "")){
			if((typeof inputs["icon"].value !== "undefined") && inputs["icon"].value != "" ){
				slots["val"].value = inputs["icon"].value;
				var icon = cView.doc.createElement("i");
				icon.className = "fa fa-2x fa-" + inputs["icon"].value;
				item.cNodes["title"].appendChild(icon); 
			}else{
				slots["val"].value = customFunctions[functionId].descr;
				item.cNodes["title"].innerHTML = customFunctions[functionId].descr;
			}
		}else{
			slots["val"].value = inputs["label"].value;
			item.cNodes["title"].innerHTML = inputs["label"].value
				.trim().replace(/&/g,"&amp;")
				.replace(/</g, "&lt;")
				.replace(/>/g, "&gt;");
		}
		options[0].selected = true;
		slots["type"].value = functionId;
		item.title = functionId;
		host.appendChild(item);
		clearCU();
		cView.localStorage.setItem(
			"custom-ui-upper"
			,JSON.stringify(cView.Common.regenCustomUi(host))
		);
		function clearCU(){
			Object.keys(inputs).forEach(function(name){inputs[name].value = ""});
			cView.doc.getElementById("cu-um-icon").firstChild.className = "";
		};
	}
	,"customUILabelInput":function(e){
		var cView = document.cView;
		var inputs = cView.Utils.getInputsByName(cView.doc.getElementById("custom-ui-um-control"));
		inputs["icon"].value;
		cView.doc.getElementById("cu-um-icon").firstChild.className = "";
	}
	,"selectIcon": function(e){
		if (document.getElementById("selector-fa-dialog")) return;
		var cView = document.cView;
		var host = e.target.getNode(["p","select-ico"]); 
		var inputs = cView.Utils.getInputsByName(e.target.getNode(["p","custom-ui-um-control"])); 
		var dlg =  cView.FaSelector.makeSelector(cb);
		var innerWidth = window.innerWidth;
		dlg.style.opacity = 0;
		//cView.doc.getElementsByTagName("body")[0].appendChild(dlg);
		host.appendChild(dlg);
		dlg.style.top = 0;
		dlg.style.left = 0;
		var width = dlg.offsetWidth;
		dlg.style.top = e.pageY;
		dlg.style.left = e.pageX;
		if(dlg.offsetLeft + width > innerWidth){
			dlg.style.left = "auto";
			dlg.style.right = "1em";
		}
		dlg.style["z-index"] = 2;
		dlg.style.opacity = 1;
		host.body.appendChild(dlg);
		//document.body.appendChild(dlg);
		function cb(name){
			inputs["icon"].value = name;
			inputs["label"].value = "";
			host.getNode(["c","cu-um-icon"], ["c","i"]).className = "fa fa-2x fa-" + name;
		}
	}
	,"remCustomUiItem": function(e){
		var cView = document.cView;
		var victim = e.target.getNode(["p","custom-ui-item"]); 
		var host = victim.getNode(["p","custom-ui-um-display"]);
		victim.parentNode.removeChild(victim);
		cView.localStorage.setItem(
			"custom-ui-upper"
			,JSON.stringify(cView.Common.regenCustomUi(host))
		);
		var inputs = cView.Utils.getInputsByName(victim);
		var options = cView.doc.getElementById("cu-um-function").getElementsByTagName("option");
		for(var idx = 0; idx < options.length; idx++ ) if(options[idx].value == inputs.type.value){
			options[idx].disabled = false;
			break;
		}
	}
	,"notMentions": function(e){
		e.currentTarget.href = gConfig.front+ "filter/notifications?filter=mentions";
	}
	,"notSubs": function(e){
		e.currentTarget.href = gConfig.front+ "filter/notifications?filter=subscriptions";
	}
	,"notGroups": function(e){
		e.currentTarget.href = gConfig.front+ "filter/notifications?filter=groups";
	}
	,"notDirect": function(e){
		e.currentTarget.href = gConfig.front+ "filter/notifications?filter=directs";
	}
	,"notBans": function(e){
		e.currentTarget.href = gConfig.front+ "filter/notifications?filter=bans";
	}
	,"postEditPaste": function(e){
		if (e.clipboardData.types.indexOf("Files") == -1) return;
		
		 Array.prototype.slice.call(e.clipboardData.files).forEach(function(file){
		 	appendAttachment(
				e.target.getNode(["p","new-post"])
				, file.name
				, file
			);
		});
	}
	,"summDay": function(e){
		var cView = document.cView;
		var src = is(cView.summarySource)?cView.summarySource:"";
		e.currentTarget.href = gConfig.front+src+"summary/1" 
	}
	,"summWeek": function(e){
		var cView = document.cView;
		var src = is(cView.summarySource)?cView.summarySource:"";
		e.currentTarget.href = gConfig.front+src+"summary/7" 
	}
	,"summMonth": function(e){
		var cView = document.cView;
		var src = is(cView.summarySource)?cView.summarySource:"";
		e.currentTarget.href = gConfig.front+src+"summary/30" 
	}
	,"goMemories": function(e){
		var cView = document.cView;
		var txtDate = "";
		txtDate = e.target.getNode(["p","memories-selector"], ["c", "memories-date"] ).value;
		if(txtDate != "")
			window.location = gConfig.front+"memories/"+txtDate.replace(/-/g,"");
	}

};
return _Actions;
});
