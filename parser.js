'use strict';

var gUsers = new Object();
var gNodes = new Object();
var gMe = new Object();
var gComments = new Object();
var gAttachments  = new Object();
var gFeeds = new Object();
var gPrivTimeline = {'oraphed':{count:0},'noKey':{},'noDecipher':{},nCmts:0,'posts':[] };
var autolinker = new Autolinker({'truncate':20,  'replaceFn':frfAutolinker } );
var matrix = new CryptoPrivate({"srvurl":"https://moimosk.ru/cgi/secret","authurl": gConfig.serverURL,'sk':16, 'encId':"MATRIX", "feed":"crypto-matrix" });
document.addEventListener("DOMContentLoaded", initDoc);
function unfoldLikes(id){
	var post = document.getElementById(id).rawData;
	var span  = document.getElementById(id+'-unl');
	var nodeLikes = span.parentNode;
	
	if (post.omittedLikes > 0){
		var oReq = new XMLHttpRequest();
		oReq.onload = function(){
			if(oReq.status < 400){
    			nodeLikes.removeChild(span);
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
		oReq.setRequestHeader("X-Authentication-Token", window.localStorage.getItem("token"));
		oReq.send();

	}else  writeAllLikes(id, nodeLikes);
}

function writeAllLikes(id,nodeLikes){
	var post = document.getElementById(id).rawData;
	var idx;
	for(idx = 0; idx < nodeLikes.childNodes.length; idx++)
		if (nodeLikes.childNodes[idx].nodeName == 'UL')break;
	var nodeLike = document.createElement('li');
	nodeLike.className = "p-timeline-user-like";
	for(var like = gConfig.likesFold; like < post.likes.length; like++){
		var nodeCLike = nodeLike.cloneNode();
		nodeCLike.innerHTML = gUsers[post.likes[like]].link;
		//nodeLikes.childNodes[idx].appendChild(nodeCLike);
		nodeLikes.appendChild(nodeCLike);
	}
	var suffix = document.createElement('span');
	suffix.innerHTML = " liked this";
	//nodeLikes.childNodes[idx].appendChild(suffix);
	nodeLikes.appendChild(suffix);
}
function genLikes(post, postNBody){
	postNBody.cNodes["post-info"].cNodes["likes"].appendChild(gNodes['likes-smile'].cloneNode(true));
	var nodeLikes = document.createElement( 'ul');
 	var l =  post.likes.length;
	if(typeof gMe !== 'undefined'){ 
		for (var idx = 0; idx< l;idx++) {
			var like = post.likes[idx];		
			if(like == gMe.users.id){
				post.likes.splice(idx,1);
				post.likes.unshift(like);
				break;
			}
		}
	}
	var nodeLike = document.createElement('li');
	nodeLike.className = "p-timeline-user-like";
	for (var idx = 0; idx < (gConfig.likesFold<l?gConfig.likesFold:l) ; idx++){
		var nodeCLike = nodeLike.cloneNode();
		nodeCLike.innerHTML = gUsers[post.likes[idx]].link;
		nodeLikes.appendChild(nodeCLike);
	}
	var suffix = document.createElement("li");
	suffix.id = post.id+'-unl' 
	if (post.omittedLikes>0) l += post.omittedLikes;
	if ( l > gConfig.likesFold)
		suffix.innerHTML = 'and <a onclick="unfoldLikes(\''+post.id+'\')">'+ (l - gConfig.likesFold) +' other people</a>' ;
	suffix.innerHTML += ' liked this';
	suffix.className = 'nocomma';
	nodeLikes.appendChild(suffix);
	postNBody.cNodes["post-info"].cNodes["likes"].appendChild(nodeLikes);
	//postNBody.cNodes["post-info"].cNodes["likes"].appendChild(suffix);
	if(typeof gMe !== 'undefined'){ 
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
	if (typeof gUsers[user.id] !== 'undefined' ) return;
	gUsers[user.id] = user;
	gUsers[user.id].link = "<a href=" + gConfig.front+  user.username+">"+ user.screenName+'</a>';
	if(!user.profilePictureMediumUrl)user.profilePictureMediumUrl = gConfig.static+ "img/default-userpic-48.png";
}
function subscribe(e){
	var oReq = new XMLHttpRequest();
	oReq.open("post", gConfig.serverURL +"users/"+gConfig.timeline+(e.target.subscribed?'/unsubscribe':"/subscribe"), true);
	oReq.setRequestHeader("X-Authentication-Token", window.localStorage.getItem("token"));
	oReq.onload = function(){
		if(oReq.status < 400) {
			gMe = JSON.parse(oReq.response);
			window.localStorage.setItem("gMe",JSON.stringify(gMe));
			e.target.subscribed = !e.target.subscribed;
			e.target.innerHTML = e.target.subscribed?"Unsubscribe":"Subscribe";
		}
	}

	oReq.send();

}
function draw(content){
	var body = document.getElementsByTagName("body")[0];
	if(content.attachments)content.attachments.forEach(function(attachment){ gAttachments[attachment.id] = attachment; });
	if(content.comments)content.comments.forEach(function(comment){ gComments[comment.id] = comment; });
	content.users.forEach(addUser);
	var title =  document.createElement("div");
	title.innerHTML = "<h1>" +gConfig.timeline+ "</h1>"
	body.appendChild(title);
	if(typeof gMe === 'undefined') 
		body.appendChild(gNodes['controls-anon'].cloneAll());
	else{ 
		body.appendChild(gNodes['controls-user'].cloneAll());
		switch (gConfig.timeline.split('/')[0]){
		case 'home':
		case 'filter':
		case gMe.users.username:
			var nodeAddPost = gNodes['new-post'].cloneAll();
			body.appendChild(nodeAddPost);
			genPostTo(nodeAddPost.cNodes["new-post-to"]);
			break;
		default:
			var subscribers = new Object();
			var feeds = new Object();
			gMe.subscribers.forEach(function(sub){subscribers[sub.id]=sub;});
			gMe.subscriptions.forEach(function(sub){
				if(sub.name =='Posts')feeds[subscribers[sub.user].username] = true;
			});
			var subscribed = feeds[gConfig.timeline]?true:false
			var sub = document.createElement('a');
			sub.innerHTML = subscribed?"Unsubscribe":"Subscribe";
			sub.subscribed = subscribed;
			sub.addEventListener("click", subscribe);
			body.appendChild(sub);
		}
	}
	if(content.subscribers && content.subscriptions ){	
		var subscribers = new Object();
		content.subscribers.forEach(function(sub){subscribers[sub.id]=sub;});
		content.subscriptions.forEach(function(sub){if(sub.name =='Posts')gFeeds[sub.id] = subscribers[sub.user];});
	}
	if(content.timelines){
		var nodeMore = document.createElement("div");
		nodeMore.className = 'more-node';
		var htmlOffset = '<a href="' + gConfig.front+gConfig.timeline ;
		var backward = gConfig.cSkip*1 - gConfig.offset*1;
		var forward = gConfig.cSkip*1 + gConfig.offset*1;
		if (gConfig.cSkip){
			if (backward>0)htmlOffset += '?offset=' + backward*1+ '&limit='+gConfig.offset*1;
			htmlOffset += '"><span style="font-size: 120%">&larr;</span> Newer items</a>&nbsp;<a href="' + gConfig.front+gConfig.timeline;
		} 
		htmlOffset += '?offset=' + forward*1 + '&limit='+gConfig.offset*1+ '">Older items <span style="font-size: 120%">&rarr;</span></a>';
		nodeMore.innerHTML = htmlOffset;
		body.appendChild(nodeMore.cloneNode(true));
		document.posts = document.createElement("div");
		body.appendChild(document.posts);
		document.hiddenPosts = new Array();
		document.hiddenCount = 0;
		var idx = 0;
		content.posts.forEach(function(post){
			post.idx = idx++;
			if(post.isHidden){
				document.hiddenPosts.push(post);
				document.hiddenCount++;
			}else{ 
				document.hiddenPosts.push(false);
				document.posts.appendChild(genPost(post));
			} 
		});
		var nodeShowHidden = gNodes['show-hidden'].cloneAll();
		nodeShowHidden.cNodes['href'].action = true;
		body.appendChild(nodeShowHidden);
		if(document.hiddenCount) nodeShowHidden.cNodes['href'].innerHTML= 'Show '+ document.hiddenCount + ' hidden entries';
		body.appendChild(nodeMore);
		new Promise(function (){addPosts(0);});
	}else body.appendChild(genPost(content.posts));
}
function addPosts(offset){
	var limit = 100;
	var toAdd = Math.floor(gConfig.offset/3);
	var url = matrix.cfg.srvurl + "/posts?offset="+offset+"&limit="+limit;
	var oReq = new XMLHttpRequest();
	oReq.onload = function(){
		if(oReq.status < 400){
			var res = JSON.parse(this.response);
			//res.users.forEach(addUser);
			var idx = 0;
			if(res.attachments)res.attachments.forEach(function(attachment){ gAttachments[attachment.id] = attachment; });
			if(res.comments)res.comments.forEach(function(comment){ gComments[comment.id] = comment; });
			if(typeof res.posts !=="undefined")
				for( ; (idx < res.posts.length) && toAdd; idx++){
					var nodePost = genPost(res.posts[idx]);
					document.posts.appendChild(nodePost);
					if (nodePost.nodeName == 'DIV') --toAdd;
				}
			else{
				if(gPrivTimeline.oraphed.count)handleOraphed(offset);
				else clearRedPosts();

			}
			if ((toAdd)&&(limit==res.posts.length)) addPosts(toAdd,offset+limit );
			else if(gPrivTimeline.oraphed.count)handleOraphed(offset);
			else doPrivComments();
		}
	}	
	oReq.open("get",url,true);
	oReq.send();
}
function handleOraphed(offset){
	var limit = 100;
	var url = matrix.cfg.srvurl + "/posts?offset="+offset+"&limit="+limit;
	var oReq = new XMLHttpRequest();
	oReq.onload = function(){
		if(oReq.status < 400){
			var res = JSON.parse(this.response);
			res.users.forEach(addUser);
			var idx = 0;
			for(;idx<res.posts.length;idx++){
				processOraph(res.posts[idx]);
				if (!gPrivTimeline.oraphed.count)break;
			}
			if (gPrivTimeline.oraphed.count)handleOraphed(offset*1+limit*1);
			else doPrivComments();
		}
	}
}
function processOraph(post){
	var cpost = matrix.decrypt(post);
	if (typeof cpost.error !== 'undefined') return;
	cpost = JSON.parse(cpost);
	if(typeof gPrivTimeline.oraphed[cpost.postid]!== 'undefined' ){
		if (typeof cpost.feed === 'undefined') cpost.feed = cpost.id;
		nodePost.feed = cpost.feed;
		if(cpost.type == "post"){
			var home = document.getElementById(post.id);
			if (!home){
				console.log("Lost private post #"+post.id);
				return;
			}
			var nodePost = home;
			gPrivTimeline.posts.push(nodePost);
			postNBody = nodePost.cNodes["post-body"];
			nodePost.homed = true;	
			nodePost.rawData = post;
			delete gPrivTimeline.oraphed[cpost.postid];
			nodePost.cmt.reverse()
			nodePost.cmt.forEach( function(cmt){ 
				var nodeComment = genComment(cmt);
				nodeComment.hidden = true;
				postNBody.cNodes["comments"].appendChild( nodeComment);
			})
			delete nodePost.cmt;
			postNBody.cNodes["post-cont"].innerHTML = autolinker.link(cpost.data.replace(/&/g,'&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
		}else if (cpost.type == "comment"){
			gPrivTimeline.nCmts++;
			var nodePriv = document.getElementById(cpost.postid);
			if(!nodePriv) {
				console.log("Lost private comment #"+post.id);
				return;
			} 

			gComments[post.id] = {"body":cpost.data,
				"createdAt":post.createdAt, 
				"createdBy": post.createdBy, 
				"feed":cpost.feed,
				"id":post.id
			};
			if (nodePriv.homed){
				var nodeComment = genComment(gComments[post.id]);
				nodeComment.hidden = true;
				nodePriv.cNodes["post-body"].cNodes["comments"].insertBefore(nodeComment,nodePriv.cNodes["post-body"].cNodes["comments"].firstChild);
			}
			else nodePriv.cmt.push(gComments[post.id]); 
		}
	}

}
function doPrivComments(){
	gPrivTimeline.posts.forEach(function(nodePost){
		var nodeComments = nodePost.cNodes["post-body"].cNodes["comments"];
		if(nodeComments.childNodes.length < 4)
			for(var idx = 0; idx < nodeComments.childNodes.length; idx++)
				nodeComments.childNodes[idx].hidden = false;
		else{
			for(var idx = 0; idx < 2; idx++)
				nodeComments.childNodes[idx].hidden = false;
			var nodeComment = gNodes['comment'].cloneAll();
			nodeComment.id = nodePost.id+'-ufc';
			nodeComment.cNodes['comment-date'].innerHTML = '';
			nodeComment.cNodes['comment-body'].innerHTML = '<a onclick="unfoldPrivComm(\''+nodePost.id+'-ufc\')" style="font-style: italic;">'+(nodeComments.childNodes.length-3)*1 +' more comments</a>';
			nodeComments.insertBefore( nodeComment, nodeComments.childNodes[2]);
			nodeComments.lastChild.hidden = false;
		}
	});
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
		var nodeHiddenPosts = document.createElement('div');
		nodeHiddenPosts.id = 'hidden-posts'; 
		document.hiddenPosts.forEach(function(post){if(post)nodeHiddenPosts.appendChild(genPost(post));});
		e.target.parentNode.parentNode.insertBefore(nodeHiddenPosts , e.target.parentNode.nextSibling);
		e.target.innerHTML =  'Collapse '+ document.hiddenCount + ' hidden entries';
	}else{
		var nodeHiddenPosts = document.getElementById('hidden-posts');
		if (nodeHiddenPosts) nodeHiddenPosts.parentNode.removeChild(nodeHiddenPosts);
		if (document.hiddenCount) e.target.innerHTML = 'Show '+ document.hiddenCount + ' hidden entries';
		else e.target.innerHTML = '';
	}
	e.target.action = !e.target.action; 
}
function postHide(e){
	var victim = e.target; do victim = victim.parentNode; while(victim.className != 'post');
	var oReq = new XMLHttpRequest();
	var aShow = document.getElementsByClassName('show-hidden')[0].cNodes["href"];
	oReq.onload = function(){
		if(this.status < 400){	
			if(e.target.action){
				victim.rawData.isHidden = true;
				document.hiddenPosts[victim.rawData.idx] = victim.rawData;
				victim.parentNode.removeChild(victim);
				document.hiddenCount++;
				aShow.action = false;
				aShow.dispatchEvent(new Event('click'));
			}else{
				var count = 0;
				var idx = victim.rawData.idx;
				do if(document.hiddenPosts[idx--])count++;
				while ( idx >0 );
				if ((victim.rawData.idx - count+1) >= document.posts.childNodes.length )document.posts.appendChild(victim);
				else document.posts.insertBefore(victim, document.posts.childNodes[victim.rawData.idx - count+1]);
				e.target.innerHTML = 'Hide';
				document.hiddenPosts[victim.rawData.idx] = false;
				document.hiddenCount--;
				if(document.hiddenCount) aShow.innerHTML = 'Collapse '+ document.hiddenCount + ' hidden entries'; 
				else aShow.dispatchEvent(new Event('click'));
			}
			e.target.action = !e.target.action; 
		};
	}
	

		oReq.open("post",gConfig.serverURL + "posts/"+ e.target.parentNode.parentNode.parentNode.parentNode.parentNode.id+"/"+(e.target.action?"hide":"unhide"), true);
		oReq.setRequestHeader("X-Authentication-Token", window.localStorage.getItem("token"));
		oReq.send();
		

	
}
function updateDate(node){
	node.innerHTML =  relative_time(node.date) ;
	window.setTimeout(updateDate, 5000, node );
}
function genPost(post){
	var nodePost = gNodes['post'].cloneAll();
	var postNBody = nodePost.cNodes["post-body"];
	var user = gUsers[post.createdBy];
	nodePost.homed = false;
	nodePost.rawData = post;
	nodePost.id = post.id;
	nodePost.isPrivate = false;

	var cpost = matrix.decrypt(post.body);
	if (typeof cpost.error !== 'undefined'){
		switch(cpost.error){
		case '0':
			break;
		case '3':
			gPrivTimeline.noKey[post.id] = post;
			console.log(post.id+": unknown key");
			break;
		case '4':
			gPrivTimeline.noDecipher[post.id] = post;
			console.log("Private keys not loaded");
			break;
		}
		postNBody.cNodes["post-cont"].innerHTML =  autolinker.link(post.body.replace(/&/g,'&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
	}else{	
		nodePost.isPrivate = true;
		cpost = JSON.parse(cpost);
		if (typeof cpost.feed === 'undefined') cpost.feed = cpost.id;
		nodePost.feed = cpost.feed;
		if(cpost.type == "post"){
			var home = document.getElementById(post.id);
			if (home){
				nodePost = home;
				postNBody = nodePost.cNodes["post-body"];
				nodePost.homed = true;	
				nodePost.rawData = post;
				delete gPrivTimeline.oraphed[cpost.postid];
				gPrivTimeline.oraphed.count--;
				nodePost.cmt.reverse()
				nodePost.cmt.forEach( function(cmt){ 
					var nodeComment = genComment(cmt);
					nodeComment.hidden = true;
					postNBody.cNodes["comments"].appendChild( nodeComment);
				});
				delete nodePost.cmt;
			}
			gPrivTimeline.posts.push(nodePost);
			nodePost.rawData.body = cpost.data;
			postNBody.cNodes["post-cont"].innerHTML = autolinker.link(cpost.data.replace(/&/g,'&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
		}else if (cpost.type == "comment"){
			gPrivTimeline.nCmts++;
			var nodePriv = document.getElementById(cpost.postid);
			if(!nodePriv) {
				nodePost.id = cpost.postid;
				postNBody.cNodes["post-cont"].innerHTML = '<span style="font-family: monospace; font-size: xx-large">THE MATRIX IS LOADING</span><i class="fa fa-spinner fa-pulse fa-2x"></i>';
				gPrivTimeline.oraphed[cpost.postid] = nodePost;
				gPrivTimeline.oraphed.count++;
				nodePriv = nodePost;
				nodePriv.cmt = new Array();
			}
			gComments[post.id] = {"body":cpost.data,
				"createdAt":post.createdAt, 
				"createdBy": post.createdBy, 
				"feed":cpost.feed,
				"id":post.id
			};
			if (nodePriv.homed){
				var nodeComment = genComment(gComments[post.id]);
				nodeComment.hidden = true;
				nodePriv.cNodes["post-body"].cNodes["comments"].insertBefore(nodeComment,nodePriv.cNodes["post-body"].cNodes["comments"].firstChild);
			}
			else nodePriv.cmt.push(gComments[post.id]); 
			if (nodePost.id == cpost.postid) return nodePost;
			else return document.createElement('span');
		}

	}

	if(typeof user !== 'undefined'){
		nodePost.cNodes["avatar"].innerHTML = '<img src="'+ user.profilePictureMediumUrl+'" />';
		var title = user.link;
		if(nodePost.isPrivate) title += '<span> posted privately to '+StringView.makeFromBase64(matrix.gSymKeys[cpost.feed].name)+"</span>";
		else if(post.postedTo){
			if ((post.postedTo.length >1)||(gFeeds[post.postedTo[0]].id!=user.id)){
				title += "<span> posted to: </span>";
				post.postedTo.forEach(function(id){
					title += "<a href=" + gConfig.front+ gFeeds[id].username+">"+ gFeeds[id].screenName;
					if(gFeeds[id].type == 'user')
						if(gFeeds[id].screenName.slice(-1) == 's')
							title += "' feed";
						else title += "'s feed";
					title += '</a>';
				});
			}
		}
		postNBody.cNodes["title"].innerHTML = title;
	}
	if(post.attachments){
		var attsNode = postNBody.cNodes["attachments"];
		for(var att in post.attachments){
			var nodeAtt = gNodes['attachment'].cloneAll();
			nodeAtt.innerHTML = '<a target="_blank" href="'+gAttachments[post.attachments[att]].url+'" border=none ><img src='+gAttachments[post.attachments[att]].thumbnailUrl+'></a>';
			attsNode.appendChild(nodeAtt);
		}		
	}
//	postNBody.cNodes["post-info"].cNodes["post-controls"].cNodes["post-date"].innerHTML = "<a href='"+ gConfig.front+ user.username+'/'+post.id+ "' >"+ (new Date(post.updatedAt*1)).toLocaleString()+"</a>";
	var anchorDate = document.createElement("a");
	if(typeof user !== 'undefined') anchorDate.href = gConfig.front+user.username+'/'+post.id;
	postNBody.cNodes["post-info"].cNodes["post-controls"].cNodes["post-date"].appendChild(anchorDate);
	anchorDate.date = post.createdAt*1;

	window.setTimeout(updateDate, 10,anchorDate);

	if(typeof gMe !== 'undefined'){ 
		var nodeControls;
			if (post.createdBy == gMe.users.id)
			nodeControls = gNodes['controls-self'].cloneAll();
		else {
			nodeControls = gNodes['controls-others'].cloneAll();
			postNBody.cNodes["post-info"].nodeLike = nodeControls.cNodes['post-control-like'];
			nodeControls.cNodes['post-control-like'].action = true;
		}
		var aHide = document.createElement('a');
		aHide.innerHTML = post.isHidden?'Un-hide':'Hide';
		aHide.action = !post.isHidden;
		aHide.addEventListener("click", postHide);
		nodeControls.appendChild(aHide);
		postNBody.cNodes["post-info"].cNodes["post-controls"].appendChild( nodeControls);
	}
	if (post.likes)	genLikes(post, postNBody );
	if (post.comments){
		if(post.omittedComments){
			postNBody.cNodes['comments'].appendChild(genComment(gComments[post.comments[0]]));
			var nodeComment = gNodes['comment'].cloneAll();
			nodeComment.cNodes['comment-date'].innerHTML = '';
			nodeComment.cNodes['comment-body'].innerHTML = '<a id='+post.id+'-unc  onclick="unfoldComm(\''+post.id +'\')" style="font-style: italic;">'+ post.omittedComments+' more comments</a>';
			postNBody.cNodes['comments'].appendChild(nodeComment);
			postNBody.cNodes['comments'].appendChild(genComment(gComments[post.comments[1]]));
		}
		else post.comments.forEach(function(commentId){ postNBody.cNodes['comments'].appendChild(genComment(gComments[commentId]))});
	}
	postNBody.cNodes['comments'].cnt = postNBody.cNodes['comments'].childNodes.length;
	if (postNBody.cNodes['comments'].cnt > 4) 
			addLastCmtButton(postNBody);
	return nodePost.homed?document.createElement('span'):nodePost;

}
function newPost(e){
	var textField = e.target.parentNode.parentNode.cNodes["edit-txt-area"];
	textField.disabled = true;
	e.target.disabled = true;
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
			if(this.status < 400){
				var nodeAtt = document.createElement('div');
				nodeAtt.className = 'attachments';
				textField.parentNode.replaceChild(nodeAtt, 
					textField.parentNode.cNodes['attachments']);
				textField.parentNode.cNodes['attachments'] = nodeAtt;
				textField.value = '';
				textField.disabled = false;
				e.target.disabled = false;
				textField.style.height  = '4em';
				var res = JSON.parse(this.response);
				if(res.attachments)res.attachments.forEach(function(attachment){ gAttachments[attachment.id] = attachment; });
				document.posts.insertBefore(genPost(res.posts), document.posts.childNodes[0]);
			}
		};
		if(textField.attachments) post.attachments = textField.attachments;
		postdata.post = post;
		if(postTo.isPrivate){ 
			matrix.makeToken().then(function(token){
				oReq.open("post",matrix.cfg.srvurl+"?post", true);
				oReq.setRequestHeader("X-Authentication-User", gMe.users.username);
				oReq.setRequestHeader("X-Authentication-Token", token);
				oReq.setRequestHeader('x-content-type', 'post'); 
				oReq.setRequestHeader("Content-type","text/plain");
				oReq.onload = onload;
				post = matrix.encrypt(postTo.feeds, 
					JSON.stringify({
						"feed":postTo.feeds[0],
						"type":"post", 
						"data":textField.value
					}));
				oReq.send(post);
			}, function(){ console.log("can't get auth token"); }
			);
		}else{
			oReq.open("post",gConfig.serverURL + "posts", true);
			oReq.onload = onload;
			oReq.setRequestHeader("Content-type","application/json");
			oReq.setRequestHeader("X-Authentication-Token", 
				window.localStorage.getItem("token"));
			post.body = textField.value;
			oReq.send(JSON.stringify(postdata));
		}
	}
}
function sendAttachment(e){
	e.target.disabled = true;
	var textField = e.target.parentNode.parentNode.cNodes["edit-txt-area"];
	var nodeSpinner = gNodes['attachment'].cloneAll();
	nodeSpinner.innerHTML = '<img src='+gConfig.static+"img/uploading.gif"+'>';
	e.target.parentNode.parentNode.cNodes['attachments'].appendChild(nodeSpinner);
	textField.pAtt = new Promise(function(resolve,reject){
		var oReq = new XMLHttpRequest();
		oReq.onload = function(){
			if(this.status < 400){
				e.target.value = '';
				e.target.disabled = false;
				var attachments = JSON.parse(this.response).attachments;
				var nodeAtt = gNodes['attachment'].cloneAll();
				nodeAtt.innerHTML = '<a target="_blank" href="'+attachments.url+'" border=none ><img src='+attachments.thumbnailUrl+'></a>';
				nodeSpinner.parentNode.replaceChild(nodeAtt, nodeSpinner);
				if (typeof(textField.attachments) === 'undefined' ) textField.attachments = new Array();
				textField.attachments.push(attachments.id);
				resolve();

			}else reject(this.status);
		};

		oReq.open("post",gConfig.serverURL + "attachments", true);
		oReq.setRequestHeader("X-Authentication-Token", window.localStorage.getItem("token"));
		var data = new FormData();
		data.append( 'name', "attachment[file]");
		data.append( "attachment[file]", e.target.files[0], e.target.value);
		oReq.send(data);
	});
}
function editPost(e) {
	var victim = e.target; do victim = victim.parentNode; while(victim.className != 'post');
	var nodeEdit = genEditNode(postEditedPost,cancelEditPost);
	nodeEdit.cNodes['edit-txt-area'].value = victim.rawData.body;
	victim.cNodes['post-body'].replaceChild( nodeEdit, victim.cNodes['post-body'].cNodes['post-cont']);
}
function cancelEditPost(e){
	 var victim = e.target; do victim = victim.parentNode; while(victim.className != 'post');
	 var postCNode = document.createElement('div');
	 postCNode.innerHTML = victim.rawData.body;
	 postCNode.className = 'post-cont';
	 victim.cNodes['post-body'].replaceChild(postCNode,e.target.parentNode.parentNode );
	 victim.cNodes['post-body'].cNodes['post-cont'] = postCNode;

}
function postEditedPost(e){
	var nodePost =e.target; do nodePost = nodePost.parentNode; while(nodePost.className != 'post');
	var oReq = new XMLHttpRequest();
	e.target.disabled = true;
	oReq.onload = function(){
		if(this.status < 400){
			var post = JSON.parse(oReq.response).posts;
			var postCNode = document.createElement('div');
			var cpost = matrix.decrypt(post.body);
			if (typeof cpost.error === 'undefined') post.body = JSON.parse(cpost).data;
			postCNode.innerHTML = post.body;
			postCNode.className = 'post-cont';
			nodePost.rawData = post;
			nodePost.cNodes['post-body'].replaceChild(postCNode,e.target.parentNode.parentNode );
			nodePost.cNodes['post-body'].cNodes['post-cont'] = postCNode;
		}
	};

	var post = new Object();
	post.createdAt = nodePost.rawData.createdAt;
	post.createdBy = nodePost.rawData.createdBy;
	post.updatedAt = Date.now();
	var postdata = new Object();
	postdata.post = post;
	var text = e.target.parentNode.parentNode.cNodes['edit-txt-area'].value;
	if(nodePost.isPrivate){ 
		matrix.makeToken().then(function(token){
			oReq.open("put",matrix.cfg.srvurl+"?edit", true);
			oReq.setRequestHeader("X-Authentication-User", gMe.users.username);
			oReq.setRequestHeader("X-Authentication-Token", token);
			oReq.setRequestHeader('x-content-id', nodePost.id); 
			oReq.setRequestHeader('x-content-type', 'post'); 
			oReq.setRequestHeader("Content-type","text/plain");
			post = matrix.encrypt(nodePost.feed, 
				JSON.stringify({
					"feed":nodePost.feed, 
					"type":"post", 
					"data":text
				}));
			oReq.send(post);
		}, function(){ console.log("can't get auth token"); });
	}else{
		post.body =  text;
		oReq.open("put",gConfig.serverURL + "posts/"+nodePost.id, true);
		oReq.setRequestHeader("X-Authentication-Token", window.localStorage.getItem("token"));
		oReq.setRequestHeader("Content-type","application/json");
		oReq.send(JSON.stringify(postdata));
	}
}
function deletePost(e){
	var victim =e.target; do victim = victim.parentNode; while(victim.className != 'post');
	var oReq = new XMLHttpRequest();
	oReq.onload = function(){
		if(this.status < 400){
			victim.parentNode.removeChild(victim);
		}
	};
	if(victim.isPrivate){ 
		matrix.makeToken().then(function(token){
			oReq.open("delete",matrix.cfg.srvurl+"?delete",true);
			oReq.setRequestHeader('x-content-id', victim.id); 
			oReq.setRequestHeader("X-Authentication-User", gMe.users.username);
			oReq.setRequestHeader("X-Authentication-Token", token);
			oReq.setRequestHeader('x-content-type', 'post'); 
			oReq.send();
		}, function(){ console.log("can't get auth token"); });
	}else{
		oReq.open("delete",gConfig.serverURL + "posts/"+victim.id, true);
		oReq.setRequestHeader("X-Authentication-Token", window.localStorage.getItem("token"));
		oReq.setRequestHeader("Content-type","application/json");
		oReq.send();
	}
}
function postLike(e){
	var oReq = new XMLHttpRequest();

	oReq.onload = function(){
		if(this.status < 400){	
			if(e.target.action){
				var idx;
				var nodeLikes = e.target.parentNode.parentNode.parentNode.cNodes["likes"];
				var likesUL;
				if (!nodeLikes.childNodes.length){
					nodeLikes.appendChild(gNodes['likes-smile'].cloneNode(true));
					likesUL = document.createElement( 'ul');
					likesUL.className ="p-timeline-user-likes";
					var suffix = document.createElement("span");
					suffix.id = e.target.parentNode.postId+'-unl';
					suffix.innerHTML = " liked this";
					nodeLikes.appendChild(likesUL);
					nodeLikes.appendChild(suffix);

				}else {

					for(idx = 0; idx < nodeLikes.childNodes.length; idx++)
						if (nodeLikes.childNodes[idx].nodeName == 'UL')break;
					likesUL = nodeLikes.childNodes[idx];
				}
				var nodeLike = document.createElement('li');
				nodeLike.className = "p-timeline-user-like";
				nodeLike.innerHTML = gUsers[gMe.users.id].link;
				if(likesUL.childNodes.length)likesUL.insertBefore(nodeLike, likesUL.childNodes[0]);
				else likesUL.appendChild(nodeLike);
				e.target.parentNode.parentNode.parentNode.myLike = nodeLike;
			}else{
				var myLike = e.target.parentNode.parentNode.parentNode.myLike;
				likesUL = myLike.parentNode;
				likesUL.removeChild(myLike);  	
				if (!likesUL.childNodes.length) likesUL.parentNode.innerHTML = '';
			 }
			e.target.innerHTML=e.target.action?'Un-like':'Like';
			e.target.action = !e.target.action; 
		};
	}
	

		oReq.open("post",gConfig.serverURL + "posts/"+ e.target.parentNode.parentNode.parentNode.parentNode.parentNode.id+"/"+(e.target.action?"like":"unlike"), true);
		oReq.setRequestHeader("X-Authentication-Token", window.localStorage.getItem("token"));
		oReq.send();
		
}
function genEditNode(post,cancel){
	var nodeEdit = gNodes['edit'].cloneAll();
	nodeEdit.cNodes["edit-buttons"].cNodes["edit-buttons-post"].addEventListener('click',post);
	nodeEdit.cNodes["edit-buttons"].cNodes["edit-buttons-cancel"].addEventListener('click',cancel);
	return nodeEdit;
}
function addComment(e){
	var postNBody = e.target; do postNBody = postNBody.parentNode; while(postNBody.className != 'post-body');
	if(postNBody.isBeenCommented === true)return;
	postNBody.isBeenCommented = true;
	var nodeComment = gNodes['comment'].cloneAll();
	 nodeComment.cNodes['comment-body'].appendChild(genEditNode(postNewComment,cancelNewComment));
	postNBody.cNodes['comments'].appendChild(nodeComment);
}
function editComment(e){
	var victim = e.target; do victim = victim.parentNode; while(victim.className != 'comment');
	var nodeEdit = genEditNode(postEditComment,cancelEditComment);
	var nodeComment = gNodes['comment'].cloneAll();
	nodeEdit.cNodes['edit-txt-area'].value = gComments[victim.id].body;
	//nodeComment.replaceChild(nodeEdit, nodeComment.cNodes['comment-body']);
	 nodeComment.cNodes['comment-body'].appendChild(nodeEdit);
	victim.parentNode.replaceChild( nodeComment, victim);
	nodeComment.id = victim.id;

}
function sendEditedPrivateComment(textField, nodeComment, nodePost){
	var oReq = new XMLHttpRequest();
	oReq.onload = function(){
		if(this.status < 400){
			var res = JSON.parse(this.response);
			var cpost = JSON.parse(matrix.decrypt(res.posts.body));
			var comment = {"body":cpost.data,
					"createdAt":res.posts.createdAt, 
					"createdBy":res.posts.createdBy, 
					"feed":res.posts.id
					};
			gComments[res.posts.id] = comment;

			nodeComment.parentNode.replaceChild(genComment(comment),nodeComment);
		}
	};

	oReq.open("put",matrix.cfg.srvurl+"?edit&id="+nodeComment.id, true);
	oReq.setRequestHeader("Content-type","text/plain");
	var post = new Object();
	post.updatedAt = Date.now();
	var postdata = new Object();
	postdata.post = post;
	post.body = matrix.encrypt(nodePost.feed, JSON.stringify({"id":nodePost.feed,"type":"comment", "data":textField.value,"postid":nodePost.id }));
	matrix.makeToken().then(function(token){
			oReq.setRequestHeader("X-Authentication-Token", token);
			oReq.setRequestHeader("X-Authentication-User", gMe.users.username);
			oReq.setRequestHeader('x-content-type', 'comment'); 
			oReq.send(JSON.stringify(postdata));
		}, function(){ console.log("can't get auth token"); }
	);


}
function postEditComment(e){
	var nodeComment = e.target; do nodeComment = nodeComment.parentNode; while(nodeComment.className != 'comment');
	var nodePost =nodeComment; do nodePost = nodePost.parentNode; while(nodePost.className != 'post');
	var textField = e.target.parentNode.parentNode.cNodes['edit-txt-area'];
	if(nodePost.isPrivate){
		sendEditedPrivateComment(textField, nodeComment, nodePost);
		return;
	}
	var comment = gComments[nodeComment.id];
	comment.body = textField.value; 
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
	oReq.setRequestHeader("X-Authentication-Token", window.localStorage.getItem("token"));
	oReq.setRequestHeader("Content-type","application/json");
	var postdata = new Object();
	postdata.comment = comment;
	postdata.users = new Array(gMe);
	oReq.send(JSON.stringify(postdata));

};
function cancelEditComment(e){
	var nodeComment = e.target; do nodeComment = nodeComment.parentNode; while(nodeComment.className != 'comment');
	 nodeComment.parentNode.replaceChild(genComment( gComments[nodeComment.id]),nodeComment);
};
function processText(e) {
	if (e.target.scrollHeight > e.target.clientHeight) 
		e.target.style.height = e.target.scrollHeight + "px";
	if (e.which == '13'){
		var text = e.target.value;
		if(text.charAt(text.length-1) == '\n') e.target.value = text.slice(0, -1);
		e.target.parentNode.cNodes['edit-buttons'].cNodes["edit-buttons-post"].dispatchEvent(new Event('click'));
	}
	
}
function cancelNewComment(e){ 
	var postNBody = e.target; do postNBody = postNBody.parentNode; while(postNBody.className != 'post-body');
	postNBody.isBeenCommented = false;
	var nodeComment =e.target; do nodeComment = nodeComment.parentNode; while(nodeComment.className != 'comment');
	nodeComment.parentNode.removeChild(nodeComment);

}
function postNewComment(e){
	sendComment(e.target.parentNode.previousSibling);
	var nodeComments =e.target; do nodeComments = nodeComments.parentNode; while(nodeComments.className != 'comments');
	nodeComments.cnt++;
}
function deleteComment(e){
	var nodeComment =e.target; do nodeComment = nodeComment.parentNode; while(nodeComment.className != 'comment');
	var nodePost =nodeComment; do nodePost = nodePost.parentNode; while(nodePost.className != 'post');
	var oReq = new XMLHttpRequest();
	oReq.onload = function(){
		if(this.status < 400){
			nodeComment.parentNode.removeChild(nodeComment);
			delete gComments[nodeComment.id];
		}
	};
	oReq.open("delete",gConfig.serverURL + (nodePost.isPrivate?"posts/":"comments/")+nodeComment.id, true);
	oReq.setRequestHeader("X-Authentication-Token", window.localStorage.getItem("token"));
	oReq.setRequestHeader("Content-type","application/json");
	oReq.send();
}
function sendPrivateComment( textField, nodeComment, nodePost){
	textField.disabled = true;
	var oReq = new XMLHttpRequest();
	oReq.onload = function(){
		if(this.status < 400){
			textField.value = '';
			textField.disabled = false;
			textField.style.height  = '4em';
			var res = JSON.parse(this.response);
			var cpost = console.log(matrix.decrypt(res.posts.body));
			var cpost = JSON.parse(matrix.decrypt(res.posts.body));
			var comment = {"body":cpost.data,
					"createdAt":res.posts.createdAt, 
					"createdBy":res.posts.createdBy, 
					"id":res.posts.id
					};
			nodeComment.parentNode.insertBefore(genComment(comment),nodeComment);
			gComments[comment.id] = comment;
			textField.parentNode.cNodes['edit-buttons'].cNodes['edit-buttons-post'].disabled = false;
			if( nodeComment.parentNode.childNodes.length > 4 ) addLastCmtButton(nodePost.cNodes['post-body']);
		}
	};

	oReq.open("post",matrix.cfg.srvurl+"?post", true);
	oReq.setRequestHeader("Content-type","text/plain");
	var post = matrix.encrypt(nodePost.feed, JSON.stringify({"id":nodePost.feed,"type":"comment", "data":textField.value,"postid":nodePost.id }));
	matrix.makeToken().then(function(token){
			oReq.setRequestHeader("X-Authentication-User", gMe.users.username);
			oReq.setRequestHeader('x-content-type', 'comment'); 
			oReq.setRequestHeader("X-Authentication-Token", token);
			oReq.send(post);
		}, function(){ console.log("can't get auth token"); }
	);
}
function sendComment(textField){
	var nodeComment =textField; do nodeComment = nodeComment.parentNode; while(nodeComment.className != 'comment');
	var nodePost =nodeComment; do nodePost = nodePost.parentNode; while(nodePost.className != 'post');
	if(nodePost.isPrivate){
		sendPrivateComment(textField, nodeComment, nodePost);
		return;
	}
	textField.parentNode.cNodes['edit-buttons'].cNodes['edit-buttons-post'].disabled = true;
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
			textField.value = '';
			textField.style.height = '4em';
			var comment = JSON.parse(this.response).comments;
			nodeComment.parentNode.insertBefore(genComment(comment),nodeComment);
			gComments[comment.id] = comment;
			textField.parentNode.cNodes['edit-buttons'].cNodes['edit-buttons-post'].disabled = false;
			if( nodeComment.parentNode.childNodes.length > 4 ) addLastCmtButton(nodePost.cNodes['post-body']);
		}
	};

	oReq.open("post",gConfig.serverURL + "comments", true);
	oReq.setRequestHeader("X-Authentication-Token", window.localStorage.getItem("token"));
	oReq.setRequestHeader("Content-type","application/json");
	var postdata = new Object();
	postdata.comment = comment;
	oReq.send(JSON.stringify(postdata));
}/*
function genPComment(cpost){
	var nodeComment = gNodes['comment'].cloneAll();
	var cUser = gUsers[comment.createdBy];
	nodeComment.cNodes['comment-body'].innerHTML = autolinker.link(comment.body.replace(/&/g,'&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'))+ " - " + cUser.link ;
	nodeComment.id = comment.id;
	nodeComment.createdAt = comment.createdAt;
	if(typeof gMe !== 'undefined') 
		if(cUser.id == gMe.users.id) 
			nodeComment.cNodes['comment-body'].appendChild(gNodes['comment-controls'].cloneAll());
	return nodeComment; 

}
*/
function genComment(comment){
	var nodeComment = gNodes['comment'].cloneAll();
	var cUser = gUsers[comment.createdBy];
	nodeComment.cNodes['comment-body'].innerHTML = autolinker.link(comment.body.replace(/&/g,'&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'))+ " - " + cUser.link ;
	nodeComment.id = comment.id;
	nodeComment.createdAt = comment.createdAt;
	if(typeof gMe !== 'undefined') 
		if(cUser.id == gMe.users.id) 
			nodeComment.cNodes['comment-body'].appendChild(gNodes['comment-controls'].cloneAll());
	return nodeComment; 
}
function addLastCmtButton(postNBody){
	if (postNBody.lastCmtButton == true)return;
	var aAddComment = document.createElement('a');
	aAddComment.className = 'post-control-comment';
	aAddComment.innerHTML = 'Comment';
	aAddComment.addEventListener("click",addComment);
	postNBody.appendChild( aAddComment);
	postNBody.lastCmtButton = true;
}
function unfoldComm(id){
	var post = document.getElementById(id).rawData;
	var oReq = new XMLHttpRequest();
	var spUnfold = document.getElementById(id+'-unc').parentNode.appendChild(document.createElement('i'));
	spUnfold.className = 'fa fa-spinner fa-pulse';
	oReq.onload = function(){
		if(oReq.status < 400){
			var postUpd = JSON.parse(this.response);
			postUpd.users.forEach(addUser);
			document.getElementById(id).rawData = post;
			var nodePB = document.getElementById(id).cNodes['post-body'];
			nodePB.removeChild(nodePB.cNodes['comments']);
			nodePB.cNodes['comments'] = document.createElement('div');
			nodePB.cNodes['comments'].className = 'comments';
			postUpd.comments.forEach(function(cmt){nodePB.cNodes['comments'].appendChild(genComment(cmt))});
			nodePB.appendChild(nodePB.cNodes['comments']);
			addLastCmtButton(nodePB);
			nodePB.cNodes['comments'].cnt = postUpd.comments.length;

		}else{
			spUnfold.parentNode.removeChild(spUnfold);
			console.log(oReq.toString());

		};
	};

	oReq.open("get",gConfig.serverURL + "posts/"+post.id+"?maxComments=all&maxLikes=0", true);
	oReq.setRequestHeader("X-Authentication-Token", window.localStorage.getItem("token"));
	oReq.send();


}
function calcCmtTime(e){
	if (typeof(e.target.parentNode.parentNode.parentNode.createdAt) !== 'undefined' )
		e.target.title =  relative_time(e.target.parentNode.parentNode.parentNode.createdAt*1);

}
function genCNodes(node, proto){
	node.cNodes = new Object(); 
	for(var idx = 0; idx <  node.childNodes.length; idx++){
		genCNodes(node.childNodes[idx], proto.childNodes[idx]);
		node.cNodes[node.childNodes[idx].className] = node.childNodes[idx];
	}
	if (typeof(proto.e) !== 'undefined' ) 
		for(var action in proto.e)
			node.addEventListener(action, window[proto.e[action]]);	
}
function genNodes(templates){
	var nodes = new Array();
	//oTemplates = JSON.parse(templates);
	templates.forEach(function(template){
				if (!template.t)template.t = 'div';
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
	var token = window.localStorage.getItem("token");

	gMe = window.localStorage.getItem("gMe");
	if (gMe && token){
		gMe = JSON.parse(gMe);
		if (gMe.users) {
			addUser(gMe.users);
			new Promise(function(){
				var oReq = new XMLHttpRequest();
				oReq.open("get", gConfig.serverURL +"users/whoami", true);
				oReq.setRequestHeader("X-Authentication-Token", token);
				oReq.send();
				oReq.onload = function(){
					if(oReq.status < 400) {
						gMe = JSON.parse(oReq.response);
						if (gMe.users) {
							window.localStorage.setItem("gMe",JSON.stringify(gMe));
							addUser(gMe.users);
							return true;
						}
					}			
				}
			});
			return true;
		}
	}

	var oReq = new XMLHttpRequest();
	if(token){
		oReq.open("get", gConfig.serverURL +"users/whoami", false);
		oReq.setRequestHeader("X-Authentication-Token", token);
		oReq.send();
		if(oReq.status < 400) {
			gMe = JSON.parse(oReq.response);
			if (gMe.users) {
				window.localStorage.setItem("gMe",JSON.stringify(gMe));
				addUser(gMe.users);
				return true;
			}
		}
	}
	if (check !== true ){
		var nodeAuth = document.createElement("div");
		nodeAuth.className = "nodeAuth";
		nodeAuth.innerHTML = "<div id=auth-msg style='color:red;'>&nbsp;</div><form action='javascript:' onsubmit=getauth(this)><table><tr><td>Username</td><td><input name='username' id=a-user type='text'></td></tr><tr><td>Password</td><td><input name='password' id=a-pass type='password'></td></tr><tr><td><input type='submit' value='Log in'></td></tr></table></form>";
		document.getElementsByTagName("body")[0].appendChild(nodeAuth);
	}
	return false;

}
function getauth(oFormElement){
	var oReq = new XMLHttpRequest();
	oReq.onload = function(){
		if(this.status < 400){	
			window.localStorage.setItem("token", JSON.parse(this.response).authToken);
			document.getElementsByTagName("body")[0].removeChild(document.getElementsByClassName("nodeAuth")[0]);
		//	initDoc();

			location.reload();
		}else document.getElementById('auth-msg').innerHTML = JSON.parse(this.response).err;
	};
	oReq.open("post", gConfig.serverURL +"session", true);
	oReq.setRequestHeader("X-Authentication-Token", null);
	oReq.setRequestHeader("Content-type","application/x-www-form-urlencoded");
	oReq.send("username="+document.getElementById('a-user').value+"&password="+document.getElementById('a-pass').value);
}
function logout(){
	matrix.logout();
	window.localStorage.removeItem("gMe");
	window.localStorage.removeItem("token");
	location.reload();
}
function ctrlPriv(){
	if(typeof gMe === 'undefined') return;
	var nodePCtrl = document.body.appendChild(gNodes['private-control'].cloneAll());
	if (typeof matrix.password === 'undefined') return;
	nodePCtrl.cNodes['priv-login'].cNodes["priv-pass"].hidden = true;
	var bLogin = nodePCtrl.cNodes['priv-login'].cNodes["priv-pass-submit"];
	bLogin.innerHTML = 'logout';
	bLogin.removeEventListener('click', ctrlPrivLogin);
	bLogin.addEventListener('click', ctrlPrivLogout);
	loadPrivs();
}

function ctrlPrivLogin(e){
	var inpPass = e.target.parentNode.cNodes['priv-pass'].cNodes['priv-pass-i'];
	if (inpPass.value == ''){
		alert('Must have a password');
		return;
	}
	matrix.username = gMe.users.username;
	matrix.setPassword(inpPass.value);
	matrix.getUserPriv().then(
	function(){
		inpPass.parentNode.hidden= true;
		e.target.innerHTML = 'logout';
		e.target.removeEventListener('click', ctrlPrivLogin);
		e.target.addEventListener('click', ctrlPrivLogout);
		privRegenGrps();
	}
	, function(wut){
		switch(wut){
		case -1:
			e.target.parentNode.parentNode.cNodes['priv-info'].innerHTML = "Incorrect password";
			break;
		case 404:
			matrix.register().then( privRegenGrps, 
				function(){new Error("Failed to register on the key sever.");});
			e.target.dispatchEvent(new Event('click'));
			break;
		default:
			e.target.parentNode.parentNode.cNodes['priv-info'].innerHTML = "Got error#"+wut+"<br/>Try again later";
		
		}
	});
}
function ctrlPrivLogout(e){
	matrix.logout();
	var inpPass = e.target.parentNode.cNodes['priv-pass'].cNodes['priv-pass-i'];
	inpPass.value = '';
	var nodePCtrl = document.getElementsByClassName("private-control")[0];
	nodePCtrl.login = false;
	var nodeGrps = document.createElement('div');
	nodeGrps.className = "priv-groups";
	nodePCtrl.replaceChild( nodeGrps, nodePCtrl.cNodes["priv-groups"]);	
	nodePCtrl.cNodes["priv-groups"] = nodeGrps;
	inpPass.parentNode.hidden = false;
	e.target.innerHTML = 'login';
	e.target.removeEventListener('click',ctrlPrivLogout );
	e.target.addEventListener('click', ctrlPrivLogin);
	nodePCtrl.getElementsByClassName("priv-leave-submit")[0].disabled = true;
	var buttons = nodePCtrl.getElementsByClassName("priv-submit");
	for (var idx = 0; idx < buttons.length; idx++)buttons[idx].disabled = true;
	privRegenGrps();
}
function loadPrivs(){
	var nodePCtrl = document.getElementsByClassName("private-control")[0];	
	nodePCtrl.login = true;
	var nodeGrps = nodePCtrl.cNodes["priv-groups"];
	if(typeof matrix.gSymKeys !== 'undefined'){
		for(var id in matrix.gSymKeys){
			var nodeGrp = gNodes['priv-grp'].cloneAll(true);
			nodeGrp.cNodes["priv-grp-name"].innerHTML = StringView.makeFromBase64(matrix.gSymKeys[id].name);
			nodeGrp.id = id;
			nodeGrps.appendChild(nodeGrp);
		}
		nodePCtrl.getElementsByClassName("priv-leave-submit")[0].disabled = false;
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
	if (typeof victim.id === 'undefined') return;
	delete matrix.gSymKeys[victim.id];
	matrix.update();
	victim.parentNode.removeChild(victim);
	privRegenGrps();
}
function privRegenGrps(){
	var nodePCtrl = document.getElementsByClassName("private-control")[0];
	var nodeGrps = document.createElement('div');
	nodeGrps.className = "priv-groups";
	nodePCtrl.replaceChild( nodeGrps, nodePCtrl.cNodes["priv-groups"]);	
	nodePCtrl.cNodes["priv-groups"] = nodeGrps;
	loadPrivs();
	gConfig.regenPostTo();

}
function privActivateButton(e){
	if (!document.getElementsByClassName("private-control")[0].login)return;
	if (e.target.value == '' ) e.target.parentNode.cNodes['priv-submit'].disabled = true;
	else e.target.parentNode.cNodes['priv-submit'].disabled = false;
}
function ctrlPrivShare(e){
	var privGrps = document.getElementsByName("privGrp");	
	var id;
	for (var idx = 0; idx < privGrps.length; idx++){
		if (privGrps[idx].checked){
			if (typeof privGrps[idx].parentNode.id === 'undefined') return;
			id = privGrps[idx].parentNode.id; 	
			break;
		}
	}
	matrix.genMsg(e.target.parentNode.cNodes["priv-inv-name"].value, JSON.stringify(matrix.gSymKeys[id])).then(function(msg){
		e.target.parentNode.parentNode.cNodes["priv-join"].cNodes["priv-key-input"].value = msg;
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
	});
}
function ctrlPrivGen(e){
	var name = e.target.parentNode.cNodes["priv-c-name"].value;
	matrix.initPrivate(name).then( privRegenGrps);

}
function me(e){
	e.target.href = gConfig.front+gMe['users']['username'];
}

function home(e){
    e.target.href = gConfig.front;
}

function my(e){
    e.target.href = gConfig.front+ 'filter/discussions';
    //window.location.href =gConfig.front+ 'filter/discussions';
}
function ctrlPrivClose(e){
	var victim = e.target; do victim = victim.parentNode; while(victim.className != 'private-control');
	document.body.removeChild(victim);

}
function genPostTo(victim){
	victim.feeds = new Array();
	victim.feeds.push(gMe.users.username);
	victim.parentNode.isPrivate  = false;
	victim.cNodes["new-post-feeds"].firstChild.idx = 1;
	victim.cNodes["new-post-feeds"].firstChild.oValue = gMe.users.username;
	var option = document.createElement('option');
	option.selected = true;
	var select = document.createElement('select');
	select.className = "new-post-feed-select";
	select.hidden = victim.cNodes["new-post-feed-select"].hidden;
	select.addEventListener("change",newPostSelect);
	victim.replaceChild(select, victim.cNodes["new-post-feed-select"]);
	victim.cNodes["new-post-feed-select"] = select;
	victim.cNodes["new-post-feed-select"].appendChild(option);
	option = document.createElement('option');
	option.disabled = true;
	option.innerHTML = "My feed";
	option.value = gMe.users.username;
	victim.cNodes["new-post-feed-select"].appendChild(option);
	var groups = document.createElement('optgroup');
	groups.label = 'Public groups';
	gMe.subscribers.forEach(function(sub){
		if(sub.type == "group"){
			option = document.createElement('option');
			option.value = sub.username;
			option.innerHTML = sub.screenName;
			groups.appendChild(option);
		}
	
	});
	if (groups.childNodes.length > 0 )
		victim.cNodes["new-post-feed-select"].appendChild(groups);
	groups = document.createElement('optgroup');
	groups.label = 'Private groups';
	for (var id in matrix.gSymKeys){
		option = document.createElement('option');
		option.value = id;
		option.privateFeed = true;
		option.innerHTML = StringView.makeFromBase64(matrix.gSymKeys[id].name);
		groups.appendChild(option);
	}
	if (groups.childNodes.length > 0 )
		victim.cNodes["new-post-feed-select"].appendChild(groups);
	
	gConfig.regenPostTo = function (){return genPostTo(victim);};

}
function newPostRemoveFeed(e){
	var nodeP = e.target.parentNode.parentNode;
	nodeP.cNodes['new-post-feed-select'][e.target.idx].disabled = false;
	for(var idx = 0; idx < nodeP.feeds.length; idx++){
		if(nodeP.feeds[idx] == e.target.oValue){
			nodeP.feeds.splice(idx,1);
			break;
		}
	}
	e.target.parentNode.removeChild(e.target);
	if(nodeP.feeds.length == 0)
		nodeP.parentNode.cNodes['edit-buttons'].cNodes['edit-buttons-post'].disabled = true;
}
function newPostAddFeed(e){
	e.target.parentNode.cNodes['new-post-feed-select'].hidden = false;
}

function newPostSelect(e){
	var option = e.target[e.target.selectedIndex];
	if (option.value == '')return;
	var nodeP = e.target.parentNode;
	if (option.privateFeed ){
		nodeP.isPrivate  = true;
		var ul = document.createElement('ul');
		ul.className = 'new-post-feeds';
		nodeP.replaceChild(ul, nodeP.cNodes['new-post-feeds']);
		nodeP.cNodes['new-post-feeds'] = ul;
		nodeP.feeds = new Array();
		for(var idx = 0; idx < e.target.length; idx++)
			e.target[idx].disabled = false;
	}
	option.disabled = true;
	nodeP.feeds.push(option.value);
	var li = document.createElement('li');
	li.innerHTML = option.innerHTML;
	li.className = "new-post-feed";
	li.oValue = option.value;
	li.idx = e.target.selectedIndex;
	li.addEventListener("click",newPostRemoveFeed);
	nodeP.cNodes['new-post-feeds'].appendChild(li);
	nodeP.parentNode.cNodes['edit-buttons'].cNodes['edit-buttons-post'].disabled = false;
}
function frfAutolinker( autolinker,match ){
	if (match.getType() == "twitter")
	 return "<a href=" + gConfig.front+match.getTwitterHandle()+">@" +match.getTwitterHandle( ) + '</a>' ;
	 else return true;
}
function initDoc(){

	var locationPath = (document.location.origin + document.location.pathname).slice(gConfig.front.length);
	var locationSearch = document.location.search;
	if (locationPath == "")locationPath = 'home';
	if (locationSearch == '')locationSearch = '?offset=0';
	gConfig.cSkip = locationSearch.split("&")[0].split("=")[1]*1;
	var arrLocationPath = locationPath.split("/");
	gConfig.timeline = arrLocationPath[0];
	genNodes(templates.nodes).forEach( function(node){ gNodes[node.className] = node; });
	switch(gConfig.timeline){
	case 'home':
	case 'filter':
		if(!auth()) return;
		break;
	default:
		if(!auth(true)) gMe = undefined;
	}
	var oReq = new XMLHttpRequest();
	oReq.onload = function(){
		if(oReq.status < 400) draw(JSON.parse(this.response));
		else{
			if (oReq.status==401)
				{
					localStorage.removeItem('token');
					localStorage.removeItem('gMe');
					location.reload();
				}
			var nodeError = document.createElement('div');
			nodeError.className = 'error-node';
			nodeError.innerHTML = oReq.statusText;
			document.getElementsByTagName("body")[0].appendChild(nodeError);
		}

	};
	if(arrLocationPath.length > 1){
		if (locationPath == "filter/discussions") {
			gConfig.timeline = locationPath;
			gConfig.xhrurl = gConfig.serverURL + "timelines/filter/discussions";
		} else{		
			gConfig.xhrurl = gConfig.serverURL +"posts/"+arrLocationPath[1];
			locationSearch = "?maxComments=all";
		}
	} else 
		gConfig.xhrurl = gConfig.serverURL + "timelines/"+locationPath;
	
	oReq.open("get",gConfig.xhrurl+locationSearch,true);
	oReq.setRequestHeader("X-Authentication-Token", window.localStorage.getItem("token"));
	oReq.send();
}
