"use strict";

var EFFECT_CONSTANTS = {
	LIQUIFY_DELAY: 20,
	GROW_AND_SHRINK_RADIUS: 80,
	// 20 to 225
	GROW_AND_SHRINK_AMOUNT: 10,
	// 90 to 100
	LIQUIFY_BRUSH_SIZE: 30,
	LIQUIFY_SMUDGE_SIZE: 10,
	// less than or equal to brush size
	LIQUIFY_CONTRAST: 0.9,
	// 0 to 1
	FRY_BRIGHTNESS: -7,
	// brightness multiplier, -100 to 100 (negative is decrease, positive is increase)
	FRY_EXPOSURE: 45,
	// exposure, -100 to 100
	FRY_GAMMA: 2 // 0 to infinity
};

function _instanceof(left, right) {
	if (
		right != null &&
		typeof Symbol !== "undefined" &&
		right[Symbol.hasInstance]
	) {
		return !!right[Symbol.hasInstance](left);
	} else {
		return left instanceof right;
	}
}

function _slicedToArray(arr, i) {
	return (
		_arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest()
	);
}

function _nonIterableRest() {
	throw new TypeError("Invalid attempt to destructure non-iterable instance");
}

function _iterableToArrayLimit(arr, i) {
	if (
		!(
			Symbol.iterator in Object(arr) ||
			Object.prototype.toString.call(arr) === "[object Arguments]"
		)
	) {
		return;
	}

	var _arr = [];
	var _n = true;
	var _d = false;
	var _e = undefined;

	try {
		for (
			var _i = arr[Symbol.iterator](), _s;
			!(_n = (_s = _i.next()).done);
			_n = true
		) {
			_arr.push(_s.value);

			if (i && _arr.length === i) break;
		}
	} catch (err) {
		_d = true;
		_e = err;
	} finally {
		try {
			if (!_n && _i["return"] != null) _i["return"]();
		} finally {
			if (_d) throw _e;
		}
	}

	return _arr;
}

function _arrayWithHoles(arr) {
	if (Array.isArray(arr)) return arr;
}

var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");
var timer,
	canUpdate = true,
	oldMouseX = 0,
	oldMouseY = 0;

function missingValues(values, endX) {
	if (Object.keys(values).length < endX + 1) {
		var ret = {};

		for (
			var i = 0, end = endX, asc = 0 <= end;
			asc ? i <= end : i >= end;
			asc ? i++ : i--
		) {
			if (values[i] != null) {
				ret[i] = values[i];
			} else {
				var rightCoord;
				var leftCoord = [i - 1, ret[i - 1]]; // Find the first value to the right. Ideally this loop will break
				// very quickly.

				for (
					var j = i, end1 = endX, asc1 = i <= end1;
					asc1 ? j <= end1 : j >= end1;
					asc1 ? j++ : j--
				) {
					if (values[j] != null) {
						rightCoord = [j, values[j]];
						break;
					}
				}

				ret[i] =
					leftCoord[1] +
					((rightCoord[1] - leftCoord[1]) / (rightCoord[0] - leftCoord[0])) *
					(i - leftCoord[0]);
			}
		}

		return ret;
	}

	return values;
};

function bezierCurve(start, ctrl1, ctrl2, end, lowBound, highBound) {
	var controlPoints;

	if (lowBound == null) {
		lowBound = 0;
	}

	if (highBound == null) {
		highBound = 255;
	}

	if (_instanceof(start[0], Array)) {
		controlPoints = start;
		lowBound = ctrl1;
		highBound = ctrl2;
	} else {
		controlPoints = [start, ctrl1, ctrl2, end];
	}

	var bezier = {};

	var lerp = function lerp(a, b, t) {
		return a * (1 - t) + b * t;
	};

	var clamp = function clamp(a, min, max) {
		return Math.min(Math.max(a, min), max);
	};

	for (var i = 0; i < 1000; i++) {
		var t = i / 1000;
		var prev = controlPoints;

		while (prev.length > 1) {
			var next = [];

			for (
				var j = 0, end1 = prev.length - 2, asc = 0 <= end1;
				asc ? j <= end1 : j >= end1;
				asc ? j++ : j--
			) {
				next.push([
					lerp(prev[j][0], prev[j + 1][0], t),
					lerp(prev[j][1], prev[j + 1][1], t)
				]);
			}

			prev = next;
		}

		bezier[Math.round(prev[0][0])] = Math.round(
			clamp(prev[0][1], lowBound, highBound)
		);
	}

	var endX = controlPoints[controlPoints.length - 1][0];
	bezier = missingValues(bezier, endX);

	if (bezier[endX] == null) {
		bezier[endX] = bezier[endX - 1];
	}

	return bezier;
}

function fryCanvas() {
	var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
	var d = imageData.data;
	var brightnessAdjustment = Math.floor(
		255 * (EFFECT_CONSTANTS.FRY_BRIGHTNESS / 100)
	);
	var gammaAdjustment = EFFECT_CONSTANTS.FRY_GAMMA; // exposure stuff

	var exposureAdjustment = Math.abs(EFFECT_CONSTANTS.FRY_EXPOSURE) / 100;
	var ctrl1 = [0, 255 * exposureAdjustment];
	var ctrl2 = [255 - 255 * exposureAdjustment, 255];

	if (EFFECT_CONSTANTS.FRY_EXPOSURE < 0) {
		ctrl1 = ctrl1.reverse();
		ctrl2 = ctrl2.reverse();
	}

	var curve = bezierCurve([0, 0], ctrl1, ctrl2, [255, 255], 0, 255);

	for (var i = 0; i < d.length; i += 4) {
		// brightness
		d[i] += brightnessAdjustment; // red

		d[i + 1] += brightnessAdjustment; // green

		d[i + 2] += brightnessAdjustment; // blue
		// gamma

		d[i] = Math.pow(d[i] / 255, gammaAdjustment) * 255;
		d[i + 1] = Math.pow(d[i + 1] / 255, gammaAdjustment) * 255;
		d[i + 2] = Math.pow(d[i + 2] / 255, gammaAdjustment) * 255; // exposure

		d[i] = curve[d[i]];
		d[i + 1] = curve[d[i + 1]];
		d[i + 2] = curve[d[i + 2]];
	}

	ctx.putImageData(imageData, 0, 0);
}

document.getElementById("image-upload").onchange = function (event) {
	var reader = new FileReader();

	reader.onload = function () {
		var image = new Image();

		image.onload = function () {
			var imageHeight = canvas.height * (image.height / image.width);
			ctx.drawImage(
				image,
				0,
				(canvas.height - imageHeight) / 2,
				canvas.width,
				imageHeight
			);
		};

		image.src = reader.result;
	};

	reader.readAsDataURL(event.target.files[0]);
	canvas.dataset.file = event.target.files[0].name;
	document.getElementById("upload").classList.toggle("hide");
	document.getElementById("editor").classList.toggle("hide");
};

function downloadCanvas() {
	var link = document.createElement("a");
	link.download = "sperg-".concat(canvas.dataset.file);
	link.href = canvas.toDataURL();
	link.click();
}

var app = new PIXI.Application(500, 480, {
  autoStart: false, 
  backgroundColor: 0x000000, 
  view: canvas
});

var rt = []; 
for (var i=0;i<3;i++) rt.push(PIXI.RenderTexture.create(app.screen.width, app.screen.height));
var current = 0;

var bg, brush, displacementFilter;

var container = new PIXI.Container(); 
app.stage.addChild(container);

app.loader.add('bg', 'https://raw.githubusercontent.com/PavelLaptev/test-rep/master/grunge.jpg');
app.loader.add('one', 'https://raw.githubusercontent.com/PavelLaptev/test-rep/master/dis-varOne-small.png');
app.loader.load(function(loader, resources) {
    var tempBg = new PIXI.Sprite(resources.bg.texture);
    tempBg.width = app.screen.width;
    tempBg.height = app.screen.height; 
  
    app.renderer.render(tempBg, rt[0]);
    bg = new PIXI.Sprite(rt[0]);
  
    brush = new PIXI.Sprite(resources.one.texture);
    brush.anchor.set(0.5);
    displacementFilter = new PIXI.filters.DisplacementFilter(brush);
    container.filters = [displacementFilter];
    displacementFilter.scale.x = 10;
    displacementFilter.scale.y = 10;
  
    container.addChild(bg, brush);
  
    app.stage.interactive = true;

    app.stage.on('pointerdown', onPointerDown)
             .on('pointerup', onPointerUp)
             .on('pointermove', onPointerMove);
  
    app.start(); 
}); 

function snap(event) {
    app.renderer.render(app.stage, rt[2 - current]);
    bg.texture = rt[2 - current];
    current = 2 - current;
}

var dragging = false;

function onPointerDown(event) {
    dragging = true; 
    onPointerMove(event);
} 
 
function onPointerMove(event) {
    const x = event.data.global.x;
    const y = event.data.global.y;
    displacementFilter.scale.x = Math.atan(x - brush.x)*4;
    displacementFilter.scale.y = Math.atan(y - brush.y)*4;
   
    brush.position.copy(event.data.global);
    if (dragging) snap(event);
}

function onPointerUp() {
    dragging = false;
}





function getMousePos(event) {
	var x, y;

	if (event.touches && event.touches.length === 1) {
		var _event$touches = _slicedToArray(event.touches, 1),
			touch = _event$touches[0];

		x = touch.pageX;
		y = touch.pageY;
	} else {
		x = event.clientX;
		y = event.clientY;
	}

	var rect = canvas.getBoundingClientRect(),
		scaleX = canvas.width / rect.width,
		scaleY = canvas.height / rect.height;
	return {
		x: Math.round((event.clientX - rect.left) * scaleX),
		y: Math.round((event.clientY - rect.top) * scaleY)
	};
}

function updateCoords(event) {
	var _getMousePos = getMousePos(event),
		x = _getMousePos.x,
		y = _getMousePos.y;

	if (canUpdate) {
		if (event.target.id === "canvas") {
			var effect = document.querySelector('input[name="effect"]:checked').value;
			if (effect === "smudge") smudge(x, y);
			else if (effect === "grow") growShrink(x, y, "grow");
			else if (effect === "shrink") growShrink(x, y, "shrink");
		}

		canUpdate = false;
		timer = window.setTimeout(function () {
			canUpdate = true;
		}, EFFECT_CONSTANTS.LIQUIFY_DELAY);
	}
}

canvas.onmousedown = function () {
	canvas.onmousemove = function (event) {
		return updateCoords(event);
	};

	window.clearTimeout(timer);
	canUpdate = true;
	return false;
};

canvas.ontouchstart = function () {
	canvas.ontouchmove = function (event) {
		return updateCoords(event);
	};

	window.clearTimeout(timer);
	canUpdate = true;
	return false;
};

canvas.ontouchend = function () {
	canvas.ontouchmove = null;
};

canvas.onmouseup = function () {
	canvas.onmousemove = null;
};

function growShrink(xCoord, yCoord, type) {
	var radius = EFFECT_CONSTANTS.GROW_AND_SHRINK_RADIUS; // 20 to 225

	var amount = EFFECT_CONSTANTS.GROW_AND_SHRINK_AMOUNT; // 90 to 100

	var width = 0;
	var height = 0;
	if (type === "shrink") amount *= -1;

	var i = function i(x, y) {
		return (y + distUp) * width * 4 + (x + distLeft) * 4;
	};

	var distLeft = xCoord > radius ? radius : xCoord;
	if (xCoord < canvas.width - radius) width = radius * 2 + 1;
	else width = canvas.width - (xCoord + radius);
	var distUp = yCoord > radius ? radius : yCoord;
	if (yCoord < canvas.height - radius) height = radius * 2 + 1;
	else height = canvas.height - (height + radius);
	var curImageData = ctx.getImageData(
		xCoord - distLeft,
		yCoord - distUp,
		width,
		height
	);
	var newImageData = ctx.createImageData(width, height);

	for (var x = -distLeft; x < width - distLeft; x++) {
		for (var y = -distUp; y < height - distUp; y++) {
			var dist = Math.sqrt(x * x + y * y);
			var angle = Math.atan(y / x);
			if (isNaN(angle)) angle = 0;

			if (dist <= radius) {
				var push = Math.sin((dist / radius) * Math.PI);
				if (push < 0 || (push * amount) / 10 > dist) push = 0;
				var cx = (dist - push * amount * (radius / 500)) * Math.cos(angle);
				var cy = (dist - push * amount * (radius / 500)) * Math.sin(angle);

				if (x < 0) {
					cx = -cx;
					cy = -cy;
				}
			} else {
				var cx = x;
				var cy = y;
			}

			var abort = false;
			if (cx < -distLeft) cx = -distLeft;
			if (cx > width - distLeft) cx = width - distLeft;
			if (cy < -distUp) cy = -distUp;
			if (cy > height - distUp) cy = height - distUp;
			var cxf = Math.floor(cx);
			var cyf = Math.floor(cy);
			var i00 = i(cxf, cyf);
			var i01 = i(Math.ceil(cx), Math.ceil(cy));
			var factor = Math.sqrt(
				(Math.pow(cx - cxf, 2) + Math.pow(cy - cyf, 2)) / 2
			);
			var i1 = i(x, y, 1);
			newImageData.data[i1] =
				curImageData.data[i00] * (1 - factor) + curImageData.data[i01] * factor; //setting the color of the new coords to be equal to the color

			newImageData.data[i1 + 1] =
				curImageData.data[i00 + 1] * (1 - factor) +
				curImageData.data[i01 + 1] * factor; //of the current pixel.

			newImageData.data[i1 + 2] =
				curImageData.data[i00 + 2] * (1 - factor) +
				curImageData.data[i01 + 2] * factor;
			newImageData.data[i1 + 3] =
				curImageData.data[i00 + 3] * (1 - factor) +
				curImageData.data[i01 + 3] * factor;
		}

		ctx.putImageData(newImageData, xCoord - distLeft, yCoord - distUp);
	}
}

function smudge(x, y) {
	var BRUSH_SIZE = EFFECT_CONSTANTS.LIQUIFY_BRUSH_SIZE;
	var SMUDGE_SIZE = EFFECT_CONSTANTS.LIQUIFY_SMUDGE_SIZE;
	var CONTRAST = EFFECT_CONSTANTS.LIQUIFY_CONTRAST;

	var applyContrast = function applyContrast(o, n) {
		return ~~((1 - CONTRAST) * o + CONTRAST * n);
	};

	var dx = x - oldMouseX,
		dy = y - oldMouseY;
	oldMouseX = x;
	oldMouseY = y;
	x = x - parseInt(BRUSH_SIZE / 2);
	y = y - parseInt(BRUSH_SIZE / 2);

	if (
		x < 0 ||
		y < 0 ||
		x + BRUSH_SIZE >= canvas.width ||
		y + BRUSH_SIZE >= canvas.height
	) {
		return;
	}

	var bitmap = ctx.getImageData(x, y, BRUSH_SIZE, BRUSH_SIZE);
	dx =
		dx > 0
			? ~~Math.min(bitmap.width / 2, dx)
			: ~~Math.max(-bitmap.width / 2, dx);
	dy =
		dy > 0
			? ~~Math.min(bitmap.height / 2, dy)
			: ~~Math.max(-bitmap.height / 2, dy);
	var buffer = ctx.createImageData(bitmap.width, bitmap.height),
		d = bitmap.data,
		_d = buffer.data,
		bit = 0;

	for (var row = 0; row < bitmap.height; row++) {
		for (var col = 0; col < bitmap.width; col++) {
			var xd = bitmap.width / 2 - col,
				yd = bitmap.height / 2 - row,
				dist = Math.sqrt(xd * xd + yd * yd),
				xLiquify = (bitmap.width - dist) / bitmap.width,
				yLiquify = (bitmap.height - dist) / bitmap.height,
				skewX =
					dist > SMUDGE_SIZE / 2 ? -dx * xLiquify * xLiquify * xLiquify : -dx,
				skewY =
					dist > SMUDGE_SIZE / 2 ? -dy * yLiquify * yLiquify * yLiquify : -dy,
				fromX = col + skewX,
				fromY = row + skewY;
			if (fromX < 0 || fromX > bitmap.width) fromX = col;
			if (fromY < 0 || fromY > bitmap.height) fromY = row;
			var oBit = ~~fromX * 4 + ~~fromY * bitmap.width * 4;
			if (d[oBit] === undefined) oBit = bit;
			_d[bit] = applyContrast(d[bit], d[oBit]); // r

			_d[bit + 1] = applyContrast(d[bit + 1], d[oBit + 1]); // g

			_d[bit + 2] = applyContrast(d[bit + 2], d[oBit + 2]); // b

			_d[bit + 3] = applyContrast(d[bit + 3], d[oBit + 3]); // a

			bit += 4;
		}
	}

	try {
		ctx.putImageData(buffer, x, y);
	} catch (e) { }
}
