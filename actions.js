"use strict";
define("Actions",[],function() {
function _Actions(v){
	this.cView = v;
};
_Actions.prototype = {
	constructor:_Actions
	,"auth": function(){
		var cView = document.cView;
		cView.Utils.auth();
	}
	,"newPost": function(e){
		var cView = document.cView;
		var textField = e.target.parentNode.parentNode.cNodes["edit-txt-area"];
		textField.disabled = true;
		e.target.disabled = true;
		var nodeSpinner = e.target.parentNode.appendChild(cView.gNodes["spinner"].cloneNode(true));
		var post = new Object();
		var postsTo = e.target.parentNode.parentNode.getElementsByClassName("new-post-to");
		var arrPostsTo = new Array(postsTo.length);
		for (var idx = 0; idx < postsTo.length; idx++)arrPostsTo[idx] = postsTo[idx];
		if(arrPostsTo.some(function(postTo){ return postTo.feeds.length == 0; })) {
			alert("should have valid recipients");
			textField.disabled = false;
			e.target.disabled = false;
			e.target.parentNode.removeChild(nodeSpinner );
			return;
		}
		if(textField.pAtt)textField.pAtt.then(function(){ arrPostsTo.forEach(send);});
		else arrPostsTo.forEach(send);

		function send(postTo){
			var postdata = new Object();
			postdata.meta = new Object();
			postdata.meta.feeds = postTo.feeds ;
			var oReq = new XMLHttpRequest();
			var onload = function(){
				if(oReq.status < 400){
					var nodeAtt = cView.doc.createElement("div");
					nodeAtt.className = "attachments";
					textField.parentNode.replaceChild(nodeAtt,
						textField.parentNode.cNodes["attachments"]);
					textField.parentNode.cNodes["attachments"] = nodeAtt;
					textField.value = "";
					textField.disabled = false;
					delete textField.pAtt;
					delete textField.attachments;
					postTo.feeds = new Array();
					cView.updPostTo(cView.gMe, true, cView.gMe.users.username);
					e.target.disabled = false;
					textField.style.height  = "4em";
					try{ e.target.parentNode.removeChild(nodeSpinner); }
					catch(e){};
					var res = JSON.parse(oReq.response);
					cView.Drawer.loadGlobals(res);
					if(!cView.doc.getElementById(res.posts.id))cView.doc.posts.insertBefore(cView.Drawer.genPost(res.posts), cView.doc.posts.childNodes[0]);
				}else{
					textField.disabled = false;
					e.target.disabled = false;
					var errmsg = "";
					try{
						e.target.parentNode.removeChild(nodeSpinner );
						var eresp = JSON.parse(oReq.response);
						errmsg = eresp.err;
					}catch(e){};
					alert("Error #"+oReq.status+": "+oReq.statusText+" "+errmsg) ;
				}
			};
			if(textField.attachments) post.attachments = textField.attachments;
			postdata.post = post;
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
				oReq.open("post",gConfig.serverURL + "posts", true);
				oReq.onload = onload;
				oReq.setRequestHeader("Content-type","application/json");
				oReq.setRequestHeader("X-Authentication-Token",
					cView.logins[postTo.userid].token);
				if (textField.value == ""){
					textField.disabled = false;
					e.target.disabled = false;
					try{e.target.parentNode.removeChild(nodeSpinner );}
					catch(e){};
					alert("you should provide some text");
					return;
				}
				post.body = textField.value;
				oReq.send(JSON.stringify(postdata));
			}
		}
	}
	,"sendAttachment": function(e){
		var cView = document.cView;
		e.target.disabled = true;
		var textField = e.target.parentNode.parentNode.cNodes["edit-txt-area"];
		var nodeSpinner = cView.doc.createElement("div");
		nodeSpinner.innerHTML = '<img src="'+gConfig.static+'throbber-100.gif">';
		e.target.parentNode.parentNode.cNodes["attachments"].appendChild(nodeSpinner);
		textField.pAtt = new Promise(function(resolve,reject){
			var oReq = new XMLHttpRequest();
			oReq.onload = function(){
				if(this.status < 400){
					e.target.value = "";
					e.target.disabled = false;
					var attachments = JSON.parse(this.response).attachments;
					var nodeAtt = cView.doc.createElement("div");
					nodeAtt.className = "att-img";
					nodeAtt.innerHTML = '<a target="_blank" href="'+attachments.url+'" border=none ><img src="'+attachments.thumbnailUrl+'"></a>';
					nodeSpinner.parentNode.replaceChild(nodeAtt, nodeSpinner);
					if (typeof(textField.attachments) === "undefined" ) textField.attachments = new Array();
					textField.attachments.push(attachments.id);
					resolve();

				}else reject(this.status);
			};

			oReq.open("post",gConfig.serverURL + "attachments", true);
			oReq.setRequestHeader("X-Authentication-Token", cView.token);
			var data = new FormData();
			data.append( "name", "attachment[file]");
			data.append( "attachment[file]", e.target.files[0], e.target.value);
			oReq.send(data);
		});
	}
	,"editPost": function(e) {
		var cView = document.cView;
		var victim = e.target; do victim = victim.parentNode; while(victim.className != "post");
		var nodeEdit = cView.Drawer.genEditNode(cView.Actions.postEditedPost,cView.Actions.cancelEditPost);
		nodeEdit.cNodes["edit-txt-area"].value = victim.rawData.body;
		victim.cNodes["post-body"].replaceChild( nodeEdit, victim.cNodes["post-body"].cNodes["post-cont"]);
}
	,"cancelEditPost": function(e){
		var cView = document.cView;
		 var victim = e.target; do victim = victim.parentNode; while(victim.className != "post");
		 var postCNode = cView.doc.createElement("div");
		 postCNode.innerHTML = victim.rawData.body;
		 postCNode.className = "post-cont";
		 victim.cNodes["post-body"].replaceChild(postCNode,e.target.parentNode.parentNode );
		 victim.cNodes["post-body"].cNodes["post-cont"] = postCNode;

	}
	,"postEditedPost": function(e){
		var cView = document.cView;
		var nodePost =e.target; do nodePost = nodePost.parentNode; while(nodePost.className != "post");
		var oReq = new XMLHttpRequest();
		e.target.disabled = true;
		oReq.onload = function(){
			if(this.status < 400){
				var post = JSON.parse(oReq.response).posts;
				var postCNode = cView.doc.createElement("div");
				/*
				var cpost = matrix.decrypt(post.body);
				if (typeof cpost.error === "undefined") {
					cpost = JSON.parse(cpost);
					post.body = cpost.payload.data;
					nodePost.sign = cpost.sign;
				}
				*/
				postCNode.innerHTML = cView.autolinker.link(post.body.replace(/&/g,"&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"));
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
		post.attachments = nodePost.rawData.attachments;
		var postdata = new Object();
		postdata.post = post;
		e.target.parentNode.parentNode.cNodes["edit-txt-area"].disabled = true;

		e.target.parentNode.replaceChild(cView.gNodes["spinner"].cloneNode(true),e.target.parentNode.cNodes["edit-buttons-cancel"] );
		var text = e.target.parentNode.parentNode.cNodes["edit-txt-area"].value;
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
		{
			post.body =  text;
			oReq.open("put",gConfig.serverURL + "posts/"+nodePost.id, true);
			oReq.setRequestHeader("X-Authentication-Token", cView.logins[nodePost.rawData.createdBy].token);
			oReq.setRequestHeader("Content-type","application/json");
			oReq.send(JSON.stringify(postdata));
		}
	}
	,"deletePost": function(e){
		var cView = document.cView;
		var victim =e.target; do victim = victim.parentNode; while(victim.className != "post");
		cView.Actions.deleteNode(victim, cView.Actions.doDeletePost);
	}
	,"doDeletePost": function(but){
		var cView = document.cView;
		var victim = but.node;
		but.parentNode.parentNode.removeChild(but.parentNode);
		var oReq = new XMLHttpRequest();
		oReq.onload = function(){
			if(this.status < 400){
				cView.doc.hiddenPosts.splice(victim.rawData.idx,1);
				//victim.parentNode.removeChild(victim);
				cView.Drawer.regenHides();
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
			oReq.setRequestHeader("X-Authentication-Token", cView.logins[victim.rawData.createdBy].token);
			oReq.setRequestHeader("Content-type","application/json");
			oReq.send();
		}
	}
	,"postLike": function(e){
		var cView = document.cView;
		var oReq = new XMLHttpRequest();
		var nodeLikes = e.target.parentNode.parentNode.parentNode.cNodes["likes"];
		var nodePost =nodeLikes; do nodePost = nodePost.parentNode; while(nodePost.className != "post");
		oReq.onload = function(){
			if(this.status < 400){
				if(e.target.action){
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
					nodeLike.innerHTML = cView.gUsers[cView.gMe.users.id].link;
					if(likesUL.childNodes.length)likesUL.insertBefore(nodeLike, likesUL.childNodes[0]);
					else likesUL.appendChild(nodeLike);
					e.target.parentNode.parentNode.parentNode.myLike = nodeLike;
					if(!Array.isArray(nodePost.rawData.likes)) nodePost.rawData.likes = new Array();
					nodePost.rawData.likes.unshift(cView.gMe.users.id);
				}else{
					nodePost.rawData.likes.splice(nodePost.rawData.likes.indexOf(cView.gMe.users.id), 1) ;
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
				 }
				e.target.innerHTML=e.target.action?"Un-like":"Like";
				e.target.action = !e.target.action;
			}else e.target.innerHTML= !e.target.action?"Un-like":"Like";
		}


			oReq.open("post",gConfig.serverURL + "posts/"+ e.target.parentNode.parentNode.parentNode.parentNode.parentNode.id+"/"+(e.target.action?"like":"unlike"), true);
			oReq.setRequestHeader("X-Authentication-Token", cView.token);
			oReq.send();
			e.target.innerHTML = "";
			e.target.appendChild(cView.gNodes["spinner"].cloneAll());

	}
	,"unfoldLikes": function(e){
		var cView = document.cView;
		var nodePost= e.target.getNode(["p","post"]);
		var span = e.target.getNode(["p","nocomma"]);
		var nodeLikes = span.parentNode.cNodes["comma"];

		if (nodePost.rawData.omittedLikes > 0){
			var oReq = new XMLHttpRequest();
			oReq.onload = function(){
				if(oReq.status < 400){
					span.parentNode.removeChild(span);
					var postUpd = JSON.parse(this.response);
					postUpd.users.forEach(cView.Utils.addUser, cView.Utils);
					nodePost.rawData.likes = postUpd.posts.likes;
					cView.Drawer.writeAllLikes(nodePost.id, nodeLikes);
				}else{
					console.log(oReq.toString());

				};
			};
			oReq.open("get",gConfig.serverURL + "posts/"+nodePost.id+"?maxComments=0&maxLikes=all", true);
			oReq.setRequestHeader("X-Authentication-Token", cView.token);
			oReq.send();

		}else cView.Drawer.writeAllLikes(id, nodeLikes);
	}
	,"getUsername": function(e){
		var cView = document.cView;
		var node = e.target; do node = node.parentNode; while(typeof node.user === "undefined");
		if ( cView.cTxt == null ) return;
		cView.cTxt.value += "@" + node.user;
	}
	,"reqSubscription": function(e){
		var cView = document.cView;
		var oReq = new XMLHttpRequest();
		var username = cView.Utils.getNode(e.target,["p","up-controls"]).user;
		oReq.open("post", gConfig.serverURL +"users/"+username+"/sendRequest/", true);
		oReq.setRequestHeader("X-Authentication-Token", cView.logins[e.target.getNode(["p","up-c-mu"]).loginId].token);
		oReq.onload = function(){
			if(oReq.status < 400) {
				var span = cView.doc.createElement("span");
				span.innerHTML = "Request sent";
				e.target.parentNode.replaceChild(span, e.target);
			}
		}

		oReq.send();

	}
	,"evtSubscribe": function(e){
		var cView = document.cView;
		var Utils = cView.Utils;
		var target = e.target;
		var nodeParent = target.parentNode;
		var spinner = cView.gNodes["spinner"].cloneAll();
		nodeParent.replaceChild(spinner, target);
		var oReq = new XMLHttpRequest();
		var nodeUC = cView.Utils.getNode(nodeParent,["p","up-controls"]);
		var username = nodeUC.user;
		oReq.open("post", gConfig.serverURL +"users/"+username+(target.subscribed?"/unsubscribe":"/subscribe"), true);
		oReq.setRequestHeader("X-Authentication-Token", cView.logins[target.getNode(["p","up-c-mu"]).loginId].token);
		oReq.onload = function(){
			if(oReq.status < 400) {
				cView.logins[target.loginId].data = JSON.parse(oReq.response); 
				Utils.refreshLogin(target.loginId);
				Utils.setChild(cView.Utils.getNode(nodeParent,["p","up-controls"]).parentNode, "up-controls", cView.Drawer.genUpControls(username));
			}else nodeParent.replaceChild( target, spinner);
		}

		oReq.send();
	}
	,"showHidden": function(e){
		var cView = document.cView;
		if(e.target.action){
			if(!cView.doc.hiddenCount)return;
			var nodeHiddenPosts = cView.doc.createElement("div");
			nodeHiddenPosts.id = "hidden-posts";
			cView.doc.hiddenPosts.forEach(function(oHidden){if(oHidden.is)nodeHiddenPosts.appendChild(cView.Drawer.genPost(oHidden.data));});
			e.target.parentNode.parentNode.insertBefore(nodeHiddenPosts , e.target.parentNode.nextSibling);
			e.target.innerHTML =  "Collapse "+ cView.doc.hiddenCount + " hidden entries";
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
		var victim = e.target; do victim = victim.parentNode; while(victim.className != "post");
		var oReq = new XMLHttpRequest();
		var action = e.target.action;
		oReq.onload = function(){
			if(this.status < 400){
				cView.Actions.doHide(victim, action, "user");
			};
		}
		oReq.open("post",gConfig.serverURL + "posts/"+ victim.id+"/"+(action?"hide":"unhide"), true);
		oReq.setRequestHeader("X-Authentication-Token", cView.token);
		oReq.send();
	}
	,"doHide": function(victim, action){
		var cView = document.cView;
		var nodeHide = victim.cNodes["post-body"].cNodes["post-info"].cNodes["post-controls"].cNodes["controls"].cNodes["hide"].cNodes["href"];
		if(action != nodeHide.action) return;
		victim.rawData.isHidden = action;
		nodeHide.action = !action;
		var nodeShow = cView.doc.getElementsByClassName("show-hidden")[0]
		if (!nodeShow){
			nodeShow = cView.gNodes["show-hidden"].cloneAll();
			nodeShow.cNodes["href"].action = true;
			cView.doc.getElementById("content").appendChild(nodeShow);
		}
		var aShow =  nodeShow.cNodes["href"];
		if(action){
			cView.doc.hiddenPosts[victim.rawData.idx].is  = true;
			victim.parentNode.removeChild(victim);
			cView.doc.hiddenCount++;
			aShow.action = false;
			aShow.dispatchEvent(new Event("click"));
		}else{
			var count = 0;
			var idx = victim.rawData.idx;
			do if(cView.doc.hiddenPosts[idx--].is)count++;
			while ( idx >0 );
			if ((victim.rawData.idx - count+1) >= cView.doc.posts.childNodes.length )cView.doc.posts.appendChild(victim);
			else cView.doc.posts.insertBefore(victim, cView.doc.posts.childNodes[victim.rawData.idx - count+1]);
			nodeHide.innerHTML = "Hide";
			cView.doc.hiddenPosts[victim.rawData.idx].is = false;
			cView.doc.hiddenCount--;
			if(cView.doc.hiddenCount) aShow.innerHTML = "Collapse "+ cView.doc.hiddenCount + " hidden entries";
			else aShow.dispatchEvent(new Event("click"));
		}

	}
	,"addComment": function(e){
		var cView = document.cView;
		var postNBody = e.target; do postNBody = postNBody.parentNode; while(postNBody.className != "post-body");
		if(postNBody.isBeenCommented === true)return;
		postNBody.isBeenCommented = true;
		var nodeComment = cView.Drawer.genAddComment();
		postNBody.cNodes["comments"].appendChild(nodeComment);
		nodeComment.getElementsByClassName("edit-txt-area")[0].focus();
	}
	,"editComment": function(e){
		var cView = document.cView;
		var victim = e.target; do victim = victim.parentNode; while(victim.className != "comment");
		var nodeEdit = cView.Drawer.genEditNode(cView.Actions.postEditComment,cView.Actions.cancelEditComment);
		nodeEdit.cNodes["edit-txt-area"].value = cView.gComments[victim.id].body;
		victim.replaceChild( nodeEdit, victim.cNodes["comment-body"]);
		victim.cNodes["comment-body"] = nodeEdit;
		nodeEdit.className = "comment-body";
		victim.getElementsByClassName("edit-txt-area")[0].focus();
	}
	,"postEditComment": function(e){
		var cView = document.cView;
		var nodeComment = e.target; do nodeComment = nodeComment.parentNode; while(nodeComment.className != "comment");
		var nodePost =nodeComment; do nodePost = nodePost.parentNode; while(nodePost.className != "post");
		var textField = e.target.parentNode.parentNode.cNodes["edit-txt-area"];
		e.target.disabled = true;
		e.target.parentNode.replaceChild(cView.gNodes["spinner"].cloneNode(true),e.target.parentNode.cNodes["edit-buttons-cancel"] );
		if(nodePost.isPrivate){
			sendEditedPrivateComment(textField, nodeComment, nodePost);
			return;
		}
		var comment = cView.gComments[nodeComment.id];
		comment.body = textField.value ;
		comment.updatedAt = Date.now();
		var oReq = new XMLHttpRequest();
		oReq.onload = function(){
			if(this.status < 400){
				var comment = JSON.parse(this.response).comments;
				nodeComment.parentNode.replaceChild(cView.Drawer.genComment(comment),nodeComment);
				cView.gComments[comment.id] = cView.autolinker.link(comment.replace(/&/g,"&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"));

			}
		};

		oReq.open("put",gConfig.serverURL + "comments/"+comment.id, true);
		oReq.setRequestHeader("X-Authentication-Token", cView.logins[nodeComment.userid].token);
		oReq.setRequestHeader("Content-type","application/json");
		var postdata = new Object();
		postdata.comment = comment;
		postdata.users = new Array(cView.gMe);
		oReq.send(JSON.stringify(postdata));

	}
	,"cancelEditComment": function(e){
		var cView = document.cView;
		var nodeComment = e.target; do nodeComment = nodeComment.parentNode; while(nodeComment.className != "comment");
		 nodeComment.parentNode.replaceChild(cView.Drawer.genComment( cView.gComments[nodeComment.id]),nodeComment);
	}
	,"processText": function(e) {
		var cView = document.cView;
		cView.cTxt = e.target;
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
	,"cancelNewComment": function(e){
		var cView = document.cView;
		var postNBody = e.target; do postNBody = postNBody.parentNode; while(postNBody.className != "post-body");
		postNBody.isBeenCommented = false;
		if(typeof postNBody.bumpLater !== "undefined")setTimeout(postNBody.bumpLater, 1000);
		var nodeComment =e.target; do nodeComment = nodeComment.parentNode; while(nodeComment.className != "comment");
		nodeComment.parentNode.removeChild(nodeComment);

	}
	,"postNewComment": function(e){
		var cView = document.cView;
		e.target.disabled = true;
		e.target.parentNode.replaceChild(cView.gNodes["spinner"].cloneNode(true),e.target.parentNode.cNodes["edit-buttons-cancel"] );
		cView.Actions.sendComment(e.target.parentNode.previousSibling);
		var nodeComments =e.target; do nodeComments = nodeComments.parentNode; while(nodeComments.className != "comments");
		nodeComments.cnt++;
	}
	,"deleteComment": function(e){
		var cView = document.cView;
		var nodeComment = e.target; do nodeComment = nodeComment.parentNode; while(nodeComment.className != "comment");
		cView.Actions.deleteNode(nodeComment,cView.Actions.doDeleteComment);
	}

	,"sendComment": function (textField){
		var cView = document.cView;
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
				cView.gComments[comment.id] = comment;
				if( nodeComment.parentNode.childNodes.length > 4 )cView.Drawer.addLastCmtButton(nodePost.cNodes["post-body"]);
				if(!document.getElementById(comment.id))nodeComment.parentNode.replaceChild(cView.Drawer.genComment(comment),nodeComment);
				else nodeComment.parentNode.removeChild(nodeComment);
			}
		};
		var token;
		if (cView.ids.length == 1) token = cView.token;
		else{
			var nodesSelectUsr = nodeComment.getElementsByClassName("select-user-ctrl")[0].childNodes;
			for(var idx = 0; idx < nodesSelectUsr.length; idx++)
				if (nodesSelectUsr[idx].selected){
					token = cView.logins[nodesSelectUsr[idx].value].token;
					break;
				}
		}

		oReq.open("post",gConfig.serverURL + "comments", true);
		oReq.setRequestHeader("X-Authentication-Token", token);
		oReq.setRequestHeader("Content-type","application/json");
		var postdata = new Object();
		postdata.comment = comment;
		oReq.send(JSON.stringify(postdata));
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
		var nodePost =nodeComment; do nodePost = nodePost.parentNode; while(nodePost.className != "post");
		but.parentNode.parentNode.removeChild(but.parentNode);
		but.node.hidden = false;
		var oReq = new XMLHttpRequest();
		oReq.onload = function(){
			if(this.status < 400){
				if(nodeComment.parentNode) nodeComment.parentNode.removeChild(nodeComment);
				delete cView.gComments[nodeComment.id];
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
			oReq.setRequestHeader("X-Authentication-Token", cView.logins[nodeComment.userid].token);
			oReq.setRequestHeader("Content-type","application/json");
			oReq.send();
		}
	}
	,"unfoldComm": function(id){
		var cView = document.cView;
		var post = cView.doc.getElementById(id).rawData;
		var oReq = new XMLHttpRequest();
		var spUnfold = cView.doc.getElementById(id+"-unc").parentNode.appendChild(cView.doc.createElement("i"));
		spUnfold.className = "fa fa-spinner fa-pulse";
		oReq.onload = function(){
			if(oReq.status < 400){
				var postUpd = JSON.parse(this.response);
				cView.Drawer.loadGlobals(postUpd);
				cView.doc.getElementById(id).rawData = post;
				var nodePB = cView.doc.getElementById(id).cNodes["post-body"];
				var text = "";
				if (nodePB.isBeenCommented == true)
					text = nodePB.getElementsByTagName("textarea")[0].value;	
				if(typeof nodePB.bumpLater !== "undefined")setTimeout(postPB.bumpLater, 1000);
				nodePB.removeChild(nodePB.cNodes["comments"]);
				nodePB.cNodes["comments"] = cView.doc.createElement("div");
				nodePB.cNodes["comments"].className = "comments";

				postUpd.comments.forEach(function(cmt){cView.gComments[cmt.id] =cmt; nodePB.cNodes["comments"].appendChild(cView.Drawer.genComment(cmt))});
				nodePB.appendChild(nodePB.cNodes["comments"]);
				if (nodePB.isBeenCommented == true){ 
					var nodeComment = cView.Drawer.genAddComment();
					nodePB.cNodes["comments"].appendChild(nodeComment);
					nodeComment.getElementsByClassName("edit-txt-area")[0].value = text;
				}
				cView.Drawer.addLastCmtButton(nodePB);
				nodePB.cNodes["comments"].cnt = postUpd.comments.length;

			}else{
				spUnfold.parentNode.removeChild(spUnfold);
				console.log(oReq.toString());

			};
		};

		oReq.open("get",gConfig.serverURL + "posts/"+post.id+"?maxComments=all&maxLikes=0", true);
		oReq.setRequestHeader("X-Authentication-Token", cView.token);
		oReq.send();


	}
	,"calcCmtTime": function(e){
		var cView = document.cView;
		if (typeof(e.target.parentNode.parentNode.parentNode.createdAt) !== "undefined" ){
			var absUxTime = e.target.parentNode.parentNode.parentNode.createdAt*1;
			var txtdate = new Date(absUxTime ).toString();

			e.target.title =  cView.Utils.relative_time(absUxTime) + " ("+ txtdate.slice(0, txtdate.indexOf("(")).trim()+ ")";
		}
	}
	,"me": function(e){
		var cView = document.cView;
		e.target.href = gConfig.front+cView.gMe["users"]["username"];
	}
	,"home": function(e){
		var cView = document.cView;
	    e.target.href = gConfig.front;
	}
	,"directs": function(e){
		var cView = document.cView;
	    e.target.href = gConfig.front+ "filter/direct";
	}
	,"my": function(e){
		var cView = document.cView;
	    e.target.href = gConfig.front+ "filter/discussions";
	}
	,"newDirectInp": function(e){
		var cView = document.cView;
		if (e.target.value){
			var victim =e.target; do victim = victim.parentNode; while(victim.className != "new-post");
			victim.cNodes["edit-buttons"].cNodes["edit-buttons-post"].disabled = false;
			if(e.which == "13") cView.Actions.newDirectAddFeed(e);
			else{
				var txt = e.target.value.toLowerCase();
				var nodeTip = cView.gNodes["friends-tip"].cloneAll();
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
				if(pos && pos.arr)pos.arr.forEach(function(user){
					var li = cView.doc.createElement("li");
					li.className = "ft-i";
					li.innerHTML = user;
					li.addEventListener("click",cView["Actions"]["selectFriend"]);
					nodeTip.cNodes["ft-list"].appendChild(li);
				});
				nodeTip.inp = e.target;
				nodeTip.style.top = e.target.offsetTop+e.target.offsetHeight;
				nodeTip.style.left =  e.target.offsetLeft;
				nodeTip.style.width = e.target.clientWidth;
				if((typeof e.target.tip !== "undefined") && e.target.tip.parentNode) {
					cView.doc.body.replaceChild(nodeTip, e.target.tip);
					e.target.tip = nodeTip;
				}else e.target.tip = cView.doc.body.appendChild(nodeTip);
			}
		}else if(e.target.tip){
			cView.doc.body.removeChild(e.target.tip);
			e.target.tip = undefined;
		}


	}
	,"doBan": function(e){
		var cView = document.cView;
		var oReq = new XMLHttpRequest();
		//var nodePopUp = e.target; do nodePopUp = nodePopUp.parentNode; while(nodePopUp.className != "user-popup");
		var nodeUC = e.target.getNode(["p","up-controls"]);
		var username = nodeUC.user;
		var bBan = e.target.checked;
		var nodeParent = e.target.parentNode;
		var loginId = e.target.getNode(["p","up-c-mu"]).loginId;
		oReq.open("post", gConfig.serverURL +"users/"+username+(bBan?"/ban":"/unban"), true);
		oReq.setRequestHeader("X-Authentication-Token", cView.logins[loginId].token);
		var spinner = cView.gNodes["spinner"].cloneNode(true);
		nodeParent.replaceChild(spinner,e.target);
		oReq.onload = function(){
			if(oReq.status < 400) {
				var banIds = cView.logins[loginId].data.users.banIds;
				if (bBan)banIds.push(cView.gUsers.byName[username].id);
				else{
					var idx = banIds.indexOf(cView.gUsers.byName[username].id);
					if (idx != -1 ) banIds.splice(idx, 1);
				}
				cView.localStorage.setItem("gMe",JSON.stringify(cView.logins));
			}
			if (typeof nodeUC.parentNode !== "undefined" )
				cView.Utils.setChild(nodeUC.parentNode, "up-controls", cView.Drawer.genUpControls(username));

		}

		oReq.send();
	}
	,"doUnBan": function(e){
		var cView = document.cView;
		var oReq = new XMLHttpRequest();
		var nodeHost = e.target.getNode(["p","up-controls"]);
		var loginId = e.target.getNode(["p","up-c-mu"]).loginId;
		var username = nodeHost.user;
		oReq.open("post", gConfig.serverURL +"users/"+username+"/unban", true);
		oReq.setRequestHeader("X-Authentication-Token", cView.logins[loginId].token);
		var spinner = cView.gNodes["spinner"].cloneNode(true);
		e.target.parentNode.replaceChild(spinner,e.target);
		oReq.onload = function(){
			if(oReq.status < 400) {
				var banIds = cView.logins[loginId].data.users.banIds;
				var idx = banIds.indexOf(cView.gUsers.byName[username].id);
				if (idx != -1 ) banIds.splice(idx, 1);
				cView.localStorage.setItem("gMe",JSON.stringify(cView.logins));
			}
			if (typeof nodeHost.parentNode !== "undefined" )
				cView.Utils.setChild(nodeHost.parentNode, "up-controls", cView.Drawer.genUpControls(username));
		}

		oReq.send();
	}
	,"doBlockCom": function(e){
		var cView = document.cView;
		var action = e.target.checked;
		var nodeUC = e.target.getNode(["p","up-controls"]);
		cView.Utils.updateBlockList("blockComments", nodeUC.user, action);
		cView.Drawer.blockComments(nodeUC.user, action);
	}
	,"doBlockPosts": function(e){
		var cView = document.cView;
		var action = e.target.checked;
		var nodeUC = e.target.getNode(["p","up-controls"]);
		cView.Utils.updateBlockList("blockPosts", nodeUC.user, action);
		cView.Drawer.blockPosts(nodeUC.user, action);
	}
	,"setRadioOption": function(e){
		var cView = document.cView;
		cView.localStorage.setItem(e.target.name, e.target.value );
	}
	,"unfoldAttImgs": function (e){
		var cView = document.cView;
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
	,"ftClose": function(e){
		var cView = document.cView;
		var victim =e.target;while(victim.className != "friends-tip") victim = victim.parentNode;
		victim.inp.tip = undefined;
		cView.doc.body.removeChild(victim);

	}
	,"selectFriend": function(e){
		var cView = document.cView;
		var victim =e.target; do victim = victim.parentNode; while(victim.className != "friends-tip");
		victim.inp.value = e.target.innerHTML;

	}
	,"postDirect": function(e){
		var cView = document.cView;
		var victim =e.target; do victim = victim.parentNode; while(victim.className != "new-post");
		var nodesSenders = victim.getElementsByClassName("new-post-to");	
		for (var idx = 0; idx<nodesSenders.length; idx++){
			var nodeSender = nodesSenders[idx];
			var input = nodeSender.cNodes["new-direct-input"].value;
			if ((input != "") && (typeof cView.gUsers.byName[input] !== "undefined")
			&& cView.gUsers.byName[input].friend 
			&& (cView.gUsers.byName[input].subscriber||cView.gUsers.byName[input].type == "group"))
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
		cView.localStorage.removeItem("gMe");
		cView.Utils.deleteCookie(gConfig.tokenPrefix + "authToken");
		location.reload();
	}
	,"newPostRemoveFeed": function(e){
		var cView = document.cView;
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
	,"newDirectRemoveFeed": function(e){
		var cView = document.cView;
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
	,"newPostAddFeed": function(e){
		var cView = document.cView;
		e.target.parentNode.cNodes["new-post-feed-select"].hidden = false;
	}
	,"newDirectAddFeed": function(e){
		var cView = document.cView;
		var nodeP = e.target.parentNode;
		var option = nodeP.cNodes["new-direct-input"];
		if (option.value == "") return;
		if(typeof option.tip !== "undefined")cView.doc.body.removeChild(option.tip);
		nodeP.feeds.push(option.value);
		var li = cView.doc.createElement("li");
		li.innerHTML = option.value;
		li.className = "new-post-feed";
		li.oValue = option.value;
		li.idx = e.target.selectedIndex;
		li.addEventListener("click",cView["Actions"]["newDirectRemoveFeed"]);
		nodeP.cNodes["new-post-feeds"].appendChild(li);
		option.value = "";
	}
	,"newPostSelect": function(e){
		var cView = document.cView;
		var option = e.target[e.target.selectedIndex];
		if (option.value == "")return;
		var nodeP = e.target.parentNode;
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
		if(option.value == cView.gMe.users.username)li.innerHTML = "My feed";
		else li.innerHTML = "@" + option.value;
		li.className = "new-post-feed";
		li.oValue = option.value;
		li.idx = e.target.selectedIndex;
		li.addEventListener("click", cView["Actions"]["newPostRemoveFeed"]);
		nodeP.cNodes["new-post-feeds"].appendChild(li);
		nodeP.parentNode.cNodes["edit-buttons"].cNodes["edit-buttons-post"].disabled = false;
	}
	,"evtUserPopup": function(e){
		var cView = document.cView;
		var node = e.target; while(typeof node.userid === "undefined")node = node.parentNode;
		var user = cView.gUsers[node.userid];
		if(cView.doc.getElementById("userPopup" + node.userid))return;
		var nodePopup = cView.Drawer.genUserPopup(node, user);
		nodePopup.style.top = e.pageY;
		nodePopup.style.left = e.pageX;
		nodePopup.style["z-index"] = 1;
		cView.doc.getElementsByTagName("body")[0].appendChild(nodePopup);
	}
	,"upClose": function(e){
		var cView = document.cView;
		var node = e.target; while(node.className != "user-popup")node = node.parentNode;
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
		if(cView.timeline == "settings") return;
		var bump = e.target.parentNode.cNodes["rt-bump"].value;
		if(e.target.checked && !cView.gRt.on){
			cView.gRt = new RtUpdate(cView.token,bump);
			cView.gRt.subscribe(cView.rt);
		}else if(!e.target.checked){
			if(cView.gRt.on){
				cView.gRt.close();
				cView.gRt = new Object();
			}
		}
	}
	,"goSettings": function (e){
		var cView = document.cView;
	    e.target.href = gConfig.front+"settings";
	}
	,"goRequests": function (e){
		var cView = document.cView;
	    e.target.href = gConfig.front+"requests";
	}
	,"genBlock": function (e){
		var cView = document.cView;
		var node = e.target.parentNode;
		var nodeUC = e.target.getNode(["p","up-controls"]);
		var nodeBlock = cView.gNodes["up-block"].cloneAll();
		nodeBlock.className = "user-popup"; 
		nodeBlock.user = node.user;
		node.appendChild(nodeBlock);
		nodeBlock.style.top =  e.target.offsetTop;
		nodeBlock.style.left = e.target.offsetLeft;
		nodeBlock.style["z-index"] = 2;
		var chkboxes = nodeBlock.getElementsByTagName("input");
		for(var idx = 0; idx < chkboxes.length; idx++){
			var list = cView[chkboxes[idx].value];
			if((typeof list !== "undefined") && (list != null) && (list[cView.gUsers.byName[nodeUC.user].id]>-1))
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
		var oUser = cView.logins[id].data.users;
		oUser.screenName = inputs["screen-name"].value;
		oUser.email = inputs["email"].value;
		oUser.isPrivate = inputs["is-private"].checked?"1":"0";
		var oReq = new XMLHttpRequest();
		oReq.onload = function(){
			var nodeMsg = nodeProfile.getElementsByClassName("update-status")[0];
			e.target.disabled = false;
			nodeProfile.getElementsByClassName("spinner")[0].hidden = true;
			if(oReq.status < 400){
				cView.logins[id].data = JSON.parse(oReq.response);
				nodeMsg.className = "sr-info";
				nodeMsg.innerHTML = "Updated. @"+ oUser.username +"'s feed is <span style='font-weight: bold;'>" + ((oUser.isPrivate == "1")?"private":"public")+ ".</span>";
				cView.Utils.refreshLogin(id);
			}else {
				nodeMsg.className = "msg-error";
				nodeMsg.innerHTML = "Got error: ";
				try{ 
					nodeMsg.innerHTML += JSON.parse(oReq.response).err;
				}catch(e) {nodeMsg.innerHTML += "unknown error";};

			}
		}

		oReq.open("put",gConfig.serverURL + "users/" + id ,true);
		oReq.setRequestHeader("Content-type","application/json");
		oReq.setRequestHeader("X-Authentication-Token", cView.logins[id].token);
		oReq.send(JSON.stringify({"user":oUser}));
	}
	,"addAcc": function (e){
		var cView = document.cView;
		var nodePorfiles = cView.Utils.getNode(e.target, ["p","global-settings"],["c","settings-profiles"]);
		nodePorfiles.appendChild(cView.gNodes["settings-login"].cloneAll());
		document.getElementsByClassName("gs-add-acc")[0].hidden = true;
	}
	,"addProfileLogin": function (e){
		var cView = document.cView;
		e.target.disabled = true;
		var nodeLogin = cView.Utils.getNode(e.target, ["p","settings-login"]);
		nodeLogin.getElementsByClassName("spinner")[0].hidden = false;
		var oReq = new XMLHttpRequest();
		var inpsLogin = cView.Utils.getInputsByName(nodeLogin);
		var userid = null;
		oReq.onload = function(){
			var res =  JSON.parse(oReq.response);
			if(oReq.status < 400){
				if(typeof cView.logins[res.users.id] !== "undefined"){
					cView.doc.getElementsByClassName("gs-add-acc")[0].hidden = false;
					nodeLogin.parentNode.removeChild(nodeLogin);
					return; 
				}
				cView.logins[res.users.id] = new Object();
				cView.logins[res.users.id].token =  res.authToken;
				userid = res.users.id;
				cView.Utils.getWhoami(res.users.id, finish);

			}else cView.doc.getElementById("auth-msg").innerHTML = res.err;
		};
		oReq.open("post", gConfig.serverURL +"session", true);
		oReq.setRequestHeader("X-Authentication-Token", null);
		oReq.setRequestHeader("Content-type","application/x-www-form-urlencoded");
		oReq.send("username="+inpsLogin["login-username"].value+"&password="+inpsLogin["login-password"].value);
		function finish(){
			cView.doc.getElementsByClassName("gs-add-acc")[0].hidden = false;
			nodeLogin.parentNode.replaceChild(cView.Drawer.genProfile(cView.logins[userid].data.users),nodeLogin);

		}
	}
	,"setMainProfile": function(e){
		if(!e.target.checked)return;
		var cView = document.cView;
		//var nodeProf = cView.Utils.getNode(e.target, ["p","settings-profile"]);
		var nodeProf = e.target.getNode(["p","settings-profile"]);
		var id = cView.Utils.getInputsByName(nodeProf)["id"].value;
		cView.token = cView.logins[id].token;
		cView.mainId = id;
		cView.Utils.setCookie(gConfig.tokenPrefix + "authToken", cView.token);
	}
	,"logoutAcc": function(e){
		var cView = document.cView;
		var nodeProf = cView.Utils.getNode(e.target, ["p","settings-profile"]);
		var id = cView.Utils.getInputsByName(nodeProf)["id"].value;
		delete cView.logins[id];
		cView.localStorage.setItem("gMe",JSON.stringify(cView.logins));
		nodeProf.parentNode.removeChild(nodeProf);
		if(id == cView.mainId){
			nodeProf = cView.doc.getElementsByClassName("settings-profile")[0];
			if (typeof nodeProf === "undefined") return cView.Actions.logout(e);
			var inputs = cView.Utils.getInputsByName(nodeProf);
			id = inputs["id"].value;
			inputs["is-main"].checked = true;
			cView.mainId = id;
			cView.token = cView.logins[id].token; 
			cView.Utils.setCookie(gConfig.tokenPrefix + "authToken", cView.token);
		}
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
	,"linkPreviewSwitch": function (e){
		var cView = document.cView;
		if(e.target.checked )cView.localStorage.setItem("show_link_preview",1);
		else cView.localStorage.setItem("show_link_preview",0);
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
		var spinner = cView.gNodes["spinner"].cloneNode(true);
		host.appendChild(spinner);
		var oReq = new XMLHttpRequest();
		oReq.onload = function(){
			if(oReq.status < 400){
				host.parentNode.removeChild(host);
				var nodeSR = cView.doc.getElementById("sr-info");
				if(--cView.subReqsCount){
					nodeSR.cNodes["sr-info-a"].innrHTML = "You have "
					+ cView.subReqsCount
					+ " subscription requests to review.";
				}else{
					nodeSR.hidden = true;
					var victim = cView.doc.getElementById("sr-header");
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
		oReq.setRequestHeader("X-Authentication-Token", cView.logins[host.cNodes["sr-id"].value].token);
		oReq.send();
	}
	,"getauth": function (e){
		var cView = document.cView;
		var oReq = new XMLHttpRequest();
		oReq.onload = function(){
			if(this.status < 400){
				cView.Utils.setCookie(gConfig.tokenPrefix + "authToken", JSON.parse(this.response).authToken);
				cView.token =  JSON.parse(this.response).authToken;
				///cView.Utils.doc.getElementsByTagName("body")[0].removeChild(cView.Utils.doc.getElementsByClassName("nodeAuth")[0]);
			//	initDoc();

				location.reload();
			}else cView.doc.getElementById("auth-msg").innerHTML = JSON.parse(this.response).err;
		};
		oReq.open("post", gConfig.serverURL +"session", true);
		oReq.setRequestHeader("X-Authentication-Token", null);
		oReq.setRequestHeader("Content-type","application/x-www-form-urlencoded");
		oReq.send("username="+cView.doc.getElementById("a-user").value+"&password="+cView.doc.getElementById("a-pass").value);
	}
	,"showUnfolder":function(e){
		var cView = document.cView;
		var nodeImgAtt = e.target; do nodeImgAtt = nodeImgAtt.parentNode; while(nodeImgAtt.className != "atts-img");
		if(cView.Utils.chkOverflow(nodeImgAtt))
			nodeImgAtt.parentNode.cNodes["atts-unfold"].hidden = false;
	
	}
	,"chngAvatar":function(e){
		var cView = document.cView;
		var Utils = cView.Utils;
		var files = e.target.parentNode.cNodes["edit-buttons-upload"].files; 
		if (!files.length)return;
		e.target.disabled = true;
		var nodeImg = e.target.parentNode.parentNode.cNodes["avatar-img"]
		nodeImg.src = gConfig.static+"throbber-100.gif";
		var oReq = new XMLHttpRequest();
		oReq.onload = function(){
			if(oReq.status < 400)getNewWhoami();
		}
		var id = Utils.getInputsByName( Utils.getNode(e.target,["p","settings-profile"]))["id"].value;
		var token = cView.logins[id].token;
		oReq.open("post",gConfig.serverURL + "users/updateProfilePicture", true);
		oReq.setRequestHeader("X-Authentication-Token", token);
		var data = new FormData();
		data.append( "file",files[0]) ;
		oReq.send(data);
		function getNewWhoami() {
			e.target.value = "";
			e.target.disabled = false;
			var oReq = new XMLHttpRequest();
			oReq.onload = function(){
				if(oReq.status < 400){
					cView.logins[id].data = JSON.parse(oReq.response);
					Utils.refreshLogin(id);
					nodeImg.src = cView.logins[id].data.users.profilePictureMediumUrl;
				}
			}

			oReq.open("get", gConfig.serverURL +"users/whoami", true);
			oReq.setRequestHeader("X-Authentication-Token", token);
			oReq.send();
		}
	}
	,"addSender": function(e){
		var cView = document.cView;
		if(document.getElementById("add_sender"))return
		var nodePopup = cView.Drawer.genAddSender(function(id){
			if ((typeof id !== "undefined")&&(e.target.ids.indexOf(id) == -1 ) ){
				e.target.ids.push(id);
				cView.updPostTo(cView.logins[id].data,false, cView.logins[id].data.users.username);
				var victim = document.getElementById("add_sender");
				victim.parentNode.removeChild(victim);
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
		if(rmSenders.length = 1)rmSenders[0].hidden = true;
	}

};
return _Actions;
});
