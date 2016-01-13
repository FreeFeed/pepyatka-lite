"use strict";
define("RtHandler", [], function(){
var RtHandler = function (bump,oRTparams){
	var that = this;
	var cView = document.cView;
	if(typeof bump !== "undefined") that.bump = bump;
	if(typeof oRTparams !== "undefined"){
		that.bumpCooldown = oRTparams["rt-bump-cd"]*60000;
		that.bumpInterval = oRTparams["rt-bump-int"]*60000;
		that.bumpDelay = oRTparams["rt-bump-d"]*60000;
	}
	if(typeof cView.bumpIntervalId !== "undefined" ) clearInterval(cView.bumpIntervalId);
	if(that.bump) cView.bumpIntervalId = setInterval(function(){that.chkBumps();}, that.bumpInterval);
	
};
RtHandler.prototype = {
	constructor: RtHandler
	,bumpCooldown: 1200000
	,bumpInterval: 60000 
	,bumpDelay: 0 
	,timeGrow: 1000
	,bump: 0
	,insertSmooth: function(node, nodePos){
		var that = this;
		var cView = document.cView;
		node.style.opacity = 0;
		node.style.position = "absolute";
		var victim = document.getElementById(node.id);
		if(victim) victim.parentNode.removeChild(victim);
		if(!nodePos)document.posts.appendChild(node);
		else nodePos.parentNode.insertBefore(node,nodePos);
		node.style.width = node.parentNode.clientWidth;
		var height = node.clientHeight;
		node.style.width = "auto";
		node.style.height = 0;
		if(node.className == "post")cView.Drawer.regenHides();
		node.style.position = "static";
		node.style["transition-property"] = "height";
		node.style["transition-duration"] = that.timeGrow;
		setTimeout(function(){
			node.style.height = height;
			node.style.opacity = 1; 
			setTimeout(function(){ node.style.height = "auto"; } ,  that.timeGrow);
		}, 1);
	}
	,setBumpCooldown: function(cooldown){
		var that = this;
		var cView = document.cView;
		that.bumpCooldown = cooldown;
		clearInterval(cView.bumpIntervalId);
		if(that.bumpCooldown && that.bumpInterval ) cView.bumpIntervalId = setInterval(function(){that.chkBumps}, that.bumpInterval);
	}
	,chkBumps: function(){
		var that = this;
		var cView = document.cView;
		if(!Array.isArray(cView.bumps))cView.bumps = new Array();
		cView.bumps.forEach(that.bumpPost, that);
		cView.bumps = new Array();
	}
	,unshiftPost: function(data){
		var that = this;
		var cView = document.cView;
		if(cView.cSkip)return;
		if (cView.gMe && Array.isArray(cView.gMe.users.banIds)
			&& (cView.gMe.users.banIds.indexOf(data.posts.createdBy) > -1))
			return;
		cView.Drawer.loadGlobals(data);
		var nodePost = cView.Drawer.genPost(data.posts);
		document.hiddenPosts.unshift({"is":nodePost.rawData.isHidden,"data":nodePost.rawData});
		that.insertSmooth(nodePost, document.posts.firstChild);
	}
	,bumpPost: function(nodePost){
		var cView = document.cView;
		if(cView.cSkip)return;
		var that = this;
		if(nodePost.cNodes["post-body"].isBeenCommented)
			nodePost.cNodes["post-body"].bumpLater = function(){ that.bumpPost(nodePost);}
		else {
	 		var nodeParent = nodePost.parentNode;
			document.hiddenPosts.splice(nodePost.rawData.idx,1);
			document.hiddenPosts.unshift({"is":nodePost.rawData.isHidden,"data":nodePost.rawData});
			nodeParent.removeChild(nodePost);
			that.insertSmooth(nodePost, nodeParent.firstChild);
		}
	}
	,injectPost: function(id){
		var that = this;
		var cView = document.cView;
		if(cView.cSkip)return;
		var oReq = new XMLHttpRequest();
		oReq.onload = function (){
			if(oReq.status < 400){
				 that.unshiftPost(JSON.parse(oReq.response));
			}
		}
		oReq.open("get",gConfig.serverURL+"posts/"+id, true);
		oReq.setRequestHeader("X-Authentication-Token", cView.token);
		oReq.send();	
	}
	,"comment:new": function(data){
		var that = this;
		var cView = document.cView;
		if (cView.gMe && Array.isArray(cView.gMe.users.banIds)
			&& (cView.gMe.users.banIds.indexOf(data.comments.createdBy) > -1))
			return;
		var nodePost = document.getElementById(data.comments.postId);
		cView.Utils.addUser(data.users[0]);
		if(nodePost){
			cView.gComments[data.comments.id] = data.comments; 
			if(!document.getElementById(data.comments.id))
				nodePost.cNodes["post-body"].cNodes["comments"].appendChild(cView.Drawer.genComment(data.comments));
			if (that.bump && ( (nodePost.rawData.updatedAt*1 + that.bumpCooldown) < Date.now())){
				if(!Array.isArray(cView.bumps))cView.bumps = new Array();
				setTimeout(function(){ cView.bumps.push(nodePost)},that.bumpDelay+1);
			}
			nodePost.rawData.updatedAt = Date.now();
						
		}else that.injectPost(data.comments.postId);
	}
	,"comment:update": function(data){
		var cView = document.cView;
		cView.gComments[data.comments.id] = data.comments; 
		var nodeComment = document.getElementById(data.comments.id);
		if (nodeComment) nodeComment.parentNode.replaceChild( cView.Drawer.genComment(data.comments), nodeComment);
	}
	,"comment:destroy": function(data){
		var cView = document.cView;
		if(typeof cView.gComments[data.commentId] !== "undefined")delete cView.gComments[data.commentId];
		var nodePost  = document.getElementById(data.postId);
		if(!nodePost)return;
		if((typeof nodePost.rawData.comments !== "undefined")
			&&(nodePost.rawData.comments.indexOf(data.commentId) > -1))
			nodePost.rawData.comments.splice(nodePost.rawData.comments.indexOf(data.commentId),1);
		var nodeComment = document.getElementById(data.commentId);
		if(!nodeComment)return;
		nodeComment.parentNode.removeChild(nodeComment);
	}
	,"like:new": function(data){
		var that = this;
		var cView = document.cView;
		if (cView.gMe && Array.isArray(cView.gMe.users.banIds)
			&& (cView.gMe.users.banIds.indexOf(data.users.id) > -1))
			return;
		cView.Utils.addUser(data.users);
		var nodePost = document.getElementById(data.meta.postId);
		if(nodePost){
			if (!Array.isArray(nodePost.rawData.likes)) nodePost.rawData.likes = new Array();
			if (nodePost.rawData.likes.indexOf(data.users.id) > -1) return;
			nodePost.rawData.likes.unshift(data.users.id);
			cView.Drawer.genLikes(nodePost);
			nodePost.rawData.updatedAt = Date.now();
		}else that.injectPost(data.meta.postId);
	}
	,"like:remove": function(data){
		var cView = document.cView;
		var nodePost = document.getElementById(data.meta.postId);
		if(nodePost  && Array.isArray(nodePost.rawData.likes)
			&& (nodePost.rawData.likes.indexOf(data.meta.userId) > -1 )) {
			nodePost.rawData.likes.splice(nodePost.rawData.likes.indexOf(data.meta.userId), 1) ;
			cView.Drawer.genLikes(nodePost);
			nodePost.cNodes["post-body"].cNodes["post-info"].nodeLike.innerHTML = "Like";
			nodePost.cNodes["post-body"].cNodes["post-info"].nodeLike.action = true ;
		}

	}
	,"post:new" : function(data){
		var that = this;
		var cView = document.cView;
		if(cView.cSkip)return;
		if(document.getElementById(data.posts.id)) return;
		that.unshiftPost(data);
	}
	, "post:update" : function(data){
		var cView = document.cView;
		var nodePost = document.getElementById(data.posts.id);
		if(!nodePost) return;
		nodePost.cNodes["post-body"].cNodes["post-cont"].innerHTML = cView.autolinker.link(data.posts.body.replace(/&/g,"&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"));
		nodePost.rawData.body = data.posts.body;
	}
	, "post:destroy" : function(data){
		var nodePost = document.getElementById(data.meta.postId);
		if(!nodePost) return;
		nodePost.parentNode.removeChild(nodePost);
	}
	, "post:hide" : function(data){
		var nodePost = document.getElementById(data.meta.postId);
		if(!nodePost) return;
		cView.Actions.doHide(nodePost, true, "rt");
	}
	, "post:unhide" : function(data){
		var nodePost = document.getElementById(data.meta.postId);
		if(!nodePost) 
			document.hiddenPosts.forEach(function (item){
				if (item.is && (item.data.id == data.meta.postId))nodePost = cView.Drawer.genPost(item.data);
			});
		if (nodePost) cView.Actions.doHide(nodePost, false, "rt");
	}
}
return RtHandler; 
});
