"use strict";
define("Url2link", [], function(){
function _Url2link(cfg){
	var that = this;
	Object.keys(cfg).forEach(function(key){
		switch(key){
		case "truncate":
			that.trunc = cfg[key];
			break;
		default:
			Object.keys(cfg[key]).forEach(function(k){
				that[key][k] = cfg[key][k];
			});
		}
	});
};
_Url2link.prototype = {
	constructor:_Url2link
	,"trunc": 0
	,"bra": "([{*%$'\""
	,"ket": ")]}*%$'\""
	,"url":{
		"regex": /((?:https?:\/\/)?(?:[^\s\/~!@#$^&*()_?:;|\\]+\.)+(?:[^\s\/~!@#$^&*()_?:;|\\\.]){2,}(?:\.)?(?::[0-9]+)?(?:\/[^\s]*)*)/
		,"flags": "i"
		,"newtab": true
		,"action":function(match,host){
			var regex = /https?:\/\//g;
			var text;
			if(regex.exec(match)) text = match.slice(regex.lastIndex)
			else {
				text = match;
				match = "http://"+match;
			}
			text = decodeURI(text);
			if (text.slice(-1) == "/")text = text.slice(0,-1);
			text = (host.trunc &&(text.length > host.trunc))? text.substr(0,host.trunc)+"...":text;
			return '<a ' +(host["url"].newtab?'target="_blank"':"") +' href="'+match+'">' + text + "</a>";
		}
	}
	,"uname":{
		"regex": /@([a-z0-9]{3,})/
		,"newtab": true
		,"flags":"i"
		,"action":function(match, host){
			return '<a '+(host["uname"].newtab?'target="_blank"':"") +' href="' + gConfig.front+match+'" >@' +match + '</a>' ;
		}
	}
	,"link": function(text){
		var that = this;
		var matches = new Array();
		var out = new Array();
		["url","uname"].forEach(function (t){
			var conv = that[t];
			var idxEnd;
			var idxBra;
			var oMatch;
			var val;
			var regex = new RegExp("(^|\\s|.)"+conv.regex.source, conv.flags+"g");
			while((oMatch = regex.exec(text) )!== null){
				idxEnd = regex.lastIndex;
				val = oMatch[2];
				if((oMatch[1] != "")
				&&((idxBra = that.bra.indexOf(oMatch[1])) != -1)){
					idxEnd = oMatch[2].lastIndexOf(that.ket.charAt(idxBra));
					if (idxEnd != -1){
						val =  oMatch[2].slice(0,idxEnd++);
						idxEnd += oMatch.index;
					}
					else idxEnd = regex.lastIndex;
				}
				
				matches.push({
					"type":t
					,"prefix":oMatch[1]
					,"val":val
					,"start":oMatch.index
					,"end":idxEnd
				});
			}
		});
		matches.sort(function(a,b){return a.start - b.start;});
		var lastPos = 0;
		matches.forEach(function(m){
			out.push(text.slice(lastPos,m.start));
			out.push(m.prefix+that[m.type].action(m.val,that));
			lastPos = m.end;
		});
		out.push(text.slice(lastPos));
		return out.join("");
	}
};
return _Url2link;
});
