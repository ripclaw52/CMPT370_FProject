class Plane extends RenderObject {
    constructor(glContext, object) {
        super(glContext, object);
        this.type = "plane";
        this.model = { ...this.model,
            vertices: [
                0.0, 0.5, 0.5,
                0.0, 0.5, 0.0,
                0.5, 0.5, 0.0,
                0.5, 0.5, 0.5,
            ],
            triangles: [
                0, 2, 1, 2, 0, 3,
            ],
            uvs: [
                0.0, 0.0,
                5.0, 0.0,
                5.0, 5.0,
                0.0, 5.0,
            ],
            normals: [
                0.0, 1.0, 0.0,
                0.0, 1.0, 0.0,
                0.0, 1.0, 0.0,
                0.0, 1.0, 0.0,
            ],
            bitangents: [
                0, -1, 0,
                0, -1, 0,
                0, -1, 0,
                0, -1, 0, // top
            ]
        };
    }

    // Overload scale so we only scale in x and z axis
    scale(scaleVec) {
        let xVal = this.model.scale[0];
        let zVal = this.model.scale[2];

        xVal *= scaleVec[0];
        zVal *= scaleVec[2];

        this.model.scale = vec3.fromValues(xVal, 1, zVal);
    }

    setup() {
        this.centroid = calculateCentroid(this.model.vertices);
        this.lightingShader();
        this.scale(this.initialTransform.scale);
        this.translate(this.initialTransform.position);
        this.model.rotation = this.initialTransform.rotation;
        this.initBuffers();
    }
}
