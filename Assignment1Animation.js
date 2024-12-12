var canvas, gl, program;
var posBuffer, colBuffer, vPosition, vColor;
var modelViewMatrixLoc, projectionMatrixLoc;
var modelViewMatrix, projectionMatrix;

var points = [], colors = [];
var vertices = [
    vec4( 0.0000,  0.0000, -1.0000, 1.0000),
    vec4( 0.0000,  0.9428,  0.3333, 1.0000),
    vec4(-0.8165, -0.4714,  0.3333, 1.0000),
    vec4( 0.8165, -0.4714,  0.3333, 1.0000)
];

var baseColors = [
    vec4(1.0, 0.0, 0.0, 1.0),
    vec4(0.0, 1.0, 0.0, 1.0),
    vec4(0.0, 0.0, 1.0, 1.0),
    vec4(0.0, 0.0, 0.0, 1.0)
];

var subdivSlider, subdivText, speedSlider, startBtn, restartBtn;
var theta = [0, 0, 0], subdivide = 3, speed = 1, scaleNum = 1, scaleMin = 0.5, scaleMax = 4, scaleSign = 1;
var animFrame = false, animFlag = false;
var rotationPhase = 0; 
var targetRotation = 180;
var currentRotation = 0;
var targetScale = 2;
var iterSlider, iterText;
var currentIteration = 1;
var maxIterations = 1;
var colorPickers = [];
var rotateXFlag = false;
var rotateYFlag = false;
var rotateXCheckbox, rotateYCheckbox;
var xRotation = 0;
var yRotation = 0;
var rotationAmount = 360; 
var moveAroundFlag = false;
var moveX = 0;
var moveY = 0;
var moveXDirection = 1;
var moveYDirection = 1;
var moveSpeed = 0.05;
var moveButton;

var PHASE = {
    X_ROTATION: 0,
    X_RETURN: 1,
    Y_ROTATION: 2,
    Y_RETURN: 3,
    Z_RIGHT: 4,
    Z_RIGHT_RETURN: 5,
    Z_LEFT: 6,
    Z_LEFT_RETURN: 7,
    SCALE_UP: 8,
    SCALE_DOWN: 9
};


window.onload = function init()
{

    divideTetra(vertices[0], vertices[1], vertices[2], vertices[3], subdivide);
    divideTetra(vertices[0], vertices[1], vertices[2], vertices[3], subdivide);

    // WebGL setups
    getUIElement();
    configWebGL();
    render();
}


function getUIElement()
{
    canvas = document.getElementById("gl-canvas");
    subdivSlider = document.getElementById("subdiv-slider");
    subdivText = document.getElementById("subdiv-text");
    speedSlider = document.getElementById("speed-slider");
    iterSlider = document.getElementById("iter-slider");
    iterText = document.getElementById("iter-text");
    startBtn = document.getElementById("anim-btn");
    restartBtn = document.getElementById("restart-btn");

  
    colorPickers = [
        document.getElementById("face1"),
        document.getElementById("face2"),
        document.getElementById("face3"),
        document.getElementById("face4")
    ];

    subdivSlider.onchange = function(event) {
        subdivide = event.target.value;
        subdivText.innerHTML = subdivide;
        recompute();
    };

    speedSlider.onchange = function(event) {
        speed = parseFloat(event.target.value);
        document.getElementById("speed-text").innerHTML = speed.toFixed(1) + "x";
    };

    iterSlider.onchange = function(event) {
        maxIterations = parseInt(event.target.value);
        iterText.innerHTML = maxIterations;
    };


    colorPickers.forEach((picker, index) => {
        picker.onchange = function(event) {
            // Convert hex to RGB values
            const hex = event.target.value;
            const r = parseInt(hex.slice(1,3), 16) / 255;
            const g = parseInt(hex.slice(3,5), 16) / 255;
            const b = parseInt(hex.slice(5,7), 16) / 255;
            baseColors[index] = vec4(r, g, b, 1.0);
            recompute();
        };
    });

    startBtn.onclick = function() {
        animFlag = !animFlag;
        if(animFlag) {
            points = [];
            colors = [];
            divideTetra(vertices[0], vertices[1], vertices[2], vertices[3], subdivide);
            startBtn.value = "Stop Animation";
            toggleSliders(false);
            configWebGL(); 
            animUpdate();
        } else {
            startBtn.value = "Start Animation";
            toggleSliders(true);
            window.cancelAnimationFrame(animFrame);
        }
    };

    restartBtn.onclick = function() {
        animFlag = false;
        window.cancelAnimationFrame(animFrame);
        startBtn.value = "Start Animation";
        toggleSliders(true);  // Enable sliders on restart
        currentIteration = 1;
        maxIterations = parseInt(iterSlider.value);
        rotationPhase = 0;
        currentRotation = 0;
        scaleNum = 1;
        theta = [0, 0, 0];
        
        // Recompute everything to original state
        points = [];
        colors = [];
        divideTetra(vertices[0], vertices[1], vertices[2], vertices[3], subdivide);
        configWebGL();
        render();
        xRotation = 0;
        yRotation = 0;
        rotateXCheckbox.checked = false;
        rotateYCheckbox.checked = false;
        rotateXFlag = false;
        rotateYFlag = false;
        moveAroundFlag = false;
        moveButton.value = "Move Around";
        moveX = 0;
        moveY = 0;
    };

    rotateXCheckbox = document.getElementById("rotate-x");
    rotateYCheckbox = document.getElementById("rotate-y");

    rotateXCheckbox.onchange = function() {
        rotateXFlag = this.checked;
    };

    rotateYCheckbox.onchange = function() {
        rotateYFlag = this.checked;
    };

    moveButton = document.getElementById("move-btn");
    moveButton.onclick = function() {
        moveAroundFlag = !moveAroundFlag;
        if(moveAroundFlag) {
            moveButton.value = "Stop Moving";
        } else {
            moveButton.value = "Move Around";
            moveX = 0;
            moveY = 0;
            render();
        }
    };
}

// Configure WebGL Settings
function configWebGL()
{

    gl = WebGLUtils.setupWebGL(canvas);
    
    if(!gl)
    {
        alert("WebGL isn't available");
    }

 
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);

    gl.enable(gl.DEPTH_TEST);


    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

  
    // Buffer for positions
    posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);

    vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    // Buffer for colors
    colBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);
    
    vColor = gl.getAttribLocation(program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

   
    modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");
    projectionMatrixLoc = gl.getUniformLocation(program, "projectionMatrix");
}

// Render the graphics for viewing
function render()
{
    window.cancelAnimationFrame(animFrame);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    
    projectionMatrix = ortho(-4, 4, -2.25, 2.25, 2, -2);
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));
    

    modelViewMatrix = mat4();
    modelViewMatrix = mult(modelViewMatrix, scale(1, 1, 1));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
    
    gl.drawArrays(gl.TRIANGLES, 0, points.length);
}


function recompute()
{
    // Reset variables accordingly
    points = [];
	colors = [];
    theta = [0, 0, 0];
    scaleNum = 1;
    scaleSign = 1;
    speed = 1;
    rotationPhase = 0;
    currentRotation = 0;
    animFlag = false;

    speedSlider.value = 1; // Reset slider to default position
    document.getElementById("speed-text").innerHTML = "1.0x";
    divideTetra(vertices[0], vertices[1], vertices[2], vertices[3], subdivide);
    configWebGL();
    render();
}


function animUpdate()
{
    if(!animFlag) return;
    
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


    projectionMatrix = ortho(-4, 4, -2.25, 2.25, 2, -2);
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));

  
    switch(rotationPhase) {
        case PHASE.X_ROTATION:
            if (rotateXFlag) {
                xRotation += speed;
                if (xRotation >= rotationAmount) {
                    rotationPhase = PHASE.X_RETURN;
                }
            } else {
                rotationPhase = PHASE.Y_ROTATION;
            }
            break;

        case PHASE.X_RETURN:
            xRotation -= speed;
            if (xRotation <= 0) {
                xRotation = 0;
                rotationPhase = PHASE.Y_ROTATION;
            }
            break;

        case PHASE.Y_ROTATION:
            if (rotateYFlag) {
                yRotation += speed;
                if (yRotation >= rotationAmount) {
                    rotationPhase = PHASE.Y_RETURN;
                }
            } else {
                rotationPhase = PHASE.Z_RIGHT;
            }
            break;

        case PHASE.Y_RETURN:
            yRotation -= speed;
            if (yRotation <= 0) {
                yRotation = 0;
                rotationPhase = PHASE.Z_RIGHT;
            }
            break;

        case PHASE.Z_RIGHT:
            currentRotation += speed;
            if(currentRotation >= targetRotation) {
                currentRotation = targetRotation;
                rotationPhase = PHASE.Z_RIGHT_RETURN;
            }
            theta[2] = currentRotation;
            break;

        case PHASE.Z_RIGHT_RETURN:
            currentRotation -= speed;
            if(currentRotation <= 0) {
                currentRotation = 0;
                rotationPhase = PHASE.Z_LEFT;
            }
            theta[2] = currentRotation;
            break;

        case PHASE.Z_LEFT:
            currentRotation -= speed;
            if(currentRotation <= -targetRotation) {
                currentRotation = -targetRotation;
                rotationPhase = PHASE.Z_LEFT_RETURN;
            }
            theta[2] = currentRotation;
            break;

        case PHASE.Z_LEFT_RETURN:
            currentRotation += speed;
            if(currentRotation >= 0) {
                currentRotation = 0;
                rotationPhase = PHASE.SCALE_UP;
            }
            theta[2] = currentRotation;
            break;

        case PHASE.SCALE_UP:
            scaleNum += (0.01 * speed);
            if(scaleNum >= targetScale) {
                scaleNum = targetScale;
                if(currentIteration < maxIterations) {
                    rotationPhase = PHASE.SCALE_DOWN;
                } else {
                    currentIteration++;
                }
            }
            break;

        case PHASE.SCALE_DOWN:
            scaleNum -= (0.01 * speed);
            if(scaleNum <= 1) {
                scaleNum = 1;
                currentIteration++;
                if(currentIteration <= maxIterations) {
                    rotationPhase = PHASE.X_ROTATION;
                    xRotation = 0;
                    yRotation = 0;
                    theta[2] = 0;
                }
            }
            break;
    }

    if(moveAroundFlag) {
        moveX += moveSpeed * moveXDirection;
        moveY += moveSpeed * moveYDirection;
        
        if(moveX > 2 || moveX < -2) {
            moveXDirection *= -1;
        }
        if(moveY > 1 || moveY < -1) {
            moveYDirection *= -1;
        }
    }


    modelViewMatrix = mat4();
    if(moveAroundFlag) {
        modelViewMatrix = mult(modelViewMatrix, translate(moveX, moveY, 0));
    }
    modelViewMatrix = mult(modelViewMatrix, scale(scaleNum, scaleNum, 1));
    modelViewMatrix = mult(modelViewMatrix, rotateX(xRotation));
    modelViewMatrix = mult(modelViewMatrix, rotateY(yRotation));
    modelViewMatrix = mult(modelViewMatrix, rotateZ(theta[2]));
    
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
    
    // Draw the gasket
    gl.drawArrays(gl.TRIANGLES, 0, points.length);

    animFrame = window.requestAnimationFrame(animUpdate);
}



// Form a triangle
function triangle(a, b, c, color)
{
    colors.push(baseColors[color]);
    points.push(a);
    colors.push(baseColors[color]);
    points.push(b);
    colors.push(baseColors[color]);
    points.push(c);
}


function tetra(a, b, c, d)
{
    triangle(a, c, b, 0);
    triangle(a, c, d, 1);
    triangle(a, b, d, 2);
    triangle(b, c, d, 3);
}


function divideTetra(a, b, c, d, count)
{
   
    if(count === 0)
    {
        tetra(a, b, c, d);
    }


    else
    {
        var ab = mix(a, b, 0.5);
        var ac = mix(a, c, 0.5);
        var ad = mix(a, d, 0.5);
        var bc = mix(b, c, 0.5);
        var bd = mix(b, d, 0.5);
        var cd = mix(c, d, 0.5);
        --count;

        divideTetra(a, ab, ac, ad, count);
        divideTetra(ab, b, bc, bd, count);
        divideTetra(ac, bc, c, cd, count);
        divideTetra(ad, bd, cd, d, count);
    }
}



function toggleSliders(enabled) {
    subdivSlider.disabled = !enabled;
    speedSlider.disabled = !enabled;
    iterSlider.disabled = !enabled;
    
    
    colorPickers.forEach(picker => picker.disabled = !enabled);
    rotateXCheckbox.disabled = !enabled;
    rotateYCheckbox.disabled = !enabled;
}
