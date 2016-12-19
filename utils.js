"use strict";
define("./utils", [], function(){
function args2Arr(){
	//.length is just an integer, this doesn't leak
	//the arguments object itself
	var args = new Array(arguments.length);
	for(var i = 0; i < args.length; ++i) {
	//i is always valid index in the arguments object
		args[i] = arguments[i];
	}
	return args;
}
function _Promise(cb){
	var that = this ;
	Object.keys(that.defaults).forEach(function(key){
		that[key] = JSON.parse(JSON.stringify(that.defaults[key]))
	});
	function fulfill(res){that.fulfill(res);}
	function fail(res){that.fail(res);}
	setTimeout(function (){cb(fulfill,fail)});
}
_Promise.resolve = function(val){
	return new _Promise(function(resolve, reject){
		resolve(val);
	});
}
_Promise.reject = function(val){
	return new _Promise(function(resolve, reject){
		reject(val);
	});
}
_Promise.all = function(arr){
	return new _Promise(function(resolve, reject){
		var count = arr.length;
		if(!count)resolve();
		var reses = new Array(count);
		function alldone(data,idx){
			reses[idx] = data;
			if (--count)return;
			resolve(reses);
		}

		arr.forEach(function(item, idx){
			function success(res){alldone(res,idx);};
			if( typeof item.then !== "function")item = _Promise.resolve(item);
			item.then(success, reject);
		});	
	
	});
}
_Promise.prototype = {
	constructor:_Promise
	,"defaults":{
		"resolves":[]
		,"rejects":[]
		,"done":false
		,"failed":false
	}
	,"then":function(resolve, reject){
		var that = this;
		return new _Promise(function( thenRes, thenRej){
			function pass(arg){return arg;};
			function react(after,before,val){
				var ret = before(val);
				if((typeof ret !== "undefined")&&(typeof ret.then === "function"))
					ret.then(thenRes, thenRej);
				else after(ret);
			}; 
			if (typeof reject !== "function") reject = pass;
			if (typeof thenRej!== "function") thenRej = pass;
			if(that.failed)react(thenRej,reject,that.error);
			else that.rejects.push(function(fail){react(thenRej,reject,fail);});
			if(that.done && !that.failed)react(thenRes,resolve, that.res);
			else that.resolves.push(function(res){react(thenRes,resolve,res);});
		});
	}
	,"fulfill":function(res){
		this.done = true;
		this.res = res;
		while(this.resolves.length)
			this.resolves.pop()(this.res);
	}
	,"fail":function(res){
		this.failed = true;
		this.error = res;
		while(this.rejects.length)
			this.rejects.pop()(this.error);
	}
}
function xhr (o){
	return new _Promise(function( resolve, reject ){
		var method = typeof o.method  !== "undefined"? o.method : "get";
		var oReq = new XMLHttpRequest();
		var headers;

		oReq.open(method ,o.url , true);
		if(typeof o.token !== "undefined" )
			oReq.setRequestHeader("X-Authentication-Token",o.token);
		if(typeof o.headers !== "undefined" ) Object.keys(o.headers).forEach(function (header){
			if((o.headers[header] !== undefined)&&(o.headers[header] !== null))
				oReq.setRequestHeader(header,o.headers[header]);
		});
		if(typeof o.withCredentials !== "undefined" )
			oReq.withCredentials = o.withCredentials;
		oReq.onreadystatechange = function(){
			if(oReq.readyState == 2){
				headers = oReq.getAllResponseHeaders()
				return;
			}
			if(oReq.readyState != 4) return;
			var ret = oReq.response;
			if(o.getHeaders === true) 
				ret = {"headers": oReq.getAllResponseHeaders(), "data":oReq.response};
			if(oReq.status < 400) resolve(ret);
			else reject({"code":oReq.status, "data":ret});
		}
		oReq.onerror = function(){
			reject({"code":oReq.status
				,"data":oReq.response
				,"headers":headers
				,"msg":"Request error"
			});
		};
		try{
			if (typeof o.data  !== "undefined")  oReq.send(o.data);
			else  oReq.send();
		}catch(e){reject({"code":-1, "data":"Unknown error"});console.log(e);}
	});
}

return {
	/*source: http://stackoverflow.com/a/7516652 */
	"relative_time": function(date) {
		var cView = this.cView;
	/*	if (!date_str) {return;}
		//date_str = $.trim(date_str);
		date_str = date_str.replace(/\.\d\d\d+/,""); // remove the milliseconds
		date_str = date_str.replace(/-/,"/").replace(/-/,"/"); //substitute - with /
		date_str = date_str.replace(/T/," ").replace(/Z/," UTC"); //remove T and substitute Z with UTC
		date_str = date_str.replace(/([\+\-]\d\d)\:?(\d\d)/," $1$2"); // +08:00 -> +0800*/
		var parsed_date = new Date(date);
		var relative_to = (arguments.length > 1) ? arguments[1] : new Date(); //defines relative to what ..default is now
		var delta = parseInt((relative_to.getTime()-parsed_date)/1000);
		delta=(delta<2)?2:delta;
		var r = '';
		if (delta < 60) {
			r = delta + ' seconds ago';
		} else if(delta < 120) {
			r = 'a minute ago';
		} else if(delta < (45*60)) {
			r = (parseInt(delta / 60, 10)).toString() + ' minutes ago';
		} else if(delta < (2*60*60)) {
			r = 'an hour ago';
		} else if(delta < (24*60*60)) {
			r = '' + (parseInt(delta / 3600, 10)).toString() + ' hours ago';
		} else if(delta < (48*60*60)) {
			r = 'a day ago';
		} else if (delta < (24*60*60*30)) {
			r = (parseInt(delta / 86400, 10)).toString() + ' days ago';
		} else if (delta < (24*60*60*30*12)){
			r = (parseInt(delta / 2592000, 10)).toString() + ' months ago';
		} else {
			r = (parseInt(delta / 31104000, 10)).toString() + ' years ago';
		}
		return 'about ' + r;
	}
	/**********************************************/
	,"args2Arr": function(){return args2Arr.apply(this, arguments);}
	,"xhr": xhr
	,"err2html":function(err) {
		var data = JSON.parse(err);
		return Object.keys(data)
			.map(function(err){ return data[err]; })
			.join("<br>");
	}
	,"encodeURIForm": function(str){
		return encodeURIComponent(str).replace(/[!'()*]/g, function(c) {
			return '%' + c.charCodeAt(0).toString(16);
		}).replace("%20","+");
	}
	,"getNode":function(node){
		var arrPath =  args2Arr.apply(this,arguments);
		arrPath.shift();
		arrPath.forEach(function(step){
			if (node.classList.contains( step[1]))return;
			var className = step[1];
			switch(step[0]){
			case "p":
				do node = node.parentNode; 
				while(!node.classList.contains(className));
				break;
			case "c":
				node = node.cNodes[className];
				break;
			}
		});
		return node;

	}
	,"getInputsByName": function(node){
		var oInputs = new Object();
		var nodes = node.getElementsByTagName("input");
		for(var idx = 0; idx < nodes.length; idx++){
			var input = nodes[idx];
			if ((input.type == "radio")&&(input.checked == false) )continue;
			oInputs[input.name] = input;
			
		}
		return oInputs;
	}
	,"setChild": function (node,name, newNode){
		if(typeof node.cNodes === "undefined")
			node.cNodes = new Object();
		if(typeof node.cNodes[name] !== "undefined") 
			node.replaceChild(newNode, node.cNodes[name]);
		else node.appendChild(newNode);
		node.cNodes[name] = newNode;
		return newNode;
	}
	,"chkOverflow":function(victim){
		var test = victim.cloneNode(true);
		test.style.opacity = 0;
		test.style.position = "absolute";
		test.style.display = "block";
		victim.parentNode.appendChild(test);
		test.style.width = victim.clientWidth;
		var ret = victim.clientHeight < test.clientHeight;
		victim.parentNode.removeChild(test);
		return ret;
	}
	,"_Promise": _Promise
	,"fixPopupPos":function(node){
		var x = node.parentNode.offsetLeft;
		var y = node.parentNode.offsetTop
		node.style.opacity = 0;
		node.style.top = 0;
		node.style.left = 0;
		var width = node.offsetWidth;
		node.style.top = y; 
		node.style.left = x;
		if(node.offsetLeft + width > window.innerWidth){
			node.style.left = "auto";
			node.style.right = 0;
		}
		if(node.offsetLeft < 0) node.style.left = 0;
		node.style.opacity = 1;
	}
	,"unscroll":function(inp){
		var node;
		var offset;
		var fScroll = false;
		if (typeof inp === "function" ){
			var div_array = Array.prototype.slice.call(
				document.body.querySelectorAll(".post, .comment")
			);
			var refNode = div_array.filter(function(a){
				return a.getBoundingClientRect().top > 0;
			}).sort(function(a,b){
				return a.getBoundingClientRect().top - b.getBoundingClientRect().top;;
			})[0];
			var refTop = refNode.getBoundingClientRect().top;
			var arrArgs =  args2Arr.apply(this,arguments);
			arrArgs.shift();
			node = inp.apply(this, arrArgs);
			offset = refNode.getBoundingClientRect().top - refTop;
			fScroll = node.getBoundingClientRect().top < refTop;
		} else {
			node = inp;
			fScroll = (window.scrollY + window.innerHeight/2) > node.offsetTop;
			var prevDocHeight = document.body.scrollHeight;
			node.style.position = "absolute"; 
			offset = document.body.scrollHeight - prevDocHeight;
			node.style.position = "static"; 
		}
		
		if(fScroll) window.scrollBy(0,offset);
		return node;
	}
}
});
