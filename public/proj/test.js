/*svar heroArray = [];
var heroesRoster = ["Abathur","Anub\'arak", "Artanis", "Arthas", "Azmodan", "Brightwing", "Chen", "Cho", "Diablo", "E.T.C.", "Falstad", "Gall", "Gazlowe", "Greymane", "Illidan", "Jaina", "Johanna", "Kael\'thas", "Kerrigan", "Kharazim", "Leoric", "Li Li", "Li-Ming", "Lt. Morales", "Lunara", "Malfurion", "Muradin", "Murky", "Nazeebo", "Nova", "Raynor", "Rehgar", "Rexxar", "Sgt. Hammer", "Sonya", "Stitches", "Sylvanas", "Tassadar", "The Butcher", "The Lost Vikings", "Thrall", "Tychus", "Tyrael", "Tyrande", "Uther", "Valla", "Xul", "Zagara", "Zeratul"];
var heroesMapsObj = { Towers: "Towers of Doom", Shrines: "Infernal Shrines", Battlefield: "Battlefield of Eternity", Tomb: "Tomb of the Spider Queen", Temple: "Sky Temple", Garden: "Garden of Terror", Bay: "Blackheart's Bay", Shire: "Dragon Shire", Mines: "Haunted Mines", Hollow: "Cursed Hollow"};
var enemyTeam = [];

var Abathur = new Hero(10,3)

function Hero(name,totalGames,wins){
	this.name = name;
	this.totalGames = totalGames;
	this.wins = wins;
	this.winPercentage = Math.round((wins/totalGames)*100);
	//this.performance;
}

heroesRoster.forEach(function(n){
	heroArray[n] = new Hero(n);           
})

heroesRoster.forEach(function(n){
	console.log("heroArray[n].name: "+heroArray[n].name);
	if(heroArray[n].wins){
		console.log("heroArray[n].wins: "+heroArray[n].wins);
	}	
})

heroArray["Abathur"].performance = { Azmodan: 40, Tyrael: 60, Jaina: 50,};

Object.keys(heroArray["Abathur"].performance).forEach(function(n){
	console.log(n);
	console.log(heroArray["Abathur"].performance[n]);
});
*/

var date = Date.now();
console.log(date);