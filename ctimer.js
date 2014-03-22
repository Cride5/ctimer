/*
File: cTimer.js
Author: Conrad Rider (www.crider.co.uk)
Date: 20/11/09
Copyright 2009: All rights reserved.

BUGS:


TODO:
* Buttons to rotate cube directly (replaces orientation selector)



*/


var CTimer = (function(){
	
	// Constructor
	var CTimer = function(){};


	// Constants
	
	var 
	FACES = ['U', 'R', 'F', 'D', 'L', 'B'],
	FACES2 = ['u', 'r', 'f', 'd', 'l', 'b'],
	FACES3 = ['U', 'R', 'F', 'D', 'L', 'B', 'u', 'r', 'f', 'd', 'l', 'b', '3u', '3r', '3f', '3d', '3l', '3b'],
	POW = ['', '2', "'"],
	PUZZLE = ["Clock", "", "2x2x2 Cube", "3x3x3 Cube", "4x4x4 Cube", "5x5x5 Cube", "6x6x6 Cube", "7x7x7 Cube", "", "", "", "Square-1", "Pyraminx", "Megaminx"],
	RTNS = [   null,    null,      "",    "y2",     "y", "y'"   ,
		   null,    null, "x2 y2",    "x2", "x2 y" , "x2 y'",
		"x y2" , "x"    ,    null,    null, "x y"  , "x y'" ,
		"x'"   , "x' y2",    null,    null, "x' y" , "x' y'",
		"z' y'", "z' y" ,  "z'"  , "z' y2",    null,   null,
		"z y"  , "z y'" ,  "z"   , "z y2" ,    null,   null],
	PENALTY = 2000, // Time penalty in milliseconds
	// Config options
	// Identifiers
	CF_ISPCT = 0,
	CF_STYLE = 1,
	CF_SCIMG = 2,
	CF_RTN = 3,
	CF_HLI = 4,
	CF_TAB = 5,
	CF_STIME = 6,
	CF_RSTAT = 7,
	CF_PZL = 8,
	CF_CENTI = 9,
	CF_SHOW = 10,

	TYBUL = 0,
	TYNUM = 1,
	TYSTR = 2,
	// State constants
	READY = 0,
	STOPPED = 1,
	RUNNING = 2,
	INSPECTION = 3,
	INSPECTION_ = 4;


	// Variables
	var
	menuVisible,
	config,
	checkboxes,
	timeData,
	scrambles,
	iSolve,
	nSteps,
	timeToggle,
	kdown,
	origTime,
	processing,
	waitingScramble,
	pzlTop,
	// Timer variables
	state,
	startTime,
	statsBest,
	statsWorst,
	statsAvg,
	statsStd,
	timerStopped,
	refresh,
	insStart,
	insTimeout,
	insPenalty,
	iStep,
	// Stats
	statSet;

	// Initialise the app on first load
	CTimer.init = function(){
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
			[1, TYBUL], // Display Centiseconds
			[1, TYBUL]  // Display Timer
		]; 
		checkboxes = [CF_STYLE, CF_SCIMG, CF_RSTAT, CF_CENTI, CF_SHOW];

	//debug("config["+9+"][0]:" + config);

		// Read cookies and display config 
		for(var i = 0; i < config.length; i++){
			var cv = readCookie("ctimer" + i);
			// For strings just import direct
			if(config[i][1] === TYSTR){
				if(cv) config[i][0] = cv;
			}else{ // Parse numerics
				var nv = parseInt(cv, 10);
				if(!isNaN(nv)) config[i][0] = nv;
			}
	//debug("cookie:" + i + "=" + config[i][0]);
			// Initialise config screen with values
			if(i === CF_ISPCT)
				document.getElementById("config" + i).value = config[i][0];
		}
		timeData = Array();
		scrambles = Array();
		iSolve = 0;
		nSteps = 1;
		timeToggle = 0;
		kdown = false;
		displayStyle(config[CF_STYLE][0]);
		loadTimes(); // Load times from cookie
		loadScrambles();
		if(iSolve > 0) origTime = timeData[iSolve - 1][2];
		// Initialise the rest
		initTimer();
		rebuildTimeLog(0);
		buildBreakdown();
		genStats(true);
		processing = false;
		CTimer.selectAvg(config[CF_HLI][0], false);
		enableJava(config[CF_RSTAT][0] === 1);
	//	config[CF_RSTAT][0] = 0;
		initSolver2x2();
		waitingScramble = null;
		genScramble(false);
		setTimeout(genScrambleDelayed, 50);

	//debug("tab=|" + config[CF_TAB][0] + "|");
		if(config[CF_TAB][0] !== ""){
			var t = config[CF_TAB][0];
			config[CF_TAB][0] = "";
			CTimer.toggleTab(t);
		}
		displayStyle(config[CF_STYLE][0]);
	//document.write("BLAH");
	};

	// Initialise timer whenever times are reset
	var initTimer = function(){
		state = READY;
		startTime = Array();
		statsBest = Array();
		statsWorst = Array();
		statsAvg = Array();
		statsStd = Array();
		timerStopped = getTimeNow();
		initStatSet();
		document.getElementById("time").innerHTML = formatTime2(iSolve > 0 ? timeData[iSolve - 1][nSteps] : 0);
		refresh = 0;
		insTimeout = 0;
		insPenalty = false;
		iStep = 0;
	};
	// Initialise the stats variable
	var initStatSet = function(){
		// Indices into this array represent:
		// 0 = Avg of x
		// (current stats) 1 = i min, 2 = i max, 3 = avg, 4 = std
		// (best stats) 5 = index, 6 = i min, 7 = i max, 8 = avg, 9 = std
		statSet = [
			[5, 0, 0, 0, 0, 0, 0, 0, Number.POSITIVE_INFINITY, 0],
			[12, 0, 0, 0, 0, 0, 0, 0, Number.POSITIVE_INFINITY, 0],
			[50, 0, 0, 0, 0, 0, 0, 0, Number.POSITIVE_INFINITY, 0],
			[100, 0, 0, 0, 0, 0, 0, 0, Number.POSITIVE_INFINITY, 0],
			[200, 0, 0, 0, 0, 0, 0, 0, Number.POSITIVE_INFINITY, 0],
			[500, 0, 0, 0, 0, 0, 0, 0, Number.POSITIVE_INFINITY, 0],
			[1000, 0, 0, 0, 0, 0, 0, 0, Number.POSITIVE_INFINITY, 0],
			[2000, 0, 0, 0, 0, 0, 0, 0, Number.POSITIVE_INFINITY, 0],
			[5000, 0, 0, 0, 0, 0, 0, 0, Number.POSITIVE_INFINITY, 0],
			[10000, 0, 0, 0, 0, 0, 0, 0, Number.POSITIVE_INFINITY, 0]];
	};





	// ========================[ User Input ]=====================

	// Set time to +2, DNF, or remove on user request
	CTimer.toggleTime = function(){
		if(state === RUNNING || iSolve === 0 || processing) return;
		processing = true;
		// Record original time
		if(isNaN(origTime))
			origTime = timeData[iSolve - 1][nSteps];
		if((timeToggle === 2 || origTime > Number.MAX_VALUE) && CTimer.delSolve(iSolve - 1, false)){
			timeToggle = 0;
			origTime = iSolve > 0 ? timeData[iSolve - 1][nSteps] : 0;
		}
		else
			timeToggle = (timeToggle + 1) % 3;
		if(iSolve > 0){
			switch(timeToggle){
				case 0 : timeData[iSolve - 1][nSteps] = origTime; break;
				case 1 : timeData[iSolve - 1][nSteps] = origTime < Number.MAX_VALUE ? -origTime : origTime; break;
				case 2 : timeData[iSolve - 1][nSteps] = Number.POSITIVE_INFINITY; break;
			}
		}
		clearHilightedAvg();
		genStats(true);
		displayTime(iSolve > 0 ? timeData[iSolve - 1][nSteps] : 0, iSolve - 1);
		rebuildTimeLog(iSolve - 1);
		CTimer.selectAvg(config[CF_HLI][0], false);
		saveTimes();
		processing = false;
	};


	// Rotate cube's orientation for scrambles
	/*var turnCube = function(){
		if(processing) return; processing = true;
		config[CF_RTN][0] = (config[CF_RTN][0] + 1) % 24;
		showCube(document.getElementById("cubeimg"), scrambles[iSolve]);
		saveConfig(CF_RTN, config[CF_RTN][0]);
		processing = false;
	}
	*/
	// Switch tabs on user request
	CTimer.toggleTab = function(tab){
		if(processing || !config) return; processing = true;
		if(config[CF_TAB][0] !== ""){
			document.getElementById("tab_" + config[CF_TAB][0]).className = "tab_hidden";
			document.getElementById("link_" + config[CF_TAB][0]).className = "tab_link";
			if(tab === config[CF_TAB][0]){
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
	};

	// Hide tabs on user request
	var hideTabs = function(){
		document.getElementById("fbox").className = "minimised";
		document.getElementById("ftabs").className = "showline";
	};

	// Close detail box
	CTimer.closeDetail = function(){
		document.getElementById("detail_box").className = "tab_hidden";
	};
	CTimer.openDetail = function(){
		document.getElementById("detail_box").className = "tab_visible";
	};

	// Switch options
	CTimer.toggleConfig = function(id, element){
		if(processing) return; processing = true;
		var img = element.childNodes[0];
		// Only change config for random-state scrambles if they are supported
		if(id === CF_RSTAT && !enableJava(config[CF_RSTAT][0] === 0)){
			processing = false;
			return;
		}
		if(config[id][0] === 1){
			config[id][0] = 0;
			img.src = config[CF_STYLE][0] === 0 ? "check_off.gif" : "check_off_.gif";
		}
		else{
			config[id][0] = 1;
			img.src = config[CF_STYLE][0] === 0 ? "check_on.gif" : "check_on_.gif";
		}
		saveConfig(id, config[id][0]);
		// Config specific triggers
		switch(id){
			case CF_STYLE : displayStyle(config[id][0]); break;
			case CF_SCIMG : showCube(document.getElementById("cubeimg"), scrambles[iSolve]); break;
			case CF_RSTAT : waitingScramble = null; setTimeout(genScrambleDelayed,50); break;
		}
		processing = false;
	};

	CTimer.setConfig = function(id, value){
		if(processing) return; processing = true;
		if(value === "") config[id][0] = 0;
		else{
			var val = parseInt(value, 10);
			if(val < config[id][2]) config[id][0] = config[id][2];
			else if(val > config[id][3]) config[id][0] = config[id][3];
			else if(!isNaN(val)) config[id][0] = val;
		}
		document.getElementById("config" + id).value = config[id][0];
		saveConfig(id, config[id][0]);
		processing = false;
	};

	// Remove all times and re-set statistics
	CTimer.reset = function(){
		iStep = nSteps - 1;
		// Carry out stopTimer tasks
		if(state !== STOPPED){
			state = STOPPED;
			clearInterval(refresh);
			if(state === INSPECTION || state === INSPECTION_)
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
		setTimeout(genScrambleDelayed,50);  
	};

	// Adds a step to multi-stage statistics
	CTimer.addStep = function(){
		if(processing) return; processing = true;
		if(iSolve > 0 && !confirm("This will reset the current time log. Are you sure?")){
			processing = false;
			return;	
		}	
		CTimer.reset();
		nSteps++;
		addBrkCols();
	//	document.getElementById("steps").innerHTML = nSteps;
		processing = false;
	};
	// Adds columns to the breakdown table until there are enough to accomodate the number of steps
	var addBrkCols = function(){
		var table = document.getElementById("breakdown_table");
		while(table.rows[0].cells.length < nSteps + 3){
			for(var i = 0; i < table.rows.length; i++){
				var nCell = table.rows[i].insertCell(table.rows[i].cells.length - 2);
				nCell = table.rows[i].cells[table.rows[i].cells.length - 3];
				if(i < 5){
					if(i < 3)
						nCell.innerHTML = formatTime(0);
					else if(i === 3)
						nCell.innerHTML = formatStd(0, 1);
					else{
						nCell.innerHTML = "step " + nSteps;
						nCell.className = "thead";
					}
				}
				else
					nCell.innerHTML = formatTime(0);
			}
		}
	};

	// Removes a step from multi-stage statistics, and clears stats
	CTimer.delStep = function(){
		if(processing) return; processing = true;	
		var table = document.getElementById("breakdown_table");
		if(nSteps <= 1 || (iSolve > 0 && !confirm("This will reset the current time log. Are you sure?"))){
			processing = false;
			return;
		}
		CTimer.reset();
		nSteps--;
		for(var i = 0; i < table.rows.length; i++)
			table.rows[i].deleteCell(table.rows[i].cells.length - 3);
	//	document.getElementById("steps").innerHTML = nSteps;
		processing = false;
	};

	// Removes a single solve and updates statistics accordingly
	CTimer.delSolve = function(row, user){
		if(user && (processing || state !== READY)) return; processing = true;
		if(!confirm("Delete solve " + (row + 1) + ".  Are you sure?")){
			processing = false;
			return false;
		}
		// Clear currently hilighted avg
		clearHilightedAvg();
		// Delete row from breakdown table
		var table = document.getElementById("breakdown_table");
		table.deleteRow(row + 5);
		// Cascade all next solves to previous element
		for(var i = row; i < iSolve; i++){
			table.rows[i + 5].cells[0].innerHTML = i + 1;
			table.rows[i + 5].cells[nSteps + 2].innerHTML = '<a href="#" onclick="CTimer.delSolve('+i+', true); return false;">x</a>';
			if(i < iSolve - 1){
				for(var j = 0; j <= nSteps; j++) timeData[i][j] = timeData[i + 1][j];
			}
			scrambles[i] = scrambles[i + 1];
		}
		scrambles[iSolve] = '';
		table.rows[iSolve + 4].cells[nSteps + 2].innerHTML = "";
		iSolve--;
		// Delete frow from stats table if necessery
	/*	var table2 = document.getElementById("stats_table");
		var maxSet = getMaxSet(iSolve);
		for(var i = table2.rows.length -1 ; i > maxSet + 1; i--){
			table2.deleteRow(i);
		}
	*/	if(iSolve > 0) document.getElementById("time").innerHTML
			= formatTime2(timeData[iSolve - 1][nSteps]);
		genStats(true);
		var timeLog = document.getElementById("tab_times");
	//	debug("nrow=" + timeLog.childNodes[row * 2].innerHTML);
		if(iSolve === 0) timeLog.innerHTML = "";
		else{
			timeLog.removeChild(timeLog.childNodes[row * 2]);
			if(row > 0) timeLog.removeChild(timeLog.childNodes[row * 2 - 1]);
			else timeLog.removeChild(timeLog.childNodes[0]);
		}
		rebuildTimeLog(row);
		CTimer.selectAvg(config[CF_HLI][0]);
		saveTimes();
		saveScrambles();
		origTime = NaN;
		if(user) processing = false;
		return true;
	};








	// ========================[ Menu Functions ]======================
	CTimer.popupPzlMenu = function(e){
		if(menuVisible) return;
		menuVisible = true;
		var menu = document.getElementById("pzl_menu");
		menu.style.top = (e.clientY - 3) + "px";
		menu.style.left = (e.clientX - 3) + "px";
		CTimer.showPzlMenu();
	};
	CTimer.showPzlMenu = function(){
		if(!menuVisible) return;
	//debug("show pzl menu...");
		document.getElementById("pzl_table").className="menu";
	};
	CTimer.showTopMenu = function(){
		CTimer.showPzlMenu();
		document.getElementById("top_table").className="menu";
	};
	CTimer.showFrontMenu = function(uCol){
		if(uCol >= 0) pzlTop = uCol;
	//debug("pzlTop:" + pzlTop);
		CTimer.showTopMenu();
		var ftable = document.getElementById("front_table");
		var ttable = document.getElementById("top_table");
		var bs = Math.floor(pzlTop / 2);
		for(var i = 0; i < 6; i++){
			ftable.rows[i + 1].cells[0].className = (bs === Math.floor(i/2) ? "td_grey" : "");
			ttable.rows[i + 1].cells[0].className = (i === pzlTop ? "td_active" : "");
		}
		ftable.className="menu";

	};
	CTimer.hideMenus = function(e){
		if(!menuVisible) return;
		var menu = document.getElementById("pzl_menu");
		var top = parseInt(menu.style.top, 10);
		var left = parseInt(menu.style.left, 10);
		if(e.clientY > top && e.clientY < top + menu.offsetHeight
		&& e.clientX > left && e.clientX < left + 250) return;
		hidePzlMenu();
	//debug("hiding menu");
	//debug("top:" + menu.style.top + ", left" + menu.style.left + ", width:" + menu.offsetWidth + " height:" + menu.offsetHeight + " mx:" + e.clientX + " my:" + e.clientY);
	};
	var hidePzlMenu = function(){
		CTimer.hideTopMenu();
		document.getElementById("pzl_menu").style.top = "0px";
		document.getElementById("pzl_menu").style.left = "0px";
		document.getElementById("pzl_table").className="menu_hidden";
		menuVisible = false;
	};
	CTimer.hideTopMenu = function(){
		CTimer.hideFrontMenu();
		document.getElementById("top_table").className="menu_hidden";
	};
	CTimer.hideFrontMenu = function(){
		document.getElementById("front_table").className="menu_hidden";
	};
	CTimer.selectOri = function(fCol){
		hidePzlMenu();
		if(processing || RTNS[6 * pzlTop + fCol] === null) return; processing = true;
		config[CF_RTN][0] = 6 * pzlTop + fCol;
	//	showCube(new Image(), scrambles[iSolve]);
		showCube(document.getElementById("cubeimg"), scrambles[iSolve]);
		saveConfig(CF_RTN, config[CF_RTN][0]);
		processing = false;
	};
	CTimer.selectPuzzle = function(pzl){
		hidePzlMenu();
		if(processing || pzl === config[CF_PZL][0] ||
		(iSolve > 0 && !confirm("This will clear the current time log. Are you sure?"))) return; processing = true;
		config[CF_PZL][0] = pzl;
		CTimer.reset();
		saveConfig(CF_PZL, pzl);
		processing = false;
	};











	// ========================[ Timer Functions ========================

	// Start timer when space is released (NOTE; this is also called on key up when stopping)
	CTimer.startTimer = function(event){
		var now = getTimeNow();
		// allow multiple keys to be pressed when first starting the timer
		if(kdown) kdown = false; else if(state !== READY) return; 
	//debug("key=" + event.keyCode + ",iSep:" + iStep + ",nStep:" + nSteps + " state:" + state);
		// Filter for a valid key
		if(event && !(event.keyCode === 32 ||
		(event.keyCode >= 0 && event.keyCode <= 255 && iStep === 0 && state === STOPPED)))
			return;
		if(state === STOPPED){ state = READY;
			return; }
		else if(state === RUNNING)
			return;
		if(now - timerStopped < 350) return;
		// Do inspection if necessery
		if(config[CF_ISPCT][0] > 0){
			if(state === INSPECTION || state === INSPECTION_){
				state = RUNNING;
				clearTimeout(insTimeout);
				startTime[0] = now;
				timeToggle = 0;
				origTime = Number.NaN;
				timeData[iSolve] = Array();
			}
			else{
				state = INSPECTION;
				document.getElementById("time").innerHTML = config[CF_ISPCT][0];
				insStart = now;
				refresh = setInterval(update, 20);
				insTimeout = setTimeout(endInspection, config[CF_ISPCT][0] * 1000);
			}
			return;
		}
		state = RUNNING;
		startTime[0] = now;
		timeToggle = 0;
		origTime = Number.NaN;
		timeData[iSolve] = Array();
		refresh = setInterval(update, 20);
	};

	// Stop timer when space is pressed
	CTimer.stopTimer = function(event){
		var now = getTimeNow();
		if(!kdown) kdown = true; else return;
		// only allow space on multi-stage mode, but allow other keys in normal mode
	//	if(event && !(event.keyCode === 32 ||
	//	!(event.keyCode >= 0 && event.keyCode <= 255 && iStep === nSteps -1)))
		// Allow all keys to stop timer
		if(event && !(event.keyCode >= 0 && event.keyCode <= 255))
			return;
		if(state !== RUNNING)
			return;
		// Ensure small delay between steps in multi-stage mode
		if(nSteps > 1 && now - startTime[iStep] < 100)
			return;
		updateTime(now);
		timeData[iSolve][iStep] = now - startTime[iStep];
		if(iStep === nSteps - 1){
			state = STOPPED;
			timerStopped = now;
			clearInterval(refresh);
			timeData[iSolve][nSteps] = insPenalty ? -now + startTime[0] : now - startTime[0];
			displayTime(timeData[iSolve][nSteps], iSolve);
			logTime(document.getElementById("tab_times"), timeData[iSolve][nSteps], iSolve);
			origTime = timeData[iSolve][nSteps];
			nextSolve();
		}
		else startTime[++iStep] = now;
	};

	// Shows the current time during timing
	var update = function(){
		if(state === INSPECTION){
			var time = new Date().getTime() - insStart;
			document.getElementById("time").innerHTML = time < 0 ? 1 : Math.floor(((config[CF_ISPCT][0] + 1) * 1000 - time) * 0.001);
		}
		else if(state === INSPECTION_)
			document.getElementById("time").innerHTML = "+" + Math.floor(PENALTY * 0.001);
		else updateTime(new Date().getTime());
	};

	//
	var endInspection = function(){
		if(state === INSPECTION){
			state = INSPECTION_;
			insPenalty = true;
			insTimeout = setTimeout(endInspection, 2000);
		}else if(state === INSPECTION_){
			state = READY;
			clearInterval(refresh);
			timeData[iSolve] = Array();
			// Fill entries in breakdown table and display
			for(var i = 0; i < nSteps; i++){
				timeData[iSolve][i] = Number.POSITIVE_INFINITY;
				document.getElementById("breakdown_table").rows[iSolve + 5].cells[i + 1].innerHTML = formatTime2(timeData[iSolve][i]);
			}
			timeData[iSolve][nSteps] = Number.POSITIVE_INFINITY;
			document.getElementById("breakdown_table").rows[iSolve + 5].cells[nSteps + 1].innerHTML = formatTime2(timeData[iSolve][nSteps]);
			displayTime(timeData[iSolve][nSteps], iSolve);
			logTime(document.getElementById("tab_times"), timeData[iSolve][nSteps], iSolve);
			origTime = timeData[iSolve][nSteps];
			nextSolve();
		}
	};

	// Prepare env for next solve
	var nextSolve = function(){
		logBreakdown(iSolve);
		iSolve++;
		saveTimes();
		iStep = 0;
		insPenalty = false;
		brkAddRow(iSolve);
		genStats(false);
		genScramble(false);

	};

	// Generate a scramble
	// TODO: This needs to support multiple puzzles, and eventually random-state scrambles
	var genScramble = function(replace){
	//debug("genScramble:" + scrambles[iSolve]);
		if(scrambles[iSolve] && scrambles[iSolve].length > 0 && !replace){
	//debug("scramble exists");
			document.getElementById("scramble").innerHTML = scrambles[iSolve];
			return;
		}
		if(waitingScramble){
	//debug("assigned waiting scramble:" + waitingScramble);
			scrambles[iSolve] = waitingScramble;
			waitingScramble = null;
			setTimeout(genScrambleDelayed,50);  
		}
		// If the delayed scramble generator isn't finished then just generate one now
		else scrambles[iSolve] = genScramble_();
		// Generate scramble dependin on puzzle
		document.getElementById("scramble").innerHTML = scrambles[iSolve];
	//	logScramble(document.getElementById("tab_detail"), scrambles[iSolve]);
	//debug("showing cube from genscramble");
		showCube(document.getElementById("cubeimg"), scrambles[iSolve]);
		saveScrambles();
	};

	var genScrambleDelayed = function(){
		waitingScramble = genScramble_();
		if(config[CF_PZL][0] >= 2 && config[CF_PZL][0] <= 7 && config[CF_SCIMG][0] === 1){
	//debug("showcing cube from delayed scramble");
			showCube(new Image(), waitingScramble);
		}
	//debug("generated delayed scramble: " + waitingScramble);
	};

	var genScramble_ = function(){
		switch(config[CF_PZL][0]){
			case 2 : return genScramble2x2();
			case 3 : return genScramble3x3();
			case 4 : return genScrambleNxN(4, 40);
			case 5 : return genScrambleNxN(5, 60);
			case 6 : return genScrambleNxN(6, 80);
			case 7 : return genScrambleNxN(7, 100);
			case 11 : return genScrambleSq1(40);
			case 12 : return genScramblePyra();
			case 13 : return genScrambleMega();
		}
	};


	var genScramble3x3 = function(){
		// Generate random-state scrambles if available
		if(config[CF_RSTAT][0] === 1 && document.scrambleApplet)
			return document.scrambleApplet.newScramble();
		// Otherwise fallback to 25 random moves
		return genScrambleNxN(3, 25);
	/*	var scramble = "";
		var move = 0;
		var face = 0;
		var axis = 0;
		var pow = 0;
		var prevFace = 0;
		var prevAxis = -1;
		var prev2Axis = 0;
		for(var i = 0; i < 25; i++){
			while(face === prevFace || (axis === prevAxis && axis === prev2Axis)){
				move = Math.floor(Math.random() * 18);
				face = move % 6;
				axis = move % 3;
			}
			pow = Math.floor(move / 6);
			scramble += FACES[face] + POW[pow] + " ";
			prevFace = face;
			prev2Axis = prevAxis;
			prevAxis = axis;
			axis = prev2Axis;
		}
		return scramble;
	*/
	//debug(scrambles[iSolve] + "=>" + inflateScr(compressScr(scrambles[iSolve])));
	};


	var genScrambleNxN = function(n, m){

		var nAXES = 3;
		var nPOW = 3;
		var nDEPTH = Math.floor(n/2);
		var slice;
		var nSLICE = nDEPTH * 2;
		var scramble = "";
		var move = 0;
		var face = 0;
		var axis = 0;
		var pow = 0;
		var depth = 0;
		var prevAxis = -1;
		var sliceTurned = new Array();
	//var count = new Array();
	//for(var i = 0; i < 6; i++) count[i] = 0;
		for(var i = 0; i < nSLICE; i++) sliceTurned[i] = false;
		for(var i = 0; i < m; i++){
			do{
				move = Math.floor(Math.random() * nSLICE * nPOW * nAXES);
				axis = Math.floor(move / (nSLICE * nPOW));
				slice = move % nSLICE;
	//			document.getElementById("deb").innerHTML += ("," + axis);
			}while(axis === prevAxis && sliceTurned[slice])
			depth = slice % nDEPTH;
			face = slice < nDEPTH ? axis : axis + nAXES;
	//document.getElementById("deb").innerHTML += (pow + ",");
	//		count[face]++;
			pow = Math.floor((move % (nPOW * nSLICE)) / nSLICE);
			scramble += (depth > 1 ? (depth + 1) : "") + (depth > 0 ? FACES2[face] : FACES[face]) + POW[pow] + " ";
			if(axis !== prevAxis)
				for(var j = 0; j < nSLICE; j++)
					sliceTurned[j] = false;
			sliceTurned[slice] = true;
			prevAxis = axis;
	//document.getElementById("deb").innerHTML += (move + ",");
		}
		return scramble;

	};

	/*
	// Random state scrambles provided by pyra_scrambler.js, uncomment if to use random-move sequence scrambler
	var genScramblePyra = function(len){
		var scramble = "";
		var pow = 0;
		for(var i = 0; i < 4; i++){
			pow = Math.floor(Math.random() * 3);
			scramble += pow > 0 ? FACES2[i > 1 ? i+2 : i] + (pow > 1 ? "' " : " ") : "";
		}
		var f = Math.floor(Math.random() * 4);
		scramble += FACES[f > 1 ? f+2 : f] + (Math.random() < 0.5 ? "' " : " ");
		for(var i = 0; i < len; i++){
			var f_ = Math.floor(Math.random() * 3);
			f = f_ === f ? 3 : f_;
			scramble += FACES[f > 1 ? f+2 : f] + (Math.random() < 0.5 ? "' " : " ");
		}
		return scramble;
	}
	*/

	var genScrambleMega = function(){
		var scramble = "";
		for(var i = 0; i < 7; i++){
			for(var j = 0; j < 10; j++){
				scramble += (j % 2 === 0 ? "R" : "D") + (Math.random() < 0.5 ? "++ " : "-- ");
			}
			scramble += (Math.random() < 0.5) ? "U  " : "U' ";
		}
		return scramble;
	};






	// ========================[ Rendering ]===========================


	// Update time, taking account of toggle state
	var displayTime = function(millis, idx){
		var fTime = formatTime2(millis);
		document.getElementById("time").innerHTML = fTime;
		document.getElementById("breakdown_table").rows[idx + 5].cells[nSteps + 1].innerHTML = fTime;	
	};

	// Updates the time during timing
	var updateTime = function(time){
		var fTime = formatTime(time - startTime[0]);
		document.getElementById("time").innerHTML = state === RUNNING && !config[CF_SHOW][0] ? "&#133;" : 
			state === RUNNING && !config[CF_CENTI][0] ? formatTimeShort(time - startTime[0]) : fTime;
		document.getElementById("breakdown_table").rows[iSolve + 5].cells[nSteps + 1].innerHTML = fTime;	
		document.getElementById("breakdown_table").rows[iSolve + 5].cells[iStep + 1].innerHTML = formatTime(time - startTime[iStep]);	
	};


	// Core function for formattting time (must be fast as poss)
	var formatTime = function(millis){
		var hrs = (millis - millis % 3600000 ) / 3600000;
		var min = ((millis - millis % 60000 ) / 60000) % 60;
		var sec = ((millis - millis % 1000 ) * 0.001) % 60;
		var hnd = ((millis - millis % 10 ) * 0.1) % 100;
		return	   (hrs > 0 ? hrs + (min < 10 ? ":0" : ":") : "" ) +
		(min > 0 || hrs > 0 ? min + (sec < 10 ? ":0" : ":") : "" ) +
			sec + "." + (hnd < 10 ? "0" : "") + hnd;
	};

	// Format time to take into account penalties and DNFs
	var formatTime2 = function(millis){
		if(millis > Number.MAX_VALUE) return "DNF";
		if(millis < 0) return formatTime(-millis + PENALTY) + "+";
		return formatTime(millis);
	};

	// Format up to seconds only
	var formatTimeShort = function(millis){
		var hrs = (millis - millis % 3600000 ) / 3600000;
		var min = ((millis - millis % 60000 ) / 60000) % 60;
		var sec = ((millis - millis % 1000 ) * 0.001) % 60;
		return	   (hrs > 0 ? hrs + (min < 10 ? ":0" : ":") : "" ) +
		(min > 0 || hrs > 0 ? min + (sec < 10 ? ":0" : ":") : "" ) + sec;
	};


	// Format standard devidation (crrrently only shows percentage)
	var formatStd = function(std, avg){
		return avg === 0 ? "0.0%" : (std * 100 / avg).toFixed(1) + "%";
	};
	var formatStdFull = function(std, avg){
	//	if(!std) return "0.0 (0.0%)";
		return (std * 0.001).toFixed(1) + " (" + (std * 100 / avg).toFixed(1) + "%)";
	};

	// Add time to breakdown
	var logBreakdown = function(idx){
		var table = document.getElementById("breakdown_table");
	//debug("idx="+idx+", table.rows.len=" + table.rows.length+", nSteps=" + nSteps);
		// Create current row if doesn't exist
		if(table.rows.length <= idx + 5) brkAddRow(idx);
		for(var i = 0; i <= nSteps; i++)
			table.rows[idx + 5].cells[i + 1].innerHTML = formatTime2(timeData[idx][i]);
	//debug("table.rows[idx + 5].cells.length=" + table.rows[idx + 5].cells.length);
	//debug("nSteps = " + nSteps);
		table.rows[idx + 5].cells[nSteps + 2].innerHTML = '<a href="#" onclick="CTimer.delSolve('+(idx)+', true); return false;">x</a>';
	};
	var brkAddRow = function(idx){
		var table = document.getElementById("breakdown_table");
		var nRow = table.insertRow(idx + 5);
		for(var i = 0; i < nSteps + 3; i++)
			nRow.insertCell(i);
		nRow.cells[0].innerHTML = idx + 1;
		nRow.cells[0].className = "thead";
	};

	// Add time to time log
	var logTime = function(element, time, n){
		var timetxt = '<a href="#" onclick="CTimer.delSolve('+n+', true); return false;">'+formatTime2(time)+'</a>';
		if(n * 2 > element.childNodes.length - 1){
			if(n === 0)
				element.innerHTML = '<span>'+timetxt+'</span>';
			else
				element.innerHTML += "<span>,&nbsp; </span>" + '<span>'+timetxt+'</span>';
		}
		else{
			element.childNodes[n * 2].innerHTML = timetxt;
			if(n > 0) element.childNodes[n * 2 - 1].innerHTML = ",&nbsp; ";
		}
	};

	var displayDetail = function(){
		document.getElementById("tab_detail").innerHTML = 'Generating detailed statistics. Please wait...\n';
		CTimer.openDetail();
		setTimeout(displayDetail2, 50);
	};
	var displayDetail2 = function(){
		var tab = document.getElementById("tab_detail");
		tab.innerHTML = '<p style="float:right;margin:0"><a href="#" onclick="CTimer.closeDetail(); return false;">close</a></p>\n';
		if(iSolve === 0){
			tab.innerHTML += "";
			return;
		}
		var toBracket = false;
		if(config[CF_HLI][0] === 0){
			tab.innerHTML +=
				"<em>Statistics for " + PUZZLE[config[CF_PZL][0]] + ":</em><br/><br/>\n" +
				"Session Average: " + formatTime2(statsAvg[nSteps]) + "<br/>\n" +
				"Best Time: " + formatTime2(timeData[statsBest[nSteps]][nSteps]) + "<br/>\n" +
				"Worst Time: " + formatTime2(timeData[statsWorst[nSteps]][nSteps]) + "<br/>\n" +
				"Standard Deviation: " + formatStdFull(statsStd[nSteps], statsAvg[nSteps]) + "<br/><br/>\n";
			for(var i = 0; i < iSolve; i++){
				toBracket = i === statsBest[nSteps] || i === statsWorst[nSteps];
				tab.innerHTML += (i < 9 ? "&nbsp;&nbsp;" : i < 100 ? "&nbsp;" : "") + (i + 1) + ". " + (toBracket ? "(" : "&nbsp;") +
				formatTime2(timeData[i][nSteps]) + (toBracket ? ")" : "&nbsp;") +
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
						"Best Time: " + formatTime2(timeData[statSet[ia][1]][nSteps]) + "<br/>\n" +
						"Worst Time: " + formatTime2(timeData[statSet[ia][2]][nSteps]) + "<br/>\n" +
						"Standard Deviation: " + formatStdFull(statSet[ia][4], statSet[ia][3]) + "<br/><br/>\n";
					for(var i = iSolve - statSet[ia][0], j = 1; i < iSolve; i++, j++){
						toBracket = i === statSet[ia][1] || i === statSet[ia][2];
						tab.innerHTML += (j < 10 ? "&nbsp;" : "") + j + ". " + (toBracket ? "(" : "&nbsp;") +
						formatTime2(timeData[i][nSteps]) + (toBracket ? ")" : "&nbsp;") +
						"&nbsp; " + scrambles[i] + "<br/>\n";
					}
				}else if(statSet[ia][5] > 0){
					tab.innerHTML +=
						"<em>Statistics for " + PUZZLE[config[CF_PZL][0]] + ":</em><br/><br/>\n" +
						"Best Average of " + statSet[ia][0] + ": " + formatTime2(statSet[ia][8]) + "<br/>\n" +
						"Best Time: " + formatTime2(timeData[statSet[ia][6]][nSteps]) + "<br/>\n" +
						"Worst Time: " + formatTime2(timeData[statSet[ia][7]][nSteps]) + "<br/>\n" +
						"Standard Deviation: " + formatStdFull(statSet[ia][9], statSet[ia][8]) + "<br/><br/>\n";
					for(var i = statSet[ia][5] - statSet[ia][0], j = 1; i < statSet[ia][5]; i++, j++){
						toBracket = i === statSet[ia][6] || i === statSet[ia][7];
						tab.innerHTML += (j < 10 ? "&nbsp;" : "") + j + ". " + (toBracket ? "(" : "&nbsp;") +
						formatTime2(timeData[i][nSteps]) + (toBracket ? ")" : "&nbsp;") +
						"&nbsp; " + scrambles[i] + "<br/>\n";
					}
				}
			}
		}
	};

	// Add a scramble to scramble log
	//var logScramble = function(element, scramble){
	//	element.innerHTML += scramble === null ? "" : scramble + "<br/>\n";
	//}

	// Display the state of the cube after a scramble
	var showCube = function(img, scramble){
	//	img.src = null;
	//	img.visibility = "hidden";
	//debug("showCube(" + img.src + ", " + scramble);
		if(config[CF_PZL][0] <= 7){
			img.src = "http://cube.crider.co.uk/visualcube.php?fmt=gif&size=150&pzl=" + config[CF_PZL][0] + "&bg="+
			(config[CF_STYLE][0] === 0 ? 'w' : 'n') +"&cc="+ (config[CF_STYLE][0] === 0 ? 'n' : 'd') + "&alg=" + RTNS[config[CF_RTN][0]] + 
			(config[CF_SCIMG][0] === 1 && config[CF_PZL][0] < 11 ? scramble : "") + "&nocache";
		}
		else if(config[CF_PZL][0] === 11){
			img.src = config[CF_STYLE][0] === 0 ? "square-1.png" : "square-1_.png";
		}
		else if(config[CF_PZL][0] === 12){
			img.src = config[CF_STYLE][0] === 0 ? "pyraminx.png" : "pyraminx_.png";
		}
		else if(config[CF_PZL][0] === 13){
			img.src = config[CF_STYLE][0] === 0 ? "megaminx.png" : "megaminx_.png";
		}
	};

	/*
	// Clears logs and re-prints them whenever an item has been removed
	// Not very efficient, but the alternative of manipulating entries
	// by id is a major faff! TODO: See if child number can be referred to..
	var rebuildLogs = function(){
		var timeLog = document.getElementById("tab_times");
	//	var scrambleLog = document.getElementById("tab_detail");
		timeLog.innerHTML = "";
	//	scrambleLog.innerHTML = "";
		for(var i = 0; i < iSolve; i++){
			logTime(timeLog, timeData[i][nSteps], i);
	//		logScramble(scrambleLog, scrambles[i]);
		}
	//	logScramble(scrambleLog, scrambles[iSolve]);
	//debug("calling select Avg in reuuild logs");
	//	CTimer.selectAvg(config[CF_HLI][0], false);
	}
	*/

	// Reubild the time log only
	var rebuildTimeLog = function(fromTime){
		if(fromTime < 0){
			fromTime = 0;
		}
		var timeLog = document.getElementById("tab_times");
		for(var i = fromTime; i < iSolve; i++){
			logTime(timeLog, timeData[i][nSteps], i);
		}
		for(var i = iSolve * 2; i < timeLog.childNodes.length; i++)
			timeLog.childNodes[i].innerHTML = "";
	//debug("calling select Avg in reuuild time log");
	//	CTimer.selectAvg(config[CF_HLI][0], false);
	};

	// Build breakdown table when loading times
	var buildBreakdown = function(){
		// Add columns to table
		addBrkCols();
		// Add data to table
		for(var i = 0; i < iSolve; i++)
			logBreakdown(i);
		brkAddRow(iSolve);
	};

	CTimer.selectAvg = function(avg, user){
	//debug("selectAvg("+avg+","+user+")");
	//debug("hilihgt " + avg + "  " + config[CF_HLI][0]);
	//	if(avg === -1 && config[CF_HLI][0] === -1) return;
	//debug("best at " + statSet[0][5] + " min:" + statSet[0][6] + " max:" + statSet[0][7]);
	//	if(user && avg !== config[CF_HLI][0]) CTimer.toggleTab("times");

		// If user click and previous is same as selected then display detail for that avg
		if(user && config[CF_HLI][0] === avg){
			displayDetail();
			return;
		}
		// Clear currently hilighted avg
		clearHilightedAvg();

		// index into statSet table
		var ia = avg === 0 ? -1 : avg < 0 ? -avg - 1 : avg - 1;
	//	var ia_ = config[CF_HLI][0] === 0 ? -1 : config[CF_HLI][0] < 0 ? -config[CF_HLI][0] - 1 : config[CF_HLI][0] - 1;
		var iMax = getMaxSet(iSolve);
	//debug("ia:" + ia + ", maxSet:" + getMaxSet(iSolve) + ", isolve:" + iSolve + " avg:" + avg);

		var times = document.getElementById("tab_times").childNodes;
		var table1 = document.getElementById("stats_table1");
		var table2 = document.getElementById("stats_table2");

		// Unhilight previously selected avg
	/*	if(config[CF_HLI][0] !== 0){
			if(ia_ <= iMax){
	//			debug("unhilighting prev avg");
				if(config[CF_HLI][0] < 0){ // For current avgs of xx
	//debug("ia_" + ia_ + " iMax:" + iMax);
	//__				for(var i = iSolve - statSet[ia_][0]; i < iSolve; i++)
	//__					times[i * 2].className = "";
					table2.rows[ia_].cells[0].className = "thead";
				}else{
					if(statSet[ia_][5] > 0){ // For best avgs of xx
	//debug("times:" + times.length + " imax:" + statSet[ia_][5] + " iinit:" + (statSet[ia_][5] - statSet[ia_][0]) + " statSet:" + statSet[ia_]);
	//__debug("unhilighting from i=" + (statSet[ia_][5] - statSet[ia_][0]) + " to: i=" + statSet[ia_][5]);
	//__				for(var i = statSet[ia_][5] - statSet[ia_][0]; i < statSet[ia_][5]; i++)
	//__					times[i * 2].className = "";
					table1.rows[ia_].cells[0].className = "thead";
					}
				}
			}
		}else table1.rows[table1.rows.length - 1].cells[0].className = "thead";
	*/	// Highlight selected avg
		if(avg !== 0){
			if(avg < 0){
				if(ia <= iMax){
				for(var i = iSolve - statSet[ia][0]; i < iSolve; i++)
					times[i * 2].className = 
						i === statSet[ia][1] ? "hilightbest" :
						i === statSet[ia][2] ? "hilightworst" :
						"hilight";
				table2.rows[ia].cells[0].className = "theadh";
				}
				document.getElementById("avgh").innerHTML = "cur avg" + statSet[ia][0];
			}else{
				if(ia <= iMax && statSet[ia][5] > 0){
					for(var i = statSet[ia][5] - statSet[ia][0]; i < statSet[ia][5]; i++){
						times[i * 2].className = 
							i === statSet[ia][6] ? "hilightbest" :
							i === statSet[ia][7] ? "hilightworst" :
							"hilight";
					}
					table1.rows[ia].cells[0].className = "theadh";
				}
				document.getElementById("avgh").innerHTML = "bst avg" + statSet[ia][0];
			}
		}else{
			table1.rows[table1.rows.length - 1].cells[0].className = "theadh";
			document.getElementById("avgh").innerHTML = "avg";
		}
		config[CF_HLI][0] = avg;
		if(user){
			displaySelectedAvg();
		}
		saveConfig(CF_HLI, config[CF_HLI][0]);

	//debug("hilighted: " + avg + "  " + config[CF_HLI][0]);
	//debug("selectAvg:" + avg + " result:" + config[CF_HLI][0]);

	};
	var clearHilightedAvg = function(){
		var avg = config[CF_HLI][0];
		var ia = avg === 0 ? -1 : avg < 0 ? -avg - 1 : avg - 1;
		var iMax = getMaxSet(iSolve);
		var times = document.getElementById("tab_times").childNodes;
		var table1 = document.getElementById("stats_table1");
		var table2 = document.getElementById("stats_table2");
		if(avg !== 0){
			if(ia <= iMax){
	//			debug("unhilighting prev avg");
				if(avg < 0){ // For current avgs of xx
	//debug("ia_" + ia_ + " iMax:" + iMax);
					for(var i = iSolve - statSet[ia][0]; i < iSolve; i++)
						times[i * 2].className = "";
					table2.rows[ia].cells[0].className = "thead";
				}else{
					if(statSet[ia][5] > 0){ // For best avgs of xx
	//debug("times:" + times.length + " imax:" + statSet[ia_][5] + " iinit:" + (statSet[ia_][5] - statSet[ia_][0]) + " statSet:" + statSet[ia_]);
	//__debug("unhilighting from i=" + (statSet[ia_][5] - statSet[ia_][0]) + " to: i=" + statSet[ia_][5]);
					for(var i = statSet[ia][5] - statSet[ia][0]; i < statSet[ia][5]; i++)
						times[i * 2].className = "";
					table1.rows[ia].cells[0].className = "thead";
					}
				}
			}
		}else table1.rows[table1.rows.length - 1].cells[0].className = "thead";
	};


	var displaySelectedAvg = function(){
		if(config[CF_HLI][0] === 0){
			if(iSolve > 0){
				document.getElementById("sm_best").innerHTML = formatTime2(timeData[statsBest[nSteps]][nSteps]);
				document.getElementById("sm_worst").innerHTML = formatTime2(timeData[statsWorst[nSteps]][nSteps]);
				document.getElementById("sm_avg").innerHTML = formatTime2(statsAvg[nSteps]);
				document.getElementById("sm_std").innerHTML = formatStd(statsStd[nSteps], statsAvg[nSteps]);
			}
		}else{
	//debug("iMax:" + iMax + " avg:" + config[CF_HLI][0]);
			var iMax = getMaxSet(iSolve);
			if(config[CF_HLI][0] - 1 > iMax || -config[CF_HLI][0] - 1 > iMax){
				document.getElementById("sm_best").innerHTML = formatTime2(0);
				document.getElementById("sm_worst").innerHTML = formatTime2(0);
				document.getElementById("sm_avg").innerHTML = formatTime2(0);
				document.getElementById("sm_std").innerHTML = formatStd(0, 1);
			}else if(config[CF_HLI][0] < 0){
				document.getElementById("sm_best").innerHTML = formatTime2(timeData[statSet[-config[CF_HLI][0] - 1][1]][nSteps]);
				document.getElementById("sm_worst").innerHTML = formatTime2(timeData[statSet[-config[CF_HLI][0] - 1][2]][nSteps]);
				document.getElementById("sm_avg").innerHTML = formatTime2(statSet[-config[CF_HLI][0] - 1][3]);
				document.getElementById("sm_std").innerHTML = formatStd(statSet[-config[CF_HLI][0] - 1][4], statSet[-config[CF_HLI][0] - 1][3]);
			}else{
				document.getElementById("sm_best").innerHTML = formatTime2(timeData[statSet[config[CF_HLI][0] - 1][6]][nSteps]);
				document.getElementById("sm_worst").innerHTML = formatTime2(timeData[statSet[config[CF_HLI][0] - 1][7]][nSteps]);
				document.getElementById("sm_avg").innerHTML = formatTime2(statSet[config[CF_HLI][0] - 1][8]);
				document.getElementById("sm_std").innerHTML = formatStd(statSet[config[CF_HLI][0] - 1][9], statSet[config[CF_HLI][0] - 1][8]);
			}
		}
		// Hilight relevant table row
		var table1 = document.getElementById("stats_table1");
		var table2 = document.getElementById("stats_table2");
		var ms = getMaxSet(iSolve);
		for(var i = 0; i <= ms; i++) table1.rows[i].cells[0].className = config[CF_HLI][0] === i + 1 ? "theadh" : "thead";
		for(var i = 0; i <= ms; i++) table2.rows[i].cells[0].className = config[CF_HLI][0] === -i - 1 ? "theadh" : "thead";
		table1.rows[ms + 1].cells[0].className = config[CF_HLI][0] === 0 ? "theadh" : "thead";
	};

	// Displays currently selected style
	var displayStyle = function(sheet){
	//debug("showsheet:" + sheet);
	//debug("showing cube from stylesheet");
		showCube(document.getElementById("cubeimg"), scrambles.length > 0 ? scrambles[iSolve] : "");
		document.getElementById("headimg").src = config[CF_STYLE][0] === 0 ? "ctimer.gif" : "ctimer_.gif";
		// Switch stylesheet
		var a; var si = 0;
		var linkTags = document.getElementsByTagName("link");
		for(var i = 0; (a = linkTags[i]); i++) {
			if(a.getAttribute("rel").indexOf("style") !== -1 && a.getAttribute("title")){
				a.disabled = true;
				if(si === sheet) a.disabled = false;
				si++;
			}
		}
		// Update checkbox images
		for(var i = 0; i < checkboxes.length; i++){
	//debug("checkboxes["+i+"]:" + document.getElementById("cfimg" + checkboxes[i]).src);
	//debug("config["+checkboxes[i]+"][0]:" + config[checkboxes[i]][0]);
			document.getElementById("cfimg" + checkboxes[i]).src = config[checkboxes[i]][0] === 0 ?
				(config[CF_STYLE][0] === 0 ? "check_off.gif" : "check_off_.gif") : 
				(config[CF_STYLE][0] === 0 ? "check_on.gif" : "check_on_.gif");
		}

	};







	// ========================[ Statistics ]===========================

	// Generate statistics for overall solves, and multi-stage solves
	var genStats = function(rebuild){
		if(iSolve === 0){
			resetStats();
			return;
		}

		// Unhilight the currently hilighted avg
		var curhl = config[CF_HLI][0];
		if(!rebuild){
			iSolve--;
	//		CTimer.selectAvg(0, false);
			clearHilightedAvg();
			iSolve++;
		}

		// If full generate, rather than incramental update, then all
		// stat sets need to be re-generated
		if(rebuild){
			initStatSet();
			for(var i = statSet[0][0]; i < iSolve; i++) genStatSet(i);	
		}
		for(var j = 0; j <= nSteps; j++){
			statsBest[j] = 0;
			statsWorst[j] = 0;
			statsAvg[j] = 0;
			statsStd[j] = 0;
		}
		var nDNF = 0;
		var nPnl = 0;
		for(var i = 0; i < iSolve; i++){
			for(var j = 0; j <= nSteps; j++){
				statsBest[j] = addPenalty(timeData[i][j]) < addPenalty(timeData[statsBest[j]][j]) ? i : statsBest[j];
				statsWorst[j] = addPenalty(timeData[i][j]) > addPenalty(timeData[statsWorst[j]][j]) ? i : statsWorst[j];
				if(statsAvg[j] > Number.MAX_VALUE || timeData[i][j] > Number.MAX_VALUE) statsAvg[j] = Number.POSITIVE_INFINITY;
				else statsAvg[j] += addPenalty(timeData[i][j]);
			}
			if(timeData[i][nSteps] >= Number.MAX_VALUE) nDNF++;
			else if(timeData[i][nSteps] < 0) nPnl++;
		}
		for(var j = 0; j <= nSteps; j++)
			if(statsAvg[j] < Number.MAX_VALUE){
				statsAvg[j] /= iSolve; statsAvg[j] = round10(statsAvg[j]); }
		for(var i = 0; i < iSolve; i++){
			for(var j = 0; j <= nSteps; j++){
				if(statsAvg[j] < Number.MAX_VALUE)
					statsStd[j] += (addPenalty(timeData[i][j]) - statsAvg[j]) * (addPenalty(timeData[i][j]) - statsAvg[j]);
			}
		}
		// Display stats for the breakdown table
		for(var j = 0; j <= nSteps; j++){
			statsStd[j] = Math.sqrt(statsStd[j] / iSolve);
			var table = document.getElementById("breakdown_table");
			table.rows[0].cells[j + 1].innerHTML = formatTime2(timeData[statsBest[j]][j]);
			table.rows[1].cells[j + 1].innerHTML = formatTime2(timeData[statsWorst[j]][j]);
			table.rows[2].cells[j + 1].innerHTML = formatTime2(statsAvg[j]);
			table.rows[3].cells[j + 1].innerHTML = formatStd(statsStd[j], statsAvg[j]);
		}

		// Display stats in the summary heading
		document.getElementById("sm_solves").innerHTML = iSolve;

		// Display stats for the main stats table
		document.getElementById("stats_solves").innerHTML = iSolve;
		document.getElementById("stats_dnf").innerHTML = nDNF;
		document.getElementById("stats_pnl").innerHTML = nPnl;
		document.getElementById("stats_stime").innerHTML = formatTimeShort(timerStopped - config[CF_STIME][0]);

		// Generate stat sets
		var table1 = document.getElementById("stats_table1");
		var table2 = document.getElementById("stats_table2");
		// Clear tables if rebuilding
		if(rebuild){
			for(var i = 0; i < table1.rows.length; i++) table1.deleteRow(i);
			for(var i = 0; i < table2.rows.length; i++) table2.deleteRow(i);
		}
		var maxSet = genStatSet(iSolve);
		if(maxSet !== -1){
			// Display all stats in table
			for(var j = 0; j <= maxSet; j++){
				updateStatsRow(table1, j, "best", statSet[j][8], timeData[statSet[j][6]][nSteps], timeData[statSet[j][7]][nSteps], statSet[j][9]);
				updateStatsRow(table2, j, "current", statSet[j][3], timeData[statSet[j][1]][nSteps], timeData[statSet[j][2]][nSteps], statSet[j][4]);
			}
		}
		// Display overall performance
		updateStatsRow(table1, maxSet + 1, "session", statsAvg[nSteps],
			timeData[statsBest[nSteps]][nSteps], timeData[statsWorst[nSteps]][nSteps], statsStd[nSteps]);
		// Highlight the updated avg
		if(!rebuild) CTimer.selectAvg(curhl, false);
		displaySelectedAvg();
	};

	// Insert/update stats row in given table
	var updateStatsRow = function(table, idx, head, avg, bst, wrs, std){

		// Insert row if necessary
		if(idx > table.rows.length - 1){
			var nRow = table.insertRow(idx);
			for(var k = 0; k < 11; k++) nRow.insertCell(k);
			// Populate with standard headings
			table.rows[idx].cells[0].className = "thead";
			table.rows[idx].cells[3].className = "thead";
			table.rows[idx].cells[6].className = "thead";
			table.rows[idx].cells[9].className = "thead";
			table.rows[idx].cells[2].innerHTML = "&nbsp;|&nbsp;";
			table.rows[idx].cells[5].innerHTML = "&nbsp;|&nbsp;";
			table.rows[idx].cells[8].innerHTML = "&nbsp;|&nbsp;";
			table.rows[idx].cells[3].innerHTML = "best:";
			table.rows[idx].cells[6].innerHTML = "worst:";
			table.rows[idx].cells[9].innerHTML = "std:";
		}
		// Update lh heading
		table.rows[idx].cells[0].innerHTML =
			'<a href="#" onclick="CTimer.selectAvg('+
			(head === "best" ? idx + 1 : head === "current" ? -idx - 1 : 0)
			+', true); return false;">' + head + '&nbsp;avg'+(head !== "session" ? statSet[idx][0] : "")+'</a>:&nbsp;';
		table.rows[idx].cells[1].innerHTML = formatTime2(avg);
		table.rows[idx].cells[4].innerHTML = formatTime2(bst);
		table.rows[idx].cells[7].innerHTML = formatTime2(wrs);
		table.rows[idx].cells[10].innerHTML = formatStd(std, avg);
	};

	// Generates stats set up to the given index
	var genStatSet = function(idx){
		// Iterate for that many elements to calculate rolling averages/standard deviations
		var maxSet = getMaxSet(idx);
		if(maxSet === -1) return maxSet;

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
					if(timeData[i][nSteps] > Number.MAX_VALUE) nDNFs[j]++;
					else statSet[j][3] += addPenalty(timeData[i][nSteps]);
					if(addPenalty(timeData[i][nSteps]) < addPenalty(timeData[statSet[j][1]][nSteps])) statSet[j][1] = i;
					if(addPenalty(timeData[i][nSteps]) > addPenalty(timeData[statSet[j][2]][nSteps])) statSet[j][2] = i;
				}
			}
		}
		// Calculate Mean
		for(var j = 0; j <= maxSet; j++){
	//debug("calcMean" + idx + ": " + statSet[j][3]);
			if(nDNFs[j] === 0)
				statSet[j][3] = (statSet[j][3]
				- addPenalty(timeData[statSet[j][1]][nSteps])
				- addPenalty(timeData[statSet[j][2]][nSteps])) / (statSet[j][0] - 2);
			 // If the max is a DNF then it wasn't added so don't take it away
			else if(nDNFs[j] === 1)
				statSet[j][3] = (statSet[j][3]
				- addPenalty(timeData[statSet[j][1]][nSteps])) / (statSet[j][0] - 2);
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
					if(i !== statSet[j][1] && i !== statSet[j][2] && statSet[j][3] < Number.MAX_VALUE)
						statSet[j][4] += (addPenalty(timeData[i][nSteps]) - statSet[j][3]) * (addPenalty(timeData[i][nSteps]) - statSet[j][3])
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
	};

	// Returns index highest stats set we can get stats for (-1 if none are viable)
	var getMaxSet = function(idx){
		var maxSet = -1;
		for(var i = 0; i < statSet.length; i++){
			if(statSet[i][0] > idx) break;
			maxSet = i;
		}
		return maxSet;
	};

	// Clears all times and re-initialises stats back to 0
	var resetStats = function(){
		// Reset time breakdown table
		var table = document.getElementById("breakdown_table");
		for(var i = 0; i <= nSteps;  i++){
			table.rows[0].cells[i + 1].innerHTML = formatTime(0);
			table.rows[1].cells[i + 1].innerHTML = formatTime(0);
			table.rows[2].cells[i + 1].innerHTML = formatTime(0);
			table.rows[3].cells[i + 1].innerHTML = formatStd(0, 1);
			table.rows[5].cells[i + 1].innerHTML = formatTime(0);
		}
		// Delete all extra rows for times
		for(var i = table.rows.length - 1; i > 5; i--)
			table.deleteRow(i);
		table.rows[5].cells[nSteps + 2].innerHTML = "";
		// Clear time log
		document.getElementById("tab_times").innerHTML = "";
		// Clear stats summary
		document.getElementById("sm_solves").innerHTML = 0;
		document.getElementById("sm_best").innerHTML = formatTime(0);
		document.getElementById("sm_worst").innerHTML = formatTime(0);
		document.getElementById("sm_avg").innerHTML = formatTime(0);
		document.getElementById("sm_std").innerHTML = formatStd(0, 1);
		document.getElementById("stats_solves").innerHTML = 0;
		document.getElementById("stats_dnf").innerHTML = 0;
		document.getElementById("stats_pnl").innerHTML = 0;
		document.getElementById("stats_stime").innerHTML = formatTimeShort(0);
		// Clear main stats tables
		var table1 = document.getElementById("stats_table1");
		var table2 = document.getElementById("stats_table2");
		while(table1.rows.length > 0) table1.deleteRow(0);
		while(table2.rows.length > 0) table2.deleteRow(0);
		updateStatsRow(table1, 0, "session", 0, 0, 0, 0);
		// Clear scramble log and and set last generated one to first
		document.getElementById("tab_detail").innerHTML = "";
		scrambles[0] = scrambles[iSolve];
	//	logScramble(document.getElementById("tab_detail"), scrambles[0]);
		// Set display time to 0
	//	displayTime(0, 0);
	};

	var addPenalty = function(time){
		if(time > Number.MAX_VALUE) return Number.POSITIVE_INFINITY;
		return time < 0 ? -time + PENALTY : time;
	};




	// =====================[ Utilities ]======================
	// Persistantly sets a config value
	var saveConfig = function(id, value){
		config[id][0] = value;
		createCookie("ctimer" + id, config[id][0], 365);
	};
	// Sets the named cookie with a given expiration value
	var createCookie = function(cname, value, days){
		if(days){
			var date = new Date();
			date.setTime(date.getTime()+(days*24*60*60*1000));
			var expires = "; expires="+date.toGMTString();
		}
		else expires = "";
		document.cookie = cname+"="+value+expires+"; path=/";
	};

	// Reads the named cookie and returns its value, or null if not set
	var readCookie = function(cname){
		var nameEQ = cname + "=";
		var ca = document.cookie.split(';');
		for(var i=0;i < ca.length;i++){
			var c = ca[i];
			while(c.charAt(0) === ' ') c = c.substring(1,c.length);
			if(c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length,c.length);
		}
		return null;
	};

	// Saves the current times in a cookie
	var saveTimes = function(){
		var str = "";
		var row = "";
	//debug("isolve:" + iSolve + ", toSave:" + timeData);
		for(var i = 0; i < iSolve; i++){
			row = (timeData[i][nSteps] < 0 ? -timeData[i][0] : timeData[i][0]);
			for(var j = 1; j < nSteps; j++){
				row += " " + (timeData[i][nSteps] < 0 ? -timeData[i][j] : timeData[i][j]);
			}
			row += timeData[i][nSteps] >= Number.MAX_VALUE ? "_" : "";
			str += row + (i < iSolve - 1 ? "," : "");
		}
	//debug("timestr=" + str);
	//debug("saving times");
		// Store times for a month
		createCookie("ctimerTimes", str, 31);
	};

	// Loads previously saved times from a cookie
	var loadTimes = function(){
		timeData = Array(0, 2);
		var str = readCookie("ctimerTimes");
		if(str === null || str === "") return;
		var ary = str.split(",");
		iSolve = ary.length;
		timeData = Array(iSolve);
		var t = 0;
		var total = 0;
		for(var i = 0; i < iSolve; i++){
			var ary2 = ary[i].split(" ");
			if(i === 0){
				nSteps = ary2.length;
	//debug("iSolve=" + iSolve);
			}
			timeData[i] = Array(nSteps + 1);
			total = 0;
	//debug("cookieTimes:" + str + ", n times:" + ary.length + " ary:" + ary);
			for(var j = 0; j < nSteps; j++) if(ary2[j] !== ''){
				if(ary2[j].charAt(ary2[j].length - 1) === "_"){
					total = Number.POSITIVE_INFINITY;
					ary2[j] = ary2[j].substring(0, ary2[j].length - 1);
				}
				if(isFinite(ary2[j]))
					t = parseInt(ary2[j], 10);
				else	t = Number.POSITIVE_INFINITY;
				if(total < Number.MAX_VALUE && t < Number.MAX_VALUE) total += t;
				else total = Number.POSITIVE_INFINITY;
				timeData[i][j] = t < 0 ? -t : t;
			}
			timeData[i][nSteps] = total;
		}
	//debug("timeData[iSolve-1]=" + timeData[iSolve-1]);	
	};
	var saveScrambles = function(){
	//debug("save scrambles:" + scrambles);
		var data = "";
		if(scrambles.length > 0){
			data = compressScr(scrambles[0]);
			for(var i = 1; i <= iSolve; i++)
				data += "," + compressScr(scrambles[i]);
		}
		// Store for a month
		createCookie("ctimerScrm", data, 31);
	};
	var loadScrambles = function(){
		var data = readCookie("ctimerScrm");
		if(data === null) return;
		var ary = data.split(",");
	//debug("read scrambles:" + ary);
		for(var i = 0; i < ary.length; i++) if(ary[i] !== "")
			scrambles[i] = inflateScr(ary[i]);
	//debug("loaded scrambles:" + scrambles);
	};
	var inflateScr = function(inp){
		var out = "";
		if(config[CF_PZL][0] <= 7 || config[CF_PZL][0] === 12){// Inflate cube and pyraminx algs
			for(var i = 0; i < inp.length; i++){
				var n = inp.charCodeAt(i) - 65;
				out += FACES3[n % 18] + POW[Math.floor(n / 18)] + " ";
			}
		}
		else if(config[CF_PZL][0] === 11){ // Inflate sq-1 alg
			for(var i = 0; i < inp.length; i++){
				var n = inp.charCodeAt(i) - 65;
				var n1 = n % 12 - 5;
				var n2 = Math.floor(n / 12) - 5;
				out += "(" + n1 + "," + n2 + ") ";
			}
		}
		else if(config[CF_PZL][0] === 13){ // Inflate megaminx alg
	//debug("inflating minx alg");
			for(var i = 0; i < inp.length; i += 2){
				var n1 = inp.charCodeAt(i) - 65;
				var n2 = inp.charCodeAt(i+1) - 65;
	//		debug("n="+n);
	//debug(i + "in: n1=" + n1 + " n2=" + n2);
				for(var j = 0; j < 5; j++)
					out += (j % 2 === 0 ? "R" : "D") + ((n1 & (1 << j)) === 0 ? "-- " : "++ ");
				for(var j = 0; j < 5; j++)
					out += (j % 2 === 1 ? "R" : "D") + ((n2 & (1 << j)) === 0 ? "-- " : "++ ");
				out += ((n2 & (1 << 5)) === 0 ? "U' " : "U  ");
			}

		}	
	//debug("in:" + inp + ", out:" + out);
		return out;
	};
	var compressScr = function(inp){
		if(inp === null || inp === "") return "";
		var out = "";
		if(config[CF_PZL][0] <= 7 || config[CF_PZL][0] === 12){// Compress cube and pyraminx algs
			var i = 0;
			var m = -1;
			while(i < inp.length){
				if(inp.charAt(i) === '3'){
					i++;
					m = getMove(inp.charAt(i));
					if(m !== -1) m += 6;
				}
				else m = getMove(inp.charAt(i));
				if(m !== -1)
					out += String.fromCharCode(m + 18 * getPow(inp.charAt(++i)) + 65);
				i++;
			}
		}
		else if(config[CF_PZL][0] === 11){ // Compress sq-1 alg
			var i = -1;
			var n1 = 0, n2 = 0;
			while(++i < inp.length){
				if(inp.charAt(i) !== '(') continue;
				n1 = 0; n2 = 0;
				i++;
				if(inp.charAt(i) === "-"){
					i++;
					n1 = -parseInt(inp.charAt(i), 10);
				}else n1 = parseInt(inp.charAt(i), 10);
				i += 2;
				if(inp.charAt(i) === "-"){
					i++;
					n2 = -parseInt(inp.charAt(i), 10);
				}else n2 = parseInt(inp.charAt(i), 10);
				out += String.fromCharCode((n1+5) + (n2+5)*12 + 65);
			}
		}
		else if(config[CF_PZL][0] === 13){ // Compress megaminx alg
			var n1 = 0, n2 = 0;
			for(var i = 0; i < 7; i++){
				n1 = 0; n2 = 0;
				for(var j = 0; j < 5; j++){
					n1 += inp.charAt(i * 43 + j * 4 + 1) === "+" ? 1 << j : 0;}
				for(var j = 0; j < 5; j++){
					n2 += inp.charAt(i * 43 + (j+5) * 4 + 1) === "+" ? 1 << j : 0;}
				n2 += inp.charAt(i * 43 + 41) === "'" ? 0 : 1 << 5;
	//debug(i + "out: n1=" + n1 + " n2=" + n2);
				out += String.fromCharCode(n1 + 65);
				out += String.fromCharCode(n2 + 65);
			}
		}
		return out;
	};
	var getMove = function(c){
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
	};
	var getPow = function(c){
		switch(c){
			case '2' : return 1;
			case '\'' : return 2;
		}
		return 0;
	};
	var round10 = function(n){
		n += 5;
		return n - n % 10;
	};
	var getTimeNow = function(){
		var now = new Date().getTime();
		return now - now % 10;
	};
	var enableJava = function(toEnable){
		if(toEnable){
			if(document.getElementById("applet_box").innerHTML === ""){
				document.getElementById("applet_box").innerHTML = 
				'<applet  name="scrambleApplet" id="scrambleAppletId" codebase="." archive="JCubeExplorer.jar"' +
				'code="org.kociemba.twophase.ScramblerApplet" ' +
				'width="1" height="1" MAYSCRIPT>' +
				'<param name="mayscript" value="true" />' +
				'<param name="scriptable" value="true" />' +
				'<param name="gui" value="false" />' +
				'</applet>';
			}
			// Detect if it has worked, and warn if it hasn't
			var testScramble = "";
			try{
				//testScramble = document.scrambleApplet.newScramble();
				testScramble = document.getElementById("scrambleAppletId").newScramble();
			}catch(err){
				testScramble = "";
			}
			if(testScramble === ""){
				alert("Java failed to load. Ensure the Sun Java Plugin is installed.\n\n"+
					"If the correct plugin is installed, it could be a browser compatibility issue.\n\n" +
					"Reverting to normal scrambles.");
				saveConfig(CF_RSTAT, 0);
				return false;
			}
			return true;
		}
		return true;
	};
	// ===================[ Debugging ]======================

	var debug = function(msg){
		document.getElementById("footer").innerHTML += "<br/>\n" + msg;
	};

	
	return CTimer;
	
})();

