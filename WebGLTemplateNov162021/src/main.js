var state = {
};
var game;
var sceneFile = "scene.json"; // can change this to be the name of your scene

// This function loads on window load, uses async functions to load the scene then try to render it
window.onload = async () => {
    try {
        console.log("Starting to load scene file");
        await parseSceneFile(`./statefiles/${sceneFile}`, state);
        main();
    } catch (err) {
        console.error(err);
        alert(err);
    }
}

/**
 * 
 * @param {object - contains vertex, normal, uv information for the mesh to be made} mesh 
 * @param {object - the game object that will use the mesh information} object 
 * @purpose - Helper function called as a callback function when the mesh is done loading for the object
 */
async function createMesh(mesh, object, vertShader, fragShader) {
    let testModel = new Model(state.gl, object, mesh);
    testModel.vertShader = vertShader ? vertShader : state.vertShaderSample;
    testModel.fragShader = fragShader ? fragShader : state.fragShaderSample;
    await testModel.setup();
    addObjectToScene(state, testModel);
    return testModel;
}

/**
 * Main function that gets called when the DOM loads
 */
async function main() {
    //document.body.appendChild( stats.dom );
    const canvas = document.querySelector("#glCanvas");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Initialize the WebGL2 context
    var gl = canvas.getContext("webgl2");

    // Only continue if WebGL2 is available and working
    if (gl === null) {
        printError('WebGL 2 not supported by your browser',
            'Check to see you are using a <a href="https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API#WebGL_2_2" class="alert-link">modern browser</a>.');
        return;
    }

    /**
     * Sample vertex and fragment shader here that simply applies MVP matrix 
     * and diffuse colour of each object
     */
    const vertShaderSample =
        `#version 300 es
        in vec3 aPosition;
        in vec3 aNormal;
        in vec2 aUV;

        uniform mat4 uProjectionMatrix;
        uniform mat4 uViewMatrix;
        uniform mat4 uModelMatrix;
        uniform mat4 normalMatrix;
        uniform vec3 uCameraPosition;

        out vec2 oUV;
        out vec3 oFragPosition;
        out vec3 oCameraPosition;
        out vec3 oNormal;
        out vec3 oTangent;
        out vec3 normalInterp;

        //out vec4 oColor;

        void main() {
            //oColor = vec4(1.0, 1.0, 1.0, 1.0);
            gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * vec4(aPosition, 1.0);
            oUV = aUV;
            oCameraPosition = uCameraPosition;
            oFragPosition = (uModelMatrix * vec4(aPosition, 1.0)).xyz;
            oNormal = normalize((uModelMatrix * vec4(aNormal, 1.0)).xyz);
            normalInterp = vec3(normalMatrix * vec4(aNormal, 0.0));
            oTangent = normalize(vec3(uModelMatrix * vec4(1.0, 0.0, 0.0, 0.0)).xyz);
        }
        `;

    const fragShaderSample =
        `#version 300 es
        #define MAX_LIGHTS 20
        precision highp float;

        struct PointLight {
            vec3 position;
            vec3 colour;
            float strength;
            float linear;
            float quadratic;
        };
        
        //in vec4 oColor;

        in vec3 oNormal;
        in vec3 oTangent;
        in vec3 oFragPosition;
        in vec3 oCameraPosition;
        in vec3 normalInterp;
        in vec2 oUV;

        uniform PointLight[1] pointLight;
        
        uniform vec3 diffuseVal;
        uniform vec3 ambientVal;
        uniform vec3 specularVal;
        uniform float nVal;
        uniform float alphaVal;
        
        uniform int samplerExists;
        uniform int normalSamplerExists;
        uniform sampler2D uTexture;
        uniform sampler2D uNormalTexture;

        out vec4 fragColor;
        void main() {
            vec3 normal = normalize(normalInterp);
            vec3 lightDirection = normalize(pointLight[0].position - oFragPosition);
            vec3 viewDirection = normalize(oCameraPosition - oFragPosition);
            vec3 H = normalize(viewDirection + lightDirection);

            vec3 ambient = ambientVal * pointLight[0].colour * pointLight[0].strength;
            vec3 specular = pointLight[0].colour * specularVal * pow(max(dot(H,normal),0.0),nVal);
            
            if (samplerExists == 1) {
                vec3 textureColour = texture(uTexture, oUV).rgb;
                vec3 diffuse = mix(diffuseVal, textureColour.rgb, 0.7);
            } else if (normalSamplerExists == 1) {
                vec3 normVector = texture(uTexture, oUV).xyz;
                normVector = 2.0 * normVector - 1.0;

                //float uNormalScale = 5.0;
                //normVector = uNormalScale * normVector;

                vec3 biTangent = cross(normal, oTangent);
                mat3 TBN = mat3(oTangent, biTangent, normal);
                normVector = normalize(TBN * normVector);

                float diff = max(dot(normVector,lightDirection),0.0);
                vec3 diffuse = pointLight[0].colour * diff;
            } else {
                vec3 diffuse = pointLight[0].colour * (max(dot(normal,lightDirection),0.0));
            }
            fragColor = vec4(ambient + diffuse + specular, alphaVal);
        }
        `;

    /**
     * Initialize state with new values (some of these you can replace/change)
     */
    state = {
        ...state, // this just takes what was already in state and applies it here again
        gl,
        vertShaderSample,
        fragShaderSample,
        canvas: canvas,
        objectCount: 0,
        lightIndices: [],
        keyboard: {},
        mouse: { sensitivity: 0.2 },
        meshCache: {},
        samplerExists: 0,
        samplerNormExists: 0,
    };

    state.numLights = state.pointLights.length;
    state.cameraKey = 0;
    state.camera = [{
        name: "topCamera",
        position: vec3.fromValues(1.0, 7.0, 1.0),
        front: vec3.fromValues(1.0, 0.0, 1.0),
        up: vec3.fromValues(0.0, 0.0, 1.0),
    }, {
        name: "povCamera",
        position: vec3.fromValues(3.75, 0.75, -3.75),
        front: vec3.fromValues(0.0, 0.0, 2.0),
        up: vec3.fromValues(0.0, 1.0, 0.0),
    }];

    const now = new Date();
    for (let i = 0; i < state.loadObjects.length; i++) {
        const object = state.loadObjects[i];

        if (object.type === "mesh") {
            await addMesh(object);
        } else if (object.type === "cube") {
            addCube(object, state);
        } else if (object.type === "plane") {
            addPlane(object, state);
        } else if (object.type.includes("Custom")) {
            addCustom(object, state);
        }
    }

    const then = new Date();
    const loadingTime = (then.getTime() - now.getTime()) / 1000;
    console.log(`Scene file loaded in ${loadingTime} seconds.`);

    game = new Game(state);
    await game.onStart();
    loadingPage.remove();
    startRendering(gl, state); // now that scene is setup, start rendering it
}

/**
 * 
 * @param {object - object containing scene values} state 
 * @param {object - the object to be added to the scene} object 
 * @purpose - Helper function for adding a new object to the scene and refreshing the GUI
 */
function addObjectToScene(state, object) {
    object.name = object.name;
    state.objects.push(object);
}

/**
 * 
 * @param {gl context} gl 
 * @param {object - object containing scene values} state 
 * @purpose - Calls the drawscene per frame
 */
function startRendering(gl, state) {
    // A variable for keeping track of time between frames
    var then = 0.0;

    // This function is called when we want to render a frame to the canvas
    function render(now) {
        now *= 0.001; // convert to seconds
        const deltaTime = now - then;
        then = now;

        state.deltaTime = deltaTime;
        drawScene(gl, deltaTime, state);
        game.onUpdate(deltaTime); //constantly call our game loop

        // Request another frame when this one is done
        requestAnimationFrame(render);
    }
    // Draw the scene
    requestAnimationFrame(render);
}

/**
 * 
 * @param {gl context} gl 
 * @param {float - time from now-last} deltaTime 
 * @param {object - contains the state for the scene} state 
 * @purpose Iterate through game objects and render the objects aswell as update uniforms
 */
function drawScene(gl, deltaTime, state) {
    gl.clearColor(state.settings.backgroundColor[0], state.settings.backgroundColor[1], state.settings.backgroundColor[2], 1.0); // Here we are drawing the background color that is saved in our state
    gl.enable(gl.DEPTH_TEST); // Enable depth testing
    gl.depthFunc(gl.LEQUAL); // Near things obscure far things
    gl.disable(gl.CULL_FACE); // Cull the backface of our objects to be more efficient
    gl.cullFace(gl.BACK);
    // gl.frontFace(gl.CCW);
    gl.clearDepth(1.0); // Clear everything
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // sort objects by nearness to camera
    let sorted = state.objects.sort((a, b) => {
        let aCentroidFour = vec4.fromValues(a.centroid[0], a.centroid[1], a.centroid[2], 1.0);
        vec4.transformMat4(aCentroidFour, aCentroidFour, a.modelMatrix);

        let bCentroidFour = vec4.fromValues(b.centroid[0], b.centroid[1], b.centroid[2], 1.0);
        vec4.transformMat4(bCentroidFour, bCentroidFour, b.modelMatrix);

        return vec3.distance(state.camera[state.cameraKey].position, vec3.fromValues(aCentroidFour[0], aCentroidFour[1], aCentroidFour[2]))
            >= vec3.distance(state.camera[state.cameraKey].position, vec3.fromValues(bCentroidFour[0], bCentroidFour[1], bCentroidFour[2])) ? -1 : 1;
    });

    // iterate over each object and render them
    sorted.map((object) => {
        gl.useProgram(object.programInfo.program);
        {
            if (object.material.alpha < 1.0) {
                gl.depthMask(false);
                gl.enable(gl.BLEND);
                gl.blendFunc(gl.ONE_MINUS_CONSTANT_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            } else {
                gl.disable(gl.BLEND);
                gl.depthMask(true);
                gl.enable(gl.DEPTH_TEST);
                gl.blendFunc(gl.ONE_MINUS_CONSTANT_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            }
            // Projection Matrix ....
            let projectionMatrix = mat4.create();
            let fovy = 90.0 * Math.PI / 180.0; // Vertical field of view in radians
            let aspect = state.canvas.clientWidth / state.canvas.clientHeight; // Aspect ratio of the canvas
            let near = 0.1; // Near clipping plane
            let far = 1000000.0; // Far clipping plane

            mat4.perspective(projectionMatrix, fovy, aspect, near, far);
            gl.uniformMatrix4fv(object.programInfo.uniformLocations.projection, false, projectionMatrix);
            state.projectionMatrix = projectionMatrix;

            // View Matrix & Camera ....
            let viewMatrix = mat4.create();
            //let camFront = state.camera[state.cameraKey].front; //vec3.fromValues(0, 0, 0);
            //vec3.add(camFront, state.camera[state.cameraKey].position, state.camera[state.cameraKey].front);
            mat4.lookAt(
                viewMatrix,
                state.camera[state.cameraKey].position,
                //camFront,
                state.camera[state.cameraKey].front,
                state.camera[state.cameraKey].up,
            );
            gl.uniformMatrix4fv(object.programInfo.uniformLocations.view, false, viewMatrix);
            gl.uniform3fv(object.programInfo.uniformLocations.cameraPosition, state.camera[state.cameraKey].position);
            state.viewMatrix = viewMatrix;

            // Model Matrix ....
            let modelMatrix = mat4.create();
            let negCentroid = vec3.fromValues(0.0, 0.0, 0.0);
            vec3.negate(negCentroid, object.centroid);
            mat4.translate(modelMatrix, modelMatrix, object.model.position);
            mat4.translate(modelMatrix, modelMatrix, object.centroid);
            mat4.mul(modelMatrix, modelMatrix, object.model.rotation);
            mat4.scale(modelMatrix, modelMatrix, object.model.scale);
            mat4.translate(modelMatrix, modelMatrix, negCentroid);

            if (object.parent) {
                let parent = getObject(state, object.parent);
                if (parent.model && parent.model.modelMatrix) {
                    mat4.multiply(modelMatrix, parent.model.modelMatrix, modelMatrix);
                }
            }

            object.model.modelMatrix = modelMatrix;
            gl.uniformMatrix4fv(object.programInfo.uniformLocations.model, false, modelMatrix);

            // Normal Matrix ....
            let normalMatrix = mat4.create();
            mat4.invert(normalMatrix, modelMatrix);
            mat4.transpose(normalMatrix, normalMatrix);
            gl.uniformMatrix4fv(object.programInfo.uniformLocations.normalMatrix, false, normalMatrix);

            // Object material
            gl.uniform3fv(object.programInfo.uniformLocations.diffuseVal, object.material.diffuse);
            gl.uniform3fv(object.programInfo.uniformLocations.ambientVal, object.material.ambient);
            gl.uniform3fv(object.programInfo.uniformLocations.specularVal, object.material.specular);
            gl.uniform1f(object.programInfo.uniformLocations.nVal, object.material.n);
            gl.uniform1f(object.programInfo.uniformLocations.alphaVal, object.material.alpha);
            /*
            console.log(object.material.diffuse);
            console.log(object.material.ambient);
            console.log(object.material.specular);
            console.log(object.material.n);
            console.log(object.material.alpha);
            */

            /*
            let mainLight = state.pointLights[0];
            gl.uniform3fv(gl.getUniformLocation(object.programInfo.program, 'mainLight.position'), mainLight.position);
            gl.uniform3fv(gl.getUniformLocation(object.programInfo.program, 'mainLight.colour'), mainLight.colour);
            gl.uniform1f(gl.getUniformLocation(object.programInfo.program, 'mainLight.strength'), mainLight.strength);
            */
            
            gl.uniform1i(object.programInfo.uniformLocations.numLights, state.numLights);
            if (state.pointLights.length > 0) {
                for (let i = 0; i < state.pointLights.length; i++) {
                    gl.uniform3fv(gl.getUniformLocation(object.programInfo.program, 'pointLight[' + i + '].position'), state.pointLights[i].position);
                    gl.uniform3fv(gl.getUniformLocation(object.programInfo.program, 'pointLight[' + i + '].colour'), state.pointLights[i].colour);
                    gl.uniform1f(gl.getUniformLocation(object.programInfo.program, 'pointLight[' + i + '].strength'), state.pointLights[i].strength);
                    gl.uniform1f(gl.getUniformLocation(object.programInfo.program, 'pointLight[' + i + '].linear'), state.pointLights[i].linear);
                    gl.uniform1f(gl.getUniformLocation(object.programInfo.program, 'pointLight[' + i + '].quadratic'), state.pointLights[i].quadratic);
                }
            }
            //console.log(state.pointLights[0]);

            {
                // Bind the buffer we want to draw
                gl.bindVertexArray(object.buffers.vao);

                //check for diffuse texture and apply it
                if (object.material.shaderType === 3) {
                    state.samplerExists = 1;
                    gl.activeTexture(gl.TEXTURE0);
                    gl.uniform1i(object.programInfo.uniformLocations.samplerExists, state.samplerExists);
                    gl.uniform1i(object.programInfo.uniformLocations.sampler, 0);
                    gl.bindTexture(gl.TEXTURE_2D, object.model.texture);
                } else {
                    gl.activeTexture(gl.TEXTURE0);
                    state.samplerExists = 0;
                    gl.uniform1i(object.programInfo.uniformLocations.samplerExists, state.samplerExists);
                }

                //check for normal texture and apply it
                if (object.material.shaderType === 4) {
                    state.samplerNormExists = 1;
                    gl.activeTexture(gl.TEXTURE1);
                    gl.uniform1i(object.programInfo.uniformLocations.normalSamplerExists, state.samplerNormExists);
                    gl.uniform1i(object.programInfo.uniformLocations.normalSampler, 1);
                    gl.bindTexture(gl.TEXTURE_2D, object.model.textureNorm);
                } else {
                    gl.activeTexture(gl.TEXTURE1);
                    state.samplerNormExists = 0;
                    gl.uniform1i(object.programInfo.uniformLocations.normalSamplerExists, state.samplerNormExists);
                }

                // Draw the object
                const offset = 0; // Number of elements to skip before starting

                //if its a mesh then we don't use an index buffer and use drawArrays instead of drawElements
                if (object.type === "mesh" || object.type === "meshCustom") {
                    gl.drawArrays(gl.TRIANGLES, offset, object.buffers.numVertices / 3);
                } else {
                    gl.drawElements(gl.TRIANGLES, object.buffers.numVertices, gl.UNSIGNED_SHORT, offset);
                }
            }
        }
    });
}
