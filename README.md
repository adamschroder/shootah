shootah
=======

www.youtube.com/embed/F5zboV3_9KY

JS mulitplayer survival shootem-up

TODO
======
wunderlist: [JS13k] SHOOTAH


concepts
========

ideas from balcony sesh:
 - survival type? or survival/deathmatch?
 - Number of enemies and map size scales to number of players
 - friendly fire
 - griefers become enemies
 - bounties (randomly?) put out on players
 - pixel art

technical issues
================

where should collision detection occur?
 - clients handle collision detection for the player only (his bullets with other players and monsters, collisions with monsters)
 - collisions are messaged from the client -> server -> all clients ... cloud computed collisions (thumbsup)
 - later add anti-cheat mechanisms, not needed for first version


the more logic put onto the backend, the more code we can use on the client for animations, efx, SOUNDS!!!, etc.

