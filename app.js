var vs1Text = `
precision mediump float;

attribute vec3 vertPosition;
attribute vec2 vertUV;
varying vec2 fragTexCoord;
varying vec3 pos;
uniform mat4 mWorld;
uniform mat4 mView;
uniform mat4 mProj;

void main() { 
	fragTexCoord = vertUV;
	gl_Position = mProj * mView * mWorld * vec4(vertPosition, 1.0);
	pos = gl_Position.xyz;
}`;

var fs1Text = `
precision mediump float;

varying vec2 fragTexCoord;
varying vec3 pos;
uniform sampler2D sampler;
uniform float time;

void main() {
	//gl_FragColor = texture2D(sampler, fragTexCoord);
	gl_FragColor = vec4(fragTexCoord + sin(pos.y + time) - cos(pos.x + fragTexCoord.y), 0.0, 1.0);
}`;

var vs1UVText = `
precision mediump float;

attribute vec2 vertPos;

varying vec2 UV;
void main() {
	UV = vertPos;
	gl_Position = vec4(vertPos,0.0,1.0);
}
`;

fv1FBOTestText = `
precision mediump float;

uniform float time;
uniform vec2 resolution;
varying vec2 UV;
void main() {
	gl_FragColor = vec4( abs(UV), fract(time), 1.0);
}
`;

var fv2FBOShd1Text = `
#version 300 es

uniform sampler2DArray palette;
uniform usampler3D octree; //voxelID (xy), Size 2^x (z)
//uniform usampler3D Soctree;
//uniform ivec4 PosSize;
uniform mat4 mCam;

void main() {
	//gl_FragColor = 
}
`;

var textureFromPixelArray = function (gl, dataArray, type, width, height) {
    var dataTypedArray = new Uint8Array(dataArray); // Don't need to do this if the data is already in a typed array
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, type, width, height, 0, type, gl.UNSIGNED_BYTE, dataTypedArray);
    // Other texture setup here, like filter modes and mipmap generation
    return texture;
};

var arraysEqual = function (a, b) { // fuuuuuuuuuuuuuuuuuuuuuck
	if (a === b) return true;
	if (a == null || b == null) return false;
	if (a.length !== b.length) return false;
	for (var i = 0; i < a.length; ++i) {
		if (a[i] !== b[i]) return false;
	}
	return true;
}

var IndexOfData = function (array, data) { // IndexOf object usage doesnt allow to do that
	var r = -1;
	array.forEach( function (e,i) {
		if (arraysEqual(data, e)) {
			r = i;
			//console.log('wtf');
			return;
		}
	});
	return r;
}

var getKeyPressedState = function (keyboard, key) {
	return (IndexOfData(keyboard, [key,true,false]) != -1);
};
var getKeyReleasedState = function (keyboard, key) {
	return (IndexOfData(keyboard, [key,false,true]) != -1);
};
var getKeyState = function (keyboard, key) {
	return ((IndexOfData(keyboard, [key,false,true]) != -1) || (IndexOfData(keyboard, [key,true,true]) != -1));
};

var getBindPressedState = function (bindgrps, keyboard) {
	var state = false;
	bindgrps.forEach( function (e,i) {
		if (e.isArray) {
			// plus bind
		}else{
			if (state = getKeyPressedState(keyboard, e)) {
				return;
			}
		}
	});
	return state;
};
var getBindReleasedState = function (bindgrps, keyboard) {
	var state = false;
	bindgrps.forEach( function (e,i) {
		if (e.isArray) {
			// plus bind
		}else{
			if (state = getKeyReleasedState(keyboard, e)) {
				return;
			}
		}
	});
	return state;
};
var getBindState = function (bindgrps, keyboard) {
	var state = false;
	bindgrps.forEach( function (e,i) {
		if (e.isArray) {
			// plus bind
		}else{
			if (state = getKeyState(keyboard, e)) {
				return;
			}
		}
	});
	return state;
};

var updateControlEvents = function (binds, keyboard) {
	var newkeys = {
		fma: getBindState(binds.fma, keyboard),
		bma: getBindState(binds.bma, keyboard),
		lma: getBindState(binds.lma, keyboard),
		rma: getBindState(binds.rma, keyboard),
		mm:  [MouseEvent.movementX,MouseEvent.movementY],
		mp:  [MouseEvent.clientX,MouseEvent.clientY],
		bck: getBindReleasedState(binds.bck, keyboard),
		ok:  getBindReleasedState(binds.ok, keyboard),
		dbg: getBindPressedState(binds.dbg, keyboard)
	};
	keyboard.forEach( function (e,i) {
		keyboard[i][2] = e[1];
		if ((e[1] == false)&&(e[2] == false)) {
			keyboard.splice(i,1);
		}
	});
	return newkeys;
};

var Init = function () {
	console.log('Its working');
	
	var canvas = document.getElementById('g_surf');
	var gl = canvas.getContext('webgl2',{ antialias: false });
	if (!gl) { // a little bit trolling
		var No2GL = true;
		console.log('No webgl2. Executing webgl.');
		if (!(gl = canvas.getContext('webgl',{ antialias: false }))) {
			console.log('No webgl. Executing experimenal-webgl.');
			if (!(gl = canvas.getContext('experimenal-webgl',{ antialias: false }))) {
				alert('No WebGL.');
			}
		}
	}
	
	const glm = glMatrix.glMatrix; // this works, but wtf
	const { mat3, mat4, vec2, vec3, vec4, quat } = glMatrix;
	
	var window_s = {x: canvas.width, y: canvas.height};
	var UpdateSize = function () {
		if ((window_s.x != window.innerWidth) || (window_s.y != window.innerHeight)) {// todo: make it lookin better
			window_s = {x: window.innerWidth, y: window.innerHeight};
			canvas.width = window_s.x;
			canvas.height = window_s.y-20;
			gl.viewport(0, 0, canvas.width, canvas.height);
			return true;
		}
		return false;
	};
	
	//setups
	//gl.enable(gl.DEPTH_TEST);
	//gl.enable(gl.CULL_FACE);
	//gl.cullFace(gl.BACK);
	//gl.frontFace(gl.CCW);
	
	//shader prep
	var program = gl.createProgram();
	//var ShdGrpT = [vs1Text,fs1Text];
	var ShdGrpT = [vs1UVText,fv1FBOTestText];
	var ShdGrp = [gl.createShader(gl.VERTEX_SHADER),gl.createShader(gl.FRAGMENT_SHADER)];
	ShdGrp.forEach( function(e, i) {
		gl.shaderSource(e, ShdGrpT[i]);
		gl.compileShader(e);
		if (!gl.getShaderParameter(e, gl.COMPILE_STATUS)) {
			console.error(i, ' compile error:', gl.getShaderInfoLog(e));
			return;
		}
		gl.attachShader(program, e);	
	});
	gl.linkProgram(program);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		console.error('program link error:', gl.getProgramInfoLog(program));
		return;
	}
	gl.validateProgram(program);
	if (!gl.getProgramParameter(program, gl.VALIDATE_STATUS)) {
		console.error('program validation error:', gl.getProgramInfoLog(program));
		return;
	}
	
	//
	// BUFFERS
	//
	
	var cubeVerts = new Float32Array(
	[ // X, Y,       R, G, B
		// Top
		-1.0, 1.0, -1.0,  0,0,
		-1.0, 1.0, 1.0,   1,0,
		1.0, 1.0, 1.0,    1,1,
		1.0, 1.0, -1.0,   0,1,
		
		// Left           
		-1.0, 1.0, 1.0,   0,0,
		-1.0, -1.0, 1.0,  1,0,
		-1.0, -1.0, -1.0, 1,1,
		-1.0, 1.0, -1.0,  0,1,
						  
		// Right          
		1.0, 1.0, 1.0,    0,0,
		1.0, -1.0, 1.0,   1,0,
		1.0, -1.0, -1.0,  1,1,
		1.0, 1.0, -1.0,   0,1,
						  
		// Front          
		1.0, 1.0, 1.0,    0,0,
		1.0, -1.0, 1.0,   1,0,
		-1.0, -1.0, 1.0,  1,1,
		-1.0, 1.0, 1.0,   0,1,
						  
		// Back           
		1.0, 1.0, -1.0,   0,0,
		1.0, -1.0, -1.0,  1,0,
		-1.0, -1.0, -1.0, 1,1,
		-1.0, 1.0, -1.0,  0,1,
						  
		// Bottom         
		-1.0, -1.0, -1.0, 0,0,
		-1.0, -1.0, 1.0,  1,0,
		1.0, -1.0, 1.0,   1,1,
		1.0, -1.0, -1.0,  0,1
	]);
	
	var cubeInd = new Uint16Array(
	[
		// Top
		0, 1, 2,
		0, 2, 3,

		// Left
		5, 4, 6,
		6, 4, 7,

		// Right
		8, 9, 10,
		8, 10, 11,

		// Front
		13, 12, 14,
		15, 14, 12,

		// Back
		16, 17, 18,
		16, 18, 19,

		// Bottom
		21, 20, 22,
		22, 20, 23
	]);
	/*
	var cubeVertexBufferObject = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBufferObject);
	gl.bufferData(gl.ARRAY_BUFFER, cubeVerts, gl.STATIC_DRAW);
	
	var cubeIndexBufferObject = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeIndexBufferObject);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, cubeInd, gl.STATIC_DRAW);
	
	//attributes
	var positionAttribLocation = gl.getAttribLocation(program, 'vertPosition');
	var texCoordAttribLocation = gl.getAttribLocation(program, 'vertUV');
	gl.vertexAttribPointer(
		positionAttribLocation, // Attrib loacation
		3, // Number of elements per attribute
		gl.FLOAT, // Type of elements
		gl.FALSE,
		5 * Float32Array.BYTES_PER_ELEMENT, // Size of an individual vertex
		0 // Offest from the beginning of a single vertex to this attribute
	);
	gl.vertexAttribPointer(
		texCoordAttribLocation, // Attrib loacation
		2, // Number of elements per attribute
		gl.FLOAT, // Type of elements
		gl.FALSE,
		5 * Float32Array.BYTES_PER_ELEMENT, // Size of an individual vertex
		3 * Float32Array.BYTES_PER_ELEMENT // Offest from the beginning of a single vertex to this attribute
	);
	gl.enableVertexAttribArray(positionAttribLocation);
	gl.enableVertexAttribArray(texCoordAttribLocation);
	*/
	var filler = new Float32Array([
        -1, -1,
         1, -1,
        -1,  1,
         1,  1
    ]);
	
	var fillerind = new Uint16Array([
		0, 1, 2, 3, 2, 1
	]);
	
	var UVVertBuffObj = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, UVVertBuffObj);
	gl.bufferData(gl.ARRAY_BUFFER, filler, gl.STATIC_DRAW);
	
	var UVIndBuffObj = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, UVIndBuffObj);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, fillerind, gl.STATIC_DRAW);
	
	var positionAttribLocation = gl.getAttribLocation(program, 'vertPos');
	gl.vertexAttribPointer(
		positionAttribLocation, // Attrib loacation
		2, // Number of elements per attribute
		gl.FLOAT, // Type of elements
		gl.FALSE,
		2 * Float32Array.BYTES_PER_ELEMENT, // Size of an individual vertex
		0 // Offest from the beginning of a single vertex to this attribute
	);
	gl.enableVertexAttribArray(positionAttribLocation);
	
	//voxel parameters
	// diffuse rgb, refraction a, reflectivity, roughness/gloss, emissive
	//voxel cached params
	// normal
	//map rasterizing
	//size 2^, voxel params,
	
	//texture
	var voxelPalette = gl.createTexture();
	//var octree = gl.createTexture();
	
	//texture
	//var stoneTexture = gl.createTexture();
	//gl.bindTexture(gl.TEXTURE_2D, stoneTexture);
	//gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	//gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	//gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	//gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	//gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, 
	//	gl.UNSIGNED_BYTE,
	//	document.getElementById('texture')
	//);
	//gl.bindTexture(gl.TEXTURE_2D, null);
	
	//uniforms
	gl.useProgram(program);
	
	var matWorldUniformLocation = gl.getUniformLocation(program, 'mWorld');
	var matViewUniformLocation =  gl.getUniformLocation(program, 'mView');
	var matProjUniformLocation =  gl.getUniformLocation(program, 'mProj');
	var rtime =                   gl.getUniformLocation(program, 'time');
	var resolution =              gl.getUniformLocation(program, 'resolution');
	
	var identityMatrix = new Float32Array(16);
	mat4.identity(identityMatrix);
	var worldMatrix = new Float32Array(16);
	var viewMatrix = new Float32Array(16);
	var projMatrix = new Float32Array(16);
	mat4.identity(worldMatrix);
	mat4.lookAt(viewMatrix, [0, 0, -8], [0, 0, 0], [0, 1, 0]);
	mat4.perspective(projMatrix, glm.toRadian(45), canvas.width / canvas.height, 0.001, 1000.0);
	
	gl.uniformMatrix4fv(matWorldUniformLocation, gl.FALSE, worldMatrix);
	gl.uniformMatrix4fv(matViewUniformLocation,  gl.FALSE, viewMatrix);
	gl.uniformMatrix4fv(matProjUniformLocation,  gl.FALSE, projMatrix);
	
	//
	// MAIN LOOP
	//
	
	var xRotMat = new Float32Array(16);
	var yRotMat = new Float32Array(16);
	var angle = 0;
	//var ftime = 0; // global frame counter for shaders
	var ControlEvents = [];
	var binds = {
		fma: [87, 38],
		bma: [83, 40],
		lma: [65, 37],
		rma: [68, 39],
		bck: [27],
		ok:  [13],
		dbg: [192]
	};
	//bruh start
	//key.keyCode
	var keyboard = [];
	var checkKeyDown = function (key) {
		var skip = false;
		keyboard.forEach(function (e,i) {
			if (skip = (key.keyCode === e[0])) {
				return;
			}
		});
		if (skip) {return;}
			keyboard.push([key.keyCode,true,false]);
			//console.log('meow', keyboard);
	}
	var checkKeyUp = function (key) {
		keyboard.forEach(function (e,i) {
			if (e[0] == key.keyCode) {
				keyboard[i][1] = false;
			}
		});
		//console.log('woem', keyboard);
		//console.log(key);
	}
	document.addEventListener('keydown', checkKeyDown, false);
	document.addEventListener('keyup',   checkKeyUp, false);
	//bruh end
	
	var loop = function () {
		
		if (UpdateSize()) {
			mat4.perspective(projMatrix, glm.toRadian(45), canvas.width / canvas.height, 0.001, 1000.0);
			gl.uniformMatrix4fv(matProjUniformLocation,  gl.FALSE, projMatrix);
		}
		
		ControlEvents = updateControlEvents(binds, keyboard);
		if (ControlEvents.dbg) {console.log(ControlEvents);}
		//updateworld(); // here goes physics and logic
		//renderworld();
		var angle = performance.now() * 0.001 / 6 * 2 * Math.PI;
		mat4.rotate(yRotMat, identityMatrix, angle, [0, 1, 0]);
		mat4.rotate(xRotMat, identityMatrix, angle * 0.25, [1, 0, 0]);
		mat4.mul(worldMatrix, yRotMat, xRotMat);
		gl.uniformMatrix4fv(matWorldUniformLocation, gl.FALSE, worldMatrix);
		gl.uniform2f(resolution, window_s.x, window_s.y);
		gl.uniform1f(rtime, performance.now() * 0.001);
		
		//clear color
		gl.clearColor(0.5,0.5,0.5,1.0);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		
		//gl.bindTexture(gl.TEXTURE_2D, stoneTexture);
		//gl.activeTexture(gl.TEXTURE0);
		gl.drawElements(gl.TRIANGLES, fillerind.length, gl.UNSIGNED_SHORT, 0);
		
		//gl.drawArrays(gl.TRIANGLES, 0, 3);
		//loopi = loopi + 1;
		//if (running) {
			requestAnimationFrame(loop);
		//}
	}
	requestAnimationFrame(loop);
};