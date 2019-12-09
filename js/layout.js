/***webgl初始化 开始***/
// 获取div的宽高
let container = document.getElementById("Multilayer");
let width = container.offsetWidth;
let height = container.offsetHeight;
let controls;
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let _curObj = null;//当前点击物体
let tooltip = document.getElementById("tooltip"); // 提示框
let tween; // 补间动画
const R = 5;

// 创建场景
let scene = new THREE.Scene();

// 初始化相机
let camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 10000);   //创建摄像机
camera.position.z = 10;
camera.position.x = 10;
camera.position.y = 10;
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


/**判断设备类型  开始***/

if (/Android|webOS|iPhone|iPod|BlackBerry/i.test(navigator.userAgent)) {
    // 移动端操作
    controls = new THREE.DeviceOrientationControls(camera);
} else {
    // PC端操作
    controls = new THREE.TrackballControls(camera, container);
    controls.rotateSpeed = 2.5;
    controls.zoomSpeed = 1.2;
    controls.panSpeed = 0.8;
    controls.noZoom = false;
    controls.noPan = false;
    controls.staticMoving = true;
    controls.dynamicDampingFactor = 0.3;
}
/**判断设备类型  结束***/

// 设置辅助测试工具
// 红色是x轴
// 绿色是y轴
// 蓝色是z轴
let axes = new THREE.AxesHelper(100);
scene.add(axes);

let stats = new Stats();
container.appendChild(stats.dom);

// resize时间回调函数
function onWindowResize() {
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}


function onMouseClick(event) {
    event.preventDefault();
    mouse.x = (event.offsetX / width) * 2 - 1; // 坐标变换
    mouse.y = -(event.offsetY / height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    let intersects = raycaster.intersectObjects(scene.children);
    if (intersects.length > 0) {
        let {x, y, z} = intersects[0].point;
        // Aim at node from outside it
        const distance = 40;
        const distRatio = 1 + distance / Math.hypot(x, y, z);
        let p2 = {
            x: x * distRatio,
            y: y * distRatio,
            z: z * distRatio
        };
        animateCamera(camera.position, p2);
    }
}

/**节流函数  开始**/
let lastTime = Date.now();
let onMouseMove = function (event) {
    // 记录当前函数触发的时间
    let nowTime = Date.now();
    if (nowTime - lastTime > 100) {
        event.preventDefault();
        mouse.x = (event.offsetX / width) * 2 - 1; // 坐标变换
        mouse.y = -(event.offsetY / height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        let intersects = raycaster.intersectObjects(scene.children);
        tooltip.style.display = "none";
        if (intersects.length > 0) {
            document.body.style.cursor = 'pointer';
            tooltip.style.display = "block";
            tooltip.innerText = intersects[0].object.geometry.name;
            tooltip.zIndex = 1000;
            tooltip.style.left = event.offsetX + 'px';
            tooltip.style.top = event.offsetY + 21 + 'px';
        } else { // 没有目标被选中
            document.body.style.cursor = 'default';
        }
        // 同步时间
        lastTime = nowTime;
    }
};
/**节流函数  结束**/
window.addEventListener('resize', onWindowResize, false);
container.addEventListener('mousemove', onMouseMove, false);

container.addEventListener('click', onMouseClick, false);
container.appendChild(renderer.domElement);

function render() {
    renderer.render(scene, camera);
}

// 动画
function animate() {
    requestAnimationFrame(animate);
    render();
    controls.update();
    stats.update();
    TWEEN.update(); // 补间动画
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
    return d3.scaleOrdinal(d3.schemeCategory20);
}

let returnColor = getColor();

function ended(data) {
    let nodes = data.nodes,
        links = data.links;
    meter.style.display = "none";

    nodes.forEach(drawNode);
    links.forEach(drawLink);
    let x = [], y = [];
    nodes.forEach((node) => {
        x.push(Math.abs(node.x));
        y.push(Math.abs(node.y));
    });
    let max_x = Math.max(...x);
    let max_y = Math.max(...y);
    drawPlane(max_x * 2, max_y * 2, nodes);
}

function drawLink(obj) {
    // 设置线条
    let material = new THREE.LineBasicMaterial({color: returnColor(obj.index)});
    let geometry = new THREE.Geometry();
    geometry.vertices.push(new THREE.Vector3(obj.source.x, obj.source.y, obj.source.z));
    geometry.vertices.push(new THREE.Vector3(obj.target.x, obj.target.y, obj.target.z));
    geometry.name = `source: ${obj.source.index}--> tartet: ${obj.target.index}`;
    let line = new THREE.Line(geometry, material);
    scene.add(line);
}

// 设置球面体
function drawNode(obj) {
    let sphereGeometry = new THREE.SphereGeometry(R, 20, 20);
    // let sphereMaterial = new THREE.MeshLambertMaterial({color: returnColor(obj.index)});
    let sphereMaterial = new THREE.MeshLambertMaterial({color: returnColor(obj.community)});
    let sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphereGeometry.name = obj.index;
    sphere.position.x = obj.x;
    sphere.position.y = obj.y;
    sphere.position.z = obj.z;
    scene.add(sphere);
}

// 绘制平面
function drawPlane(width, height, nodes) {
    // 添加平面

    let border = R * 4; // 画布边界
    let planeGeometry = new THREE.PlaneGeometry(width + border, height + border, 10, 10);
    createHeatMap(nodes, width, height);
    let plane = new THREE.Mesh(planeGeometry, new THREE.MeshLambertMaterial({
        // color: 0x252525,
        opacity: 0.9,
        transparent: true,
        side: THREE.DoubleSide,
        map: new THREE.CanvasTexture(document.getElementsByClassName("canvas")[0].getElementsByTagName("canvas")[0])
    }));
    document.body.removeChild(document.getElementsByClassName("canvas")[0]);
    planeGeometry.name = 'plane';
    plane.position.x = 0;
    plane.position.y = 0;
    plane.position.z = 0;
    scene.add(plane);
}

/***web worker 计算节点位置  结束***/


/**平滑过渡相机  开始**/
// p1 相机当前的位置
// p2 新相机的目标位置
function animateCamera(p1, p2) {
    controls.enabled = false;   //关闭控制器
    tween = new TWEEN.Tween(p1).to(p2, 1000).easing(TWEEN.Easing.Cubic.InOut);
    tween.onUpdate(function () {
        camera.position.set(p1.x, p1.y, p1.z);
    });
    tween.onComplete(function () {
        controls.enabled = true;   ///开启控制器
    });
    tween.start();
}

/**平滑过渡相机  结束**/

/**绘制热力图  开始**/
function createHeatMap(nodes, width, height) {
    // minimal heatmap instance configuration
    let container = document.createElement("div");
    let border = R * 4; // 画布边界
    container.style.width = width + border + "px";
    container.style.height = height + border + "px";
    container.style.zIndex = -10;
    container.className = "canvas";
    document.body.appendChild(container);
    let heatmapInstance = h337.create({
        container: container,
        backgroundColor: 'rgb(37,37,37)',
    });
    var points = [];
    var max = 10;

    for (let i = 0; i < nodes.length; i++) {
        var point = {
            x: Math.floor(nodes[i].x + width / 2),
            y: Math.floor(nodes[i].y + height / 2),
            value: 1
        };
        points.push(point);
    }
    var data = {
        max: max,
        data: points
    };
    heatmapInstance.setData(data);
}

/**绘制热力图  结束**/
