"use strict";
define(["./utils","./mokum_rt"],function(utils, RtUpdate){
//utils._Promise = Promise;
return function(config){
	function unsupported(){return utils._Promise.resolve({});}
	function get(token, url, pagenum){
		var skip =((typeof pagenum !== "undefined")&& (pagenum != 1)) ?("?page=" + pagenum):"";
		return 	utils.xhr( {
				"url":config.serverURL +url+".json" + skip
				,"headers":{"X-API-Token":token}
			}
		);
	}
	function getAPI(token, req){
		return utils.xhr( 
			{ 	"url":config.serverApiURL + req+".json" 
				,"headers":{"X-API-Token":token}
			}
		)
	}
	function getUser(token, req) {
		return getAPI(token, "users/" + req )
		.then(function(res){
			res = JSON.parse(res);
			res.type = "user";
			return res
		} ,function (){
			return  getAPI(token, "groups/"+req)
			.then(function(res){
				res = JSON.parse(res);
				res.type = "group";
				res.id = "groups/" + res.id;
				return res
			});
		});
	}
	function getAllSubs(token, username){
		return utils._Promise.all([
			get(token, username+"/subscribers")
			,get(token, username+"/subscriptions")
		]);
	}
	function getWhoami(token){
		var pUser = getAPI(token, "whoami").then(function(res){
			return JSON.parse(res); 
		});
		var pSubs = pUser.then(function(whoami){
			return getAllSubs(token, whoami.user.name);
		});
		var pReqs = getAPI(token, "subscription_requests");

		return utils._Promise.all([pUser, pSubs, pReqs]).then(function(res){
			var whoami = res[0];
			var subs = res[1].map(JSON.parse);
			var subscriptions = subs[1].subscriptions.map(function(sub_id){
				var sub = subs[1].users[sub_id];
				sub.type = "user";
				sub.id =  sub.id.toString();
				return sub;
			}).concat(subs[1].group_subscriptions.map(function(sub_id){
				var sub = subs[1].groups[sub_id];
				sub.type = "group";
				sub.id = "groups/" + sub.id;
				return sub;
			}));

			whoami.user.subscribers = subs[0].subscribers.map(function(sub_id){
				var sub = subs[0].users[sub_id];
				sub.id = sub.id.toString();
				return sub;
			});
			whoami.subscribers = whoami.user.subscribers.concat(subscriptions);
			whoami.subscriptions = subscriptions.map(function(sub){
				return {"name": "Posts"
					,"id": "posts-"+sub.id
					,"user": sub.id.toString()
				};
			});
			whoami.user.subscriptions = subscriptions.map(function(sub){return "posts-"+sub.id;});
			whoami.user.banIds = subs[0].banned_subscribers;
			whoami.user.unreadDirectsNumber = 0;
			whoami.requests = new Array();
			whoami.user.subscriptionRequests = new Array();
			var subscription_requests = JSON.parse(res[2]).subscription_requests;
			subscription_requests.forEach(function(req){
				whoami.user.subscriptionRequests.push({
					"src":req.request.user_id.toString()
					,"id":req.request.uuid
					,"type":req.request.what
					,"dest":req.request.their_id
				});
				whoami.requests.push(req.from_user);
			});
			return whoami;
		});
	}
	return{
		"name": "Mokum"
		,"protocol":{
			"get": get
			,"getSubs": function (token, userlist) {
				return get(token, userlist).then(function(res){
					res = JSON.parse(res);
					var subscribers = new Array(); 
					var subscriptions = new Array();
					if (typeof  res.subscriptions !== "undefined" )
						subscriptions = res.subscriptions.map(function(sub){
							sub = res.users[sub];
							sub.type = "user";
							sub.id =  sub.id.toString();
							return sub;
						}).concat(res.group_subscriptions.map(function(sub){
							sub = res.groups[sub];
							sub.type = "group";
							sub.id = "groups/" + sub.id;
							return sub;
						}));

					if (typeof  res.subscribers!== "undefined" )
						subscribers = res.subscribers.map(function(sub){
							sub = res.users[sub];
							sub.id = sub.id.toString();
							return sub;
						});
					res.subscribers = subscribers.concat(subscriptions);
					res.subscriptions = subscriptions.map(function(sub){
						return {"name": "Posts"
							,"id": "posts-"+sub.id
							,"user": sub.id.toString()
						};
					});

					return res;
				});
			}
			,"getTimeline": function(token, timeline, skip) {
				var len = timeline.length;
				if(timeline.charAt(len - 1) == "/")timeline = timeline.slice(0,-1);
				if (timeline == "home")timeline = "index";
				return get(token, timeline, Math.ceil(skip/gConfig.offset)+1)
				.then(function(res){
					res = JSON.parse(res);
					if( res.entries.length 
						|| Object.keys(res.users).some(isThere, res.users)
						|| Object.keys(res.groups).some(isThere, res.groups)
						|| (timeline.slice(0,6) == "filter")
					) return res;
					return getUser(token, timeline)
					.then( function (user){
						if(typeof user === "string")user = JSON.parse(user);
						if(typeof res.users === "undefined") 
							res.users = new Object();
						res.users[user.id] = user;
						return res; 
					});
					function isThere(id){return this[id].username == timeline ;}
				}); 
			}
			,"getPost": function(token, path, arrOptions) {
				var likes = false;
				var cmts = "0";
				if(Array.isArray(arrOptions))arrOptions.forEach(function(option){
					switch(option){
					case "likes":
						likes = true;
						break;
					case "comments":
						cmts = "all";
					}
				});
				return (!likes? get(token, path).then(JSON.parse)
					:utils._Promise.all([
						get(token, path)
						,get(token,path+"/likes")
					]).then(function(res){
						data = JSON.parse(res[0]);
						likes = JSON.parse(res[1]);
						data.entries[0].likes = likes.likes;
						Object.keys(likes.users).forEach(function(id){
							data.users[id] = likes.users[id] 
						});
						return data;
					})
				).then(function(data){
					data.entries = data.entries[0];
					return data;
				});
			}
			,"getSummary": unsupported
			,"getMemories": unsupported
			,"getSearch": function (token, search, skip){
				var pagenum = Math.ceil(skip/gConfig.offset)+1
				skip =((typeof pagenum !== "undefined")&& (pagenum != 1)) ?("&page=" + pagenum):"";
				return 	utils.xhr( {
						"url":config.serverURL + "s.json?q=" + search + skip
						,"headers":{"X-API-Token":token}
					}
				);
			}
			,"getNotifications": unsupported
			,"sendPost": function(token, postdata, sender, type, timelineId){
				var atts =  Array.isArray(postdata.post.attachments)?
					postdata.post.attachments.map(Number)
					: new Array();
				var post = {
					"timelines": new Array()
					,"text": postdata.post.body
					,"comments_disabled":0
					,"attachment_ids":atts
				}; 
				var dests = postdata.meta.feeds;
				var myIdx = dests.indexOf(sender);
				if(myIdx != -1 ){
					post.timelines.push("user");
					dests.splice(myIdx,1);
				}
				var prefix = "group:";
				if(type == "directs") prefix = "direct:";
				dests.forEach(function(dest){ post.timelines.push(prefix+dest); });
				var data  = JSON.stringify({"post": post});
				return utils.xhr(
					{ 	"url": config.serverApiURL + "posts.json"
						,"method": "post"
						,"data": data
						,"headers":{"X-API-Token":token
							,"Content-Type": "application/json"
							,"Accept": "application/json, text/javascript, ?/?; q=0.01" 
							,"X-River-Signature":timelineId
						}
					}
				).then(function(res){
					return JSON.parse(res).entries[timelineId];
				});
			}
			,"editPost": function(token, id, postdata){
				var data = JSON.stringify({"post":{"text":postdata.post.body }});
				return utils.xhr(
					{ 	"url": config.serverApiURL + "posts/"+id+".json"
						,"method": "PATCH"
						,"data": data
						,"headers":{"X-API-Token":token
							,"Content-Type": "application/json"
						}
					}
				).then(function(inp){return {"entries":JSON.parse(inp)};});
			}
			,"deletePost": function(token, id){
				return utils.xhr(
					{ 	"url": config.serverApiURL + "posts/"+id+".json"
						,"headers":{"X-API-Token":token}
						,"method": "DELETE"
					}
				);
			}
			,"switchCmts": function(token, id, action){
				var data = JSON.stringify({"post":{"comments_disable":action?1:0}});
				return utils.xhr(
					{	"url":config.serverApiURL +"posts/" + id + ".json"
						,"headers":{"X-API-Token":token
							,"Content-Type": "application/json"
						}
						,"method": "PATCH"
						,"data":data
					}
				);	
			}
			,"sendHide": function(token, id, action){
				return utils.xhr(
					{ 	"url": config.serverApiURL 
							+ "posts/" 
							+ id 
							+ "/hide.json"
						,"headers":{"X-API-Token":token
							,"Content-Type": "application/json"	
						}
						,"method": action?"post":"DELETE"
					}
				);
			}
			,"getUser": getUser 
			,"doBan": function(token, username, action){
				return utils.xhr(
					{ 	"url": config.serverApiURL 
							+ "users/" 
							+ username 
							+ "/ban.json" 
						,"headers":{"X-API-Token":token
							,"Content-Type": "application/json"	
						}
						,"method": action?"post":"DELETE"
					}
				);
			}
			,"get": get
			,"updProfile" : function(token, id, data){
				var status;
				if(data.user.isPrivate == "1")status = "private";
				else if(data.user.isProtected == "1") status = "protected";
				else status = "public";

				var user = {
					"description":data.user.description
					,"display_name":data.user.screenName
					,"status": status

				};
				var data = JSON.stringify({"user":user});
				return utils.xhr(
					{ 	"url": config.serverApiURL + "users/" + id + ".json"
						,"method": "PATCH"
						,"data": data
						,"headers":{"X-API-Token":token
							,"Content-Type": "application/json"
						}
					}
				);
			}
			,"chngAvatar": function (token, file){
				var data = new FormData();
				data.append( "avatar[avatar]",file) ;
				return utils.xhr(
					{ 	"url": config.serverApiURL + "avatars"
						,"headers":{"X-API-Token":token
							,"Accept": "application/json, text/javascript, ?/?; q=0.01" 
						}
						,"method": "post"
						,"data": data
					}
				).then(function(res){console.log(res)});
			}
			,"_getWhoami":getWhoami
			,"login":function(username, token){
				return new utils._Promise(function(resolve,reject){
					utils.xhr( 
						{ 	"url":config.serverApiURL +"whoami.json" 
							,"headers":{"X-API-Token":token}
						}
					).then(function(strRes){
						var res = JSON.parse(strRes);
						if(res.user.name == username){
							resolve({"authToken":token, "user":res.user});
						}
						else reject({"code":"", "data":"invalid login data"});
					}
					,reject);
				});
			}
			,"sendLike": function(token, id, action){
				return utils.xhr(
					{ 	"url": config.serverApiURL + "posts/" + id + "/likes.json" 
						,"headers":{"X-API-Token":token}
						,"method": action?"post":"DELETE"
					}
				);
			}
			,"sendComment": function(token, postdata){
				var data = JSON.stringify({"comment":{"text":postdata.comment.body}});
				return utils.xhr(
					{ 	"url": config.serverApiURL 
							+ "posts/" 
							+ postdata.comment.postId 
							+ "/comments.json"
						,"headers":{"X-API-Token":token
							,"Content-Type": "application/json"
						}
						,"method": "post"
						,"data": data
					}
				).then(function(res){return {"comments":JSON.parse(res)}});
			}
			,"editComment": function(token, id, postdata, postId){
				var data = JSON.stringify({"comment":{"text":postdata.comment.body}});
				return utils.xhr(
					{ 	"url": config.serverApiURL 
							+ "posts/" 
							+ postId 
							+ "/comments/"+id + ".json"
						,"method": "post"
						,"headers":{"X-API-Token":token
							,"Content-Type": "application/json"
						}
						,"data": data
					}
				).then(function(res){return{"comments":JSON.parse(res)}});
			}
			,"deleteComment": function(token, id, postId){
				return utils.xhr(
					{ 	"url": config.serverApiURL
							+ "posts/" 
							+ postId 
							+ "/comments/"+id + ".json"
						,"headers":{"X-API-Token":token}
						,"method": "DELETE"
					}
				);
			}
			,"reqSub": function(token,username, type ){
				return utils.xhr(
					{ 	"url": [config.serverApiURL, 
							,type
							,"s/"
							,username 
							,"/subscribers.json"].join("")
						,"headers":{"X-API-Token":token}
						,"method": "post"
					}
				);
			}
			,"evtSub": function(token,username, subscribed,type ){
				return utils.xhr(
					{ 	"url": [config.serverApiURL, 
							,type
							,"s/"
							,username 
							,"/subscribers.json"].join("")
						,"headers":{"X-API-Token":token}
						,"method": subscribed?"DELETE":"post"
					}
				).then(function(){return getWhoami(token);});
			}
			,"reqResp": function(token, user, action, id){
				return utils.xhr(
					{ 	"url": config.serverApiURL 
							+ "subscription_requests/"
							+ id
						,"headers":{"X-API-Token":token
							,"Accept": "application/json, text/javascript, ?/?; q=0.01" 
						}
						,"method": (action == "acceptRequest")?"PUT":"DELETE"
					}
				);
			}
			,"sendAttachment": function(token,file, filename){
				var data = new FormData();

				data.append( "X-API-Token", token);
				data.append( "attachment[attachment][]",file, filename);
				return utils.xhr(
					{ 	"url": config.serverApiURL + "attachments.json"
						,"method": "post"
						,"data": data
						,"headers":{"X-API-Token":token
							,"Accept": "application/json, text/javascript, ?/?; q=0.01" 
						}
					}
				).then(function(res){
					var id = JSON.parse(res).attachments[0].id;
					return new utils._Promise(function(resolve,reject){
						var pulling = setInterval(pull,1000);
						function pull(){ 
							utils.xhr({ 	
								"url": config.serverApiURL 
									+ "attachments.json" 
								,"headers":{"X-API-Token":token}
							}).then(function(res){
								res = JSON.parse(res);
								if(res.queued_count == 0){
									clearInterval(pulling);
									resolve({ "attachments":
										res.attachments.find(function(att){
											return att.id == id;
										})
									});
								}
							});
						}
					});
				});
			}
			,"resetDirectsCount":unsupported
		}
		,"parse":function (res){
			var input = (typeof res == "string")?JSON.parse(res):res;
			var aComments = new Array();
			var aAttachments = new Array();
			var subscriptions = new Object();
			var convs = {
				"attachment_file_name":{"out":"fileName","a":"copy"}
				,"attachments":{"out":""
					,"post":function(atts){ 
						return (Array.isArray(atts)?atts:[atts]).map(function(att){
							att.mediaType="image";
							att.imageSizes = {"t": {
								"w":att.thumb_width
								,"h":att.thumb_height
							}};
							aAttachments.push(att); 
							return att.id;
						});
					} 
				}
				,"avatar_url":{"out":"profilePictureMediumUrl","a":"mutate", "f":addHost}
				,"authToken":{"out":"","a":"copy"}
				,"banIds":{"out":"","a":"str"}
				,"can_unhide":{"out":"isHidden","a":"copy"} 
				,"clikes":{"out":"","a":"str"}
				,"clikes_count":{"out":"","a":"copy"}
				,"comments":{"out":"", "post":function(cmts){ 
					if (Array.isArray(cmts))
						return cmts.map(function(cmt){
							aComments.push(cmt); return cmt.id;
						});
					else aComments = cmts;
				} }
				,"comments_count":{"out":"","a":"copy"}
				,"comments_disabled":{"out":"commentsDisabled","a":"copy"}
				,"created_at":{"out":"createdAt","a":"mutate","f":Date.parse,"single":true}
				,"description":{"out":"","a":"copy"}
				,"display_name":{"out":"screenName","a":"copy"}
				//,"embeds":{"out":""}
				,"entries":{"out":"posts", "post":function(posts){
					(Array.isArray(posts)?posts:[posts]).forEach(function(post){
						if ( Array.isArray(post.comments))
							post.omittedComments = 
								post.comments_count 
								- post.comments.length;
					});
					return posts;
				}} 
				,"fresh_at":{"out":"updatedAt","a":"mutate","f":Date.parse},"single":true
				,"groups":{"out":"users", "pre":function(groups){
						return Object.keys(groups).map(function(groupid){
							var group = groups[groupid];
							group.id = "groups/" + groupid;
							group.type = "group";
							return group;
						});
					}
				}
				,"id":{"out":"","a":"str"}//"a":"mutate","f":function(id){return id.toString();}
				,"is_direct":{"out":"isDirect", "a":"copy"}
				,"is_public":{"out":"isPrivate","a":"mutate","f":function(fPub){ return fPub?"0":"1"; }}
				,"likes":{"out":"","a":"str"}
				,"more_likes":{"out":"omittedLikes","a":"copy"}
				,"name":{"out":"username","a":"copy"}
				,"original_url":{"out":"url","a":"mutate", "f":addHost}
				//,"post_id":{"out":"","a":"copy"}
				,"published_at":{"out":"createdAt","a":"mutate","f":Date.parse,"single":true}
				,"post":{"out":"posts", "post":function(posts){
						(Array.isArray(posts)?posts:[posts]).forEach(function(post){
							if ( Array.isArray(post.comments))
								post.omittedComments = 
									post.comments_count 
									- post.comments.length;
						});
						return posts;
					}
	
				}
				,"requests":{"out":"", "post":postUser}
				,"river":{"out":"timelines","a":"mutate", "f":function(t){
					t.id = t.uuid;
					return t;
				}}
				,"reason":{"out":"postedTo" ,"a":"mutate","f":function(val){
					var feeds = new Array();
					Object.keys(val).forEach(function(key){
						switch(key){
						case "user_directs_received":
						//case "user_directs_sent":
						case "user":
							val[key].forEach(function(id){
								feeds.push(addFeed(id,false));
							});
							break;
						case "group":
							val[key].forEach(function(id){
								feeds.push(addFeed("groups/"+id,false));
							});
							break;
						case "user_private":
							val[key].forEach(function(id){
								feeds.push(addFeed(id,true));
							});
							break;
						default:
						}
					});
					
					return feeds;
				}}
				,"status":{"out":"","a":"split","f":function(val){
					switch( val){
					case "protected":
						return ["isProtected", "1"];
					case "private":
						return ["isPrivate", "1"];
					default:
						return ["isPrivate", "0"];
					}
				}}
				,"subscribers":{"out":""}
				,"subscriptionRequests":{"out":"", "a":"copy"}
				,"subscriptions":{"out":"","a":"copy"}
				,"text":{"out":"body","a":"copy"}
				,"timelines":{"out":"timelines","a":"mutate", "f":function(t){
					t.id = t.uuid;
					return t;
				}}
				,"thumb_url":{"out":"thumbnailUrl","a":"mutate", "f":addHost}
				,"thumb_width":{"out":"","a":"copy"}
				,"thumb_height":{"out":"","a":"copy"}
				,"type":{"out":"","a":"copy"}
				,"unreadDirectsNumber":{"out":"","a":"copy"}
				,"updated_at":{"out":"updatedAt","a":"mutate","f":Date.parse,"single":true}
				,"user_id":{"out":"createdBy","a":"str"}
				,"user":{"out":"users", "post":postUser}
				,"users":{"out":"", "pre":obj2arr, "post":function(users){
						users.forEach(postUser);
						return users;
					}
				}
				,"user_liked":{"out":"","a":"copy"}
				,"uuid":{"out":"","a":"copy"}
			}
			var out = convert(input);
			if((typeof out.subscribers === "undefined")&&Array.isArray(out.users))
				out.subscribers = out.users;
			out["comments"] = aComments;
			out["attachments"] = aAttachments;
			if (typeof out.posts !== "undefined"){
				var posts = Array.isArray(out.posts)?out.posts:[out.posts];
				posts.forEach(function(post){
					if(Array.isArray(post.postedTo)&&(post.postedTo.length == 0)){
						addFeed(post.createdBy,false);
						post.postedTo.push(post.createdBy);
					}
				});
			}
			if (typeof  out.subscriptions === "undefined"){
				out.subscriptions = new Array();
				Object.keys(subscriptions).forEach(function(id){out.subscriptions.push(subscriptions[id])});
			}
			return out;
			function convert(oData){
				var oOut = new Object();
				Object.keys(oData).forEach(function(key){
					var val = oData[key];
				if (typeof val === "undefined")val = [];
					var conv = convs[key];
					var res;
					if(typeof conv !== "undefined"){
						if (typeof conv.pre === "function" )
							val = conv.pre(val);
						if (conv.out == "")conv.out = key;
						switch(conv.a){
						case "copy":
							res = val;
							break;
						case "str":
							res = Array.isArray(val)?
								val.map(function(el){ return el.toString();})
								:val.toString();
							break;
						case "mutate":
							res = conv.f(val);
							break;
						case "split":
							var out = conv.f(val);
							conv.out = out[0];
							res = out[1];
							break;
						default: 
							res = Array.isArray(val)?val.map(convert):convert(val);
						}
						if (typeof conv.post === "function" ) res = conv.post(res);
						if((typeof oOut[conv.out] === "undefined")||(conv.single === true) )
							oOut[conv.out] = res;
						else if((typeof res === "object" )&& res && !Object.keys(res).length)
							return;
						else if(Array.isArray(res))
							oOut[conv.out] = res.concat(oOut[conv.out]);
						else oOut[conv.out] = [res].concat(oOut[conv.out]);
					}
				});
				return oOut;
			}
			function addFeed(id, priv){
				var subid = priv?id+"-private":id;
				subscriptions[subid] = {
					"id":subid
					,"name":"Posts"
					,"user":id
					,"mayNotBePublic": priv
				};
				return subid;
			}
			function obj2arr(obj){
				return Object.keys(obj).map(function(key){
					return obj[key];
				});
			}
			function addHost(url){
				if(url.search(/(https?:)?\/\//) == 0)return url;
				return "//mokum.place" + url;
			}
			function wwwFormData(key,val){
				return utils.encodeURIForm(key) + "=" + utils.encodeURIForm(val);
			}
			function postUser(user){
				if(typeof user.type === "undefined")
					user.type = "user";
				return user;
			}

		}
		,"oRT":RtUpdate
	};
};
});
