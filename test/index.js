console.clear();

var app = new PIXI.Application(500, 480, {
  autoStart: false, 
  backgroundColor: 0x000000, 
  view: myCanvas
});

var rt = []; 
for (var i=0;i<3;i++) rt.push(PIXI.RenderTexture.create(app.screen.width, app.screen.height));
var current = 0;

var bg, brush, displacementFilter;

var container = new PIXI.Container(); 
app.stage.addChild(container);

app.loader.add('bg', 'https://raw.githubusercontent.com/PavelLaptev/test-rep/master/grunge.jpg');
app.loader.add('one', 'https://raw.githubusercontent.com/PavelLaptev/test-rep/master/dis-varOne.png');
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