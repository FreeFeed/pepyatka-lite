"use strict";

var vote2020 = require("./vote2020.js");
define("./addons/sidebar", [],function(){
function isLogged (cView){
	var domains = Object.keys(cView.contexts);
	return domains.some(function(domain){
		return cView.contexts[domain].token;
	});
}
function always(){return true;};
function genLinks (cView, a, head,tail){
	var linkHead = (typeof head !== "undefined")?head:"";
	var linkTail = (typeof tail !== "undefined")?tail:"";
	var div = cView.doc.createElement("div");
	var ahref = cView.doc.createElement("a");
	ahref.href = linkHead +a[0]+linkTail;
	ahref.innerHTML = a[1];
	div.appendChild(ahref);
	return div;
}

function populateSidebar(cView, nodeSidebar, elements){
	elements.forEach(function(elmt){
		if(!elmt.test(cView))return;
		var node = cView.gNodes["sidebar-emt"].cloneAll();
		if (typeof elmt.title === "function" ) 
			node.cNodes["sb-emt-title"].innerHTML = elmt.title(cView);
		else node.cNodes["sb-emt-title"].innerHTML = elmt.title;
		elmt.content(cView).forEach(node.cNodes["sb-emt-content"].appendChild, node.cNodes["sb-emt-content"]);
		nodeSidebar.appendChild(node);
	});
}
var payload = [
	{"title":"Account"
		,"content":function(cView){
			if(!isLogged(cView)) return [cView.gNodes["sidebar-acc-anon"].cloneAll()]; 
			var domains = Object.keys(cView.contexts);
			var nodeMainAcc = cView.gNodes["sidebar-acc"].cloneAll();
			var mainContext;
			if(( typeof cView.contexts[gConfig.leadDomain] !== "undefined" )
			&& cView.contexts[gConfig.leadDomain].token) 
				mainContext = cView.contexts[gConfig.leadDomain];
			else domains.some(function(domain){
				var context = cView.contexts[domain];
				if(!context.token) return false;
				 mainContext = context;
				return true; 
			});
			mainContext.p.then(function(){
				var mainLogin = mainContext.gMe.users;
				nodeMainAcc.getNode(["c", "main-avatar"],["c","img"]).src = mainLogin.profilePictureMediumUrl;
				nodeMainAcc.getNode(["c", "info"]).innerHTML = mainLogin.link;
				nodeMainAcc.getNode(["c", "settings"], ["c", "edit-acc"]).href = gConfig.front + "settings/accounts"
			});
			return [nodeMainAcc];
		}
		,"test":always  
	}
		
	,{"title":vote2020.title
		,"content":vote2020.content
		,"test":vote2020.test
	}
	,{"title":"Moon"
		,"content":function(cView){
			var suncalc = require("suncalc");
			var phase = suncalc.getMoonIllumination(Date.now()).phase;
			var nodeImg = cView.doc.createElement("img");
			nodeImg.className = "img-center";
			nodeImg.src = "https://cdn.jsdelivr.net/gh/thelinmichael/lunar-phases@a9e2b76af66b791193a7b770832ecda852d38ffc/images/browser-icons/"
			+Math.round(29*phase)+ ".png"
			return [nodeImg];
			
		}
	
		,"test": function(cView){return JSON.parse(cView.localStorage.getItem("addons-show-moon"));} 
	}
	,{"title":"Search"
		,"content":function(cView){
			var input = cView.gNodes["search-input"].cloneAll();
			input.getElementsByTagName("form")[0].action = gConfig.front+"search";
			var arrSkipDomains = (new Array()).concat(cView.localStorage.getItem("skip_domains"));
			Object.keys(cView.contexts).forEach(function(domain){
				if(arrSkipDomains.indexOf(domain) != -1) return;
				var el = cView.doc.createElement("input");
				el.type = "hidden";
				el.value = domain;
				el.name = "d";
				input.getElementsByClassName("search-domains")[0].appendChild(el);

			});
			var out = [input];
			if(isLogged(cView)){
				var context;

				if(cView.contexts[gConfig.leadDomain].token) 
					context = cView.contexts[gConfig.leadDomain];
				else{
					var domains = Object.keys(cView.contexts);
					domains.some(function(domain){
						if(cView.contexts[domain].token != null){
							context = cView.contexts[domain];
							return true;
						}else return false;
					});
				}

				var vLink = genLinks(cView, ["#","Vanity search"]);
				out.push(vLink);
				context.p.then(function(){
					vLink.getElementsByTagName("a")[0].href = gConfig.front
						+"search?qs="
						+context.gMe.users.username;
				});
			}
			return out.concat( 
				Object.keys(cView.contexts).map(
					function(domain){ 
						return [gConfig.domains[domain].search, domain]; 
					}
				).map(function(url){return genLinks(cView, url);})
				,genLinks(cView,["best_of", "Best of all feeds"],gConfig.front+"filter/") 
			);
		}
		,"test":always  
	
	}
	,{"title":"Filters"
		,"content":function(cView){
			var linkHead = gConfig.front+"filter/";
			var nodes  = [ ["me","My posts"]
				,["discussions","My discussions"]
				,["direct","Direct messages"]
				,["notifications","Notifications"]
				,["everything","Everything"]
			].map(function(a){return genLinks(cView, a,linkHead);});
			nodes.push(genLinks(cView,["summary/1", "Best of the day", gConfig.front]));

			nodes[2].getElementsByTagName("a")[0].classList.add("directs-control");
			nodes[3].getElementsByTagName("a")[0].classList.add("notifications-control");
			cView.Common.regenCounters();
			return nodes;

		}
		,"test":isLogged	
	}
	,{"title":"Help"
		,"content":function(cView){
			var nodeBuild = cView.doc.createElement("div");
			nodeBuild.innerHTML = "<span class=\"sb-info\">"+___BUILD___+"</span>";
			return [ ["https://myfeed.rocks/about", "What's going on?"]
				,[gConfig.front+"as/FreeFeed/vanillaweb", "Feedback"]
				,["https://freefeed.net/about", "FreeFeed"]
				,["https://dev.freefeed.net/w/faq", "FAQ"]
				,["https://myfeed.rocks/about#author", "Author"]
			].map(function(a){
				var div = cView.doc.createElement("div");
				var ahref = cView.doc.createElement("a");
				ahref.href = a[0];
				ahref.innerHTML = a[1];
				div.appendChild(ahref);
				return div;
			}).concat(nodeBuild );
		}	
		,"test":always  
	}
	,{"title":"Groups"
		,"content":function(cView){
			var out = Array.apply(null, {"length":5}).map(function(){
				return cView.doc.createElement("div");
			});
			var div = cView.doc.createElement("div");
			div = cView.doc.createElement("div");
			div.innerHTML = "<span class=\"sb-info\"><a href=\""
				+gConfig.front + "groups\" >All groups</a></span>";
			
			window.addEventListener("newNode",evtNewNode); 
			fill();
			return out.concat(div);
			function evtNewNode(e){
				var arrNodes = e.detail;
				if(!arrNodes)return;
				arrNodes = Array.isArray(arrNodes)?arrNodes:[arrNodes];
				arrNodes.forEach(function(node){
					var post = node.getNode(["p","post"]).rawData;
					var context = cView.contexts[post.domain];
					post.postedTo.forEach(function(feed){
						context.gFeeds[feed].user.updatedAt = Date.now();
					});
				});
				fill();
							
			}
			function fill(){
				var domains = Object.keys(cView.contexts);
				var groups = new Array();
				domains.forEach(function(domain){
					var context = cView.contexts[domain];
					var ids = new Object();
					context.ids.forEach(function(id){
						if (typeof  context.logins[id].data.users.subscriptions === "undefined")
							return;
						var subscriptions = new Object();
						context.logins[id].data.subscriptions.forEach(function(sub){
							subscriptions[sub.id]=sub;
						});
						context.logins[id].data.users.subscriptions.forEach(function(subid){
							var sub = subscriptions[subid];
							var group = context.gUsers[sub.user];
							if( (typeof group !== "undefined")
								&&(group.type == "group") 
								&& (sub.name == "Posts")){
								if(typeof group.updatedAt === "undefined")
									group.updatedAt = 0;
								if(ids[sub.user] !== true){
									groups.push({ 
										"link":group.link
										,"time":Number(group.updatedAt)
									});
									ids[sub.user] = true;
								}
							}
						});
					});
				});
				groups.sort(function(a,b){return b.time - a.time;});
				var length = groups.length;
				length = length <5 ? length:5;
				for (var idx = 0; idx < length; idx++){
					out[idx].innerHTML = groups[idx].link + "<br/>" 
					var spanTime = cView.doc.createElement("span");
					spanTime.className = "sb-info";
					out[idx].appendChild(spanTime);
					spanTime.date = groups[idx].time; 
					window.setTimeout(cView.Drawer.updateDate, 10,spanTime, cView);
				}
			}
		}
		,"test":isLogged	
	}
	,{"title":"Memories"
		, "content":function(cView){
			var div = cView.Common.genNodes([{ 
			"c":"memories-selector"
			,"el":[ 
				{ "c":"memories-date"
					,"t":"input"
					, "p":{
						"type":"date"
						,"pattern": "[0-9]{4}-[0-9]{2}-[0-9]{2}"
					}
				}
				,{"t":"button"
					,"e":{"click":["Actions","goMemories"]}
					,"txt":"go!"
				}
			]}])[0].cloneAll();
			return [div];

		}
		,"test":always  
	}
	,{"title":"Donate"
		, "content":function(cView){
			var divLib = cView.doc.createElement("div");
			var htmlLib = ' <a href="https://liberapay.com/freefeed/donate" target="_blank" rel="noopener noreferrer" style="border: 2px solid #f6c915; border-radius: 5px; color: #1a171b; background: white; display: inline-block; font-family: Helvetica Neue,Helvetica,sans-serif; font-size: 14px; max-width: 150px; min-width: 110px; position: relative; text-align: center; text-decoration: none;" > <span style="background-color: #f6c915; display: block; font-family: Ubuntu,Arial,sans-serif; font-style: italic; font-weight: 700; padding: 3px 7px 5px;" > <img src="https://liberapay.com/assets/liberapay/icon-v2_black.svg" height="20" width="20" style="vertical-align: middle;" alt=project /> <span style="vertical-align: middle;">LiberaPay</span> </span> <span style="display: block; padding: 5px 15px 2px;"> <span style="color: #f6c915; position: absolute; left: -2px;">&#10132;</span> We receive <br /> <span style="font-size: 125%">__receiving__</span> <br /> per week, <br /> our goal is <br /> <span style="font-size: 125%">__goal__</span> </span> </a> ';
			
			cView.Utils.xhr({"url": "https://liberapay.com/freefeed/public.json"}).then(
				function (raw){
					var result = JSON.parse(raw);
					divLib.innerHTML = htmlLib.replace("__goal__", formatSum(result.goal) ).replace("__receiving__",formatSum(result.receiving));
			});
			var divPP = cView.doc.createElement("div");
			divPP.innerHTML = ' <span style=" display: block, marginLeft: auto, marginRight: auto "> <form action="https://www.paypal.com/cgi-bin/webscr" method="post" target="_top"> <input type="hidden" name="cmd" value="_s-xclick" /> <input type="hidden" name="hosted_button_id" value="DRR5XU73QLD7Y" /> <b>Paypal way</b>: <table> <tbody> <tr> <td style=" paddingBottom: 5px "> <input type="hidden" name="on0" value="Pick monthly donation amount" style=" padding: 5px 0 " /> Choose your option: </td> </tr> <tr> <td> <select name="os0" defaultValue="Advanced"> <option value="Basic">€5.00 EUR / month</option> <option value="Advanced">€10.00 EUR / month</option> <option value="Sizable">€15.00 EUR / month</option> <option value="Luxurious">€20.00 EUR / month</option> <option value="King size">€30.00 EUR / month</option> <option value="Master of the Universe">€50.00 EUR / month</option> <option value="Chuck Norris">€75.00 EUR / month</option> <option value="Duke Nukem">€100.00 EUR / month</option> </select> </td> </tr> </tbody> </table> <input type="hidden" name="currency_code" value="EUR" /> <input type="image" src="https://www.paypalobjects.com/webstatic/en_US/i/buttons/PP_logo_h_100x26.png" name="submit" alt="PayPal - The safer, easier way to pay online!" style=" margin: 5px " /> <img alt="" src="https://www.paypalobjects.com/en_US/i/scr/pixel.gif" width="1" height="1" style=" display: none !important " /> </form> </span> <form action="https://www.paypal.com/cgi-bin/webscr" method="post" target="_top" id="singlePayPalPayment" > <input type="hidden" name="cmd" value="_s-xclick" /> <input type="hidden" name="hosted_button_id" value="HMVYD6GEWNWH8" /> <input type="image" src="https://www.paypalobjects.com/webstatic/en_US/i/buttons/PP_logo_h_100x26.png" width="0" height="0" name="submit" alt="PayPal - The safer, easier way to pay online!" /> <img alt="" src="https://www.paypalobjects.com/en_US/i/scr/pixel.gif" width="1" height="1" style=" display: none !important " /> </form> ';
			//divPP.innerHTML = '<p style="margin-bottom: 10px;">Subscribe to Freefeed today! Arrangement is plain and simple &mdash; you wire funds to Freefeed, it gets better every week.</p><span style="display: block; margin-left: auto; margin-right: auto;"><form action="https://www.paypal.com/cgi-bin/webscr" method="post" target="_top"><input name="cmd" value="_s-xclick" type="hidden"><input name="hosted_button_id" value="DRR5XU73QLD7Y" type="hidden"><table><tbody><tr><td style="padding-bottom: 5px;"><input name="on0" value="Pick monthly donation amount" style="padding: 5px 0px;" type="hidden"><!-- react-text: 123 -->Choose your option:<!-- /react-text --></td></tr><tr><td><select name="os0"><option value="Basic">&euro;5.00 EUR / month</option><option value="Advanced">&euro;10.00 EUR / month</option><option value="Sizable">&euro;15.00 EUR / month</option><option value="Luxurious">&euro;20.00 EUR / month</option><option value="King size">&euro;30.00 EUR / month</option><option value="Master of the Universe">&euro;50.00 EUR / month</option><option value="Chuck Norris">&euro;75.00 EUR / month</option><option value="Duke Nukem">&euro;100.00 EUR / month</option></select></td></tr></tbody></table><input name="currency_code" value="EUR" type="hidden"><input src="https://www.paypalobjects.com/webstatic/en_US/i/buttons/PP_logo_h_100x26.png" name="submit" alt="PayPal - The safer, easier way to pay online!" style="margin: 5px;" value="" type="image"><img alt="" src="https://www.paypalobjects.com/en_US/i/scr/pixel.gif" style="" class="ctutpseciownqmiudmkn" width="1" height="1"></form></span><form action="https://www.paypal.com/cgi-bin/webscr" method="post" target="_top" id="singlePayPalPayment"><input name="cmd" value="_s-xclick" type="hidden"><input name="hosted_button_id" value="HMVYD6GEWNWH8" type="hidden"><input src="https://www.paypalobjects.com/webstatic/en_US/i/buttons/PP_logo_h_100x26.png" name="submit" alt="PayPal - The safer, easier way to pay online!" value="" width="0" type="image" height="0"><img alt="" src="https://www.paypalobjects.com/en_US/i/scr/pixel.gif" style="" class="ctutpseciownqmiudmkn" width="1" height="1"></form><form action="https://www.paypal.com/cgi-bin/webscr" method="post" id="paypal-one-time"><input type="hidden" name="cmd" value="_s-xclick" ><input type="hidden" name="hosetd_button_id" value="HMVYD6GEWNWH8"></form><p style="margin-bottom: 10px;">Or <a onclick="document.getElementById(\'paypal-one-time\').submit();">send a one-time payment first&nbsp;&rarr;</a></p>';
			function formatSum({ amount, currency }) {
				return new Intl.NumberFormat(
					undefined
					, { style: 'currency', currency, }
				).format(amount);
			};
			var divH = cView.doc.createElement("div");
			divH.innerHTML = '<a href="https://freefeed.net/about/donate"><span style="text-decoration: underline; cursor: pointer;">Donate</span></a> to FreeFeed! Your regular donations pay for hosting and keep FreeFeed running.';
			var divF = cView.doc.createElement("div");
			divF.innerHTML = 'See all possible <a href="https://freefeed.net/about/donate" target="_blank"><span style="text-decoration: underline; cursor: pointer;">donation&nbsp;options→</span></a>';
			divF.style["font-size"] = "small";
			divH.style["font-size"] = "small";
			return [divH, divLib, divPP, divF];
		}
		,"test":always  
	}

];
return function(cView){
	return{
		"run":function(){
			populateSidebar(
				cView
				,cView.doc.getElementById("sidebar")
				,payload
			);
			return cView.Utils._Promise.resolve();
		}
		,"settings":function(){return cView.doc.createElement("span");}
	}
}
});
