"use strict";
define(["./utils", "./freefeed_rt"],function(utils, RtUpdate ){

return function(config){
	function get(token, url){
		return 	utils.xhr( {"url":config.serverURL +url ,"token":token });
	}
	function get2(token, url){
		return 	utils.xhr( {"url":config.serverURLV2 +url ,"token":token });
	}
	return{
		"name": "FreeFeed"
		,"protocol":{
			"get": get
			,"getTimeline": function(token, timeline, skip, mode) {
				if (timeline == "filter/best_of") return get2( token 
					,"bestof" + "?offset="+skip
				);
				if (timeline == "filter/everything") return get2( token 
					,"everything" + "?offset="+skip
				);
				if (timeline == "home"){
					var modeQ = "";
					if(typeof mode == "string" )
						modeQ = "?homefeed-mode="+ mode;  
					return get2( token 
						,"timelines/home" + "?offset="+skip + modeQ
					);
				}
				return get2( token 
					,"timelines/"+ timeline + "?offset="+skip
				);
			}
			,"getSearch": function(token, search, skip) {
				return get2( token 
					,"search?qs=" + search + "&offset="+skip
				).then(function(res){
					res = JSON.parse(res);
					res.timelines = {"id":search};
					return res;
				});
			}
			,"getNotifications": function(token, search, skip) {
				return get2( token 
					,"notifications?offset="+skip+(search?("&"+search):"")
				).then(function(res){
					utils.xhr({
						"url": config.serverURLV2
							+"users/markAllNotificationsAsRead"
						,"method":"post"
						,"token": token 
						,"headers":{"Content-type":"application/json"}
					});
					return res;
				});
			}
			,"getSummary": function(token,source,interval){
				var address = "summary/" +(source?source+"/":"") +interval;
				return get2(token ,address);
;
			}
			,"getMemories": function(token,source,interval, skip){
				var address = "timelines/" + source 
					+"/?created-before="+interval.toISOString()
					+"&sort=created"
					+"&offset="+skip;
				return get2(token ,address);
;
			}
			,"getPost": function(token, path, arrOptions) {
				var id = path.split("/")[1];
				var likes = "0";
				var cmts = "0";
				if(Array.isArray(arrOptions))arrOptions.forEach(function(option){
					switch(option){
					case "likes":
						likes = "all";
						break;
					case "comments":
						cmts = "all";
					}
				});
				var suffix = "?maxComments=" + cmts + "&maxLikes=" + likes;
				return get2(token, "posts/"+ id + suffix);
			}
			,"sendPost": function(token, postdata){
				return utils.xhr(
					{ 	"url": config.serverURL + "posts"
						,"token": token 
						,"method": "post"
						,"data": JSON.stringify(postdata)
						,"headers":{"Content-type":"application/json"}
					}
				);
			}
			,"editPost": function(token, id, postdata){
				return utils.xhr(
					{ 	"url": config.serverURL + "posts/"+id
						,"token": token 
						,"method": "put"
						,"data": JSON.stringify(postdata)
						,"headers":{"Content-type":"application/json"}
					}
				);
			}
			,"deletePost": function(token, id){
				return utils.xhr(
					{ 	"url": config.serverURL + "posts/"+id
						,"token": token 
						,"method": "delete"
					}
				);
			}
			,"switchCmts": function(token, id, action){
				return utils.xhr(
					{	"url":config.serverURL 
							+"posts/" + id 
							+ (action?"/disableComments":"/enableComments")
						,"token":token
						,"method":"post"
					}
				);	
			}
			,"sendHide": function(token, id, action){
				return utils.xhr(
					{ 	"url": config.serverURL 
							+ "posts/" + id + "/" 
							+ (action?"hide":"unhide")
						,"token": token 
						,"method": "post"
					}
				);
			}
			,"getUser": function(token, req) {return get(token, "users/" + req );}
			,"getSubs": function(token, req) {return get(token, "users/" + req );}
			,"doBan": function(token, username, action){
				return utils.xhr(
					{ 	"url": config.serverURL 
							+ "users/" + username + "/" 
							+ (action?"ban":"unban")
						,"token": token 
						,"method": "post"
					}
				);
			}
			,"get": function(token, timeline) {return get(token, timeline);}
			,"updProfile" : function(token, id, data){
				return utils.xhr(
					{ 	"url": config.serverURL + "users/" + id
						,"token": token 
						,"method": "put"
						,"data": JSON.stringify(data)
						,"headers":{"Content-type":"application/json"}
					}
				);
			}
			,"chngAvatar": function (token, file){
				var data = new FormData();
				data.append( "file",file) ;
				return utils.xhr(
					{ 	"url": config.serverURL + "users/updateProfilePicture"
						,"token": token 
						,"method": "post"
						,"data": data
					}
				);
			}
			,"_getWhoami": function(token){
				var whoami = get2( token ,"users/whoami");
				var groupReqs =  get2( token ,"managedGroups" );
				return utils._Promise.all([whoami,groupReqs])
				.then(function(res){
					var whoami = JSON.parse(res[0]);
					if (!Array.isArray(whoami.requests))
						whoami.requests = new Array();
					 if (!Array.isArray(whoami.users.subscriptionRequests))
						whoami.users.subscriptionRequests = new Array();
					whoami.requests.forEach(function(req){
						req.type = "user";
						if (whoami.users.subscriptionRequests.indexOf(req.id ) != -1){
							req.dest = whoami.users.id;
							req.src = req.id;
						} else {
							req.dest = req.id;
							req.src = whoami.users.id;
						}
					});
					var grps = JSON.parse(res[1]);
					var grpReqs = new Array();
					grps.forEach(function(grp){
						grp.requests.forEach(function(req){
							req.type = "group";
							req.dest = grp.id;
							res.src = req.id;
							grpReqs.push(req);
							whoami.users.subscriptionRequests.push(grp.id);
						});
					
					});
					whoami.requests = whoami.requests.concat(grpReqs); 
					return whoami;
				
				});
			}
			,"login":function(username, password){
				var data = "username="+utils.encodeURIForm(username)
				+ "&password="+utils.encodeURIForm(password);
				return utils.xhr(
					{ 	"url": config.serverURL + "session"
						,"headers":{"Content-type":"application/x-www-form-urlencoded"}
						,"method": "post"
						,"data":data
					}
				);
			}
			,"sendLike": function(token, id, action){
				return utils.xhr(
					{ 	"url": config.serverURL 
							+ "posts/" + id + "/" 
							+ (action?"like":"unlike")  
						,"token": token 
						,"method": "post"
					}
				);
			}
			,"sendComment": function(token, postdata){
				return utils.xhr(
					{ 	"url": config.serverURL + "comments"
						,"token": token 
						,"method": "post"
						,"data": JSON.stringify(postdata)
						,"headers":{"Content-type":"application/json"}
					}
				);
			}
			,"editComment": function(token, id, postdata){
				return utils.xhr(
					{ 	"url": config.serverURL + "comments/"+id
						,"token": token 
						,"method": "put"
						,"data": JSON.stringify(postdata)
						,"headers":{"Content-type":"application/json"}
					}
				);
			}
			,"deleteComment": function(token, id){
				return utils.xhr(
					{ 	"url": config.serverURL + "comments/"+id
						,"token": token 
						,"method": "delete"
					}
				);
			}
			,"reqSub": function(token,username ){
				return utils.xhr(
					{ 	"url": config.serverURL 
							+ "users/" + username 
							+ "/sendRequest/" 
						,"token": token 
						,"method": "post"
					}
				);
			}
			,"evtSub": function(token,username, subscribed ){
				return utils.xhr(
					{ 	"url": config.serverURL 
							+ "users/" + username 
							+ (subscribed?"/unsubscribe":"/subscribe") 
						,"token": token 
						,"method": "post"
					}
				);
			}
			,"reqResp": function(token, user, action, reqid, type, dest){
				var req = (type == "user"? [type + "s", action, user]
					:[type + "s", dest, action, user]
				).join("/");
				return utils.xhr(
					{ 	"url": config.serverURL + req
						,"token": token 
						,"method": "post"
					}
				);
			}
			,"sendAttachment": function(token,file, filename){
				var data = new FormData();
				data.append( "name", "attachment[file]");
				data.append( "attachment[file]",file, filename);
				return utils.xhr(
					{ 	"url": config.serverURL + "attachments"
						,"token": token 
						,"method": "post"
						,"data": data
					}
				);
			}
			,"resetDirectsCount":function(token){
				return get2( token ,"users/markAllDirectsAsRead");
			}
		}
		,"parse":function (res){
			return (typeof res == "string")?JSON.parse(res):res;
		}
		,"oRT":RtUpdate
	};
};
});
