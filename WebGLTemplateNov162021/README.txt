Description of folders/files:

/lib                        -> 3rd party libraries we use
/materials                  -> textures we use in our game
/models                     -> 3D models we want to use in our game
/src                        -> source code
/statefiles                 -> data for the scene we want to render (must be named 'scene.json' or change loading command in /src/main.js)
/index.html                 -> main html page that we are rendering
/favicon.ico                -> the icon displayed on the tab of the browser
/loading.gif                -> my sample gif for showing while the page loads

In /src
/commonFunctions.js         -> common functions used for rendering, buffers, shader creation etc
/main.js                    -> main file where we initialize all our game stuff and rendering
/myGame.js                  -> file where we can write game logic (start and constant loop)
/sceneFunctions.js          -> contains helper functions for scene manipulation (getting objects etc)
/uiSetup.js                 -> helper function for showing errors via the ui

in /src/objects 
/Cube.js                    -> cube class for rendering cubes with predefined values
/Model.json                 -> model class for rendering all our 3D models
/Plane.json                 -> plane class for rendering planes with predefined values
/CustomObject.js            -> custom class for rendering custom objects with given verts/norms/uvs/triangles



This is just a template to get you started in making a game using Refinery. Feel free to edit all of this code and change whatever you'd like. And as always have fun. 

Contact me at zachthm@gmail.com if you have any questions