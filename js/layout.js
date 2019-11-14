/***webgl初始化 开始***/
// 获取div的宽高
let width = document.getElementById("Multilayer").offsetWidth;
let height = document.getElementById("Multilayer").offsetHeight;

// 创建场景
let scene = new THREE.Scene();
// 初始化相机
let camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);   //创建摄像机
camera.position.z = 200;
camera.position.x = 200;
camera.position.y = 200;
camera.lookAt(scene.position);

// 设置环境光
let light = new THREE.AmbientLight(0xffffff);
light.position.set(1, 1, 1);
scene.add(light);

// 渲染器  使用WebGL渲染器  同时还支持canvas svg
let renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setClearColor(new THREE.Color(0x303243));
renderer.setSize(width, height);
renderer.setPixelRatio(window.devicePixelRatio);


// 初始化控制器
let controls = new THREE.TrackballControls(camera, document.getElementById("Multilayer"));
controls.rotateSpeed = 2.5;
controls.zoomSpeed = 1.2;
controls.panSpeed = 0.8;
controls.noZoom = false;
controls.noPan = false;
controls.staticMoving = true;
controls.dynamicDampingFactor = 0.3;


let controls2 = new THREE.DeviceOrientationControls(camera);
// 设置辅助测试工具
// 红色是x轴
// 绿色是y轴
// 蓝色是z轴
let axes = new THREE.AxesHelper(100);
scene.add(axes);
document.getElementById("Multilayer").appendChild(renderer.domElement);


// resize时间回调函数
function onWindowResize() {
    let self = this;
    self.camera.aspect = self.width / self.height;
    self.camera.updateProjectionMatrix();
    self.renderer.setSize(self.width, self.height);
}

window.addEventListener('resize', onWindowResize, false);


// 动画
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
    controls.update();
    controls2.update();
}

animate();
/***webgl初始化 结束***/

/***web worker 计算节点位置  开始***/
let nodes = d3.range(1000).map(function (i) {
    return {
        index: i
    };
});

let links = d3.range(nodes.length - 1).map(function (i) {
    return {
        source: Math.floor(Math.sqrt(i)),
        target: i + 1
    };
});

let meter = document.querySelector("#progress");
let worker = new Worker("js/work.js");

worker.postMessage({
    nodes: nodes,
    links: links
});

worker.onmessage = function (event) {
    switch (event.data.type) {
        case "tick":
            return ticked(event.data);
            break;
        case "end":
            return ended(event.data);
            break;
    }
};

function ticked(data) {
    let progress = data.progress;
    meter.style.width = 100 * progress + "%";
}

function getColor() {
    return d3.scaleOrdinal(d3.schemeCategory10);
}

let returnColor = getColor();

function ended(data) {
    let nodes = data.nodes,
        links = data.links;
    meter.style.display = "none";
    nodes.forEach(drawNode);
    links.forEach(drawLink);
}

function drawLink(obj) {
    // 设置线条
    let material = new THREE.LineBasicMaterial({color: returnColor(obj.index)});
    let geometry = new THREE.Geometry();
    geometry.vertices.push(new THREE.Vector3(obj.source.x, obj.source.y, obj.source.z));
    geometry.vertices.push(new THREE.Vector3(obj.target.x, obj.target.y, obj.target.z));
    let line = new THREE.Line(geometry, material);
    scene.add(line);
}

// 设置球面体
function drawNode(obj) {
    let sphereGeometry = new THREE.SphereGeometry(4, 20, 20);
    let sphereMaterial = new THREE.MeshLambertMaterial({color: returnColor(obj.index)});
    let sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.x = obj.x;
    sphere.position.y = obj.y;
    sphere.position.z = obj.z;
    scene.add(sphere);
}

/***web worker 计算节点位置  结束***/


