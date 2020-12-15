"use strict";
function wipe(cView, node){
	var victim =cView.Utils.getNode(node, ["p","sidebar-emt"]);
	victim.parentNode.removeChild(victim);

}
function drawV2020(vote2020 ){
	if (vote2020 === true) return  '<div className="box-footer"> <p> Voting will begin at <br /> 15.12.2020 12:00 MSK </p> <p> Voting will end at <br /> 16.12.2020 12:00 MSK </p> </div>';
	if (vote2020 === 'finished') return '<div className="box-footer"> <p> Voting ended. Results will be published in <a href="'
		+gConfig.front
			+'as/FreeFeed/freefeed/">@freefeed</a> account.  </p> </div>';
	if (typeof vote2020 === 'string') return  '<div className="box-body"> <ul> <li> Please <a href="https://ffelection20.questionpro.com/" target="_blank" > vote here </a> </li> <li> Your vote unique key: <strong>'
		+vote2020 
			+'</strong> </li> </ul> </div> <div className="box-footer"> <p> Voting will end at <br /> 16.12.2020 12:00 MSK </p> </div>';
}
define("./addons/vote2020", [],function(){
return{
	"title":function(cView){
		return 'Supervisory board ' 
		+'<a target="_blank"  href="' + gConfig.front+"as/FreeFeed/"
		+'freefeed/da348e20-4075-4431-b4c8-6bd4a6e97e9a" >'
		+"election</a>";
	}
	,"content":function(cView){
		var deploy = cView.doc.createElement("div");
		cView.contexts.FreeFeed.p.then(function (){
			var gMe = cView.contexts.FreeFeed.gMe;
			if(gMe == null) wipe(cView, deploy);
			else if (typeof gMe.users.privateMeta.vote2020 === "undefined") wipe(cView, deploy);
			else deploy.innerHTML = drawV2020( gMe.users.privateMeta.vote2020);
		});
		return [deploy];
	}
	,"test":function(cView){
		return typeof cView.contexts.FreeFeed !== "undefined";
	}
}

});
