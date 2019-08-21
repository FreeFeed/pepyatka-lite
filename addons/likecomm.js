"use strict";
define("./addons/likecomm",["../utils"],function(utils){
var cView;
//var domain = "FreeFeed";
//var auth = false;
var nodesT = new Object();
var template = [
{"c":"control", "cl":["inline-control"]
,"el":[
	{"c":"spacer","t":"span","txt":"&mdash;", "p":{"hidden":true}}
	,{"c":"display","t":"span" }
	,{"c":"action", "t":"a", "cl":["like-comm-action"], "e":{"click":["addons-like-comm","action"]}}
]}
,{"c":"display", "cl":["like-comm"], "t":"a", "e":{"click":["addons-like-comm","show"]}}
];
var handlers = {
	"action":function(e){
		var nodeCmt = e.target.getNode(["p","comment"]);
		var id = nodeCmt.rawId;
		var action = e.target.action;
		var post = e.target.getNode(["p","post"]).rawData;
		var domain = nodeCmt.domain;
		var context = cView.contexts[domain];
		switch(context.api.name){
		case "FreeFeed":
			utils.xhr({
				"url":gConfig.domains[domain].server.serverURLV2
					+"comments/"+ id + (action?"/like":"/unlike")
				,"method":"post"
				,"token":context.token
			}).then(function(res){
				res = JSON.parse(res);
				res.users.forEach(cView.Common.addUser, context);
				var fMyCmt = res.likes.some( function(like){
					return like.userId == context.gMe.users.id;
				});
				context.gComments[id].hasOwnLike = fMyCmt;
				context.gComments[id].likes = res.likes.length;
				apply({ "id":id
						,"likes": res.likes.length
						,"my_likes": fMyCmt
					}
					,nodeCmt
				);
			});
			break;
		case "Mokum":
			utils.xhr({
				"url":[gConfig.domains[domain].server.serverApiURL + "posts"  
					, context.gUsers[post.createdBy].username 
					, post.id
					, "clike"
					, id+".json"
				].join("/")
				,"method": action?"post":"DELETE"
				,"headers":{
					"X-API-Token":context.token
					,"Accept": "application/json"
					,"Content-Type": "application/json"
				}
			}).then(function(res){
				e.target.action = !action;
				e.target.innerHTML = (!action?"like":"un-like");
			});
			break;
		}
	}
	,"show":function(e){
		var id = e.target.getNode(["p","comment"]).rawId;
		var domain = e.target.getNode(["p","comment"]).domain;
		var context = cView.contexts[domain];
		switch(context.api.name){
		case "FreeFeed":
			utils.xhr({
				"url":gConfig.domains[domain].server.serverURLV2
					+ "comments/" + id + "/likes"
				,"token":context.token
			}).then(function(res){
				res = JSON.parse(res);
				if(res.status == "error") return;
				res.users.forEach(cView.Common.addUser, context);
				display(res.likes.map(function(like){
					return context.gUsers[like.userId].username;
				}));
			});
			break;
		case "Mokum":
			var clikes = context.gComments[id].clikes;
			if(Array.isArray(clikes))
				display(clikes.map(function(id){return context.gUsers[id].username;}));
			break;
		}
		return;
		function display(data){
			var popup = cView.gNodes["user-popup"].cloneAll();
			popup.style.top =  e.target.offsetTop;
			popup.style.left = e.target.offsetLeft;
			popup.cNodes["up-info"].innerHTML = "<b>Liked by:</b>";
			if (!data.length)popup.cNodes["up-info"].innerHTML = "No info";
			data.forEach(function(uname){
				var div = cView.doc.createElement("div");
				var link = cView.doc.createElement("a");
				link.innerHTML = "@" + uname;
				link.href = gConfig.front + "as/"+domain+"/"+uname; 
				div.appendChild(link);
				popup.cNodes["up-info"].appendChild(div);
			});
			e.target.parentNode.appendChild(popup);
			cView.Utils.fixPopupPos(popup);
		};
	}
	,"evtUpdNode":function (e){
		var node = e.detail;
		var context = cView.contexts[node.domain];
		if(!node
		||(typeof context == "undefined")
		||(node.classList[0] !== "comment")
		||(context.api.name !== "FreeFeed"))
			return;
		var cmt = context.gComments[node.rawId]; 
		apply({ "id":node.rawId
				,"likes":(cmt.likes == ""?0:cmt.likes)
				,"my_likes":(cmt.hasOwnLike == true?"1":"0")
			}
			,node
		);
	}
	,"evtNewNode":function (e){
		var arrNodes = e.detail;
		if(!arrNodes)return;
		arrNodes = Array.isArray(arrNodes)?arrNodes:[arrNodes];
		var cmts = new Object();
		arrNodes.forEach(function(node){
			var domain;
			switch(node.classList[0]){
			case "post":
				domain = node.rawData.domain;
				if(!Array.isArray(cmts[domain]))cmts[domain] = new Array();
				var comments = node.getElementsByClassName("comment");
				for (var idx = 0; idx < comments.length; idx++ )
					if(typeof comments[idx].rawId !== "undefined")
						cmts[domain].push( comments[idx]);
				break;
			case "comment":
				domain = node.domain;
				if(!Array.isArray(cmts[domain]))cmts[domain] = new Array();
				cmts[domain].push(node);
				break;
			}
		});
		loadLikes(cmts);
	}
	,"evtCLikeMokum" :function(e){
		apply(e.detail.info,e.detail.node);
	}

}
function setControls(node){
	var context = cView.contexts[node.domain];
	var nodeControl = nodesT["control"].cloneAll();
	node.cNodes["comment-body"].appendChild(nodeControl );
	node.cNodes["comment-body"].cNodes["like-comm"] = nodeControl;
	if(context.gMe){ 
		nodeControl.cNodes["spacer"].hidden = false;
		nodeControl.cNodes["action"].action = true;
		nodeControl.cNodes["action"].innerHTML =  "&#22909;";
		if (context.gMe.users.id == node.userid) {
			nodeControl.cNodes["action"].hidden = true;
			nodeControl.cNodes["spacer"].hidden = true;
		}
	}
	return nodeControl;

}
function apply (likeInfo, node){
	var context = cView.contexts[node.domain];
	var nodeControl = node.getNode( ["c","comment-body"] ,["c","like-comm"]);
	if (!nodeControl) nodeControl= setControls(node);
	var nodeLike = cView.doc.createElement("span"); 
	if(likeInfo.likes){
		nodeControl.cNodes["spacer"].hidden = false;
		nodeLike = nodesT["display"].cloneAll();
		nodeLike.innerHTML = likeInfo.likes;
			
		if(context.gMe && (context.gMe.users.id != node.userid)){ 
			nodeControl.cNodes["action"].action = (likeInfo.my_likes == "0");
			nodeControl.cNodes["action"].innerHTML =  (likeInfo.my_likes == "0"?"like":"un-like");
		}
	}else if(context.gMe && (context.gMe.users.id != node.userid)){ 
		nodeControl.cNodes["spacer"].hidden = false;
		nodeControl.cNodes["action"].action = true;
		nodeControl.cNodes["action"].innerHTML = "&#22909;";
	}
	cView.Utils.setChild( 
		nodeControl
		,"display"
		,nodeLike
	);
};
function initLikes(){
	cView.Common.genNodes(template).forEach(function(node){
		nodesT[node.classList[0]] = node;
	});
	cView["addons-like-comm"] = handlers;
	/*
	if(typeof cView.contexts[domain] === "undefined") return;
	var genCmt = cView.Drawer.genComment;
	cView.Drawer.genComment = function(comment){
		var nodeComment = genCmt.call(this, comment);
		if (this.domain == domain) setControls(nodeComment);
		return nodeComment;
	}
	var arrCmts = Object.keys(cView.contexts[domain].gComments);
	if (!arrCmts.length) return;
	arrCmts.forEach(function(id){
		node = cView.doc.getElementById(domain+"-cmt-"+id);
		if(node)setControls( node);
	});
	*/
	var cmts = new Object();
	var nodesCmt = cView.doc.getElementsByClassName("comment");
	for(var idx = 0; idx < nodesCmt.length; idx++){
		if( nodesCmt[idx].classList.contains("comments-load") )
			continue;
		var domain = nodesCmt[idx].domain;
		if(!Array.isArray(cmts[domain]))cmts[domain] = new Array();
		cmts[domain].push(nodesCmt[idx]);
	}
	loadLikes(cmts);

}
function loadLikes(cmts) {
	var likeApi = {
		"FreeFeed":function (context, arrCmts){
			arrCmts.forEach(function(id){
				var commentId = context.domain + "-cmt-" + id;
				var cmt = context.gComments[id]; 
				var nodeCmt = document.getElementById(commentId);
				if(nodeCmt){
					apply({ "id":id
							,"likes":(cmt.likes == ""?0:cmt.likes)
							,"my_likes":(cmt.hasOwnLike == true?"1":"0")
						}
						,nodeCmt
					);
				}
			});
		}
		,"Mokum": function (context, arrCmts){
			arrCmts.forEach(function(id){
				var commentId = context.domain + "-cmt-" + id;
				var cmt = context.gComments[id]; 
				var nodeCmt = document.getElementById(commentId);
				var cmtCount = ( typeof cmt.clikes_count !== "undefined" ) ?
					cmt.clikes_count : (Array.isArray(cmt.clikes)?cmt.clikes.length:0);
				if(nodeCmt && cmtCount){
					apply({ "id":id
							,"likes":cmtCount
							,"my_likes":( 
								(typeof cmt.user_liked !== "undefined")
								&& cmt.user_liked ?"1":"0"
							)
						}
						,nodeCmt
					);
				}
			});
		}
	}
	Object.keys(cmts).forEach(function(domain){
		var context = cView.contexts[domain];
		if(typeof context === "undefined") {
			console.log("Something went wrong. Unknown domain:", domain);
			return;
		}
		likeApi[context.api.name](context, cmts[domain].map(function(node){
			setControls(node);
			return node.rawId;
		}));
	});
}
return function(cV){
	return {
		"run": function (){
			cView = cV;
			initLikes();
			window.addEventListener("newNode",cView["addons-like-comm"].evtNewNode); 
			window.addEventListener("updNode",cView["addons-like-comm"].evtUpdNode);
			window.addEventListener("evtCLikeMokum",cView["addons-like-comm"].evtCLikeMokum); 
			return cView.Utils._Promise.resolve();
		}
		,"settings":function(){return cView.doc.createElement("span");}
	}
};
});
