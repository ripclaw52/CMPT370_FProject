class Game {
    constructor(state) {
        this.state = state;
        this.spawnedObjects = [];
        this.collidableObjects = [];
        this.n=0;
    }

    // example - we can add our own custom method to our game and call it using 'this.customMethod()'
    customMethod() {
        console.log("Custom method!");
    }

    customMusic() {
        //console.log("Add doom music");
        const music = document.getElementById("music");
        console.log(music);
        music.loop =true;
    }
    
    customCounter(){
        this.n += 1;
        if(this.n>600){
            this.n=0;
        }
    }

    // example - create a collider on our object with various fields we might need (you will likely need to add/remove/edit how this works)
    createSphereCollider(object, radius, onCollide = null) {
        object.stop=vec3.fromValues(0,0,0);
        object.collider = {
            type: "SPHERE",
            radius: radius,
            onCollide: onCollide ? onCollide : (otherObject) => {
                //console.log(`Collided with ${otherObject.name}`);
                //object.stop=vec3.fromValues(1,1,1);
            }
        };
        this.collidableObjects.push(object);
    }

    // example - function to check if an object is colliding with collidable objects
    checkCollision(object) {
        object.stop=vec3.fromValues(0,0,0);
        // loop over all the other collidable objects 
        this.collidableObjects.forEach(otherObject => {
            // do a check to see if we have collided, if we have we can call object.onCollide(otherObject) which will
            // call the onCollide we define for that specific object. This way we can handle collisions identically for all
            // objects that can collide but they can do different things (ie. player colliding vs projectile colliding)
            // use the modeling transformation for object and otherObject to transform position into current location

            var objectMatrix = vec3.create();
            var otherMatrix = vec3.create();
            vec3.transformMat4(objectMatrix, object.model.position, object.modelMatrix);
            vec3.transformMat4(otherMatrix, otherObject.model.position, otherObject.modelMatrix);

            var distance = vec3.distance(objectMatrix, otherMatrix);
            if ((otherObject.name != object.name) && (distance < (object.collider.radius + otherObject.collider.radius))) {
                //object.stop = otherMatrix[2]-objectMatrix[2];
                //object.stop = otherMatrix[0]-objectMatrix[0];
                vec3.subtract(object.stop, otherMatrix, objectMatrix);
                //console.log(object.stop);
                return;
            }
        });
    }

    // runs once on startup after the scene loads the objects
    async onStart() {
        this.customMusic();
        console.log("On start");

        // this just prevents the context menu from popping up when you right click
        document.addEventListener("contextmenu", (e) => {
            e.preventDefault();
        }, false);

        // example - set an object in onStart before starting our render loop!
        this.player = getObject(this.state, "myCube");
        const npcObject = getObject(this.state, "myNPC"); // we wont save this as instance var since we dont plan on using it in update

        this.createSphereCollider(this.player, 0.25);
        this.createSphereCollider(npcObject, 0.25);

        //this.createSphereCollider(getObject(this.state, "myWall1"), 0.25);
        // example - create sphere colliders on our two objects as an example, we give 2 objects colliders otherwise
        // no collision can happen
        // this.createSphereCollider(this.cube, 0.5, (otherObject) => {
        //     console.log(`This is a custom collision of ${otherObject.name}`)
        // });
        // this.createSphereCollider(otherCube, 0.5);

        // example - setting up a key press event to move an object in the scene

        document.addEventListener("keypress", (e) => {
            e.preventDefault();

            switch (e.key) {
                // switches the camera between 3rd-person and 1st-person
                case "f":
                    if (this.state.cameraKey == 0) {
                        this.state.cameraKey = 1;
                    } else {
                        this.state.cameraKey = 0;
                    }
                    break;
                case "m":
                    if (music.paused) {
                        music.play();
                    } else {
                        music.pause();
                    }
                    break;
                case "q":
                    vec3.add(this.state.camera[1].front, this.state.camera[1].front, vec3.fromValues(0.25, 0, 0));
                    break;
                case "e":
                    vec3.add(this.state.camera[1].front, this.state.camera[1].front, vec3.fromValues(-0.25, 0, 0));
                    break;
                case "a":
                    //console.log(this.player.stop);
                    if (this.player.stop[0] <= 0) {
                        this.player.translate(vec3.fromValues(0.25, 0, 0));
                        vec3.add(this.state.camera[1].position, this.state.camera[1].position, vec3.fromValues(0.25, 0, 0));
                        vec3.add(this.state.camera[1].front, this.state.camera[1].front, vec3.fromValues(0.25, 0, 0));
                    }
                    break;
                case "d":
                    //console.log(this.player.stop);
                    if (this.player.stop[0] >= 0) {
                        this.player.translate(vec3.fromValues(-0.25, 0, 0));
                        vec3.add(this.state.camera[1].position, this.state.camera[1].position, vec3.fromValues(-0.25, 0, 0));
                        vec3.add(this.state.camera[1].front, this.state.camera[1].front, vec3.fromValues(-0.25, 0, 0));
                    }
                    break;
                case "s":
                    //console.log(this.player.stop);
                    if (this.player.stop[2] >= 0) {
                        this.player.translate(vec3.fromValues(0, 0, -0.25));
                        vec3.add(this.state.camera[1].position, this.state.camera[1].position, vec3.fromValues(0, 0, -0.25));
                        vec3.add(this.state.camera[1].front, this.state.camera[1].front, vec3.fromValues(0, 0, -0.25));
                    }
                    break;
                case "w":
                    //console.log(this.player.stop);
                    if (this.player.stop[2] <= 0) {
                        this.player.translate(vec3.fromValues(0, 0, 0.25));
                        vec3.add(this.state.camera[1].position, this.state.camera[1].position, vec3.fromValues(0, 0, 0.25));
                        vec3.add(this.state.camera[1].front, this.state.camera[1].front, vec3.fromValues(0, 0, 0.25));
                    }
                    break;
                default:
                    break;
            }
        });

        this.customMethod(); // calling our custom method! (we could put spawning logic, collision logic etc in there ;) )

        // example: spawn some stuff before the scene starts
        // for (let i = 0; i < 10; i++) {
        //     for (let j = 0; j < 10; j++) {
        //         for (let k = 0; k < 10; k++) {
        //             spawnObject({
        //                 name: `new-Object${i}${j}${k}`,
        //                 type: "cube",
        //                 material: {
        //                     diffuse: randomVec3(0, 1)
        //                 },
        //                 position: vec3.fromValues(4 - i, 5 - j, 10 - k),
        //                 scale: vec3.fromValues(0.5, 0.5, 0.5)
        //             }, this.state);
        //         }
        //     }
        // }

        // for (let i = 0; i < 10; i++) {
        //     let tempObject = await spawnObject({
        //         name: `new-Object${i}`,
        //         type: "cube",
        //         material: {
        //             diffuse: randomVec3(0, 1)
        //         },
        //         position: vec3.fromValues(4 - i, 0, 0),
        //         scale: vec3.fromValues(0.5, 0.5, 0.5)
        //     }, this.state);


        // tempObject.constantRotate = true; // lets add a flag so we can access it later
        // this.spawnedObjects.push(tempObject); // add these to a spawned objects list

        // tempObject.collidable = true;
        // tempObject.onCollide = (object) => { // we can also set a function on an object without defining the function before hand!
        //     console.log(`I collided with ${object.name}!`);
        // };
        // }
    }

    // Runs once every frame non stop after the scene loads
    onUpdate(deltaTime) {
        this.customCounter();
        const npcObject = getObject(this.state, "myNPC");
        // TODO - Here we can add game logic, like moving game objects, detecting collisions, you name it. Examples of functions can be found in sceneFunctions

        // example: Rotate a single object we defined in our start method
        this.cube.rotate('y', deltaTime * 0.5);
        
        if(this.n === 150){
            npcObject.translate(vec3.fromValues(0, 0, 1));
        }else if(this.n === 300){
            npcObject.translate(vec3.fromValues(0, 0, -1));
        }else if(this.n === 450){
            npcObject.translate(vec3.fromValues(0, 0, -1));
        }else if(this.n === 600){
            npcObject.translate(vec3.fromValues(0, 0, 1));
        }
        // example: Rotate all objects in the scene marked with a flag
        // this.state.objects.forEach((object) => {
        //     if (object.constantRotate) {
        //         object.rotate('y', deltaTime * 0.5);
        //     }
        // });

        // simulate a collision between the first spawned object and 'cube' 
        // if (this.spawnedObjects[0].collidable) {
        //     this.spawnedObjects[0].onCollide(this.cube);
        // }

        // example: Rotate all the 'spawned' objects in the scene
        // this.spawnedObjects.forEach((object) => {
        //     object.rotate('y', deltaTime * 0.5);
        // });


        // example - call our collision check method on our cube
        this.checkCollision(this.player);
    }
}
