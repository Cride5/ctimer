/*
File: cTimer.js
Author: Conrad Rider (www.rider.biz)
Date: 20/11/09
Copyright 2009: All rights reserved.

BUGS:


TODO:
* Buttons to rotate cube directly (replaces orientation selector)



*/


// Initialise the app on first load
/*function init(){
	setTimeout("init_()", 1000);
}
*/
function init(){
	initConstants();
	// Non-persistant confnig
	menuVisible = false;
	// Set initial config values, 0=default, 1 = type(0=bool,1=num,2=str), 2= min 3 = max
	config = [
		[0, TYNUM, 0, 9999], // Inspection time
		[0, TYBUL], // Stylesheet  0=white, 1=black
		[1, TYBUL], // Generate scramble images
		[9, TYNUM], // Cube Rotation
		[0, TYNUM], // Average to hilight
		["",TYSTR], // Open tab
		[0, TYNUM], // Session start time
		[0, TYNUM], // Using random state
		[3, TYNUM], // Puzzle type
		[1, TYBUL], // Show current averages (mobile version only)
	];
	checkboxes = [CF_STYLE, CF_CAVG];

	// Read cookies and display config
	for(var i = 0; i < config.length; i++){
		var cv = readCookie("ctimer" + i);
		// For strings just import direct
		if(config[i][1] == TYSTR){
			if(cv != null && cv != "") config[i][0] = cv;
		}else{ // Parse numerics
			var nv = parseInt(cv, 10);
			if(!isNaN(nv)) config[i][0] = nv;
		}
//debug("cookie:" + i + "=" + config[i][0]);
		// Initialise config screen with values
		if(i == CF_ISPCT)
			document.getElementById("config" + i).value = config[i][0];
	}
	timeData = Array();
	scrambles = Array();
	iSolve = 0;
	timeToggle = 0;
	kdown = false;
	displayStyle(config[CF_STYLE][0]);
	loadTimes(); // Load times from cookie
	loadScrambles();
	if(iSolve > 0) origTime = timeData[iSolve - 1];
	// Initialise the rest
	initTimer();
	rebuildTimeLog(0);
	genStats(true);
	processing = false;
	selectAvg(config[CF_HLI][0], false);
//	config[CF_RSTAT][0] = 0;
	initSolver2x2();
	waitingScramble = null;
	genScramble(false);
	setTimeout("genScrambleDelayed()", 50);

//debug("tab=|" + config[CF_TAB][0] + "|");
	if(config[CF_TAB][0] != ""){
		var t = config[CF_TAB][0];
		config[CF_TAB][0] = "";
		var ok = false;
		for(var i = 0; i < TABS.length; i++)
			if(t == TABS[i]) ok = true;
		if(ok) toggleTab(t);
	}
	displayStyle(config[CF_STYLE][0]);
//document.write("BLAH");
}

function initConstants(){
	FACES = ['U', 'R', 'F', 'D', 'L', 'B'];
	FACES2 = ['u', 'r', 'f', 'd', 'l', 'b'];
	FACES3 = ['U', 'R', 'F', 'D', 'L', 'B', 'u', 'r', 'f', 'd', 'l', 'b', '3u', '3r', '3f', '3d', '3l', '3b']
	POW = ['', '2', "'"];
	PUZZLE = ["Clock", "", "2x2x2 Cube", "3x3x3 Cube", "4x4x4 Cube", "5x5x5 Cube", "6x6x6 Cube", "7x7x7 Cube", "", "", "", "Square-1", "Pyraminx", "Megaminx"];
	PENALTY = 2000; // Time penalty in milliseconds
	// Config options
	// Identifiers
	CF_ISPCT = 0;
	CF_STYLE = 1;
	CF_SCIMG = 2;
	CF_RTN = 3;
	CF_HLI = 4;
	CF_TAB = 5;
	CF_STIME = 6;
	CF_RSTAT = 7;
	CF_PZL = 8;
	CF_CAVG = 9; // mobile version only

	TYBUL = 0;
	TYNUM = 1;
	TYSTR = 2;

	TABS = ["times", "options", "info"];
}

// Initialise timer whenever times are reset
function initTimer(){
	READY = 0;
	STOPPED = 1;
	RUNNING = 2;
	INSPECTION = 3;
	INSPECTION_ = 4;
	state = READY;
	startTime = 0;
	statsBest = Number.MAXIMUM_VALUE;
	statsWorst = 0;
	statsAvg = 0;
	statsStd = 0;
	timerStopped = getTimeNow();
	initStatSet();
	document.getElementById("time").innerHTML = formatTime2(iSolve > 0 ? timeData[iSolve - 1] : 0);
	refresh = 0;
	insTimeout = 0;
	insPenalty = false;
}
// Initialise the stats variable
function initStatSet(){
	// Indices into this array represent:
	// 0 = Avg of x
	// (current stats) 1 = i min, 2 = i max, 3 = avg, 4 = std
	// (best stats) 5 = index, 6 = i min, 7 = i max, 8 = avg, 9 = std
	statSet = [
		[5, 0, 0, 0, 0, 0, 0, 0, Number.POSITIVE_INFINITY, 0],
		[12, 0, 0, 0, 0, 0, 0, 0, Number.POSITIVE_INFINITY, 0],
//		[50, 0, 0, 0, 0, 0, 0, 0, Number.POSITIVE_INFINITY, 0],
//		[100, 0, 0, 0, 0, 0, 0, 0, Number.POSITIVE_INFINITY, 0],
//		[200, 0, 0, 0, 0, 0, 0, 0, Number.POSITIVE_INFINITY, 0],
//		[500, 0, 0, 0, 0, 0, 0, 0, Number.POSITIVE_INFINITY, 0],
//		[1000, 0, 0, 0, 0, 0, 0, 0, Number.POSITIVE_INFINITY, 0],
//		[2000, 0, 0, 0, 0, 0, 0, 0, Number.POSITIVE_INFINITY, 0],
//		[5000, 0, 0, 0, 0, 0, 0, 0, Number.POSITIVE_INFINITY, 0],
//		[10000, 0, 0, 0, 0, 0, 0, 0, Number.POSITIVE_INFINITY, 0]
	];
}





// ================================[ User Input ]============================

// Set time to +2, DNF, or remove on user request
function toggleTime(){
	if(state == RUNNING || iSolve == 0 || processing) return;
	processing = true;
	// Record original time
	if(isNaN(origTime))
		origTime = timeData[iSolve - 1];
	if((timeToggle == 2 || origTime > Number.MAX_VALUE) && delSolve(iSolve - 1, false)){
		timeToggle = 0;
		origTime = iSolve > 0 ? timeData[iSolve - 1] : 0;
	}
	else
		timeToggle = (timeToggle + 1) % 3;
	if(iSolve > 0){
		switch(timeToggle){
			case 0 : timeData[iSolve - 1] = origTime; break;
			case 1 : timeData[iSolve - 1] = origTime < Number.MAX_VALUE ? -origTime : origTime; break;
			case 2 : timeData[iSolve - 1] = Number.POSITIVE_INFINITY; break;
		}
	}
	clearHilightedAvg();
	genStats(true);
	displayTime(iSolve > 0 ? timeData[iSolve - 1] : 0, iSolve - 1);
	rebuildTimeLog(iSolve - 1);
	selectAvg(config[CF_HLI][0], false);
	saveTimes();
	processing = false;
}


// Switch tabs on user request
function toggleTab(tab){
	if(processing) return; processing = true;
	if(config[CF_TAB][0] != ""){
		document.getElementById("tab_" + config[CF_TAB][0]).className = "tab_hidden";
		document.getElementById("link_" + config[CF_TAB][0]).className = "tab_link";
		if(tab == config[CF_TAB][0]){
			hideTabs();
			saveConfig(CF_TAB, "");
			processing = false;
			return;
		}
	}
	else{
		document.getElementById("fbox").className = "maximised";
		document.getElementById("ftabs").className = "hideline";
	}
	config[CF_TAB][0] = tab;
	document.getElementById("link_" + tab).className = "tab_em";
	document.getElementById("tab_" + tab).className = "tab_visible";
	saveConfig(CF_TAB, tab);
	processing = false;
}

// Hide tabs on user request
function hideTabs(){
	document.getElementById("fbox").className = "minimised";
	document.getElementById("ftabs").className = "showline";
}

// Close detail box
function closeDetail(){
	document.getElementById("detail_box").className = "tab_hidden";
}
function openDetail(){
	document.getElementById("detail_box").className = "tab_visible";
}

// Switch options
function toggleConfig(id, element){
	if(processing) return; processing = true;
	var img = element.childNodes[0];
	if(config[id][0] == 1){
		config[id][0] = 0;
		img.src = config[CF_STYLE][0] == 0 ? "check_off.gif" : "check_off_.gif";
	}
	else{
		config[id][0] = 1;
		img.src = config[CF_STYLE][0] == 0 ? "check_on.gif" : "check_on_.gif";
	}
	saveConfig(id, config[id][0]);
	// Config specific triggers
	switch(id){
		case CF_STYLE : displayStyle(config[id][0]); break;
		case CF_CAVG : if(config[CF_HLI][0] != 0) selectAvg(config[CF_HLI][0], true); break;
	}
	processing = false;
}

function setConfig(id, value){
	if(processing) return; processing = true;
	if(value == "") config[id][0] = 0;
	else{
		val = parseInt(value, 10);
		if(val < config[id][2]) config[id][0] = config[id][2];
		else if(val > config[id][3]) config[id][0] = config[id][3];
		else if(!isNaN(val)) config[id][0] = val;
	}
	document.getElementById("config" + id).value = config[id][0];
	saveConfig(id, config[id][0]);
	processing = false;
}

// Remove all times and re-set statistics
function reset(){
	// Carry out stopTimer tasks
	if(state != STOPPED){
		state = STOPPED;
		clearInterval(refresh);
		if(state == state == INSPECTION || state == INSPECTION_)
			clearTimeout(insTimeout);
	}
	resetStats();
	timeData = Array();
	scrambles = Array();
	document.getElementById("tab_detail").innerHTML = "";
	iSolve = 0;
	saveConfig(CF_STIME, getTimeNow());
	saveTimes();
//	saveScrambles();
	initTimer();
	waitingScramble = null;
	genScramble(false);
	setTimeout("genScrambleDelayed()",50);
}

// Removes a single solve and updates statistics accordingly
function delSolve(row, user){
	if(user && (processing || (state != READY && state != STOPPED))) return; processing = true;
	// Call toggle time for most recent time
	if(row == iSolve - 1 && timeToggle != 2){
		processing = false;
		toggleTime();
		return false;
	}
	if(!confirm("Delete solve " + (row + 1) + ".  Are you sure?")){
		processing = false;
		return false;
	}
	// Clear currently hilighted avg
	clearHilightedAvg();
	// Cascade all next solves to previous element
	for(var i = row; i < iSolve; i++){
		if(i < iSolve - 1){
			timeData[i] = timeData[i + 1];
		}
		scrambles[i] = scrambles[i + 1];
	}
	scrambles[iSolve] = '';
	iSolve--;
	// Delete frow from stats table if necessery
	if(iSolve > 0) document.getElementById("time").innerHTML
		= formatTime2(timeData[iSolve - 1]);
	genStats(true);
	var timeLog = document.getElementById("tab_times");
//	debug("nrow=" + timeLog.childNodes[row * 2].innerHTML);
	if(iSolve == 0) timeLog.innerHTML = "";
	else{
		timeLog.removeChild(timeLog.childNodes[row * 2]);
		if(row > 0) timeLog.removeChild(timeLog.childNodes[row * 2 - 1]);
		else timeLog.removeChild(timeLog.childNodes[0]);
	}
	rebuildTimeLog(row);
	selectAvg(config[CF_HLI][0], false);
	saveTimes();
	saveScrambles();
	origTime = NaN;
	if(user) processing = false;
	return true;
}








// ===============================[ Menu Functions ]=============================
function popupPzlMenu(e){
	if(menuVisible) return;
	menuVisible = true;
	var menu = document.getElementById("pzl_menu");
	menu.style.top = (e.clientY - 3) + "px";
	menu.style.left = (e.clientX - 3) + "px";
	showPzlMenu();
}
function showPzlMenu(){
	if(!menuVisible) return;
//debug("show pzl menu...");
	document.getElementById("pzl_menu").className="menu";
}
function hideMenus(e){
	if(!menuVisible) return;
	var menu = document.getElementById("pzl_menu");
	var top = parseInt(menu.style.top, 10)
	var left = parseInt(menu.style.left, 10);
	if(e.clientY > top && e.clientY < top + menu.offsetHeight
	&& e.clientX > left && e.clientX < left + 105) return;
	hidePzlMenu();
//debug("hiding menu");
//debug("top:" + menu.style.top + ", left" + menu.style.left + ", width:" + menu.offsetWidth + " height:" + menu.offsetHeight + " mx:" + e.clientX + " my:" + e.clientY);
}
function hidePzlMenu(){
	document.getElementById("pzl_menu").style.top = "0px";
	document.getElementById("pzl_menu").style.left = "0px";
	document.getElementById("pzl_menu").className="menu_hidden";
	menuVisible = false;
}

function selectPuzzle(pzl){
	hidePzlMenu();
	if(processing || pzl == config[CF_PZL][0] ||
	(iSolve > 0 && !confirm("This will clear the current time log. Are you sure?"))) return; processing = true;
	config[CF_PZL][0] = pzl;
	reset();
	saveConfig(CF_PZL, pzl);
	processing = false;
}











// ===============================[ Timer Functions ================================

// For activating/deactivating the timer by mouse
function mouse_activate(event){
	if(state == STOPPED) state = READY;
	if(state == RUNNING) stopTimer(event);
	else startTimer(event);
}

// Start timer when space is released (NOTE; this is also called on key up when stopping)
function startTimer(event){
	var now = getTimeNow();
	// allow multiple keys to be pressed when first starting the timer
	if(kdown) kdown = false; else if(state != READY && event.type != 'mousedown') return;
//debug("key=" + event.keyCode + ", state:" + state);
	// Filter for a valid key
	if(event && !(event.type == 'mousedown' || event.keyCode == 32 ||
	(event.keyCode >= 0 && event.keyCode <= 255 && state == STOPPED)))
		return;
	if(state == STOPPED){ state = READY;
		return; }
	else if(state == RUNNING)
		return;
	if(now - timerStopped < 350) return;
	// Do inspection if necessery
	if(config[CF_ISPCT][0] > 0){
		if(state == INSPECTION || state == INSPECTION_){
			state = RUNNING;
			clearTimeout(insTimeout);
			startTime = now;
			timeToggle = 0;
			origTime = Number.NaN;
//			timeData[iSolve] = Array();
		}
		else{
			state = INSPECTION;
			document.getElementById("time").innerHTML = config[CF_ISPCT][0];
			insStart = now;
			refresh = setInterval(update, 89);
			insTimeout = setTimeout(endInspection, config[CF_ISPCT][0] * 1000);
		}
		return;
	}
	state = RUNNING;
	startTime = now;
	timeToggle = 0;
	origTime = Number.NaN;
//	timeData[iSolve] = Array();
	refresh = setInterval(update, 89);
}

// Stop timer when space is pressed
function stopTimer(event){
	var now = getTimeNow();
	if(!kdown) kdown = true; else return;
	// only allow space on multi-stage mode, but allow other keys in normal mode
//	if(event && !(event.keyCode == 32 ||
//	!(event.keyCode >= 0 && event.keyCode <= 255 ))
	// Allow all keys to stop timer
	if(event && !(event.type == 'mousedown' || (event.keyCode >= 0 && event.keyCode <= 255)))
		return;
	if(state != RUNNING)
		return;
	updateTime(now);
	timeData[iSolve] = now - startTime;

	state = STOPPED;
	timerStopped = now;
	clearInterval(refresh);
	timeData[iSolve] = insPenalty ? -now + startTime : now - startTime;
	displayTime(timeData[iSolve], iSolve);
	logTime(document.getElementById("tab_times"), timeData[iSolve], iSolve);
	origTime = timeData[iSolve];
	nextSolve();
}

// Shows the current time during timing
function update(){
	if(state == INSPECTION){
		var time = new Date().getTime() - insStart;
		document.getElementById("time").innerHTML = time < 0 ? 1 : Math.floor(((config[CF_ISPCT][0] + 1) * 1000 - time) * 0.001);
	}
	else if(state == INSPECTION_)
		document.getElementById("time").innerHTML = "+" + Math.floor(PENALTY * 0.001);
	else updateTime(new Date().getTime());
}

//
function endInspection(){
	if(state == INSPECTION){
		state = INSPECTION_;
		insPenalty = true;
		insTimeout = setTimeout(endInspection, 2000);
	}else if(state == INSPECTION_){
		state = READY;
		clearInterval(refresh);
//		timeData[iSolve] = Array();
		timeData[iSolve] = Number.POSITIVE_INFINITY;
		displayTime(timeData[iSolve], iSolve);
		logTime(document.getElementById("tab_times"), timeData[iSolve], iSolve);
		origTime = timeData[iSolve];
		nextSolve();
	}
}

// Prepare env for next solve
function nextSolve(){
	iSolve++;
	saveTimes();
	insPenalty = false;
	genStats(false);
	genScramble(false);

}

// Generate a scramble
// TODO: This needs to support multiple puzzles, and eventually random-state scrambles
function genScramble(replace){
	if(scrambles[iSolve] != null && scrambles[iSolve].length > 0 && !replace){
		document.getElementById("scramble").innerHTML = scrambles[iSolve];
		return;
	}
	if(waitingScramble != null){
		scrambles[iSolve] = waitingScramble;
		waitingScramble = null;
		setTimeout("genScrambleDelayed()",50);
	}
	// If the delayed scramble generator isn't finished then just generate one now
	else scrambles[iSolve] = genScramble_();
	// Generate scramble dependin on puzzle
	document.getElementById("scramble").innerHTML = scrambles[iSolve];
	saveScrambles();
}

function genScrambleDelayed(){
	waitingScramble = genScramble_();
}

function genScramble_(){
	switch(config[CF_PZL][0]){
		case 2 : return genScramble2x2();
		case 3 : return genScrambleNxN(3, 25);
		case 4 : return genScrambleNxN(4, 40);
		case 5 : return genScrambleNxN(5, 60);
		case 6 : return genScrambleNxN(6, 80);
		case 7 : return genScrambleNxN(7, 100);
		case 11 : return genScrambleSq1(40);
		case 12 : return genScramblePyra();
		case 13 : return genScrambleMega();
	}
}

function genScrambleNxN(n, m){

	var nAXES = 3;
	var nPOW = 3;
	var nDEPTH = Math.floor(n/2);
	var nSLICE = nDEPTH * 2;
	var scramble = "";
	var move = 0;
	var face = 0;
	var axis = 0;
	var pow = 0;
	var depth = 0;
	var prevAxis = -1;
	var sliceTurned = new Array();
	for(var i = 0; i < nSLICE; i++) sliceTurned[i] = false;
	for(var i = 0; i < m; i++){
		do{
			move = Math.floor(Math.random() * nSLICE * nPOW * nAXES)
			axis = Math.floor(move / (nSLICE * nPOW));
			slice = move % nSLICE;
		}while(axis == prevAxis && sliceTurned[slice])
		depth = slice % nDEPTH;
		face = slice < nDEPTH ? axis : axis + nAXES;
		pow = Math.floor((move % (nPOW * nSLICE)) / nSLICE);
		scramble += (depth > 1 ? (depth + 1) : "") + (depth > 0 ? FACES2[face] : FACES[face]) + POW[pow] + " ";
		if(axis != prevAxis)
			for(var j = 0; j < nSLICE; j++)
				sliceTurned[j] = false;
		sliceTurned[slice] = true;
		prevAxis = axis;
	}
	return scramble;

}

function genScrambleMega(){
	var scramble = "";
	for(var i = 0; i < 7; i++){
		for(var j = 0; j < 10; j++){
			scramble += (j % 2 == 0 ? "R" : "D") + (Math.random() < 0.5 ? "++ " : "-- ");
		}
		scramble += (Math.random() < 0.5) ? "U  " : "U' ";
	}
	return scramble;
}






// ================================[ Rendering ]====================================


// Update time, taking account of toggle state
function displayTime(millis, idx){
	var fTime = formatTime2(millis);
	document.getElementById("time").innerHTML = fTime;
}

// Updates the time during timing
function updateTime(time){
	var fTime = formatTime(time - startTime);
	document.getElementById("time").innerHTML = fTime;
}


// Core function for formattting time (must be fast as poss)
function formatTime(millis){
	var hrs = (millis - millis % 3600000 ) / 3600000;
	var min = ((millis - millis % 60000 ) / 60000) % 60;
	var sec = ((millis - millis % 1000 ) * 0.001) % 60;
	var hnd = ((millis - millis % 10 ) * 0.1) % 100;
	return	   (hrs > 0 ? hrs + (min < 10 ? ":0" : ":") : "" ) +
	(min > 0 || hrs > 0 ? min + (sec < 10 ? ":0" : ":") : "" ) +
		sec + "." + (hnd < 10 ? "0" : "") + hnd;
}

// Format time to take into account penalties and DNFs
function formatTime2(millis){
	if(millis > Number.MAX_VALUE) return "DNF";
	if(millis < 0) return formatTime(-millis + PENALTY) + "+";
	return formatTime(millis);
}

// Format up to seconds only
function formatTimeShort(millis){
	var hrs = (millis - millis % 3600000 ) / 3600000;
	var min = ((millis - millis % 60000 ) / 60000) % 60;
	var sec = ((millis - millis % 1000 ) * 0.001) % 60;
	return	   (hrs > 0 ? hrs + (min < 10 ? ":0" : ":") : "" ) +
	(min > 0 || hrs > 0 ? min + (sec < 10 ? ":0" : ":") : "" ) + sec;
}


// Format standard devidation (crrrently only shows percentage)
function formatStd(std, avg){
	return avg == 0 ? "0.0%" : (std * 100 / avg).toFixed(1) + "%";
}
function formatStdFull(std, avg){
//	if(!std) return "0.0 (0.0%)";
	return (std * 0.001).toFixed(1) + " (" + (std * 100 / avg).toFixed(1) + "%)";
}


// Add time to time log
function logTime(element, time, n){
	var timetxt = '<a href="#" onclick="delSolve('+n+', true); return false;">'+formatTime2(time)+'</a>'
	if(n * 2 > element.childNodes.length - 1){
		if(n == 0)
			element.innerHTML = '<span>'+timetxt+'</span>';
		else
			element.innerHTML += "<span>,&nbsp; </span>" + '<span>'+timetxt+'</span>';
	}
	else{
		element.childNodes[n * 2].innerHTML = timetxt;
		if(n > 0) element.childNodes[n * 2 - 1].innerHTML = ",&nbsp; ";
	}
}

function displayDetail(){

	// Don't display stats if not available yet
	if(iSolve == 0 || Math.abs(config[CF_HLI][0]) > getMaxSet(iSolve) + 1) return;

	document.getElementById("tab_detail").innerHTML = 'Generating detailed statistics. Please wait...\n';
	openDetail();
	setTimeout("displayDetail2()", 50);
}

function displayDetail2(){
	var tab = document.getElementById("tab_detail");
	tab.innerHTML = '<p style="float:right;margin:0"><a href="#" onclick="closeDetail(); return false;">close</a></p>\n';
	if(iSolve == 0){
		tab.innerHTML += "";
		return;
	}
	var toBracket = false;
	if(config[CF_HLI][0] == 0){
		tab.innerHTML +=
			"<em>Statistics for " + PUZZLE[config[CF_PZL][0]] + ":</em><br/><br/>\n" +
			"Session Average: " + formatTime2(statsAvg) + "<br/>\n" +
			"Best Time: " + formatTime2(timeData[statsBest]) + "<br/>\n" +
			"Worst Time: " + formatTime2(timeData[statsWorst]) + "<br/>\n" +
			"Standard Deviation: " + formatStdFull(statsStd, statsAvg) + "<br/><br/>\n";
		for(var i = 0; i < iSolve; i++){
			toBracket = i == statsBest || i == statsWorst;
			tab.innerHTML += (i < 9 ? "&nbsp;&nbsp;" : i < 100 ? "&nbsp;" : "") + (i + 1) + ". " + (toBracket ? "(" : "&nbsp;") +
			formatTime2(timeData[i]) + (toBracket ? ")" : "&nbsp;") +
			"&nbsp; " + scrambles[i] + "<br/>\n";
		}
	}else{
		var ia = config[CF_HLI][0] < 0 ? -config[CF_HLI][0] - 1 : config[CF_HLI][0] - 1;
		var ms = getMaxSet(iSolve);
		if(ia > ms){
			tab.innerHTML = "";
			return;
		}else{
			if(config[CF_HLI][0] < 0){
				tab.innerHTML +=
					"<em>Statistics for " + PUZZLE[config[CF_PZL][0]] + ":</em><br/><br/>\n" +
					"Current Average of " + statSet[ia][0] + ": " + formatTime2(statSet[ia][3]) + "<br/>\n" +
					"Best Time: " + formatTime2(timeData[statSet[ia][1]]) + "<br/>\n" +
					"Worst Time: " + formatTime2(timeData[statSet[ia][2]]) + "<br/>\n" +
					"Standard Deviation: " + formatStdFull(statSet[ia][4], statSet[ia][3]) + "<br/><br/>\n";
				for(var i = iSolve - statSet[ia][0], j = 1; i < iSolve; i++, j++){
					toBracket = i == statSet[ia][1] || i == statSet[ia][2];
					tab.innerHTML += (j < 10 ? "&nbsp;" : "") + j + ". " + (toBracket ? "(" : "&nbsp;") +
					formatTime2(timeData[i]) + (toBracket ? ")" : "&nbsp;") +
					"&nbsp; " + scrambles[i] + "<br/>\n";
				}
			}else if(statSet[ia][5] > 0){
				tab.innerHTML +=
					"<em>Statistics for " + PUZZLE[config[CF_PZL][0]] + ":</em><br/><br/>\n" +
					"Best Average of " + statSet[ia][0] + ": " + formatTime2(statSet[ia][8]) + "<br/>\n" +
					"Best Time: " + formatTime2(timeData[statSet[ia][6]]) + "<br/>\n" +
					"Worst Time: " + formatTime2(timeData[statSet[ia][7]]) + "<br/>\n" +
					"Standard Deviation: " + formatStdFull(statSet[ia][9], statSet[ia][8]) + "<br/><br/>\n";
				for(var i = statSet[ia][5] - statSet[ia][0], j = 1; i < statSet[ia][5]; i++, j++){
					toBracket = i == statSet[ia][6] || i == statSet[ia][7];
					tab.innerHTML += (j < 10 ? "&nbsp;" : "") + j + ". " + (toBracket ? "(" : "&nbsp;") +
					formatTime2(timeData[i]) + (toBracket ? ")" : "&nbsp;") +
					"&nbsp; " + scrambles[i] + "<br/>\n";
				}
			}
		}
	}
}

// Reubild the time log only
function rebuildTimeLog(fromTime){
	var timeLog = document.getElementById("tab_times");
	for(var i = fromTime; i < iSolve; i++){
		logTime(timeLog, timeData[i], i);
	}
	for(var i = iSolve * 2; i < timeLog.childNodes.length; i++)
		timeLog.childNodes[i].innerHTML = "";
}

function selectAvg(avg, user){

	// Select avg according to current/best option setting
	avg = config[CF_CAVG][0] == 1 ? -Math.abs(avg) : Math.abs(avg);

	// If user click and previous is same as selected then display detail for that avg
	if(user && config[CF_HLI][0] == avg){
		displayDetail();
		return;
	}
	// Clear currently hilighted avg
	clearHilightedAvg();

	// index into statSet table
	var ia = avg == 0 ? -1 : avg < 0 ? -avg - 1 : avg - 1;
	var iMax = getMaxSet(iSolve);

	var times = document.getElementById("tab_times").childNodes;
	// Highlight selected avg
	if(avg != 0){

		if(avg < 0){
			if(ia <= iMax){
			for(var i = iSolve - statSet[ia][0]; i < iSolve; i++)
				times[i * 2].className =
					i == statSet[ia][1] ? "hilightbest" :
					i == statSet[ia][2] ? "hilightworst" :
					"hilight";
			}
		}else{
			if(ia <= iMax && statSet[ia][5] > 0){
				for(var i = statSet[ia][5] - statSet[ia][0]; i < statSet[ia][5]; i++){
					times[i * 2].className =
						i == statSet[ia][6] ? "hilightbest" :
						i == statSet[ia][7] ? "hilightworst" :
						"hilight";
				}
			}
		}
	}
	config[CF_HLI][0] = avg;
	if(user){
		displaySelectedAvg();
	}
	saveConfig(CF_HLI, config[CF_HLI][0]);
}

function clearHilightedAvg(){
	var avg = config[CF_HLI][0];
	var ia = avg == 0 ? -1 : avg < 0 ? -avg - 1 : avg - 1;
	var iMax = getMaxSet(iSolve);
	var times = document.getElementById("tab_times").childNodes;
	if(avg != 0){
		if(ia <= iMax){
			if(avg < 0){ // For current avgs of xx
				for(var i = iSolve - statSet[ia][0]; i < iSolve; i++)
					times[i * 2].className = "";
			}else{
				if(statSet[ia][5] > 0){ // For best avgs of xx
				for(var i = statSet[ia][5] - statSet[ia][0]; i < statSet[ia][5]; i++)
					times[i * 2].className = "";
				}
			}
		}
	}
}


function displaySelectedAvg(){

	document.getElementById("sm_av").innerHTML = formatTime2(statsAvg);

	if(config[CF_HLI][0] < 0){
		document.getElementById("sm_a5").innerHTML = iSolve < 5 ? "-.--" : formatTime2(statSet[0][3]);
		document.getElementById("sm_a12").innerHTML = iSolve < 12 ? "-.--" : formatTime2(statSet[1][3]);
	}else{
		document.getElementById("sm_a5").innerHTML = iSolve < 5 ? "-.--" : formatTime2(statSet[0][8]);
		document.getElementById("sm_a12").innerHTML = iSolve < 12 ? "-.--" : formatTime2(statSet[1][8]);
	}

	if(config[CF_HLI][0] == 0){
		if(iSolve > 0){
			document.getElementById("sm_bs").innerHTML = formatTime2(timeData[statsBest]);
			document.getElementById("sm_ws").innerHTML = formatTime2(timeData[statsWorst]);
			document.getElementById("sm_st").innerHTML = formatStd(statsStd, statsAvg);
		}
	}else{
		var iMax = getMaxSet(iSolve);
		if(config[CF_HLI][0] - 1 > iMax || -config[CF_HLI][0] - 1 > iMax){
			document.getElementById("sm_bs").innerHTML = formatTime2(0);
			document.getElementById("sm_ws").innerHTML = formatTime2(0);
			document.getElementById("sm_st").innerHTML = formatStd(0, 1);
		}else if(config[CF_HLI][0] < 0){
			document.getElementById("sm_bs").innerHTML = formatTime2(timeData[statSet[-config[CF_HLI][0] - 1][1]]);
			document.getElementById("sm_ws").innerHTML = formatTime2(timeData[statSet[-config[CF_HLI][0] - 1][2]]);
			document.getElementById("sm_st").innerHTML = formatStd(statSet[-config[CF_HLI][0] - 1][4], statSet[-config[CF_HLI][0] - 1][3]);
		}else{
			document.getElementById("sm_bs").innerHTML = formatTime2(timeData[statSet[config[CF_HLI][0] - 1][6]]);
			document.getElementById("sm_ws").innerHTML = formatTime2(timeData[statSet[config[CF_HLI][0] - 1][7]]);
			document.getElementById("sm_st").innerHTML = formatStd(statSet[config[CF_HLI][0] - 1][9], statSet[config[CF_HLI][0] - 1][8]);
		}
	}
	// Hilight relevant average
	document.getElementById("hd_a5").className = Math.abs(config[CF_HLI][0]) == 1 ? "hl1" : "hl0";
	document.getElementById("hd_a12").className = Math.abs(config[CF_HLI][0]) == 2 ? "hl1" : "hl0";
	document.getElementById("hd_av").className = config[CF_HLI][0] == 0 ? "hl1" : "hl0";
}

// Displays currently selected style
function displayStyle(sheet){
	// Switch stylesheet
	var a; var si = 0;
	var linkTags = document.getElementsByTagName("link");
	for(var i = 0; (a = linkTags[i]); i++) {
		if(a.getAttribute("rel").indexOf("style") != -1 && a.getAttribute("title")){
			a.disabled = true;
			if(si == sheet) a.disabled = false;
			si++;
		}
	}
	// Update checkbox images
	for(var i = 0; i < checkboxes.length; i++){
		document.getElementById("cfimg" + checkboxes[i]).src = config[checkboxes[i]][0] == 0 ?
			(config[CF_STYLE][0] == 0 ? "check_off.gif" : "check_off_.gif") :
			(config[CF_STYLE][0] == 0 ? "check_on.gif" : "check_on_.gif");
	}
}







// ================================[ Statistics ]====================================

// Generate statistics for overall solves, and multi-stage solves
function genStats(rebuild){

	if(iSolve == 0){
		resetStats();
		return;
	}

	// Unhilight the currently hilighted avg
	var curhl = config[CF_HLI][0];
	if(!rebuild){
		iSolve--;
//		selectAvg(0, false);
		clearHilightedAvg();
		iSolve++;
	}

	// If full generate, rather than incramental update, then all
	// stat sets need to be re-generated
	if(rebuild){
		initStatSet();
		for(var i = statSet[0][0]; i < iSolve; i++) genStatSet(i);
	}

	statsBest = 0;
	statsWorst = 0;
	statsAvg = 0;
	statsStd = 0;

	var nDNF = 0;
	var nPnl = 0;
	for(var i = 0; i < iSolve; i++){

		statsBest = addPenalty(timeData[i]) < addPenalty(timeData[statsBest]) ? i : statsBest;
		statsWorst = addPenalty(timeData[i]) > addPenalty(timeData[statsWorst]) ? i : statsWorst;
		if(statsAvg > Number.MAX_VALUE || timeData[i] > Number.MAX_VALUE) statsAvg = Number.POSITIVE_INFINITY;
		else statsAvg += addPenalty(timeData[i]);

		if(timeData[i] >= Number.MAX_VALUE) nDNF++;
		else if(timeData[i] < 0) nPnl++;
	}

	// Calculate standard deviation
	if(statsAvg < Number.MAX_VALUE){
		statsAvg /= iSolve; statsAvg = round10(statsAvg); }
	for(var i = 0; i < iSolve; i++){
		if(statsAvg < Number.MAX_VALUE)
				statsStd += Math.pow(addPenalty(timeData[i]) - statsAvg, 2);
	}
	statsStd = Math.sqrt(statsStd / iSolve);


	genStatSet(iSolve);

	// Display stats in the summary heading
	document.getElementById("sm_no").innerHTML = iSolve;

	// Highlight the updated avg
	if(!rebuild) selectAvg(curhl, false);
	displaySelectedAvg();


}

// Generates stats set up to the given index
function genStatSet(idx){
	// Iterate for that many elements to calculate rolling averages/standard deviations
	var maxSet = getMaxSet(idx);
	if(maxSet == -1) return maxSet;

	// Initialise statSet variables
	for(var j = 0; j <= maxSet; j++){
		statSet[j][1] = idx-1; // Current Min
		statSet[j][2] = idx-1; // Current Max
		statSet[j][3] = 0; // Current Avg
		statSet[j][4] = 0; // Current Std
	}
	// Calculate Totals
	var nDNFs = Array(maxSet + 1);
	for(var j = 0; j <= maxSet; j++) nDNFs[j] = 0;
	for(var i = idx - statSet[maxSet][0]; i < idx; i++){
		for(var j = 0; j <= maxSet; j++){
			// Only update this set if the index is with the last n elements
			if(idx - i <= statSet[j][0]){
				if(timeData[i] > Number.MAX_VALUE) nDNFs[j]++;
				else statSet[j][3] += addPenalty(timeData[i]);
				if(addPenalty(timeData[i]) < addPenalty(timeData[statSet[j][1]])) statSet[j][1] = i;
				if(addPenalty(timeData[i]) > addPenalty(timeData[statSet[j][2]])) statSet[j][2] = i;
			}
		}
	}
	// Calculate Mean
	for(var j = 0; j <= maxSet; j++){
//debug("calcMean" + idx + ": " + statSet[j][3]);
		if(nDNFs[j] == 0)
			statSet[j][3] = (statSet[j][3]
			- addPenalty(timeData[statSet[j][1]])
			- addPenalty(timeData[statSet[j][2]])) / (statSet[j][0] - 2);
		 // If the max is a DNF then it wasn't added so don't take it away
 		else if(nDNFs[j] == 1)
			statSet[j][3] = (statSet[j][3]
			- addPenalty(timeData[statSet[j][1]])) / (statSet[j][0] - 2);
		// More than 1 DNF means the average is DNF
		else
			statSet[j][3] = Number.POSITIVE_INFINITY;
		if(statSet[j][3] < Number.MAX_VALUE) statSet[j][3] = round10(statSet[j][3]);
//debug("result" + idx + ": " + statSet[j][3]);
	}

	// Calculate square of difference from mean
	for(var i = idx - statSet[maxSet][0]; i < idx; i++){
		for(var j = 0; j <= maxSet; j++){
			// Only update this set if the index is with the last n elements
			if(idx - i <= statSet[j][0]){
				if(i != statSet[j][1] && i != statSet[j][2] && statSet[j][3] < Number.MAX_VALUE)
					statSet[j][4] += (addPenalty(timeData[i]) - statSet[j][3]) * (addPenalty(timeData[i]) - statSet[j][3])
			}
		}
	}
	// Calculate standard deviation, and check if best avg so far
	for(var j = 0; j <= maxSet; j++){
		statSet[j][4] = Math.sqrt(statSet[j][4] / (statSet[j][0] - 2));
		// Is it the best avg so far?
//debug("setCurrent:" + statSet[j][3] + ", setBest:" + statSet[j][8])
		if(statSet[j][3] < statSet[j][8] || statSet[j][8] > Number.MAX_VALUE){
			statSet[j][5] = idx;
			statSet[j][6] = statSet[j][1];
			statSet[j][7] = statSet[j][2];
			statSet[j][8] = statSet[j][3];
			statSet[j][9] = statSet[j][4];
		}
	}

	return maxSet;
}

// Returns index highest stats set we can get stats for (-1 if none are viable)
function getMaxSet(idx){
	var maxSet = -1;
	for(var i = 0; i < statSet.length; i++){
		if(statSet[i][0] > idx) break;
		maxSet = i;
	}
	return maxSet;
}

// Clears all times and re-initialises stats back to 0
function resetStats(){
	// Clear time log
	document.getElementById("tab_times").innerHTML = "";
	// Clear stats summary
	document.getElementById("sm_no").innerHTML = 0;
	document.getElementById("sm_bs").innerHTML = formatTime(0);
	document.getElementById("sm_ws").innerHTML = formatTime(0);
	document.getElementById("sm_av").innerHTML = formatTime(0);
	document.getElementById("sm_a5").innerHTML = "-.--"; //formatTime(0);
	document.getElementById("sm_a12").innerHTML = "-.--"; //formatTime(0);
	document.getElementById("sm_st").innerHTML = formatStd(0, 1);
	// Clear scramble log and and set last generated one to first
	document.getElementById("tab_detail").innerHTML = "";
	scrambles[0] = scrambles[iSolve];
}

function addPenalty(time){
	if(time > Number.MAX_VALUE) return Number.POSITIVE_INFINITY;
	return time < 0 ? -time + PENALTY : time;
}




// ===========================[ Utilities ]=============================
// Persistantly sets a config value
function saveConfig(id, value){
	config[id][0] = value;
	createCookie("ctimer" + id, config[id][0], 365);
}
// Sets the named cookie with a given expiration value
function createCookie(cname, value, days){
	if(days){
		var date = new Date();
		date.setTime(date.getTime()+(days*24*60*60*1000));
		var expires = "; expires="+date.toGMTString();
	}
	else expires = "";
	document.cookie = cname+"="+value+expires+"; path=/";
}

// Reads the named cookie and returns its value, or null if not set
function readCookie(cname){
	var nameEQ = cname + "=";
	var ca = document.cookie.split(';');
	for(var i=0;i < ca.length;i++){
		var c = ca[i];
		while(c.charAt(0)==' ') c = c.substring(1,c.length);
		if(c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
	}
	return null;
}

// Saves the current times in a cookie
function saveTimes(){
	var str = "";
	var row = "";
//debug("isolve:" + iSolve + ", toSave:" + timeData);
	for(var i = 0; i < iSolve; i++){
		row = (timeData[i] < 0 ? -timeData[i] : timeData[i]);
		row += timeData[i] >= Number.MAX_VALUE ? "_" : "";
		str += row + (i < iSolve - 1 ? "," : "");
	}
//debug("timestr=" + str);
//debug("saving times");
	// Store times for a month
	createCookie("ctimerTimes", str, 31);
}

// Loads previously saved times from a cookie
function loadTimes(){
	timeData = Array();
	var str = readCookie("ctimerTimes");
	if(str == null || str == "") return;
	var ary = str.split(",");
	iSolve = ary.length;
	timeData = Array();
	var t = 0;
	var total = 0;
	for(var i = 0; i < iSolve; i++){
		var ary2 = ary[i].split(" ");
		var nSteps = ary2.length;
		timeData[i] = 0;
		total = 0;
//debug("cookieTimes:" + str + ", n times:" + ary.length + " ary:" + ary);
		for(var j = 0; j < nSteps; j++) if(ary2[j] != ''){
			if(ary2[j].charAt(ary2[j].length - 1) == "_"){
				total = Number.POSITIVE_INFINITY;
				ary2[j] = ary2[j].substring(0, ary2[j].length - 1);
			}
			if(isFinite(ary2[j]))
				t = parseInt(ary2[j], 10);
			else	t = Number.POSITIVE_INFINITY;
			if(total < Number.MAX_VALUE && t < Number.MAX_VALUE) total += t;
			else total = Number.POSITIVE_INFINITY;
		}
		timeData[i] = total;
	}
}
function saveScrambles(){
//debug("save scrambles:" + scrambles);
	var data = "";
	if(scrambles.length > 0){
		data = compressScr(scrambles[0]);
		for(var i = 1; i <= iSolve; i++)
			data += "," + compressScr(scrambles[i]);
	}
	// Store for a month
	createCookie("ctimerScrm", data, 31);
}
function loadScrambles(){
	var data = readCookie("ctimerScrm");
	if(data == null) return;
	var ary = data.split(",");
//debug("read scrambles:" + ary);
	for(var i = 0; i < ary.length; i++) if(ary[i] != "")
		scrambles[i] = inflateScr(ary[i]);
//debug("loaded scrambles:" + scrambles);
}
function inflateScr(inp){
	var out = "";
	if(config[CF_PZL][0] <= 7 || config[CF_PZL][0] == 12){// Inflate cube and pyraminx algs
		for(var i = 0; i < inp.length; i++){
			var n = inp.charCodeAt(i) - 65;
			out += FACES3[n % 18] + POW[Math.floor(n / 18)] + " ";
		}
	}
	else if(config[CF_PZL][0] == 11){ // Inflate sq-1 alg
		for(var i = 0; i < inp.length; i++){
			var n = inp.charCodeAt(i) - 65;
			var n1 = n % 12 - 5;
			var n2 = Math.floor(n / 12) - 5;
			out += "(" + n1 + "," + n2 + ") ";
		}
	}
	else if(config[CF_PZL][0] == 13){ // Inflate megaminx alg
//debug("inflating minx alg");
		for(var i = 0; i < inp.length; i += 2){
			var n1 = inp.charCodeAt(i) - 65;
			var n2 = inp.charCodeAt(i+1) - 65;
//		debug("n="+n);
//debug(i + "in: n1=" + n1 + " n2=" + n2);
			for(var j = 0; j < 5; j++)
				out += (j % 2 == 0 ? "R" : "D") + ((n1 & (1 << j)) == 0 ? "-- " : "++ ");
			for(var j = 0; j < 5; j++)
				out += (j % 2 == 1 ? "R" : "D") + ((n2 & (1 << j)) == 0 ? "-- " : "++ ");
			out += ((n2 & (1 << 5)) == 0 ? "U' " : "U  ");
		}

	}
//debug("in:" + inp + ", out:" + out);
	return out;
}
function compressScr(inp){
	if(inp == null || inp == "") return "";
	var out = "";
	if(config[CF_PZL][0] <= 7 || config[CF_PZL][0] == 12){// Compress cube and pyraminx algs
		var i = 0;
		var m = -1;
		while(i < inp.length){
			if(inp.charAt(i) == '3'){
				i++;
				m = getMove(inp.charAt(i));
				if(m != -1) m += 6;
			}
			else m = getMove(inp.charAt(i));
			if(m != -1)
				out += String.fromCharCode(m + 18 * getPow(inp.charAt(++i)) + 65);
			i++;
		}
	}
	else if(config[CF_PZL][0] == 11){ // Compress sq-1 alg
		var i = -1;
		var n1 = 0, n2 = 0;
		while(++i < inp.length){
			if(inp.charAt(i) != '(') continue;
			n1 = 0; n2 = 0;
			i++;
			if(inp.charAt(i) == "-"){
				i++;
				n1 = -parseInt(inp.charAt(i), 10);
			}else n1 = parseInt(inp.charAt(i), 10);
			i += 2;
			if(inp.charAt(i) == "-"){
				i++;
				n2 = -parseInt(inp.charAt(i), 10);
			}else n2 = parseInt(inp.charAt(i), 10);
			out += String.fromCharCode((n1+5) + (n2+5)*12 + 65);
		}
	}
	else if(config[CF_PZL][0] == 13){ // Compress megaminx alg
		var n1 = 0, n2 = 0;
		for(var i = 0; i < 7; i++){
			n1 = 0; n2 = 0;
			for(var j = 0; j < 5; j++){
				n1 += inp.charAt(i * 43 + j * 4 + 1) == "+" ? 1 << j : 0;}
			for(var j = 0; j < 5; j++){
				n2 += inp.charAt(i * 43 + (j+5) * 4 + 1) == "+" ? 1 << j : 0;}
			n2 += inp.charAt(i * 43 + 41) == "'" ? 0 : 1 << 5;
//debug(i + "out: n1=" + n1 + " n2=" + n2);
			out += String.fromCharCode(n1 + 65);
			out += String.fromCharCode(n2 + 65);
		}
	}
	return out;
}
function getMove(c){
	switch(c){
		case 'U' : return 0;
		case 'R' : return 1;
		case 'F' : return 2;
		case 'D' : return 3;
		case 'L' : return 4;
		case 'B' : return 5;
		case 'u' : return 6;
		case 'r' : return 7;
		case 'f' : return 8;
		case 'd' : return 9;
		case 'l' : return 10;
		case 'b' : return 11;
	}
	return -1;
}
function getPow(c){
	switch(c){
		case '2' : return 1;
		case '\'' : return 2;
	}
	return 0;
}
function round10(n){
	n += 5;
	return n - n % 10
}
function getTimeNow(){
	var now = new Date().getTime();
	return now - now % 10;
}

// =========================[ Debugging ]=============================

function debug(msg){
	document.getElementById("footer").innerHTML += "<br/>\n" + msg;
}
