/*
File: sq1_scrambler.js
Author: Jaap Scherphuis (www.jaapsch.net)
Modified by: Conrad Rider (www.crider.co.uk)
Date: 17/01/10
Copyright 2010: All rights reserved.
Description: Scrambler for the Saquare-1
*/

function genScrambleSq1(seqlen){
	var i,j,ls,n,f;
	var seq = new Array();    // move sequences
	posit = new Array(0,0,1,2,2,3,4,4,5,6,6,7,8,9,9,10,11,11,12,13,13,14,15,15);
	ls = -1;
	f = 0;
	for(i = 0; i < seqlen; i++){
		do{
			if(ls==0){
				j=Math.floor(Math.random()*22)-11;
				if(j>=0) j++;
			}else if(ls==1){
				j=Math.floor(Math.random()*12)-11;
			}else if(ls==2){
				j=0;
			}else{
				j=Math.floor(Math.random()*23)-11;
			}
			// if past second twist, restrict bottom layer
		}while( (f>1 && j>=-6 && j<0) || domoveSq1(j) );
		if(j>0) ls=1;
		else if(j<0) ls=2;
		else { ls=0; f++; }
		seq[i] = j;
	}
	
	var s="",i,k,l=-1;
	for(i = 0; i < seq.length; i++){
		k=seq[i];
		if(k==0){
			if(l==-1) s+="(0,0)  ";
			if(l==1) s+="0)  ";
			if(l==2) s+=")  ";
			l=0;
		}else if(k>0){
			s+= "(" + (k>6?k-12:k)+",";
			l=1;
		}else if(k<0){
			if(l<=0) s+="(0,";
			s+=(k<=-6?k+12:k);
			l=2;
		}
	}
	if(l==1) s+="0";
	if(l!=0) s+=")";
	//if(l==0) s+="(0,0)";
	return s;
}

function domoveSq1(m){
	var i,c,t,f=m;
	//do move f
	if( f==0 ){
		for(i=0; i<6; i++){
			c=posit[i+12];
			posit[i+12]=posit[i+6];
			posit[i+6]=c;
		}
	}else if(f>0){
		f=12-f;
		if( posit[f]==posit[f-1] ) return true;
		if( f<6 && posit[f+6]==posit[f+5] ) return true;
		if( f>6 && posit[f-6]==posit[f-7] ) return true;
		if( f==6 && posit[0]==posit[11] ) return true;
		t=new Array();
		for(i=0;i<12;i++) t[i]=posit[i];
		c=f;
		for(i=0;i<12;i++){
			posit[i]=t[c];
			if(c==11)c=0; else c++;
		}
	}else if(f<0){
		f=-f;
		if( posit[f+12]==posit[f+11] ) return true;
		if( f<6 && posit[f+18]==posit[f+17] ) return true;
		if( f>6 && posit[f+6]==posit[f+5] ) return true;
		if( f==6 && posit[12]==posit[23] ) return true;
		t=new Array();
		for(i=0;i<12;i++) t[i]=posit[i+12];
		c=f;
		for(i=0;i<12;i++){
			posit[i+12]=t[c];
			if(c==11)c=0; else c++;
		}
	}
	return false;
}

