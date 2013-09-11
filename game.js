!function(){function e(e){return N.getElementById(e)}function n(e){return N.createElement(e)}function t(e){var n,t,i;for(var r in e)n=e[r],t=n.id,isMonster="monster"===n.type,i=isMonster?nn[t]:Z[t],i&&Y&&t!==Y.id&&(i.x=n.x,i.y=n.y),isMonster?nn[t]=n:i&&(i.facing=n.facing)}function i(){if(!G){var e=Z[Y.id];e.isDead=0,L.emit("userRespawn",{id:Y.id}),an=0,G=10,V.style.display="none",F.className=""}}function r(){K&&clearInterval(K),K=setInterval(function(){sn=1},X)}function a(){if(!an){an=1,G=10;var n=e("timer");n.innerHTML=G;var t=setInterval(function(){n.innerHTML=--G,0===G&&(n.innerHTML="Respawn",clearTimeout(t))},1e3)}}function o(){if(fn&&!Y.isInvincible){fn=!1;var e=w(Y);e&&(Y.health-=e.damage,Y.health<=0&&(Y.isDead=1)&&(F.className="d",V.style.display="block"),L.emit("hitUser",{id:Y.id,damage:e.damage,fromMonster:1}));var n=m(Y);n&&L.emit("userPickup",{id:Y.id,powerUp:n})}}function l(e,n,t){return e.y=e.y+Math.sin(pn*n)*t,e.x=e.x+Math.cos(pn*n)*t,e}function c(){if(Y.isDead)return!G&&32 in tn&&i(),void 0;var e={id:Y.id},n=!1;if(f()){var t=0!==Object.keys(tn).length&&Y.speed*A;65 in tn?n=83 in tn?135:87 in tn?225:180:68 in tn?n=83 in tn?45:87 in tn?315:0:87 in tn?n=270:83 in tn&&(n=90),n!==!1&&(yn.x=Y.x,yn.y=Y.y,yn=l(yn,n,t),Y.x=yn.x,Y.y=yn.y,e.x=Y.x,e.y=Y.y)}var r;38 in tn?r=37 in tn?"up-left":39 in tn?"up-right":"up":40 in tn?r=37 in tn?"down-left":39 in tn?"down-right":"down":37 in tn?r="left":39 in tn&&(r="right"),r&&(Y.facing=r,e.facing=r),(n||r)&&d(e),n=0;var a=0,o=0;32 in tn&&(sn&&("up"===Y.facing?(n=270,a=-10,o=-30):"up-left"===Y.facing?(n=225,a=-25,o=-15):"up-right"===Y.facing?(n=315,a=10,o=-20):"down"===Y.facing?(n=90,a=-10,o=0):"down-left"===Y.facing?(n=135,a=-15,o=5):"down-right"===Y.facing?(n=45,a=5,o=5):"left"===Y.facing?(n=180,a=-25):"right"===Y.facing&&(n=0),Y.powerup&&"shotgun"===Y.powerup.type&&(u(a,o,n-15),u(a,o,n+15)),u(a,o,n)),sn=!1)}function d(e){vn&&(vn=0,L.emit("updateMovement",e),setTimeout(function(){vn=1},33))}function u(e,n,t){var i=new h(Y.x+Y.height/2+e,Y.y+Y.width/2+n,Y.facing,t,Y.id);_[i.id]=i,L.emit("newBullet",i),B(i.x)}function s(){for(var e=q();en[e];)e=q();return en[e]=1,e}function f(){return Y.x<=0||Y.y<=0?(Y.x=Y.x+1,Y.y=Y.y+1,!1):Y.x>=760?(Y.x=Y.x-5,!1):Y.y>=550?(Y.y=Y.y-5,!1):!0}function h(e,n,t,i,r){var a=this;a.owner=r,a.id=r+s(),a.x=e,a.y=n,a.width=5,a.height=5,a.direction=t,a.angle=i,a.speed=500}function p(){var e;for(var n in _)e=_[n],e.owner===Y.id&&delete _[n]}function y(e){e.direction;var n=e.speed*A;if(gn.x=e.x,gn.y=e.y,gn=l(gn,e.angle,n),e.x=gn.x,e.y=gn.y,e.owner===z){var t=e.owner,i=x(e);if(!i)return delete _[e.id],L.emit("killBullet",e.id),void 0;var r=g(e);!r||r.isInvincible||r.isDead||(r.health-=1,r.health<=0&&delete Z[r.id],L.emit("hitUser",{id:r.id,damage:1,shooter:t}));var a=w(e);a&&(a.health-=1,a.health<=0&&delete nn[a.id],L.emit("hitMonster",{id:a.id,damage:1,shooter:t})),(r||a)&&(delete _[e.id],L.emit("killBullet",e.id))}}function v(e,n){var t=e.width+e.x,i=n.width+n.x;if(n.x>t||e.x>i)return!1;var r=e.height+e.y,a=n.height+n.y;return n.y>r||e.y>a?!1:!0}function g(e){var n,t;for(var i in Z)if(n=Z[i],n.id!==z&&(t=v(e,n)))return n;return!1}function w(e){var n,t;for(var i in nn)if(n=nn[i],t=v(e,n))return n;return!1}function m(e){var n,t,i;for(var r in $)if(n=$[r],t=v(e,n),i="shotgun"===n.type?ln:cn,t&&i)return n;return!1}function x(e){return e.x>800||e.y>600||e.x<0||e.y<0?!1:!0}function k(e){var n=new wn;n.src="images/shotgun.png",j.drawImage(n,e.x,e.y,70,25)}function D(e){var n=new wn;n.src="images/hp.png",j.drawImage(n,e.x,e.y,45,45)}function b(e){var n=[];for(var t in Z)n.push(Z[t]);for(var i in nn)n.push(nn[i]);if(ln||cn)for(var r in $)n.push($[r]);n.sort(function(e,n){return e.x===n.x&&e.y===n.y&&e.type!==n.type?"monster"===e.type?1:-1:e.y===n.y?e.x>n.x?1:e.x<n.x?-1:0:e.y>n.y?1:-1});for(var a,o=0,l=n.length;l>o;o++)a=n[o],"player"===a.type&&!a.isDead&&a.isConnected?I(e,a):"monster"===a.type?M(e,a):"shotgun"===a.type?k(a):"health"===a.type&&D(a)}function I(e,n){var t;if(n.hitCountdown&&1===n.hitCountdown%10&&(n.show=!n.show),n.hitCountdown--,n.hitCountdown||(n.show=1),n.show){S(e,n),e.beginPath(),e.fillStyle="white",t=kn;var i=Y.id===n.id?"You":n.name;e.fillText(i,n.x+12,n.y+65);var r=0;switch(n.facing){case"up":break;case"up-left":r=52;break;case"down":r=358;break;case"down-left":r=307;break;case"left":r=205;break;case"right":r=154;break;case"up-right":r=102;break;case"down-right":r=256}e.drawImage(t,0,r,49,49,n.x,n.y,40,45),e.fill(),e.stroke(),e.closePath()}}function M(e,n){e.drawImage(xn,n.x,n.y,n.width,n.height)}function C(){hn&&(j.rect(0,0,F.width,F.height),j.fillStyle=hn,j.fill()),j.fillRect(0,0,F.width,F.height),b(j);var e,n;for(var t in _)e=_[t],n=e&&Z[e.owner],e&&n&&!n.isDead&&(y(e),e&&(j.fillStyle="#d62822"),e&&j.fillRect(e.x,e.y,3,3),e&&(j.fillStyle="#f2b830"),e&&j.fillRect(e.x+4,e.y,3,3));var i=Y.health;j.fillStyle="rgba(255, 0, 0, 0.5)";var r=(F.width-10)/10,a=r*i;j.fillRect(5,5,a,15)}function S(e,n){var t="left"===n.facing||"down-left"===n.facing||"up-left"===n.facing?15:"down"===n.facing||"up"===n.facing?10.5:5;e.fillStyle=n.color,e.fillRect(n.x+t,n.y+25,20,10),e.fillStyle=n.eyeColor,e.fillRect(n.x+t+3,n.y+10,14,10),e.fillStyle=n.pantsColor,e.fillRect(n.x-1+t+2,n.y+35,17,7)}function T(){var e,t,i,r=N.createDocumentFragment();rn.sort(function(e,n){return e.score>n.score?-1:e.score<n.score?1:0});for(var a in rn)i=rn[a],e=n("tr"),e.style.outline="thin solid "+i.color,t=n("td"),t.innerText=i.name,e.appendChild(t),t=n("td"),t.innerText=i.score,e.appendChild(t),r.appendChild(e);J.innerHTML="",J.appendChild(r)}function P(){A=(Date.now()-on)/1e3,o(),c(),C(),on=Date.now(),window.requestAnimationFrame(P)}function R(){for(var e=2*Dn.sampleRate,n=Dn.createBuffer(1,e,Dn.sampleRate),t=n.getChannelData(0),i=0;e>i;i++)t[i]=2*q()-1;return n}function B(e){var n=Dn.createBufferSource(),t=Dn.createPanner();E(e,t),n.connect(t),In.frequency.value=900+H(201*q())-100,t.connect(In),n.buffer=bn,n.loop=!0,n.loopStart=q()*(bn.duration/2),n.start(0),n.stop(Dn.currentTime+.04)}function E(e,n){F.width;var t,i=H(F.width/2),r=22;e===i?t=0:i>e?t=(i-e)/i*-r:e>i&&(t=(e-i)/i*r);var a=t,o=a+90;o>90&&(o=180-o);var l=Math.sin(a*(Math.PI/180)),c=Math.sin(o*(Math.PI/180));n.setPosition(l,0,c)}var L=io.connect("http://shootah-octatone.rhcloud.com:8000"),N=document,U=Math,q=U.random,H=U.floor,F=e("canvas"),J=e("st"),j=F.getContext("2d");F.width=800,F.height=600;var A,O,Y,z,G,K,Q,V=e("r"),W=e("m"),X=150,Z={},$={},_={},en={},nn={},tn={},rn={},an=0,on=Date.now(),ln=0,cn=0;try{var dn=window.localStorage.getItem("user");Y=dn?JSON.parse(dn):{},Y.isDead=0,Y.health=10,Y.name?L.emit("userJoined",Y):(F.style.display="none",e("c").style.display="block",e("submit").addEventListener("click",function(){var n=N.getElementsByTagName("input")[0].value;n&&(Y.name=n,F.style.display="block",e("c").style.display="none",L.emit("userJoined",Y))}))}catch(un){throw new Error(un)}L.on("join",function(e){O=L.socket.sessionid,e.socketId===O&&(console.log(e),window.localStorage.setItem("user",JSON.stringify(e)),Y=e,z=e.id,window.requestAnimationFrame(P)),Z[e.id]=e}),L.on("move",function(e){if(e.id!==Y.id)if(e.id){var n={};n[e.id]=e,t(n)}else t(e)}),L.on("newBullet",function(e){_[e.id]||e.owner===Y.id||(_[e.id]=e,B(e.x))}),L.on("killBullet",function(e){_[e]&&delete _[e]}),L.on("killedMonster",function(e){nn[e]&&delete nn[e]}),L.on("userDamaged",function(e){var n=Z[e.id];n&&(n.health=e.health,n.hitCountdown=100)}),L.on("shotgunPowerUpDrop",function(e){$[e.id]=e,ln=1}),L.on("healthPowerUpDrop",function(e){$[e.id]=e,cn=1}),L.on("userDeath",function(e,n){var t=Z[e];t&&!t.isDead&&(t.isDead=1,e===z&&(W.innerHTML=n,a(),p()))}),L.on("userNotInvincible",function(e){var n=Z[e];n&&(n.isInvincible=0)}),L.on("userPickup",function(e,n){delete $[n.id];var t=Z[e];if(ln=0,cn=0,"health"===n.type&&(t.health=10),t.id===Y.id&&(t.powerup=n,X="shotgun"===t.powerup.type?500:150,r(),t.powerup&&"shotgun"===t.powerup.type)){var i=1e4;X="shotgun"===t.powerup.type?500:150,clearTimeout(Q),Q=setTimeout(function(){t.powerup="",L.emit("powerUpEnd",{id:t.id}),X="shotgun"===t.powerup.type?500:150,r(),i-=1e3},i)}}),L.on("updateScore",function(e){rn=e,T()}),window.addEventListener("keydown",function(e){Y.name&&!Y.isDead&&e.preventDefault(),tn[e.keyCode]=!0}),window.addEventListener("keyup",function(e){Y.name&&!Y.isDead&&e.preventDefault(),delete tn[e.keyCode]}),V.addEventListener("click",i);var sn=1;r();var fn=!0;setInterval(function(){fn=!0},500);var hn,pn=Math.PI/180,yn={x:0,y:0},vn=1,gn={x:0,y:0},wn=Image,mn=new wn;mn.onload=function(){hn=j.createPattern(mn,"repeat")},mn.src="images/grass3.jpg";var xn=new wn;xn.src="images/monster-right.png";var kn=new wn;kn.src="images/character-sprite-reg.png";var Dn=new webkitAudioContext,bn=R(),In=Dn.createBiquadFilter();In.type=0,In.frequency.value=900,In.connect(Dn.destination)}();