/*
File: solver2x2.js
Authors: Jaap Scherphuis (www.jaapsch.net) and Conrad Rider (www.rider.biz)
Date: 10/21/09
Copyright 2009: All rights reserved.
Description: Random-state scrambler and solver for the 2x2 cube

*/

function initSolver2x2(){
	// Generate lookup tables
	calcperm();
	posit = new Array(
		2,2,2,2,
		1,1,1,1,
		0,0,0,0,
		3,3,3,3,
		4,4,4,4,
		5,5,5,5);
	piece = new Array(
		15,16,16,21,21,15,
		13,9,9,17,17,13,
		14,20,20,4,4,14,
		12,5,5,8,8,12,
		3,23,23,18,18,3,
		1,19,19,11,11,1,
		2,6,6,22,22,2,
		0,10,10,7,7,0);
}

function genScramble2x2(lim){

	sol=new Array();
	do{
		// Generate random permutation
		var q = Math.floor(Math.random() * 5040);

		// Generate random orientation
		var t = Math.floor(Math.random() * 729);

		// Solve the scramble
		sol=new Array();
		if(q!=0 || t!=0){
			sol.length=0;
			for(var l=0;l<12;l++){  //max length of solution is 11
				if(search(0,q,t,l,-1)) break;
			}
		}
	}while(sol.length < lim)
	t="";
	for(q=0;q<sol.length;q++){
		t+=" "+"URF".charAt(sol[q]/10)+" 2\'".charAt(sol[q]%10);
	}
	return t;
}

function search(d,q,t,l,lm){
	//searches for solution, from position q|t, in l moves exactly. last move was lm, current depth=d
	if(l==0){
		if(q==0 && t==0){
			return(true);
		}
	}else{
		if(perm[q]>l || twst[t]>l) return(false);
		var p,s,a,m;
		for(m=0;m<3;m++){
			if(m!=lm){
				p=q; s=t;
				for(a=0;a<3;a++){
					p=permmv[p][m];
					s=twstmv[s][m];
					sol[d]=10*m+a;
					if(search(d+1,p,s,l-1,m)) return(true);
				}
			}
		}
	}
	return(false);
}

function calcperm(){
	//calculate solving arrays
	//first permutation
	perm=new Array();
	twst=new Array();
	permmv=new Array()
	twstmv=new Array();
	for(var p=0;p<5040;p++){
		perm[p]=-1;
		permmv[p]=new Array();
		for(var m=0;m<3;m++){
			permmv[p][m]=getprmmv(p,m);
		}
	}
	perm[0]=0;
	for(var l=0;l<=6;l++){
		var n=0;
		for(var p=0;p<5040;p++){
			if(perm[p]==l){
				for(var m=0;m<3;m++){
					var q=p;
					for(var c=0;c<3;c++){
						var q=permmv[q][m];
						if(perm[q]==-1) { perm[q]=l+1; n++; }
					}
				}
			}
		}
	}
	//then twist
	for(var p=0;p<729;p++){
		twst[p]=-1;
		twstmv[p]=new Array();
		for(var m=0;m<3;m++){
			twstmv[p][m]=gettwsmv(p,m);
		}
	}
	twst[0]=0;
	for(var l=0;l<=5;l++){
		var n=0;
		for(var p=0;p<729;p++){
			if(twst[p]==l){
				for(var m=0;m<3;m++){
					var q=p;
					for(var c=0;c<3;c++){
						var q=twstmv[q][m];
						if(twst[q]==-1) { twst[q]=l+1; n++; }
					}
				}
			}
		}
	}
}

function getprmmv(p,m){
	//given position p<5040 and move m<3, return new position number
	var a,b,c,q;
	//convert number into array;
	var ps=new Array()
	q=p;
	for(a=1;a<=7;a++){
		b=q%a;
		q=(q-b)/a;
		for(c=a-1;c>=b;c--) ps[c+1]=ps[c];
		ps[b]=7-a;
	}
	//perform move on array
	if(m==0){
		//U
		c=ps[0];ps[0]=ps[1];ps[1]=ps[3];ps[3]=ps[2];ps[2]=c;
	}else if(m==1){
		//R
		c=ps[0];ps[0]=ps[4];ps[4]=ps[5];ps[5]=ps[1];ps[1]=c;
	}else if(m==2){
		//F
		c=ps[0];ps[0]=ps[2];ps[2]=ps[6];ps[6]=ps[4];ps[4]=c;
	}
	//convert array back to number
	q=0;
	for(a=0;a<7;a++){
		b=0;
		for(c=0;c<7;c++){
			if(ps[c]==a)break;
			if(ps[c]>a)b++;
		}
		q=q*(7-a)+b;
	}
	return(q)
}

function gettwsmv(p,m){
	//given orientation p<729 and move m<3, return new orientation number
	var a,b,c,d,q;
	//convert number into array;
	var ps=new Array()
	q=p;
	d=0;
	for(a=0;a<=5;a++){
		c=Math.floor(q/3);
		b=q-3*c;
		q=c;
		ps[a]=b;
		d-=b;if(d<0)d+=3;
	}
	ps[6]=d;
	//perform move on array
	if(m==0){
		//U
		c=ps[0];ps[0]=ps[1];ps[1]=ps[3];ps[3]=ps[2];ps[2]=c;
	}else if(m==1){
		//R
		c=ps[0];ps[0]=ps[4];ps[4]=ps[5];ps[5]=ps[1];ps[1]=c;
		ps[0]+=2; ps[1]++; ps[5]+=2; ps[4]++;
	}else if(m==2){
		//F
		c=ps[0];ps[0]=ps[2];ps[2]=ps[6];ps[6]=ps[4];ps[4]=c;
		ps[2]+=2; ps[0]++; ps[4]+=2; ps[6]++;
	}
	//convert array back to number
	q=0;
	for(a=5;a>=0;a--){
		q=q*3+(ps[a]%3);
	}
	return(q);
}

