var heroesMapsObj = { Braxis: "Braxis Holdout", Warhead: "Warhead Junction", Towers: "Towers of Doom", Shrines: "Infernal Shrines", Battlefield: "Battlefield of Eternity", Tomb: "Tomb of the Spider Queen", Temple: "Sky Temple", Garden: "Garden of Terror", Bay: "Blackheart's Bay", Shire: "Dragon Shire", Mines: "Haunted Mines", Hollow: "Cursed Hollow"};
var heroesRoster = heroesRoster;
var heroArray = [];
var currentMap = "";
var indexpath = 'https://newmeta.herokuapp.com';  //'http://localhost:5000'; // 'https://newmeta.herokuapp.com'; 

function Hero(name,games,wins,winPercent,performance){
	this.name = name;
	this.games = games;
	this.wins = wins;
	this.winPercent = winPercent;
	this.performance = performance;
}

(function(){ //fills html with images of all characters on roster
	for (n=0;n<heroesRoster.length;n++){
		$('.heroesContainer').append('<div class="drop"><img id="'+heroesRoster[n]+'" src="css/'+heroesRoster[n]+'.jpg" /></div>')
	}
})();

$('select').each(function(){//create drop downs with characters on roster
	for (n=0;n<heroesRoster.length;n++){
		$(this).append(new Option(heroesRoster[n], heroesRoster[n]));
	}
});

heroesRoster.map(function(c){
	if(!heroArray[c]){	//if heroArray[c] isn't populated then get information from the server (which requests data from Performance DB)	
		var reqParam = {
			queryType: 'calcStats', 
			charHover: c,  
		};
		var posting = $.post(indexpath+'/meta',reqParam);
		posting.done(function(dataObj){
			heroArray[c] = new Hero(c,dataObj.games,dataObj.wins,dataObj.winPercent,dataObj.performance);
		})
	}
});

$(function(){
	$('.enemyTeamChar').on("change",function(){
		var enemyTeam = [];
		$('.enemyTeamChar').each(function(){
			if($(this).children('option:selected').val()==="- Select One -"){
				enemyTeam = enemyTeam;
			}
			else {
				enemyTeam.push($(this).children('option:selected').val())
				$('#stat1').html("<h4> Enemy Team Selected Heroes: <br> </h4>"+enemyTeam);
			}
		})

		$('#debug').html(JSON.stringify(enemyTeam));

		var reqParam = {
			queryType: 'optimalTeam',
			enemyTeam: JSON.stringify(enemyTeam),
		};

		var posting = $.post(indexpath+'/meta',reqParam);
		posting.done(function(dataObj){
			//$('#debug').append("MEOW");
			$('#debug').append("<br>");
			var result = dataObj;
			$('#stat2').html("<h4> Top picks vs. Enemy Team: </h4>");
			var i=0;
			for(n in result){
				$('#stat2').append(result[n].results._id+" "+result[n].results.total_wins+"/"+result[n].results.total_games+" ("+result[n].results.win_percent*100+"%)<br>");
				i++;
				if(i===5){break;}
			}
			$('#debug').append(JSON.stringify(result));
		})
	})
})

//updates drop down options dynamically based on images dropped in teams
function refreshSelect(){		
	$('img').parent(".drop").each(function(){ // runs a function on all drop elements that contain an img element
		var imgId = $(this).children('img').attr("id"); //gets the id of the img element inside the drop element
		$(this).siblings('select').children('option[value="'+imgId+'"]').prop('selected',true); //if drop element has select element next to it, update the option elements to a value equal to id of current img element inside the drop element
	});

	$(".drop:not(:has('img'))").each(function(){ //runs a function on all drop elements that do not contain an img element
		$(this).siblings("select").find('option[value="- Select One -"]').prop('selected',true); //updates the select element next to the drop element to the default option of - Select One -
	});

	$('option').each(function(){ //runs a function on all option elements
		$(this).prop('disabled', false); //clears the disabled property on all options
	});

	$('option:selected').each(function(){ //runs a function on all selected options
		$('option[value="'+$(this).val()+'"]').prop('disabled', true); //disables all options that are selected...
		$('option[value="- Select One -"]').prop('disabled', false); //unless they are the default option
	});		
};

//updates images dynamically based on characters selected in drop down
$('.drop').siblings("select").on("change", function(){ //finds all drop elements with a select sibling and runs a function on change event on select elements
	var optionId = $(this).children('option:selected').val(); //finds selected option and gets the option's value
	var oldImgId = $(this).siblings('.drop').children('img').attr('id');
	if (optionId === '- Select One -'){ // checks if the optionId is the default option
		$(this).siblings('.drop').children("img").remove(); //finds the sibling drop element and removes it's old img element
		$(".drop:not(:has('img')):first").append('<img id="'+oldImgId+'" src="css/'+oldImgId+'.jpg" />'); //move the old img back to the top container
	}		
	else{ //otherwise append the img inside the drop element 
		$(this).siblings('.drop').children("img").remove(); //finds the sibling drop element and removes it's old img element
		$('.drop').children('img[id="'+optionId+'"]').remove(); //finds the other drop elements containing the img matching the optionId and removes it
		$('<img id="'+optionId+'" src="css/'+optionId+'.jpg" />').appendTo($(this).siblings('.drop')); //adds the img element matching the optionId to the drop element
		$(this).siblings('.charHistory').html("Counterpicks: ");
		var i = 0
		for(var prop in heroArray[optionId].performance){
			$(this).siblings('.charHistory').append('<br>'+(parseInt(prop)+1)+'. '+heroArray[optionId].performance[prop].p_name+": "+ Math.round(heroArray[optionId].performance[prop].p_winPercent)+'%')
			i++
			if(i===5) {break;}
		}
	}		
	refreshSelect(); //refresh select options
});

$('.mapScroll').children("img").hover(
	function(){
		$(this).removeClass('notSelected');
		$(this).addClass('hover');
	},
	function(){
		$(this).removeClass('hover');
	}
);

$('.mapScroll').children("img").on("click", function(){
	currentMap = heroesMapsObj[this.id];
	$('h2#currentMap').html("Map: "+currentMap);
	$("img.map[id!='"+this.id+"']").removeClass('selected');
	$(this).addClass('selected');
});

$('.drop').delegate('img','mouseover', function(){
	if (!heroArray[this.id]){ //if initial performance data hasn't been loaded into heroArray yet, perform an adhoc request
		var reqParam = { queryType: 'basicStats', charHover: this.id, };	
		var posting = $.post(indexpath+'/meta',reqParam);
		posting.done(function(dataObj){	
			heroArray[reqParam.charHover].games = dataObj.games;
			heroArray[reqParam.charHover].wins = dataObj.wins;
			heroArray[reqParam.charHover].winPercent = dataObj.winPercent;
			heroArray[reqParam.charHover].performance = dataObj.performance;
			$('#roster').html("Roster: "+reqParam.charHover+" ("+dataObj.winPercent+"% Win Rate)");
			$('#charGames').html("<h3>"+reqParam.charHover+": </h3>"+dataObj.winPercent+"% from "+dataObj.wins+"/"+dataObj.games+" (Win/Played) ")
			for(var prop in heroArray[reqParam.charHover].performance){
				$('#charGames').append('<br>'+(parseInt(prop)+1)+'. '
				+heroArray[reqParam.charHover].performance[prop].p_name+": ("
				+heroArray[reqParam.charHover].performance[prop].p_wins+"/"
				+heroArray[reqParam.charHover].performance[prop].p_games+" games) = "
				+heroArray[reqParam.charHover].performance[prop].p_winPercent+'%');
			};
		});	
	} else {
		$('#roster').html("Roster: "+this.id+" ("+heroArray[this.id].winPercent+"% Win Rate)");
		$('#charGames').html("<h3>"+this.id+": </h3>"+heroArray[this.id].winPercent+"% from "+heroArray[this.id].wins+"/"+heroArray[this.id].games+" (Win/Played) ")
		for(var prop in heroArray[this.id].performance){
			$('#charGames').append('<br>'+(parseInt(prop)+1)+'. '
			+heroArray[this.id].performance[prop].p_name+": ("
			+heroArray[this.id].performance[prop].p_wins+"/"
			+heroArray[this.id].performance[prop].p_games+" games) = "
			+heroArray[this.id].performance[prop].p_winPercent+'%');
		};
	} 
});

$('.drop').draggable({
	containment: 'document',
	cursor: 'grab',
	snap: '.drop',
	helper: 'clone',
    revert: 'invalid',
    appendTo: 'body'
})

$('.drop').droppable({
	drop: function(event,ui){
		var draggable = ui.draggable;
		var droppable = $(this);
		draggable.swap(droppable);
		refreshSelect();
	}
});

$.fn.swap = function(swapOut){
	swapOut = $(swapOut)[0]; //this is the element you want to move out of where you're dropping 
	swapIn = this[0]; //this is the element you are dragging currently
	var textNode = swapIn.parentNode.insertBefore(document.createTextNode(''),swapIn); //create a <text> before the element you're dragging
	//let's do some swapping
	swapOut.parentNode.insertBefore(swapIn,swapOut);
	textNode.parentNode.insertBefore(swapOut,textNode);
	textNode.parentNode.removeChild(textNode);
}

